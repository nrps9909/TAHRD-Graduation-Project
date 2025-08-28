import React, { useState } from 'react'
import { useTimeStore } from '@/stores/timeStore'

export const DebugPanel = () => {
  const { 
    hour, 
    minute, 
    timeOfDay, 
    weather, 
    setHour, 
    setMinute, 
    setWeather, 
    isPlaying,
    setIsPlaying 
  } = useTimeStore()
  
  const [isOpen, setIsOpen] = useState(false)

  const handleTimeChange = (newHour: number, newMinute: number) => {
    setHour(newHour)
    setMinute(newMinute)
  }

  const weatherOptions = [
    { value: 'clear', label: '☀️ 晴朗', color: 'text-yellow-500' },
    { value: 'cloudy', label: '☁️ 多雲', color: 'text-gray-500' },
    { value: 'mist', label: '🌫️ 薄霧', color: 'text-gray-400' },
    { value: 'fog', label: '🌁 山嵐', color: 'text-gray-600' },
    { value: 'drizzle', label: '🌦️ 細雨', color: 'text-blue-400' },
    { value: 'rain', label: '🌧️ 山雨', color: 'text-blue-500' },
    { value: 'windy', label: '💨 大風', color: 'text-cyan-500' },
    { value: 'storm', label: '⛈️ 山雷', color: 'text-purple-600' }
  ]

  const timePresets = [
    { label: '黎明', hour: 6, minute: 0 },
    { label: '上午', hour: 9, minute: 0 },
    { label: '正午', hour: 12, minute: 0 },
    { label: '下午', hour: 15, minute: 0 },
    { label: '黃昏', hour: 18, minute: 30 },
    { label: '夜晚', hour: 21, minute: 0 },
    { label: '深夜', hour: 0, minute: 0 },
    { label: '凌晨', hour: 3, minute: 0 }
  ]

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 z-50 bg-gray-800/90 backdrop-blur-sm text-white px-3 py-2 rounded-lg hover:bg-gray-700/90 transition-all text-sm font-medium"
      >
        🐛 DEBUG
      </button>
    )
  }

  return (
    <div className="fixed top-4 right-4 z-50 bg-gray-900/95 backdrop-blur-md text-white p-6 rounded-xl shadow-2xl border border-gray-700 max-w-sm">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-yellow-400">🌤️ Weather Debug Panel</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-white text-xl leading-none"
        >
          ×
        </button>
      </div>

      {/* Current Status */}
      <div className="mb-6 p-3 bg-gray-800/50 rounded-lg">
        <div className="text-sm text-gray-300 mb-2">當前狀態</div>
        <div className="text-lg font-mono">
          {String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')} ({timeOfDay})
        </div>
        <div className="text-sm mt-1">
          {weatherOptions.find(w => w.value === weather)?.label || weather}
        </div>
      </div>

      {/* Time Control */}
      <div className="mb-6">
        <div className="text-sm font-medium text-gray-300 mb-3">⏰ 時間控制</div>
        
        {/* Play/Pause */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`w-full mb-3 px-3 py-2 rounded-lg font-medium transition-all ${
            isPlaying 
              ? 'bg-green-600 hover:bg-green-500 text-white' 
              : 'bg-red-600 hover:bg-red-500 text-white'
          }`}
        >
          {isPlaying ? '⏸️ 暫停' : '▶️ 播放'}
        </button>

        {/* Manual Time Input */}
        <div className="flex gap-2 mb-3">
          <input
            type="number"
            min="0"
            max="23"
            value={hour}
            onChange={(e) => handleTimeChange(parseInt(e.target.value) || 0, minute)}
            className="w-16 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-center"
          />
          <span className="py-1">:</span>
          <input
            type="number"
            min="0"
            max="59"
            value={minute}
            onChange={(e) => handleTimeChange(hour, parseInt(e.target.value) || 0)}
            className="w-16 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-center"
          />
        </div>

        {/* Time Presets */}
        <div className="grid grid-cols-2 gap-2">
          {timePresets.map((preset) => (
            <button
              key={preset.label}
              onClick={() => handleTimeChange(preset.hour, preset.minute)}
              className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-all"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Weather Control */}
      <div className="mb-4">
        <div className="text-sm font-medium text-gray-300 mb-3">🌤️ 天氣控制</div>
        <div className="grid grid-cols-1 gap-2">
          {weatherOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setWeather(option.value as any)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                weather === option.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              <span className={option.color}>{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="pt-4 border-t border-gray-700">
        <div className="text-sm font-medium text-gray-300 mb-2">🚀 快速測試</div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setWeather('storm')
              handleTimeChange(21, 0)
            }}
            className="flex-1 px-2 py-1 text-xs bg-purple-600 hover:bg-purple-500 rounded"
          >
            夜晚山雷
          </button>
          <button
            onClick={() => {
              setWeather('clear')
              handleTimeChange(12, 0)
            }}
            className="flex-1 px-2 py-1 text-xs bg-yellow-600 hover:bg-yellow-500 rounded"
          >
            正午晴朗
          </button>
        </div>
      </div>
    </div>
  )
}