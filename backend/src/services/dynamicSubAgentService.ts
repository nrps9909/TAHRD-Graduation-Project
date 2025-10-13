
/**
 * Dynamic SubAgent Service
 *
 * 從資料庫的 Subcategory 動態載入 SubAgent 配置
 * 取代原本固定的 AssistantType 枚舉系統
 */

import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

export interface DynamicSubAgent {
  id: string
  userId: string
  islandId: string
  position: number
  name: string | null
  nameChinese: string
  emoji: string
  color: string
  description?: string
  systemPrompt: string
  personality: string
  chatStyle: string
  keywords: string[]
  memoryCount: number
  chatCount: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  island?: {
    id: string
    nameChinese: string
    emoji: string
    color: string
  }
}

export class DynamicSubAgentService {
  // 快取：userId -> SubAgent[]
  private userSubAgentsCache: Map<string, DynamicSubAgent[]> = new Map()

  // 快取：subcategoryId -> SubAgent
  private subAgentByIdCache: Map<string, DynamicSubAgent> = new Map()

  // 快取過期時間（5分鐘）
  private cacheExpiry: Map<string, number> = new Map()
  private CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  constructor() {
    logger.info('[DynamicSubAgent] Service initialized')
  }

  /**
   * 獲取用戶的所有 SubAgent
   */
  async getUserSubAgents(userId: string, forceRefresh = false): Promise<DynamicSubAgent[]> {
    // 檢查快取
    if (!forceRefresh && this.isCacheValid(userId)) {
      const cached = this.userSubAgentsCache.get(userId)
      if (cached) {
        logger.info(`[DynamicSubAgent] 從快取載入 ${cached.length} 個 SubAgent (userId: ${userId})`)
        return cached
      }
    }

    try {
      // 從資料庫載入
      const subcategories = await prisma.subcategory.findMany({
        where: {
          userId,
          isActive: true,
        },
        orderBy: { position: 'asc' },
        include: {
          island: {
            select: {
              id: true,
              nameChinese: true,
              emoji: true,
              color: true,
            },
          },
        },
      })

      const subAgents: DynamicSubAgent[] = subcategories.map((sub) => ({
        id: sub.id,
        userId: sub.userId,
        islandId: sub.islandId,
        position: sub.position,
        name: sub.name,
        nameChinese: sub.nameChinese,
        emoji: sub.emoji,
        color: sub.color,
        description: sub.description || undefined,
        systemPrompt: sub.systemPrompt,
        personality: sub.personality,
        chatStyle: sub.chatStyle,
        keywords: sub.keywords,
        memoryCount: sub.memoryCount,
        chatCount: sub.chatCount,
        isActive: sub.isActive,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt,
        island: sub.island,
      }))

      // 更新快取
      this.userSubAgentsCache.set(userId, subAgents)
      this.cacheExpiry.set(userId, Date.now() + this.CACHE_TTL)

      // 更新 ID 索引快取
      subAgents.forEach((agent) => {
        this.subAgentByIdCache.set(agent.id, agent)
      })

      logger.info(`[DynamicSubAgent] 從資料庫載入 ${subAgents.length} 個 SubAgent (userId: ${userId})`)

      return subAgents
    } catch (error) {
      logger.error('[DynamicSubAgent] 載入 SubAgent 失敗:', error)
      throw new Error('載入 SubAgent 配置失敗')
    }
  }

  /**
   * 根據 ID 獲取 SubAgent
   */
  async getSubAgentById(subcategoryId: string): Promise<DynamicSubAgent | null> {
    // 檢查快取
    const cached = this.subAgentByIdCache.get(subcategoryId)
    if (cached) {
      return cached
    }

    try {
      const subcategory = await prisma.subcategory.findUnique({
        where: { id: subcategoryId },
        include: {
          island: {
            select: {
              id: true,
              nameChinese: true,
              emoji: true,
              color: true,
            },
          },
        },
      })

      if (!subcategory) {
        return null
      }

      const subAgent: DynamicSubAgent = {
        id: subcategory.id,
        userId: subcategory.userId,
        islandId: subcategory.islandId,
        position: subcategory.position,
        name: subcategory.name,
        nameChinese: subcategory.nameChinese,
        emoji: subcategory.emoji,
        color: subcategory.color,
        description: subcategory.description || undefined,
        systemPrompt: subcategory.systemPrompt,
        personality: subcategory.personality,
        chatStyle: subcategory.chatStyle,
        keywords: subcategory.keywords,
        memoryCount: subcategory.memoryCount,
        chatCount: subcategory.chatCount,
        isActive: subcategory.isActive,
        createdAt: subcategory.createdAt,
        updatedAt: subcategory.updatedAt,
        island: subcategory.island,
      }

      // 更新快取
      this.subAgentByIdCache.set(subcategoryId, subAgent)

      return subAgent
    } catch (error) {
      logger.error(`[DynamicSubAgent] 獲取 SubAgent ${subcategoryId} 失敗:`, error)
      return null
    }
  }

