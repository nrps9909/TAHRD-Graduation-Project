import { useState, useEffect } from 'react'
import { DialogueBox } from './DialogueBox'
import { NPCPanel } from './NPCPanel'
import { GameMenu } from './GameMenu'
import { QuickActionBar } from './QuickActionBar'
import { GameModals } from './GameModals'
import { useGameStore } from '@/stores/gameStore'

export const UI = () => {
  const { showDialogue, selectedNpc, isLoading } = useGameStore()
  const [showControls, setShowControls] = useState(false)

  // Show controls hint with keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        setShowControls((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      {/* Modern Game Menu - Bottom Right */}
      <GameMenu />

      {/* Quick Action Bar - Bottom Center */}
      <QuickActionBar />

      {/* All Modal Windows */}
      <GameModals />

      {/* NPC Info Panel - Redesigned */}
      {selectedNpc && !showDialogue && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40 animate-slide-down">
          <div className="bg-white/90 backdrop-blur-md rounded-3xl px-6 py-3 
                         shadow-xl border-3 border-white/50 flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-300 to-pink-400 
                           rounded-full flex items-center justify-center text-2xl">
              👤
            </div>
            <div>
              <h3 className="font-bold text-gray-800">與 NPC 互動中</h3>
              <p className="text-sm text-gray-600">按下方快捷鍵開始對話</p>
            </div>
          </div>
        </div>
      )}

      {/* Dialogue Box - Bottom Center with Modern Design */}
      {showDialogue && (
        <div className="fixed bottom-32 left-1/2 transform -translate-x-1/2 w-full max-w-3xl px-4 z-50">
          <DialogueBox />
        </div>
      )}

      {/* Controls Help - Toggle with ? key */}
      {showControls && (
        <div className="fixed top-4 right-4 z-40 animate-slide-left">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 
                         shadow-2xl border-4 border-white/50 max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                <span className="text-2xl">🎮</span> 操作說明
              </h3>
              <button 
                onClick={() => setShowControls(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 rounded-lg p-2 min-w-[80px] text-center">
                  <kbd className="font-mono text-sm text-blue-700">WASD</kbd>
                </div>
                <span className="text-gray-700">移動角色</span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-green-100 rounded-lg p-2 min-w-[80px] text-center">
                  <kbd className="font-mono text-sm text-green-700">Shift</kbd>
                </div>
                <span className="text-gray-700">加速奔跑</span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 rounded-lg p-2 min-w-[80px] text-center">
                  <kbd className="font-mono text-sm text-purple-700">滑鼠</kbd>
                </div>
                <span className="text-gray-700">旋轉視角</span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-yellow-100 rounded-lg p-2 min-w-[80px] text-center">
                  <kbd className="font-mono text-sm text-yellow-700">?</kbd>
                </div>
                <span className="text-gray-700">顯示/隱藏說明</span>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                提示：點擊右下角 ☰ 開啟選單
              </p>
            </div>
          </div>
        </div>
      )}

      {/* First Time Hint */}
      {!isLoading && !showControls && (
        <div className="fixed top-4 left-4 z-30 animate-fade-in">
          <div className="bg-black/70 text-white text-sm px-4 py-2 rounded-full">
            按 <kbd className="bg-white/20 px-2 py-0.5 rounded mx-1">?</kbd> 查看操作說明
          </div>
        </div>
      )}
    </>
  )
}