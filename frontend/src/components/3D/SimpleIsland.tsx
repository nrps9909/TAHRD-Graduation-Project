import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Memory } from '../../types/island'
import { MemoryTree } from './MemoryTree'
import { generateTreePositions } from '../../utils/treePositioning'
import { IslandBoundaryConfig } from '../../utils/islandBoundary'

interface SimpleIslandProps {
  position?: [number, number, number]
  color?: string
  scale?: number
  isActive?: boolean
  memories?: Memory[] // 記憶列表
  islandId?: string // 島嶼ID（用於生成位置種子）
  onMemoryClick?: (memory: Memory) => void // 記憶點擊回調
  isPawPad?: boolean // 是否為肉球形狀
  isCenterPad?: boolean // 是否為中央大肉球（心形）
}

export function SimpleIsland({
  position = [0, 0, 0],
  color = '#90C695',
  scale = 1.0,
  isActive = false,
  memories = [],
  islandId = 'default',
  onMemoryClick,
  isPawPad = false,
  isCenterPad = false
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

    // 根據島嶼形狀配置邊界
    const boundaryConfig: IslandBoundaryConfig = isPawPad
      ? {
          shape: 'paw',
          radius: isCenterPad ? 12 : 11,
          margin: 2
        }
      : {
          shape: 'circle',
          radius: 15,
          margin: 2
        }

    return generateTreePositions(memories.length, 15, 1.8, seed, boundaryConfig)
  }, [memories.length, islandId, isPawPad, isCenterPad])

  return (
    <group
      ref={islandRef}
      position={[position[0], position[1] - 1, position[2]]}
      scale={scale}
    >
      {isPawPad ? (
        isCenterPad ? (
          // 🐾 中央大肉球 - 心形/倒三角形
          <>
            {/* 底部基座 - 心形底座 */}
            <mesh position={[0, -0.8, 0]} receiveShadow castShadow scale={[1, 1, 1.2]}>
              <cylinderGeometry args={[14, 16, 2, 3]} />
              <meshStandardMaterial
                color="#D4C5B9"
                roughness={0.9}
                metalness={0}
              />
            </mesh>

            {/* 主體 - 三角柱基礎 */}
            <mesh position={[0, 0.3, 0]} receiveShadow castShadow scale={[1, 1, 1.15]} rotation={[0, 0, 0]}>
              <cylinderGeometry args={[12, 13.5, 1.8, 3]} />
              <meshStandardMaterial
                color={color}
                roughness={0.85}
                metalness={0}
                emissive={isActive ? color : '#000000'}
                emissiveIntensity={isActive ? 0.12 : 0}
              />
            </mesh>

            {/* 頂部平台 - 心形種樹區域，完全扁平 */}
            <mesh position={[0, 1.2, 0]} receiveShadow castShadow scale={[1, 1, 1.1]} rotation={[0, Math.PI, 0]}>
              <cylinderGeometry args={[11, 12, 0.4, 3]} />
              <meshStandardMaterial
                color={new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.15).getStyle()}
                roughness={0.8}
                metalness={0}
                emissive={isActive ? color : '#000000'}
                emissiveIntensity={isActive ? 0.08 : 0}
              />
            </mesh>
          </>
        ) : (
          // 🐾 腳趾肉球 - 橢圓豆形
          <>
            {/* 底部基座 - 橢圓底座 */}
            <mesh position={[0, -0.8, 0]} receiveShadow castShadow scale={[0.85, 1, 1.1]}>
              <cylinderGeometry args={[13, 15, 2, 32]} />
              <meshStandardMaterial
                color="#D4C5B9"
                roughness={0.9}
                metalness={0}
              />
            </mesh>

            {/* 主體 - 橢圓柱基礎 */}
            <mesh position={[0, 0.3, 0]} receiveShadow castShadow scale={[0.8, 1, 1.15]}>
              <cylinderGeometry args={[11.5, 12.5, 1.8, 32]} />
              <meshStandardMaterial
                color={color}
                roughness={0.85}
                metalness={0}
                emissive={isActive ? color : '#000000'}
                emissiveIntensity={isActive ? 0.12 : 0}
              />
            </mesh>

            {/* 頂部平台 - 橢圓種樹區域，完全扁平 */}
            <mesh position={[0, 1.2, 0]} receiveShadow castShadow scale={[0.75, 1, 1.2]}>
              <cylinderGeometry args={[10.5, 11, 0.4, 32]} />
              <meshStandardMaterial
                color={new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.15).getStyle()}
                roughness={0.8}
                metalness={0}
                emissive={isActive ? color : '#000000'}
                emissiveIntensity={isActive ? 0.08 : 0}
              />
            </mesh>
          </>
        )
      ) : (
        // 原本的島嶼形狀
        <>
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
        </>
      )}

      {/* 記憶樹 - 每個記憶一棵樹 */}
      {memories.map((memory, index) => {
        const treePos = treePositions[index]
        if (!treePos) return null

        // 計算樹的種子（基於記憶ID和索引）
        const treeSeed = memory.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + index

        // 計算樹的 Y 位置，讓樹根部貼合島嶼頂部
        // isPawPad 時頂部平台在 Y=1.2，普通島嶼頂層在 Y=1.1
        const surfaceY = isPawPad ? 1.4 : 1.1

        return (
          <MemoryTree
            key={memory.id}
            memory={memory}
            islandColor={color}
            position={[treePos.x, surfaceY, treePos.z]}
            seed={treeSeed}
            onClick={onMemoryClick}
          />
        )
      })}
    </group>
  )
}
