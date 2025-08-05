interface BootScreenProps {
  visible: boolean
}

export const BootScreen = ({ visible }: BootScreenProps) => {
  if (!visible) return null

  return (
    <>
      <div className="fullscreen-overlay bg-gradient-to-b from-sky-300 to-green-300 z-modal-backdrop animate-fade-in" />
      <div className="centered-modal z-modal text-center">
        <div className="animate-bounce-in">
          {/* Nook Inc. Logo Style */}
          <div className="w-32 h-32 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full 
                         flex items-center justify-center mb-6 shadow-2xl border-4 border-white mx-auto">
            <span className="text-5xl">🏝️</span>
          </div>
          <div className="text-white text-3xl font-bold mb-2 drop-shadow-lg">心語小鎮</div>
          <div className="text-white/90 text-lg mb-4">NookPhone 啟動中...</div>
          <div className="flex justify-center space-x-2">
            <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
            <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{animationDelay: '200ms'}} />
            <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{animationDelay: '400ms'}} />
          </div>
        </div>
      </div>
    </>
  )
}