/**
 * 環境系統狀態管理 - 時間與天氣
 *
 * 時間系統：
 * - 每30分鐘完成一次日夜循環
 * - 晚上12:00月亮在正上方，以此類推
 * - 時間與現實世界同步
 *
 * 天氣系統：
 * - 根據使用者定位獲取真實天氣
 * - 支援多種天氣效果渲染
 */

import { create } from 'zustand'
import { Vector3 } from 'three'

// 天氣類型定義
export type WeatherType =
  | 'clear'       // 晴天
  | 'cloudy'      // 多雲
  | 'rainy'       // 雨天
  | 'stormy'      // 暴風雨
  | 'snowy'       // 雪天
  | 'foggy'       // 霧天
  | 'partly-cloudy' // 局部多雲

// 時間系統配置
const TIME_CONFIG = {
  NIGHT_START_HOUR: 18,            // 晚上6點開始變暗
  NIGHT_END_HOUR: 6,               // 早上6點開始變亮
}

// 天氣資料介面
interface WeatherData {
  type: WeatherType
  temperature: number        // 溫度（攝氏）
  humidity: number          // 濕度（百分比）
  windSpeed: number         // 風速（m/s）
  description: string       // 天氣描述
  location: string          // 位置名稱
  lastUpdated: Date         // 最後更新時間
}

// 天體位置資料
interface CelestialPosition {
  position: Vector3         // 3D 位置
  intensity: number         // 光照強度
  color: string            // 光照顏色
}

interface EnvironmentStore {
  // ========== 時間系統 ==========

  // 當前遊戲時間（0-24小時，浮點數）
  gameTime: number

  // 是否為夜晚
  isNight: boolean

  // 太陽位置
  sunPosition: CelestialPosition

  // 月亮位置
  moonPosition: CelestialPosition

  // 時間循環是否啟用
  timeEnabled: boolean

  // ========== 天氣系統 ==========

  // 當前天氣資料
  weather: WeatherData | null

  // 天氣載入狀態
  weatherLoading: boolean

  // 使用者位置（經緯度）
  userLocation: { lat: number; lon: number } | null

  // 天氣自動更新是否啟用
  weatherEnabled: boolean

  // ========== 方法 ==========

  // 更新遊戲時間
  updateGameTime: () => void

  // 計算天體位置
  updateCelestialPositions: () => void

  // 獲取使用者位置
  requestUserLocation: () => Promise<void>

  // 獲取天氣資料
  fetchWeather: () => Promise<void>

  // 手動設置天氣（用於測試或特殊情況）
  setWeather: (weather: WeatherData) => void

  // 切換時間系統
  toggleTime: (enabled: boolean) => void

  // 切換天氣系統
  toggleWeather: (enabled: boolean) => void

  // 初始化環境系統
  initialize: () => void
}

/**
 * 計算遊戲時間（使用真實世界時間）
 */
function calculateGameTime(): number {
  const now = new Date()
  const hours = now.getHours()
  const minutes = now.getMinutes()
  const seconds = now.getSeconds()

  // 轉換為24小時制的浮點數（例如：14:30:30 = 14.508333）
  const gameHour = hours + minutes / 60 + seconds / 3600
  return gameHour
}

/**
 * 判斷是否為夜晚
 */
function isNightTime(gameTime: number): boolean {
  return gameTime >= TIME_CONFIG.NIGHT_START_HOUR || gameTime < TIME_CONFIG.NIGHT_END_HOUR
}

/**
 * 計算太陽位置（基於遊戲時間）
 * 中午12:00太陽在正上方
 */
function calculateSunPosition(gameTime: number): CelestialPosition {
  // 將時間轉換為角度（0-360度）
  const angle = (gameTime / 24) * Math.PI * 2 - Math.PI / 2

  // 計算太陽軌跡（半圓弧）
  const radius = 400
  const x = Math.cos(angle) * radius
  const y = Math.sin(angle) * radius
  const z = 100

  // 計算光照強度（白天最亮，夜晚為0）
  const intensity = Math.max(0, Math.sin(angle)) * 1.2

  // 根據時間計算顏色（黃昏偏紅，正午偏白）
  let color = '#ffffff'
  if (gameTime >= 17 && gameTime <= 19) {
    color = '#ff9966' // 黃昏橘色
  } else if (gameTime >= 5 && gameTime <= 7) {
    color = '#ffcc99' // 日出淡橘
  } else if (gameTime >= 10 && gameTime <= 14) {
    color = '#ffffee' // 正午白色
  }

  return {
    position: new Vector3(x, y, z),
    intensity,
    color
  }
}

/**
 * 計算月亮位置（基於遊戲時間）
 * 晚上12:00（午夜）月亮在正上方
 */
