/**
 * IslandService - 島嶼服務（替代 AssistantService）
 *
 * 功能：
 * 1. 管理用戶的島嶼（分類）
 * 2. 提供 AI 配置查詢
 * 3. 統計數據更新
 * 4. 向後兼容：CategoryType → Island 映射
 */

import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'
import { callGeminiAPI } from '../utils/geminiAPI'

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
   * @deprecated CategoryType no longer exists. Use getIslandByName instead.
   * This function has been removed as part of the CategoryType to Island migration.
   */
  async getIslandByType(userId: string, type: string) {
    throw new Error('getIslandByType is deprecated. CategoryType has been removed. Please use getIslandByName or dynamic island selection instead.')
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
   * 🆕 使用 AI 生成島嶼描述
   */
  private async generateDescriptionWithAI(nameChinese: string, userHint?: string): Promise<string> {
    try {
      const prompt = `你是一個創意寫作專家，擅長理解各種文化、娛樂、專業領域的內容。請為這個個人知識管理島嶼生成一個簡短、有吸引力的描述。

島嶼名稱：${nameChinese}
${userHint ? `用戶提示：${userHint}` : ''}

任務步驟：
1. 首先，理解「${nameChinese}」代表什麼（人物、團體、概念、領域等）
2. 然後，描述這個島嶼的用途和適合存放的內容
3. 讓描述既具體又有吸引力

要求：
- 描述要簡短（1-2 句話，30-50 字）
- 語氣溫暖、有親和力
- 使用繁體中文
- 如果是明星/團體/作品，要提及其特點

參考範例：
學習島 → 記錄學習筆記、課程心得和知識整理。讓每一次學習都有跡可循。
BTS島 → 收藏防彈少年團的音樂、影片和粉絲回憶。與世界級韓團一起成長。
漫威島 → 整理漫威電影、角色分析和超級英雄宇宙。探索無限可能的英雄世界。
美食島 → 分享美食體驗、餐廳推薦和料理靈感。品味生活的每一刻。

現在為「${nameChinese}」生成描述（記得先理解它是什麼）：`

      const response = await callGeminiAPI(prompt, {
        model: 'gemini-2.0-flash-exp',
        temperature: 0.7,  // 較高的溫度，允許創意輸出
        maxOutputTokens: 150,
        timeout: 10000  // 10 秒超時
      })

      const generatedDescription = response.trim()
      logger.info(`[IslandService] AI 生成描述: ${nameChinese} → ${generatedDescription.substring(0, 50)}...`)
      return generatedDescription
    } catch (error) {
      logger.error('[IslandService] AI 生成描述失敗，使用預設值:', error)
      // 失敗時返回基於名稱的預設描述
      return this.getDefaultDescription(nameChinese, userHint)
    }
  }

  /**
   * 🆕 獲取預設描述（降級方案）
   */
  private getDefaultDescription(nameChinese: string, userHint?: string): string {
    // 如果用戶提供了提示，優先使用
    if (userHint && userHint.trim()) {
      return `${userHint.trim()}。收藏相關的內容和美好回憶。`
    }

    // 根據名稱生成預設描述
    if (nameChinese.includes('學習') || nameChinese.includes('学习')) {
      return '記錄學習筆記、課程心得和知識整理。讓每一次學習都有跡可循。'
    }

    if (nameChinese.includes('工作') || nameChinese.includes('职业')) {
      return '管理工作任務、項目進度和會議筆記。讓工作更有條理。'
    }

    if (nameChinese.includes('旅行') || nameChinese.includes('旅遊')) {
      return '收藏旅行回憶、景點照片和遊記。把美好時光永遠珍藏。'
    }

    if (nameChinese.includes('美食') || nameChinese.includes('餐廳')) {
      return '分享美食體驗、餐廳推薦和料理靈感。品味生活的每一刻。'
    }

    if (nameChinese.includes('健身') || nameChinese.includes('運動')) {
      return '記錄運動計畫、健身成果和健康數據。打造更好的自己。'
    }

    if (nameChinese.includes('音樂') || nameChinese.includes('歌曲')) {
      return '收藏喜歡的音樂、歌單和演唱會回憶。讓音樂陪伴每一天。'
    }

    if (nameChinese.includes('電影') || nameChinese.includes('影視')) {
      return '記錄觀影心得、電影評論和推薦清單。探索光影的世界。'
    }

    if (nameChinese.includes('寵物') || nameChinese.includes('毛孩')) {
      return '記錄毛孩的成長、可愛瞬間和照顧心得。陪伴最愛的家人。'
    }

    // 嘗試識別常見的韓團/明星/作品名稱
    const koreanIdols = ['BTS', 'BLACKPINK', 'TWICE', 'IVE', 'NewJeans', 'aespa', 'EXO', 'NCT', 'SEVENTEEN']
    const upperName = nameChinese.toUpperCase()
    if (koreanIdols.some(idol => upperName.includes(idol.toUpperCase()))) {
      return `收藏${nameChinese}的音樂、影片、照片和粉絲活動。追隨偶像的每一刻精彩。`
    }

    // 識別是否包含「島」字
    if (nameChinese.includes('島')) {
      const baseName = nameChinese.replace('島', '')
      if (baseName) {
        return `收藏與${baseName}相關的內容、照片和回憶。打造專屬的知識空間。`
      }
    }

    // 通用但更有針對性的描述
    return `收藏關於${nameChinese}的內容、想法和回憶。打造專屬的知識空間。`
  }

  /**
   * 🆕 使用 AI 生成適合的 emoji
   */
  private async generateEmojiWithAI(nameChinese: string, description?: string): Promise<string> {
    try {
      const prompt = `你是一個 emoji 選擇專家。根據島嶼的名稱和描述，選擇一個最適合的 emoji。

島嶼名稱：${nameChinese}
${description ? `描述：${description}` : ''}

請直接輸出一個 emoji，不要加任何文字說明。

參考範例：
學習島 → 📚
旅行島 → ✈️
工作島 → 💼
靈感島 → 💡
美食島 → 🍕
健身島 → 💪
音樂島 → 🎵
電影島 → 🎬
寵物島 → 🐱
攝影島 → 📷

現在輸出最適合「${nameChinese}」的 emoji：`

      const response = await callGeminiAPI(prompt, {
        model: 'gemini-2.0-flash-exp',  // 使用 2.0 版本
        temperature: 0.2,  // 更低的溫度，確保輸出穩定
        maxOutputTokens: 50,  // 增加到 50，確保有足夠空間生成 emoji
        timeout: 5000  // 5 秒超時
      })

      // 清理回應並提取 emoji
      const cleanedResponse = response.trim()
      logger.info(`[IslandService] AI 原始回應: "${cleanedResponse}"`)

      // 更強大的 emoji 提取正則（支持各種 emoji 格式）
      const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA70}-\u{1FAFF}]/u
      const emojiMatch = cleanedResponse.match(emojiRegex)

      const generatedEmoji = emojiMatch ? emojiMatch[0] : cleanedResponse.charAt(0) || '🏝️'

      logger.info(`[IslandService] AI 生成 emoji: ${nameChinese} → ${generatedEmoji}`)
      return generatedEmoji
    } catch (error) {
      logger.error('[IslandService] AI 生成 emoji 失敗，使用預設值:', error)
      return '🏝️'  // 失敗時返回預設 emoji
    }
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

    // 🆕 使用 AI 生成完整的描述
    // - 如果用戶沒有提供描述，AI 會根據名稱生成
    // - 如果用戶提供了提示（description），AI 會參考提示生成更精準的描述
    let description = data.description
    if (description && description.trim()) {
      // 用戶提供了提示，讓 AI 參考生成更完整的描述
      description = await this.generateDescriptionWithAI(data.nameChinese, description.trim())
    } else {
      // 用戶沒有提供提示，AI 根據名稱生成描述
      description = await this.generateDescriptionWithAI(data.nameChinese)
    }

    // 🆕 如果用戶沒有提供 emoji，使用 AI 生成
    let emoji = data.emoji
    if (!emoji) {
      // 使用生成的描述來幫助選擇更適合的 emoji
      emoji = await this.generateEmojiWithAI(data.nameChinese, description)
    }

    const island = await prisma.island.create({
      data: {
        userId,
        position: newPosition,
        name: data.nameChinese,  // 使用中文名稱作為 name（向後兼容）
        nameChinese: data.nameChinese,
        emoji,
        color: data.color || '#FFB3D9',
        description,  // 使用 AI 生成的完整描述
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
   *
   * 修復：當清除單個島嶼時，也清除整個用戶快取和過期時間
   * 避免返回不完整的快取數據
   */
  private clearIslandCache(islandId: string) {
    for (const [userId, userCache] of this.islandsCache.entries()) {
      if (userCache.has(islandId)) {
        // 清除整個用戶快取，而不是只刪除單個島嶼
        // 這樣下次查詢時會重新從資料庫載入完整的島嶼列表
        this.islandsCache.delete(userId)
        this.cacheExpiry.delete(userId)

        logger.info(`[IslandService] 清除用戶 ${userId} 的島嶼快取 (因島嶼 ${islandId} 更新)`)
      }
    }
  }

  /**
   * 清除用戶快取
   */
  clearUserCache(userId: string) {
    this.islandsCache.delete(userId)
    this.cacheExpiry.delete(userId)
    logger.info(`[IslandService] 清除用戶 ${userId} 的快取`)
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
