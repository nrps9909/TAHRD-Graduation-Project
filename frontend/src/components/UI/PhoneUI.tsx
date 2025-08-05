import { useState, useEffect } from 'react'
import { useGameStore } from '@/stores/gameStore'

interface PhoneApp {
  id: string
  name: string
  icon: string
  color: string
  action: () => void
}

interface PhoneUIProps {
  showControls: boolean
  setShowControls: (show: boolean) => void
}

export const PhoneUI = ({ showControls, setShowControls }: PhoneUIProps) => {
  const [isPhoneOpen, setIsPhoneOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [clickedApp, setClickedApp] = useState<string | null>(null)
  const [showBootScreen, setShowBootScreen] = useState(false)
  const [selectedNPC, setSelectedNPC] = useState<string | null>(null)
  const { 
    setShowInventory, 
    setShowMap, 
    setShowSettings, 
    setShowDiary,
    selectedNpc,
    setShowDialogue
  } = useGameStore()

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  // Handle TAB key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault()
        if (!isPhoneOpen) {
          setShowBootScreen(true)
          setTimeout(() => {
            setShowBootScreen(false)
            setIsPhoneOpen(true)
          }, 1500)
        } else {
          setIsPhoneOpen(false)
        }
      }
      if (e.key === 'Escape' && isPhoneOpen) {
        setIsPhoneOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPhoneOpen])

  const handleAppClick = (app: PhoneApp) => {
    setClickedApp(app.id)
    setTimeout(() => {
      app.action()
      setClickedApp(null)
    }, 300)
  }

  const phoneApps: PhoneApp[] = [
    {
      id: 'inventory',
      name: '背包',
      icon: '🎒',
      color: 'from-amber-300 to-amber-500',
      action: () => {
        setShowInventory(true)
        setIsPhoneOpen(false)
      }
    },
    {
      id: 'map',
      name: '地圖',
      icon: '🗺️',
      color: 'from-emerald-300 to-emerald-500',
      action: () => {
        setShowMap(true)
        setIsPhoneOpen(false)
      }
    },
    {
      id: 'diary',
      name: '日記',
      icon: '📖',
      color: 'from-pink-300 to-pink-500',
      action: () => {
        setShowDiary(true)
        setIsPhoneOpen(false)
      }
    },
    {
      id: 'settings',
      name: '設定',
      icon: '⚙️',
      color: 'from-gray-300 to-gray-500',
      action: () => {
        setShowSettings(true)
        setIsPhoneOpen(false)
      }
    },
    {
      id: 'camera',
      name: '相機',
      icon: '📸',
      color: 'from-blue-300 to-blue-500',
      action: () => console.log('Camera app opened!')
    },
    {
      id: 'friends',
      name: '朋友',
      icon: '👥',
      color: 'from-purple-300 to-purple-500',
      action: () => console.log('Friends app opened!')
    },
    {
      id: 'chat',
      name: '對話',
      icon: '💬',
      color: 'from-green-300 to-green-500',
      action: () => {
        if (selectedNpc) {
          setShowDialogue(true)
          setIsPhoneOpen(false)
        }
      }
    },
    {
      id: 'weather',
      name: '天氣',
      icon: '☀️',
      color: 'from-sky-300 to-sky-500',
      action: () => console.log('Weather app opened!')
    },
    {
      id: 'help',
      name: '說明',
      icon: '❓',
      color: 'from-indigo-300 to-indigo-500',
      action: () => {
        setShowControls(!showControls)
      }
    },
    {
      id: 'quick-actions',
      name: '快捷',
      icon: '⚡',
      color: 'from-orange-300 to-orange-500',
      action: () => {
        // Quick actions functionality
        console.log('Quick actions opened!')
      }
    }
  ]

  return (
    <>
      {/* TAB Hint */}
      {!isPhoneOpen && (
        <div className="fixed top-4 left-4 z-30 animate-fade-in">
          <div className="bg-black/70 text-white text-sm px-4 py-2 rounded-full flex items-center gap-2">
            <span className="text-lg">📱</span>
            按 <kbd className="bg-white/20 px-2 py-0.5 rounded mx-1">TAB</kbd> 開啟手機
          </div>
        </div>
      )}

      {/* Boot Screen */}
      {showBootScreen && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fade-in" />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
            <div className="relative w-80 h-[600px] bg-gradient-to-b from-gray-800 to-gray-900 rounded-[3rem] p-4 shadow-2xl">
              <div className="w-full h-full bg-black rounded-[2.5rem] p-1">
                <div className="w-full h-full bg-gradient-to-b from-blue-900 to-purple-900 rounded-[2rem] overflow-hidden relative flex items-center justify-center">
                  <div className="text-center animate-bounce-in">
                    <div className="text-6xl mb-4 animate-pulse">📱</div>
                    <div className="text-white text-xl font-bold mb-2">心語小鎮</div>
                    <div className="text-white/70 text-sm">正在啟動...</div>
                    <div className="mt-4 flex justify-center space-x-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Phone UI */}
      {isPhoneOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fade-in"
            onClick={() => setIsPhoneOpen(false)}
          />
          
          {/* Phone Container */}
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 animate-phone-slide-up">
            {/* Phone Frame */}
            <div className="relative w-80 h-[600px] bg-gradient-to-b from-gray-800 to-gray-900 rounded-[3rem] p-4 shadow-2xl">
              {/* Screen Bezel */}
              <div className="w-full h-full bg-black rounded-[2.5rem] p-1">
                {/* Screen */}
                <div className="w-full h-full bg-gradient-to-b from-blue-50 to-pink-50 rounded-[2rem] overflow-hidden relative">
                  
                  {/* Status Bar */}
                  <div className="flex justify-between items-center px-6 py-3 bg-white/80 backdrop-blur-sm">
                    <div className="text-sm font-semibold text-gray-800">
                      {currentTime.toLocaleTimeString('zh-TW', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">📶</span>
                      </div>
                      <span className="text-sm">100%</span>
                      <div className="w-6 h-3 bg-green-500 rounded-sm border border-gray-300" />
                    </div>
                  </div>

                  {/* Home Screen Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-sky-200 via-pink-100 to-yellow-100">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-16 left-8 w-20 h-20 bg-white rounded-full" />
                      <div className="absolute top-24 right-16 w-16 h-16 bg-white rounded-full" />
                      <div className="absolute bottom-40 left-16 w-12 h-12 bg-white rounded-full" />
                      <div className="absolute bottom-32 right-12 w-24 h-24 bg-white rounded-full" />
                    </div>
                    
                    {/* Decorative Elements */}
                    <div className="absolute top-20 left-8 text-4xl animate-float opacity-80">🌸</div>
                    <div className="absolute top-32 right-12 text-3xl animate-float-delayed opacity-80">🦋</div>
                    <div className="absolute bottom-32 left-12 text-2xl animate-float opacity-80">🌿</div>
                    <div className="absolute bottom-20 right-8 text-3xl animate-float-delayed opacity-80">✨</div>
                    <div className="absolute top-40 left-1/2 transform -translate-x-1/2 text-2xl animate-float opacity-60">☁️</div>
                    <div className="absolute bottom-48 right-20 text-xl animate-float-delayed opacity-60">🌙</div>
                  </div>

                  {/* App Grid */}
                  <div className="relative z-10 p-6 pt-16">
                    <div className="grid grid-cols-3 gap-4">
                      {phoneApps.map((app, index) => (
                        <button
                          key={app.id}
                          onClick={() => handleAppClick(app)}
                          className={`group relative flex flex-col items-center transition-all duration-300 hover:scale-110
                                     ${clickedApp === app.id ? 'animate-bounce-in' : 'animate-slide-up'}`}
                          style={{
                            animationDelay: `${index * 100}ms`
                          }}
                        >
                          {/* App Icon */}
                          <div className={`w-14 h-14 bg-gradient-to-br ${app.color} 
                                         rounded-xl shadow-lg group-hover:shadow-xl
                                         flex items-center justify-center text-xl
                                         border-2 border-white/50 group-hover:border-white/80
                                         transition-all duration-300 animate-slide-up
                                         relative overflow-hidden`}>
                            {/* Shine Effect */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent 
                                           transform rotate-45 -translate-x-full group-hover:translate-x-full
                                           transition-transform duration-700" />
                            <span className="relative z-10">{app.icon}</span>
                          </div>
                          
                          {/* App Name */}
                          <span className="text-xs font-bold text-gray-700 mt-1 text-center">
                            {app.name}
                          </span>
                          
                          {/* Selection Glow */}
                          <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Home Indicator */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <div className="w-32 h-1 bg-gray-800/30 rounded-full" />
                  </div>

                  {/* Close Button */}
                  <button
                    onClick={() => setIsPhoneOpen(false)}
                    className="absolute top-4 right-4 w-8 h-8 bg-red-500 rounded-full 
                               flex items-center justify-center text-white text-sm font-bold
                               hover:bg-red-600 transition-colors duration-200 z-20"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}