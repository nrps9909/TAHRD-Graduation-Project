/**
 * 紋理材質配置
 *
 * 使用說明：
 * 1. 將紋理圖片放入 public/textures/[texture-id]/ 目錄
 * 2. 每個紋理目錄應包含以下文件（可選）：
 *    - diffuse.jpg/png - 漫反射貼圖（基本顏色）
 *    - normal.jpg/png - 法線貼圖（表面細節）
 *    - roughness.jpg/png - 粗糙度貼圖
 *    - ao.jpg/png - 環境光遮蔽貼圖
 */

export interface TextureConfig {
  id: string
  name: string
  nameChinese: string
  emoji: string
  color: string // 備用顏色（如果沒有紋理圖片）
  roughness: number // 0-1，材質粗糙度
  metalness: number // 0-1，金屬度
  // 紋理路徑（相對於 public 目錄）
  paths?: {
    diffuse?: string
    normal?: string
    roughness?: string
    ao?: string
  }
}

export const TEXTURE_CONFIGS: TextureConfig[] = [
  {
    id: 'grass',
    name: 'Grass',
    nameChinese: '草地',
    emoji: '🌱',
    color: '#A8E6A3',
    roughness: 0.85,
    metalness: 0,
    paths: {
      diffuse: '/textures/grass/diffuse.jpg',
      normal: '/textures/grass/normal.jpg',
      roughness: '/textures/grass/roughness.jpg',
      ao: '/textures/grass/ao.jpg',
    }
  },
  {
    id: 'sand',
    name: 'Sand',
    nameChinese: '沙灘',
    emoji: '🏖️',
    color: '#F5E6D3',
    roughness: 0.9,
    metalness: 0,
    paths: {
      diffuse: '/textures/sand/diffuse.jpg',
      normal: '/textures/sand/normal.jpg',
      roughness: '/textures/sand/roughness.jpg',
    }
  },
  {
    id: 'stone',
    name: 'Stone',
    nameChinese: '石頭',
    emoji: '🪨',
    color: '#A0A0A0',
    roughness: 0.8,
    metalness: 0.1,
    paths: {
      diffuse: '/textures/stone/diffuse.jpg',
      normal: '/textures/stone/normal.jpg',
      roughness: '/textures/stone/roughness.jpg',
      ao: '/textures/stone/ao.jpg',
    }
  },
  {
    id: 'snow',
    name: 'Snow',
    nameChinese: '雪地',
    emoji: '❄️',
    color: '#FFFFFF',
    roughness: 0.5,
    metalness: 0,
    paths: {
      diffuse: '/textures/snow/diffuse.jpg',
      normal: '/textures/snow/normal.jpg',
      roughness: '/textures/snow/roughness.jpg',
    }
  },
  {
    id: 'dirt',
    name: 'Dirt',
    nameChinese: '泥土',
    emoji: '🌍',
    color: '#8B7355',
    roughness: 0.9,
    metalness: 0,
    paths: {
      diffuse: '/textures/dirt/diffuse.jpg',
      normal: '/textures/dirt/normal.jpg',
      roughness: '/textures/dirt/roughness.jpg',
      ao: '/textures/dirt/ao.jpg',
    }
  },
  {
    id: 'forest',
    name: 'Forest',
    nameChinese: '森林',
    emoji: '🌲',
    color: '#2D5016',
    roughness: 0.85,
    metalness: 0,
    paths: {
      diffuse: '/textures/forest/diffuse.jpg',
      normal: '/textures/forest/normal.jpg',
      roughness: '/textures/forest/roughness.jpg',
    }
  },
  {
    id: 'desert',
    name: 'Desert',
    nameChinese: '沙漠',
    emoji: '🏜️',
    color: '#EDC9AF',
    roughness: 0.9,
    metalness: 0,
    paths: {
      diffuse: '/textures/desert/diffuse.jpg',
      normal: '/textures/desert/normal.jpg',
      roughness: '/textures/desert/roughness.jpg',
    }
  },
  {
    id: 'lava',
    name: 'Lava',
    nameChinese: '岩漿',
    emoji: '🌋',
    color: '#FF4500',
    roughness: 0.3,
    metalness: 0.2,
    paths: {
      diffuse: '/textures/lava/diffuse.jpg',
      normal: '/textures/lava/normal.jpg',
    }
  },
]

/**
 * 根據紋理 ID 獲取配置
 */
export function getTextureConfig(textureId: string): TextureConfig | undefined {
  return TEXTURE_CONFIGS.find(config => config.id === textureId)
}

/**
 * 獲取所有可用的紋理 ID
 */
export function getAvailableTextures(): string[] {
  return TEXTURE_CONFIGS.map(config => config.id)
}
