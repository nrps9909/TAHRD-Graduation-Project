/**
 * PawIsland - 完整的猫咪脚掌形状岛屿
 * 一个完整的陆地，外形像猫咪脚掌（1个掌心 + 4个脚趾融合在一起）
 */

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Memory } from '../../types/island'
import { MemoryTree } from './MemoryTree'
import { generateTreePositions } from '../../utils/treePositioning'

interface PawIslandProps {
  position?: [number, number, number]
  color?: string
  scale?: number
  isActive?: boolean
  memories?: Memory[]
  islandId?: string
  onMemoryClick?: (memory: Memory) => void
}

export function PawIsland({
  position = [0, 0, 0],
  color = '#A8D5BA',
  scale = 1.0,
  isActive = false,
  memories = [],
  islandId = 'default',
  onMemoryClick
}: PawIslandProps) {
  const islandRef = useRef<THREE.Group>(null)

  // 柔和的浮动动画
  useFrame((state) => {
    if (islandRef.current) {
      const baseFloat = Math.sin(state.clock.elapsedTime * 0.3 + position[0]) * 0.15
      islandRef.current.position.y = position[1] + baseFloat
    }
  })

  // 生成树的位置
  const treePositions = useMemo(() => {
    if (memories.length === 0) return []
    const seed = islandId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return generateTreePositions(memories.length, 18, 1.8, seed)
  }, [memories.length, islandId])

  // 脚掌的各个肉球位置（用于绘制完整形状）
  const pawPads = [
    { x: 0, z: 0, r: 8 },      // 中央掌心（大）
    { x: -6, z: -8, r: 3.5 },  // 左上脚趾
    { x: -2, z: -10, r: 3.2 }, // 左中脚趾
    { x: 2, z: -10, r: 3.2 },  // 右中脚趾
    { x: 6, z: -8, r: 3.5 }    // 右上脚趾
  ]

  return (
    <group
      ref={islandRef}
      position={[position[0], position[1], position[2]]}
      scale={scale}
    >
      {/* 底部基座 - 完整的脚掌轮廓 */}
      {pawPads.map((pad, index) => (
        <mesh key={`base-${index}`} position={[pad.x, -0.5, pad.z]} receiveShadow castShadow>
          <cylinderGeometry args={[pad.r * 1.15, pad.r * 1.2, 0.8, 32]} />
          <meshStandardMaterial
            color="#D4C5B9"
            roughness={0.9}
            metalness={0}
          />
        </mesh>
      ))}

      {/* 主体层 - 完整的脚掌形状 */}
      {pawPads.map((pad, index) => (
        <mesh key={`main-${index}`} position={[pad.x, 0, pad.z]} receiveShadow castShadow>
          <cylinderGeometry args={[pad.r * 1.05, pad.r * 1.1, 0.6, 32]} />
          <meshStandardMaterial
            color={color}
            roughness={0.85}
            metalness={0}
            emissive={isActive ? color : '#000000'}
            emissiveIntensity={isActive ? 0.15 : 0}
          />
        </mesh>
      ))}

      {/* 顶部平台 - 种树区域 */}
      {pawPads.map((pad, index) => (
        <mesh key={`top-${index}`} position={[pad.x, 0.4, pad.z]} receiveShadow castShadow>
          <cylinderGeometry args={[pad.r * 0.95, pad.r, 0.3, 32]} />
          <meshStandardMaterial
            color={new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.15).getStyle()}
            roughness={0.8}
            metalness={0}
            emissive={isActive ? color : '#000000'}
            emissiveIntensity={isActive ? 0.1 : 0}
          />
        </mesh>
      ))}

      {/* 连接层 - 让各个肉球融合成完整陆地 */}
      {/* 掌心到左上脚趾的连接 */}
      <mesh position={[-3, 0, -4]} receiveShadow castShadow rotation={[0, 0, -Math.PI / 6]}>
        <cylinderGeometry args={[4, 4.5, 0.6, 32]} />
        <meshStandardMaterial color={color} roughness={0.85} metalness={0} />
      </mesh>

      {/* 掌心到左中脚趾的连接 */}
      <mesh position={[-1, 0, -5]} receiveShadow castShadow>
        <cylinderGeometry args={[3.5, 4, 0.6, 32]} />
        <meshStandardMaterial color={color} roughness={0.85} metalness={0} />
      </mesh>

      {/* 掌心到右中脚趾的连接 */}
      <mesh position={[1, 0, -5]} receiveShadow castShadow>
        <cylinderGeometry args={[3.5, 4, 0.6, 32]} />
        <meshStandardMaterial color={color} roughness={0.85} metalness={0} />
      </mesh>

      {/* 掌心到右上脚趾的连接 */}
      <mesh position={[3, 0, -4]} receiveShadow castShadow rotation={[0, 0, Math.PI / 6]}>
        <cylinderGeometry args={[4, 4.5, 0.6, 32]} />
        <meshStandardMaterial color={color} roughness={0.85} metalness={0} />
      </mesh>

      {/* 记忆树 - 分布在整个脚掌上 */}
      {memories.map((memory, index) => {
        const treePos = treePositions[index]
        if (!treePos) return null

        const treeSeed = memory.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + index

        return (
          <MemoryTree
            key={memory.id}
            memory={memory}
            islandColor={color}
            position={[treePos.x, treePos.y + 0.6, treePos.z]}
            seed={treeSeed}
            onClick={onMemoryClick}
          />
        )
      })}

      {/* 选中状态的光晕 */}
      {isActive && (
        <pointLight
          color={color}
          intensity={0.6}
          distance={25}
          position={[0, 3, -3]}
        />
      )}
    </group>
  )
}
