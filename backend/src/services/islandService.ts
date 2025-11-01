/**
 * IslandService - 島嶼服務（替代 AssistantService）
 *
 * 功能：
 * 1. 管理用戶的島嶼（分類）
 * 2. 提供 AI 配置查詢
 * 3. 統計數據更新
 * 4. 向後兼容：AssistantType → Island 映射
 */

import { PrismaClient, AssistantType } from '@prisma/client'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

export class IslandService {
  // 快取機制（按 userId 分組）
  private islandsCache: Map<string, Map<string, any>> = new Map()
  private cacheExpiry: Map<string, number> = new Map()
  private CACHE_TTL = 5 * 60 * 1000 // 5 分鐘

  /**
   * 載入用戶的所有島嶼到快取
   */
  private async loadIslands(userId: string) {
    const now = Date.now()
    const expiry = this.cacheExpiry.get(userId) || 0

    if (this.islandsCache.has(userId) && now < expiry) {
      return
    }

    const islands = await prisma.island.findMany({
      where: { userId, isActive: true },
      orderBy: { position: 'asc' }
    })

    const userCache = new Map()
    islands.forEach(island => {
      userCache.set(island.id, island)
    })

    this.islandsCache.set(userId, userCache)
    this.cacheExpiry.set(userId, now + this.CACHE_TTL)

    logger.info(`[IslandService] 載入 ${islands.length} 個島嶼到快取 (userId: ${userId})`)
  }

  /**
   * 獲取用戶的所有島嶼
   */
  async getAllIslands(userId: string) {
    await this.loadIslands(userId)
    const userCache = this.islandsCache.get(userId)
    return userCache ? Array.from(userCache.values()) : []
  }

  /**
   * 根據 ID 獲取島嶼
   */
  async getIslandById(islandId: string, userId?: string) {
    // 如果提供了 userId，嘗試從快取獲取
    if (userId) {
      await this.loadIslands(userId)
      const userCache = this.islandsCache.get(userId)
      if (userCache?.has(islandId)) {
        return userCache.get(islandId)
      }
    }

    // 從資料庫查詢
    const island = await prisma.island.findUnique({
      where: { id: islandId }
    })

    if (island && userId) {
      const userCache = this.islandsCache.get(userId) || new Map()
      userCache.set(islandId, island)
      this.islandsCache.set(userId, userCache)
    }

    return island
  }

  /**
   * 🆕 根據 AssistantType 獲取對應的島嶼（向後兼容）
   * 用於 Chief Agent 分類結果映射
   */
  async getIslandByType(userId: string, type: AssistantType) {
    await this.loadIslands(userId)
    const userCache = this.islandsCache.get(userId)

    if (!userCache || userCache.size === 0) {
      logger.warn(`[IslandService] 用戶 ${userId} 沒有任何島嶼`)
      return null
    }

    const islands = Array.from(userCache.values())

    // AssistantType 到中文關鍵字的映射
    const typeMapping: Record<AssistantType, string[]> = {
      LEARNING: ['學習', 'LEARNING', '学习'],
      WORK: ['工作', 'WORK', '职业'],
      INSPIRATION: ['靈感', '創意', 'INSPIRATION', '灵感', '创意'],
      SOCIAL: ['人際', '社交', 'SOCIAL', '人际', '朋友'],
      LIFE: ['生活', 'LIFE', '日常'],
      GOALS: ['目標', '規劃', 'GOALS', '目标', '计划'],
      RESOURCES: ['資源', '收藏', 'RESOURCES', '资源'],
      MISC: ['雜項', '其他', 'MISC', '杂项'],
      CHIEF: [] // Chief 不映射
    }

    const keywords = typeMapping[type] || []

    // 優先精確匹配 name
    const exactMatch = islands.find(
      island => island.name === type
    )
    if (exactMatch) {
      logger.info(`[IslandService] 精確匹配: ${type} → ${exactMatch.nameChinese}`)
      return exactMatch
    }

    // 模糊匹配 nameChinese
    const fuzzyMatch = islands.find(
      island => keywords.some(keyword => island.nameChinese.includes(keyword))
    )
    if (fuzzyMatch) {
      logger.info(`[IslandService] 模糊匹配: ${type} → ${fuzzyMatch.nameChinese}`)
      return fuzzyMatch
    }

    // 如果沒有匹配，返回第一個島嶼（或 null）
    logger.warn(`[IslandService] 無法為 AssistantType ${type} 找到匹配的島嶼，使用第一個島嶼`)
    return islands[0] || null
  }

