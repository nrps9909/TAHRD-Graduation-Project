/**
 * Analytics Engine - 知識分析和統計
 * 提供各種知識洞察和趨勢分析
 */

import { PrismaClient, AssistantType } from '@prisma/client'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

interface KnowledgeStatistics {
  total: number
  byCategory: Record<string, { count: number; percentage: number }>
  byMonth: Array<{ month: string; count: number }>
  averageImportance: number
  topTags: Array<{ tag: string; count: number }>
  recentGrowth: {
    thisWeek: number
    lastWeek: number
    growthRate: number
  }
}

interface KnowledgeTrend {
  period: string
  insights: string[]
  hotTopics: string[]
  recommendations: string[]
}

interface RelatedMemories {
  memoryId: string
  relatedMemoryIds: string[]
  relationshipStrength: Record<string, number>
}

export class AnalyticsEngine {
  /**
   * 生成全面的知識統計報告
   */
  async generateStatistics(
    userId: string,
    period: 'week' | 'month' | 'year' | 'all' = 'month'
  ): Promise<KnowledgeStatistics> {
    try {
      const dateRange = this.getDateRange(period)

      // 1. 總數統計
      const total = await prisma.memory.count({
        where: {
          userId,
          isArchived: false,
          createdAt: dateRange ? { gte: dateRange.start, lte: dateRange.end } : undefined,
        },
      })

      // 2. 按類別統計
      const byCategory = await this.getCategoryDistribution(userId, dateRange)

      // 3. 按月份統計
      const byMonth = await this.getMonthlyDistribution(userId, period)

      // 4. 平均重要性 (使用預設值 5)
      const avgImportance = 5

      // 5. 熱門標籤
      const topTags = await this.getTopTags(userId, dateRange)

      // 6. 最近增長趨勢
      const recentGrowth = await this.getRecentGrowth(userId)

      return {
        total,
        byCategory,
        byMonth,
        averageImportance: avgImportance,
        topTags,
        recentGrowth,
      }
    } catch (error) {
      logger.error('[Analytics] Failed to generate statistics:', error)
      throw error
    }
  }

