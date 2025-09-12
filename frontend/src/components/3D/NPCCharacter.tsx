import React, { useRef, useEffect, useState, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/stores/gameStore'
import { clampToGroundY, resolveMoveXZ, snapToNearestGround, initializeGrounding, sampleGroundAt, FOOT_OFFSET, GROUND_LAYER_ID } from '@/game/physics/useGroundingAndCollision'
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
  const velocityY = useRef({ value: 0 })
  const lastSafeRef = useRef(new THREE.Vector3(...npc.position))
  const footOffsetRef = useRef(FOOT_OFFSET)
  const stuckCounterRef = useRef(0)
  const lastMoveTime = useRef(Date.now())
  const builtRef = useRef(false)

  // Initialize physics system
  useEffect(() => {
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
            terrainMeshes.push(object)
          }
        })

        if (terrainMeshes.length > 0) {
          initializeGrounding(terrainMeshes)
          // Set terrain layer for raycasting
          terrainMeshes.forEach(mesh => {
            mesh.layers.enable(GROUND_LAYER_ID)
          })
          console.log(`🏔️ [NPC ${npc.name}] 初始化物理系統，地形網格: ${terrainMeshes.length}`)
          builtRef.current = true
        }
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [scene, npc.name])

  // Ground check helper
  const getGroundHeight = (x: number, z: number): { valid: boolean; height: number; normal: THREE.Vector3 } => {
    const sample = sampleGroundAt(x, z)
    if (sample) {
      return {
        valid: true,
        height: sample.y,
        normal: sample.normal
      }
    }
    return { valid: false, height: 0, normal: new THREE.Vector3(0, 1, 0) }
  }

  // Set new random target
  const setNewTarget = useCallback(() => {
    const playerPos = getPlayerPosition()
    const angle = Math.random() * Math.PI * 2
    const distance = 3 + Math.random() * 5
    const baseX = playerPos ? playerPos.x : currentPosition.x
    const baseZ = playerPos ? playerPos.z : currentPosition.z
    
    const newTarget = new THREE.Vector3(
      baseX + Math.cos(angle) * distance,
      0,
      baseZ + Math.sin(angle) * distance
    )

    const ground = getGroundHeight(newTarget.x, newTarget.z)
    if (ground.valid) {
      newTarget.y = ground.height + footOffsetRef.current
      setTargetPosition(newTarget)
      console.log(`🎯 [NPC ${npc.name}] 新目標: (${newTarget.x.toFixed(1)}, ${newTarget.z.toFixed(1)})`)
    }
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
    if (!meshRef.current || !builtRef.current) return
    
    const dt = clampDt(delta)

    const distance = currentPosition.distanceTo(targetPosition)
    const moveSpeed = 2.0

    if (distance > 0.3) {
      // Moving towards target
      const direction = new THREE.Vector3()
        .subVectors(targetPosition, currentPosition)
        .normalize()

      const desiredMove = new THREE.Vector2(
        direction.x * moveSpeed * dt,
        direction.z * moveSpeed * dt
      )
      safeNormalize2(desiredMove)

      // Apply physics-based movement resolution
      const actualMove = resolveMoveXZ(currentPosition, desiredMove)
      const finalPosition = currentPosition.clone()
      finalPosition.x += actualMove.x
      finalPosition.z += actualMove.y

      // Apply ground clamping
      clampToGroundY(finalPosition, velocityY, dt)

      // Update position (with safety check)
      if (isFiniteVec3(finalPosition)) {
        setCurrentPosition(finalPosition)
        lastSafeRef.current.copy(finalPosition)
        meshRef.current.position.copy(finalPosition)
      } else {
        console.warn(`[NPC ${npc.name}] Non-finite position detected, resetting`)
        finalPosition.copy(lastSafeRef.current)
        meshRef.current.position.copy(lastSafeRef.current)
      }

      // Update store position occasionally
      if (Math.random() < 0.2) {
        updateNpcPosition(npc.id, [finalPosition.x, finalPosition.y, finalPosition.z])
      }

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
      // Near target - apply ground adherence and safety checks
      clampToGroundY(currentPosition, velocityY, dt)
      
      const ground = getGroundHeight(currentPosition.x, currentPosition.z)
      if (ground.valid) {
        const targetY = ground.height + footOffsetRef.current
        if (Math.abs(targetY - currentPosition.y) > 0.05) {
          const newY = THREE.MathUtils.lerp(currentPosition.y, targetY, 0.15)
          const newPosition = new THREE.Vector3(currentPosition.x, newY, currentPosition.z)
          setCurrentPosition(newPosition)
          meshRef.current.position.y = newY
          
          if (Math.abs(newY - targetY) < 0.1) {
            lastSafeRef.current.copy(newPosition)
          }
        }
      }

      // Occasionally set new target when idle
      if (Date.now() - lastMoveTime.current > 3000 && Math.random() < 0.01) {
        setNewTarget()
      }
    }

    // Emergency ground recovery
    if (currentPosition.y < -10) {
      console.warn(`🚨 [NPC ${npc.name}] 緊急地面恢復`)
      if (snapToNearestGround(currentPosition)) {
        setCurrentPosition(currentPosition.clone())
        meshRef.current.position.copy(currentPosition)
      }
    }

    // Apply hover effects
    if (hovered) {
      meshRef.current.position.y = currentPosition.y + Math.sin(state.clock.elapsedTime * 3) * 0.1
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