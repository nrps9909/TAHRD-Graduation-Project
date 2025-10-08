/**
 * 島嶼配置 - 定義所有分區和記憶花的資訊
 */

import { AssistantType } from '@prisma/client'
import { IslandRegion, IslandConfig } from './types'

/**
 * 島嶼分區配置
 *
 * 地形佈局（俯視圖）：
 *
 *              北方 - 山丘區
 *            📚 學習高地（藍紫色）
 *                /    \
 *      💡 靈感森林        🎯 目標峰頂
 *     (金黃色)           (紅橙色)
 *           \               /
 *             \           /
 *          🏠 中央廣場（起點）
 *             /           \
 *           /               \
 *      👥 社交海灘        💼 工作碼頭
 *     (粉藍色)           (深藍色)
 *           \           /
 *            \         /
 *            🌱 生活花園
 *             (翠綠色)
 *
 *            南方 - 平原區
 */

export const ISLAND_REGIONS: IslandRegion[] = [
  {
    id: AssistantType.LEARNING,
    name: '學習高地',
    emoji: '📚',
    color: '#B3B3FF',  // 藍紫色
    description: '寧靜的山丘，適合專注學習和深度思考',
    flowerType: '櫻花',
    environment: '微風吹動書頁聲，遠處有鳥鳴',
    position: { x: 0, y: 5, z: -20 }  // 北方，較高
  },
  {
    id: AssistantType.INSPIRATION,
    name: '靈感森林',
    emoji: '💡',
    color: '#FFFACD',  // 金黃色
    description: '發光的樹林，創意和靈感的源泉',
    flowerType: '星光花',
    environment: '螢火蟲飛舞，樹葉發光',
    position: { x: -15, y: 2, z: -10 }  // 西北方
  },
  {
    id: AssistantType.GOALS,
    name: '目標峰頂',
    emoji: '🎯',
    color: '#FFB3B3',  // 紅橙色
    description: '旗幟飄揚的山頂，象徵目標和成就',
    flowerType: '火焰花',
    environment: '旗幟飄動聲，激勵人心的氛圍',
    position: { x: 15, y: 6, z: -10 }  // 東北方，最高
  },
  {
    id: AssistantType.WORK,
    name: '工作碼頭',
    emoji: '💼',
    color: '#B3D9FF',  // 深藍色
    description: '整齊的木製碼頭，專業且有效率',
    flowerType: '齒輪花',
    environment: '海浪拍打聲，船隻停靠',
    position: { x: 18, y: 0, z: 5 }  // 東方，臨海
  },
  {
    id: AssistantType.SOCIAL,
    name: '社交海灘',
    emoji: '👥',
    color: '#FFE5F0',  // 粉藍色
    description: '柔軟的沙灘，溫暖而開放',
    flowerType: '熱帶花',
    environment: '海鷗叫聲，海浪聲',
    position: { x: -18, y: 0, z: 5 }  // 西方，臨海
  },
  {
    id: AssistantType.LIFE,
    name: '生活花園',
    emoji: '🌱',
    color: '#D9FFB3',  // 翠綠色
    description: '溫馨的小花園，充滿生活氣息',
    flowerType: '向日葵',
    environment: '蟲鳴鳥叫，微風拂面',
    position: { x: 0, y: 1, z: 15 }  // 南方，平原
  },
  {
    id: AssistantType.RESOURCES,
    name: '資源倉庫',
    emoji: '📦',
    color: '#E5B3FF',  // 淡紫色
    description: '藏寶箱散落的區域，充滿驚喜',
    flowerType: '水晶花',
    environment: '寶箱開啟聲，神秘氛圍',
    position: { x: -10, y: 1, z: 12 }  // 西南方
  }
]

/**
 * 記憶花類型配置
 */
export const FLOWER_TYPES = {
  [AssistantType.LEARNING]: {
    name: '櫻花',
    model: '/models/flowers/sakura.glb',
    baseSize: 1.0,
    baseColor: '#FFB3E6',  // 粉白色
    petals: 5,
    description: '優雅的櫻花，象徵知識的綻放'
  },
  [AssistantType.INSPIRATION]: {
    name: '星光花',
    model: '/models/flowers/starlight.glb',
    baseSize: 1.2,
    baseColor: '#FFD700',  // 金黃色
    petals: 8,
    description: '閃爍的星光花，代表靈感的火花'
  },
  [AssistantType.GOALS]: {
    name: '火焰花',
    model: '/models/flowers/flame.glb',
    baseSize: 1.3,
    baseColor: '#FF6B6B',  // 橙紅色
    petals: 6,
    description: '熱情的火焰花，象徵目標的熱度'
  },
  [AssistantType.WORK]: {
    name: '齒輪花',
    model: '/models/flowers/gear.glb',
    baseSize: 0.9,
    baseColor: '#87CEEB',  // 銀藍色
    petals: 6,
    description: '精密的齒輪花，代表工作的效率'
  },
  [AssistantType.SOCIAL]: {
    name: '熱帶花',
    model: '/models/flowers/tropical.glb',
    baseSize: 1.1,
    baseColor: '#FF69B4',  // 多彩
    petals: 7,
    description: '繽紛的熱帶花，象徵人際的多彩'
  },
  [AssistantType.LIFE]: {
    name: '向日葵',
    model: '/models/flowers/sunflower.glb',
    baseSize: 1.4,
    baseColor: '#FFD700',  // 溫暖黃
    petals: 12,
    description: '陽光般的向日葵，代表生活的溫暖'
  },
  [AssistantType.RESOURCES]: {
    name: '水晶花',
    model: '/models/flowers/crystal.glb',
    baseSize: 0.8,
    baseColor: '#E0BBE4',  // 七彩
    petals: 5,
    description: '晶瑩的水晶花，象徵資源的珍貴'
  },
  [AssistantType.CHIEF]: {
    name: '皇冠花',
    model: '/models/flowers/crown.glb',
    baseSize: 1.5,
    baseColor: '#FFD700',  // 金色
    petals: 10,
    description: '華麗的皇冠花，代表全局的智慧'
  }
}

