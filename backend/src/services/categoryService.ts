/**
 * Category Service - 管理 CategoryType 與 Island 的映射關係
 *
 * CategoryType 用於記憶的細粒度分類（8 種），Island 用於視覺化組織（5 個）
 */

import { CategoryType } from '@prisma/client'

// Island 名稱常量
export const ISLAND_NAMES = {
  LEARNING: 'LEARNING_ISLAND',
  LIFE: 'LIFE_ISLAND',
  WORK: 'WORK_ISLAND',
  SOCIAL: 'SOCIAL_ISLAND',
  GOALS: 'GOALS_ISLAND'
} as const

// CategoryType 到 Island 的映射
const CATEGORY_TO_ISLAND_MAP: Record<CategoryType, string> = {
  LEARNING: ISLAND_NAMES.LEARNING,
  INSPIRATION: ISLAND_NAMES.LEARNING,   // 靈感歸類到學習島
  LIFE: ISLAND_NAMES.LIFE,
  WORK: ISLAND_NAMES.WORK,
  SOCIAL: ISLAND_NAMES.SOCIAL,
  GOALS: ISLAND_NAMES.GOALS,
  RESOURCES: ISLAND_NAMES.GOALS,        // 資源歸類到目標島
  MISC: ISLAND_NAMES.GOALS              // 雜項歸類到目標島
}

// Island 到 CategoryType 列表的映射
const ISLAND_TO_CATEGORIES_MAP: Record<string, CategoryType[]> = {
  [ISLAND_NAMES.LEARNING]: ['LEARNING', 'INSPIRATION'],
  [ISLAND_NAMES.LIFE]: ['LIFE'],
  [ISLAND_NAMES.WORK]: ['WORK'],
  [ISLAND_NAMES.SOCIAL]: ['SOCIAL'],
  [ISLAND_NAMES.GOALS]: ['GOALS', 'RESOURCES', 'MISC']
}

export class CategoryService {
  /**
   * 根據 CategoryType 獲取對應的 Island 名稱
   */
  getIslandNameByCategory(category: CategoryType): string {
    return CATEGORY_TO_ISLAND_MAP[category]
  }

  /**
   * 根據 Island 名稱獲取對應的 CategoryType 列表
   */
  getCategoriesByIslandName(islandName: string): CategoryType[] {
    return ISLAND_TO_CATEGORIES_MAP[islandName] || []
  }

  /**
   * 檢查某個 Category 是否屬於某個 Island
   */
  isCategoryInIsland(category: CategoryType, islandName: string): boolean {
    const categories = this.getCategoriesByIslandName(islandName)
    return categories.includes(category)
  }

  /**
   * 獲取所有 Island 名稱
   */
  getAllIslandNames(): string[] {
    return Object.values(ISLAND_NAMES)
  }

  /**
   * 根據關鍵字進行降級分類（當 AI 分類失敗時使用）
   */
  fallbackCategoryDetection(content: string): CategoryType {
    const lowerContent = content.toLowerCase()

    // 學習相關
    if (
      lowerContent.includes('學習') ||
      lowerContent.includes('筆記') ||
      lowerContent.includes('教程') ||
      lowerContent.includes('課程') ||
      lowerContent.includes('知識')
    ) {
      return 'LEARNING'
    }

    // 工作相關
    if (
      lowerContent.includes('工作') ||
      lowerContent.includes('項目') ||
      lowerContent.includes('會議') ||
      lowerContent.includes('任務') ||
      lowerContent.includes('deadline')
    ) {
      return 'WORK'
    }

    // 社交相關
    if (
      lowerContent.includes('朋友') ||
      lowerContent.includes('社交') ||
      lowerContent.includes('聊天') ||
      lowerContent.includes('見面') ||
      lowerContent.includes('人際')
    ) {
      return 'SOCIAL'
    }

    // 生活相關
    if (
      lowerContent.includes('生活') ||
      lowerContent.includes('健康') ||
      lowerContent.includes('飲食') ||
      lowerContent.includes('運動') ||
      lowerContent.includes('睡眠')
    ) {
      return 'LIFE'
    }

    // 目標相關
    if (
      lowerContent.includes('目標') ||
      lowerContent.includes('計劃') ||
      lowerContent.includes('夢想') ||
      lowerContent.includes('願望') ||
      lowerContent.includes('規劃')
    ) {
      return 'GOALS'
    }

    // 靈感創意
    if (
      lowerContent.includes('靈感') ||
      lowerContent.includes('創意') ||
      lowerContent.includes('想法') ||
      lowerContent.includes('idea')
    ) {
      return 'INSPIRATION'
    }

    // 資源收藏
    if (
      lowerContent.includes('資源') ||
      lowerContent.includes('收藏') ||
      lowerContent.includes('書籤') ||
      lowerContent.includes('鏈接') ||
      lowerContent.includes('連結')
    ) {
      return 'RESOURCES'
    }

    // 默認分類為雜項
    return 'MISC'
  }

  /**
   * 獲取 Category 的顯示信息
   */
  getCategoryInfo(category: CategoryType): {
    name: string
    nameChinese: string
    emoji: string
    color: string
  } {
    const infoMap: Record<CategoryType, any> = {
      LEARNING: {
        name: 'Learning',
        nameChinese: '學習',
        emoji: '📚',
        color: '#3B82F6'
      },
      INSPIRATION: {
        name: 'Inspiration',
        nameChinese: '靈感',
        emoji: '💡',
        color: '#8B5CF6'
      },
      WORK: {
        name: 'Work',
        nameChinese: '工作',
        emoji: '💼',
        color: '#10B981'
      },
      SOCIAL: {
        name: 'Social',
        nameChinese: '社交',
        emoji: '🤝',
        color: '#F59E0B'
      },
      LIFE: {
        name: 'Life',
        nameChinese: '生活',
        emoji: '🏡',
        color: '#EC4899'
      },
      GOALS: {
        name: 'Goals',
        nameChinese: '目標',
        emoji: '🎯',
        color: '#EF4444'
      },
      RESOURCES: {
        name: 'Resources',
        nameChinese: '資源',
        emoji: '📦',
        color: '#06B6D4'
      },
      MISC: {
        name: 'Miscellaneous',
        nameChinese: '雜項',
        emoji: '🗂️',
        color: '#64748B'
      }
    }

    return infoMap[category]
  }
}

export const categoryService = new CategoryService()
