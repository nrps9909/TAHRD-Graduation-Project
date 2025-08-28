import { create } from 'zustand'

export type TimeOfDay = 'day' | 'night'
export type WeatherType = 'clear' | 'rain' | 'snow' | 'fog' | 'storm' | 'cloudy' | 'mist' | 'drizzle' | 'windy'

interface TimeState {
  timeOfDay: TimeOfDay
  hour: number
  weather: WeatherType
  previousWeather: WeatherType | null // 前一個天氣狀態
  weatherTransitionProgress: number // 天氣轉換進度 (0-1)
  isAutoMode: boolean
  timeSpeed: number
  dayDuration: number // 一天的持續時間（秒）
  weatherChangeInterval: number // 天氣變化間隔（秒）
  lastWeatherChange: number // 上次天氣變化時間
  realStartTime: number // 真實開始時間
  weatherVariability: number // 天氣變化的隨機性 (0-1)
  setTimeOfDay: (time: TimeOfDay) => void
  setHour: (hour: number) => void
  setWeather: (weather: WeatherType) => void
  setAutoMode: (auto: boolean) => void
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

// 根據小時獲取時間段
const getTimeOfDayFromHour = (hour: number): TimeOfDay => {
  if (hour >= 6 && hour < 18) return 'day'    // 6-18點為白天
  return 'night'                               // 18-6點為夜晚
}

// 山地天氣權重系統 - 更符合山地特性，增加更多變化
const WEATHER_WEIGHTS: Record<WeatherType, number> = {
  clear: 20,    // 20% 晴天 - 山地晴天較少
  cloudy: 25,   // 25% 多雲 - 山區常見天氣
  fog: 20,      // 20% 霧天 - 山地特有的雲霧
  mist: 15,     // 15% 薄霧 - 輕微霧氣
  rain: 12,     // 12% 雨天 - 山區午後雷陣雨
  drizzle: 8,   // 8% 細雨 - 山區細雨綿綿
  windy: 10,    // 10% 大風 - 山區風大
  snow: 6,      // 6% 雪天 - 高山積雪
  storm: 4      // 4% 暴風雨 - 山區暴雨較少但激烈
}

// 根據時間調整的山地天氣系統
const getMountainWeather = (hour: number): WeatherType => {
  const normalizedHour = hour % 24
  
  // 山地天氣模式：早晨多霧，午後雷雨，夜晚清朗
  let weights = { ...WEATHER_WEIGHTS }
  
  // 清晨(4-6點) - 破曉時分
  if (normalizedHour >= 4 && normalizedHour < 6) {
    weights = {
      mist: 40,     // 清晨薄霧
      fog: 30,      // 濃霧
      clear: 15,    // 偶爾晴朗
      cloudy: 10,
      drizzle: 5,
      rain: 0, snow: 0, storm: 0, windy: 0
    }
  }
  // 早晨(6-9點) - 山谷霧氣散去
  else if (normalizedHour >= 6 && normalizedHour < 9) {
    weights = {
      fog: 35,      // 晨霧漸散
      mist: 25,     // 輕霧
      cloudy: 20,   // 多雲
      clear: 15,    // 晴朗
      windy: 5,     // 晨風
      rain: 0, snow: 0, storm: 0, drizzle: 0
    }
  }
  // 上午(9-12點) - 天氣轉晴
  else if (normalizedHour >= 9 && normalizedHour < 12) {
    weights = {
      clear: 35,    // 上午較晴朗
      cloudy: 30,   // 多雲
      mist: 20,     // 殘留薄霧
      windy: 10,    // 山風
      drizzle: 5,   // 偶爾細雨
      fog: 0, rain: 0, snow: 0, storm: 0
    }
  }
  // 中午(12-15點) - 最穩定時段
  else if (normalizedHour >= 12 && normalizedHour < 15) {
    weights = {
      clear: 40,    // 中午陽光最佳
      cloudy: 35,   // 白雲朵朵
      windy: 15,    // 山風較強
      mist: 8,      // 偶有薄霧
      drizzle: 2,   // 極少細雨
      fog: 0, rain: 0, snow: 0, storm: 0
    }
  }
  // 午後(15-17點) - 對流天氣
  else if (normalizedHour >= 15 && normalizedHour < 17) {
    weights = {
      rain: 25,     // 午後雷陣雨
      storm: 15,    // 雷暴開始
      cloudy: 25,   // 積雨雲
      drizzle: 15,  // 陣雨前細雨
      windy: 12,    // 風雨前兆
      clear: 8,     // 雨前晴朗
      mist: 0, fog: 0, snow: 0
    }
  }
  // 傍晚(17-19點) - 天氣漸穩
  else if (normalizedHour >= 17 && normalizedHour < 19) {
    weights = {
      cloudy: 30,   // 傍晚多雲
      clear: 25,    // 夕陽西下
      mist: 20,     // 晚霞薄霧
      drizzle: 15,  // 餘雨綿綿
      windy: 8,     // 晚風
      rain: 2,      // 偶有陣雨
      fog: 0, snow: 0, storm: 0
    }
  }
  // 夜晚(19-23點) - 夜幕降臨
  else if (normalizedHour >= 19 && normalizedHour < 23) {
    weights = {
      clear: 35,    // 夜晚較清朗
      cloudy: 25,   // 夜雲
      mist: 20,     // 夜間薄霧
      windy: 12,    // 夜風
      fog: 8,       // 夜霧
      drizzle: 0, rain: 0, snow: 0, storm: 0
    }
  }
  // 深夜(23-4點) - 最寧靜時段
  else {
    weights = {
      clear: 45,    // 深夜星空
      mist: 25,     // 夜霧縹緲
      cloudy: 20,   // 夜雲遮月
      fog: 8,       // 濃霧偶現
      windy: 2,     // 夜風微弱
      rain: 0, snow: 0, storm: 0, drizzle: 0
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

const getRandomWeather = (): WeatherType => {
  const totalWeight = Object.values(WEATHER_WEIGHTS).reduce((sum, weight) => sum + weight, 0)
  let random = Math.random() * totalWeight
  
  for (const [weather, weight] of Object.entries(WEATHER_WEIGHTS)) {
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
    clear: ['cloudy', 'windy', 'mist'],
    cloudy: ['clear', 'mist', 'drizzle', 'windy'],
    mist: ['fog', 'cloudy', 'clear', 'drizzle'],
    fog: ['mist', 'drizzle', 'cloudy'],
    drizzle: ['rain', 'mist', 'cloudy', 'fog'],
    rain: ['drizzle', 'storm', 'cloudy', 'fog'],
    storm: ['rain', 'windy', 'cloudy'],
    windy: ['clear', 'cloudy', 'storm'],
    snow: ['mist', 'fog', 'cloudy'] // 雪天相對獨立
  }

  const bonus: Partial<Record<WeatherType, number>> = {}
  const adjacentWeathers = adjacencyMap[currentWeather] || []
  
  adjacentWeathers.forEach(weather => {
    bonus[weather] = 20 // 為相鄰天氣增加20點權重
  })
  
  return bonus
}

// 帶權重偏向的山地天氣選擇
const getBiasedMountainWeather = (hour: number, bonus: Partial<Record<WeatherType, number>>): WeatherType => {
  const normalizedHour = hour % 24
  
  // 獲取基礎權重
  let weights = { ...WEATHER_WEIGHTS }
  
  // 應用時間段權重（與原有邏輯相同）
  if (normalizedHour >= 4 && normalizedHour < 6) {
    weights = {
      mist: 40, fog: 30, clear: 15, cloudy: 10, drizzle: 5,
      rain: 0, snow: 0, storm: 0, windy: 0
    }
  } else if (normalizedHour >= 6 && normalizedHour < 9) {
    weights = {
      fog: 35, mist: 25, cloudy: 20, clear: 15, windy: 5,
      rain: 0, snow: 0, storm: 0, drizzle: 0
    }
  } else if (normalizedHour >= 9 && normalizedHour < 12) {
    weights = {
      clear: 35, cloudy: 30, mist: 20, windy: 10, drizzle: 5,
      fog: 0, rain: 0, snow: 0, storm: 0
    }
  } else if (normalizedHour >= 12 && normalizedHour < 15) {
    weights = {
      clear: 40, cloudy: 35, windy: 15, mist: 8, drizzle: 2,
      fog: 0, rain: 0, snow: 0, storm: 0
    }
  } else if (normalizedHour >= 15 && normalizedHour < 17) {
    weights = {
      rain: 25, storm: 15, cloudy: 25, drizzle: 15, windy: 12, clear: 8,
      mist: 0, fog: 0, snow: 0
    }
  } else if (normalizedHour >= 17 && normalizedHour < 19) {
    weights = {
      cloudy: 30, clear: 25, mist: 20, drizzle: 15, windy: 8, rain: 2,
      fog: 0, snow: 0, storm: 0
    }
  } else if (normalizedHour >= 19 && normalizedHour < 23) {
    weights = {
      clear: 35, cloudy: 25, mist: 20, windy: 12, fog: 8,
      drizzle: 0, rain: 0, snow: 0, storm: 0
    }
  } else {
    weights = {
      clear: 45, mist: 25, cloudy: 20, fog: 8, windy: 2,
      rain: 0, snow: 0, storm: 0, drizzle: 0
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
  weather: 'clear',
  previousWeather: null,
  weatherTransitionProgress: 1.0, // 開始時完全轉換完成
  isAutoMode: true, // 啟用自動模式
  timeSpeed: 1,
  dayDuration: 30 * 60, // 30分鐘 = 1800秒
  weatherChangeInterval: 150, // 150秒(2.5分鐘)變化一次天氣，按比例調整
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
    if (!state.isAutoMode) return

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

// 時間相關的顏色和設定 - 簡化為白天夜晚
export const TIME_SETTINGS = {
  day: {
    name: '白天',
    skyColor: '#87CEEB', // 天藍色
    fogColor: '#B0E0E6',
    ambientIntensity: 1.0,
    sunIntensity: 1.5,
    sunPosition: [0, 25, 0],
    sunColor: '#FFFFFF',
    backgroundColor: '#87CEEB'
  },
  night: {
    name: '夜晚',
    skyColor: '#2E2E5C', // 調亮夜空 - 從深藍到中等深藍
    fogColor: '#5A5A8B', // 調亮霧氣顏色
    ambientIntensity: 0.5, // 增強環境光
    sunIntensity: 0.0,
    sunPosition: [0, -10, 0],
    sunColor: '#6495ED', // 調亮月光顏色
    backgroundColor: '#1A1A2E' // 調亮背景色
  }
}


export const WEATHER_SETTINGS = {
  clear: {
    name: '晴朗',
    fogIntensity: 1.0,      // 山地晴天能見度極佳
    rainIntensity: 0,
    snowIntensity: 0,
    lightMultiplier: 1.2    // 高山陽光更強
  },
  cloudy: {
    name: '多雲',
    fogIntensity: 0.8,      // 多雲天氣能見度良好
    rainIntensity: 0,
    snowIntensity: 0,
    lightMultiplier: 0.9    // 雲層遮擋部分陽光
  },
  mist: {
    name: '薄霧',
    fogIntensity: 0.6,      // 輕微霧氣
    rainIntensity: 0,
    snowIntensity: 0,
    lightMultiplier: 0.7    // 薄霧影響光線
  },
  fog: {
    name: '山嵐',
    fogIntensity: 0.15,     // 山嵐濃霧，能見度極低
    rainIntensity: 0,
    snowIntensity: 0,
    lightMultiplier: 0.3    // 霧氣嚴重影響光線
  },
  drizzle: {
    name: '細雨',
    fogIntensity: 0.5,      // 細雨伴隨薄霧
    rainIntensity: 0.3,     // 細雨綿綿
    snowIntensity: 0,
    lightMultiplier: 0.8    // 細雨輕微影響光線
  },
  rain: {
    name: '山雨',
    fogIntensity: 0.3,      // 山雨伴隨霧氣
    rainIntensity: 1.0,     // 山區雨勢較強
    snowIntensity: 0,
    lightMultiplier: 0.5    // 雨天光線被遮擋
  },
  windy: {
    name: '大風',
    fogIntensity: 0.9,      // 大風吹散霧氣
    rainIntensity: 0,
    snowIntensity: 0,
    lightMultiplier: 1.1    // 風吹雲散，光線較好
  },
  snow: {
    name: '飄雪',
    fogIntensity: 0.4,      // 雪天伴隨薄霧
    rainIntensity: 0,
    snowIntensity: 0.8,     // 山區雪量
    lightMultiplier: 0.9    // 雪反光增強亮度
  },
  storm: {
    name: '山雷',
    fogIntensity: 0.25,     // 雷暴前的濃霧
    rainIntensity: 1.5,     // 山地雷暴雨勢猛烈
    snowIntensity: 0,
    lightMultiplier: 0.2    // 烏雲蔽日
  }
}