function calculateMoonPosition(gameTime: number): CelestialPosition {
  // 月亮與太陽相反，偏移12小時
  const moonTime = (gameTime + 12) % 24
  const angle = (moonTime / 24) * Math.PI * 2 - Math.PI / 2

  const radius = 350
  const x = Math.cos(angle) * radius
  const y = Math.sin(angle) * radius
  const z = -100

  // 月亮在夜晚才有光照
  const intensity = Math.max(0, Math.sin(angle)) * 0.4

  const color = '#b0c4de' // 淡藍色月光

  return {
    position: new Vector3(x, y, z),
    intensity,
    color
  }
}

/**
 * 使用 Geocoding API 將經緯度轉換為地名
 */
async function getLocationName(lat: number, lon: number): Promise<string> {
  try {
    // 使用免費的 Nominatim API (OpenStreetMap)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=zh-TW&zoom=10`,
      {
        headers: {
          'User-Agent': 'HeartWhisperTown/1.0' // Nominatim 要求設置 User-Agent
        }
      }
    )

    if (response.ok) {
      const data = await response.json()
      console.log('📍 地理編碼原始資料:', data.address)

      // 台灣地址優化：優先顯示縣市 + 區域
      const address = data.address

      // 嘗試組合更友善的地名
      const locationParts: string[] = []

      // 第一部分：縣市級別
      if (address.state) {
        locationParts.push(address.state)
      } else if (address.county) {
        locationParts.push(address.county)
      } else if (address.city) {
        locationParts.push(address.city)
      }

      // 第二部分：區域級別（只在有縣市的情況下才加）
      if (locationParts.length > 0) {
        if (address.city_district) {
          locationParts.push(address.city_district)
        } else if (address.district) {
          locationParts.push(address.district)
        } else if (address.town) {
          locationParts.push(address.town)
        } else if (address.suburb) {
          locationParts.push(address.suburb)
        }
      }

      // 如果有組合出地名，使用它
      if (locationParts.length > 0) {
        const locationName = locationParts.join(' ')
        console.log('📍 最終地名:', locationName)
        return locationName
      }

      // 後備方案
      const fallback = address.city ||
                      address.town ||
                      address.village ||
                      address.county ||
                      address.state ||
                      '未知位置'

      console.log('📍 使用後備地名:', fallback)
      return fallback
    }
  } catch (error) {
    console.warn('❌ 獲取地名失敗:', error)
  }

  return `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`
}

/**
 * 使用 OpenWeatherMap API 獲取天氣
 */
