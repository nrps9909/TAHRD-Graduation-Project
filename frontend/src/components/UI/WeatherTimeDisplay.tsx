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
      drizzle: '🌦️'
    }
    return icons[weather as keyof typeof icons] || '☀️'
  }
  
  // 可愛風格的背景顏色（無邊框）
  const getBackgroundStyle = () => {
    let bgColor = 'bg-sky-300/90' // 可愛天藍色
    let textColor = 'text-white'
    
    if (timeOfDay === 'night') {
      bgColor = 'bg-slate-700/90' // 原始夜晚深色調
    }
    
    // 根據天氣調整可愛顏色
    switch (weather) {
      case 'drizzle':
        bgColor = timeOfDay === 'day' ? 'bg-blue-300/90' : 'bg-slate-600/90'
        break
      case 'clear':
      default:
        // 使用預設的可愛顏色
        break
    }
    
    return `${bgColor} ${textColor}`
  }

  return (
    <div className="fixed top-4 right-4 z-50 pointer-events-none">
      <div className={`rounded-3xl px-6 py-4 backdrop-blur-sm shadow-2xl ${getBackgroundStyle()} transform transition-all duration-300 hover:scale-105`}>
        {/* 時間顯示 - 可愛風格 */}
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="text-3xl font-black tracking-wide drop-shadow-sm">
            {formatTime(hour)}
          </div>
          <div className="text-base font-semibold opacity-90 bg-white/20 px-2 py-1 rounded-full">
            {getTimeOfDayText(timeOfDay)}
          </div>
        </div>
        
        {/* 天氣顯示 - 可愛風格 */}
        <div className="flex items-center justify-center gap-3 bg-white/15 rounded-2xl px-3 py-2">
          <span className="text-2xl drop-shadow-sm animate-bounce">
            {getWeatherIcon(weather)}
          </span>
          <span className="text-base font-bold tracking-wide">
            {WEATHER_SETTINGS[weather]?.name || weather}
          </span>
        </div>
      </div>
    </div>
  )
}