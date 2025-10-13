/**
 * IslandZones - 岛屿分区视觉化组件
 * 显示 7 个不同类型的记忆分区
 */

import { useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { getTerrainHeight } from './TerrainIsland'

// 7个分区的配置 - 自动匹配地形高度
const ZONES = [
  {
    id: 'learning',
    name: '學習梯田',
    emoji: '📚',
    color: '#4A90E2',
    x: 8,
    z: 12,
    rotation: 0
  },
  {
    id: 'inspiration',
    name: '靈感高峰',
    emoji: '💡',
    color: '#F5A623',
    x: -8,
    z: 12,
    rotation: Math.PI / 7
  },
  {
    id: 'work',
    name: '工作平原',
    emoji: '💼',
    color: '#7B68EE',
    x: 13,
    z: 0,
    rotation: (Math.PI * 2) / 7
  },
  {
    id: 'social',
    name: '社交谷地',
    emoji: '🤝',
    color: '#FF6B9D',
    x: 8,
    z: -12,
    rotation: (Math.PI * 3) / 7
  },
  {
    id: 'life',
    name: '生活丘陵',
    emoji: '🌸',
    color: '#50C878',
    x: -8,
    z: -12,
    rotation: (Math.PI * 4) / 7
  },
  {
    id: 'goals',
    name: '目標山脊',
    emoji: '🎯',
    color: '#E74C3C',
    x: -13,
    z: 0,
    rotation: (Math.PI * 5) / 7
  },
  {
    id: 'resources',
    name: '資源高地',
    emoji: '📦',
    color: '#9B59B6',
    x: 0,
    z: 0,
    rotation: (Math.PI * 6) / 7
  }
]

interface IslandZonesProps {
  visible?: boolean
}

export function IslandZones({ visible = true }: IslandZonesProps) {
  if (!visible) return null

  return (
    <group>
      {ZONES.map((zone) => (
        <Zone key={zone.id} {...zone} />
      ))}
    </group>
  )
}

interface ZoneProps {
  id: string
  name: string
  emoji: string
  color: string
  x: number
  z: number
  rotation: number
}

function Zone({ color, x, z, rotation }: ZoneProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  // 根据地形高度计算位置
  const terrainY = getTerrainHeight(x, z)
  const position: [number, number, number] = [x, terrainY - 1, z]

  // 呼吸動畫
  useFrame((state) => {
    if (meshRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 0.5 + rotation) * 0.05
      meshRef.current.scale.set(scale, 1, scale)

      // 微妙的旋轉
      meshRef.current.rotation.y = rotation + Math.sin(state.clock.elapsedTime * 0.3) * 0.1
    }
  })

  return (
    <group position={position}>
      {/* 底座圓形區域 - 扩大尺寸 */}
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
      >
        <cylinderGeometry args={[2.4, 2.7, 0.15, 48]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.3}
          emissive={color}
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* 光環效果 - 扩大 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
        <ringGeometry args={[2.7, 3.3, 48]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.4}
          emissive={color}
          emissiveIntensity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 中心光柱 */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.15, 0.3, 3, 24]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.5}
          emissive={color}
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* 頂部光球 */}
      <mesh position={[0, 3, 0]}>
        <sphereGeometry args={[0.45, 24, 24]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.6}
          emissive={color}
          emissiveIntensity={0.7}
        />
      </mesh>

      {/* 點光源 */}
      <pointLight
        position={[0, 3, 0]}
        intensity={1.2}
        distance={15}
        color={color}
      />
    </group>
  )
}
