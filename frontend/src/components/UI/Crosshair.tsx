import { useEffect, useState } from 'react'

export const Crosshair = () => {
  const [isLocked, setIsLocked] = useState(false)

  useEffect(() => {
    const handlePointerLockChange = () => {
      setIsLocked(!!document.pointerLockElement)
    }

    document.addEventListener('pointerlockchange', handlePointerLockChange)
    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange)
    }
  }, [])

  if (!isLocked) return null

  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50">
      {/* 準心容器 */}
      <div className="relative w-16 h-16">
        {/* 外圈陰影（提高可見度） */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-black opacity-30" />
        </div>
        
        {/* 準心十字 */}
        <svg 
          width="64" 
          height="64" 
          viewBox="0 0 64 64" 
          className="absolute inset-0"
        >
          {/* 水平線 */}
          <line x1="10" y1="32" x2="24" y2="32" stroke="white" strokeWidth="2" />
          <line x1="40" y1="32" x2="54" y2="32" stroke="white" strokeWidth="2" />
          <line x1="10" y1="32" x2="24" y2="32" stroke="black" strokeWidth="4" opacity="0.3" />
          <line x1="40" y1="32" x2="54" y2="32" stroke="black" strokeWidth="4" opacity="0.3" />
          
          {/* 垂直線 */}
          <line x1="32" y1="10" x2="32" y2="24" stroke="white" strokeWidth="2" />
          <line x1="32" y1="40" x2="32" y2="54" stroke="white" strokeWidth="2" />
          <line x1="32" y1="10" x2="32" y2="24" stroke="black" strokeWidth="4" opacity="0.3" />
          <line x1="32" y1="40" x2="32" y2="54" stroke="black" strokeWidth="4" opacity="0.3" />
          
          {/* 中心點 */}
          <circle cx="32" cy="32" r="2" fill="white" />
          <circle cx="32" cy="32" r="3" fill="black" opacity="0.3" />
        </svg>
      </div>
    </div>
  )
}