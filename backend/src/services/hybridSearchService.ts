/**
 * Hybrid Search Service - 混合檢索服務
 *
 * 根據查詢意圖，智能選擇最佳檢索策略：
 * - 語義搜尋（向量相似度）
 * - 結構化查詢（時間、分類、標籤）
 * - 統計聚合
 * - 混合檢索（組合多種策略）
 */

import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'
import { vectorService } from './vectorService'
import { QueryIntent, QueryIntentType } from './queryIntentAnalyzer'

const prisma = new PrismaClient()

/**
 * 檢索結果（統一格式）
 */
export interface SearchResult {
  memoryId: string
  title: string
  content: string
  tags: string[]
  similarity: number // 0-1，相關性分數
  source: 'semantic' | 'structured' | 'statistical' // 結果來源
  metadata?: {
    islandId?: string
    islandName?: string
    createdAt?: Date
    importanceScore?: number | null
  }
}

/**
 * 統計結果
 */
export interface StatisticalResult {
  type: 'count' | 'groupBy' | 'summary'
  data: any
}

/**
 * 混合檢索配置
 */
interface HybridSearchConfig {
  maxResults: number
  minSimilarity: number
  enableParallelSearch: boolean
}

/**
 * 混合檢索服務
 */
export class HybridSearchService {
  private config: HybridSearchConfig = {
    maxResults: 15,
    minSimilarity: 0.3,
    enableParallelSearch: true
  }

  /**
   * 執行混合檢索（主入口）
   */
  async search(
    userId: string,
    intent: QueryIntent,
    limit: number = 5
  ): Promise<SearchResult[]> {
    try {
      logger.info(`[Hybrid] Executing ${intent.type} search for user ${userId}`)
      const startTime = Date.now()

      let results: SearchResult[] = []

      switch (intent.type) {
        case QueryIntentType.SEMANTIC:
          results = await this.semanticSearch(userId, intent, limit)
          break

        case QueryIntentType.TEMPORAL:
          results = await this.temporalSearch(userId, intent, limit)
          break

        case QueryIntentType.CATEGORICAL:
          results = await this.categoricalSearch(userId, intent, limit)
          break

        case QueryIntentType.STATISTICAL:
          // 統計查詢返回特殊格式，但也轉換為 SearchResult
          results = await this.statisticalSearch(userId, intent, limit)
          break

        case QueryIntentType.HYBRID:
          results = await this.hybridSearch(userId, intent, limit)
          break

        default:
          logger.warn(`[Hybrid] Unknown intent type: ${intent.type}, falling back to semantic`)
          results = await this.semanticSearch(userId, intent, limit)
      }

      const duration = Date.now() - startTime
      logger.info(`[Hybrid] Search completed in ${duration}ms, found ${results.length} results`)

      return results
    } catch (error) {
      logger.error('[Hybrid] Search failed:', error)
      throw error
    }
  }

  /**
   * 語義搜尋（純向量相似度）
   */
  private async semanticSearch(
    userId: string,
    intent: QueryIntent,
    limit: number
  ): Promise<SearchResult[]> {
    const query = intent.params.semanticQuery || ''

    // 調用優化後的向量服務
    const vectorResults = await vectorService.semanticSearch(
      userId,
      query,
      limit,
      this.config.minSimilarity
    )

    if (vectorResults.length === 0) {
      return []
    }

    // 獲取完整的 Memory 信息
    const memoryIds = vectorResults.map((vr) => vr.memoryId)
    const memories = await prisma.memory.findMany({
      where: {
        id: { in: memoryIds },
        userId
      },
      select: {
        id: true,
        title: true,
        rawContent: true,
        summary: true,
        tags: true,
        islandId: true,
        createdAt: true,
        importanceScore: true,
        island: {
          select: {
            nameChinese: true
          }
        }
      }
    })

    // 創建 Memory ID 到 Memory 的映射
    const memoryMap = new Map(memories.map((m) => [m.id, m]))

    // 轉換為統一格式，保持相似度順序
    const results: SearchResult[] = vectorResults
      .map((vr) => {
        const memory = memoryMap.get(vr.memoryId)
        if (!memory) return null

        return {
          memoryId: vr.memoryId,
          title: memory.title || '無標題',
          content: memory.summary || memory.rawContent || vr.textContent,
          tags: memory.tags,
          similarity: vr.similarity,
          source: 'semantic' as const,
          metadata: {
            islandId: memory.islandId,
            islandName: memory.island?.nameChinese || '未分類',
            createdAt: memory.createdAt,
            importanceScore: memory.importanceScore
          }
        } as SearchResult
      })
      .filter((item): item is SearchResult => item !== null)

    return results
  }

