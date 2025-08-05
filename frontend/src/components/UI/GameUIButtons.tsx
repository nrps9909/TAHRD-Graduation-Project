import { useState } from 'react'
import { useGameStore } from '@/stores/gameStore'

interface FloatingButton {
  id: string
  icon: string
  label: string
  position: 'top-right' | 'bottom-right' | 'bottom-left' | 'top-left'
  action: () => void
}

export const GameUIButtons = () => {
  const { setShowInventory, setShowMap, setShowSettings, setShowDiary } = useGameStore()
  const [hoveredButton, setHoveredButton] = useState<string | null>(null)

  const buttons: FloatingButton[] = [
    {
      id: 'inventory',
      icon: '🎒',
      label: '背包',
      position: 'bottom-right',
      action: () => setShowInventory(true)
    },
    {
      id: 'map',
      icon: '🗺️',
      label: '地圖',
      position: 'top-right',
      action: () => setShowMap(true)
    },
    {
      id: 'diary',
      icon: '📖',
      label: '日記',
      position: 'bottom-left',
      action: () => setShowDiary(true)
    },
    {
      id: 'settings',
      icon: '⚙️',
      label: '設定',
      position: 'top-left',
      action: () => setShowSettings(true)
    }
  ]

  const getPositionClasses = (position: string) => {
    switch (position) {
      case 'top-right':
        return 'top-6 right-6'
      case 'bottom-right':
        return 'bottom-6 right-6'
      case 'bottom-left':
        return 'bottom-6 left-6'
      case 'top-left':
        return 'top-6 left-6'
      default:
        return 'top-6 right-6'
    }
  }

  return (
    <>
      {buttons.map((button) => (
        <div
          key={button.id}
          className={`fixed ${getPositionClasses(button.position)}`}
          style={{ zIndex: 1000 }}
        >
          <button
            className="relative group bg-white/90 backdrop-blur-sm rounded-full w-14 h-14 
                       shadow-lg hover:shadow-xl transition-all duration-300 
                       hover:scale-110 hover:bg-white/95 border-2 border-white/30
                       flex items-center justify-center text-2xl"
            onClick={button.action}
            onMouseEnter={() => setHoveredButton(button.id)}
            onMouseLeave={() => setHoveredButton(null)}
          >
            <span className="animate-gentle-bounce">{button.icon}</span>
            
            {hoveredButton === button.id && (
              <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 
                           bg-gray-800/90 text-white text-sm px-3 py-1 rounded-full 
                           whitespace-nowrap animate-fade-in pointer-events-none">
                {button.label}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 
                               w-0 h-0 border-l-4 border-r-4 border-t-4 
                               border-transparent border-t-gray-800/90"></div>
              </div>
            )}
          </button>
        </div>
      ))}
      
      {/* 中央快速操作按鈕 */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2" style={{ zIndex: 1000 }}>
        <div className="flex space-x-4">
          <button className="bg-emerald-500/90 backdrop-blur-sm rounded-full w-12 h-12 
                           shadow-lg hover:shadow-xl transition-all duration-300 
                           hover:scale-110 hover:bg-emerald-600/90 border-2 border-white/30
                           flex items-center justify-center text-white text-lg font-bold">
            🏃
          </button>
          <button className="bg-blue-500/90 backdrop-blur-sm rounded-full w-12 h-12 
                           shadow-lg hover:shadow-xl transition-all duration-300 
                           hover:scale-110 hover:bg-blue-600/90 border-2 border-white/30
                           flex items-center justify-center text-white text-lg font-bold">
            💬
          </button>
          <button className="bg-purple-500/90 backdrop-blur-sm rounded-full w-12 h-12 
                           shadow-lg hover:shadow-xl transition-all duration-300 
                           hover:scale-110 hover:bg-purple-600/90 border-2 border-white/30
                           flex items-center justify-center text-white text-lg font-bold">
            🎁
          </button>
        </div>
      </div>
    </>
  )
}