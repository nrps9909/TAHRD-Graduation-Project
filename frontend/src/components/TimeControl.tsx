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
    { key: 'day', label: '白天' },
    { key: 'night', label: '夜晚' }
  ]

  const weatherOptions: { key: WeatherType; label: string; emoji: string }[] = [
    { key: 'clear', label: '晴天', emoji: '☀️' },
    { key: 'drizzle', label: '細雨', emoji: '🌧️' },
    { key: 'snow', label: '雪天', emoji: '❄️' }
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

      {/* 日夜循環進度 */}
      <div className="mb-4">
        <div className="text-sm opacity-75 mb-2">🔄 循環進度 (6分鐘/天)</div>
        <div className="w-full bg-gray-600 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-yellow-400 to-blue-600 h-2 rounded-full transition-all duration-200" 
            style={{width: `${getDayProgress()}%`}}
          ></div>
        </div>
        <div className="text-xs opacity-75 mt-1">
          天氣變化倒計時: {Math.floor(getWeatherCountdown())}秒
        </div>
      </div>

      {/* 自動模式控制 */}
      <div className="mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isAutoMode}
            onChange={(e) => setAutoMode(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">⏰ 自動日夜循環</span>
        </label>
      </div>

      {/* 手動時間控制 */}
      {!isAutoMode && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold mb-2">🕐 時間控制</h4>
          <div className="grid grid-cols-2 gap-2">
            {timeOptions.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTimeOfDay(key)}
                className={`px-2 py-2 rounded text-sm transition-colors ${
                  timeOfDay === key
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-600 hover:bg-gray-500 text-gray-200'
                }`}
              >
                {key === 'day' ? '☀️' : '🌙'} {label}
              </button>
            ))}
          </div>
          
          {/* 時間滑桿 */}
          <div className="mt-2">
            <label className="text-xs opacity-75">時間: {Math.floor(hour)}:00</label>
            <input
              type="range"
              min="0"
              max="23"
              value={Math.floor(hour)}
              onChange={(e) => setHour(parseInt(e.target.value))}
              className="w-full mt-1"
            />
          </div>
        </div>
      )}

      {/* 時間速度控制 */}
      <div className="mb-4">
        <label className="text-xs opacity-75">時間速度: {timeSpeed}x</label>
        <input
          type="range"
          min="0.1"
          max="5"
          step="0.1"
          value={timeSpeed}
          onChange={(e) => setTimeSpeed(parseFloat(e.target.value))}
          className="w-full mt-1"
        />
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

      {/* 重置按鈕 */}
      <div className="mb-2">
        <button
          onClick={resetDay}
          className="w-full px-3 py-2 rounded text-sm bg-red-600 hover:bg-red-700 text-white transition-colors"
        >
          🔄 重置為早晨6點
        </button>
      </div>

    </div>
  )
}