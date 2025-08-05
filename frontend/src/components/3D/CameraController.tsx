import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

interface CameraControllerProps {
  target: React.RefObject<THREE.Object3D>
  offset?: THREE.Vector3
  lookAtOffset?: THREE.Vector3
  smoothness?: number
  enableRotation?: boolean
  enablePointerLock?: boolean
  onRotationChange?: (rotation: number) => void
}

export const CameraController = ({
  target,
  offset = new THREE.Vector3(0, 8, 12),  // PC遊戲標準第三人稱距離
  lookAtOffset = new THREE.Vector3(0, 1.5, 0),
  smoothness = 6,
  enableRotation = true,  // PC模式：啟用旋轉
  enablePointerLock = true,  // PC模式：啟用pointer lock
  onRotationChange
}: CameraControllerProps) => {
  const { camera, gl } = useThree()
  const targetRotation = useRef(0)
  const currentRotation = useRef(0)
  const pitch = useRef(0) // 上下視角
  const isPointerLocked = useRef(false)
  const isDragging = useRef(false)
  const lastMouseX = useRef(0)
  const dragRotation = useRef(0)
  const lastMouseUpTime = useRef(0)
  const lastPointerLockExitTime = useRef(0) // 記錄上次退出時間
  const pendingPointerLockRequest = useRef(false) // 防止重複請求

  useEffect(() => {
    const canvas = gl.domElement
    let hasInteracted = false
    
    // 安全進入 pointer lock 的函數
    const safeEnterPointerLock = async (source = 'auto') => {
      if (!enablePointerLock || document.pointerLockElement || pendingPointerLockRequest.current) {
        return false
      }

      // 檢查是否在冷卻期內（退出後500ms內不能重新進入）
      const timeSinceExit = Date.now() - lastPointerLockExitTime.current
      if (timeSinceExit < 500) {
        console.log(`Pointer lock 冷卻期中，剩餘: ${500 - timeSinceExit}ms`)
        return false
      }

      pendingPointerLockRequest.current = true
      
      try {
        await canvas.requestPointerLock()
        console.log(`${source} 成功進入 Pointer lock`)
        hasInteracted = true
        return true
      } catch (err) {
        console.log(`${source} 進入 Pointer lock 失敗:`, err.message)
        return false
      } finally {
        pendingPointerLockRequest.current = false
      }
    }
    
    // 延遲自動進入 pointer lock
    const delayedAutoLock = () => {
      setTimeout(() => {
        if (!hasInteracted) {
          safeEnterPointerLock('自動啟動')
        }
      }, 1000) // 延遲1秒，確保頁面完全載入
    }
    
    // 監聽滑鼠進入畫布
    const handleMouseEnter = () => {
      if (!document.pointerLockElement && hasInteracted) {
        setTimeout(() => safeEnterPointerLock('滑鼠進入'), 100)
      }
    }
    
    // 監聽第一次滑鼠移動
    const handleFirstMouseMove = () => {
      if (!hasInteracted) {
        hasInteracted = true
        safeEnterPointerLock('首次滑鼠移動')
      }
    }
    
    const handleClick = async (event: MouseEvent) => {
      if (event.target !== canvas) return
      
      // 檢查是否剛結束拖曳
      const timeSinceMouseUp = Date.now() - lastMouseUpTime.current
      if (timeSinceMouseUp < 200) return
      
      if (!document.pointerLockElement && !isDragging.current) {
        hasInteracted = true
        safeEnterPointerLock('點擊')
      }
    }
    
    const handlePointerLockChange = () => {
      const wasLocked = isPointerLocked.current
      isPointerLocked.current = !!document.pointerLockElement
      
      if (isPointerLocked.current) {
        document.body.classList.add('game-active')
        canvas.style.cursor = 'none'
        document.body.style.cursor = 'none'
        console.log('✓ 進入 Pointer lock 模式')
      } else {
        document.body.classList.remove('game-active')
        canvas.style.cursor = 'grab'
        document.body.style.cursor = ''
        
        // 記錄退出時間，用於冷卻期計算
        if (wasLocked) {
          lastPointerLockExitTime.current = Date.now()
          console.log('✗ 退出 Pointer lock 模式')
        }
      }
    }
    
    // PC遊戲風格：滑鼠控制相機
    const handleMouseMove = (event: MouseEvent) => {
      if (!enableRotation) return
      
      if (isPointerLocked.current) {
        // Pointer Lock 模式 - 自由視角
        const sensitivity = 0.002
        targetRotation.current += event.movementX * sensitivity  // 修正：滑鼠右移相機右轉
        pitch.current = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, pitch.current - event.movementY * sensitivity))
      } else if (isDragging.current) {
        // 拖曳模式 - 水平旋轉
        const deltaX = event.clientX - lastMouseX.current
        dragRotation.current -= deltaX * 0.01
        targetRotation.current = dragRotation.current
        lastMouseX.current = event.clientX
      }
    }
    
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (document.pointerLockElement) {
          // 如果當前處於鎖定狀態，退出鎖定
          document.exitPointerLock()
          console.log('ESC 退出 Pointer lock')
        } else if (enablePointerLock && hasInteracted) {
          // 如果當前未鎖定且用戶已互動，延遲嘗試進入鎖定
          setTimeout(() => {
            safeEnterPointerLock('ESC鍵')
          }, 600) // 等待冷卻期結束
        }
      }
    }
    
    const handleMouseDown = (event: MouseEvent) => {
      if (!isPointerLocked.current && event.button === 0) { // 左鍵
        isDragging.current = true
        lastMouseX.current = event.clientX
        canvas.style.cursor = 'grabbing'
      }
    }
    
    const handleMouseUp = () => {
      lastMouseUpTime.current = Date.now()
      if (isDragging.current) {
        isDragging.current = false
        if (!isPointerLocked.current) {
          canvas.style.cursor = 'grab'
        }
      }
    }
    
    const handleMouseLeave = () => {
      if (isDragging.current) {
        isDragging.current = false
        if (!isPointerLocked.current) {
          canvas.style.cursor = 'grab'
        }
      }
    }

    canvas.addEventListener('click', handleClick)
    canvas.addEventListener('mousedown', handleMouseDown)
    canvas.addEventListener('mouseup', handleMouseUp)
    canvas.addEventListener('mouseleave', handleMouseLeave)
    canvas.addEventListener('mouseenter', handleMouseEnter)
    document.addEventListener('pointerlockchange', handlePointerLockChange)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('keydown', handleEsc)
    
    // 設定初始游標樣式
    canvas.style.cursor = 'grab'
    
    // 監聽第一次滑鼠移動來自動進入 pointer lock
    window.addEventListener('mousemove', handleFirstMouseMove, { once: true })
    
    // 延遲嘗試進入 pointer lock
    delayedAutoLock()
    
    return () => {
      canvas.removeEventListener('click', handleClick)
      canvas.removeEventListener('mousedown', handleMouseDown)
      canvas.removeEventListener('mouseup', handleMouseUp)
      canvas.removeEventListener('mouseleave', handleMouseLeave)
      canvas.removeEventListener('mouseenter', handleMouseEnter)
      document.removeEventListener('pointerlockchange', handlePointerLockChange)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('keydown', handleEsc)
      window.removeEventListener('mousemove', handleFirstMouseMove)
      
      // 清理時退出 pointer lock 並恢復游標
      if (document.pointerLockElement) {
        document.exitPointerLock()
      }
      document.body.classList.remove('game-active')
      canvas.style.cursor = ''
      document.body.style.cursor = ''
    }
  }, [enableRotation, enablePointerLock, gl.domElement])

  useFrame((_, delta) => {
    if (!target.current) return

    // 獲取目標位置
    const targetPosition = target.current.position

    // PC遊戲：平滑更新相機旋轉
    currentRotation.current = THREE.MathUtils.lerp(
      currentRotation.current,
      targetRotation.current,
      smoothness * delta
    )
    
    // 通知旋轉變化
    if (onRotationChange) {
      onRotationChange(currentRotation.current)
    }

    // PC遊戲：動態相機位置計算
    const rotatedOffset = offset.clone()
    
    // 計算相機位置
    const horizontalDistance = Math.sqrt(offset.x * offset.x + offset.z * offset.z)
    
    // 水平旋轉
    rotatedOffset.x = Math.sin(currentRotation.current) * horizontalDistance
    rotatedOffset.z = Math.cos(currentRotation.current) * horizontalDistance
    
    // 垂直位置調整（基於俯仰角度）
    if (isPointerLocked.current) {
      rotatedOffset.y = offset.y + Math.sin(pitch.current) * horizontalDistance * 0.3
    } else {
      rotatedOffset.y = offset.y
    }

    const idealCameraPosition = targetPosition.clone().add(rotatedOffset)
    
    // 限制相機高度
    idealCameraPosition.y = Math.max(2, Math.min(20, idealCameraPosition.y))

    // 平滑移動相機
    camera.position.lerp(idealCameraPosition, smoothness * delta)

    // 計算相機應該看向的位置
    const lookAtPosition = targetPosition.clone().add(lookAtOffset)
    
    // 在Pointer Lock模式下，允許更自由的視角
    if (isPointerLocked.current) {
      // 創建一個臨時相機來計算目標四元數
      const tempCamera = camera.clone()
      tempCamera.lookAt(lookAtPosition)
      
      // 應用俯仰角調整
      const pitchQuaternion = new THREE.Quaternion()
      pitchQuaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitch.current * 0.3)
      tempCamera.quaternion.multiply(pitchQuaternion)
      
      // 平滑旋轉相機朝向
      camera.quaternion.slerp(tempCamera.quaternion, smoothness * delta)
    } else {
      // 標準模式：直接看向目標
      camera.lookAt(lookAtPosition)
    }
  })

  return null
}