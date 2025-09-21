import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as THREE from 'three'
import { useGameStore } from '@/stores/gameStore'
import { collisionSystem } from '@/utils/collision'
import { CameraController } from './CameraController'
import { wrapWithFeetPivot } from '@/game/utils/fixPivotAtFeet'
import { snapSpawnToGround, hardStickToGround } from '@/game/snap'
import { isGroundReady } from '@/game/ground'
import { crowd, separation } from '@/game/crowd'

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

  const { camera } = useThree()
  const vel = useRef(new THREE.Vector3())
  const lastSafe = useRef(new THREE.Vector3())
  const keys = useRef({up:false,down:false,left:false,right:false,w:false,a:false,s:false,d:false,shift:false})

  // Movement constants
  const UP = new THREE.Vector3(0, 1, 0)
  const BASE = 3.8
  const SPRINT = 5.8
  const ACC = 18
  const FRI = 11

  // Velocity and safety tracking
  const isMoving = useRef(false)
  const walkCycle = useRef(0)

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

  // 等地形 ready → 出生貼地
  useEffect(() => {
    const init = () => {
      if (!isGroundReady()) {
        requestAnimationFrame(init)
        return
      }
      const g = feetPivotRef.current
      if (!g) return
      snapSpawnToGround(g.position)
      lastSafe.current.copy(g.position)
    }
    init()
    // 進入 crowd（避免與 NPC 相撞）
    crowd.add({
      id: 'player',
      getPos: () => ({
        x: feetPivotRef.current?.position.x || 0,
        z: feetPivotRef.current?.position.z || 0
      })
    })
    return () => crowd.remove('player')
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
    const on = (e: KeyboardEvent, v: boolean) => {
      const k = e.key
      if (k.startsWith('Arrow')) e.preventDefault()
      if (k === 'w' || k === 'W') keys.current.w = v
      if (k === 'a' || k === 'A') keys.current.a = v
      if (k === 's' || k === 'S') keys.current.s = v
      if (k === 'd' || k === 'D') keys.current.d = v
      if (k === 'ArrowUp') keys.current.up = v
      if (k === 'ArrowDown') keys.current.down = v
      if (k === 'ArrowLeft') keys.current.left = v
      if (k === 'ArrowRight') keys.current.right = v
      if (k === 'Shift') keys.current.shift = v
      if (k === 'F' || k === 'f') {
        if (v) handleInteraction() // Only on keydown
      }
    }
    const kd = (e: KeyboardEvent) => on(e, true)
    const ku = (e: KeyboardEvent) => on(e, false)
    addEventListener('keydown', kd, { passive: false })
    addEventListener('keyup', ku, { passive: false })
    return () => {
      removeEventListener('keydown', kd)
      removeEventListener('keyup', ku)
    }
  }, [handleInteraction])

  // 每幀更新
  useFrame((_, dtRaw) => {
    const dt = Math.min(0.05, Math.max(0.0001, dtRaw))
    const g = feetPivotRef.current
    if (!g) return

    // 相機基底：right = UP × forward
    const fwd = new THREE.Vector3()
    camera.getWorldDirection(fwd)
    fwd.y = 0
    fwd.normalize()
    const right = new THREE.Vector3().crossVectors(UP, fwd).normalize()

    const k = keys.current
    const forw = (k.up || k.w ? 1 : 0) + (k.down || k.s ? -1 : 0)
    const r = (k.right || k.d ? 1 : 0) + (k.left || k.a ? -1 : 0)
    const dir = new THREE.Vector3()
    if (forw || r) dir.addScaledVector(fwd, forw).addScaledVector(right, r).normalize()

    // 群體分離（避免撞到 NPC/玩家）
    const sep = separation('player', g.position.x, g.position.z)
    dir.add(new THREE.Vector3(sep.fx, 0, sep.fz))
    if (dir.length() > 0) dir.normalize()

    const spd = k.shift ? SPRINT : BASE
    const des = dir.multiplyScalar(spd)

    vel.current.x += (des.x - vel.current.x) * Math.min(1, ACC * dt)
    vel.current.z += (des.z - vel.current.z) * Math.min(1, ACC * dt)
    if (!(forw || r)) {
      vel.current.x *= Math.max(0, 1 - FRI * dt)
      vel.current.z *= Math.max(0, 1 - FRI * dt)
    }

    g.position.x += vel.current.x * dt
    g.position.z += vel.current.z * dt

    const speed = Math.hypot(vel.current.x, vel.current.z)
    if (speed > 0.05) {
      g.quaternion.setFromEuler(new THREE.Euler(0, Math.atan2(vel.current.x, vel.current.z), 0, 'YXZ'))
      isMoving.current = true
      walkCycle.current += dt * 10
    } else {
      isMoving.current = false
    }

    // Update player position to store
    if (isMounted.current) {
      setPlayerPosition([g.position.x, g.position.y, g.position.z])
      setPlayerRotation([g.rotation.x, g.rotation.y, g.rotation.z])
    }

    // Update animation mixer
    if (animationMixer) {
      animationMixer.update(dtRaw)
    }

    // ☆☆☆ 保證貼地（一定放最後）
    hardStickToGround(g.position, lastSafe.current, dt)
  })

  // Component lifecycle management
  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  // 使用ref跟踪是否已經初始化，避免重複初始化
  const hasInitialized = useRef(false)

  // Secondary fallback initialization (disabled to avoid conflicts)
  useEffect(() => {
    // Commented out to avoid conflicts with the primary initialization above
    /*
    if (feetPivotRef.current && !hasInitialized.current && isMounted.current) {
      hasInitialized.current = true
      console.log('開始初始化玩家位置...')

      // 使用更安全的初始化方式 - 延遲等待地形載入
      setTimeout(() => {
        if (!feetPivotRef.current) return

        const initialPos = new THREE.Vector3(...position)
        snapSpawnToGround(initialPos)
        feetPivotRef.current.position.copy(initialPos)
        lastSafe.current.copy(initialPos)

        console.log(`🎮 玩家初始化完成: [${initialPos.x.toFixed(2)}, ${initialPos.y.toFixed(2)}, ${initialPos.z.toFixed(2)}]`)
      }, 1500) // 等待1.5秒讓地形完全載入
    }
    */
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