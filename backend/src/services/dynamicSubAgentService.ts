
/**
 * Dynamic SubAgent Service
 *
 * 從資料庫的 Island 動態載入配置
 * Islands 作為知識分類的主要單位
 */

import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

export interface IslandConfig {
  id: string
  userId: string
  position: number
  name: string | null
  nameChinese: string
  emoji: string
  color: string
  description?: string
  memoryCount: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  positionX: number
  positionY: number
  positionZ: number
}

export class DynamicSubAgentService {
  // 快取：userId -> Islands[]
  private userIslandsCache: Map<string, IslandConfig[]> = new Map()

  // 快取：islandId -> Island
  private islandByIdCache: Map<string, IslandConfig> = new Map()

  // 快取過期時間（5分鐘）
  private cacheExpiry: Map<string, number> = new Map()
  private CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  constructor() {
    logger.info('[DynamicSubAgent] Service initialized (Island-based)')
  }

  /**
   * 獲取用戶的所有 Islands
   */
  async getUserIslands(userId: string, forceRefresh = false): Promise<IslandConfig[]> {
    // 檢查快取
    if (!forceRefresh && this.isCacheValid(userId)) {
      const cached = this.userIslandsCache.get(userId)
      if (cached) {
        logger.info(`[DynamicSubAgent] 從快取載入 ${cached.length} 個 Island (userId: ${userId})`)
        return cached
      }
    }

    try {
      // 從資料庫載入 Islands
      const islands = await prisma.island.findMany({
        where: {
          userId,
          isActive: true,
        },
        orderBy: { position: 'asc' },
      })

      const islandConfigs: IslandConfig[] = islands.map((island) => ({
        id: island.id,
        userId: island.userId,
        position: island.position,
        name: island.name,
        nameChinese: island.nameChinese,
        emoji: island.emoji,
        color: island.color,
        description: island.description || undefined,
        memoryCount: island.memoryCount,
        isActive: island.isActive,
        createdAt: island.createdAt,
        updatedAt: island.updatedAt,
        positionX: island.positionX,
        positionY: island.positionY,
        positionZ: island.positionZ,
      }))

      // 更新快取
      this.userIslandsCache.set(userId, islandConfigs)
      this.cacheExpiry.set(userId, Date.now() + this.CACHE_TTL)

      // 更新 ID 索引快取
      islandConfigs.forEach((island) => {
        this.islandByIdCache.set(island.id, island)
      })

      logger.info(`[DynamicSubAgent] 從資料庫載入 ${islandConfigs.length} 個 Island (userId: ${userId})`)
      return islandConfigs
    } catch (error) {
      logger.error('[DynamicSubAgent] 獲取 Islands 失敗:', error)
      return []
    }
  }

  /**
   * 根據 ID 獲取 Island
   */
  async getIslandById(islandId: string): Promise<IslandConfig | null> {
    // 檢查快取
    const cached = this.islandByIdCache.get(islandId)
    if (cached) {
      return cached
    }

    try {
      const island = await prisma.island.findUnique({
        where: { id: islandId },
      })

      if (!island) {
        return null
      }

      const islandConfig: IslandConfig = {
        id: island.id,
        userId: island.userId,
        position: island.position,
        name: island.name,
        nameChinese: island.nameChinese,
        emoji: island.emoji,
        color: island.color,
        description: island.description || undefined,
        memoryCount: island.memoryCount,
        isActive: island.isActive,
        createdAt: island.createdAt,
        updatedAt: island.updatedAt,
        positionX: island.positionX,
        positionY: island.positionY,
        positionZ: island.positionZ,
      }

      // 更新快取
      this.islandByIdCache.set(islandId, islandConfig)

      return islandConfig
    } catch (error) {
      logger.error(`[DynamicSubAgent] 獲取 Island ${islandId} 失敗:`, error)
      return null
    }
  }

  /**
   * 根據內容找到最相關的 Islands
   */
  async findRelevantIslands(
    userId: string,
    content: string,
    topN = 3
  ): Promise<IslandConfig[]> {
    const islands = await this.getUserIslands(userId)

    if (islands.length === 0) {
      logger.warn(`[DynamicSubAgent] 用戶 ${userId} 沒有可用的 Island`)
      return []
    }

    const contentLower = content.toLowerCase()

    // 計算每個 Island 的相關性分數
    const scoredIslands = islands.map((island) => {
      let score = 0

      // 名稱匹配
      if (contentLower.includes(island.nameChinese.toLowerCase())) {
        score += 3
      }

      // 描述匹配
      if (island.description && contentLower.includes(island.description.toLowerCase())) {
        score += 1
      }

      return { island, score }
    })

    // 排序並取前 N 個
    const topIslands = scoredIslands
      .sort((a, b) => {
        // 如果分數相同，按記憶數量排序（更常用的島嶼優先）
        if (b.score === a.score) {
          return b.island.memoryCount - a.island.memoryCount
        }
        return b.score - a.score
      })
      .slice(0, topN)
      .map((item) => item.island)

    logger.info(
      `[DynamicSubAgent] 找到 ${topIslands.length} 個相關 Island: ${topIslands
        .map((i) => i.nameChinese)
        .join(', ')}`
    )

    return topIslands
  }

  /**
   * 增加 Island 統計
   */
  async incrementStats(
    islandId: string,
    type: 'memory' | 'chat'
  ): Promise<void> {
    try {
      if (type === 'memory') {
        await prisma.island.update({
          where: { id: islandId },
          data: { memoryCount: { increment: 1 } },
        })
      }

      // 清除快取，下次會重新載入
      const island = this.islandByIdCache.get(islandId)
      if (island) {
        this.clearUserCache(island.userId)
      }
    } catch (error) {
      logger.error(`[DynamicSubAgent] 更新統計失敗 (${islandId}):`, error)
    }
  }

  /**
   * 清除用戶快取
   */
  clearUserCache(userId: string): void {
    this.userIslandsCache.delete(userId)
    this.cacheExpiry.delete(userId)
    logger.info(`[DynamicSubAgent] 清除快取 (userId: ${userId})`)
  }

  /**
   * 檢查快取是否有效
   */
  private isCacheValid(userId: string): boolean {
    const expiry = this.cacheExpiry.get(userId)
    if (!expiry) return false
    return Date.now() < expiry
  }
}

export const dynamicSubAgentService = new DynamicSubAgentService()
