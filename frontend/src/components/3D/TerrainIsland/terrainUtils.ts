/**
 * TerrainIsland - Terrain generation utilities
 */

import { TerrainType } from './types'
import { REGIONS } from './constants'

// 改进的多层Perlin噪声
export function hash(x: number, y: number): number {
  let h = x * 374761393 + y * 668265263
  h = (h ^ (h >> 13)) * 1274126177
  return (h ^ (h >> 16)) / 2147483648.0
}

export function interpolate(a: number, b: number, t: number): number {
  return a + (b - a) * t * t * (3 - 2 * t) // 平滑插值
}

export function perlinNoise(x: number, y: number, scale: number = 1): number {
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
export function multiOctaveNoise(x: number, y: number, octaves: number = 4): number {
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
export function terraceEffect(height: number, steps: number = 6): number {
  return Math.floor(height * steps) / steps
}

// 根据区域类型修改地形
export function applyTerrainType(baseHeight: number, terrainType: TerrainType, x: number, z: number): number {
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
export function getIslandShape(x: number, z: number): number {
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
export function getTerrainHeight(x: number, z: number): number {
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
export function getTerrainType(height: number, x: number, z: number): TerrainType {
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
