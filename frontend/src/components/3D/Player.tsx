import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/stores/gameStore'

interface PlayerProps {
  position?: [number, number, number]
}

export const Player = ({ position = [0, 0, 0] }: PlayerProps) => {
  const playerRef = useRef<THREE.Group>(null)
  const { camera } = useThree()
  const { setPlayerPosition, setPlayerRotation } = useGameStore()
  const isMounted = useRef(true)

  // 移動相關狀態
  const velocity = useRef(new THREE.Vector3())
  const direction = useRef(new THREE.Vector3())
  const keys = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    shift: false
  })

  // 相機偏移設定
  const cameraOffset = useRef(new THREE.Vector3(0, 8, 12))
  const cameraLookAtOffset = useRef(new THREE.Vector3(0, 2, 0))

  // 鍵盤事件處理
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          keys.current.forward = true
          break
        case 'KeyS':
        case 'ArrowDown':
          keys.current.backward = true
          break
        case 'KeyA':
        case 'ArrowLeft':
          keys.current.left = true
          break
        case 'KeyD':
        case 'ArrowRight':
          keys.current.right = true
          break
        case 'ShiftLeft':
        case 'ShiftRight':
          keys.current.shift = true
          break
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          keys.current.forward = false
          break
        case 'KeyS':
        case 'ArrowDown':
          keys.current.backward = false
          break
        case 'KeyA':
        case 'ArrowLeft':
          keys.current.left = false
          break
        case 'KeyD':
        case 'ArrowRight':
          keys.current.right = false
          break
        case 'ShiftLeft':
        case 'ShiftRight':
          keys.current.shift = false
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // 每幀更新
  useFrame((_, delta) => {
    if (!playerRef.current) return

    // 重置方向向量
    direction.current.set(0, 0, 0)

    // 根據按鍵設定移動方向
    if (keys.current.forward) direction.current.z -= 1
    if (keys.current.backward) direction.current.z += 1
    if (keys.current.left) direction.current.x -= 1
    if (keys.current.right) direction.current.x += 1

    // 正規化方向向量
    if (direction.current.length() > 0) {
      direction.current.normalize()
      
      // 根據相機角度調整移動方向
      const cameraDirection = new THREE.Vector3()
      camera.getWorldDirection(cameraDirection)
      cameraDirection.y = 0
      cameraDirection.normalize()
      
      const cameraRight = new THREE.Vector3()
      cameraRight.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0))
      
      const moveDirection = new THREE.Vector3()
      moveDirection.addScaledVector(cameraDirection, -direction.current.z)
      moveDirection.addScaledVector(cameraRight, direction.current.x)
      moveDirection.normalize()

      // 計算移動速度（按住Shift加速）
      const speed = keys.current.shift ? 12 : 8
      velocity.current.copy(moveDirection.multiplyScalar(speed * delta))

      // 更新玩家位置
      const newPosition = new THREE.Vector3().copy(playerRef.current.position)
      newPosition.add(velocity.current)
      
      // 保持在島嶼範圍內（半徑55的圓形島嶼）
      const distanceFromCenter = Math.sqrt(newPosition.x * newPosition.x + newPosition.z * newPosition.z)
      if (distanceFromCenter > 52) {
        newPosition.normalize().multiplyScalar(52)
        newPosition.y = 0.5
      }

      playerRef.current.position.copy(newPosition)
      if (isMounted.current) {
        setPlayerPosition([newPosition.x, newPosition.y, newPosition.z])
      }

      // 旋轉玩家面向移動方向
      if (moveDirection.length() > 0) {
        const targetRotation = Math.atan2(moveDirection.x, moveDirection.z)
        playerRef.current.rotation.y = THREE.MathUtils.lerp(
          playerRef.current.rotation.y,
          targetRotation,
          8 * delta
        )
        if (isMounted.current) {
          setPlayerRotation(targetRotation)
        }
      }
    }

    // 更新相機跟隨
    const playerPosition = playerRef.current.position
    const idealCameraPosition = new THREE.Vector3()
    idealCameraPosition.copy(playerPosition)
    idealCameraPosition.add(cameraOffset.current)

    const idealLookAtPosition = new THREE.Vector3()
    idealLookAtPosition.copy(playerPosition)
    idealLookAtPosition.add(cameraLookAtOffset.current)

    // 平滑插值相機位置
    camera.position.lerp(idealCameraPosition, 3 * delta)
    
    // 讓相機始終看向玩家
    const lookAtTarget = new THREE.Vector3()
    lookAtTarget.copy(idealLookAtPosition)
    camera.lookAt(lookAtTarget)
  })

  // Component lifecycle management
  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  // 初始化玩家位置
  useEffect(() => {
    if (playerRef.current && position && isMounted.current) {
      playerRef.current.position.set(...position)
      // Only set position once on mount
      setPlayerPosition(position)
    }
  }, []) // Remove dependencies to prevent infinite loop

  return (
    <group ref={playerRef} position={position}>
      {/* 玩家身體 */}
      <mesh castShadow receiveShadow position={[0, 1, 0]}>
        <capsuleGeometry args={[0.5, 1]} />
        <meshLambertMaterial color="#87CEEB" />
      </mesh>
      
      {/* 玩家頭部 */}
      <mesh castShadow receiveShadow position={[0, 2.2, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshLambertMaterial color="#FDBCB4" />
      </mesh>
      
      {/* 簡單的眼睛 */}
      <mesh position={[-0.1, 2.3, 0.25]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      <mesh position={[0.1, 2.3, 0.25]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      
      {/* 簡單的嘴巴 */}
      <mesh position={[0, 2.1, 0.28]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshBasicMaterial color="#FF69B4" />
      </mesh>

      {/* 玩家陰影圓圈 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <circleGeometry args={[0.8, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.3} />
      </mesh>
    </group>
  )
}