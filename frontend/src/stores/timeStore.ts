import { create } from 'zustand'

export type TimeOfDay = 'day' | 'night'
export type WeatherType = 'clear' | 'rain' | 'snow' | 'fog' | 'storm'

interface TimeState {
  timeOfDay: TimeOfDay
  hour: number
  weather: WeatherType
  isAutoMode: boolean
  timeSpeed: number
  dayDuration: number // 一天的持續時間（秒）
  weatherChangeInterval: number // 天氣變化間隔（秒）
  lastWeatherChange: number // 上次天氣變化時間
  realStartTime: number // 真實開始時間
  setTimeOfDay: (time: TimeOfDay) => void
  setHour: (hour: number) => void
  setWeather: (weather: WeatherType) => void
  setAutoMode: (auto: boolean) => void
  setTimeSpeed: (speed: number) => void
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

// 天氣權重系統（影響隨機選擇）
const WEATHER_WEIGHTS: Record<WeatherType, number> = {
  clear: 40,    // 40% 晴天
  rain: 25,     // 25% 雨天  
  fog: 15,      // 15% 霧天
  snow: 10,     // 10% 雪天
  storm: 10     // 10% 暴風雨
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

export const useTimeStore = create<TimeState>((set, get) => ({
  timeOfDay: 'night',
  hour: 0,
  weather: 'clear',
  isAutoMode: false, // 關閉自動模式，固定為夜晚
  timeSpeed: 1,
  dayDuration: 10 * 60, // 10分鐘 = 600秒
  weatherChangeInterval: 1 * 60, // 1分鐘變化一次天氣 = 60秒
  lastWeatherChange: Date.now(),
  realStartTime: Date.now(),

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
    set({ weather, lastWeatherChange: Date.now() })
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
      hour: 0, 
      timeOfDay: 'night', 
      weather: 'clear',
      realStartTime: now,
      lastWeatherChange: now
    })
  },

  tick: () => {
    // 固定夜晚模式，不需要時間更新
    return
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
    name: '晴天',
    fogIntensity: 1.0,
    rainIntensity: 0,
    snowIntensity: 0,
    lightMultiplier: 1.0
  },
  rain: {
    name: '雨天',
    fogIntensity: 0.3,
    rainIntensity: 0.8, // 降低雨量強度
    snowIntensity: 0,
    lightMultiplier: 0.6
  },
  snow: {
    name: '雪天',
    fogIntensity: 0.5,
    rainIntensity: 0,
    snowIntensity: 0.6, // 降低雪量強度
    lightMultiplier: 0.8
  },
  fog: {
    name: '霧天',
    fogIntensity: 0.1,
    rainIntensity: 0,
    snowIntensity: 0,
    lightMultiplier: 0.4
  },
  storm: {
    name: '暴風雨',
    fogIntensity: 0.2,
    rainIntensity: 1.2, // 降低暴風雨強度
    snowIntensity: 0,
    lightMultiplier: 0.3
  }
}