async function fetchWeatherData(lat: number, lon: number): Promise<WeatherData> {
  // API Key 直接寫在代碼中
  const apiKey = '5975354eb80783472e9e596978b05751'

  // 獲取位置名稱（不需要 API Key）
  const locationName = await getLocationName(lat, lon)

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=zh_tw`
    )

    if (!response.ok) {
      throw new Error('Weather API request failed')
    }

    const data = await response.json()
    console.log('🌤️ OpenWeather API 完整資料:', data)
    console.log('🌡️ 溫度資訊:', {
      apiLocation: data.name,
      ourLocation: locationName,
      weather: data.weather[0].main,
      description: data.weather[0].description,
      temperature: data.main.temp,
      feelsLike: data.main.feels_like,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed
    })

    // 映射 OpenWeatherMap 的天氣代碼到我們的類型
    const weatherType = mapOpenWeatherToType(data.weather[0].main)

    // 優先使用我們自己的地理編碼結果，因為它更準確
    const finalLocation = locationName || data.name || '未知位置'
    console.log('✅ 最終使用地名:', finalLocation)

    return {
      type: weatherType,
      temperature: data.main.temp,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      description: data.weather[0].description,
      location: finalLocation,
      lastUpdated: new Date()
    }
  } catch (error) {
    console.error('❌ 獲取天氣失敗:', error)

    // 即使 API 失敗，也返回帶有位置的預設天氣
    return {
      ...getDefaultWeather(),
      location: locationName
    }
  }
}

/**
 * 映射 OpenWeatherMap 天氣類型
 */
function mapOpenWeatherToType(weatherMain: string): WeatherType {
  const mapping: Record<string, WeatherType> = {
    'Clear': 'clear',
    'Clouds': 'cloudy',
    'Rain': 'rainy',
    'Drizzle': 'rainy',
    'Thunderstorm': 'stormy',
    'Snow': 'snowy',
    'Mist': 'foggy',
    'Fog': 'foggy',
    'Haze': 'foggy'
  }

  return mapping[weatherMain] || 'clear'
}

/**
 * 預設天氣（當無法獲取時使用）
 */
function getDefaultWeather(): WeatherData {
  return {
    type: 'clear',
    temperature: 25,
    humidity: 60,
    windSpeed: 3,
    description: '晴朗',
    location: '未知位置',
    lastUpdated: new Date()
  }
}

// 建立 Store
export const useEnvironmentStore = create<EnvironmentStore>((set, get) => ({
  // 初始狀態
  gameTime: calculateGameTime(),
  isNight: false,
  sunPosition: calculateSunPosition(calculateGameTime()),
  moonPosition: calculateMoonPosition(calculateGameTime()),
  timeEnabled: true,

  weather: null,
  weatherLoading: false,
  userLocation: null,
  weatherEnabled: true,

  // 更新遊戲時間
  updateGameTime: () => {
    const { timeEnabled } = get()
    if (!timeEnabled) return

    const newGameTime = calculateGameTime()
    const newIsNight = isNightTime(newGameTime)

    set({
      gameTime: newGameTime,
      isNight: newIsNight
    })

    // 同時更新天體位置
    get().updateCelestialPositions()
  },

  // 計算天體位置
  updateCelestialPositions: () => {
    const { gameTime } = get()

    set({
      sunPosition: calculateSunPosition(gameTime),
      moonPosition: calculateMoonPosition(gameTime)
    })
  },

  // 請求使用者位置
  requestUserLocation: async () => {
    if (!navigator.geolocation) {
      console.warn('⚠️ Geolocation not supported')
      return
    }

    // 先嘗試從 localStorage 載入上次的位置
    try {
      const savedLocation = localStorage.getItem('userLocation')
      const savedTimestamp = localStorage.getItem('userLocationTimestamp')

      if (savedLocation && savedTimestamp) {
        const location = JSON.parse(savedLocation)
        const timestamp = parseInt(savedTimestamp)
        const now = Date.now()
        const thirtyMinutes = 30 * 60 * 1000

        // 如果位置是 30 分鐘內儲存的，就使用它
        if (now - timestamp < thirtyMinutes) {
          console.log('📍 使用已儲存的位置:', location)
          set({ userLocation: location })
          get().fetchWeather()
          return
        } else {
          console.log('📍 儲存的位置已過期（超過30分鐘），重新獲取')
        }
      }
    } catch (error) {
      console.warn('⚠️ 無法讀取儲存的位置:', error)
    }

    // 如果沒有儲存的位置或已過期，才請求新位置
    return new Promise((resolve, reject) => {
      console.log('📍 請求瀏覽器定位...')
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          const location = { lat: latitude, lon: longitude }

          // 儲存位置到 localStorage
          try {
            localStorage.setItem('userLocation', JSON.stringify(location))
            localStorage.setItem('userLocationTimestamp', Date.now().toString())
            console.log('✅ 位置已儲存:', location)
          } catch (error) {
            console.warn('⚠️ 無法儲存位置:', error)
          }

          set({ userLocation: location })

          // 獲取位置後自動獲取天氣
          get().fetchWeather()
          resolve()
        },
        (error) => {
          console.error('❌ 獲取位置失敗:', error)
          reject(error)
        }
      )
    })
  },

  // 獲取天氣資料
  fetchWeather: async () => {
    const { userLocation, weatherEnabled } = get()

    if (!weatherEnabled) return
    if (!userLocation) {
      console.warn('User location not available')
      return
    }

    set({ weatherLoading: true })

    try {
      const weatherData = await fetchWeatherData(
        userLocation.lat,
        userLocation.lon
      )

      set({
        weather: weatherData,
        weatherLoading: false
      })
    } catch (error) {
      console.error('Failed to fetch weather:', error)
      set({
        weather: getDefaultWeather(),
        weatherLoading: false
      })
    }
  },

  // 手動設置天氣
  setWeather: (weather: WeatherData) => {
    set({ weather })
  },

  // 切換時間系統
  toggleTime: (enabled: boolean) => {
    set({ timeEnabled: enabled })
  },

  // 切換天氣系統
  toggleWeather: (enabled: boolean) => {
    set({ weatherEnabled: enabled })
  },

  // 初始化環境系統
  initialize: () => {
    console.log('🌍 Initializing environment system...')

    // 初始化時間
    get().updateGameTime()

    // 先設置預設天氣，確保UI有內容顯示
    set({ weather: getDefaultWeather() })
    console.log('✓ Default weather set')

    // 嘗試獲取位置和天氣（非阻塞）
    get().requestUserLocation().then(() => {
      console.log('✓ Location obtained, fetching weather...')
    }).catch((error) => {
      console.warn('⚠ Could not get location:', error.message)
      console.log('Using default weather')
    })

    // 設置定時更新（每秒更新一次時間）
    const timeInterval = setInterval(() => {
      get().updateGameTime()
    }, 1000)

    // 設置天氣和位置自動更新（每30分鐘更新一次）
    const weatherInterval = setInterval(() => {
      console.log('🔄 自動更新位置和天氣...')
      // 每30分鐘重新獲取位置和天氣
      get().requestUserLocation()
    }, 30 * 60 * 1000)

    console.log('✓ Environment system initialized')

    // 清理函數（雖然在這個架構下不會被呼叫）
    return () => {
      clearInterval(timeInterval)
      clearInterval(weatherInterval)
    }
  }
}))