  /**
   * 根據關鍵字找到最相關的 SubAgent
   */
  async findRelevantSubAgents(
    userId: string,
    content: string,
    topN = 3
  ): Promise<DynamicSubAgent[]> {
    const subAgents = await this.getUserSubAgents(userId)

    if (subAgents.length === 0) {
      logger.warn(`[DynamicSubAgent] 用戶 ${userId} 沒有可用的 SubAgent`)
      return []
    }

    const contentLower = content.toLowerCase()

    // 計算每個 SubAgent 的相關性分數
    const scoredAgents = subAgents.map((agent) => {
      let score = 0

      // 關鍵字匹配
      agent.keywords.forEach((keyword) => {
        if (contentLower.includes(keyword.toLowerCase())) {
          score += 2 // 關鍵字匹配權重
        }
      })

      // 名稱匹配
      if (contentLower.includes(agent.nameChinese.toLowerCase())) {
        score += 3
      }

      // 描述匹配
      if (agent.description && contentLower.includes(agent.description.toLowerCase())) {
        score += 1
      }

      return { agent, score }
    })

    // 排序並取前 N 個
    const topAgents = scoredAgents
      .filter((item) => item.score > 0) // 只返回有相關性的
      .sort((a, b) => b.score - a.score)
      .slice(0, topN)
      .map((item) => item.agent)

    // 如果沒有匹配的，返回前 N 個活躍的
    if (topAgents.length === 0) {
      logger.info(`[DynamicSubAgent] 沒有關鍵字匹配，返回前 ${topN} 個 SubAgent`)
      return subAgents.slice(0, topN)
    }

    logger.info(
      `[DynamicSubAgent] 找到 ${topAgents.length} 個相關 SubAgent: ${topAgents
        .map((a) => a.nameChinese)
        .join(', ')}`
    )

    return topAgents
  }

  /**
   * 清除用戶快取
   */
  clearUserCache(userId: string) {
    this.userSubAgentsCache.delete(userId)
    this.cacheExpiry.delete(userId)
    logger.info(`[DynamicSubAgent] 清除用戶 ${userId} 的快取`)
  }

  /**
   * 清除所有快取
   */
  clearAllCache() {
    this.userSubAgentsCache.clear()
    this.subAgentByIdCache.clear()
    this.cacheExpiry.clear()
    logger.info('[DynamicSubAgent] 清除所有快取')
  }

  /**
   * 檢查快取是否有效
   */
  private isCacheValid(userId: string): boolean {
    const expiry = this.cacheExpiry.get(userId)
    if (!expiry) return false
    return Date.now() < expiry
  }

  /**
   * 增加 SubAgent 統計
   */
  async incrementStats(
    subcategoryId: string,
    type: 'memory' | 'chat'
  ): Promise<void> {
    try {
      if (type === 'memory') {
        await prisma.subcategory.update({
          where: { id: subcategoryId },
          data: { memoryCount: { increment: 1 } },
        })
      } else if (type === 'chat') {
        await prisma.subcategory.update({
          where: { id: subcategoryId },
          data: { chatCount: { increment: 1 } },
        })
      }

      // 清除快取，下次會重新載入
      const subAgent = this.subAgentByIdCache.get(subcategoryId)
      if (subAgent) {
        this.clearUserCache(subAgent.userId)
      }
    } catch (error) {
      logger.error(`[DynamicSubAgent] 更新統計失敗 (${subcategoryId}):`, error)
    }
  }

  /**
   * 構建 SubAgent 的完整提示詞
   */
  buildPrompt(
    subAgent: DynamicSubAgent,
    userMessage: string,
    context?: string
  ): string {
    return `${subAgent.systemPrompt}

**你的身份：**
- 名稱：${subAgent.nameChinese} (${subAgent.name})
- 專長領域：${subAgent.island?.nameChinese || '知識管理'}
- 個性：${subAgent.personality}
- 對話風格：${subAgent.chatStyle}

**用戶的訊息：**
${userMessage}

${context ? `\n**相關背景：**\n${context}\n` : ''}

請根據你的專業和個性，提供有幫助的回應。`
  }
}

export const dynamicSubAgentService = new DynamicSubAgentService()
