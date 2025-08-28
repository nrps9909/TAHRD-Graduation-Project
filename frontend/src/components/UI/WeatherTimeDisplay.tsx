import React from 'react'
import { useTimeStore, WEATHER_SETTINGS } from '@/stores/timeStore'

export const WeatherTimeDisplay = () => {
  const { hour, weather, timeOfDay } = useTimeStore()
  
  // 格式化時間顯示
  const formatTime = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`
  }
  
  // 獲取時間段顯示文本
  const getTimeOfDayText = (timeOfDay: 'day' | 'night') => {
    return timeOfDay === 'day' ? '白天' : '夜晚'
  }
  
  // 獲取天氣對應的emoji圖標
  const getWeatherIcon = (weather: string) => {
    const icons = {
      clear: '☀️',
      cloudy: '☁️',
      mist: '🌫️',
      fog: '🌫️',
      drizzle: '🌦️',
      rain: '🌧️',
      windy: '💨',
      snow: '❄️',
      storm: '⛈️'
    }
    return icons[weather as keyof typeof icons] || '☀️'
  }
  
  // 獲取背景顏色基於時間和天氣
  const getBackgroundStyle = () => {
    let bgColor = 'bg-blue-500/80' // 默認白天
    let textColor = 'text-white'
    
    if (timeOfDay === 'night') {
      bgColor = 'bg-purple-900/80'
    }
    
    // 根據天氣調整顏色
    switch (weather) {
      case 'rain':
      case 'storm':
        bgColor = timeOfDay === 'day' ? 'bg-gray-600/80' : 'bg-gray-800/80'
        break
      case 'snow':
        bgColor = timeOfDay === 'day' ? 'bg-blue-300/80' : 'bg-blue-800/80'
        break
      case 'fog':
      case 'mist':
        bgColor = timeOfDay === 'day' ? 'bg-gray-400/80' : 'bg-gray-700/80'
        break
      case 'cloudy':
        bgColor = timeOfDay === 'day' ? 'bg-gray-500/80' : 'bg-gray-800/80'
        break
    }
    
    return `${bgColor} ${textColor}`
  }

  return (
    <div className="fixed top-4 right-4 z-50 pointer-events-none">
      <div className={`rounded-lg px-4 py-3 backdrop-blur-sm border border-white/20 shadow-lg ${getBackgroundStyle()}`}>
        {/* 時間顯示 */}
        <div className="flex items-center gap-2 mb-2">
          <div className="text-2xl font-bold">
            {formatTime(hour)}
          </div>
          <div className="text-sm opacity-80">
            {getTimeOfDayText(timeOfDay)}
          </div>
        </div>
        
        {/* 天氣顯示 */}
        <div className="flex items-center gap-2">
          <span className="text-xl">
            {getWeatherIcon(weather)}
          </span>
          <span className="text-sm font-medium">
            {WEATHER_SETTINGS[weather]?.name || weather}
          </span>
        </div>
      </div>
    </div>
  )
}