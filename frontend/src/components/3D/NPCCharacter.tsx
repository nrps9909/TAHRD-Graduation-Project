import React, { useRef, useEffect, useState, useCallback } from 'react'
import { useFrame, useThree, useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as THREE from 'three'
import { useGameStore } from '@/stores/gameStore'
import { safeNormalize2, isFiniteVec3 } from '@/game/utils/mathSafe'
import { collisionSystem } from '@/utils/collision'
import { wrapWithFeetPivot } from '@/game/utils/fixPivotAtFeet'
import NameplateOverlay from '@/game/ui/NameplateOverlay'
import { snapSpawnToGround, hardStickToGround } from '@/game/snap'
import { crowd, separation } from '@/game/crowd'

interface NPCCharacterProps {
  npc: {
    id: string
    name: string
    position: [number, number, number]
    color: string
    modelPath?: string
    modelFile?: string
  }
  onInteract?: (npc: any) => void
  selectedNpc?: string | null
}

export const NPCCharacter: React.FC<NPCCharacterProps> = ({
  npc,
  onInteract = () => {},
  selectedNpc = null
}) => {
  const feetPivotRef = useRef<THREE.Group>(null!)
  const meshRef = useRef<THREE.Group>(null!) // 保留為相容性
  const { scene } = useThree()
  const [hovered, setHovered] = useState(false)
  const [currentPosition, setCurrentPosition] = useState(new THREE.Vector3(...npc.position))
  const [targetPosition, setTargetPosition] = useState(new THREE.Vector3(...npc.position))

  const { updateNpcPosition, getPlayerPosition } = useGameStore()

  // 載入 3D 模型 - 根據 NPC ID 選擇不同的模型
  const modelConfigs = {
    'npc-1': { path: '/characters/CHAR-M-B', file: '/CHAR-M-B.glb' },
    'npc-2': { path: '/characters/CHAR-F-C', file: '/CHAR-F-C.glb' },
    'npc-3': { path: '/characters/CHAR-M-D', file: '/CHAR-M-D.glb' }
  }

  console.log(`🎮 NPCCharacter: Rendering ${npc.name} (${npc.id}) at position:`, npc.position)

  const config = modelConfigs[npc.id as keyof typeof modelConfigs] ||
                  { path: npc.modelPath || '/characters/CHAR-M-A', file: npc.modelFile || '/CHAR-M-A.glb' }

  const fullModelPath = `${config.path}${config.file}`
  const kenneyModel = useLoader(GLTFLoader, fullModelPath, (loader) => {
    const basePath = fullModelPath.substring(0, fullModelPath.lastIndexOf('/') + 1)
    loader.setResourcePath(basePath)
  })

  const [animationMixer, setAnimationMixer] = useState<THREE.AnimationMixer | null>(null)

  // Movement physics
  const vel = useRef(new THREE.Vector3())
  const lastSafe = useRef(new THREE.Vector3())
  const lastMoveTime = useRef(Date.now())
  const hasInitialized = useRef(false)

  // 處理模型載入完成
  useEffect(() => {
    if (kenneyModel?.scene && feetPivotRef.current) {
      // 套用腳底對齊
      const { group: feetPivot, offsetY } = wrapWithFeetPivot(kenneyModel.scene)
      feetPivotRef.current.add(feetPivot)
      console.info(`👣 NPC(${npc.name}) feet-pivot offsetY =`, offsetY.toFixed(3))
      console.log(`✅ NPCCharacter: ${npc.name} model loaded and scaled 2x`)

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
  }, [kenneyModel])

  // 處理動畫
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

  // Initialize ground position
  useEffect(() => {
    // Initial position
    const initialPos = new THREE.Vector3(...npc.position)
    snapSpawnToGround(initialPos)
    lastSafe.current.copy(initialPos)
    // Position is set in the other useEffect below
    if (feetPivotRef.current) {
      feetPivotRef.current.position.copy(initialPos)
    }
    console.log(`✅ [NPC ${npc.name}] KCC initialized at ${initialPos.toArray().map(v => v.toFixed(2)).join(', ')}`)
  }, [npc.name, npc.position])

  // Set new random target
  const setNewTarget = useCallback(() => {
    const playerPos = getPlayerPosition()
    const angle = Math.random() * Math.PI * 2
    const distance = 3 + Math.random() * 5
    const baseX = playerPos ? playerPos.x : currentPosition.x
    const baseZ = playerPos ? playerPos.z : currentPosition.z

    const newTarget = new THREE.Vector3(
      baseX + Math.cos(angle) * distance,
      currentPosition.y,
      baseZ + Math.sin(angle) * distance
    )

    setTargetPosition(newTarget)
    console.log(`[NPC ${npc.name}] New target: (${newTarget.x.toFixed(1)}, ${newTarget.z.toFixed(1)})`)
  }, [getPlayerPosition, npc.name, currentPosition])

  // Set new target periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() < 0.3) { // 30% chance every interval
        setNewTarget()
      }
    }, 5000 + Math.random() * 5000) // 5-10 seconds

    // Set initial target
    setTimeout(() => setNewTarget(), 1000)

    return () => clearInterval(interval)
  }, [setNewTarget])

  // Main frame update loop
  useFrame((state, dtRaw) => {
    const dt = Math.min(0.05, Math.max(0.0001, dtRaw))
    const g = feetPivotRef.current
    if (!g) return

    // 你的 AI 方向（例：往路點）
    const distance = currentPosition.distanceTo(targetPosition)
    const desired = new THREE.Vector3()

    if (distance > 0.3) {
      desired.subVectors(targetPosition, currentPosition)
      desired.y = 0
      desired.normalize()

      // Occasionally set new target when moving
      if (Math.random() < 0.001) setNewTarget()
    } else {
      // Near target - set new target
      if (Math.random() < 0.01) setNewTarget()
    }

    // 分離力（避免 NPC 互黏、也避免撞到玩家）
    const sep = separation(npc.id, g.position.x, g.position.z, 1.2, 6)
    desired.add(new THREE.Vector3(sep.fx, 0, sep.fz))
    if (desired.length() > 0) desired.normalize()

    // 加速 + 上限
    const MAX = 2.2
    const ACC = 10
    vel.current.x += desired.x * ACC * dt
    vel.current.z += desired.z * ACC * dt
    const s = Math.hypot(vel.current.x, vel.current.z)
    if (s > MAX) {
      vel.current.x = (vel.current.x / s) * MAX
      vel.current.z = (vel.current.z / s) * MAX
    }

    g.position.x += vel.current.x * dt
    g.position.z += vel.current.z * dt

    // 讓朝向與速度一致（可保留你的動畫/朝向邏輯）
    if (s > 0.05 && !hovered) {
      g.quaternion.setFromEuler(new THREE.Euler(0, Math.atan2(vel.current.x, vel.current.z), 0, 'YXZ'))
    }

    // Sync currentPosition
    currentPosition.copy(g.position)
    if (isFiniteVec3(currentPosition)) {
      setCurrentPosition(currentPosition.clone())

      // Update store position occasionally
      if (Math.random() < 0.02) {
        updateNpcPosition(npc.id, [currentPosition.x, currentPosition.y, currentPosition.z])
      }
    }

    // Update animation mixer
    if (animationMixer) {
      animationMixer.update(dtRaw)
    }

    // Apply hover effects
    if (hovered) {
      g.position.y = currentPosition.y + Math.sin(state.clock.elapsedTime * 3) * 0.1
    }

    // ☆☆☆ 保證貼地（一定放最後）
    hardStickToGround(g.position, lastSafe.current, dt)
  })

  const handleClick = (event: any) => {
    event.stopPropagation()
    onInteract(npc)
  }

  const handlePointerOver = (event: any) => {
    event.stopPropagation()
    setHovered(true)
    document.body.style.cursor = 'pointer'
  }

  const handlePointerOut = () => {
    setHovered(false)
    document.body.style.cursor = 'auto'
  }

  // 初始化 NPC 位置
  useEffect(() => {
    const g = feetPivotRef.current
    if (!g) return
    snapSpawnToGround(g.position)
    lastSafe.current.copy(g.position)
    const id = npc.id
    crowd.add({
      id,
      getPos: () => ({ x: g.position.x, z: g.position.z })
    })
    return () => crowd.remove(id)
  }, [])

  return (
    <group
      ref={feetPivotRef}
      position={currentPosition.toArray()}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* Kenney GLB 模型已在 useEffect 中通過 wrapWithFeetPivot 添加 */}
      {/* 名稱標籤 - 直接顯示在角色上方 */}
      <NameplateOverlay targetRef={feetPivotRef} label={npc.name} extraOffset={0.5} minHeight={2.0} />

      {/* NPC 自然陰影 - 更大更柔和 */}
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
  )
}

// Tree collision detection helper function
function resolveTreeCollisions(position: THREE.Vector3, previousPosition: THREE.Vector3, treeColliders: any[]) {
  for (const collider of treeColliders) {
    const distance = Math.sqrt(
      Math.pow(position.x - collider.position.x, 2) +
      Math.pow(position.z - collider.position.z, 2)
    )

    if (distance < collider.radius) {
      // Push NPC away from tree
      const pushDirection = new THREE.Vector3(
        position.x - collider.position.x,
        0,
        position.z - collider.position.z
      )

      if (pushDirection.length() > 0) {
        pushDirection.normalize()
        position.x = collider.position.x + pushDirection.x * collider.radius
        position.z = collider.position.z + pushDirection.z * collider.radius
      } else {
        // If exactly at tree center, use previous position
        position.x = previousPosition.x
        position.z = previousPosition.z
      }
    }
  }
}