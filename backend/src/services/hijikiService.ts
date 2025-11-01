/**
 * HijikiService - 知識管理員服務
 * 負責查詢、分析和管理記憶
 */

import { PrismaClient, CategoryType } from '@prisma/client'
import { logger } from '../utils/logger'
import { memoryService } from './memoryService'
import { vectorService } from './vectorService'
import { analyticsEngine } from './analyticsEngine'
import { ragConversation } from './ragConversation'
import { HIJIKI_SYSTEM_PROMPT, HIJIKI_ANALYTICS } from '../agents/hijiki/systemPrompt'

const prisma = new PrismaClient()

export interface HijikiQueryInput {
  userId: string
  query: string
  type?: 'search' | 'statistics' | 'trend'
  filters?: {
    categories?: CategoryType[]
    tags?: string[]
    dateRange?: {
      start: Date
      end: Date
    }
  }
}

export interface HijikiSearchResponse {
  success: boolean
  summary: string
  results: Array<{
    id: string
    title: string
    emoji: string
    category: string
    importance: number
    date: string
    summary: string
    tags: string[]
  }>
  resultCount: number
  insights?: string[]
  suggestions?: string[]
  error?: string
}

export interface HijikiStatisticsResponse {
  success: boolean
  summary: string
  statistics: {
    total: number
    change: string
    distribution: Record<string, { count: number; percentage: number }>
    averageImportance: number
    topTags: string[]
  }
  insights: string[]
  suggestions: string[]
}

/**
 * Hijiki 知識管理員服務
 */
