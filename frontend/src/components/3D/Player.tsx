import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as THREE from 'three'
import { useGameStore } from '@/stores/gameStore'
import { collisionSystem } from '@/utils/collision'
import { getTerrainHeight, getTerrainRotation, getTerrainSlope, isPathClear } from './TerrainModel'
import { CameraController } from './CameraController'
import { safeNormalize2, isFiniteVec3 } from '@/game/utils/mathSafe'
import { wrapWithFeetPivot } from '@/game/utils/fixPivotAtFeet'
import { KCC } from '@/game/physics/kcc'

// NPC 類型定義（與 gameStore 保持一致）
interface NPC {
  id: string
  name: string
  personality: string
  currentMood: string
  position: [number, number, number]
  relationshipLevel: number
  lastInteraction?: Date
  isInConversation?: boolean
  conversationContent?: string
  conversationPartner?: string
}

interface PlayerProps {
  position?: [number, number, number]
  modelPath?: string
  modelFile?: string
}

interface PlayerRef {
  getPosition: () => THREE.Vector3
  getRef: () => THREE.Group | null
}

const PlayerComponent = (props: PlayerProps, ref: React.Ref<PlayerRef>) => {
  const {
    position = [-15, 5, -15], // 安全的spawn位置，地面高度
    modelPath = '/characters/CHAR-F-A',
    modelFile = '/CHAR-F-A.glb'
  } = props;
  const feetPivotRef = useRef<THREE.Group>(null)
  const playerRef = useRef<THREE.Group>(null) // 保留為相容性
  const { setPlayerPosition, setPlayerRotation, npcs, startConversation } = useGameStore()
  const isMounted = useRef(true)
  const interactionDistance = 5 // 互動距離（單位） - 增加到5單位

  // 使用與 NPC 相同的 Kenney Assets 載入邏輯
  const fullModelPath = `${modelPath}${modelFile}`
  console.log('📁 Loading Player model from:', fullModelPath)
  console.log('🎮 Player組件已渲染，位置:', position)

  // 使用useLoader載入GLB模型 - 與NPC相同的方式
  const kenneyModel = useLoader(GLTFLoader, fullModelPath, (loader) => {
    const basePath = fullModelPath.substring(0, fullModelPath.lastIndexOf('/') + 1)
    loader.setResourcePath(basePath)
    console.log(`📁 設定Player資源路徑: ${basePath}`)
  })

  // 克隆場景避免多個實例間的衝突
  const [playerScene, setPlayerScene] = useState<THREE.Group | null>(null)

  const [animationMixer, setAnimationMixer] = useState<THREE.AnimationMixer | null>(null)

  // 提供 ref 介面給父組件
  useImperativeHandle(ref, () => ({
    getPosition: () => {
      if (feetPivotRef.current) {
        return feetPivotRef.current.position.clone()
      }
      return new THREE.Vector3(...position)
    },
    getRef: () => feetPivotRef.current
  }), [])

  // 移動相關狀態
  const velocity = useRef(new THREE.Vector3())
  const direction = useRef(new THREE.Vector3())
  const cameraRotation = useRef(0)
  const keys = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    shift: false  // Shift鍵奔跑
  })

  // 玩家狀態
  const isMoving = useRef(false)
  const walkCycle = useRef(0)

  // KCC physics controller
  const kcc = useRef<KCC | null>(null)
  const FIXED_DT = 1/60
  const accumulator = useRef(0)

  // 處理模型載入完成 - 與 NPC 完全相同的邏輯
  useEffect(() => {
    if (kenneyModel?.scene && feetPivotRef.current) {
      console.log(`✅ Player ${fullModelPath} 模型載入成功:`, kenneyModel.scene)

      // 套用腳底對齊
      const { group: feetPivot, offsetY } = wrapWithFeetPivot(kenneyModel.scene)
      feetPivotRef.current.add(feetPivot)
      console.info('👣 Player feet-pivot offsetY =', offsetY.toFixed(3))

      kenneyModel.scene.traverse((child: any) => {
        if (child.isMesh || child.isSkinnedMesh) {
          child.visible = true
          child.frustumCulled = false
          child.castShadow = true
          child.receiveShadow = false

          if (child.material) {
            if (child.isSkinnedMesh) {
              child.material.skinning = true
            }

            if (child.material.map) {
              child.material.map.colorSpace = THREE.SRGBColorSpace
              child.material.map.needsUpdate = true
            }

            child.material.metalness = 0
            child.material.roughness = 0.8
            child.material.side = THREE.DoubleSide
            child.material.transparent = false
            child.material.opacity = 1
            child.material.depthWrite = true
            child.material.colorWrite = true
            child.material.needsUpdate = true
          }
        }
      })

      kenneyModel.scene.visible = true
      kenneyModel.scene.frustumCulled = false
    }
  }, [kenneyModel, fullModelPath])

  // 處理動畫 - 與 NPC 相同邏輯
  useEffect(() => {
    if (kenneyModel?.scene && kenneyModel.animations && kenneyModel.animations.length > 0) {
      const mixer = new THREE.AnimationMixer(kenneyModel.scene)
      setAnimationMixer(mixer)

      const idleAnimation = kenneyModel.animations.find((clip: THREE.AnimationClip) =>
        clip.name.toLowerCase().includes('idle') ||
        clip.name.toLowerCase().includes('stand')
      ) || kenneyModel.animations[0]

      if (idleAnimation) {
        const action = mixer.clipAction(idleAnimation)
        action.setLoop(THREE.LoopRepeat, Infinity)
        action.play()
      }

      return () => {
        mixer.stopAllAction()
        mixer.uncacheRoot(kenneyModel.scene)
      }
    }
  }, [kenneyModel])

  // Initialize KCC
  useEffect(() => {
    if (!kcc.current) {
      kcc.current = new KCC({
        radius: 0.35,
        height: 1.20,
        stepHeight: 0.35,
        maxSlopeDeg: 42,
        skin: 0.035,
        maxSnap: 0.6,
        gravity: 18,
      })
    }

    // Initial position
    if (feetPivotRef.current) {
      kcc.current.reset(feetPivotRef.current.position)
      console.log(`✅ [Player] KCC initialized at ${feetPivotRef.current.position.toArray().map(v => v.toFixed(2)).join(', ')}`)
    }
  }, [])

  // 檢查附近的 NPC
  const checkNearbyNPC = useCallback((): NPC | null => {
    if (!feetPivotRef.current) return null

    const playerPos = new THREE.Vector3()
    feetPivotRef.current.getWorldPosition(playerPos)

    // 尋找最近的 NPC
    let nearestNPC: NPC | null = null
    let nearestDistance = Infinity

    npcs.forEach((npc) => {
      const npcPos = new THREE.Vector3(npc.position[0], npc.position[1], npc.position[2])
      const distance = playerPos.distanceTo(npcPos)

      if (distance < interactionDistance && distance < nearestDistance) {
        nearestDistance = distance
        nearestNPC = npc
      }
    })

    return nearestNPC
  }, [npcs, interactionDistance])

  // F鍵互動處理
  const handleInteraction = useCallback(() => {
    const nearbyNPC: NPC | null = checkNearbyNPC()

    if (nearbyNPC) {
      console.log(`與 ${nearbyNPC.name} 開始對話 (距離: ${nearbyNPC.position})`)
      startConversation(nearbyNPC.id)
    } else {
      console.log('附近沒有可互動的 NPC')
    }
  }, [checkNearbyNPC, startConversation])

  // 鍵盤事件處理
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 防止方向鍵的默認滾動行為
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        event.preventDefault()
      }

      // Remove debug log
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
          keys.current.shift = true  // Shift鍵奔跑
          break
        case 'KeyF':
          // F鍵互動 - 檢查附近的NPC
          handleInteraction()
          break
        case 'KeyR':
          // R鍵重置人物位置到安全地點
          if (feetPivotRef.current && kcc.current) {
            const safePosition = new THREE.Vector3(0, 5, 0) // 安全的中心位置
            kcc.current.reset(safePosition)
            feetPivotRef.current.position.copy(safePosition)

            setPlayerPosition([safePosition.x, safePosition.y, safePosition.z])
            console.log(`按R鍵重置人物位置: [${safePosition.x.toFixed(2)}, ${safePosition.y.toFixed(2)}, ${safePosition.z.toFixed(2)}]`)
          }
          break
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      // Remove debug log
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
          keys.current.shift = false  // 釋放Shift鍵
          break
      }
    }

    // 確保事件監聽器正確綁定
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    // 點擊畫面來獲得焦點
    const handleClick = () => {
      console.log('🎯 畫面獲得焦點')
      window.focus()
    }
    document.addEventListener('click', handleClick)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      document.removeEventListener('click', handleClick)
    }
  }, [handleInteraction])  // 加入 handleInteraction 依賴

  // 每幀更新
  useFrame((_, delta) => {
    if (!feetPivotRef.current || !kcc.current) return

    // Fixed timestep accumulator
    accumulator.current += Math.min(delta, 0.05)

    while (accumulator.current >= FIXED_DT) {
      const dt = FIXED_DT

      // 重置方向向量
      direction.current.set(0, 0, 0)

      // PC遊戲：鍵盤輸入 (設定本地方向向量)
      if (keys.current.forward) direction.current.z = 1    // W鍵：本地前方
      if (keys.current.backward) direction.current.z = -1  // S鍵：本地後方
      if (keys.current.left) direction.current.x = -1      // A鍵：本地左方（修正方向）
      if (keys.current.right) direction.current.x = 1      // D鍵：本地右方（修正方向）

    // 調試：檢查按鍵狀態和方向向量 (throttled)
    const anyKeyPressed = keys.current.forward || keys.current.backward || keys.current.left || keys.current.right

    // 安全正規化方向向量
    if (direction.current.length() > 0) {
      const dir2D = new THREE.Vector2(direction.current.x, direction.current.z)
      safeNormalize2(dir2D)
      direction.current.x = dir2D.x
      direction.current.z = dir2D.y

      // 計算移動方向
      const moveDirection = new THREE.Vector3()

      // 檢查是否在 Pointer Lock 模式
      const isPointerLocked = !!document.pointerLockElement

      if (isPointerLocked) {
        // PC遊戲 Pointer Lock 模式 - 基於相機朝向移動
        // Three.js坐標系：Z軸負方向為forward，X軸正方向為right
        const forward = new THREE.Vector3(0, 0, -1)
        const right = new THREE.Vector3(1, 0, 0)    // 標準右向量

        // 根據相機旋轉調整方向向量
        forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.current)
        right.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.current)

        // 正確的方向映射
        moveDirection.addScaledVector(forward, direction.current.z)   // Z軸：前後移動
        moveDirection.addScaledVector(right, direction.current.x)     // X軸：左右移動
      } else {
        // 標準模式 - 世界坐標移動
        // 在 Three.js 中，Z 軸負方向是前進
        moveDirection.x = direction.current.x
        moveDirection.z = -direction.current.z
      }

      const moveDir2D = new THREE.Vector2(moveDirection.x, moveDirection.z)
      safeNormalize2(moveDir2D)
      moveDirection.x = moveDir2D.x
      moveDirection.z = moveDir2D.y

      // Use KCC for physics
      // 1) Get normalized input direction
      const inputDir = new THREE.Vector2(moveDirection.x, moveDirection.z);
      if (inputDir.lengthSq() > 0) inputDir.normalize();

      // 2) Calculate speed
      let speed = 5;  // Normal walking speed (m/s)
      if (keys.current.shift) speed = 10;  // Shift - running

      // 3) Calculate desired movement for this frame
      const desiredXZ = inputDir.multiplyScalar(speed * dt);

      // 4) Update KCC (handles collision, step-up, grounding)
      kcc.current.pos.copy(feetPivotRef.current.position);
      kcc.current.update(desiredXZ, dt);
      feetPivotRef.current.position.copy(kcc.current.pos);

      // 走路動畫
      isMoving.current = true
      walkCycle.current += dt * 10

      // PC遊戲：角色朝向邏輯
      if (moveDirection.length() > 0 && !isPointerLocked) {
        // 只在非 Pointer Lock 模式下，角色面向移動方向
        const targetRotation = Math.atan2(moveDirection.x, moveDirection.z)
        feetPivotRef.current.rotation.y = THREE.MathUtils.lerp(
          feetPivotRef.current.rotation.y,
          targetRotation,
          8 * dt
        )
      } else if (isPointerLocked) {
        // Pointer Lock 模式下，角色朝向跟隨移動方向
        if (moveDirection.length() > 0) {
          const targetRotation = Math.atan2(moveDirection.x, moveDirection.z)
          feetPivotRef.current.rotation.y = THREE.MathUtils.lerp(
            feetPivotRef.current.rotation.y,
            targetRotation,
            10 * dt
          )
          if (isMounted.current) {
            setPlayerRotation(targetRotation)
          }
        }
      }
    } else {
      isMoving.current = false
    }

      accumulator.current -= FIXED_DT
    }

    // Update animation mixer
    if (animationMixer) {
      animationMixer.update(delta)
    }

    // 走路動畫效果（簡單的上下擺動）
    if (isMoving.current && feetPivotRef.current && kcc.current) {
      const bobAmount = Math.sin(walkCycle.current) * 0.02
      // Don't modify position directly when using KCC
    }
  })

  // Component lifecycle management
  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  // 使用ref跟踪是否已經初始化，避免重複初始化
  const hasInitialized = useRef(false)

  // 初始化玩家位置 - 使用KCC
  useEffect(() => {
    if (feetPivotRef.current && !hasInitialized.current && isMounted.current && kcc.current) {
      hasInitialized.current = true
      console.log('開始初始化玩家位置...')

      // 使用更安全的初始化方式 - 延遲等待地形載入
      setTimeout(() => {
        if (!feetPivotRef.current || !kcc.current) return

        const initialPos = new THREE.Vector3(...position)
        kcc.current.reset(initialPos)
        feetPivotRef.current.position.copy(initialPos)

        console.log(`🎮 玩家初始化完成: [${initialPos.x.toFixed(2)}, ${initialPos.y.toFixed(2)}, ${initialPos.z.toFixed(2)}]`)
      }, 1500) // 等待1.5秒讓地形完全載入
    }
  }, []) // 不依賴任何props，只在組件掛載時執行一次

  return (
    <>
      <CameraController
        target={feetPivotRef}
        offset={new THREE.Vector3(0, 5, 8)}  // 更近的第三人稱視角
        lookAtOffset={new THREE.Vector3(0, 1.5, 0)}
        smoothness={8}  // 更平滑的相機移動
        enableRotation={true}  // PC模式：啟用旋轉
        enablePointerLock={true}  // 啟用永久 pointer lock
        onRotationChange={(rotation) => { cameraRotation.current = rotation }}
      />

      <group ref={feetPivotRef} position={position}>
        {/* Kenney GLB 角色模型已在 useEffect 中通過 wrapWithFeetPivot 添加 */}

        {/* 玩家自然陰影 - 更大更柔和 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
          <circleGeometry args={[1.2, 32]} />
          <meshBasicMaterial
            color="#000000"
            transparent
            opacity={0.25}
            depthWrite={false}
          />
        </mesh>

        {/* 內層深色陰影 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
          <circleGeometry args={[0.6, 24]} />
          <meshBasicMaterial
            color="#000000"
            transparent
            opacity={0.35}
            depthWrite={false}
          />
        </mesh>
      </group>
    </>
  )
}

export const Player = forwardRef(PlayerComponent)