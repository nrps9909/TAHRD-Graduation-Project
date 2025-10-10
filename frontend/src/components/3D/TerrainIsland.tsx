/**
 * TerrainIsland - 真实的岛屿地形系统
 * 7种特色地形：梯田书架、灵感高峰、工作平原、社交谷地、生活丘陵、目标山脊、资源高地
 */

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// 地形类型枚举
enum TerrainType {
  OCEAN = 'ocean',           // 深海
  SHALLOW = 'shallow',       // 浅水
  BEACH = 'beach',           // 沙滩
  GRASSLAND = 'grassland',   // 草地
  TERRACE = 'terrace',       // 梯田
  HILL = 'hill',             // 丘陵
  MOUNTAIN = 'mountain',     // 山地
  PEAK = 'peak'              // 山峰
}

// 7个区域的定义（不同的地形特征）
const REGIONS = [
  {
    id: 'learning',
    pos: [8, 12],
    type: TerrainType.TERRACE,
    height: 2.2,
    radius: 5.5,
    color: '#A8D5E6',
    name: '学习梯田' // 阶梯状书架地形
  },
  {
    id: 'inspiration',
    pos: [-8, 12],
    type: TerrainType.PEAK,
    height: 3.2,
    radius: 4.5,
    color: '#FFE5B8',
    name: '灵感高峰' // 尖锐山峰
  },
  {
    id: 'work',
    pos: [13, 0],
    type: TerrainType.GRASSLAND,
    height: 1.5,
    radius: 5,
    color: '#D8C8E8',
    name: '工作平原' // 平整的农田
  },
  {
    id: 'social',
    pos: [8, -12],
    type: TerrainType.HILL,
    height: 1.8,
    radius: 5.2,
    color: '#FFCCE5',
    name: '社交谷地' // 温和的谷地
  },
  {
    id: 'life',
    pos: [-8, -12],
    type: TerrainType.HILL,
    height: 1.6,
    radius: 5.2,
    color: '#C8E6C8',
    name: '生活丘陵' // 起伏的丘陵
  },
  {
    id: 'goals',
    pos: [-13, 0],
    type: TerrainType.MOUNTAIN,
    height: 2.0,
    radius: 4.5,
    color: '#F8C8C8',
    name: '目标山脊' // 箭头形山脊
  },
  {
    id: 'resources',
    pos: [0, 0],
    type: TerrainType.MOUNTAIN,
    height: 2.8,
    radius: 6,
    color: '#90C695',
    name: '资源高地' // 中央宝库山
  }
]

// 改进的多层Perlin噪声
function hash(x: number, y: number): number {
  let h = x * 374761393 + y * 668265263
  h = (h ^ (h >> 13)) * 1274126177
  return (h ^ (h >> 16)) / 2147483648.0
}

function interpolate(a: number, b: number, t: number): number {
  return a + (b - a) * t * t * (3 - 2 * t) // 平滑插值
}

function perlinNoise(x: number, y: number, scale: number = 1): number {
  x *= scale
  y *= scale

  const x0 = Math.floor(x)
  const x1 = x0 + 1
  const y0 = Math.floor(y)
  const y1 = y0 + 1

  const sx = x - x0
  const sy = y - y0

  const n00 = hash(x0, y0)
  const n10 = hash(x1, y0)
  const n01 = hash(x0, y1)
  const n11 = hash(x1, y1)

  const nx0 = interpolate(n00, n10, sx)
  const nx1 = interpolate(n01, n11, sx)

  return interpolate(nx0, nx1, sy) * 2 - 1
}

// 多层噪声叠加
function multiOctaveNoise(x: number, y: number, octaves: number = 4): number {
  let total = 0
  let frequency = 1
  let amplitude = 1
  let maxValue = 0

  for (let i = 0; i < octaves; i++) {
    total += perlinNoise(x, y, frequency * 0.05) * amplitude
    maxValue += amplitude
    amplitude *= 0.5
    frequency *= 2
  }

  return total / maxValue
}

// 梯田效果
function terraceEffect(height: number, steps: number = 6): number {
  return Math.floor(height * steps) / steps
}

