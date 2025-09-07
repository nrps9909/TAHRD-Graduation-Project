import { create } from 'zustand'

export type TimeOfDay = 'day' | 'night'
export type WeatherType = 'clear' | 'drizzle' | 'snow'

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
  forceStopSnowInMorning: () => void
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
  clear: 50,    // 50% 晴天 - 美好天氣為主
  drizzle: 30,  // 30% 細雨 - 溫柔的細雨
  snow: 20      // 20% 下雪 - 浪漫雪花
}

// 根據時間調整的簡化天氣系統
const getMountainWeather = (hour: number): WeatherType => {
  const normalizedHour = hour % 24
  
  // 簡化的天氣模式：早晨晴朗，中午晴朗，傍晚細雨，深夜才下雪
  let weights = { ...WEATHER_WEIGHTS }
  
  // 清晨(4-9點) - 破曉時分，以晴朗為主，不下雪
  if (normalizedHour >= 4 && normalizedHour < 9) {
    weights = {
      clear: 60,    // 早晨多晴朗
      drizzle: 40,  // 晨間細雨
      snow: 0       // 早晨絕不下雪
    }
  }
  // 上午到中午(9-15點) - 天氣轉晴
  else if (normalizedHour >= 9 && normalizedHour < 15) {
    weights = {
      clear: 80,    // 白天以晴朗為主
      drizzle: 20,  // 少量細雨
      snow: 0       // 白天不下雪
    }
  }
  // 午後到傍晚(15-19點) - 變化天氣
  else if (normalizedHour >= 15 && normalizedHour < 19) {
    weights = {
      drizzle: 60,  // 午後容易有細雨
      clear: 40,    // 偶爾晴朗
      snow: 0       // 白天不下雪
    }
  }
  // 夜晚(19-4點) - 夜幕降臨，只有深夜才下雪
  else {
    // 深夜(22-3點)才允許下雪，其他夜晚時段不下雪
    if ((normalizedHour >= 22 && normalizedHour <= 23) || (normalizedHour >= 0 && normalizedHour < 3)) {
      weights = {
        clear: 40,    // 深夜晴朗
        drizzle: 30,  // 深夜細雨
        snow: 30      // 深夜可能下雪
      }
    } else {
      // 傍晚到夜晚早期(19-22點)和凌晨(3-4點)不下雪
      weights = {
        clear: 60,    // 夜晚晴朗
        drizzle: 40,  // 夜晚細雨
        snow: 0       // 不下雪
      }
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
    clear: ['drizzle', 'snow'],    // 晴天 -> 細雨或下雪
    drizzle: ['clear', 'snow'],    // 細雨 -> 晴天或下雪
    snow: ['clear', 'drizzle']     // 下雪 -> 晴天或細雨
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
  let weights: Partial<Record<WeatherType, number>>
  
  // 清晨(4-9點) - 破曉時分，以晴朗為主，不下雪
  if (normalizedHour >= 4 && normalizedHour < 9) {
    weights = {
      clear: 60,    // 早晨多晴朗
      drizzle: 40,  // 晨間細雨
      snow: 0       // 早晨絕不下雪
    }
  }
  // 上午到中午(9-15點) - 天氣轉晴
  else if (normalizedHour >= 9 && normalizedHour < 15) {
    weights = {
      clear: 80,    // 白天以晴朗為主
      drizzle: 20,  // 少量細雨
      snow: 0       // 白天不下雪
    }
  }
  // 午後到傍晚(15-19點) - 變化天氣
  else if (normalizedHour >= 15 && normalizedHour < 19) {
    weights = {
      drizzle: 60,  // 午後容易有細雨
      clear: 40,    // 偶爾晴朗
      snow: 0       // 白天不下雪
    }
  }
  // 夜晚(19-4點) - 夜幕降臨，只有深夜才下雪
  else {
    // 深夜(22-3點)才允許下雪，其他夜晚時段不下雪
    if ((normalizedHour >= 22 && normalizedHour <= 23) || (normalizedHour >= 0 && normalizedHour < 3)) {
      weights = {
        clear: 40,    // 深夜晴朗
        drizzle: 30,  // 深夜細雨
        snow: 30      // 深夜可能下雪
      }
    } else {
      // 傍晚到夜晚早期(19-22點)和凌晨(3-4點)不下雪
      weights = {
        clear: 60,    // 夜晚晴朗
        drizzle: 40,  // 夜晚細雨
        snow: 0       // 不下雪
      }
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

export const useTimeStore = create<TimeState>((set, get) => {
  // 初始化檢查：確保不會在早晨時間開始就下雪
  const initHour = 6
  const initWeather = (initHour >= 4 && initHour < 9) ? 'clear' : 'clear' // 早晨時間強制為晴天
  
  if (initWeather !== 'clear') {
    console.log(`🌅 初始化警告：防止早晨 ${initHour}:00 開始時下雪，強制設為晴天`)
  }

  return {
  timeOfDay: 'day',
  hour: initHour, // 從早晨6點開始
  minute: 0, // 分鐘
  weather: initWeather, // 確保初始化時早晨不下雪
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
    const state = get()
    const currentWeather = state.weather
    
    // 檢查是否在早晨時間(4-9點)試圖設定雪天氣
    const isMorning = state.hour >= 4 && state.hour < 9
    let finalWeather = weather
    
    if (weather === 'snow' && isMorning) {
      console.log(`🚫 禁止在早晨時間 (${state.hour}:${state.minute.toString().padStart(2, '0')}) 設定下雪天氣，強制改為晴天`)
      // 將雪天氣改為晴天
      finalWeather = 'clear'
    }
    
    console.log(`⚙️ setWeather: 原始=${weather}, 最終=${finalWeather}, 時間=${state.hour}:${state.minute.toString().padStart(2, '0')}`)
    
    set({ 
      previousWeather: currentWeather,
      weather: finalWeather, 
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
    console.log('🌅 重置為早晨 6:00，天氣設為晴天 (確保不下雪)')
    set({ 
      hour: 6, 
      timeOfDay: 'day', 
      weather: 'clear', // 確保重置時不是雪天
      previousWeather: null,
      weatherTransitionProgress: 1.0,
      realStartTime: now,
      lastWeatherChange: now
    })
  },

  forceStopSnowInMorning: () => {
    const state = get()
    const isMorning = state.hour >= 4 && state.hour < 9
    const isSnowing = state.weather === 'snow'
    
    if (isMorning && isSnowing) {
      console.log(`🌅 強制停止早晨下雪！當前時間: ${state.hour}:${state.minute.toString().padStart(2, '0')}`)
      set({ 
        previousWeather: state.weather,
        weather: 'clear',
        weatherTransitionProgress: 0.0,
        lastWeatherChange: Date.now()
      })
      return true // 返回 true 表示已清除雪天氣
    }
    return false // 返回 false 表示沒有雪天氣需要清除
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

    // 強制禁止早晨時間下雪 - 如果當前是早晨4-9點且正在下雪，立即切換為晴天
    const isMorning = normalizedHour >= 4 && normalizedHour < 9
    const forceWeatherChange = isMorning && state.weather === 'snow'

    // 計算天氣轉換進度 (每5秒完成一次轉換)
    const timeSinceWeatherChange = (now - state.lastWeatherChange) / 1000
    const transitionDuration = 5.0 // 5秒轉換時間
    const transitionProgress = Math.min(1.0, timeSinceWeatherChange / transitionDuration)

    // 天氣變化邏輯 - 增加隨機性和變異性
    const shouldChangeWeather = timeSinceWeatherChange > state.weatherChangeInterval || forceWeatherChange
    let newWeather = state.weather
    let newPreviousWeather = state.previousWeather
    let newTransitionProgress = transitionProgress

    if (shouldChangeWeather) {
      if (forceWeatherChange) {
        // 強制將雪天切換為晴天或細雨
        console.log(`🌅 早晨時間強制停止下雪 (${normalizedHour}:00)`)
        newPreviousWeather = state.weather
        newWeather = Math.random() > 0.4 ? 'clear' : 'drizzle' // 60%晴天，40%細雨
        newTransitionProgress = 0.0
      } else {
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
}
});

// 可愛風格的簡化時間設定 - 只有白天夜晚
export const TIME_SETTINGS = {
  day: {
    name: '白天',
    skyColor: '#87CEEB', // 天空藍色
    fogColor: '#B8E6FF', // 淺藍霧氣
    ambientIntensity: 1.5, // 調整為適中的環境光強度
    sunIntensity: 3.5, // 調到最亮的陽光（從2.2提升到3.5）
    sunPosition: [0, 200, 0], // 天空正上方的陽光位置（會被動態計算覆蓋）
    sunColor: '#FFF8DC', // 更亮的陽光顏色（古董白）
    backgroundColor: '#87CEEB' // 天空藍色背景
  },
  night: {
    name: '夜晚',
    skyColor: '#87CEEB', // 更亮夜空 - 天藍色（與白天相同）
    fogColor: '#B0E0E6', // 更亮霧氣顏色 - 粉水藍
    ambientIntensity: 0.8, // 調整為適中的夜晚環境光
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
  },
  snow: {
    name: '下雪',
    fogIntensity: 0.7,      // 雪霧朦朧
    rainIntensity: 0,
    snowIntensity: 1.0,     // 浪漫雪花
    lightMultiplier: 0.8,   // 柔和雪光
    sparkleEffect: true     // 雪花閃爍
  },
}