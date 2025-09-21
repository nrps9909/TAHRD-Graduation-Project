interface ControlsHelpProps {
  visible: boolean
  onClose: () => void
}

export const ControlsHelp = ({ visible, onClose }: ControlsHelpProps) => {
  if (!visible) return null

  return (
    <div className="centered-modal z-game-modal animate-scale-in">
      <div className="bg-gradient-to-br from-yellow-100 to-orange-100 rounded-3xl p-8 
                     shadow-2xl border-4 border-orange-300 max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-brown-800 flex items-center gap-3">
            <span className="text-3xl">🎮</span> 操作說明
          </h3>
          <button 
            onClick={onClose}
            className="w-8 h-8 bg-red-500 hover:bg-red-600 rounded-full 
                      flex items-center justify-center text-white font-bold
                      transition-colors duration-200"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="bg-blue-200 rounded-xl p-3 min-w-[100px] text-center">
              <kbd className="font-mono text-sm text-blue-800 font-bold">WASD</kbd>
            </div>
            <span className="text-brown-700 font-semibold">移動角色</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="bg-green-200 rounded-xl p-3 min-w-[100px] text-center">
              <kbd className="font-mono text-sm text-green-800 font-bold">Shift</kbd>
            </div>
            <span className="text-brown-700 font-semibold">加速奔跑</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="bg-purple-200 rounded-xl p-3 min-w-[100px] text-center">
              <kbd className="font-mono text-sm text-purple-800 font-bold">滑鼠</kbd>
            </div>
            <span className="text-brown-700 font-semibold">旋轉視角</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="bg-yellow-200 rounded-xl p-3 min-w-[100px] text-center">
              <kbd className="font-mono text-sm text-yellow-800 font-bold">TAB</kbd>
            </div>
            <span className="text-brown-700 font-semibold">開啟 NookPhone</span>
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t-2 border-orange-200">
          <p className="text-xs text-brown-600 text-center">
            🏝️ 歡迎來到心語小鎮！享受美好的島嶼生活 🏝️
          </p>
        </div>
      </div>
    </div>
  )
}