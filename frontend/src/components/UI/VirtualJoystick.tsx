import { useState, useRef, useEffect, useCallback } from 'react'

interface VirtualJoystickProps {
  onDirectionChange: (x: number, y: number) => void
  size?: number
  className?: string
}

export const VirtualJoystick = ({ 
  onDirectionChange, 
  size = 120,
  className = ''
}: VirtualJoystickProps) => {
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const joystickRef = useRef<HTMLDivElement>(null)
  const centerPos = useRef({ x: 0, y: 0 })
  
  const maxDistance = size / 2 - 20 // 搖桿球的最大移動距離

  // 計算方向向量
  const calculateDirection = useCallback((clientX: number, clientY: number) => {
    if (!joystickRef.current) return

    const rect = joystickRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    let deltaX = clientX - centerX
    let deltaY = clientY - centerY
    
    // 限制在圓形範圍內
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    if (distance > maxDistance) {
      deltaX = (deltaX / distance) * maxDistance
      deltaY = (deltaY / distance) * maxDistance
    }
    
    setPosition({ x: deltaX, y: deltaY })
    
    // 歸一化方向向量 (-1 到 1)
    const normalizedX = deltaX / maxDistance
    const normalizedY = -deltaY / maxDistance // 反轉Y軸，讓上為正
    
    onDirectionChange(normalizedX, normalizedY)
  }, [maxDistance, onDirectionChange])

  // 重置搖桿位置
  const resetJoystick = useCallback(() => {
    setPosition({ x: 0, y: 0 })
    setIsDragging(false)
    onDirectionChange(0, 0)
  }, [onDirectionChange])

  // 滑鼠事件（用於網頁測試）
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    calculateDirection(e.clientX, e.clientY)
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return
    e.preventDefault()
    calculateDirection(e.clientX, e.clientY)
  }, [isDragging, calculateDirection])

  const handleMouseUp = useCallback(() => {
    resetJoystick()
  }, [resetJoystick])

  // 觸摸事件（手機）
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault()
    const touch = e.touches[0]
    setIsDragging(true)
    calculateDirection(touch.clientX, touch.clientY)
  }

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return
    e.preventDefault()
    const touch = e.touches[0]
    calculateDirection(touch.clientX, touch.clientY)
  }, [isDragging, calculateDirection])

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    e.preventDefault()
    resetJoystick()
  }, [resetJoystick])

  // 設置全局事件監聽器
  useEffect(() => {
    if (isDragging) {
      // 滑鼠事件
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      
      // 觸摸事件
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', handleTouchEnd, { passive: false })
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd])

  return (
    <div className={`fixed bottom-8 left-8 ${className}`}>
      <div
        ref={joystickRef}
        className="relative select-none"
        style={{ width: size, height: size }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* 搖桿基座 */}
        <div
          className="absolute inset-0 rounded-full bg-black bg-opacity-30 border-4 border-white border-opacity-50"
          style={{
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        />
        
        {/* 搖桿球 */}
        <div
          className="absolute w-10 h-10 rounded-full bg-white bg-opacity-80 shadow-lg border-2 border-gray-300 transition-all"
          style={{
            left: '50%',
            top: '50%',
            transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
        />
        
        {/* 中心點指示器 */}
        <div
          className="absolute w-2 h-2 rounded-full bg-gray-400 pointer-events-none"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />
      </div>
      
      {/* 搖桿標籤 */}
      <div className="text-center mt-2 text-white text-sm font-medium drop-shadow-lg">
        移動
      </div>
    </div>
  )
}