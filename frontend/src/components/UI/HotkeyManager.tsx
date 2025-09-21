import { useEffect } from 'react'
import { useGameStore } from '@/stores/gameStore'

export const HotkeyManager = () => {
  const { 
    setShowInventory, 
    setShowMap, 
    setShowSettings, 
    setShowDiary,
    showInventory,
    showMap,
    showSettings,
    showDiary,
    endConversation,
    showDialogue
  } = useGameStore()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 防止在輸入框中觸發快速鍵
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (event.key.toLowerCase()) {
        case 'i':
          event.preventDefault()
          setShowInventory(!showInventory)
          break

        case 'm':
          event.preventDefault()
          setShowMap(!showMap)
          break

        case 'escape':
          // ESC 優先級：對話框 > UI面板 > Pointer Lock (由CameraController處理)
          if (showDialogue) {
            event.preventDefault()
            endConversation()
          } else if (showSettings || showInventory || showMap || showDiary) {
            event.preventDefault()
            // 關閉所有UI面板
            if (showSettings) setShowSettings(false)
            if (showInventory) setShowInventory(false)
            if (showMap) setShowMap(false)
            if (showDiary) setShowDiary(false)
          }
          // 如果沒有UI面板開啟，讓 CameraController 處理 Pointer Lock
          break

        case 'j':
          event.preventDefault()
          setShowDiary(!showDiary)
          break

        case 'tab':
          event.preventDefault()
          // TAB 在有其他UI開啟時關閉所有UI，否則開啟設定
          if (showInventory || showMap || showDiary) {
            setShowInventory(false)
            setShowMap(false)
            setShowDiary(false)
          } else {
            setShowSettings(!showSettings)
          }
          break

        case 'f1':
          event.preventDefault()
          // F1 顯示幫助
          setShowSettings(true)
          break

        case 'f5':
          event.preventDefault()
          // F5 刷新/重載遊戲狀態
          window.location.reload()
          break

        case 'enter':
          // Enter 在對話中可能有特殊用途
          if (showDialogue) {
            event.preventDefault()
            // 這裡可以添加快速回復或繼續對話的邏輯
          }
          break

        case ' ':
          // 空白鍵 - 互動鍵
          if (!showDialogue) {
            event.preventDefault()
            // 這裡可以添加與最近NPC互動的邏輯
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    setShowInventory, 
    setShowMap, 
    setShowSettings, 
    setShowDiary,
    showInventory,
    showMap,
    showSettings,
    showDiary,
    showDialogue,
    endConversation
  ])

  return null
}

// 快速鍵提示組件
export const HotkeyHints = ({ visible = false }: { visible?: boolean }) => {
  if (!visible) return null

  return (
    <div className="fixed top-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg text-sm z-50">
      <h3 className="font-bold mb-2">快速鍵</h3>
      <div className="space-y-1">
        <div><kbd className="bg-gray-700 px-2 py-1 rounded">WASD</kbd> 移動</div>
        <div><kbd className="bg-gray-700 px-2 py-1 rounded">滑鼠</kbd> 視角</div>
        <div><kbd className="bg-gray-700 px-2 py-1 rounded">Shift</kbd> 潛行</div>
        <div><kbd className="bg-gray-700 px-2 py-1 rounded">Ctrl</kbd> 跑步</div>
        <div><kbd className="bg-gray-700 px-2 py-1 rounded">Space</kbd> 互動</div>
        <div><kbd className="bg-gray-700 px-2 py-1 rounded">I</kbd> 背包</div>
        <div><kbd className="bg-gray-700 px-2 py-1 rounded">M</kbd> 地圖</div>
        <div><kbd className="bg-gray-700 px-2 py-1 rounded">J</kbd> 日記</div>
        <div><kbd className="bg-gray-700 px-2 py-1 rounded">Tab</kbd> 設定</div>
        <div><kbd className="bg-gray-700 px-2 py-1 rounded">ESC</kbd> 取消/退出</div>
        <div><kbd className="bg-gray-700 px-2 py-1 rounded">F1</kbd> 幫助</div>
        <div><kbd className="bg-gray-700 px-2 py-1 rounded">F5</kbd> 重載</div>
      </div>
    </div>
  )
}