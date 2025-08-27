import React from 'react'
import { useTimeStore, TIME_SETTINGS, WEATHER_SETTINGS, TimeOfDay, WeatherType } from '@/stores/timeStore'

export const TimeControl = () => {
  const { 
    timeOfDay, 
    hour,
    weather,
    isAutoMode, 
    timeSpeed,
    dayDuration,
    weatherChangeInterval,
    lastWeatherChange,
    realStartTime,
    setTimeOfDay, 
    setHour,
    setWeather,
    setAutoMode, 
    setTimeSpeed,
    resetDay
  } = useTimeStore()

  // 計算日夜循環進度
  const getDayProgress = () => {
    const now = Date.now()
    const elapsedSeconds = (now - realStartTime) / 1000 * timeSpeed
    return (elapsedSeconds / dayDuration) * 100
  }

  // 計算下次天氣變化倒計時
  const getWeatherCountdown = () => {
    const now = Date.now()
    const timeSinceWeatherChange = (now - lastWeatherChange) / 1000 * timeSpeed
    const remainingTime = weatherChangeInterval - timeSinceWeatherChange
    return Math.max(0, remainingTime)
  }

  const timeOptions: { key: TimeOfDay; label: string }[] = [
    { key: 'night', label: '夜晚' }
  ]

  const weatherOptions: { key: WeatherType; label: string; emoji: string }[] = [
    { key: 'clear', label: '晴天', emoji: '☀️' },
    { key: 'rain', label: '雨天', emoji: '🌧️' },
    { key: 'snow', label: '雪天', emoji: '❄️' },
    { key: 'fog', label: '霧天', emoji: '🌫️' },
    { key: 'storm', label: '暴風雨', emoji: '⛈️' }
  ]

  return (
    <div className="fixed top-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg p-4 text-white min-w-[320px] z-50">
      <h3 className="text-lg font-semibold mb-3 text-center">🕐 時間 & 天氣系統</h3>
      
      {/* 當前時間顯示 */}
      <div className="mb-4 text-center">
        <div className="text-2xl font-bold">
          {Math.floor(hour).toString().padStart(2, '0')}:
          {Math.floor((hour % 1) * 60).toString().padStart(2, '0')}
        </div>
        <div className="text-sm opacity-75">
          {TIME_SETTINGS[timeOfDay].name} • {WEATHER_SETTINGS[weather].name}
        </div>
      </div>

      {/* 固定夜晚模式提示 */}
      <div className="mb-4 text-center">
        <div className="text-sm opacity-75 bg-blue-900/50 rounded p-2">
          🌙 固定夜晚模式 - 享受寧靜星空
        </div>
      </div>

      {/* 固定夜晚按鈕 */}
      <div className="mb-4">
        <button
          className="w-full px-3 py-2 rounded text-sm bg-blue-500 text-white cursor-default"
          disabled
        >
          🌙 夜晚模式
        </button>
      </div>

      {/* 天氣控制 */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold mb-2">🌤️ 天氣設定</h4>
        <div className="grid grid-cols-2 gap-2">
          {weatherOptions.map(({ key, label, emoji }) => (
            <button
              key={key}
              onClick={() => setWeather(key)}
              className={`px-2 py-2 rounded text-sm transition-colors flex items-center gap-1 ${
                weather === key
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-600 hover:bg-gray-500 text-gray-200'
              }`}
            >
              <span>{emoji}</span>
              <span className="text-xs">{label}</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  )
}