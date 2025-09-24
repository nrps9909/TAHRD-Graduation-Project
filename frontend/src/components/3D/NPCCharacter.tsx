import React, { useRef, useEffect, useState, useCallback } from 'react'
import { useFrame, useThree, useLoader } from '@react-three/fiber'
import { Text, Billboard } from '@react-three/drei'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as THREE from 'three'
import { useGameStore } from '@/stores/gameStore'
import { collisionSystem } from '@/utils/collision'
import { waitForGroundReady, getGroundSmoothed } from '@/game/ground'
import { mountModelAndLiftFeet } from '@/game/foot'
import { tickActorOnGround } from '@/game/actorMove'
import BlobShadow from '@/components/3D/effects/BlobShadow'

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
  const groupRef = useRef<THREE.Group>(null!)  // 角色根：負責貼地（y=地高）
  const modelRef = useRef<THREE.Group>(null!)  // 模型容器：負責抬腳
  const feetPivotRef = useRef<THREE.Group>(null!)
  const meshRef = useRef<THREE.Group>(null!) // 保留為相容性
  const { scene } = useThree()
  const [hovered, setHovered] = useState(false)
  // 初始位置不設定 y，完全依賴地面檢測
  const [currentPosition, setCurrentPosition] = useState(new THREE.Vector3(npc.position[0], 5, npc.position[2]))
  const [targetPosition, setTargetPosition] = useState(new THREE.Vector3(npc.position[0], 5, npc.position[2]))

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

  // Debug logging helper
  let __t0 = performance.now();
  const logFew = (...a:any[]) => { if (performance.now() - __t0 < 2000) console.log(`[NPC-${npc.name}]`, ...a); };

  // 處理模型載入完成 - 統一管線
  useEffect(() => {
    (async () => {
      console.log(`[NPC ${npc.name}] Model loading effect, kenneyModel:`, !!kenneyModel?.scene);

      if (!kenneyModel?.scene) {
        console.warn(`[NPC ${npc.name}] No kenney model scene`);
        return;
      }

      await waitForGroundReady() // 先等地形ready

      if (kenneyModel?.scene && modelRef.current && groupRef.current) {
        console.log(`[NPC ${npc.name}] Starting model mount...`);
        // 先將模型掛載
        mountModelAndLiftFeet(modelRef.current, kenneyModel.scene);

        // 忽略任何來源的 y；強制使用地面高度
        const p = groupRef.current.position;
        // 使用 NPC 的初始位置 x, z
        const gx = npc.position[0];
        const gz = npc.position[2];

        // 獲取地面高度
        const g = getGroundSmoothed(gx, gz);
        if (g.ok) {
          p.set(gx, g.y, gz);
          lastSafe.current.set(gx, g.y, gz);
          currentPosition.set(gx, g.y, gz);
          setCurrentPosition(new THREE.Vector3(gx, g.y, gz));
          console.log(`[SPAWN] NPC ${npc.name} snapped to ground y=`, g.y.toFixed(2), 'at', gx.toFixed(1), gz.toFixed(1));
          // 確保 targetPosition 也在地面上
          targetPosition.set(gx, g.y, gz);
          setTargetPosition(new THREE.Vector3(gx, g.y, gz));
        } else {
          // 如果找不到地面，使用安全預設值
          p.set(gx, 5, gz);
          lastSafe.current.set(gx, 5, gz);
          currentPosition.set(gx, 5, gz);
          setCurrentPosition(new THREE.Vector3(gx, 5, gz));
          console.warn(`[SPAWN] NPC ${npc.name} fallback position at y=5`);
          // 確保 targetPosition 也使用安全值
          targetPosition.set(gx, 5, gz);
          setTargetPosition(new THREE.Vector3(gx, 5, gz));
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
        console.log(`[NPC ${npc.name}] Model loaded successfully:`, kenneyModel.scene)
      }
    })()
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


  // Set new random target
  const setNewTarget = useCallback(() => {
    const playerPos = getPlayerPosition()
    const angle = Math.random() * Math.PI * 2
    const distance = 3 + Math.random() * 5
    const baseX = playerPos ? playerPos.x : groupRef.current?.position.x || currentPosition.x
    const baseZ = playerPos ? playerPos.z : groupRef.current?.position.z || currentPosition.z

    // 計算新目標位置的 x, z
    const targetX = baseX + Math.cos(angle) * distance
    const targetZ = baseZ + Math.sin(angle) * distance

    // 獲取該位置的地面高度
    const ground = getGroundSmoothed(targetX, targetZ)
    const targetY = ground.ok ? ground.y : currentPosition.y

    const newTarget = new THREE.Vector3(targetX, targetY, targetZ)

    setTargetPosition(newTarget)
    console.log(`[NPC ${npc.name}] New target: (${newTarget.x.toFixed(1)}, ${newTarget.y.toFixed(1)}, ${newTarget.z.toFixed(1)})`)
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

  // Main frame update loop - 使用統一管線
  useFrame((state, dtRaw) => {
    const dt = Math.min(0.05, Math.max(0.0001, dtRaw))
    const g = groupRef.current
    if (!g) return

    // 強制同步當前位置（避免狀態不同步導致飄在天上）
    currentPosition.copy(g.position)

    // AI 方向計算
    const distance = g.position.distanceTo(targetPosition)
    let dir = new THREE.Vector3()

    if (distance > 0.3) {
      dir.subVectors(targetPosition, g.position)
      dir.y = 0  // 確保方向是水平的
      if (dir.lengthSq() > 0.001) {
        dir.normalize()
      }

      // Occasionally set new target when moving
      if (Math.random() < 0.001) setNewTarget()
    } else {
      // Near target - set new target
      if (Math.random() < 0.01) setNewTarget()
    }

    const npcSpeed = 4.0  // 大幅增加NPC移動速度到 4.0

    // 使用統一的 actor 移動管線 - 這會強制貼地
    tickActorOnGround(g, {dir, speed: npcSpeed}, dt, lastSafe.current)

    // 更新狀態（同步位置）
    currentPosition.copy(g.position)
    setCurrentPosition(currentPosition.clone())

    // Apply hover effects (after ground positioning)
    if (hovered) {
      g.position.y += Math.sin(state.clock.elapsedTime * 3) * 0.1
    }

    // Update store position occasionally
    if (Math.random() < 0.02) {
      updateNpcPosition(npc.id, [currentPosition.x, currentPosition.y, currentPosition.z])
    }

    // Update animation mixer
    if (animationMixer) {
      animationMixer.update(dtRaw)
    }

    // Apply hover effects
    if (hovered) {
      g.position.y += Math.sin(state.clock.elapsedTime * 3) * 0.1
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


  return (
    <>
      <group
        ref={groupRef}
        position={[npc.position[0], 0, npc.position[2]]}  /* 初始 y=0，會在 useEffect 中被地面高度覆蓋 */
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <group ref={modelRef} scale={[2.0, 2.0, 2.0]} /> {/* GLB 掛在這，已抬腳 - 增大到2倍 */}

        {/* NPC 名字標籤 - 浮在角色上方，始終面向相機 */}
        <Billboard position={[0, 3, 0]} follow={true} lockX={false} lockY={false} lockZ={false}>
          {/* 背景 */}
          <mesh>
            <planeGeometry args={[npc.name.length * 0.4 + 0.8, 0.8]} />
            <meshBasicMaterial
              color="#000000"
              transparent
              opacity={0.6}
            />
          </mesh>
          {/* NPC 名字文字 */}
          <Text
            position={[0, 0, 0.01]}
            fontSize={0.4}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            {npc.name}
          </Text>
        </Billboard>

      </group>

      {/* 圓形柔邊 blob-shadow - 放在 group 後面（不當子節點，因為 BlobShadow 自己會加到 scene） */}
      {groupRef.current && (
        <BlobShadow target={groupRef.current} radius={0.85} maxOpacity={0.45} />
      )}
    </>
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