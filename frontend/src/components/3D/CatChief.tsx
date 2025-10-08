import { useRef, useState, useEffect } from 'react'
import { useFrame, ThreeEvent, useLoader } from '@react-three/fiber'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { Text } from '@react-three/drei'
import * as THREE from 'three'

interface CatChiefProps {
  position?: [number, number, number]
  onClick?: () => void
}

export function CatChief({ position = [0, 1, 0], onClick }: CatChiefProps) {
  const catRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  const [isWalking, setIsWalking] = useState(false)
  const walkTimer = useRef(0)
  const targetPosition = useRef(new THREE.Vector3(position[0], position[1], position[2]))
  const currentPosition = useRef(new THREE.Vector3(position[0], position[1], position[2]))
  const walkSpeed = 0.3 // units per second

  // Load the low poly cat model using OBJLoader
  const catModel = useLoader(OBJLoader, '/models/lowpolycat/cat.obj')

  // Advanced walking animation with actual movement
  useFrame((state, delta) => {
    if (catRef.current) {
      const time = state.clock.elapsedTime

      // Breathing animation (scale) - 扩大基础尺寸
      const breathe = Math.sin(time * 2) * 0.03
      const baseScale = 2.5 + breathe // 扩大到 2.5 倍
      catRef.current.scale.set(baseScale, baseScale, baseScale)

      // Random walking behavior - 扩大行走范围
      walkTimer.current += delta
      if (walkTimer.current > 2) {
        // Every 2 seconds, pick a new target position on the island
        const radius = 8 // 扩大行走半径以适应更大的岛屿
        const angle = Math.random() * Math.PI * 2
        const distance = Math.random() * radius

        targetPosition.current.set(
          Math.cos(angle) * distance,
          position[1],
          Math.sin(angle) * distance
        )

        setIsWalking(true)
        walkTimer.current = 0
      }

      // Calculate distance to target
      const distanceToTarget = currentPosition.current.distanceTo(targetPosition.current)

      if (distanceToTarget > 0.1 && isWalking) {
        // Move towards target
        const direction = new THREE.Vector3()
          .subVectors(targetPosition.current, currentPosition.current)
          .normalize()

        currentPosition.current.addScaledVector(direction, walkSpeed * delta)

        // Update position
        catRef.current.position.x = currentPosition.current.x
        catRef.current.position.z = currentPosition.current.z

        // Walking animation: gentle bobbing
        const walkBob = Math.sin(time * 8) * 0.08
        catRef.current.position.y = position[1] + walkBob

        // Rotate to face movement direction
        const targetRotation = Math.atan2(direction.x, direction.z)
        catRef.current.rotation.y += (targetRotation - catRef.current.rotation.y) * 0.1

        // Slight swaying while walking
        const sway = Math.sin(time * 8) * 0.1
        catRef.current.rotation.z = sway * 0.15

      } else {
        // Reached target or not walking
        setIsWalking(false)

        // Idle animation: subtle swaying
        const idle = Math.sin(time * 0.5) * 0.15
        catRef.current.rotation.y += (idle - catRef.current.rotation.y) * 0.05
        catRef.current.rotation.z += (0 - catRef.current.rotation.z) * 0.1

        // Return to base height
        catRef.current.position.y += (position[1] - catRef.current.position.y) * 0.1
      }

      if (hovered) {
        // When hovered, add extra highlight rotation
        catRef.current.rotation.y += 0.02
      }

      // Tail wag simulation (rotate a bit on X axis)
      const tailWag = Math.sin(time * 3) * 0.05
      catRef.current.rotation.x = tailWag
    }
  })

  // Apply material to the loaded model and store body parts references
  useEffect(() => {
    if (catModel) {
      catModel.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true
          child.receiveShadow = true
          // Apply a nice white material to the cat
          child.material = new THREE.MeshStandardMaterial({
            color: hovered ? "#FFFFFF" : "#F5F5F5", // White with slight gray tint
            roughness: 0.7,
            metalness: 0,
            flatShading: false,
            side: THREE.DoubleSide,
          })
          // Ensure material gets updated
          child.material.needsUpdate = true
        }
      })
    }
  }, [catModel, hovered])

  // Add cute sound effect on click (optional)
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    // Add a bounce animation on click
    if (catRef.current) {
      const originalY = catRef.current.position.y
      catRef.current.position.y = originalY + 0.3
      setTimeout(() => {
        if (catRef.current) {
          catRef.current.position.y = originalY
        }
      }, 200)
    }
    onClick?.()
  }

  return (
    <group
      ref={catRef}
      position={position}
      onClick={handleClick}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <primitive
        object={catModel}
        scale={0.01}
        rotation={[0, 0, 0]}
      />

      {/* Name tag - 白噗噗 (放大) */}
      <Text
        position={[0, 1.2, 0]}
        fontSize={0.4}
        color={hovered ? "#FFD700" : "#333333"}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#FFFFFF"
      >
        白噗噗
      </Text>

      {/* Sparkles when hovered - 放大 */}
      {hovered && (
        <>
          <mesh position={[0.8, 1.0, 0]}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshBasicMaterial color="#FFD700" transparent opacity={0.8} />
          </mesh>
          <mesh position={[-0.8, 0.9, 0]}>
            <sphereGeometry args={[0.12, 8, 8]} />
            <meshBasicMaterial color="#FFE4B5" transparent opacity={0.8} />
          </mesh>
          <mesh position={[0, 1.5, 0]}>
            <sphereGeometry args={[0.18, 8, 8]} />
            <meshBasicMaterial color="#FFFFFF" transparent opacity={0.6} />
          </mesh>
        </>
      )}
    </group>
  )
}
