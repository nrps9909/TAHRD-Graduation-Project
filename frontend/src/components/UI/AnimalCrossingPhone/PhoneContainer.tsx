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
      <div className="phone-container animate-phone-appear">
        {/* Phone Frame */}
        <div className="relative w-96 h-[700px] bg-gradient-to-b from-orange-300 via-yellow-300 to-orange-400 
                       rounded-[3rem] p-6 shadow-2xl border-4 border-orange-500">
          
          {/* Screen Bezel */}
          <div className="w-full h-full bg-gradient-to-b from-sky-200 to-green-200 rounded-[2rem] 
                         overflow-hidden relative border-3 border-orange-600 shadow-inner">
            
            {/* Status Bar */}
            <div className="relative z-10 flex justify-between items-center px-6 py-4 
                           bg-gradient-to-r from-yellow-200/80 to-orange-200/80 backdrop-blur-sm
                           border-b-2 border-orange-300/50">
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

            {/* Background Decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {/* Clouds */}
              <div className="absolute top-16 left-8 text-4xl opacity-60 animate-float">☁️</div>
              <div className="absolute top-24 right-12 text-3xl opacity-60 animate-float-delayed">☁️</div>
              <div className="absolute top-32 left-1/2 transform -translate-x-1/2 text-2xl opacity-40 animate-float">☁️</div>
              
              {/* Nature Elements */}
              <div className="absolute bottom-40 left-6 text-3xl opacity-70 animate-float">🌸</div>
              <div className="absolute bottom-32 right-8 text-2xl opacity-70 animate-float-delayed">🦋</div>
              <div className="absolute bottom-48 right-16 text-xl opacity-60 animate-float">🌿</div>
              
              {/* Ground Pattern */}
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-green-300/30 to-transparent" />
            </div>

            {/* Main Content Area */}
            <div className="relative z-10 p-6 pt-8 h-full flex flex-col">
              
              {/* Title */}
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-brown-800 drop-shadow-sm">NookPhone</h1>
                <div className="text-sm text-brown-600">心語小鎮 · 應用程式</div>
              </div>

              {/* App Grid */}
              <div className="flex-1 flex flex-col justify-center">
                <div className="grid grid-cols-3 gap-6 mb-8">
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
                      {/* App Icon Container */}
                      <div className={`w-16 h-16 bg-gradient-to-br ${app.color} 
                                     rounded-2xl shadow-lg group-hover:shadow-xl
                                     flex items-center justify-center text-2xl
                                     border-3 border-white/60 group-hover:border-white/90
                                     transition-all duration-300 relative overflow-hidden
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
                      
                      {/* App Name */}
                      <span className="text-xs font-bold text-brown-800 mt-2 text-center drop-shadow-sm
                                     group-hover:text-brown-900 transition-colors duration-200">
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

              {/* Home Indicator */}
              <div className="flex justify-center">
                <div className="w-16 h-1 bg-brown-400/50 rounded-full" />
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 w-10 h-10 bg-red-500 hover:bg-red-600 rounded-full 
                       flex items-center justify-center text-white text-lg font-bold
                       shadow-lg hover:shadow-xl transition-all duration-200 z-20
                       border-2 border-white/50"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </>
  )
}