  /**
   * 🆕 根據分類名稱查找島嶼（支持中英文）
   */
  async getIslandByName(userId: string, categoryName: string) {
    await this.loadIslands(userId)
    const userCache = this.islandsCache.get(userId)

    if (!userCache) return null

    const islands = Array.from(userCache.values())

    // 精確匹配
    const exactMatch = islands.find(
      island => island.nameChinese === categoryName || island.name === categoryName
    )
    if (exactMatch) return exactMatch

    // 模糊匹配
    const fuzzyMatch = islands.find(
      island => island.nameChinese.includes(categoryName) ||
                (island.name && island.name.includes(categoryName))
    )
    return fuzzyMatch || null
  }

  /**
   * 🆕 獲取島嶼的 systemPrompt（用於 AI 調用）
   */
  async getSystemPrompt(islandId: string, userId?: string): Promise<string | null> {
    const island = await this.getIslandById(islandId, userId)

    if (!island) return null

    // 如果島嶼有自訂 systemPrompt，使用它
    if (island.systemPrompt) {
      return island.systemPrompt
    }

    // 否則根據名稱生成預設 prompt
    return this.getDefaultPrompt(island.nameChinese)
  }

  /**
   * 🆕 獲取預設 systemPrompt（根據島嶼名稱）
   */
  private getDefaultPrompt(islandName: string): string {
    if (islandName.includes('學習') || islandName.includes('学习')) {
      return '你是學習記錄助手，專注於幫助使用者記錄和整理學習筆記、知識點、課程內容。你擅長總結重點、建立知識架構，並提供複習建議。'
    }

    if (islandName.includes('工作') || islandName.includes('职业')) {
      return '你是工作事務助手，協助使用者管理工作任務、項目進度、會議記錄。你注重效率和目標達成，善於提供具體的行動建議。'
    }

    if (islandName.includes('靈感') || islandName.includes('創意') || islandName.includes('灵感')) {
      return '你是靈感創意助手，幫助使用者捕捉和發展創意想法、設計概念、藝術靈感。你鼓勵開放思考和創新探索。'
    }

    if (islandName.includes('人際') || islandName.includes('社交') || islandName.includes('朋友')) {
      return '你是人際關係助手，協助使用者記錄和改善社交互動、人際溝通、情感表達。你富有同理心，善於傾聽和提供溫暖的建議。'
    }

    if (islandName.includes('生活') || islandName.includes('日常')) {
      return '你是生活記錄助手，幫助使用者記錄日常生活點滴、健康飲食、運動休閒。你親切隨和，關注生活品質的提升。'
    }

    if (islandName.includes('目標') || islandName.includes('規劃') || islandName.includes('计划')) {
      return '你是目標規劃助手，協助使用者設定和追蹤目標、制定計劃、記錄里程碑。你激勵人心，幫助使用者保持動力和專注。'
    }

    if (islandName.includes('資源') || islandName.includes('收藏') || islandName.includes('资源')) {
      return '你是資源收藏助手，幫助使用者整理和管理各類資源、文章連結、工具網站。你擅長分類整理和標籤化管理。'
    }

    // 預設
    return `你是 ${islandName} 的記憶助手，專注於幫助使用者記錄和整理相關的知識與經驗。你善於總結重點、提供實用建議。`
  }

  /**
   * 🆕 更新島嶼統計（替代 incrementAssistantStats）
   */
  async incrementIslandStats(
    islandId: string,
    type: 'memory' | 'chat'
  ): Promise<void> {
    const updateData = type === 'memory'
      ? { memoryCount: { increment: 1 } }
      : { totalChats: { increment: 1 } }

    await prisma.island.update({
      where: { id: islandId },
      data: updateData
    })

    // 清除該島嶼的快取，強制重新載入
    this.clearIslandCache(islandId)

    logger.info(`[IslandService] 島嶼統計更新: ${islandId} (${type})`)
  }

