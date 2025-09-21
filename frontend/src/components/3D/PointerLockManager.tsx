import { useEffect } from 'react'

export const PointerLockManager = () => {
  useEffect(() => {
    // 創建全局樣式來強制隱藏游標
    const style = document.createElement('style')
    style.id = 'pointer-lock-styles'
    style.textContent = `
      body.pointer-locked,
      body.pointer-locked * {
        cursor: none !important;
      }
      
      body.pointer-locked canvas {
        cursor: none !important;
      }
      
      /* 防止任何元素顯示游標 */
      body.pointer-locked *:hover {
        cursor: none !important;
      }
    `
    
    document.head.appendChild(style)
    
    // 監聽 pointer lock 狀態
    const updatePointerLockState = () => {
      if (document.pointerLockElement) {
        document.body.classList.add('pointer-locked')
        // 強制設置所有元素的游標為 none
        document.documentElement.style.cursor = 'none'
        document.body.style.cursor = 'none'
      } else {
        document.body.classList.remove('pointer-locked')
        document.documentElement.style.cursor = ''
        document.body.style.cursor = ''
      }
    }
    
    document.addEventListener('pointerlockchange', updatePointerLockState)
    document.addEventListener('mozpointerlockchange', updatePointerLockState)
    
    return () => {
      document.removeEventListener('pointerlockchange', updatePointerLockState)
      document.removeEventListener('mozpointerlockchange', updatePointerLockState)
      document.body.classList.remove('pointer-locked')
      
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