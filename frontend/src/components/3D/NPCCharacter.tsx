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

  // 方向平滑化
  const lastDirection = useRef(new THREE.Vector3())
  const targetChangeTime = useRef(Date.now())

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


  // Set new random target with improved variety
  const setNewTarget = useCallback(() => {
    const playerPos = getPlayerPosition()
    const currentPos = groupRef.current?.position || currentPosition

    // 30%機率圍繞玩家移動，70%機率獨立探索
    const shouldFollowPlayer = Math.random() < 0.3 && playerPos

    let targetX, targetZ

    if (shouldFollowPlayer) {
      // 圍繞玩家移動，但距離更遠
      const angle = Math.random() * Math.PI * 2
      const distance = 5 + Math.random() * 8  // 5-13公尺距離
      targetX = playerPos.x + Math.cos(angle) * distance
      targetZ = playerPos.z + Math.sin(angle) * distance
    } else {
      // 獨立探索 - 從當前位置往隨機方向移動
      const angle = Math.random() * Math.PI * 2
      const distance = 4 + Math.random() * 10  // 4-14公尺距離
      targetX = currentPos.x + Math.cos(angle) * distance
      targetZ = currentPos.z + Math.sin(angle) * distance

      // 為每個NPC設置不同的偏好區域
      const npcPreferences = {
        'npc-1': { centerX: 10, centerZ: -5, radius: 15 },   // 陸培修偏好東側
        'npc-2': { centerX: -10, centerZ: 8, radius: 15 },   // 劉宇岑偏好西北側
        'npc-3': { centerX: 0, centerZ: -12, radius: 15 }    // 陳庭安偏好南側
      }

      const preference = npcPreferences[npc.id as keyof typeof npcPreferences]
      if (preference && Math.random() < 0.4) { // 40%機率朝向偏好區域移動
        const preferenceAngle = Math.atan2(preference.centerZ - currentPos.z, preference.centerX - currentPos.x)
        const angleVariation = (Math.random() - 0.5) * Math.PI * 0.5 // ±45度變化
        const finalAngle = preferenceAngle + angleVariation
        targetX = currentPos.x + Math.cos(finalAngle) * distance
        targetZ = currentPos.z + Math.sin(finalAngle) * distance
      }
    }

    // 檢查目標位置是否與其他NPC的目標位置太近
    const allNpcs = useGameStore.getState().npcs
    const otherNpcs = allNpcs.filter(otherNpc => otherNpc.id !== npc.id)

    let validTarget = false
    let attempts = 0

    while (!validTarget && attempts < 5) {
      let tooClose = false

      // 檢查是否與其他NPC的當前位置或目標位置太近
      for (const otherNpc of otherNpcs) {
        const otherCurrentPos = new THREE.Vector3(
          otherNpc.position[0],
          otherNpc.position[1],
          otherNpc.position[2]
        )

        const distanceToOtherCurrent = Math.sqrt(
          Math.pow(targetX - otherCurrentPos.x, 2) +
          Math.pow(targetZ - otherCurrentPos.z, 2)
        )

        if (distanceToOtherCurrent < 4.0) { // 目標位置至少距離其他NPC 4公尺
          tooClose = true
          break
        }
      }

      if (!tooClose) {
        validTarget = true
      } else {
        // 重新計算目標位置
        const newAngle = Math.random() * Math.PI * 2
        const newDistance = 6 + Math.random() * 8
        targetX = currentPos.x + Math.cos(newAngle) * newDistance
        targetZ = currentPos.z + Math.sin(newAngle) * newDistance
        attempts++
      }
    }

    // 獲取該位置的地面高度
    const ground = getGroundSmoothed(targetX, targetZ)
    const targetY = ground.ok ? ground.y : currentPosition.y

    const newTarget = new THREE.Vector3(targetX, targetY, targetZ)

    setTargetPosition(newTarget)
    targetChangeTime.current = Date.now() // 記錄目標變更時間
    console.log(`[NPC ${npc.name}] New target: (${newTarget.x.toFixed(1)}, ${newTarget.y.toFixed(1)}, ${newTarget.z.toFixed(1)}) ${shouldFollowPlayer ? '[following player]' : '[exploring]'} (attempts: ${attempts})`)
  }, [getPlayerPosition, npc.name, npc.id, currentPosition])

  // Set new target periodically - 降低頻率讓移動更穩定
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() < 0.15) { // 降低到15%機率
        setNewTarget()
      }
    }, 8000 + Math.random() * 10000) // 8-18秒間隔，大幅增加

    // Set initial target
    setTimeout(() => setNewTarget(), 2000) // 延遲初始目標設定

    return () => clearInterval(interval)
  }, [setNewTarget])

  // Main frame update loop - 使用統一管線
  useFrame((state, dtRaw) => {
    const dt = Math.min(0.05, Math.max(0.0001, dtRaw))
    const g = groupRef.current
    if (!g) return

    // 強制同步當前位置（避免狀態不同步導致飄在天上）
    currentPosition.copy(g.position)

    // 獲取所有NPC位置進行避障
    const allNpcs = useGameStore.getState().npcs
    const otherNpcs = allNpcs.filter(otherNpc => otherNpc.id !== npc.id)

    // AI 方向計算 - 添加方向平滑化
    const distance = g.position.distanceTo(targetPosition)
    let dir = new THREE.Vector3()

    if (distance > 0.5) { // 增大目標到達閾值，減少頻繁轉向
      dir.subVectors(targetPosition, g.position)
      dir.y = 0  // 確保方向是水平的
      if (dir.lengthSq() > 0.001) {
        dir.normalize()

        // 方向平滑化 - 與上一個方向混合
        const timeSinceTargetChange = Date.now() - targetChangeTime.current
        if (lastDirection.current.lengthSq() > 0.001 && timeSinceTargetChange < 3000) { // 3秒內保持方向穩定
          const smoothFactor = 0.85 // 85%保持舊方向，15%新方向
          dir.lerp(lastDirection.current, smoothFactor)
          dir.normalize()
        }

        lastDirection.current.copy(dir)
      }

      // NPC避障系統 - 檢測附近的其他NPC（降低敏感度）
      const avoidanceVector = new THREE.Vector3()
      const separationDistance = 2.0 // 縮小檢測距離

      for (const otherNpc of otherNpcs) {
        const otherPos = new THREE.Vector3(
          otherNpc.position[0],
          otherNpc.position[1],
          otherNpc.position[2]
        )

        const distanceToOther = g.position.distanceTo(otherPos)

        if (distanceToOther < separationDistance && distanceToOther > 0.2) {
          // 計算遠離向量
          const repelVector = new THREE.Vector3()
          repelVector.subVectors(g.position, otherPos)
          repelVector.y = 0 // 只考慮水平面的避障

          if (repelVector.lengthSq() > 0.001) {
            repelVector.normalize()
            // 只有在很近時才避障，減少搖擺
            if (distanceToOther < 1.5) {
              const repelStrength = (separationDistance - distanceToOther) / separationDistance
              repelVector.multiplyScalar(repelStrength * 1.0) // 降低推力
              avoidanceVector.add(repelVector)
            }
          }
        }
      }

      // 只有在真正需要避障時才調整方向
      if (avoidanceVector.lengthSq() > 0.01) { // 提高閾值
        dir.add(avoidanceVector.multiplyScalar(0.3)) // 大幅降低避障權重
        if (dir.lengthSq() > 0.001) {
          dir.normalize()
        }
      }

      // 不要在移動中隨機改變目標，保持直線移動
    } else {
      // Near target - 使用上一個方向避免突然停止，並稍微增加設定新目標的機率
      if (lastDirection.current.lengthSq() > 0.001) {
        dir.copy(lastDirection.current)
      }
      if (Math.random() < 0.02) setNewTarget()
    }

    const npcSpeed = 3.0  // 稍微降低NPC移動速度，讓避障更流暢

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