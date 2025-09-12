import React, { useRef, useEffect, useState, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/stores/gameStore'
import { bindScene, resolveMoveXZ, clampToGroundSmooth, snapToNearestGround, GROUND_LAYER_ID, debugThrottled } from '@/game/physics/grounding'
import { safeNormalize2, clampDt, isFiniteVec3 } from '@/game/utils/mathSafe'

interface NPCCharacterProps {
  npc: {
    id: string
    name: string
    position: [number, number, number]
    color: string
  }
  onInteract?: (npc: any) => void
  selectedNpc?: string | null
}

export const NPCCharacter: React.FC<NPCCharacterProps> = ({ 
  npc, 
  onInteract = () => {}, 
  selectedNpc = null 
}) => {
  const meshRef = useRef<THREE.Mesh>(null!)
  const { scene } = useThree()
  const [hovered, setHovered] = useState(false)
  const [currentPosition, setCurrentPosition] = useState(new THREE.Vector3(...npc.position))
  const [targetPosition, setTargetPosition] = useState(new THREE.Vector3(...npc.position))
  
  const { updateNpcPosition, getPlayerPosition } = useGameStore()
  
  // Physics state
  const npcPos = useRef(new THREE.Vector3(...npc.position))
  const velocityY = useRef({ value: 0 })
  const onGround = useRef({ value: true })
  const groundNormal = useRef(new THREE.Vector3())
  const FIXED_DT = 1/60
  const accumulator = useRef(0)
  const lastMoveTime = useRef(Date.now())
  const builtRef = useRef(false)

  // Initialize physics system
  useEffect(() => {
    bindScene(scene)
    
    const timer = setTimeout(() => {
      if (!builtRef.current && scene) {
        const terrainMeshes: THREE.Mesh[] = []
        scene.traverse((object: THREE.Object3D) => {
          if (object instanceof THREE.Mesh && (
            object.name.includes('terrain') || 
            object.name.includes('Terrain') ||
            object.name.includes('ground') ||
            object.userData?.isGround
          )) {
            object.layers.enable(GROUND_LAYER_ID)
            terrainMeshes.push(object)
          }
        })

        if (terrainMeshes.length > 0) {
          console.log(`🏔️ [NPC ${npc.name}] 初始化物理系統，地形網格: ${terrainMeshes.length}`)
          builtRef.current = true
        }
        
        // Initial snap to ground
        snapToNearestGround(npcPos.current, 3, 0.25)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [scene, npc.name])


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
    if (!meshRef.current || !builtRef.current) return
    
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

        const desiredMove = new THREE.Vector2(
          direction.x * moveSpeed * dt,
          direction.z * moveSpeed * dt
        )

        // Apply physics-based movement resolution
        const actualMove = resolveMoveXZ(npcPos.current, desiredMove)
        npcPos.current.x += actualMove.x
        npcPos.current.z += actualMove.y

        // Apply smooth ground clamping
        clampToGroundSmooth(npcPos.current, velocityY.current, dt, groundNormal.current, onGround.current)

        // Smooth rotation towards movement direction
        if (distance > 0.1 && !hovered) {
          const targetRotation = Math.atan2(direction.x, direction.z)
          const currentRotation = meshRef.current.rotation.y
          let rotationDiff = targetRotation - currentRotation

          if (rotationDiff > Math.PI) rotationDiff -= 2 * Math.PI
          if (rotationDiff < -Math.PI) rotationDiff += 2 * Math.PI

          meshRef.current.rotation.y += rotationDiff * 0.3
        }

        lastMoveTime.current = Date.now()
      } else {
        // Near target - just maintain ground position
        clampToGroundSmooth(npcPos.current, velocityY.current, dt, groundNormal.current, onGround.current)
        
        // Occasionally set new target when idle
        if (Date.now() - lastMoveTime.current > 3000 && Math.random() < 0.01) {
          setNewTarget()
        }
      }
      
      // If not on ground, try to snap
      if (!onGround.current.value) {
        snapToNearestGround(npcPos.current, 2.5, 0.25)
      }
      
      accumulator.current -= FIXED_DT
    }
    
    // Apply position to mesh
    if (isFiniteVec3(npcPos.current)) {
      meshRef.current.position.copy(npcPos.current)
      setCurrentPosition(npcPos.current.clone())
      
      // Update store position occasionally
      if (Math.random() < 0.02) {
        updateNpcPosition(npc.id, [npcPos.current.x, npcPos.current.y, npcPos.current.z])
      }
    }

    // Apply hover effects
    if (hovered) {
      meshRef.current.position.y = npcPos.current.y + Math.sin(state.clock.elapsedTime * 3) * 0.1
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
    <mesh
      ref={meshRef}
      position={currentPosition.toArray()}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      castShadow
      receiveShadow
    >
      <capsuleGeometry args={[0.3, 1.0, 4, 8]} />
      <meshPhongMaterial 
        color={selectedNpc === npc.id ? '#ffff00' : npc.color}
        transparent={hovered}
        opacity={hovered ? 0.8 : 1}
      />
      
      {/* Name label */}
      <group position={[0, 1.2, 0]}>
        <mesh>
          <planeGeometry args={[2, 0.4]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[1.8, 0.3]} />
          <meshBasicMaterial
            color="#333333"
            transparent
            opacity={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </mesh>
  )
}