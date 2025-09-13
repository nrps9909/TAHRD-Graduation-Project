import React, { useRef, useEffect, useState, useCallback } from 'react'
import { useFrame, useThree, useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as THREE from 'three'
import { useGameStore } from '@/stores/gameStore'
import { bindScene, resolveMoveXZ, clampToGroundSmooth, snapToNearestGround, GROUND_LAYER_ID, debugThrottled, setMountainColliders } from '@/game/physics/grounding'
import { safeNormalize2, clampDt, isFiniteVec3 } from '@/game/utils/mathSafe'
import { collisionSystem } from '@/utils/collision'
import { wrapWithFeetPivot } from '@/game/utils/fixPivotAtFeet'
import NameplateOverlay from '@/game/ui/NameplateOverlay'
import { sweepCapsuleAndSlide } from '@/game/physics/capsuleCollider'
import { buildWorldBVH } from '@/game/physics/worldBVH'

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
  
  const config = modelConfigs[npc.id as keyof typeof modelConfigs] || 
                  { path: npc.modelPath || '/characters/CHAR-M-A', file: npc.modelFile || '/CHAR-M-A.glb' }
  
  const fullModelPath = `${config.path}${config.file}`
  const kenneyModel = useLoader(GLTFLoader, fullModelPath, (loader) => {
    const basePath = fullModelPath.substring(0, fullModelPath.lastIndexOf('/') + 1)
    loader.setResourcePath(basePath)
  })
  
  const [animationMixer, setAnimationMixer] = useState<THREE.AnimationMixer | null>(null)
  
  // Physics state
  const npcPos = useRef(new THREE.Vector3(...npc.position))
  const velocityY = useRef({ value: 0 })
  const onGround = useRef({ value: true })
  const groundNormal = useRef(new THREE.Vector3())
  const FIXED_DT = 1/60
  const accumulator = useRef(0)
  const lastMoveTime = useRef(Date.now())
  const builtRef = useRef(false)
  const hasInitialized = useRef(false)

  // 處理模型載入完成
  useEffect(() => {
    if (kenneyModel?.scene && feetPivotRef.current) {
      // 套用腳底對齊
      const { group: feetPivot, offsetY } = wrapWithFeetPivot(kenneyModel.scene)
      feetPivotRef.current.add(feetPivot)
      console.info(`👣 NPC(${npc.name}) feet-pivot offsetY =`, offsetY.toFixed(3))
      
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
  
  // Initialize physics system
  useEffect(() => {
    bindScene(scene)
    
    const timer = setTimeout(() => {
      const terrainMeshes: THREE.Mesh[] = []
      const mountains: any[] = []
      
      scene.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh)) return
        
        const name = (obj.name || '').toLowerCase()
        let materialName = ''
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            materialName = obj.material.map((m: any) => m.name || '').join(' ').toLowerCase()
          } else {
            materialName = (obj.material.name || '').toLowerCase()
          }
        }
        
        // Identify terrain meshes for raycasting
        const terrainHints = ['terrain', 'ground', 'island', 'sand', 'grass', 'dirt', 'plain', 'terrain_low_poly', 'landscape']
        const isTerrain = terrainHints.some(hint => name.includes(hint) || materialName.includes(hint))
        
        if (isTerrain) {
          obj.layers.enable(GROUND_LAYER_ID)
          terrainMeshes.push(obj)
        }
        
        // Collect mountain colliders
        if (name.includes('mountain') || name.includes('Mountain')) {
          obj.layers.enable(GROUND_LAYER_ID)
          mountains.push({ cx: obj.position.x, cz: obj.position.z, r: 5 })
        }
      })
      
      // Get collision objects for mountains
      const mountainColliders = collisionSystem.getCollisionObjects()
        .filter(obj => obj.type === 'mountain')
        .map(m => ({ cx: m.position.x, cz: m.position.z, r: m.radius }))
      
      if (mountainColliders.length > 0) {
        setMountainColliders(mountainColliders)
      }
      
      // Build world BVH for collision
      const collidableMeshes = [...terrainMeshes, ...mountains.map(m => {
        const mesh = scene.getObjectByName(m.name || '');
        return mesh instanceof THREE.Mesh ? mesh : null;
      }).filter(Boolean)] as THREE.Mesh[];
      
      if (collidableMeshes.length > 0) {
        const worldCollisionMesh = buildWorldBVH(collidableMeshes);
        scene.add(worldCollisionMesh);
      }
      
      console.log(`✅ [NPC ${npc.name}] Physics initialized: ${terrainMeshes.length} terrain, ${mountainColliders.length} mountains`)
      
      // Initial snap to ground with offset for model height
      const initialPos = new THREE.Vector3(...npc.position)
      snapToNearestGround(initialPos, 3, 0.5) // Higher offset for NPCs
      npcPos.current.copy(initialPos)
      
      builtRef.current = true
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [scene, npc.name, npc.position])


  // Set new random target
  const setNewTarget = useCallback(() => {
    const playerPos = getPlayerPosition()
    const angle = Math.random() * Math.PI * 2
    const distance = 3 + Math.random() * 5
    const baseX = playerPos ? playerPos.x : npcPos.current.x
    const baseZ = playerPos ? playerPos.z : npcPos.current.z
    
    const newTarget = new THREE.Vector3(
      baseX + Math.cos(angle) * distance,
      npcPos.current.y,
      baseZ + Math.sin(angle) * distance
    )

    setTargetPosition(newTarget)
    debugThrottled(`[NPC ${npc.name}] New target: (${newTarget.x.toFixed(1)}, ${newTarget.z.toFixed(1)})`)
  }, [getPlayerPosition, npc.name])

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
    if (!feetPivotRef.current || !builtRef.current) return
    
    // Fixed timestep accumulator
    accumulator.current += Math.min(delta, 0.05)
    
    while (accumulator.current >= FIXED_DT) {
      const dt = FIXED_DT
      
      const distance = npcPos.current.distanceTo(targetPosition)
      const moveSpeed = 2.0

      if (distance > 0.3) {
        // Moving towards target
        const direction = new THREE.Vector3()
          .subVectors(targetPosition, npcPos.current)
        direction.y = 0 // Keep horizontal
        direction.normalize()

        // Physics-based movement using capsule collision
        const spec = { radius: 0.35, height: 1.2 }; // 依角色大小微調
        
        // 1) 產生期望移動（世界座標）
        const desiredMove = new THREE.Vector3(
          direction.x * moveSpeed * dt,
          0,
          direction.z * moveSpeed * dt
        );
        
        // 2) 用膠囊掃掠對世界 BVH 修正 + 滑移
        const corrected = sweepCapsuleAndSlide(feetPivotRef.current.position, desiredMove, spec);
        
        // 3) 寫入位置
        feetPivotRef.current.position.add(corrected);
        
        // 4) 垂直方向仍用貼地函式
        clampToGroundSmooth(feetPivotRef.current.position, velocityY.current, dt, groundNormal.current, onGround.current)
        
        // Sync npcPos with feetPivot position
        npcPos.current.copy(feetPivotRef.current.position)

        // Smooth rotation towards movement direction
        if (distance > 0.1 && !hovered) {
          const targetRotation = Math.atan2(direction.x, direction.z)
          const currentRotation = feetPivotRef.current.rotation.y
          let rotationDiff = targetRotation - currentRotation

          if (rotationDiff > Math.PI) rotationDiff -= 2 * Math.PI
          if (rotationDiff < -Math.PI) rotationDiff += 2 * Math.PI

          feetPivotRef.current.rotation.y += rotationDiff * 0.3
        }

        lastMoveTime.current = Date.now()
      } else {
        // Near target - just maintain ground position
        clampToGroundSmooth(feetPivotRef.current.position, velocityY.current, dt, groundNormal.current, onGround.current)
        npcPos.current.copy(feetPivotRef.current.position)
        
        // Occasionally set new target when idle
        if (Date.now() - lastMoveTime.current > 3000 && Math.random() < 0.01) {
          setNewTarget()
        }
      }
      
      // If not on ground, try to snap
      if (!onGround.current.value) {
        snapToNearestGround(feetPivotRef.current.position, 2.5, 0.25)
        npcPos.current.copy(feetPivotRef.current.position)
      }
      
      accumulator.current -= FIXED_DT
    }
    
    // Apply position to mesh
    if (isFiniteVec3(npcPos.current) && feetPivotRef.current) {
      feetPivotRef.current.position.copy(npcPos.current)
      setCurrentPosition(npcPos.current.clone())
      
      // Update store position occasionally
      if (Math.random() < 0.02) {
        updateNpcPosition(npc.id, [npcPos.current.x, npcPos.current.y, npcPos.current.z])
      }
    }
    
    // Update animation mixer
    if (animationMixer) {
      animationMixer.update(delta)
    }

    // Apply hover effects
    if (hovered && feetPivotRef.current) {
      feetPivotRef.current.position.y = npcPos.current.y + Math.sin(state.clock.elapsedTime * 3) * 0.1
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
    if (feetPivotRef.current && !hasInitialized.current) {
      hasInitialized.current = true
      
      // 延遲初始化以等待地形載入
      setTimeout(() => {
        if (!feetPivotRef.current) return
        
        const initialPos = new THREE.Vector3(...npc.position)
        
        // Snap to ground with proper offset
        snapToNearestGround(initialPos, 3, 0.25)
        npcPos.current.copy(initialPos)
        feetPivotRef.current.position.copy(initialPos)
        
        console.log(`🎮 NPC ${npc.name} 初始化完成: [${initialPos.x.toFixed(2)}, ${initialPos.y.toFixed(2)}, ${initialPos.z.toFixed(2)}]`)
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
      <NameplateOverlay targetRef={feetPivotRef} label={npc.name} />
      
      {/* NPC 陰影圓圈 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <circleGeometry args={[0.8, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.3} />
      </mesh>
    </group>
  )
}