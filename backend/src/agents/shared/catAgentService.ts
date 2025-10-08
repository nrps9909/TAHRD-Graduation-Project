/**
 * 雙貓系統主控制器
 * 統一管理 Tororo 和 Hijiki 的行為
 */

import { PrismaClient } from '@prisma/client'
import { logger } from '../../utils/logger'
import {
  CatAgent,
  ChatMode,
  TororoCreateInput,
  TororoCreateResponse,
  HijikiQueryInput,
  HijikiSearchResponse,
  HijikiStatisticsResponse,
  HijikiTrendResponse,
  MemoryFlower
} from './types'
import {
  calculateFlowerSize,
  calculateFlowerOpacity,
  calculateGlowIntensity,
  isNewFlower,
  getFlowerTypeByCategory,
  getRegionByCategory
} from './islandConfig'

const prisma = new PrismaClient()

/**
 * 雙貓 Agent 服務
 */
export class CatAgentService {
  /**
   * 判斷用戶意圖，決定召喚哪隻貓
   */
  async detectIntent(message: string): Promise<{ catAgent: CatAgent; mode: ChatMode; confidence: number }> {
    const lowerMessage = message.toLowerCase()

    // Tororo 關鍵詞（創建、記錄、上傳）
    const tororoKeywords = [
      '記錄', '新增', '創建', '上傳', '寫', '種',
      '學到', '想法', '靈感', '今天', '剛剛',
      'create', 'add', 'new', 'record', 'save'
    ]

    // Hijiki 關鍵詞（查詢、搜尋、統計）
    const hijikiKeywords = [
      '找', '搜尋', '查', '看', '顯示', '統計',
      '本週', '上個月', '趨勢', '分析', '有什麼',
      'find', 'search', 'show', 'list', 'stats'
    ]

    // 計算匹配度
    const tororoMatches = tororoKeywords.filter(keyword => lowerMessage.includes(keyword)).length
    const hijikiMatches = hijikiKeywords.filter(keyword => lowerMessage.includes(keyword)).length

    // 決定召喚哪隻貓
    if (tororoMatches > hijikiMatches) {
      return {
        catAgent: CatAgent.TORORO,
        mode: ChatMode.CREATE,
        confidence: tororoMatches / tororoKeywords.length
      }
    } else if (hijikiMatches > tororoMatches) {
      return {
        catAgent: CatAgent.HIJIKI,
        mode: ChatMode.SEARCH,
        confidence: hijikiMatches / hijikiKeywords.length
      }
    }

    // 默認：如果無法判斷，召喚 Tororo（更友善）
    return {
      catAgent: CatAgent.TORORO,
      mode: ChatMode.GENERAL,
      confidence: 0.5
    }
  }

