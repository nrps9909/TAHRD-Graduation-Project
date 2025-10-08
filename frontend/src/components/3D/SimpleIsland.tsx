import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Memory } from '../../types/island'
import { MemoryTree } from './MemoryTree'
import { generateTreePositions } from '../../utils/treePositioning'

interface SimpleIslandProps {
  position?: [number, number, number]
  color?: string
  scale?: number
  isActive?: boolean
  memories?: Memory[] // 記憶列表
  islandId?: string // 島嶼ID（用於生成位置種子）
}

export function SimpleIsland({
  position = [0, 0, 0],
  color = '#90C695',
  scale = 1.0,
  isActive = false,
  memories = [],
  islandId = 'default'
}: SimpleIslandProps) {
  const islandRef = useRef<THREE.Group>(null)

  // Gentle floating animation
  useFrame((state) => {
    if (islandRef.current) {
      const baseFloat = Math.sin(state.clock.elapsedTime * 0.3 + position[0]) * 0.15
      islandRef.current.position.y = position[1] + baseFloat
    }
  })

  // 根據主題色計算相關顏色
  const threeColor = new THREE.Color(color)
  const grassColor = threeColor.clone().multiplyScalar(1.2).getStyle()
  const beachColor = new THREE.Color(color).clone().lerp(new THREE.Color('#F4E4C1'), 0.7).getStyle()

  // 生成樹的位置（基於記憶數量）
  const treePositions = useMemo(() => {
    if (memories.length === 0) return []

    // 使用島嶼ID作為種子，確保每個島的樹位置是固定的
    const seed = islandId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return generateTreePositions(memories.length, 15, 1.8, seed)
  }, [memories.length, islandId])

  return (
    <group
      ref={islandRef}
      position={[position[0], position[1] - 1, position[2]]}
      scale={scale}
    >
      {/* Main island body */}
      <mesh position={[0, -0.5, 0]} receiveShadow castShadow>
        <coneGeometry args={[24, 4, 64]} />
        <meshStandardMaterial
          color="#8B7355"
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

      {/* Beach layer - 沙滩层 */}
      <mesh position={[0, 0.3, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[20, 22, 0.8, 64]} />
        <meshStandardMaterial
          color={beachColor}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Top grass layer - 草地层 */}
      <mesh position={[0, 0.8, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[18, 20, 0.5, 64]} />
        <meshStandardMaterial
          color={color}
          roughness={0.9}
          metalness={0}
          emissive={isActive ? color : '#000000'}
          emissiveIntensity={isActive ? 0.3 : 0}
        />
      </mesh>

      {/* Inner grass detail - 内层草地细节 */}
      <mesh position={[0, 1.1, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[15, 17, 0.3, 64]} />
        <meshStandardMaterial
          color={grassColor}
          roughness={0.85}
          metalness={0}
          emissive={isActive ? grassColor : '#000000'}
          emissiveIntensity={isActive ? 0.2 : 0}
        />
      </mesh>

      {/* 記憶樹 - 每個記憶一棵樹 */}
      {memories.map((memory, index) => {
        const treePos = treePositions[index]
        if (!treePos) return null

        // 計算樹的種子（基於記憶ID和索引）
        const treeSeed = memory.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + index

        return (
          <MemoryTree
            key={memory.id}
            memory={memory}
            islandColor={color}
            position={[treePos.x, treePos.y, treePos.z]}
            seed={treeSeed}
          />
        )
      })}
    </group>
  )
}
