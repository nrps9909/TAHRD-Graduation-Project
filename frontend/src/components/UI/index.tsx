import { useState, useEffect } from 'react'
import { DialogueBox } from './DialogueBox'
import { GameModals } from './GameModals'
import { Crosshair } from './Crosshair'
import { PointerLockHint } from './PointerLockHint'
import { InteractionHint } from './InteractionHint'
import { HotkeyManager, HotkeyHints } from './HotkeyManager'
import { PointerLockStatus } from './PointerLockStatus'
import { QuickGameMenu, QuickSocialMenu, QuickWorldMenu } from './QuickMenus'
import { QuickCommandMenu } from './QuickCommandMenu'
import { QuickGameModeMenu } from './QuickGameModeMenu'
import { QuickSettingsMenu } from './QuickSettingsMenu'
import { GameModeIndicator } from './GameModeIndicator'
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
      {/* PC遊戲：快速鍵管理器 */}
      <HotkeyManager />
      
      {/* 遊戲模式指示器 - 已移除 */}
      {/* <GameModeIndicator /> */}
      
      {/* PC遊戲：準心 - 已移除 */}
      {/* <Crosshair /> */}
      
      {/* PC遊戲：Pointer Lock 提示 */}
      <PointerLockHint />
      
      {/* PC遊戲：Pointer Lock 狀態提示 */}
      <PointerLockStatus />
      
      {/* 互動提示 - 靠近 NPC 時顯示 - 已關閉 */}
      {/* <InteractionHint /> */}
      
      {/* PC遊戲：快速鍵提示 */}
      <HotkeyHints visible={showControls} />
      

      {/* Quick Command Menu - Q hotkey */}
      <QuickCommandMenu />
      
      {/* Quick Game Mode Menu - G hotkey */}
      <QuickGameModeMenu />
      
      {/* Quick Settings Menu - Z hotkey */}
      <QuickSettingsMenu />
      
      {/* Quick Menus - C, X, Z hotkeys (removed QuickGameMenu) */}
      {/* <QuickGameMenu /> */}
      <QuickSocialMenu />
      <QuickWorldMenu />

      {/* All Modal Windows */}
      <GameModals />

      {/* Dialogue Box - PC遊戲標準位置 - 已關閉 */}
      {/* {showDialogue && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 w-full max-w-3xl px-4 z-50">
          <DialogueBox />
        </div>
      )} */}

    </>
  )
}