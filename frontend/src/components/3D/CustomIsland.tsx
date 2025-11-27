/**
 * CustomIsland - 自定义形状的岛屿
 * 根据玩家绘制的 2D 轮廓生成 3D 岛屿
 */

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Memory } from '../../types/island'
import { MemoryTree } from './MemoryTree'
import { generateTreePositions } from '../../utils/treePositioning'
import { IslandBoundaryConfig } from '../../utils/islandBoundary'

interface Point {
  x: number
  y: number
}

interface CustomIslandProps {
  position?: [number, number, number]
  color?: string
  scale?: number
  isActive?: boolean
  memories?: Memory[]
  islandId?: string
  onMemoryClick?: (memory: Memory) => void
  shapePoints: Point[] // 玩家繪製的形狀點
  height?: number // 島嶼高度
  bevel?: number // 邊緣斜率
}

export function CustomIsland({
  position = [0, 0, 0],
  color = '#90C695',
  scale = 1.0,
  isActive = false,
  memories = [],
  islandId = 'custom',
  onMemoryClick,
  shapePoints,
  height = 2,
  bevel = 0.5
}: CustomIslandProps) {
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

    // 使用自定义形状的边界配置
    const boundaryConfig: IslandBoundaryConfig = {
      shape: 'custom',
      customPoints: shapePoints,
      scaleFactor: 20,
      margin: 2
    }

    return generateTreePositions(memories.length, 15, 1.5, seed, boundaryConfig)
  }, [memories.length, islandId, shapePoints])

  // 根据玩家绘制的点创建 Three.js Shape
  const shape = useMemo(() => {
    if (shapePoints.length < 3) return null

    const shape = new THREE.Shape()

    // 缩放点到合适的岛屿大小
    const scaleFactor = 20 // 调整岛屿大小

    shape.moveTo(shapePoints[0].x * scaleFactor, shapePoints[0].y * scaleFactor)
    for (let i = 1; i < shapePoints.length; i++) {
      shape.lineTo(shapePoints[i].x * scaleFactor, shapePoints[i].y * scaleFactor)
    }
    shape.closePath()

    return shape
  }, [shapePoints])

  // 創建擠出幾何體（3D形狀）
  const extrudeSettings = useMemo(() => ({
    depth: height,      // 島嶼厚度（可調整）
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3
  }), [height, bevel])

  const topLayerSettings = useMemo(() => ({
    depth: height * 0.25,
    bevelEnabled: true,
    bevelThickness: bevel * 0.6,
    bevelSize: bevel * 0.6,
    bevelSegments: 2
  }), [height, bevel])


  if (!shape) {
    return null
  }

  return (
    <group
      ref={islandRef}
      position={[position[0], position[1] - 1, position[2]]}
      scale={scale}
    >
      {/* 底部基座 - 米色 */}
      <mesh position={[0, -0.8, 0]} receiveShadow castShadow rotation={[-Math.PI / 2, 0, 0]}>
        <extrudeGeometry args={[shape, extrudeSettings]} />
        <meshStandardMaterial
          color="#D4C5B9"
          roughness={0.9}
          metalness={0}
        />
      </mesh>

      {/* 主体层 - 玩家选择的颜色 */}
      <mesh position={[0, -0.2, 0]} receiveShadow castShadow rotation={[-Math.PI / 2, 0, 0]}>
        <extrudeGeometry args={[shape, extrudeSettings]} />
        <meshStandardMaterial
          color={color}
          roughness={0.85}
          metalness={0}
          emissive={isActive ? color : '#000000'}
          emissiveIntensity={isActive ? 0.2 : 0}
        />
      </mesh>

      {/* 顶部平台 - 浅色（种树区域）*/}
      <mesh position={[0, 0.6, 0]} receiveShadow castShadow rotation={[-Math.PI / 2, 0, 0]}>
        <extrudeGeometry args={[shape, topLayerSettings]} />
        <meshStandardMaterial
          color={new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.2).getStyle()}
          roughness={0.8}
          metalness={0}
          emissive={isActive ? color : '#000000'}
          emissiveIntensity={isActive ? 0.15 : 0}
        />
      </mesh>

      {/* 记忆树 - 分布在自定义形状内 */}
      {memories.map((memory, index) => {
        const treePos = treePositions[index]
        if (!treePos) return null

        const treeSeed = memory.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + index

        // 樹根貼合頂部平台 (頂部 Y=0.6 + depth*0.25/2)
        // 考慮到整個 group 有 -1 的 Y 偏移，頂部實際在 0.6 + height*0.25
        const surfaceY = 0.6 + height * 0.25 + bevel * 0.6

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

      {/* 选中状态的光晕 */}
      {isActive && (
        <pointLight
          color={color}
          intensity={0.6}
          distance={25}
          position={[0, 3, 0]}
        />
      )}
    </group>
  )
}
