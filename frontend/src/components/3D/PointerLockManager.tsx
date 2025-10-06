import { useEffect } from 'react'
import { useGameStore } from '@/stores/gameStore'

export const PointerLockManager = () => {
  useEffect(() => {
    // 創建全局樣式
    const style = document.createElement('style')
    style.id = 'pointer-lock-styles'
    style.textContent = `
      /* 遊戲模式 - 隱藏游標 */
      body.pointer-locked,
      body.pointer-locked * {
        cursor: none !important;
      }

      body.pointer-locked canvas {
        cursor: none !important;
      }

      body.pointer-locked *:hover {
        cursor: none !important;
      }
    `

    document.head.appendChild(style)

    // 監聽 pointer lock 狀態
    const updatePointerLockState = () => {
      const uiOpen = useGameStore.getState().isAnyUIOpen()

      if (document.pointerLockElement) {
        document.body.classList.add('pointer-locked')
        document.body.classList.remove('ui-active')
        // 遊戲模式：隱藏游標
        document.documentElement.style.cursor = 'none'
        document.body.style.cursor = 'none'
      } else {
        document.body.classList.remove('pointer-locked')

        if (uiOpen) {
          // UI模式：顯示可愛游標
          document.body.classList.add('ui-active')
          document.documentElement.style.cursor = ''
          document.body.style.cursor = ''
        } else {
          // 預設：也顯示可愛游標（等待重新鎖定）
          document.body.classList.remove('ui-active')
          document.documentElement.style.cursor = ''
          document.body.style.cursor = ''
        }
      }
    }

    // 監聽UI狀態變化
    const unsubscribe = useGameStore.subscribe((state, prevState) => {
      const wasUIOpen = prevState.showDialogue || prevState.isInConversation ||
                        prevState.showInventory || prevState.showMap ||
                        prevState.showSettings || prevState.showDiary ||
                        prevState.showQuickCommandMenu || prevState.showQuickGameModeMenu ||
                        prevState.showQuickSocialMenu || prevState.showQuickWorldMenu ||
                        prevState.showHotkeyGuide

      const isUIOpen = state.showDialogue || state.isInConversation ||
                       state.showInventory || state.showMap ||
                       state.showSettings || state.showDiary ||
                       state.showQuickCommandMenu || state.showQuickGameModeMenu ||
                       state.showQuickSocialMenu || state.showQuickWorldMenu ||
                       state.showHotkeyGuide

      if (wasUIOpen !== isUIOpen) {
        updatePointerLockState()
      }
    })

    document.addEventListener('pointerlockchange', updatePointerLockState)
    document.addEventListener('mozpointerlockchange', updatePointerLockState)

    // 初始狀態
    updatePointerLockState()

    return () => {
      document.removeEventListener('pointerlockchange', updatePointerLockState)
      document.removeEventListener('mozpointerlockchange', updatePointerLockState)
      document.body.classList.remove('pointer-locked')
      document.body.classList.remove('ui-active')
      unsubscribe()

      // 清理樣式
      const styleElement = document.getElementById('pointer-lock-styles')
      if (styleElement) {
        styleElement.remove()
      }

      document.documentElement.style.cursor = ''
      document.body.style.cursor = ''
    }
  }, [])

  return null
}