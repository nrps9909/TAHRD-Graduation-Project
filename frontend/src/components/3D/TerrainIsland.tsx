/**
 * TerrainIsland - 真实的岛屿地形系统
 * 7种特色地形：梯田书架、灵感高峰、工作平原、社交谷地、生活丘陵、目标山脊、资源高地
 */

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { TerrainType } from './TerrainIsland/types'
import { REGIONS } from './TerrainIsland/constants'
import * as TerrainUtils from './TerrainIsland/terrainUtils'

// 使用從 terrainUtils 導入的函數
const { getTerrainHeight, getTerrainType, perlinNoise } = TerrainUtils

// 根据地形类型获取颜色（马卡龙配色）
function getColorByTerrain(terrainType: TerrainType, height: number, x: number, z: number): THREE.Color {
  const noise = perlinNoise(x * 0.5, z * 0.5) * 0.08

  switch (terrainType) {
    case TerrainType.OCEAN:
      // 深海：马卡龙蓝
      return new THREE.Color(0x89CFF0).lerp(new THREE.Color(0x6BB6D6), noise + 0.5)

    case TerrainType.SHALLOW:
      // 浅水：薄荷青
      return new THREE.Color(0xA8E6CF).lerp(new THREE.Color(0x7DD3C0), noise + 0.5)

    case TerrainType.BEACH:
      // 沙滩：奶油黄
      return new THREE.Color(0xFFE6B3).lerp(new THREE.Color(0xFFDDA0), noise + 0.5)

    case TerrainType.GRASSLAND:
      // 平原草地：嫩绿色
      return new THREE.Color(0xB4E7B4).lerp(new THREE.Color(0xA0D995), noise + 0.5)

    case TerrainType.TERRACE: {
      // 梯田：阶梯边缘明显
      const step = Math.floor(height * 10) / 10
      const isBorder = Math.abs(height - step) < 0.05
      if (isBorder) {
        // 边缘：深绿色
        return new THREE.Color(0x7FBA7F)
      } else {
        // 田面：金黄色
        return new THREE.Color(0xFFD98E).lerp(new THREE.Color(0xFFE5A8), noise + 0.5)
      }
    }

    case TerrainType.HILL:
      // 丘陵：草绿色
      return new THREE.Color(0xA8D5A8).lerp(new THREE.Color(0x95C795), noise + 0.5)

    case TerrainType.MOUNTAIN: {
      // 山地：橄榄绿 + 灰褐
      const rockFactor = Math.max(0, (height - 2.5) / 1.0)
      const greenColor = new THREE.Color(0x8B9D77)
      const rockColor = new THREE.Color(0xB0A090)
      return greenColor.lerp(rockColor, Math.min(rockFactor, 1))
    }

    case TerrainType.PEAK: {
      // 山峰：浅灰 + 糖霜白
      const snowFactor = Math.max(0, (height - 3.5) / 0.8)
      const stoneColor = new THREE.Color(0xCCCCCC)
      const snowColor = new THREE.Color(0xFFFAFA)
      return stoneColor.lerp(snowColor, Math.min(snowFactor, 1))
    }

    default:
      return new THREE.Color(0xB4E7B4)
  }
}

// 根据高度和位置获取最终颜色
function getColorByHeight(height: number, x: number, z: number): THREE.Color {
  const terrainType = getTerrainType(height, x, z)
  let baseColor = getColorByTerrain(terrainType, height, x, z)

  // 添加区域色调影响
  REGIONS.forEach(region => {
    const dx = x - region.pos[0]
    const dz = z - region.pos[1]
    const distToRegion = Math.sqrt(dx * dx + dz * dz)

    if (distToRegion < region.radius * 1.3) {
      const influence = Math.exp(-Math.pow(distToRegion / region.radius, 2) * 2) * 0.3
      const regionColor = new THREE.Color(region.color)
      baseColor = baseColor.lerp(regionColor, influence)
    }
  })

  return baseColor
}