// 根据区域类型修改地形
function applyTerrainType(baseHeight: number, terrainType: TerrainType, x: number, z: number): number {
  switch (terrainType) {
    case TerrainType.TERRACE:
      // 梯田：阶梯状
      return terraceEffect(baseHeight, 8)

    case TerrainType.PEAK:
      // 山峰：尖锐
      return baseHeight * 1.3 + Math.abs(perlinNoise(x, z, 0.3)) * 0.3

    case TerrainType.GRASSLAND:
      // 平原：平整
      return baseHeight * 0.8 + multiOctaveNoise(x, z, 2) * 0.1

    case TerrainType.HILL:
      // 丘陵：柔和起伏
      return baseHeight + multiOctaveNoise(x, z, 3) * 0.4

    case TerrainType.MOUNTAIN:
      // 山地：强烈起伏
      return baseHeight * 1.1 + Math.abs(multiOctaveNoise(x, z, 4)) * 0.5

    default:
      return baseHeight
  }
}

// 计算岛屿形状（花瓣形，不是圆形）
function getIslandShape(x: number, z: number): number {
  const angle = Math.atan2(z, x)
  const distFromCenter = Math.sqrt(x * x + z * z)

  // 7瓣花形岛屿 - 对应7个区域
  const petalCount = 7
  const petalVariation = Math.cos(angle * petalCount) * 0.3 + 1.0
  const islandRadius = 20 * petalVariation

  // 添加不规则性
  const irregularity = perlinNoise(x * 0.05, z * 0.05) * 3
  const adjustedRadius = islandRadius + irregularity

  if (distFromCenter > adjustedRadius) {
    return 0 // 岛外
  }

  const normalizedDist = distFromCenter / adjustedRadius
  return 1 - normalizedDist // 0到1，中心是1
}

// 计算某点的地形高度
function getTerrainHeight(x: number, z: number): number {
  // 1. 获取岛屿形状因子（花瓣形）
  const islandFactor = getIslandShape(x, z)

  if (islandFactor <= 0) {
    // 海洋区域
    return -2.5 + multiOctaveNoise(x, z, 2) * 0.3
  }

  // 2. 基础高度（中心高，边缘低）
  const baseHeight = Math.pow(islandFactor, 2) * 2.5

  // 3. 找到最接近的区域并应用其特征
  let regionalHeight = 0
  let totalInfluence = 0

  REGIONS.forEach(region => {
    const dx = x - region.pos[0]
    const dz = z - region.pos[1]
    const distToRegion = Math.sqrt(dx * dx + dz * dz)

    if (distToRegion < region.radius * 1.8) {
      // 更强的区域影响
      const influence = Math.exp(-Math.pow(distToRegion / region.radius, 2) * 1.2)
      const height = applyTerrainType(region.height, region.type, x, z)

      regionalHeight += influence * height
      totalInfluence += influence
    }
  })

  // 4. 混合基础高度和区域高度
  let finalHeight = baseHeight
  if (totalInfluence > 0) {
    finalHeight = baseHeight * 0.3 + regionalHeight * 1.5
  }

  // 5. 添加清晰的细节噪声
  finalHeight += perlinNoise(x * 0.3, z * 0.3) * 0.25

  // 6. 边缘平滑过渡到水面
  if (islandFactor < 0.15) {
    finalHeight *= (islandFactor / 0.15)
  }

  return finalHeight
}

// 获取地形类型
function getTerrainType(height: number, x: number, z: number): TerrainType {
  // 基于高度的地形类型
  if (height < -1.5) return TerrainType.OCEAN
  if (height < -0.5) return TerrainType.SHALLOW
  if (height < 0.3) return TerrainType.BEACH

  // 检查是否在特殊区域
  for (const region of REGIONS) {
    const dx = x - region.pos[0]
    const dz = z - region.pos[1]
    const distToRegion = Math.sqrt(dx * dx + dz * dz)

    if (distToRegion < region.radius) {
      return region.type
    }
  }

  // 默认根据高度
  if (height < 1.0) return TerrainType.GRASSLAND
  if (height < 2.0) return TerrainType.HILL
  return TerrainType.MOUNTAIN
}

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

// 导出高度计算函数供其他组件使用
export { getTerrainHeight, REGIONS }
