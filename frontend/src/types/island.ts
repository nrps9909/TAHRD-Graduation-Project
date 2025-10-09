/**
 * 島嶼/資料庫類型定義
 *
 * 新架構：
 * - Island = 用戶自定義的主要知識領域（如：工作島、學習島）
 * - Island 包含特定類別的記憶
 * - 用戶可以自由創建、編輯、刪除島嶼
 */

// 記憶類別（對應資料庫的 MemoryCategory）
export type IslandCategory =
  | 'LEARNING'
  | 'INSPIRATION'
  | 'WORK'
  | 'SOCIAL'
  | 'LIFE'
  | 'GOALS'
  | 'RESOURCES'
  | 'MISC' // 雜項 - 不屬於其他類別的知識

// 記憶數據結構
export interface Memory {
  id: string
  title: string
  importance: number // 1-10，決定彩度
  category: IslandCategory // 記憶類別
  content?: string
  tags?: string[]
  createdAt: Date
}

export interface Island {
  id: string
  name: string
  emoji: string
  color: string // 主題色
  description: string
  createdAt: Date
  updatedAt: Date

  // 這個島嶼包含哪些類別的記憶
  categories: IslandCategory[]

  // 記憶列表（會根據 categories 過濾）
  memories: Memory[]

  // 記憶總數
  memoryCount: number

  // 區域分布統計
  regionDistribution: {
    learning: number
    inspiration: number
    work: number
    social: number
    life: number
    goals: number
    resources: number
    misc: number
  }
}

/**
 * 預設的5個主島配置
 * 用戶可以基於這些創建，也可以完全自定義
 */
export const DEFAULT_ISLANDS: Island[] = [
  {
    id: 'work-island',
    name: '工作島',
    emoji: '💼',
    color: '#8B9DC3', // 柔和藍灰色
    description: '工作專案、會議記錄和目標追蹤',
    categories: ['WORK', 'GOALS'],
    memories: [],
    memoryCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    regionDistribution: {
      learning: 0,
      inspiration: 0,
      work: 0,
      social: 0,
      life: 0,
      goals: 0,
      resources: 0,
      misc: 0
    }
  },
  {
    id: 'learning-island',
    name: '學習島',
    emoji: '📚',
    color: '#A8D5BA', // 清新薄荷綠
    description: '知識學習、課程筆記和技能提升',
    categories: ['LEARNING', 'RESOURCES'],
    memories: [],
    memoryCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    regionDistribution: {
      learning: 0,
      inspiration: 0,
      work: 0,
      social: 0,
      life: 0,
      goals: 0,
      resources: 0,
      misc: 0
    }
  },
  {
    id: 'life-island',
    name: '生活島',
    emoji: '🌸',
    color: '#F4B5C4', // 溫柔粉色
    description: '日常生活、人際關係和個人成長',
    categories: ['LIFE', 'SOCIAL'],
    memories: [],
    memoryCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    regionDistribution: {
      learning: 0,
      inspiration: 0,
      work: 0,
      social: 0,
      life: 0,
      goals: 0,
      resources: 0,
      misc: 0
    }
  },
  {
    id: 'inspiration-island',
    name: '靈感島',
    emoji: '💡',
    color: '#FFD7A8', // 柔和奶油黃
    description: '創意想法、設計靈感和未來構想',
    categories: ['INSPIRATION'],
    memories: [],
    memoryCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    regionDistribution: {
      learning: 0,
      inspiration: 0,
      work: 0,
      social: 0,
      life: 0,
      goals: 0,
      resources: 0,
      misc: 0
    }
  },
  {
    id: 'misc-island',
    name: '太平洋垃圾帶',
    emoji: '🌊',
    color: '#B8C5D6', // 淡雅霧藍
    description: '雜項記憶、待整理的想法和其他未分類知識',
    categories: ['MISC'], // MISC 類別 - 不屬於其他類別的正常知識
    memories: [],
    memoryCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    regionDistribution: {
      learning: 0,
      inspiration: 0,
      work: 0,
      social: 0,
      life: 0,
      goals: 0,
      resources: 0,
      misc: 0
    }
  }
]

// 向後兼容：導出為 SAMPLE_ISLANDS
export const SAMPLE_ISLANDS = DEFAULT_ISLANDS
