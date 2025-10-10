/**
 * Island Boundary Utilities
 * 島嶼邊界工具 - 確保知識樹/記憶花朵不會超出島嶼邊界
 */

export interface Point2D {
  x: number
  y: number
}

export interface IslandBounds {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export type IslandShape =
  | 'circle'
  | 'hexagon'
  | 'square'
  | 'organic'
  | 'paw'
  | 'custom'

export interface IslandBoundaryConfig {
  shape: IslandShape
  radius?: number // For circle/hexagon
  width?: number  // For square
  height?: number // For square
  customPoints?: Point2D[] // For custom shapes
  scaleFactor?: number // For custom shapes
  margin?: number // Safety margin from edge (default: 2)
}

/**
 * 計算島嶼的邊界範圍
 */
export function calculateIslandBounds(config: IslandBoundaryConfig): IslandBounds {
  const margin = config.margin ?? 2

  switch (config.shape) {
    case 'circle':
    case 'organic': {
      const radius = (config.radius ?? 15) - margin
      return {
        minX: -radius,
        maxX: radius,
        minZ: -radius,
        maxZ: radius
      }
    }

    case 'hexagon': {
      const radius = (config.radius ?? 15) - margin
      // 六邊形的內切圓半徑
      const inRadius = radius * Math.cos(Math.PI / 6)
      return {
        minX: -inRadius,
        maxX: inRadius,
        minZ: -radius * 0.866, // sqrt(3)/2
        maxZ: radius * 0.866
      }
    }

    case 'square': {
      const width = (config.width ?? 20) / 2 - margin
      const height = (config.height ?? 20) / 2 - margin
      return {
        minX: -width,
        maxX: width,
        minZ: -height,
        maxZ: height
      }
    }

    case 'paw': {
      // 肉球形狀 - 近似為圓形但稍微調整
      const radius = (config.radius ?? 15) - margin
      return {
        minX: -radius * 0.9,
        maxX: radius * 0.9,
        minZ: -radius * 0.9,
        maxZ: radius * 0.9
      }
    }

    case 'custom': {
      if (!config.customPoints || config.customPoints.length < 3) {
        console.warn('Custom shape requires at least 3 points, falling back to circle')
        const radius = 15 - margin
        return {
          minX: -radius,
          maxX: radius,
          minZ: -radius,
          maxZ: radius
        }
      }

      const scaleFactor = config.scaleFactor ?? 20
      const xs = config.customPoints.map(p => p.x * scaleFactor)
      const zs = config.customPoints.map(p => p.y * scaleFactor)

      return {
        minX: Math.min(...xs) + margin,
        maxX: Math.max(...xs) - margin,
        minZ: Math.min(...zs) + margin,
        maxZ: Math.max(...zs) - margin
      }
    }

    default: {
      const defaultRadius = 15 - margin
      return {
        minX: -defaultRadius,
        maxX: defaultRadius,
        minZ: -defaultRadius,
        maxZ: defaultRadius
      }
    }
  }
}

/**
 * 檢查點是否在島嶼邊界內（精確檢查）
 * 對於圓形和自定義形狀，會進行更精確的檢測
 */
export function isPointInIsland(
  x: number,
  z: number,
  config: IslandBoundaryConfig
): boolean {
  const margin = config.margin ?? 2

  switch (config.shape) {
    case 'circle':
    case 'organic': {
      const radius = (config.radius ?? 15) - margin
      const distance = Math.sqrt(x * x + z * z)
      return distance <= radius
    }

    case 'hexagon': {
      const radius = (config.radius ?? 15) - margin
      // 六邊形檢測：檢查6個邊的約束
      const angle = Math.atan2(z, x)
      const hexRadius = radius / Math.cos(angle % (Math.PI / 3) - Math.PI / 6)
      const distance = Math.sqrt(x * x + z * z)
      return distance <= hexRadius
    }

    case 'square': {
      const bounds = calculateIslandBounds(config)
      return x >= bounds.minX && x <= bounds.maxX &&
             z >= bounds.minZ && z <= bounds.maxZ
    }

    case 'paw': {
      const radius = (config.radius ?? 15) - margin
      const distance = Math.sqrt(x * x + z * z)
      return distance <= radius * 0.9
    }

    case 'custom': {
      if (!config.customPoints || config.customPoints.length < 3) {
        return true
      }

      const scaleFactor = config.scaleFactor ?? 20
      const scaledPoints = config.customPoints.map(p => ({
        x: p.x * scaleFactor,
        y: p.y * scaleFactor
      }))

      // 使用射線法檢測點是否在多邊形內
      return isPointInPolygon(x, z, scaledPoints, margin)
    }

    default:
      return true
  }
}

/**
 * 將位置限制在島嶼邊界內
 * 如果位置超出邊界，會將其推回到最近的有效位置
 */
export function constrainToIslandBounds(
  x: number,
  z: number,
  config: IslandBoundaryConfig
): { x: number; z: number } {
  if (isPointInIsland(x, z, config)) {
    return { x, z }
  }

  const bounds = calculateIslandBounds(config)

  switch (config.shape) {
    case 'circle':
    case 'organic':
    case 'paw': {
      // 將點投影到圓的邊界上
      const radius = (config.radius ?? 15) - (config.margin ?? 2)
      const distance = Math.sqrt(x * x + z * z)
      const scale = radius / distance
      return {
        x: x * scale * 0.95, // 0.95 給一點安全邊距
        z: z * scale * 0.95
      }
    }

    case 'hexagon': {
      // 將點投影到最近的六邊形邊
      const angle = Math.atan2(z, x)
      const radius = (config.radius ?? 15) - (config.margin ?? 2)
      const hexRadius = radius / Math.cos(angle % (Math.PI / 3) - Math.PI / 6) * 0.95
      return {
        x: Math.cos(angle) * hexRadius,
        z: Math.sin(angle) * hexRadius
      }
    }

    case 'square':
    case 'custom':
    default: {
      // 簡單地限制在矩形邊界內
      return {
        x: Math.max(bounds.minX, Math.min(bounds.maxX, x)),
        z: Math.max(bounds.minZ, Math.min(bounds.maxZ, z))
      }
    }
  }
}

/**
 * 批量約束多個位置到島嶼邊界內
 */
export function constrainPositionsToIsland(
  positions: Array<{ x: number; z: number }>,
  config: IslandBoundaryConfig
): Array<{ x: number; z: number }> {
  return positions.map(pos => constrainToIslandBounds(pos.x, pos.z, config))
}

/**
 * 點在多邊形內的檢測（射線法）
 */
function isPointInPolygon(
  x: number,
  z: number,
  polygon: Point2D[],
  margin: number = 0
): boolean {
  let inside = false
  const len = polygon.length

  for (let i = 0, j = len - 1; i < len; j = i++) {
    const xi = polygon[i].x - margin
    const zi = polygon[i].y - margin
    const xj = polygon[j].x - margin
    const zj = polygon[j].y - margin

    const intersect = ((zi > z) !== (zj > z)) &&
      (x < (xj - xi) * (z - zi) / (zj - zi) + xi)

    if (intersect) inside = !inside
  }

  return inside
}

/**
 * 獲取島嶼的有效放置半徑（用於生成隨機位置）
 * 考慮形狀和邊距，返回一個安全的放置範圍
 */
export function getEffectivePlacementRadius(config: IslandBoundaryConfig): number {
  const margin = config.margin ?? 2
  const safetyFactor = 0.85 // 額外的安全係數

  switch (config.shape) {
    case 'circle':
    case 'organic':
    case 'paw':
      return (config.radius ?? 15) * safetyFactor - margin

    case 'hexagon':
      return (config.radius ?? 15) * Math.cos(Math.PI / 6) * safetyFactor - margin

    case 'square': {
      const width = config.width ?? 20
      const height = config.height ?? 20
      return Math.min(width, height) / 2 * safetyFactor - margin
    }

    case 'custom': {
      if (!config.customPoints || config.customPoints.length < 3) {
        return 15 * safetyFactor - margin
      }
      const bounds = calculateIslandBounds(config)
      const width = bounds.maxX - bounds.minX
      const height = bounds.maxZ - bounds.minZ
      return Math.min(width, height) / 2 * safetyFactor
    }

    default:
      return 15 * safetyFactor - margin
  }
}
