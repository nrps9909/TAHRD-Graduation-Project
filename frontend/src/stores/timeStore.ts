import { create } from 'zustand'

export type TimeOfDay = 'day' | 'night'
export type WeatherType = 'clear' | 'drizzle'

interface TimeState {
  timeOfDay: TimeOfDay
  hour: number
  minute: number
  weather: WeatherType
  previousWeather: WeatherType | null // 前一個天氣狀態
  weatherTransitionProgress: number // 天氣轉換進度 (0-1)
  isAutoMode: boolean
  isPlaying: boolean // 播放暫停狀態
  timeSpeed: number
  dayDuration: number // 一天的持續時間（秒）
  weatherChangeInterval: number // 天氣變化間隔（秒）
  lastWeatherChange: number // 上次天氣變化時間
  realStartTime: number // 真實開始時間
  weatherVariability: number // 天氣變化的隨機性 (0-1)
  setTimeOfDay: (time: TimeOfDay) => void
  setHour: (hour: number) => void
  setMinute: (minute: number) => void
  setWeather: (weather: WeatherType) => void
  setAutoMode: (auto: boolean) => void
  setIsPlaying: (playing: boolean) => void
  setTimeSpeed: (speed: number) => void
  setWeatherVariability: (variability: number) => void
  tick: () => void
  resetDay: () => void
}

// 時間段對應的小時
const TIME_HOUR_MAP: Record<TimeOfDay, number> = {
  day: 12,   // 白天
  night: 0   // 夜晚
}

// 根據小時獲取時間段 - 簡化為直接切換，無過渡
const getTimeOfDayFromHour = (hour: number): TimeOfDay => {
  if (hour >= 6 && hour < 18) return 'day'    // 6-18點為白天
  return 'night'                               // 18-6點為夜晚
}

// 簡化的兩種天氣權重系統
const WEATHER_WEIGHTS: Record<WeatherType, number> = {
  clear: 60,    // 60% 晴天 - 美好天氣為主
  drizzle: 40   // 40% 細雨 - 溫柔的細雨
}

// 根據時間調整的簡化天氣系統
const getMountainWeather = (hour: number): WeatherType => {
  const normalizedHour = hour % 24
  
  // 簡化的天氣模式：早晨多雲，中午晴朗，傍晚細雨
  let weights = { ...WEATHER_WEIGHTS }
  
  // 清晨(4-9點) - 破曉時分，細雨較多
  if (normalizedHour >= 4 && normalizedHour < 9) {
    weights = {
      drizzle: 70,  // 晨間細雨
      clear: 30     // 偶爾晴朗
    }
  }
  // 上午到中午(9-15點) - 天氣轉晴
  else if (normalizedHour >= 9 && normalizedHour < 15) {
    weights = {
      clear: 80,    // 白天以晴朗為主
      drizzle: 20   // 少量細雨
    }
  }
  // 午後到傍晚(15-19點) - 變化天氣
  else if (normalizedHour >= 15 && normalizedHour < 19) {
    weights = {
      drizzle: 60,  // 午後容易有細雨
      clear: 40     // 偶爾晴朗
    }
  }
  // 夜晚(19-4點) - 夜幕降臨，以晴朗為主
  else {
    weights = {
      clear: 70,    // 夜晚較清朗
      drizzle: 30   // 夜間偶有細雨
    }
  }
  
  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0)
  let random = Math.random() * totalWeight
  
  for (const [weather, weight] of Object.entries(weights)) {
    random -= weight
    if (random <= 0) {
      return weather as WeatherType
    }
  }
  return 'clear'
}


// 獲取相鄰天氣的權重加成，讓天氣變化更平滑
const getAdjacentWeatherBonus = (currentWeather: WeatherType): Partial<Record<WeatherType, number>> => {
  const adjacencyMap: Record<WeatherType, WeatherType[]> = {
    clear: ['drizzle'],    // 晴天 -> 細雨
    drizzle: ['clear']     // 細雨 -> 晴天
  }

  const bonus: Partial<Record<WeatherType, number>> = {}
  const adjacentWeathers = adjacencyMap[currentWeather] || []
  
  adjacentWeathers.forEach(weather => {
    bonus[weather] = 20 // 為相鄰天氣增加20點權重
  })
  
  return bonus
}