class HijikiService {
  /**
   * 使用 Hijiki 搜尋記憶
   */
  async searchWithHijiki(input: HijikiQueryInput): Promise<HijikiSearchResponse> {
    try {
      logger.info(`[Hijiki RAG] Searching memories for user ${input.userId}`)

      // === 使用 RAG：語義搜尋 + 關鍵字搜尋 ===
      const semanticResults = await vectorService.semanticSearch(
        input.userId,
        input.query,
        10,
        0.6 // 60% 相似度閾值
      )

      logger.info(`[Hijiki RAG] Found ${semanticResults.length} semantic matches`)

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
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          island: true
        }
      })

      // 格式化結果
      const results = memories.map(memory => ({
        id: memory.id,
        title: memory.title || '無標題',
        emoji: memory.emoji || '📝',
        category: memory.category,
        importance: memory.isPinned ? 8 : 5,
        date: memory.createdAt.toISOString(),
        summary: memory.summary || memory.rawContent.substring(0, 100),
        tags: memory.tags
      }))

      // 生成洞察
      const insights = this.generateInsights(memories)
      const suggestions = this.generateSuggestions(memories)

      return {
        success: true,
        summary: results.length > 0
          ? `找到了。共有 ${results.length} 條相關記憶。`
          : '沒有找到符合條件的記憶。',
        results,
        resultCount: results.length,
        insights,
        suggestions
      }
    } catch (error) {
      logger.error('Hijiki search failed:', error)
      return {
        success: false,
        summary: '搜尋時發生錯誤。',
        results: [],
        resultCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 生成統計報告
   */
  async generateStatistics(
    userId: string,
    period: 'day' | 'week' | 'month' | 'year' = 'month'
  ): Promise<HijikiStatisticsResponse> {
    try {
      logger.info(`Hijiki generating ${period} statistics for user ${userId}`)

      // 計算日期範圍
      const now = new Date()
      const startDate = this.calculateStartDate(now, period)

      // 查詢記憶
      const memories = await prisma.memory.findMany({
        where: {
          userId,
          isArchived: false,
          createdAt: {
            gte: startDate,
            lte: now
          }
        }
      })

      // 計算分布
      const distribution = this.calculateDistribution(memories)

      // 計算平均重要度 (基於 isPinned 判斷：釘選=8，未釘選=5)
      const avgImportance = memories.length > 0
        ? memories.reduce((sum, m) => sum + (m.isPinned ? 8 : 5), 0) / memories.length
        : 5

      // 獲取熱門標籤
      const topTags = this.getTopTags(memories, 5)

      // 生成洞察和建議
      const insights = this.generateStatisticsInsights(memories, distribution)
      const suggestions = this.generateStatisticsSuggestions(distribution)

      return {
        success: true,
        summary: `${this.getPeriodName(period)} 記憶統計報告`,
        statistics: {
          total: memories.length,
          change: await this.calculateChange(userId, period, memories.length),
          distribution,
          averageImportance: Math.round(avgImportance * 10) / 10,
          topTags
        },
        insights,
        suggestions
      }
    } catch (error) {
      logger.error('Hijiki statistics generation failed:', error)
      throw error
    }
  }

  // ============ 私有方法 ============

  /**
   * 計算開始日期
   */
  private calculateStartDate(now: Date, period: string): Date {
    const start = new Date(now)
    switch (period) {
      case 'day':
        start.setHours(0, 0, 0, 0)
        break
      case 'week':
        start.setDate(start.getDate() - 7)
        break
      case 'month':
        start.setMonth(start.getMonth() - 1)
        break
      case 'year':
        start.setFullYear(start.getFullYear() - 1)
        break
    }
    return start
  }

  /**
   * 計算分布
   */
  private calculateDistribution(memories: any[]) {
    const distribution: Record<string, { count: number; percentage: number }> = {}
    const total = memories.length

    memories.forEach(memory => {
      const category = memory.category
      if (!distribution[category]) {
        distribution[category] = { count: 0, percentage: 0 }
      }
      distribution[category].count++
    })

    // 計算百分比
    Object.keys(distribution).forEach(key => {
      distribution[key].percentage = Math.round((distribution[key].count / total) * 100)
    })

    return distribution
  }

  /**
   * 獲取熱門標籤
   */
  private getTopTags(memories: any[], limit: number): string[] {
    const tagCounts: Record<string, number> = {}

    memories.forEach(memory => {
      memory.tags.forEach((tag: string) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      })
    })

    return Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([tag]) => tag)
  }

  /**
   * 計算變化率
   */
  private async calculateChange(userId: string, period: string, currentCount: number): Promise<string> {
    try {
      const now = new Date()
      const previousStart = this.calculateStartDate(this.calculateStartDate(now, period), period)
      const previousEnd = this.calculateStartDate(now, period)

      const previousCount = await prisma.memory.count({
        where: {
          userId,
          isArchived: false,
          createdAt: {
            gte: previousStart,
            lt: previousEnd
          }
        }
      })

      if (previousCount === 0) return 'new'

      const change = ((currentCount - previousCount) / previousCount) * 100
      const sign = change > 0 ? '+' : ''
      return `${sign}${Math.round(change)}%`
    } catch (error) {
      return '---'
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

    const pinnedCount = memories.filter(m => m.isPinned).length
    const avgImportance = memories.length > 0
      ? memories.reduce((sum, m) => sum + (m.isPinned ? 8 : 5), 0) / memories.length
      : 5

    if (pinnedCount > memories.length * 0.3) {
      insights.push('這些記憶重要度很高，屬於核心知識')
    } else if (pinnedCount === 0 && memories.length > 5) {
      insights.push('可以考慮釘選一些重要的核心知識')
    }

    return insights
  }

  /**
   * 生成建議
   */
  private generateSuggestions(memories: any[]): string[] {
    const suggestions: string[] = []

    if (memories.length > 5) {
      suggestions.push('可以建立專題來組織這些記憶')
    }

    // 檢查是否有長時間未訪問的記憶
    const oldMemories = memories.filter(m => {
      const daysSinceUpdate = (Date.now() - new Date(m.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      return daysSinceUpdate > 30
    })

    if (oldMemories.length > 0) {
      suggestions.push(`有 ${oldMemories.length} 條記憶超過 30 天未訪問，建議複習`)
    }

    return suggestions
  }

  /**
   * 生成統計洞察
   */
  private generateStatisticsInsights(memories: any[], distribution: any): string[] {
    const insights: string[] = []

    insights.push(`本期共記錄 ${memories.length} 朵花`)

    // 找出最活躍的分類
    const categories = Object.entries(distribution)
      .sort(([, a]: any, [, b]: any) => b.count - a.count)

    if (categories.length > 0) {
      const [topCategory, topData]: any = categories[0]
      insights.push(`${this.getCategoryName(topCategory)} 最活躍（${topData.count} 條，${topData.percentage}%）`)
    }

    return insights
  }

  /**
   * 生成統計建議
   */
  private generateStatisticsSuggestions(distribution: any): string[] {
    const suggestions: string[] = []

    // 檢查是否有分類記錄較少
    const categories = Object.entries(distribution)
      .sort(([, a]: any, [, b]: any) => a.count - b.count)

    if (categories.length > 0) {
      const [leastCategory, leastData]: any = categories[0]
      if ((leastData as any).count < 3) {
        suggestions.push(`${this.getCategoryName(leastCategory)} 記錄較少，建議增加此類記錄`)
      }
    }

    return suggestions
  }

  /**
   * 獲取分類名稱
   */
  private getCategoryName(category: string): string {
    const names: Record<string, string> = {
      LEARNING: '學習高地',
      INSPIRATION: '靈感森林',
      GOALS: '目標峰頂',
      WORK: '工作碼頭',
      SOCIAL: '社交海灘',
      LIFE: '生活花園',
      RESOURCES: '資源倉庫',
      CHIEF: '中央廣場'
    }
    return names[category] || category
  }

  /**
   * 獲取期間名稱
   */
  private getPeriodName(period: string): string {
    const names: Record<string, string> = {
      day: '今日',
      week: '本週',
      month: '本月',
      year: '本年'
    }
    return names[period] || period
  }
}

export const hijikiService = new HijikiService()