  /**
   * 🆕 降級方案：關鍵字分類（替代 fallbackCategoryDetection）
   */
  async fallbackClassification(userId: string, content: string): Promise<string | null> {
    await this.loadIslands(userId)
    const userCache = this.islandsCache.get(userId)

    if (!userCache) return null

    const islands = Array.from(userCache.values())
    const contentLower = content.toLowerCase()

    // 遍歷島嶼，計算關鍵字匹配分數
    const scores = islands.map(island => {
      const keywords = island.keywords || []
      const matchCount = keywords.filter((keyword: string) =>
        contentLower.includes(keyword.toLowerCase())
      ).length

      return {
        islandId: island.id,
        islandName: island.nameChinese,
        score: matchCount
      }
    })

    // 找出最高分
    const best = scores.reduce((max, current) =>
      current.score > max.score ? current : max
    , { islandId: null, islandName: '', score: 0 })

    if (best.score > 0) {
      logger.info(`[IslandService] 降級分類成功: ${best.islandName} (分數: ${best.score})`)
      return best.islandId
    }

    logger.warn('[IslandService] 降級分類失敗，無法匹配任何關鍵字')
    return null
  }

  /**
   * 🆕 創建島嶼
   */
  async createIsland(
    userId: string,
    data: {
      nameChinese: string
      emoji?: string
      color?: string
      description?: string
      systemPrompt?: string
      personality?: string
      chatStyle?: string
      keywords?: string[]
    }
  ) {
    // 獲取當前最大 position
    const maxPositionIsland = await prisma.island.findFirst({
      where: { userId },
      orderBy: { position: 'desc' },
      select: { position: true }
    })

    const newPosition = (maxPositionIsland?.position || 0) + 1

    const island = await prisma.island.create({
      data: {
        userId,
        position: newPosition,
        nameChinese: data.nameChinese,
        emoji: data.emoji || '🏝️',
        color: data.color || '#FFB3D9',
        description: data.description,
        systemPrompt: data.systemPrompt || this.getDefaultPrompt(data.nameChinese),
        personality: data.personality,
        chatStyle: data.chatStyle,
        keywords: data.keywords || [],
        // 3D 預設值
        positionX: 0,
        positionY: 0,
        positionZ: 0
      }
    })

    // 清除用戶快取
    this.clearUserCache(userId)

    logger.info(`[IslandService] 創建島嶼: ${island.nameChinese} (${island.id})`)

    return island
  }

  /**
   * 🆕 更新島嶼
   */
  async updateIsland(
    islandId: string,
    data: Partial<{
      nameChinese: string
      emoji: string
      color: string
      description: string
      systemPrompt: string
      personality: string
      chatStyle: string
      keywords: string[]
      position: number
      positionX: number
      positionY: number
      positionZ: number
      shape: string
      textureId: string
      modelUrl: string
      customShapeData: string
      islandHeight: number
      islandBevel: number
    }>
  ) {
    const island = await prisma.island.update({
      where: { id: islandId },
      data
    })

    // 清除快取
    this.clearIslandCache(islandId)

    logger.info(`[IslandService] 更新島嶼: ${island.nameChinese} (${islandId})`)

    return island
  }

  /**
   * 清除特定島嶼的快取
   */
  private clearIslandCache(islandId: string) {
    for (const [userId, userCache] of this.islandsCache.entries()) {
      if (userCache.has(islandId)) {
        userCache.delete(islandId)
        // 如果整個用戶快取為空，也刪除
        if (userCache.size === 0) {
          this.islandsCache.delete(userId)
          this.cacheExpiry.delete(userId)
        }
      }
    }
  }

  /**
   * 清除用戶快取
   */
  private clearUserCache(userId: string) {
    this.islandsCache.delete(userId)
    this.cacheExpiry.delete(userId)
  }

  /**
   * 清除所有快取（用於測試或強制刷新）
   */
  clearCache() {
    this.islandsCache.clear()
    this.cacheExpiry.clear()
    logger.info('[IslandService] 快取已清除')
  }
}

// 單例導出
export const islandService = new IslandService()