// 帶權重偏向的簡化天氣選擇
const getBiasedMountainWeather = (hour: number, bonus: Partial<Record<WeatherType, number>>): WeatherType => {
  const normalizedHour = hour % 24
  
  // 獲取基礎權重，使用 getMountainWeather 的邏輯
  let weights: Record<WeatherType, number>
  
  // 清晨(4-9點) - 破曉時分，細雨較多
  if (normalizedHour >= 4 && normalizedHour < 9) {
    weights = {
      drizzle: 70,  // 晨間細雨
      clear: 30     // 偶爾晴朗
    }
  }
  // 上午到中午(9-15點) - 天氣轉晴
  else if (normalizedHour >= 9 && normalizedHour < 15) {
    weights = {
      clear: 80,    // 白天以晴朗為主
      drizzle: 20   // 少量細雨
    }
  }
  // 午後到傍晚(15-19點) - 變化天氣
  else if (normalizedHour >= 15 && normalizedHour < 19) {
    weights = {
      drizzle: 60,  // 午後容易有細雨
      clear: 40     // 偶爾晴朗
    }
  }
  // 夜晚(19-4點) - 夜幕降臨，以晴朗為主
  else {
    weights = {
      clear: 70,    // 夜晚較清朗
      drizzle: 30   // 夜間偶有細雨
    }
  }
  
  // 應用相鄰天氣權重加成
  Object.keys(bonus).forEach(weather => {
    const weatherType = weather as WeatherType
    if (weights[weatherType] !== undefined) {
      weights[weatherType] += bonus[weatherType] || 0
    }
  })
  
  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0)
  let random = Math.random() * totalWeight
  
  for (const [weather, weight] of Object.entries(weights)) {
    random -= weight
    if (random <= 0) {
      return weather as WeatherType
    }
  }
  return 'clear'
}

export const useTimeStore = create<TimeState>((set, get) => ({
  timeOfDay: 'day',
  hour: 6, // 從早晨6點開始
  minute: 0, // 分鐘
  weather: 'clear',
  previousWeather: null,
  weatherTransitionProgress: 1.0, // 開始時完全轉換完成
  isAutoMode: true, // 啟用自動模式
  isPlaying: true, // 預設播放中
  timeSpeed: 1,
  dayDuration: 30 * 60, // 30分鐘 = 1800秒
  weatherChangeInterval: 150, // 150秒(2.5分鐘)變化一次天氣，保持比例協調
  lastWeatherChange: Date.now(),
  realStartTime: Date.now(),
  weatherVariability: 0.8, // 80% 的天氣變化隨機性

  setTimeOfDay: (time: TimeOfDay) => {
    const hour = TIME_HOUR_MAP[time]
    set({ timeOfDay: time, hour, isAutoMode: false })
  },

  setHour: (hour: number) => {
    const normalizedHour = ((hour % 24) + 24) % 24
    const timeOfDay = getTimeOfDayFromHour(normalizedHour)
    set({ hour: normalizedHour, timeOfDay })
  },

  setMinute: (minute: number) => {
    const normalizedMinute = ((minute % 60) + 60) % 60
    set({ minute: normalizedMinute })
  },

  setWeather: (weather: WeatherType) => {
    const currentWeather = get().weather
    set({ 
      previousWeather: currentWeather,
      weather, 
      weatherTransitionProgress: 0.0,
      lastWeatherChange: Date.now() 
    })
  },

  setWeatherVariability: (variability: number) => {
    set({ weatherVariability: Math.max(0, Math.min(1, variability)) })
  },

  setAutoMode: (auto: boolean) => {
    if (auto) {
      set({ 
        isAutoMode: auto, 
        realStartTime: Date.now(),
        lastWeatherChange: Date.now()
      })
    } else {
      set({ isAutoMode: auto })
    }
  },

  setIsPlaying: (playing: boolean) => {
    set({ isPlaying: playing })
  },

  setTimeSpeed: (speed: number) => {
    set({ timeSpeed: Math.max(0.1, Math.min(10, speed)) })
  },

  resetDay: () => {
    const now = Date.now()
    set({ 
      hour: 6, 
      timeOfDay: 'day', 
      weather: 'clear',
      previousWeather: null,
      weatherTransitionProgress: 1.0,
      realStartTime: now,
      lastWeatherChange: now
    })
  },

  tick: () => {
    const state = get()
    if (!state.isAutoMode || !state.isPlaying) return

    const now = Date.now()
    const elapsed = (now - state.realStartTime) / 1000 // 轉換為秒
    const scaledTime = elapsed * state.timeSpeed

    // 計算當前小時 (0-24)
    const currentHour = (scaledTime / (state.dayDuration / 24)) % 24
    const normalizedHour = Math.floor(currentHour)
    const timeOfDay = getTimeOfDayFromHour(normalizedHour)

    // 計算天氣轉換進度 (每5秒完成一次轉換)
    const timeSinceWeatherChange = (now - state.lastWeatherChange) / 1000
    const transitionDuration = 5.0 // 5秒轉換時間
    const transitionProgress = Math.min(1.0, timeSinceWeatherChange / transitionDuration)

    // 天氣變化邏輯 - 增加隨機性和變異性
    const shouldChangeWeather = timeSinceWeatherChange > state.weatherChangeInterval
    let newWeather = state.weather
    let newPreviousWeather = state.previousWeather
    let newTransitionProgress = transitionProgress

    if (shouldChangeWeather) {
      // 根據天氣變異性決定是否真的要改變天氣
      const shouldActuallyChange = Math.random() < state.weatherVariability
      
      if (shouldActuallyChange) {
        // 增加相鄰天氣的權重，避免過於劇烈的變化
        const adjacentWeatherBonus = getAdjacentWeatherBonus(state.weather)
        const biasedWeather = getBiasedMountainWeather(normalizedHour, adjacentWeatherBonus)
        
        // 只有當新天氣與當前天氣不同時才變化
        if (biasedWeather !== state.weather) {
          newPreviousWeather = state.weather
          newWeather = biasedWeather
          newTransitionProgress = 0.0
        }
      }
    }

    set({
      hour: normalizedHour,
      timeOfDay,
      weather: newWeather,
      previousWeather: newPreviousWeather,
      weatherTransitionProgress: newTransitionProgress,
      lastWeatherChange: (shouldChangeWeather && newWeather !== state.weather) ? now : state.lastWeatherChange
    })
  }
}))

