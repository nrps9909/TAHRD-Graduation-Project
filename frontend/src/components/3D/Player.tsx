import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as THREE from 'three'
import { useGameStore } from '@/stores/gameStore'
import { collisionSystem } from '@/utils/collision'
import { CameraController } from './CameraController'
import { waitForGroundReady, getGroundSmoothed } from '@/game/ground'
import { mountModelAndLiftFeet } from '@/game/foot'
import { tickActorOnGround } from '@/game/actorMove'
import BlobShadow from '@/components/3D/effects/BlobShadow'

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
  const groupRef = useRef<THREE.Group>(null!)  // 角色根：負責貼地（y=地高）
  const modelRef = useRef<THREE.Group>(null!)  // 模型容器：負責抬腳
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
      if (groupRef.current) {
        return groupRef.current.position.clone()
      }
      return new THREE.Vector3(...position)
    },
    getRef: () => groupRef.current
  }), [])

  const { camera } = useThree()
  const vel = useRef(new THREE.Vector3())
  const lastSafe = useRef(new THREE.Vector3())
  const keys = useRef({up:false,down:false,left:false,right:false,w:false,a:false,s:false,d:false,shift:false})

  // Movement constants - 大幅增加移動速度
  const UP = new THREE.Vector3(0, 1, 0)
  const BASE = 6.0  // 大幅增加基础速度到 6.0
  const SPRINT = 10.0  // 大幅增加衝刺速度到 10.0
  const ACC = 25  // 增加加速度
  const FRI = 15  // 增加摩擦力

  // Velocity and safety tracking
  const isMoving = useRef(false)
  const walkCycle = useRef(0)

  // Debug logging helper
  let __t0 = performance.now();
  const logFew = (...a:any[]) => { if (performance.now() - __t0 < 2000) console.log(...a); };

  // 處理模型載入完成 - 統一管線
  useEffect(() => {
    (async () => {
      console.log('[Player] Model loading effect, kenneyModel:', !!kenneyModel?.scene);

      if (!kenneyModel?.scene) {
        console.warn('[Player] No kenney model scene');
        return;
      }

      await waitForGroundReady() // 先等地形ready

      if (kenneyModel?.scene && modelRef.current && groupRef.current) {
        console.log('[Player] Starting model mount...');
        // 先將模型掛載
        mountModelAndLiftFeet(modelRef.current, kenneyModel.scene);

        // 忽略任何來源的 y；強制使用地面高度
        const p = groupRef.current.position;
        // 使用初始位置的 x, z
        const gx = position[0];
        const gz = position[2];

        // 獲取地面高度
        const g = getGroundSmoothed(gx, gz);
        if (g.ok) {
          p.set(gx, g.y, gz);
          lastSafe.current.set(gx, g.y, gz);
          console.log('[SPAWN] player snapped to ground y=', g.y.toFixed(2), 'at', gx.toFixed(1), gz.toFixed(1));
        } else {
          // 如果找不到地面，使用安全預設值
          p.set(gx, 5, gz);
          lastSafe.current.set(gx, 5, gz);
          console.warn('[SPAWN] player fallback position at y=5');
        }

      kenneyModel.scene.traverse((child: any) => {
        if (child.isMesh || child.isSkinnedMesh) {
          child.visible = true
          child.frustumCulled = false
          child.castShadow = true
          child.receiveShadow = false

          if (child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material]
            materials.forEach((mat: any) => {
              if (child.isSkinnedMesh) {
                mat.skinning = true
              }

              if (mat.map) {
                mat.map.colorSpace = THREE.SRGBColorSpace
                mat.map.needsUpdate = true
                mat.map.flipY = false
              }

              // 保留原本材質的顏色和紋理
              if (!mat.color) mat.color = new THREE.Color(0xffffff)
              mat.metalness = 0.1
              mat.roughness = 0.7
              mat.transparent = false
              mat.opacity = 1
              mat.depthWrite = true
              mat.needsUpdate = true
            })
          }
        }
      })

        kenneyModel.scene.visible = true
        kenneyModel.scene.frustumCulled = false
        console.log('[Player] Model loaded successfully:', kenneyModel.scene)
      }
    })()
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


  // 檢查附近的 NPC
  const checkNearbyNPC = useCallback((): NPC | null => {
    if (!groupRef.current) return null

    const playerPos = new THREE.Vector3()
    groupRef.current.getWorldPosition(playerPos)

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

      // Debug: 顯示按鍵輸入
      if (['w','a','s','d','W','A','S','D','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(k)) {
        console.log('[INPUT]', k, v ? 'DOWN' : 'UP')
      }

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

  // 每幀更新 - 使用統一管線
  useFrame((_, dtRaw) => {
    const dt = Math.min(0.05, Math.max(0.0001, dtRaw))
    const g = groupRef.current
    if (!g) return

    // 取玩家輸入方向
    const fwd = new THREE.Vector3()
    camera.getWorldDirection(fwd)
    fwd.y = 0
    fwd.normalize()
    const right = new THREE.Vector3().crossVectors(fwd, UP).normalize()

    const k = keys.current
    const forw = (k.up || k.w ? 1 : 0) + (k.down || k.s ? -1 : 0)
    const r = (k.right || k.d ? 1 : 0) + (k.left || k.a ? -1 : 0)
    let dir = new THREE.Vector3()
    if (forw || r) {
      dir.addScaledVector(fwd, forw).addScaledVector(right, r)
      if (dir.lengthSq() > 0) dir.normalize()
    }

    // Debug: 每幾幀印一次移動狀態
    if (Math.random() < 0.01 && (forw || r)) {
      console.log('[Player] Keys:', {w:k.w, a:k.a, s:k.s, d:k.d}, 'forw:', forw, 'r:', r, 'dir:', dir.toArray())
    }

    const speed = k.shift ? SPRINT : BASE

    // 使用統一的 actor 移動管線
    tickActorOnGround(g, {dir, speed}, dt, lastSafe.current)

    const moveSpeed = Math.hypot(dir.x, dir.z) * speed
    if (moveSpeed > 0.05) {
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
        target={groupRef}
        offset={new THREE.Vector3(0, 5, 8)}  // 更近的第三人稱視角
        lookAtOffset={new THREE.Vector3(0, 1.5, 0)}
        smoothness={8}  // 更平滑的相機移動
        enableRotation={true}  // PC模式：啟用旋轉
        enablePointerLock={true}  // 啟用永久 pointer lock
      />

      <group ref={groupRef} position={position}>
        <group ref={modelRef} scale={[2.0, 2.0, 2.0]} /> {/* GLB 掛在這，已抬腳 - 增大到2倍 */}
      </group>

      {/* 圓形柔邊 blob-shadow - 放在 group 後面（不當子節點，因為 BlobShadow 自己會加到 scene） */}
      {groupRef.current && (
        <BlobShadow target={groupRef.current} radius={0.9} maxOpacity={0.5} />
      )}
    </>
  )
}


export const Player = forwardRef(PlayerComponent)