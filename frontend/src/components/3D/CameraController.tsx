/**
 * CameraController - 攝影機動畫控制器
 * 點擊島嶼時平滑飛到該島，提供更直觀的導航體驗
 */

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Vector3 } from 'three'
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

interface CameraControllerProps {
  targetPosition: [number, number, number] | null
  onAnimationComplete?: () => void
}

export function CameraController({ targetPosition, onAnimationComplete }: CameraControllerProps) {
  const { camera } = useThree()
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const isAnimating = useRef(false)
  const startPosition = useRef(new Vector3())
  const startTarget = useRef(new Vector3())
  const endPosition = useRef(new Vector3())
  const endTarget = useRef(new Vector3())
  const animationProgress = useRef(0)

  // 當 targetPosition 改變時，啟動動畫
  useEffect(() => {
    if (!targetPosition || !controlsRef.current) return

    // 記錄起始位置
    startPosition.current.copy(camera.position)
    startTarget.current.copy(controlsRef.current.target)

    const [x, y, z] = targetPosition

    // 判斷是否為總覽視角（y > 60 表示從上方俯視）
    if (y > 60) {
      // 總覽視角：從正上方俯視所有島嶼
      endPosition.current.set(x, y, z)
      endTarget.current.set(0, 0, 0) // 看向中心點
    } else {
      // 島嶼近景視角：從斜上方觀察特定島嶼
      const islandHeight = y
      endPosition.current.set(
        x + 10,
        islandHeight + 12,
        z + 10
      )
      endTarget.current.set(x, islandHeight + 2, z)
    }

    // 重置動畫進度
    animationProgress.current = 0
    isAnimating.current = true
  }, [targetPosition, camera])

  // 動畫循環
  useFrame((_, delta) => {
    if (!isAnimating.current || !controlsRef.current) return

    // 增加動畫進度
    animationProgress.current += delta * 1.5 // 速度：1.5 倍

    // 使用 easeInOutCubic 緩動函數
    const t = Math.min(animationProgress.current, 1)
    const eased = t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2

    // 插值位置和目標
    camera.position.lerpVectors(startPosition.current, endPosition.current, eased)
    controlsRef.current.target.lerpVectors(startTarget.current, endTarget.current, eased)
    controlsRef.current.update()

    // 動畫完成
    if (animationProgress.current >= 1) {
      isAnimating.current = false
      onAnimationComplete?.()
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={true}
      enableZoom={true}
      minDistance={10}
      maxDistance={150}
      maxPolarAngle={Math.PI / 2.1}
      target={[0, 0, 0]}
      autoRotate={false}
    />
  )
}
