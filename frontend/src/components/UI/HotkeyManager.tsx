import { useEffect } from 'react'
import { useGameStore } from '@/stores/gameStore'

export const HotkeyManager = () => {
  const { 
    setShowInventory, 
    setShowMap, 
    setShowSettings, 
    setShowDiary,
    setShowGameMenu,
    setShowSocialMenu,
    setShowWorldMenu,
    setShowQuickGameModeMenu,
    showInventory,
    showMap,
    showSettings,
    showDiary,
    showGameMenu,
    showSocialMenu,
    showWorldMenu,
    showQuickGameModeMenu,
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

        case 'g':
          event.preventDefault()
          setShowQuickGameModeMenu(!showQuickGameModeMenu)
          break

        case 'x':
          event.preventDefault()
          setShowWorldMenu(!showWorldMenu)
          break

        case 'c':
          event.preventDefault()
          setShowSocialMenu(!showSocialMenu)
          break

        case 'z':
          event.preventDefault()
          setShowSettings(!showSettings)
          break


        case 'escape':
          // ESC 優先級：對話框 > UI面板 > Pointer Lock (由CameraController處理)
          if (showDialogue) {
            event.preventDefault()
            endConversation()
          } else if (showSettings || showInventory || showMap || showDiary || showGameMenu || showSocialMenu || showWorldMenu || showQuickGameModeMenu) {
            event.preventDefault()
            // 關閉所有UI面板
            if (showSettings) setShowSettings(false)
            if (showInventory) setShowInventory(false)
            if (showMap) setShowMap(false)
            if (showDiary) setShowDiary(false)
            if (showGameMenu) setShowGameMenu(false)
            if (showSocialMenu) setShowSocialMenu(false)
            if (showWorldMenu) setShowWorldMenu(false)
            if (showQuickGameModeMenu) setShowQuickGameModeMenu(false)
          }
          // 如果沒有UI面板開啟，讓 CameraController 處理 Pointer Lock
          break


        case 'tab':
          event.preventDefault()
          // TAB 關閉所有UI面板
          if (showInventory || showMap || showDiary || showGameMenu || showSocialMenu || showWorldMenu || showSettings || showQuickGameModeMenu) {
            setShowInventory(false)
            setShowMap(false)
            setShowDiary(false)
            setShowGameMenu(false)
            setShowSocialMenu(false)
            setShowWorldMenu(false)
            setShowSettings(false)
            setShowQuickGameModeMenu(false)
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
    setShowGameMenu,
    setShowSocialMenu,
    setShowWorldMenu,
    setShowQuickGameModeMenu,
    showInventory,
    showMap,
    showSettings,
    showDiary,
    showGameMenu,
    showSocialMenu,
    showWorldMenu,
    showQuickGameModeMenu,
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
        <div><kbd className="bg-gray-700 px-2 py-1 rounded">Q</kbd> 總選單</div>
        <div><kbd className="bg-gray-700 px-2 py-1 rounded">G</kbd> 遊戲模式</div>
        <div><kbd className="bg-gray-700 px-2 py-1 rounded">C</kbd> 社交功能</div>
        <div><kbd className="bg-gray-700 px-2 py-1 rounded">X</kbd> 探索世界</div>
        <div><kbd className="bg-gray-700 px-2 py-1 rounded">Z</kbd> 遊戲設定</div>
        <div><kbd className="bg-gray-700 px-2 py-1 rounded">Tab</kbd> 關閉所有選單</div>
        <div><kbd className="bg-gray-700 px-2 py-1 rounded">ESC</kbd> 取消/退出</div>
        <div><kbd className="bg-gray-700 px-2 py-1 rounded">F1</kbd> 幫助</div>
        <div><kbd className="bg-gray-700 px-2 py-1 rounded">F5</kbd> 重載</div>
      </div>
    </div>
  )
}