import { useState, useEffect } from 'react'
import { PhoneApp } from './phoneApps'

interface PhoneContainerProps {
  visible: boolean
  currentPage: number
  setCurrentPage: (page: number) => void
  apps: PhoneApp[]
  clickedApp: string | null
  setClickedApp: (id: string | null) => void
  onClose: () => void
}

export const PhoneContainer = ({
  visible,
  currentPage,
  setCurrentPage,
  apps,
  clickedApp,
  setClickedApp,
  onClose
}: PhoneContainerProps) => {
  const [currentTime, setCurrentTime] = useState(new Date())
  
  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  if (!visible) return null

  const appsPerPage = 6
  const totalPages = Math.ceil(apps.length / appsPerPage)
  const currentApps = apps.slice(currentPage * appsPerPage, (currentPage + 1) * appsPerPage)

  const handleAppClick = (app: PhoneApp) => {
    setClickedApp(app.id)
    // Add haptic feedback simulation
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }
    setTimeout(() => {
      app.action()
      setClickedApp(null)
      onClose()
    }, 200)
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="phone-backdrop animate-fade-in"
        onClick={onClose}
      />
      
      {/* Phone Container */}
      <div className="phone-container animate-phone-appear" style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
        animation: 'phoneAppear 0.3s ease-out'
      }}>
        {/* Phone Frame - 優化大小和顏色 */}
        <div style={{
          position: 'relative',
          width: '320px',
          height: '600px',
          background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 50%, #FCD34D 100%)',
          borderRadius: '40px',
          padding: '20px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25), inset 0 2px 4px rgba(255, 255, 255, 0.5)',
          border: '3px solid #F59E0B'
        }}>
          
          {/* Screen Bezel - 更柔和的顏色 */}
          <div style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(180deg, #E0F7FA 0%, #C8E6C9 100%)',
            borderRadius: '28px',
            overflow: 'hidden',
            position: 'relative',
            border: '2px solid #FBB040',
            boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.08)'
          }}>
            
            {/* Status Bar - 更簡潔的設計 */}
            <div className="relative z-10 flex justify-between items-center px-6 py-3 
                           bg-gradient-to-r from-emerald-200/90 to-teal-200/90 backdrop-blur-sm
                           border-b border-emerald-300/50">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-green-600 rounded-full 
                               flex items-center justify-center">
                  <span className="text-white text-xs">🌐</span>
                </div>
                <div className="text-sm font-bold text-brown-800">
                  {currentTime.toLocaleTimeString('zh-TW', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-brown-700 font-semibold">100%</span>
                <div className="w-8 h-4 bg-gradient-to-r from-green-400 to-green-500 rounded-sm 
                               border border-brown-400 shadow-sm" />
              </div>
            </div>

            {/* Background Decorations - 更細緻 */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {/* Subtle Pattern */}
              <div className="absolute top-20 left-10 text-2xl opacity-20 animate-float">✨</div>
              <div className="absolute top-40 right-10 text-xl opacity-20 animate-float" style={{ animationDelay: '2s' }}>✨</div>
              <div className="absolute bottom-20 left-1/2 text-lg opacity-15 animate-float" style={{ animationDelay: '1s' }}>✨</div>
              
              {/* Subtle Ground Pattern */}
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-emerald-200/20 to-transparent" />
            </div>

            {/* Main Content Area - 減少內距 */}
            <div className="relative z-10 p-4 pt-6 h-full flex flex-col">
              
              {/* Title - 更簡潔 */}
              <div className="text-center mb-4">
                <h1 className="text-xl font-bold text-emerald-800 drop-shadow-sm">NookPhone</h1>
                <div className="text-xs text-emerald-600">心語小鎮</div>
              </div>

              {/* App Grid - 優化間距 */}
              <div className="flex-1 flex flex-col justify-center">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {currentApps.map((app, index) => (
                    <button
                      key={app.id}
                      onClick={() => handleAppClick(app)}
                      className={`group relative flex flex-col items-center transition-all duration-300 
                                 hover:scale-110 transform-gpu
                                 ${clickedApp === app.id ? 'animate-bounce-in scale-95' : 'animate-slide-up'}`}
                      style={{
                        animationDelay: `${index * 150}ms`
                      }}
                    >
                      {/* App Icon Container - 更小更精緻 */}
                      <div className={`w-14 h-14 bg-gradient-to-br ${app.color} 
                                     rounded-xl shadow-md group-hover:shadow-lg
                                     flex items-center justify-center text-xl
                                     border-2 border-white/70 group-hover:border-white
                                     transition-all duration-200 relative overflow-hidden
                                     group-active:scale-95`}>
                        
                        {/* Shine Effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent 
                                       transform rotate-45 -translate-x-full group-hover:translate-x-full
                                       transition-transform duration-700" />
                        
                        {/* Icon */}
                        <span className="relative z-10 drop-shadow-sm">{app.icon}</span>
                        
                        {/* Glow Effect */}
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent 
                                       opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                      
                      {/* App Name - 更小的字體 */}
                      <span className="text-[10px] font-semibold text-emerald-800 mt-1.5 text-center
                                     group-hover:text-emerald-900 transition-colors duration-200">
                        {app.name}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Page Indicators */}
                {totalPages > 1 && (
                  <div className="flex justify-center space-x-2 mb-4">
                    {Array.from({ length: totalPages }).map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentPage(index)}
                        className={`w-3 h-3 rounded-full transition-all duration-200 ${
                          index === currentPage 
                            ? 'bg-brown-600 scale-125' 
                            : 'bg-brown-300 hover:bg-brown-400'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Home Indicator - 更細緻 */}
              <div className="flex justify-center">
                <div className="w-12 h-0.5 bg-emerald-400/30 rounded-full" />
              </div>
            </div>

            {/* Close Button - 更優雅 */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 bg-gradient-to-br from-red-400 to-red-500 hover:from-red-500 hover:to-red-600 rounded-full 
                       flex items-center justify-center text-white text-sm font-bold
                       shadow-md hover:shadow-lg transition-all duration-200 z-20
                       border-2 border-white/70 hover:scale-110 active:scale-95"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </>
  )
}