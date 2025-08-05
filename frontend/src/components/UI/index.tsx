import { useState, useEffect } from 'react'
import { DialogueBox } from './DialogueBox'
import { NPCPanel } from './NPCPanel'
import { GameUIButtons } from './GameUIButtons'
import { GameModals } from './GameModals'
import { useGameStore } from '@/stores/gameStore'

export const UI = () => {
  const { showDialogue, selectedNpc, isLoading } = useGameStore()
  const [showControls, setShowControls] = useState(true)

  // 顯示控制提示5秒後隱藏
  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        setShowControls(false)
      }, 8000)
      return () => clearTimeout(timer)
    }
  }, [isLoading])

  return (
    <>
      {/* Animal Crossing 風格的浮動按鈕 */}
      <GameUIButtons />

      {/* 所有的模態框 */}
      <GameModals />

      {/* NPC 資訊面板 - 只在選中NPC且不在對話中時顯示 */}
      {selectedNpc && !showDialogue && (
        <div className="fixed top-20 right-6" style={{ zIndex: 1000 }}>
          <NPCPanel />
        </div>
      )}

      {/* 對話框 - 下方中央 */}
      {showDialogue && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 w-full max-w-2xl px-4" style={{ zIndex: 1000 }}>
          <DialogueBox />
        </div>
      )}

      {/* 移動控制提示 */}
      {showControls && (
        <div className="fixed bottom-6 left-6" style={{ zIndex: 999 }}>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl px-6 py-4 
                         border border-white/20 shadow-xl animate-fade-in">
            <h3 className="text-white font-bold text-lg mb-2">🎮 操作說明</h3>
            <div className="text-white/90 text-sm space-y-1">
              <div>🔸 <kbd className="bg-white/20 px-2 py-1 rounded text-xs">WASD</kbd> 或 方向鍵移動</div>
              <div>🔸 <kbd className="bg-white/20 px-2 py-1 rounded text-xs">Shift</kbd> 加速跑步</div>
              <div>🔸 點擊浮動按鈕打開選單</div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}