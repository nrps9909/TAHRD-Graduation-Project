import { useEffect, useState } from 'react'

export const PointerLockHint = () => {
  const [showHint, setShowHint] = useState(true)
  const [isLocked, setIsLocked] = useState(false)

  useEffect(() => {
    const handlePointerLockChange = () => {
      const locked = !!document.pointerLockElement
      setIsLocked(locked)
      if (locked) {
        setShowHint(false)
      }
    }

    // 初始檢查
    handlePointerLockChange()

    document.addEventListener('pointerlockchange', handlePointerLockChange)
    
    // 5秒後自動隱藏提示
    const timer = setTimeout(() => {
      if (!isLocked) {
        setShowHint(false)
      }
    }, 5000)

    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange)
      clearTimeout(timer)
    }
  }, [isLocked])

  if (isLocked || !showHint) return null

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-40 animate-fade-in">
      <div className="bg-black bg-opacity-80 text-white px-6 py-4 rounded-lg shadow-lg">
        <p className="text-center text-lg mb-2">
          🎮 移動滑鼠即可開始遊戲
        </p>
        <p className="text-center text-sm opacity-80">
          滑鼠進入畫面會自動隱藏，直接控制視角 | 按 ESC 退出鎖定模式
        </p>
      </div>
    </div>
  )
}