  /**
   * 趨勢分析 - 發現知識發展趨勢
   */
  async analyzeTrends(
    userId: string,
    period: 'week' | 'month' | 'year' = 'month'
  ): Promise<KnowledgeTrend> {
    try {
      const dateRange = this.getDateRange(period)

      // 1. 獲取時間範圍內的所有記憶
      const memories = await prisma.memory.findMany({
        where: {
          userId,
          isArchived: false,
          createdAt: dateRange ? { gte: dateRange.start, lte: dateRange.end } : undefined,
        },
        select: {
          tags: true,
          category: true,
          isPinned: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      // 2. 分析熱門主題
      const hotTopics = this.extractHotTopics(memories)

      // 3. 生成洞察
      const insights = this.generateInsights(memories, period)

      // 4. 生成建議
      const recommendations = this.generateRecommendations(memories)

      return {
        period,
        insights,
        hotTopics,
        recommendations,
      }
    } catch (error) {
      logger.error('[Analytics] Failed to analyze trends:', error)
      throw error
    }
  }

  /**
   * 知識關聯分析 - 發現記憶之間的關聯
   */
  async analyzeRelations(userId: string, memoryId: string): Promise<RelatedMemories> {
    try {
      // 1. 獲取目標記憶
      const targetMemory = await prisma.memory.findUnique({
        where: { id: memoryId },
        select: {
          tags: true,
          category: true,
          keyPoints: true,
        },
      })

      if (!targetMemory) {
        throw new Error('Memory not found')
      }

      // 2. 查找相關記憶（基於標籤和類別）
      const relatedMemories = await prisma.memory.findMany({
        where: {
          userId,
          id: { not: memoryId },
          isArchived: false,
          OR: [
            { tags: { hasSome: targetMemory.tags } },
            { category: targetMemory.category },
          ],
        },
        select: {
          id: true,
          tags: true,
          category: true,
        },
        take: 20,
      })

      // 3. 計算關聯強度
      const relationshipStrength: Record<string, number> = {}

      for (const related of relatedMemories) {
        let strength = 0

        // 共同標籤
        const commonTags = targetMemory.tags.filter((tag) => related.tags.includes(tag))
        strength += commonTags.length * 0.5

        // 相同類別
        if (related.category === targetMemory.category) {
          strength += 0.3
        }

        relationshipStrength[related.id] = Math.min(strength, 1)
      }

      // 4. 按關聯強度排序
      const relatedMemoryIds = Object.entries(relationshipStrength)
        .sort(([, a], [, b]) => b - a)
        .map(([id]) => id)
        .slice(0, 10)

      return {
        memoryId,
        relatedMemoryIds,
        relationshipStrength,
      }
    } catch (error) {
      logger.error('[Analytics] Failed to analyze relations:', error)
      throw error
    }
  }

  /**
   * 知識地圖 - 生成知識主題聚類
   */
  async generateKnowledgeMap(userId: string): Promise<any> {
    try {
      // 1. 獲取所有記憶的標籤
      const memories = await prisma.memory.findMany({
        where: {
          userId,
          isArchived: false,
        },
        select: {
          id: true,
          tags: true,
          category: true,
          title: true,
        },
      })

      // 2. 構建標籤共現矩陣
      const tagCooccurrence = new Map<string, Map<string, number>>()

      for (const memory of memories) {
        for (let i = 0; i < memory.tags.length; i++) {
          for (let j = i + 1; j < memory.tags.length; j++) {
            const tag1 = memory.tags[i]
            const tag2 = memory.tags[j]

            if (!tagCooccurrence.has(tag1)) {
              tagCooccurrence.set(tag1, new Map())
            }
            if (!tagCooccurrence.has(tag2)) {
              tagCooccurrence.set(tag2, new Map())
            }

            const count1 = tagCooccurrence.get(tag1)!.get(tag2) || 0
            const count2 = tagCooccurrence.get(tag2)!.get(tag1) || 0

            tagCooccurrence.get(tag1)!.set(tag2, count1 + 1)
            tagCooccurrence.get(tag2)!.set(tag1, count2 + 1)
          }
        }
      }

      // 3. 生成聚類（簡單的基於標籤的聚類）
      const clusters = this.clusterByTags(memories, tagCooccurrence)

      return {
        totalMemories: memories.length,
        clusters,
        tagNetwork: Array.from(tagCooccurrence.entries()).map(([tag, relations]) => ({
          tag,
          relations: Array.from(relations.entries()).map(([relatedTag, count]) => ({
            tag: relatedTag,
            count,
          })),
        })),
      }
    } catch (error) {
      logger.error('[Analytics] Failed to generate knowledge map:', error)
      throw error
    }
  }

  // ========== Private Helper Methods ==========

  private getDateRange(period: string): { start: Date; end: Date } | null {
    const now = new Date()
    const start = new Date()

    switch (period) {
      case 'week':
        start.setDate(now.getDate() - 7)
        break
      case 'month':
        start.setMonth(now.getMonth() - 1)
        break
      case 'year':
        start.setFullYear(now.getFullYear() - 1)
        break
      default:
        return null
    }

    return { start, end: now }
  }

  private async getCategoryDistribution(
    userId: string,
    dateRange: { start: Date; end: Date } | null
  ): Promise<Record<string, { count: number; percentage: number }>> {
    const memories = await prisma.memory.findMany({
      where: {
        userId,
        isArchived: false,
        createdAt: dateRange ? { gte: dateRange.start, lte: dateRange.end } : undefined,
      },
      select: { category: true },
    })

    const total = memories.length
    const distribution: Record<string, number> = {}

    for (const memory of memories) {
      distribution[memory.category] = (distribution[memory.category] || 0) + 1
    }

    const result: Record<string, { count: number; percentage: number }> = {}
    for (const [category, count] of Object.entries(distribution)) {
      result[category] = {
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }
    }

    return result
  }

  private async getMonthlyDistribution(
    userId: string,
    period: string
  ): Promise<Array<{ month: string; count: number }>> {
    const dateRange = this.getDateRange(period)
    const memories = await prisma.memory.findMany({
      where: {
        userId,
        isArchived: false,
        createdAt: dateRange ? { gte: dateRange.start } : undefined,
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    const monthlyCount = new Map<string, number>()

    for (const memory of memories) {
      const monthKey = `${memory.createdAt.getFullYear()}-${String(
        memory.createdAt.getMonth() + 1
      ).padStart(2, '0')}`
      monthlyCount.set(monthKey, (monthlyCount.get(monthKey) || 0) + 1)
    }

    return Array.from(monthlyCount.entries()).map(([month, count]) => ({ month, count }))
  }

  private async getTopTags(
    userId: string,
    dateRange: { start: Date; end: Date } | null,
    limit: number = 10
  ): Promise<Array<{ tag: string; count: number }>> {
    const memories = await prisma.memory.findMany({
      where: {
        userId,
        isArchived: false,
        createdAt: dateRange ? { gte: dateRange.start, lte: dateRange.end } : undefined,
      },
      select: { tags: true },
    })

    const tagCount = new Map<string, number>()

    for (const memory of memories) {
      for (const tag of memory.tags) {
        tagCount.set(tag, (tagCount.get(tag) || 0) + 1)
      }
    }

    return Array.from(tagCount.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([tag, count]) => ({ tag, count }))
  }

  private async getRecentGrowth(userId: string): Promise<{
    thisWeek: number
    lastWeek: number
    growthRate: number
  }> {
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    const thisWeek = await prisma.memory.count({
      where: {
        userId,
        isArchived: false,
        createdAt: { gte: oneWeekAgo },
      },
    })

    const lastWeek = await prisma.memory.count({
      where: {
        userId,
        isArchived: false,
        createdAt: { gte: twoWeeksAgo, lt: oneWeekAgo },
      },
    })

    const growthRate = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : 0

    return { thisWeek, lastWeek, growthRate }
  }

  private extractHotTopics(memories: any[]): string[] {
    const tagFrequency = new Map<string, number>()

    for (const memory of memories) {
      for (const tag of memory.tags || []) {
        tagFrequency.set(tag, (tagFrequency.get(tag) || 0) + 1)
      }
    }

    return Array.from(tagFrequency.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([tag]) => tag)
  }

  private generateInsights(memories: any[], period: string): string[] {
    const insights: string[] = []

    // 1. 總體趨勢
    insights.push(`在過去的${period === 'week' ? '一週' : period === 'month' ? '一個月' : '一年'}中，你記錄了 ${memories.length} 條知識`)

    // 2. 類別分析
    const categoryCount = memories.reduce((acc, m) => {
      acc[m.category] = (acc[m.category] || 0) + 1
      return acc
    }, {})
    const topCategory = Object.entries(categoryCount).sort(([, a]: any, [, b]: any) => b - a)[0]
    if (topCategory) {
      insights.push(`你最關注 ${topCategory[0]} 領域，佔了 ${((topCategory[1] as number / memories.length) * 100).toFixed(1)}%`)
    }

    // 3. 重要性分析 (基於 isPinned 判斷)
    const pinnedCount = memories.filter(m => m.isPinned).length
    const avgImportance = memories.length > 0
      ? memories.reduce((sum, m) => sum + (m.isPinned ? 8 : 5), 0) / memories.length
      : 5
    if (pinnedCount > memories.length * 0.3) {
      insights.push(`你有很多釘選的重要記憶，這些都是很有價值的知識`)
    }

    return insights
  }

  private generateRecommendations(memories: any[]): string[] {
    const recommendations: string[] = []

    // 基於記憶數量給建議
    if (memories.length < 10) {
      recommendations.push('試著記錄更多的想法和學習，讓知識庫更豐富')
    }

    // 基於類別分布給建議
    const categoryCount = memories.reduce((acc, m) => {
      acc[m.category] = (acc[m.category] || 0) + 1
      return acc
    }, {})

    const categories = Object.keys(categoryCount)
    if (categories.length < 3) {
      recommendations.push('嘗試在不同領域記錄知識，讓知識更全面')
    }

    return recommendations
  }

  private clusterByTags(
    memories: any[],
    tagCooccurrence: Map<string, Map<string, number>>
  ): any[] {
    // 簡單的聚類：基於共同標籤將記憶分組
    const clusters: any[] = []
    const processed = new Set<string>()

    for (const memory of memories) {
      if (processed.has(memory.id)) continue

      const cluster = {
        mainTag: memory.tags[0] || '未分類',
        memories: [memory.id],
      }

      // 找出有相同標籤的其他記憶
      for (const other of memories) {
        if (other.id === memory.id || processed.has(other.id)) continue

        const commonTags = memory.tags.filter((tag: string) => other.tags.includes(tag))
        if (commonTags.length > 0) {
          cluster.memories.push(other.id)
          processed.add(other.id)
        }
      }

      processed.add(memory.id)
      if (cluster.memories.length > 1) {
        clusters.push(cluster)
      }
    }

    return clusters
  }
}

export const analyticsEngine = new AnalyticsEngine()