  /**
   * 時間範圍查詢
   */
  private async temporalSearch(
    userId: string,
    intent: QueryIntent,
    limit: number
  ): Promise<SearchResult[]> {
    if (!intent.params.timeRange) {
      logger.warn('[Hybrid] Temporal search without timeRange, falling back')
      return []
    }

    const { start, end } = intent.params.timeRange

    const memories = await prisma.memory.findMany({
      where: {
        userId,
        createdAt: {
          gte: start,
          lte: end
        },
        isArchived: false
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        rawContent: true,
        summary: true,
        tags: true,
        islandId: true,
        createdAt: true,
        importanceScore: true,
        island: {
          select: {
            nameChinese: true
          }
        }
      }
    })

    return memories.map((m) => ({
      memoryId: m.id,
      title: m.title || '無標題',
      content: m.summary || m.rawContent || '',
      tags: m.tags,
      similarity: 0.8, // 時間匹配給予高分
      source: 'structured' as const,
      metadata: {
        islandId: m.islandId,
        islandName: m.island?.nameChinese || '未分類',
        createdAt: m.createdAt,
        importanceScore: m.importanceScore
      }
    }))
  }

  /**
   * 分類/標籤查詢
   */
  private async categoricalSearch(
    userId: string,
    intent: QueryIntent,
    limit: number
  ): Promise<SearchResult[]> {
    const { islandIds, tags } = intent.params

    if (!islandIds?.length && !tags?.length) {
      logger.warn('[Hybrid] Categorical search without islandIds/tags')
      return []
    }

    // 構建查詢條件
    const whereConditions: any = {
      userId,
      isArchived: false
    }

    // 島嶼或標籤匹配
    const orConditions: any[] = []

    if (islandIds?.length) {
      orConditions.push({ islandId: { in: islandIds } })
    }

    if (tags?.length) {
      orConditions.push({ tags: { hasSome: tags } })
    }

    if (orConditions.length > 0) {
      whereConditions.OR = orConditions
    }

    const memories = await prisma.memory.findMany({
      where: whereConditions,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        rawContent: true,
        summary: true,
        tags: true,
        islandId: true,
        createdAt: true,
        importanceScore: true,
        island: {
          select: {
            nameChinese: true
          }
        }
      }
    })