// 可愛風格的簡化時間設定 - 只有白天夜晚
export const TIME_SETTINGS = {
  day: {
    name: '白天',
    skyColor: '#87CEEB', // 天空藍色
    fogColor: '#B8E6FF', // 移除霧氣影響，使用純淨的淺藍
    ambientIntensity: 2.5, // 調到最亮的環境光（從1.6提升到2.5）
    sunIntensity: 3.5, // 調到最亮的陽光（從2.2提升到3.5）
    sunPosition: [0, 200, 0], // 天空正上方的陽光位置（會被動態計算覆蓋）
    sunColor: '#FFF8DC', // 更亮的陽光顏色（古董白）
    backgroundColor: '#87CEEB' // 天空藍色背景
  },
  night: {
    name: '夜晚',
    skyColor: '#87CEEB', // 更亮夜空 - 天藍色（與白天相同）
    fogColor: '#B0E0E6', // 更亮霧氣顏色 - 粉水藍
    ambientIntensity: 1.2, // 調亮夜晚環境光（從0.7提升到1.2）
    sunIntensity: 0.0,
    sunPosition: [0, -10, 0],
    sunColor: '#6495ED', // 調亮月光顏色
    backgroundColor: '#87CEEB' // 更亮背景色 - 天藍色
  }
}


// 可愛風格的天氣設定
export const WEATHER_SETTINGS = {
  clear: {
    name: '晴天',
    fogIntensity: 1.2,      // 清澈透明
    rainIntensity: 0,
    snowIntensity: 0,
    lightMultiplier: 1.3,   // 陽光滿滿
    sparkleEffect: true     // 可愛的閃爍效果
  },
  drizzle: {
    name: '細雨',
    fogIntensity: 0.9,      // 溫柔朦朧
    rainIntensity: 0.3,     // 輕柔細雨
    snowIntensity: 0,
    lightMultiplier: 0.9,   // 溫柔光線
    sparkleEffect: false
  }
}