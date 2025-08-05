interface PhoneHintProps {
  visible: boolean
}

export const PhoneHint = ({ visible }: PhoneHintProps) => {
  if (!visible) return null

  return (
    <div className="notification-badge animate-fade-in">
      <div className="bg-gradient-to-r from-yellow-300 to-orange-300 text-brown-800 text-sm px-4 py-3 rounded-2xl 
                     shadow-lg border-2 border-white/50 flex items-center gap-3">
        <div className="w-8 h-8 bg-white/30 rounded-full flex items-center justify-center animate-pulse">
          <span className="text-lg">📱</span>
        </div>
        <div>
          <div className="font-bold">NookPhone</div>
          <div className="text-xs opacity-80">
            按 <kbd className="bg-white/30 px-2 py-0.5 rounded text-xs">TAB</kbd> 開啟
          </div>
        </div>
      </div>
    </div>
  )
}