    return memories.map((m) => ({
      memoryId: m.id,
      title: m.title || '無標題',
      content: m.summary || m.rawContent || '',
      tags: m.tags,
      similarity: 0.75, // 島嶼匹配給予較高分
      source: 'structured' as const,
      metadata: {
        islandId: m.islandId,
        islandName: m.island?.nameChinese || '未分類',
        createdAt: m.createdAt,
        importanceScore: m.importanceScore
      }
    }))
  }

  /**
   * 統計查詢
   */
  private async statisticalSearch(
    userId: string,
    intent: QueryIntent,
    limit: number
  ): Promise<SearchResult[]> {
    const { aggregation, groupByField } = intent.params

    if (aggregation === 'count' || aggregation === 'groupBy') {
      // 分組統計
      const field = groupByField || 'islandId'

      if (field === 'islandId' || field === 'category') {
        const stats = await prisma.memory.groupBy({
          by: ['islandId'],
          where: { userId, isArchived: false },
          _count: true,
          orderBy: { _count: { islandId: 'desc' } }
        })

        // 轉換為 SearchResult 格式（特殊處理）
        return stats.map((stat) => ({
          memoryId: `stat-${stat.islandId}`,
          title: `島嶼: ${stat.islandId}`,
          content: `共有 ${stat._count} 條記憶`,
          tags: [],
          similarity: 1.0,
          source: 'statistical' as const,
          metadata: {
            islandId: stat.islandId,
            count: stat._count
          }
        }))
      }
    }

    // 如果是 summary 或其他類型，返回最近的記憶列表
    const memories = await prisma.memory.findMany({
      where: { userId, isArchived: false },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        rawContent: true,
        summary: true,
        tags: true,
        islandId: true,
        createdAt: true,
        island: {
          select: {
            nameChinese: true
          }
        }
      }
    })

    return memories.map((m) => ({
      memoryId: m.id,
      title: m.title || '無標題',
      content: m.summary || m.rawContent || '',
      tags: m.tags,
      similarity: 0.7,
      source: 'statistical' as const,
      metadata: {
        islandId: m.islandId,
        islandName: m.island?.nameChinese || '未分類',
        createdAt: m.createdAt
      }
    }))
  }

  /**
   * 混合檢索（組合多種策略）
   */
  private async hybridSearch(
    userId: string,
    intent: QueryIntent,
    limit: number
  ): Promise<SearchResult[]> {
    const { semanticQuery, timeRange, islandIds, tags } = intent.params

    // 並行執行多個查詢
    const searches: Promise<SearchResult[]>[] = []

    // 1. 語義搜尋（如果有語義查詢）
    if (semanticQuery) {
      searches.push(
        this.semanticSearch(
          userId,
          { ...intent, type: QueryIntentType.SEMANTIC },
          limit
        )
      )
    }

    // 2. 結構化過濾（時間 + 分類 + 標籤）
    const structuredWhere: any = {
      userId,
      isArchived: false
    }

    // 時間範圍
    if (timeRange) {
      structuredWhere.createdAt = {
        gte: timeRange.start,
        lte: timeRange.end
      }
    }

    // 島嶼/標籤
    const orConditions: any[] = []
    if (islandIds?.length) {
      orConditions.push({ islandId: { in: islandIds } })
    }
    if (tags?.length) {
      orConditions.push({ tags: { hasSome: tags } })
    }
    if (orConditions.length > 0) {
      structuredWhere.OR = orConditions
    }

    // 執行結構化查詢
    searches.push(
      prisma.memory
        .findMany({
          where: structuredWhere,
          orderBy: { createdAt: 'desc' },
          take: limit,
          select: {
            id: true,
            title: true,
            rawContent: true,
            summary: true,
            tags: true,
            islandId: true,
            createdAt: true,
            importanceScore: true,
            island: {
              select: {
                nameChinese: true
              }
            }
          }
        })
        .then((memories) =>
          memories.map((m) => ({
            memoryId: m.id,
            title: m.title || '無標題',
            content: m.summary || m.rawContent || '',
            tags: m.tags,
            similarity: 0.75,
            source: 'structured' as const,
            metadata: {
              islandId: m.islandId,
              islandName: m.island?.nameChinese || '未分類',
              createdAt: m.createdAt,
              importanceScore: m.importanceScore
            }
          }))
        )
    )

    // 並行執行所有查詢
    const allResults = await Promise.all(searches)

    // 合併結果並去重（優先語義搜尋結果）
    const merged = this.mergeAndDedup(allResults.flat(), limit)

    logger.info(`[Hybrid] Merged ${allResults.flat().length} results into ${merged.length} unique items`)

    return merged
  }

  /**
   * 合併並去重結果
   */
  private mergeAndDedup(results: SearchResult[], limit: number): SearchResult[] {
    // 使用 Map 去重（按 memoryId）
    const uniqueMap = new Map<string, SearchResult>()

    for (const result of results) {
      const existing = uniqueMap.get(result.memoryId)

      if (!existing) {
        // 新結果，直接加入
        uniqueMap.set(result.memoryId, result)
      } else {
        // 已存在，保留相關性更高的
        if (result.similarity > existing.similarity) {
          uniqueMap.set(result.memoryId, result)
        }
      }
    }

    // 轉換為陣列並排序
    const unique = Array.from(uniqueMap.values())

    // 按相關性排序
    unique.sort((a, b) => b.similarity - a.similarity)

    // 限制數量
    return unique.slice(0, limit)
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<HybridSearchConfig>): void {
    this.config = { ...this.config, ...config }
    logger.info('[Hybrid] Config updated:', this.config)
  }

  /**
   * 獲取配置
   */
  getConfig(): HybridSearchConfig {
    return { ...this.config }
  }
}

// 導出單例
export const hybridSearchService = new HybridSearchService()
