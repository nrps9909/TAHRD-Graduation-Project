import { useState, useEffect } from 'react'
import { useGameStore } from '@/stores/gameStore'

export const GameMenu = () => {
  const { setShowInventory, setShowMap, setShowSettings, setShowDiary } = useGameStore()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Menu items with icons and actions
  const menuItems = [
    {
      id: 'inventory',
      icon: '🎒',
      label: '背包',
      color: 'from-amber-400 to-amber-500',
      action: () => {
        setShowInventory(true)
        setIsMenuOpen(false)
      }
    },
    {
      id: 'map',
      icon: '🗺️',
      label: '地圖',
      color: 'from-emerald-400 to-emerald-500',
      action: () => {
        setShowMap(true)
        setIsMenuOpen(false)
      }
    },
    {
      id: 'diary',
      icon: '📖',
      label: '日記',
      color: 'from-pink-400 to-pink-500',
      action: () => {
        setShowDiary(true)
        setIsMenuOpen(false)
      }
    },
    {
      id: 'settings',
      icon: '⚙️',
      label: '設定',
      color: 'from-gray-400 to-gray-500',
      action: () => {
        setShowSettings(true)
        setIsMenuOpen(false)
      }
    }
  ]

  // Handle keyboard navigation
  useEffect(() => {
    if (!isMenuOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault()
          setSelectedIndex((prev) => (prev - 1 + menuItems.length) % menuItems.length)
          break
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault()
          setSelectedIndex((prev) => (prev + 1) % menuItems.length)
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          menuItems[selectedIndex].action()
          break
        case 'Escape':
          e.preventDefault()
          setIsMenuOpen(false)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isMenuOpen, selectedIndex, menuItems])

  return (
    <>
      {/* Menu Toggle Button - Animal Crossing Style */}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className={`fixed bottom-8 right-8 z-50 
                   ${isMenuOpen ? 'scale-90' : 'scale-100 hover:scale-110'}
                   transition-all duration-300 ease-out`}
      >
        <div className="relative">
          {/* Button Background */}
          <div className={`w-16 h-16 rounded-2xl 
                          bg-gradient-to-br from-yellow-300 to-yellow-400
                          shadow-xl border-4 border-white
                          ${isMenuOpen ? 'rotate-45' : 'rotate-0'}
                          transition-transform duration-500 ease-out`}>
            {/* Inner Circle */}
            <div className="absolute inset-2 bg-white/30 rounded-xl flex items-center justify-center">
              <span className={`text-2xl ${isMenuOpen ? 'rotate-[-45deg]' : ''} transition-transform duration-500`}>
                {isMenuOpen ? '✕' : '☰'}
              </span>
            </div>
          </div>
          
          {/* Pulse Animation when closed */}
          {!isMenuOpen && (
            <div className="absolute inset-0 rounded-2xl bg-yellow-300/50 animate-ping" />
          )}
        </div>
      </button>

      {/* Menu Panel - Animal Crossing Inspired */}
      {isMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 animate-fade-in"
            onClick={() => setIsMenuOpen(false)}
          />
          
          {/* Menu Container */}
          <div className="fixed bottom-32 right-8 z-50 animate-slide-up">
            <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 
                           shadow-2xl border-4 border-white
                           min-w-[280px]">
              {/* Menu Header */}
              <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-gray-200">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-300 to-yellow-400 
                               rounded-full flex items-center justify-center text-white font-bold">
                  ☰
                </div>
                <h2 className="text-2xl font-bold text-gray-800">選單</h2>
              </div>

              {/* Menu Items */}
              <div className="space-y-3">
                {menuItems.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={item.action}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full p-4 rounded-2xl transition-all duration-200 ease-out
                               flex items-center gap-4 group
                               ${selectedIndex === index 
                                 ? 'bg-gradient-to-r ' + item.color + ' text-white shadow-lg scale-105' 
                                 : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                  >
                    {/* Icon Container */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl
                                   ${selectedIndex === index 
                                     ? 'bg-white/20' 
                                     : 'bg-white shadow-sm'}`}>
                      {item.icon}
                    </div>
                    
                    {/* Label */}
                    <span className={`font-bold text-lg flex-1 text-left
                                    ${selectedIndex === index ? 'text-white' : 'text-gray-700'}`}>
                      {item.label}
                    </span>
                    
                    {/* Arrow Indicator */}
                    <span className={`text-xl transition-transform duration-200
                                    ${selectedIndex === index 
                                      ? 'translate-x-0 opacity-100' 
                                      : '-translate-x-2 opacity-0'}`}>
                      →
                    </span>
                  </button>
                ))}
              </div>

              {/* Tips */}
              <div className="mt-6 pt-4 border-t-2 border-gray-200">
                <p className="text-xs text-gray-500 text-center">
                  使用 ↑↓ 或 WS 選擇・Enter 確認・ESC 關閉
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}