/**
 * 花朵大小對應重要度
 */
export const FLOWER_SIZE_MAPPING = {
  // 重要度 1-3：小花苞
  small: {
    minImportance: 1,
    maxImportance: 3,
    sizeMultiplier: 0.6
  },
  // 重要度 4-6：正常花朵
  medium: {
    minImportance: 4,
    maxImportance: 6,
    sizeMultiplier: 1.0
  },
  // 重要度 7-9：盛開大花
  large: {
    minImportance: 7,
    maxImportance: 9,
    sizeMultiplier: 1.5
  },
  // 重要度 10：傳奇花朵
  legendary: {
    minImportance: 10,
    maxImportance: 10,
    sizeMultiplier: 2.0
  }
}

/**
 * 根據重要度計算花朵大小
 */
export function calculateFlowerSize(importance: number, baseSize: number): number {
  let multiplier = 1.0

  if (importance <= 3) {
    multiplier = FLOWER_SIZE_MAPPING.small.sizeMultiplier
  } else if (importance <= 6) {
    multiplier = FLOWER_SIZE_MAPPING.medium.sizeMultiplier
  } else if (importance <= 9) {
    multiplier = FLOWER_SIZE_MAPPING.large.sizeMultiplier
  } else {
    multiplier = FLOWER_SIZE_MAPPING.legendary.sizeMultiplier
  }

  return baseSize * multiplier
}

/**
 * 根據最近訪問時間計算透明度
 */
export function calculateFlowerOpacity(lastVisited: Date): number {
  const now = new Date()
  const daysSinceVisit = Math.floor(
    (now.getTime() - lastVisited.getTime()) / (1000 * 60 * 60 * 24)
  )

  // 0-7天：完全不透明 (1.0)
  if (daysSinceVisit <= 7) return 1.0

  // 8-30天：逐漸變淡 (1.0 -> 0.5)
  if (daysSinceVisit <= 30) {
    return 1.0 - ((daysSinceVisit - 7) / 23) * 0.5
  }

  // 30天以上：半透明 (0.5)
  return 0.5
}

/**
 * 計算發光強度
 */
export function calculateGlowIntensity(isPinned: boolean, isNew: boolean): number {
  if (isPinned) return 1.0  // 釘選的花朵：金色光環，最強發光
  if (isNew) return 0.7     // 新花朵（3天內）：發光邊緣
  return 0.0                // 普通花朵：不發光
}

/**
 * 判斷是否為新花朵（3天內）
 */
export function isNewFlower(createdAt: Date): boolean {
  const now = new Date()
  const daysSinceCreation = Math.floor(
    (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
  )
  return daysSinceCreation <= 3
}

/**
 * 根據分類獲取區域資訊
 */
export function getRegionByCategory(category: AssistantType): IslandRegion | undefined {
  return ISLAND_REGIONS.find(region => region.id === category)
}

/**
 * 根據分類獲取花朵類型
 */
export function getFlowerTypeByCategory(category: AssistantType) {
  return FLOWER_TYPES[category] || FLOWER_TYPES[AssistantType.CHIEF]
}

/**
 * 完整的島嶼配置
 */
export const ISLAND_CONFIG: IslandConfig = {
  regions: ISLAND_REGIONS,
  flowerTypes: FLOWER_TYPES
}

/**
 * 貓咪位置配置
 */
export const CAT_POSITIONS = {
  tororo: {
    default: { x: 0, y: 2, z: 0 },    // 中央廣場，等待用戶
    planting: { x: 0, y: 1.5, z: 5 }  // 種植時的位置
  },
  hijiki: {
    default: { x: 5, y: 1, z: 0 },    // 中央廣場右側
    searching: { x: 0, y: 10, z: 0 }  // 搜尋時飛到高處掃描
  }
}