  /**
   * Tororo: 創建記憶
   */
  async createMemoryWithTororo(input: TororoCreateInput): Promise<TororoCreateResponse> {
    try {
      logger.info(`Tororo creating memory for user ${input.userId}`)

      // TODO: 調用 Gemini API 分析內容
      // 這裡先使用簡單的邏輯
      const analysis = await this.analyzContentSimple(input.content)

      // 創建記憶
      const memory = await prisma.memory.create({
        data: {
          userId: input.userId,
          assistantId: '', // TODO: 從 Assistant service 獲取對應的 assistantId
          rawContent: input.content,
          contentType: input.contentType || 'TEXT',
          fileUrls: input.fileUrls || [],
          fileNames: input.fileNames || [],
          fileTypes: input.fileTypes || [],
          links: input.links || [],
          linkTitles: input.linkTitles || [],
          title: analysis.title,
          emoji: analysis.emoji,
          summary: analysis.summary,
          category: analysis.category,
          tags: analysis.tags,
          keyPoints: analysis.keyPoints,
          aiSentiment: analysis.sentiment,
          aiImportance: analysis.importance
        }
      })

      // 生成記憶花
      const flower = this.generateMemoryFlower(memory)

      return {
        success: true,
        memory: {
          id: memory.id,
          title: memory.title || '',
          emoji: memory.emoji || '🌸',
          category: memory.category,
          flower
        },
        message: '種好啦！這朵花開得真美！✨'
      }
    } catch (error) {
      logger.error('Tororo failed to create memory:', error)
      return {
        success: false,
        message: '抱歉，種花的時候遇到了一點問題...',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Hijiki: 搜尋記憶
   */
  async searchMemoriesWithHijiki(input: HijikiQueryInput): Promise<HijikiSearchResponse> {
    try {
      logger.info(`Hijiki searching memories for user ${input.userId}`)

      // 構建查詢條件
      const where: any = {
        userId: input.userId,
        isArchived: false
      }

      // 應用篩選條件
      if (input.filters?.categories) {
        where.category = { in: input.filters.categories }
      }

      if (input.filters?.tags && input.filters.tags.length > 0) {
        where.tags = { hasSome: input.filters.tags }
      }

      if (input.filters?.dateRange) {
        where.createdAt = {
          gte: input.filters.dateRange.start,
          lte: input.filters.dateRange.end
        }
      }

      if (input.filters?.importance) {
        where.aiImportance = {
          gte: input.filters.importance.min,
          lte: input.filters.importance.max
        }
      }

      if (input.filters?.isPinned !== undefined) {
        where.isPinned = input.filters.isPinned
      }

      // 關鍵字搜尋
      if (input.query && input.query.trim()) {
        where.OR = [
          { title: { contains: input.query, mode: 'insensitive' } },
          { rawContent: { contains: input.query, mode: 'insensitive' } },
          { summary: { contains: input.query, mode: 'insensitive' } },
          { tags: { hasSome: [input.query] } }
        ]
      }

      // 執行查詢
      const memories = await prisma.memory.findMany({
        where,
        take: input.limit || 20,
        orderBy: this.getOrderBy(input.sortBy || 'time'),
        include: {
          assistant: true
        }
      })

      // 格式化結果
      const results = memories.map(memory => ({
        id: memory.id,
        title: memory.title || '無標題',
        emoji: memory.emoji || '📝',
        category: memory.category,
        importance: memory.aiImportance,
        date: memory.createdAt.toISOString(),
        summary: memory.summary || memory.rawContent.substring(0, 100),
        tags: memory.tags
      }))

      // 生成回應
      return {
        status: results.length > 0 ? 'success' : 'empty',
        query: {
          type: input.type,
          keywords: input.query ? [input.query] : undefined,
          filters: input.filters
        },
        summary: results.length > 0
          ? `找到了。共有 ${results.length} 條相關記憶。`
          : '沒有找到符合條件的記憶。',
        results,
        resultCount: results.length,
        insights: this.generateInsights(memories),
        suggestions: this.generateSuggestions(memories, input)
      }
    } catch (error) {
      logger.error('Hijiki failed to search memories:', error)
      return {
        status: 'error',
        query: { type: input.type },
        summary: '搜尋時發生錯誤。',
        results: [],
        resultCount: 0,
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Hijiki: 生成統計報告
   */
  async generateStatisticsWithHijiki(
    userId: string,
    period: 'day' | 'week' | 'month' | 'year',
    year: number,
    month?: number
  ): Promise<HijikiStatisticsResponse> {
    try {
      // 計算日期範圍
      const dateRange = this.calculateDateRange(period, year, month)

      // 查詢記憶
      const memories = await prisma.memory.findMany({
        where: {
          userId,
          isArchived: false,
          createdAt: {
            gte: dateRange.start,
            lte: dateRange.end
          }
        }
      })

      // 計算分布
      const distribution: Record<string, { count: number; percentage: number }> = {}
      memories.forEach(memory => {
        const category = memory.category
        if (!distribution[category]) {
          distribution[category] = { count: 0, percentage: 0 }
        }
        distribution[category].count++
      })

      // 計算百分比
      const total = memories.length
      Object.keys(distribution).forEach(key => {
        distribution[key].percentage = Math.round((distribution[key].count / total) * 100)
      })

      // 計算平均重要度
      const avgImportance = memories.length > 0
        ? memories.reduce((sum, m) => sum + m.aiImportance, 0) / memories.length
        : 0

      // 獲取熱門標籤
      const tagCounts: Record<string, number> = {}
      memories.forEach(memory => {
        memory.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1
        })
      })
      const topTags = Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([tag]) => tag)

      return {
        status: 'success',
        query: { type: 'statistics', period, year, month },
        summary: `${year} 年 ${month || ''} ${period === 'month' ? '月' : ''} 記憶統計報告`,
        statistics: {
          total: memories.length,
          change: 'TODO',  // 需要比較上一期的數據
          distribution,
          averageImportance: Math.round(avgImportance * 10) / 10,
          topTags
        },
        insights: [
          `本期共記錄 ${memories.length} 朵花`,
          `平均重要度為 ${Math.round(avgImportance * 10) / 10}/10`
        ],
        suggestions: this.generateStatisticsSuggestions(distribution, memories)
      }
    } catch (error) {
      logger.error('Hijiki failed to generate statistics:', error)
      throw error
    }
  }

  // ============ 私有輔助方法 ============

  /**
   * 簡單的內容分析（臨時方案，之後替換為 Gemini API）
   */
  private async analyzContentSimple(content: string) {
    // TODO: 調用 Gemini API 進行真正的分析
    // 這裡只是臨時的簡單邏輯

    const keywords = content.toLowerCase()

    // 簡單的分類邏輯
    let category: any = 'LIFE'
    if (keywords.includes('學') || keywords.includes('教程') || keywords.includes('技術')) {
      category = 'LEARNING'
    } else if (keywords.includes('想法') || keywords.includes('靈感') || keywords.includes('點子')) {
      category = 'INSPIRATION'
    } else if (keywords.includes('工作') || keywords.includes('專案') || keywords.includes('任務')) {
      category = 'WORK'
    } else if (keywords.includes('目標') || keywords.includes('計劃') || keywords.includes('規劃')) {
      category = 'GOALS'
    }

    return {
      category,
      importance: 5,
      tags: [],
      title: content.substring(0, 30),
      emoji: '🌸',
      summary: content.substring(0, 100),
      keyPoints: [content.substring(0, 50)],
      sentiment: 'neutral' as const
    }
  }

  /**
   * 生成記憶花
   */
  private generateMemoryFlower(memory: any): MemoryFlower {
    const flowerType = getFlowerTypeByCategory(memory.category)
    const region = getRegionByCategory(memory.category)

    // 計算花朵屬性
    const size = calculateFlowerSize(memory.aiImportance, flowerType?.baseSize || 1.0)
    const opacity = calculateFlowerOpacity(memory.updatedAt)
    const glowIntensity = calculateGlowIntensity(memory.isPinned, isNewFlower(memory.createdAt))

    // 在區域內隨機生成位置
    const position = region
      ? {
          x: region.position.x + (Math.random() - 0.5) * 10,
          y: region.position.y,
          z: region.position.z + (Math.random() - 0.5) * 10
        }
      : { x: 0, y: 0, z: 0 }

    return {
      id: `flower_${memory.id}`,
      memoryId: memory.id,
      type: flowerType?.name || '花朵',
      size,
      opacity,
      glowIntensity,
      swaySpeed: 1.0 + Math.random() * 0.5,
      bloomStage: 1.0,
      isPinned: memory.isPinned,
      isNew: isNewFlower(memory.createdAt),
      relatedCount: memory.relatedMemoryIds?.length || 0,
      position
    }
  }

  /**
   * 獲取排序方式
   */
  private getOrderBy(sortBy: 'time' | 'importance' | 'relevance') {
    switch (sortBy) {
      case 'time':
        return { createdAt: 'desc' as const }
      case 'importance':
        return { aiImportance: 'desc' as const }
      default:
        return { createdAt: 'desc' as const }
    }
  }

  /**
   * 生成洞察
   */
  private generateInsights(memories: any[]): string[] {
    const insights: string[] = []

    if (memories.length > 10) {
      insights.push('記憶數量豐富，知識庫很充實')
    }

    const avgImportance = memories.reduce((sum, m) => sum + m.aiImportance, 0) / memories.length
    if (avgImportance >= 7) {
      insights.push('這些記憶重要度很高，屬於核心知識')
    }

    return insights
  }

  /**
   * 生成建議
   */
  private generateSuggestions(memories: any[], input: HijikiQueryInput): string[] {
    const suggestions: string[] = []

    if (memories.length > 5) {
      suggestions.push('可以建立專題來組織這些記憶')
    }

    return suggestions
  }

  /**
   * 生成統計建議
   */
  private generateStatisticsSuggestions(distribution: any, memories: any[]): string[] {
    const suggestions: string[] = []

    // 檢查是否有分類記錄較少
    const sortedCategories = Object.entries(distribution).sort(([, a]: any, [, b]: any) => a.count - b.count)
    if (sortedCategories.length > 0) {
      const [leastCategory] = sortedCategories[0] as [string, any]
      suggestions.push(`${leastCategory} 類記錄較少，建議增加此類記錄`)
    }

    return suggestions
  }

  /**
   * 計算日期範圍
   */
  private calculateDateRange(period: string, year: number, month?: number) {
    const start = new Date(year, month ? month - 1 : 0, 1)
    let end: Date

    switch (period) {
      case 'month':
        end = new Date(year, month || 12, 0, 23, 59, 59)
        break
      case 'year':
        end = new Date(year, 11, 31, 23, 59, 59)
        break
      default:
        end = new Date()
    }

    return { start, end }
  }
}

// 導出單例
export const catAgentService = new CatAgentService()
