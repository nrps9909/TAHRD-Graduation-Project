import { useState, useEffect } from 'react'

export const PointerLockStatus = () => {
  const [isLocked, setIsLocked] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [hintMessage, setHintMessage] = useState('')

  useEffect(() => {
    const handlePointerLockChange = () => {
      const locked = !!document.pointerLockElement
      setIsLocked(locked)
      
      if (locked) {
        setHintMessage('按 ESC 退出滑鼠鎖定')
        setShowHint(true)
        setTimeout(() => setShowHint(false), 3000)
      } else {
        setHintMessage('按 ESC 重新進入滑鼠鎖定')
        setShowHint(true)
        setTimeout(() => setShowHint(false), 3000)
      }
    }

    document.addEventListener('pointerlockchange', handlePointerLockChange)
    return () => document.removeEventListener('pointerlockchange', handlePointerLockChange)
  }, [])

  if (!showHint) return null

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50">
      <div className={`px-4 py-2 rounded-lg text-white text-sm font-medium transition-all duration-300 ${
        isLocked 
          ? 'bg-green-600 bg-opacity-90' 
          : 'bg-blue-600 bg-opacity-90'
      }`}>
        {hintMessage}
      </div>
    </div>
  )
}