export function TerrainIsland() {
  const islandRef = useRef<THREE.Group>(null)
  const waterRef = useRef<THREE.Mesh>(null)

  // 生成地形网格
  const terrainGeometry = useMemo(() => {
    const size = 70
    const segments = 180 // 提高细节
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments)

    const positions = geometry.attributes.position.array as Float32Array
    const colors: number[] = []

    // 修改每个顶点的高度
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i]
      const z = positions[i + 1]

      const height = getTerrainHeight(x, z)
      positions[i + 2] = height // Y is up in Three.js

      // 计算颜色
      const color = getColorByHeight(height, x, z)
      colors.push(color.r, color.g, color.b)
    }

    // 添加顶点颜色
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

    // 重新计算法向量以获得正确的光照
    geometry.computeVertexNormals()

    return geometry
  }, [])

  // 轻柔的浮动动画
  useFrame((state) => {
    if (islandRef.current) {
      islandRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.15
    }

    // 水面波动
    if (waterRef.current) {
      waterRef.current.position.y = -0.5 + Math.sin(state.clock.elapsedTime * 0.5) * 0.1
    }
  })

  return (
    <group ref={islandRef} position={[0, -1, 0]}>
      {/* 主要地形网格 - 使用 flatShading 让边界更清晰 */}
      <mesh
        geometry={terrainGeometry}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        castShadow
      >
        <meshStandardMaterial
          vertexColors
          roughness={0.75}
          metalness={0}
          flatShading={true}
        />
      </mesh>

      {/* 水面层 - 马卡龙蓝色 */}
      <mesh
        ref={waterRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.2, 0]}
        receiveShadow
      >
        <planeGeometry args={[90, 90, 80, 80]} />
        <meshStandardMaterial
          color="#89CFF0"
          transparent
          opacity={0.7}
          roughness={0.05}
          metalness={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 岩石基座（水下部分） */}
      <mesh position={[0, -4, 0]} receiveShadow castShadow>
        <coneGeometry args={[28, 10, 64]} />
        <meshStandardMaterial
          color="#6A8B8B"
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

      {/* 可爱的装饰云朵 */}
      {[
        { pos: [15, 8, 15], scale: 1.2 },
        { pos: [-15, 9, 15], scale: 1.0 },
        { pos: [18, 7, -12], scale: 1.1 },
        { pos: [-18, 8.5, -10], scale: 1.3 },
        { pos: [0, 10, 20], scale: 1.4 },
      ].map((cloud, i) => (
        <group key={`cloud-${i}`} position={cloud.pos as [number, number, number]}>
          {/* 主云朵 */}
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[1.2 * cloud.scale, 16, 16]} />
            <meshStandardMaterial
              color="#FFFFFF"
              transparent
              opacity={0.8}
              roughness={1}
            />
          </mesh>
          <mesh position={[-0.8 * cloud.scale, 0, 0]}>
            <sphereGeometry args={[0.9 * cloud.scale, 16, 16]} />
            <meshStandardMaterial
              color="#FFFFFF"
              transparent
              opacity={0.8}
              roughness={1}
            />
          </mesh>
          <mesh position={[0.8 * cloud.scale, 0, 0]}>
            <sphereGeometry args={[0.9 * cloud.scale, 16, 16]} />
            <meshStandardMaterial
              color="#FFFFFF"
              transparent
              opacity={0.8}
              roughness={1}
            />
          </mesh>
        </group>
      ))}

      {/* 装饰树木 - 分布在各个区域 */}
      {[
        // 学习梯田区
        { pos: [7, 0, 13], rot: 0.1, scale: 1.1 },
        { pos: [9, 0, 11], rot: -0.1, scale: 1.0 },
        // 灵感高峰区
        { pos: [-7, 0, 13], rot: 0.15, scale: 1.2 },
        { pos: [-9, 0, 11], rot: -0.15, scale: 1.3 },
        // 工作平原区
        { pos: [14, 0, 2], rot: 0.2, scale: 0.9 },
        { pos: [12, 0, -2], rot: -0.2, scale: 0.95 },
        // 社交谷地区
        { pos: [9, 0, -13], rot: 0.0, scale: 1.0 },
        { pos: [7, 0, -11], rot: 0.0, scale: 1.1 },
        // 生活丘陵区
        { pos: [-7, 0, -13], rot: 0.3, scale: 1.0 },
        { pos: [-9, 0, -11], rot: -0.3, scale: 1.1 },
        // 目标山脊区
        { pos: [-14, 0, 2], rot: 0.25, scale: 1.15 },
        { pos: [-12, 0, -2], rot: -0.25, scale: 1.2 },
        // 资源高地区
        { pos: [2, 0, 2], rot: 0.0, scale: 1.3 },
        { pos: [-2, 0, -2], rot: 0.0, scale: 1.3 },
        { pos: [0, 0, 4], rot: 0.0, scale: 1.2 },
      ].map((tree, i) => {
        const terrainY = getTerrainHeight(tree.pos[0], tree.pos[2])
        // 只在陆地上放置树木
        if (terrainY < 0.3) return null

        return (
          <group
            key={`tree-${i}`}
            position={[tree.pos[0], terrainY - 1, tree.pos[2]]}
          >
            {/* 树干 - 可爱的棕色 */}
            <mesh castShadow>
              <cylinderGeometry args={[
                0.25 * tree.scale,
                0.3 * tree.scale,
                2.2 * tree.scale,
                8
              ]} />
              <meshStandardMaterial color="#B8956A" roughness={0.85} />
            </mesh>
            {/* 树冠 - 明亮的绿色 */}
            <mesh
              position={[0, 1.6 * tree.scale, 0]}
              rotation={[0, tree.rot, 0]}
              castShadow
            >
              <coneGeometry args={[1.3 * tree.scale, 1.5 * tree.scale, 8]} />
              <meshStandardMaterial color="#7FBA7F" roughness={0.6} />
            </mesh>
            {/* 树冠装饰球（可爱感） */}
            <mesh position={[0, 2.0 * tree.scale, 0]}>
              <sphereGeometry args={[0.3 * tree.scale, 12, 12]} />
              <meshStandardMaterial color="#A8D5A8" roughness={0.5} />
            </mesh>
          </group>
        )
      })}

      {/* 石头装饰 - 分布在山地和丘陵 */}
      {[
        { pos: [10, 0, 14], size: [0.7, 0.5, 0.6] },
        { pos: [-10, 0, 14], size: [0.8, 0.6, 0.7] },
        { pos: [15, 0, 0], size: [0.6, 0.5, 0.6] },
        { pos: [-15, 0, 0], size: [0.7, 0.6, 0.7] },
        { pos: [10, 0, -14], size: [0.8, 0.6, 0.8] },
        { pos: [-10, 0, -14], size: [0.7, 0.5, 0.7] },
        { pos: [3, 0, 0], size: [0.9, 0.7, 0.8] },
        { pos: [-3, 0, 0], size: [0.9, 0.7, 0.8] },
        { pos: [0, 0, -4], size: [0.8, 0.6, 0.7] },
      ].map((rock, i) => {
        const terrainY = getTerrainHeight(rock.pos[0], rock.pos[2])
        // 只在陆地上放置石头
        if (terrainY < 0.3) return null

        return (
          <mesh
            key={`rock-${i}`}
            position={[rock.pos[0], terrainY - 1, rock.pos[2]]}
            rotation={[
              Math.random() * 0.4 - 0.2,
              Math.random() * Math.PI,
              Math.random() * 0.4 - 0.2
            ]}
            castShadow
          >
            <boxGeometry args={rock.size as [number, number, number]} />
            <meshStandardMaterial
              color="#B0A090"
              roughness={0.9}
              metalness={0.05}
            />
          </mesh>
        )
      })}
    </group>
  )
}
