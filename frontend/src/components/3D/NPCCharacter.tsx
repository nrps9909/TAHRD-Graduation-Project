import React, { useRef, useEffect, useState, useCallback } from 'react'
import { useFrame, useThree, useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as THREE from 'three'
import { useGameStore } from '@/stores/gameStore'
import { safeNormalize2, isFiniteVec3 } from '@/game/utils/mathSafe'
import { collisionSystem } from '@/utils/collision'
import { wrapWithFeetPivot } from '@/game/utils/fixPivotAtFeet'
import NameplateOverlay from '@/game/ui/NameplateOverlay'
import { KCC } from '@/game/physics/kcc'

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

  // KCC physics controller
  const kcc = useRef<KCC | null>(null)
  const FIXED_DT = 1/60
  const accumulator = useRef(0)
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
    const initialPos = new THREE.Vector3(...npc.position)
    kcc.current.reset(initialPos)
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
  useFrame((state, delta) => {
    if (!feetPivotRef.current || !kcc.current) return

    // Fixed timestep accumulator
    accumulator.current += Math.min(delta, 0.05)

    while (accumulator.current >= FIXED_DT) {
      const dt = FIXED_DT

      const distance = currentPosition.distanceTo(targetPosition)
      const moveSpeed = 3.0 // Slower speed for smoother movement

      if (distance > 0.3) {
        // Moving towards target
        const direction = new THREE.Vector3()
          .subVectors(targetPosition, currentPosition)
        direction.y = 0 // Keep horizontal
        direction.normalize()

        // Use KCC for physics
        // 1) Get normalized direction
        const inputDir = new THREE.Vector2(direction.x, direction.z);
        if (inputDir.lengthSq() > 0) inputDir.normalize();

        // 2) Calculate desired movement for this frame
        const desiredXZ = inputDir.multiplyScalar(moveSpeed * dt);

        // 3) Update KCC (handles collision, step-up, grounding)
        kcc.current.pos.copy(feetPivotRef.current.position);
        kcc.current.update(desiredXZ, dt);
        feetPivotRef.current.position.copy(kcc.current.pos);

        // Sync currentPosition with feetPivot position
        currentPosition.copy(feetPivotRef.current.position)

        // Smooth rotation towards movement direction
        if (distance > 0.1 && !hovered) {
          const targetRotation = Math.atan2(direction.x, direction.z)
          const currentRotation = feetPivotRef.current.rotation.y
          let rotationDiff = targetRotation - currentRotation

          if (rotationDiff > Math.PI) rotationDiff -= 2 * Math.PI
          if (rotationDiff < -Math.PI) rotationDiff += 2 * Math.PI

          feetPivotRef.current.rotation.y += rotationDiff * 0.1 // Smoother rotation
        }

        lastMoveTime.current = Date.now()
      } else {
        // Near target - just maintain ground position using KCC gravity
        kcc.current.pos.copy(feetPivotRef.current.position);
        kcc.current.update(new THREE.Vector2(0, 0), dt);
        feetPivotRef.current.position.copy(kcc.current.pos);
        currentPosition.copy(feetPivotRef.current.position)

        // Occasionally set new target when idle
        if (Date.now() - lastMoveTime.current > 3000 && Math.random() < 0.01) {
          setNewTarget()
        } else if (Math.random() < 0.005) {
          // When at target, occasionally pick new target
          setNewTarget()
        }
      }

      accumulator.current -= FIXED_DT
    }

    // Apply position to mesh
    if (isFiniteVec3(currentPosition) && feetPivotRef.current) {
      setCurrentPosition(currentPosition.clone())

      // Update store position occasionally
      if (Math.random() < 0.02) {
        updateNpcPosition(npc.id, [currentPosition.x, currentPosition.y, currentPosition.z])
      }
    }

    // Update animation mixer
    if (animationMixer) {
      animationMixer.update(delta)
    }

    // Apply hover effects
    if (hovered && feetPivotRef.current) {
      feetPivotRef.current.position.y = currentPosition.y + Math.sin(state.clock.elapsedTime * 3) * 0.1
    }
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
    if (feetPivotRef.current && !hasInitialized.current && kcc.current) {
      hasInitialized.current = true

      // 延遲初始化以等待地形載入
      setTimeout(() => {
        if (!feetPivotRef.current || !kcc.current) return

        const initialPos = new THREE.Vector3(...npc.position)
        kcc.current.reset(initialPos)
        feetPivotRef.current.position.copy(initialPos)

        console.log(`🎮 NPC ${npc.name} 初始化完成: [${initialPos.x.toFixed(2)}, ${initialPos.y.toFixed(2)}, ${initialPos.z.toFixed(2)}]`)
        console.log(`✅ NPCCharacter: ${npc.name} is ready and visible`)
      }, 1500)
    }
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