import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/stores/gameStore'
// import { isFiniteVec3 } from '@/game/utils/mathSafe' // Temporarily disabled

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
  offset = new THREE.Vector3(0, 5, 8),  // 更近的第三人稱距離
  lookAtOffset = new THREE.Vector3(0, 1.5, 0),
  smoothness = 8,  // 增加平滑度
  enableRotation = true,  // PC模式：啟用旋轉
  enablePointerLock = true,  // 啟用 pointer lock
  onRotationChange
}: CameraControllerProps) => {
  const { camera, gl } = useThree()
  const { isAnyUIOpen } = useGameStore()
  const targetRotation = useRef(0)
  const currentRotation = useRef(0)
  const pitch = useRef(-0.2) // 預設稍微向下看的角度
  const isPointerLocked = useRef(false)
  const isDragging = useRef(false)
  const lastMouseX = useRef(0)
  const lastMouseY = useRef(0)
  const dragRotation = useRef(0)
  const dragPitch = useRef(-0.2) // 拖曳時的俯仰角
  const lastMouseUpTime = useRef(0)
  const lastPointerLockExitTime = useRef(0) // 記錄上次退出時間
  const pendingPointerLockRequest = useRef(false) // 防止重複請求
  const cameraDistance = useRef(Math.sqrt(offset.x * offset.x + offset.y * offset.y + offset.z * offset.z)) // 相機距離
  const originalExitPointerLockRef = useRef<typeof document.exitPointerLock | null>(null)

  // 監聽UI狀態變化，自動釋放/重新獲取 pointer lock
  useEffect(() => {
    const uiOpen = isAnyUIOpen()

    if (uiOpen && document.pointerLockElement) {
      // UI打開時，釋放pointer lock
      console.log('🔓 UI打開，釋放 Pointer lock')
      if (originalExitPointerLockRef.current) {
        originalExitPointerLockRef.current.call(document)
      }
    }
  }, [isAnyUIOpen])

  useEffect(() => {
    const canvas = gl.domElement
    let hasInteracted = false

    // 覆寫 document.exitPointerLock 來防止退出
    const originalExitPointerLock = document.exitPointerLock
    originalExitPointerLockRef.current = originalExitPointerLock

    if (enablePointerLock) {
      document.exitPointerLock = () => {
        // 檢查是否有UI打開
        const uiOpen = useGameStore.getState().isAnyUIOpen()
        if (uiOpen) {
          // 如果UI打開，允許退出pointer lock
          console.log('🔓 UI打開，允許退出 Pointer lock')
          originalExitPointerLock.call(document)
        } else {
          console.log('exitPointerLock 被阻止（無UI）')
          // 不執行原始的 exitPointerLock
        }
      }
    }
    
    // 安全進入 pointer lock 的函數
    const safeEnterPointerLock = async (source = 'auto') => {
      // 檢查是否有UI打開 - 如果有則不鎖定
      const uiOpen = useGameStore.getState().isAnyUIOpen()
      if (uiOpen) {
        console.log('UI打開中，跳過 Pointer lock')
        return false
      }

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
      } catch (err: any) {
        // 只在非用戶手勢錯誤時才記錄
        if (!err.message?.includes('user gesture')) {
          console.log(`${source} 進入 Pointer lock 失敗:`, err.message)
        }
        return false
      } finally {
        pendingPointerLockRequest.current = false
      }
    }
    
    // 延遲自動進入 pointer lock
    const delayedAutoLock = () => {
      // 自動啟動 pointer lock
      setTimeout(() => {
        if (!hasInteracted) {
          safeEnterPointerLock('自動啟動')
        }
      }, 500) // 延遲0.5秒，確保頁面完全載入
    }
    
    // 監聽滑鼠進入畫布
    const handleMouseEnter = () => {
      if (!document.pointerLockElement && hasInteracted) {
        setTimeout(() => safeEnterPointerLock('滑鼠進入'), 100)
      }
    }
    
    // 監聽第一次滑鼠移動或點擊來進入 pointer lock
    const handleFirstInteraction = () => {
      if (!hasInteracted && enablePointerLock) {
        hasInteracted = true
        safeEnterPointerLock('首次互動')
      }
    }
    
    // 監聽任何點擊來保持 pointer lock
    const handleAnyClick = (event: MouseEvent) => {
      if (!document.pointerLockElement && enablePointerLock) {
        event.preventDefault()
        safeEnterPointerLock('點擊重新鎖定')
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
        document.body.classList.remove('ui-active')
        canvas.style.cursor = 'none'
        document.body.style.cursor = 'none'
        console.log('✓ 進入 Pointer lock 模式')
      } else {
        document.body.classList.remove('game-active')

        // 檢查UI狀態決定是否顯示游標
        const uiOpen = useGameStore.getState().isAnyUIOpen()
        if (uiOpen) {
          // UI打開：顯示可愛游標
          document.body.classList.add('ui-active')
          canvas.style.cursor = ''
          document.body.style.cursor = ''
        } else {
          // 無UI：暫時顯示游標，等待重新鎖定
          document.body.classList.remove('ui-active')
          canvas.style.cursor = 'grab'
          document.body.style.cursor = ''
        }

        // 記錄退出時間，用於冷卻期計算
        if (wasLocked) {
          lastPointerLockExitTime.current = Date.now()
          console.log('✗ 退出 Pointer lock 模式')

          // 只在沒有UI打開時才自動重新進入
          setTimeout(() => {
            const uiOpenNow = useGameStore.getState().isAnyUIOpen()
            if (!document.pointerLockElement && enablePointerLock && !uiOpenNow) {
              safeEnterPointerLock('自動重新鎖定')
            }
          }, 200)
        }
      }
    }
    
    // PC遊戲風格：滑鼠控制相機
    const handleMouseMove = (event: MouseEvent) => {
      if (!enableRotation) return

      // 檢查是否有UI打開 - 如果有則停止視角控制
      const uiOpen = useGameStore.getState().isAnyUIOpen()
      if (uiOpen) {
        return
      }

      if (isPointerLocked.current) {
        // Pointer Lock 模式 - 自由視角
        const sensitivity = 0.002
        targetRotation.current -= event.movementX * sensitivity
        pitch.current = Math.max(-Math.PI / 4, Math.min(Math.PI / 6, pitch.current - event.movementY * sensitivity))
      } else if (isDragging.current) {
        // 拖曳模式 - 水平和垂直旋轉
        const deltaX = event.clientX - lastMouseX.current
        const deltaY = event.clientY - lastMouseY.current
        dragRotation.current -= deltaX * 0.005  // 降低靈敏度
        dragPitch.current = Math.max(-Math.PI / 4, Math.min(Math.PI / 6, dragPitch.current - deltaY * 0.003))
        targetRotation.current = dragRotation.current
        pitch.current = dragPitch.current
        lastMouseX.current = event.clientX
        lastMouseY.current = event.clientY
      }
    }
    
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && document.pointerLockElement) {
        // 防止 ESC 退出 pointer lock
        event.preventDefault()
        event.stopPropagation()
        console.log('ESC 被阻止，保持 Pointer lock')
        // 立即重新請求 pointer lock
        if (!document.pointerLockElement) {
          setTimeout(() => {
            safeEnterPointerLock('ESC重新鎖定')
          }, 100)
        }
      }
    }
    
    const handleMouseDown = (event: MouseEvent) => {
      if (!isPointerLocked.current && event.button === 0) { // 左鍵
        isDragging.current = true
        lastMouseX.current = event.clientX
        lastMouseY.current = event.clientY
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
    
    // 滾輪控制相機距離
    const handleWheel = (event: WheelEvent) => {
      if (event.target === canvas) {
        event.preventDefault()
        // 調整相機距離（更近的範圍）
        cameraDistance.current = Math.max(4, Math.min(15, cameraDistance.current + event.deltaY * 0.005))
      }
    }

    canvas.addEventListener('click', handleClick)
    canvas.addEventListener('mousedown', handleMouseDown)
    canvas.addEventListener('mouseup', handleMouseUp)
    canvas.addEventListener('mouseleave', handleMouseLeave)
    canvas.addEventListener('mouseenter', handleMouseEnter)
    canvas.addEventListener('wheel', handleWheel, { passive: false })
    document.addEventListener('pointerlockchange', handlePointerLockChange)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('keydown', handleEsc, true)  // 使用捕獲階段來優先處理
    
    // 設定初始游標樣式
    canvas.style.cursor = 'grab'
    
    // 監聽第一次互動來自動進入 pointer lock
    window.addEventListener('mousemove', handleFirstInteraction, { once: true })
    window.addEventListener('click', handleFirstInteraction, { once: true })
    document.addEventListener('click', handleAnyClick, true)  // 使用捕獲階段
    
    // 延遲嘗試進入 pointer lock
    delayedAutoLock()
    
    return () => {
      canvas.removeEventListener('click', handleClick)
      canvas.removeEventListener('mousedown', handleMouseDown)
      canvas.removeEventListener('mouseup', handleMouseUp)
      canvas.removeEventListener('mouseleave', handleMouseLeave)
      canvas.removeEventListener('mouseenter', handleMouseEnter)
      canvas.removeEventListener('wheel', handleWheel)
      document.removeEventListener('pointerlockchange', handlePointerLockChange)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('keydown', handleEsc, true)
      window.removeEventListener('mousemove', handleFirstInteraction)
      window.removeEventListener('click', handleFirstInteraction)
      document.removeEventListener('click', handleAnyClick, true)
      
      // 恢復原始的 exitPointerLock 函數
      if (enablePointerLock && originalExitPointerLockRef.current) {
        document.exitPointerLock = originalExitPointerLockRef.current
      }

      // 清理時退出 pointer lock 並恢復游標
      if (document.pointerLockElement && originalExitPointerLockRef.current) {
        originalExitPointerLockRef.current.call(document)
      }
      document.body.classList.remove('game-active')
      document.body.classList.remove('ui-active')
      canvas.style.cursor = ''
      document.body.style.cursor = ''
    }
  }, [enableRotation, enablePointerLock, gl.domElement])

  useFrame((_, delta) => {
    if (!target.current) return

    // 獲取目標位置
    const targetPosition = target.current.position
    
    // Safety check: Skip frame if target position is non-finite
    // if (!isFiniteVec3(targetPosition)) { // Temporarily disabled
    if (false) {
      console.warn('[Camera] Non-finite target position detected, skipping frame')
      return
    }

    // PC遊戲：平滑更新相機旋轉（更高的平滑度）
    currentRotation.current = THREE.MathUtils.lerp(
      currentRotation.current,
      targetRotation.current,
      Math.min(1, smoothness * delta * 2)  // 增加響應速度
    )
    
    // 通知旋轉變化
    if (onRotationChange) {
      onRotationChange(currentRotation.current)
    }

    // PC遊戲：動態相機位置計算
    const dynamicDistance = cameraDistance.current
    const horizontalDistance = dynamicDistance * Math.cos(pitch.current)
    const verticalOffset = dynamicDistance * Math.sin(-pitch.current) + offset.y
    
    // 計算相機位置（基於距離和角度）
    const rotatedOffset = new THREE.Vector3(
      Math.sin(currentRotation.current) * horizontalDistance,
      verticalOffset,
      Math.cos(currentRotation.current) * horizontalDistance
    )

    const idealCameraPosition = targetPosition.clone().add(rotatedOffset)
    
    // 限制相機高度（更低的範圍以保持近距離）
    idealCameraPosition.y = Math.max(1.5, Math.min(12, idealCameraPosition.y))

    // 平滑移動相機（更快的跟隨）
    camera.position.lerp(idealCameraPosition, Math.min(1, smoothness * delta * 1.5))

    // 計算相機應該看向的位置（稍微向前看）
    const forwardOffset = new THREE.Vector3(
      Math.sin(currentRotation.current) * 2,
      0,
      Math.cos(currentRotation.current) * 2
    )
    const lookAtPosition = targetPosition.clone().add(lookAtOffset).add(forwardOffset)
    
    // 平滑更新相機朝向
    const currentLookAt = new THREE.Vector3()
    camera.getWorldDirection(currentLookAt)
    const targetDirection = lookAtPosition.clone().sub(camera.position).normalize()
    
    // 創建目標四元數
    const targetQuaternion = new THREE.Quaternion()
    const tempMatrix = new THREE.Matrix4()
    tempMatrix.lookAt(camera.position, lookAtPosition, camera.up)
    targetQuaternion.setFromRotationMatrix(tempMatrix)
    
    // 平滑旋轉
    camera.quaternion.slerp(targetQuaternion, Math.min(1, smoothness * delta * 2))
  })

  return null
}