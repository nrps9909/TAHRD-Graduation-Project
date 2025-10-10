/**
 * PawPadIsland - 完整的貓咪肉球島嶼
 * 每個島嶼包含 1個中央大肉球 + 4個小腳趾肉球
 */

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Memory } from '../../types/island'
import { MemoryTree } from './MemoryTree'
import { generateTreePositions } from '../../utils/treePositioning'
import { IslandBoundaryConfig } from '../../utils/islandBoundary'

interface PawPadIslandProps {
  position?: [number, number, number]
  color?: string
  scale?: number
  isActive?: boolean
  memories?: Memory[]
  islandId?: string
  onMemoryClick?: (memory: Memory) => void
}

// 單個肉球組件
function PadElement({
  position,
  color,
  scale = 1,
  isCenter = false
}: {
  position: [number, number, number]
  color: string
  scale?: number
  isCenter?: boolean
}) {
  const padRef = useRef<THREE.Group>(null)

  return (
    <group ref={padRef} position={position} scale={scale}>
      {/* 底部基座 */}
      <mesh position={[0, -0.3, 0]} receiveShadow castShadow>
        <cylinderGeometry args={isCenter ? [5.5, 6, 0.8, 32] : [3.2, 3.5, 0.6, 32]} />
        <meshStandardMaterial
          color="#D4C5B9"
          roughness={0.9}
          metalness={0}
        />
      </mesh>

      {/* 主體肉球 - 扁平圓柱體 */}
      <mesh position={[0, 0.1, 0]} receiveShadow castShadow>
        <cylinderGeometry args={isCenter ? [5.2, 5.4, 0.5, 32] : [3, 3.1, 0.4, 32]} />
        <meshStandardMaterial
          color={color}
          roughness={0.85}
          metalness={0}
        />
      </mesh>

      {/* 頂部平台 - 完全扁平，無凸起 */}
      <mesh position={[0, 0.35, 0]} receiveShadow castShadow>
        <cylinderGeometry args={isCenter ? [5, 5.2, 0.2, 32] : [2.9, 3, 0.15, 32]} />
        <meshStandardMaterial
          color={new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.15).getStyle()}
          roughness={0.8}
          metalness={0}
        />
      </mesh>
    </group>
  )
}

export function PawPadIsland({
  position = [0, 0, 0],
  color = '#A8D5BA',
  scale = 1.0,
  isActive = false,
  memories = [],
  islandId = 'default',
  onMemoryClick
}: PawPadIslandProps) {
  const islandRef = useRef<THREE.Group>(null)

  // 柔和的浮動動畫
  useFrame((state) => {
    if (islandRef.current) {
      const baseFloat = Math.sin(state.clock.elapsedTime * 0.3 + position[0]) * 0.15
      islandRef.current.position.y = position[1] + baseFloat
    }
  })

  // 生成樹的位置（只在中央肉球上）
  const boundaryConfig: IslandBoundaryConfig = {
    shape: 'circle',
    radius: 5,  // 中央肉球半徑
    margin: 1
  }
  const treePositions = generateTreePositions(memories.length, 8, 1.2, islandId.charCodeAt(0), boundaryConfig)

  // 四個腳趾肉球的位置（圍繞中央肉球）
  const toePositions: [number, number, number][] = [
    [-8, 0, -6],   // 左上
    [-5, 0, 6],    // 左下
    [5, 0, 6],     // 右下
    [8, 0, -6]     // 右上
  ]

  return (
    <group
      ref={islandRef}
      position={[position[0], position[1], position[2]]}
      scale={scale}
    >
      {/* 中央大肉球 - 種樹區域 */}
      <PadElement
        position={[0, 0, 0]}
        color={color}
        scale={1}
        isCenter={true}
      />

      {/* 四個小腳趾肉球 */}
      {toePositions.map((toePos, index) => (
        <PadElement
          key={index}
          position={toePos}
          color={new THREE.Color(color).multiplyScalar(0.9).getStyle()}
          scale={0.7}
          isCenter={false}
        />
      ))}

      {/* 記憶樹 - 只在中央大肉球上 */}
      {memories.map((memory, index) => {
        const treePos = treePositions[index]
        if (!treePos) return null

        const treeSeed = memory.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + index

        return (
          <MemoryTree
            key={memory.id}
            memory={memory}
            islandColor={color}
            position={[treePos.x, treePos.y + 0.8, treePos.z]}
            seed={treeSeed}
            onClick={onMemoryClick}
          />
        )
      })}

      {/* 選中狀態的柔和光暈 */}
      {isActive && (
        <pointLight
          color={color}
          intensity={0.6}
          distance={20}
          position={[0, 3, 0]}
        />
      )}
    </group>
  )
}
