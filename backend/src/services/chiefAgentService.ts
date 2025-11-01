import { PrismaClient, CategoryType, ChatContextType, ContentType } from '@prisma/client'
import { logger } from '../utils/logger'
import axios from 'axios'
import { callGeminiAPI, callGeminiAPIStream } from '../utils/geminiAPI'
import { islandService } from './islandService'
import { memoryService } from './memoryService'
import { subAgentService } from './subAgentService'
import { multimodalProcessor } from './multimodalProcessor'
import { chatSessionService } from './chatSessionService'
import { taskQueueService, TaskPriority } from './taskQueueService'
import { dynamicSubAgentService } from './dynamicSubAgentService'
import { vectorService } from './vectorService'
import { categoryInitService } from './categoryInitService'
import { categoryService } from './categoryService'

const prisma = new PrismaClient()

export interface ClassificationResult {
  suggestedCategory: CategoryType
  confidence: number
  reason: string
  alternativeCategories: CategoryType[]
}

export interface ProcessingResult {
  response: string
  summary: string
  keyPoints: string[]
  tags: string[]
  importance: number
  sentiment: string
  emoji?: string
  title?: string
}

export interface FileInput {
  url: string
  name: string
  type: string
  size?: number
}

export interface LinkInput {
  url: string
  title?: string
}

export interface UploadKnowledgeInput {
  content: string
  files?: FileInput[]
  links?: LinkInput[]
  contentType?: ContentType
}

export interface KnowledgeAnalysis {
  analysis: string
  summary: string
  identifiedTopics: string[]
  suggestedTags: string[]
  relevantAssistants: CategoryType[]
  confidence: number
}

// 優化：分類結果緩存接口
interface ClassificationCache {
  result: {
    category: CategoryType
    confidence: number
    reasoning: string
    warmResponse: string
    quickSummary: string
    shouldRecord: boolean
    recordReason?: string
    enrichedContent?: string
    linkMetadata?: Array<{ url: string, title: string, description: string }>
  }
  timestamp: number
}

/**
 * ChiefAgentService - 智能分配與全局管理服務
 */
export class ChiefAgentService {
  private mcpUrl: string
  private geminiModel: string = 'gemini-2.5-flash'

  // 優化：分類結果緩存（內存緩存，避免重複 API 調用）
  private classificationCache: Map<string, ClassificationCache> = new Map()
  private readonly CACHE_TTL = 30 * 60 * 1000 // 30 分鐘過期
  private readonly MAX_CACHE_SIZE = 1000 // 最多緩存 1000 條

  // Chief Agent 的默認 system prompt（不再依賴 Assistant 模型）
  private readonly CHIEF_SYSTEM_PROMPT = `你是「白噗噗」，一個溫暖、智慧的知識管理助手。

你的職責：
1. **快速分類** - 理解用戶輸入的內容，快速分類到合適的知識領域
2. **溫暖回應** - 用親切、鼓勵的語氣回應用戶
3. **智能分析** - 提供有洞察力的摘要和建議
4. **全局視角** - 從整體角度幫助用戶理解知識之間的關聯

你的風格：
- 溫暖親切，像朋友一樣
- 簡潔明確，不囉嗦
- 正面鼓勵，給予支持
- 智慧洞察，提供價值`

  constructor() {
    this.mcpUrl = process.env.MCP_SERVICE_URL || 'http://localhost:8765'

    // 检查 Gemini API Key
    const apiKey = process.env.GEMINI_API_KEY
    if (apiKey) {
      logger.info('Gemini REST API initialized successfully')
    } else {
      logger.warn('GEMINI_API_KEY not found, AI features will be limited')
    }

    // 優化：定期清理過期緩存
    setInterval(() => this.cleanExpiredCache(), 10 * 60 * 1000) // 每 10 分鐘清理一次
  }

  /**
   * 優化：生成內容的快速 hash（用於緩存 key）
   */
  private generateContentHash(content: string): string {
    // 簡單的 hash 函數（實際專案可使用 crypto）
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return hash.toString(36)
  }

  /**
   * 優化：檢查相似內容（簡單的相似度檢測，避免重複 AI 調用）
   * 使用 Jaccard 相似度（基於詞集）
   */
  private findSimilarCachedContent(content: string): ClassificationCache | null {
    const contentWords = new Set(content.toLowerCase().split(/\s+/).filter(w => w.length > 2))
    let bestMatch: { key: string; similarity: number; cache: ClassificationCache } | null = null

    for (const [key, cache] of this.classificationCache.entries()) {
      // 跳過已過期的緩存
      if (Date.now() - cache.timestamp > this.CACHE_TTL) continue

      // 從 key 重建內容（簡化版，實際可以在緩存中存儲原始內容）
      // 這裡我們使用一個簡單的啟發式：只對短內容（<100字）做相似度檢測
      if (content.length > 100) continue

      // 計算相似度（需要原始內容，這裡先跳過複雜實現）
      // 未來可以在 cache 中存儲 normalized content 用於比對
    }

    return null // 暫時返回 null，未來可以實現完整的相似度檢測
  }

  /**
   * 優化：清理過期緩存
   */
  private cleanExpiredCache(): void {
    const now = Date.now()
    let cleaned = 0

    for (const [key, cache] of this.classificationCache.entries()) {
      if (now - cache.timestamp > this.CACHE_TTL) {
        this.classificationCache.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      logger.info(`[Cache] Cleaned ${cleaned} expired entries, remaining: ${this.classificationCache.size}`)
    }
  }

  /**
   * 優化：檢查緩存容量並清理最舊的條目
   */
  private ensureCacheCapacity(): void {
    if (this.classificationCache.size >= this.MAX_CACHE_SIZE) {
      // 找到最舊的條目並刪除
      let oldestKey: string | null = null
      let oldestTime = Date.now()

      for (const [key, cache] of this.classificationCache.entries()) {
        if (cache.timestamp < oldestTime) {
          oldestTime = cache.timestamp
          oldestKey = key
        }
      }

      if (oldestKey) {
        this.classificationCache.delete(oldestKey)
        logger.debug(`[Cache] Removed oldest entry to free space`)
      }
    }
  }

  /**
   * 智能分類內容
   */
  async classifyContent(content: string): Promise<ClassificationResult> {
    try {
      const prompt = `你是 Heart Whisper Town 的智能分類助手。

分析以下內容並判斷最適合的分類：

"${content}"

請以 JSON 格式回覆（只回覆 JSON，不要其他文字）：
{
  "suggestedCategory": "LEARNING|INSPIRATION|WORK|SOCIAL|LIFE|GOALS|RESOURCES|MISC",
  "confidence": 0.0-1.0,
  "reason": "為什麼選擇這個分類？（簡短說明）",
  "alternativeCategories": ["其他可能的分類1", "其他可能的分類2"]
}

分類說明：
- LEARNING: 學習、知識、技能、課程
- INSPIRATION: 靈感、創意、想法、設計
- WORK: 工作、任務、專案、職涯
- SOCIAL: 朋友、人際、八卦、社交
- LIFE: 日常生活、心情、經驗、反思
- GOALS: 目標、夢想、計劃、里程碑
- RESOURCES: 文章、連結、影片、參考資料
- MISC: 雜項、不屬於其他類別的知識、待整理的內容`

      const response = await callGeminiAPI(prompt)
      const result = this.parseJSON(response)

      return {
        suggestedCategory: result.suggestedCategory as CategoryType,
        confidence: result.confidence || 0.8,
        reason: result.reason || '基於內容分析',
        alternativeCategories: result.alternativeCategories || []
      }
    } catch (error) {
      logger.error('Classification error:', error)

      // 降級處理：使用 LIFE 作為預設類別
      return {
        suggestedCategory: CategoryType.LIFE,
        confidence: 0.5,
        reason: '使用預設分類（AI 服務暫時無法使用）',
        alternativeCategories: []
      }
    }
  }

  /**
   * 處理內容並創建記憶
   * @deprecated This function is deprecated. Use the streaming API instead.
   * This function is broken due to the migration from assistantId to islandId.
   */
  async processAndCreateMemory(
    userId: string,
    assistantId: string,
    content: string,
    category: CategoryType,
    contextType: ChatContextType = ChatContextType.MEMORY_CREATION
  ) {
    throw new Error('This function is deprecated. Please use the streaming knowledge distribution API instead.')
    /* COMMENTED OUT - BROKEN DUE TO MIGRATION

    try {
      const assistant = await assistantService.getAssistantById(assistantId)
      if (!assistant) {
        throw new Error('Assistant not found')
      }

      // 獲取用戶最近的相關記憶（提供上下文）
      const recentMemories = await memoryService.getMemories({
        userId,
        category,
        limit: 5
      })

      const contextInfo = recentMemories.length > 0
        ? `\n\n用戶在此領域的最近記憶：\n${recentMemories.map(m => `- ${m.summary || m.rawContent.substring(0, 50)}`).join('\n')}`
        : ''

      const prompt = `${assistant.systemPrompt}

用戶分享了以下內容：
"${content}"
${contextInfo}

請完成以下任務：
1. 用你的個性回應用戶（親切、簡短、符合你的風格）
2. 提取核心知識點或重要資訊
3. 生成簡潔摘要（50字內）
4. 建議 2-5 個相關標籤
5. 評估重要性（1-10分）
6. 分析情感傾向（positive/neutral/negative）
7. 選擇一個代表性 emoji
8. 建議一個簡短標題（10字內）

以 JSON 格式回覆（只回覆 JSON）：
{
  "response": "給用戶的親切回應",
  "summary": "內容摘要",
  "keyPoints": ["重點1", "重點2", "重點3"],
  "tags": ["標籤1", "標籤2", "標籤3"],
  "importance": 1-10,
  "sentiment": "positive|neutral|negative",
  "emoji": "😊",
  "title": "簡短標題"
}`

      const aiResponse = await this.callMCP(prompt, assistant.id)
      const parsed = this.parseJSON(aiResponse)

      // 創建記憶
      const memory = await memoryService.createMemory({
        userId,
        assistantId,
        content,
        category,
        summary: parsed.summary || content.substring(0, 100),
        keyPoints: parsed.keyPoints || [],
        tags: parsed.tags || [],
        aiSentiment: parsed.sentiment || 'neutral',
        title: parsed.title,
        emoji: parsed.emoji
      })

      // 獲取或創建會話
      const session = await chatSessionService.getOrCreateSession(
        userId,
        assistantId,
        contextType
      )

      // 創建對話記錄
      const chatMessage = await prisma.chatMessage.create({
        data: {
          userId,
          assistantId,
          sessionId: session.id,
          userMessage: content,
          assistantResponse: parsed.response || '我已經幫你記下了！',
          memoryId: memory.id,
          contextType
        }
      })

      // 更新會話統計
      await chatSessionService.incrementMessageCount(session.id)
      await chatSessionService.updateLastMessageAt(session.id)

      // MIGRATION: Removed assistant stats, now using island stats only
      // 更新島嶼統計
      if (memory.islandId) {
        await islandService.incrementIslandStats(memory.islandId, 'memory')
        await islandService.incrementIslandStats(memory.islandId, 'chat')
      }

      // 查找相關記憶
      const relatedMemories = await memoryService.getRelatedMemories(memory.id, userId, 3)

      logger.info(`Memory created via ${assistant.name}: ${memory.id}`)

      return {
        memory,
        chat: chatMessage,
        suggestedTags: parsed.tags || [],
        relatedMemories
      }
    } catch (error) {
      logger.error('Process and create memory error:', error)
      throw new Error('處理內容失敗')
    }
    */
  }

  /**
   * DEPRECATED: 分類並創建記憶（一步完成）
   * Use uploadKnowledge instead
   */
  async classifyAndCreate(userId: string, content: string) {
    throw new Error('classifyAndCreate is deprecated. Use uploadKnowledge instead.')
    /* COMMENTED OUT - BROKEN DUE TO MIGRATION
    try {
      // 1. 智能分類
      const classification = await this.classifyContent(content)

      // 2. 獲取對應的助手
      const assistant = await assistantService.getAssistantByType(
        classification.suggestedCategory
      )

      if (!assistant) {
        throw new Error(`No assistant found for category: ${classification.suggestedCategory}`)
      }

      // 3. 處理並創建記憶
      const result = await this.processAndCreateMemory(
        userId,
        assistant.id,
        content,
        classification.suggestedCategory,
        ChatContextType.MEMORY_CREATION
      )

      return result
    } catch (error) {
      logger.error('Classify and create error:', error)
      throw error
    }
    */
  }

  /**
   * 生成全局摘要（Chief Agent 特殊功能）
   */
  async generateSummary(userId: string, days: number = 7) {
    try {

      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // 獲取時間範圍內的所有記憶
      const memories = await memoryService.getMemories({
        userId,
        startDate,
        isArchived: false,
        limit: 100
      })

      if (memories.length === 0) {
        return {
          weeklyStats: {
            startDate,
            endDate: new Date(),
            totalMemories: 0,
            totalChats: 0,
            categoryBreakdown: [],
            topTags: [],
            aiSummary: '這段時間沒有記錄任何資訊。'
          },
          crossDomainInsights: [],
          suggestions: ['開始記錄你的想法和生活吧！']
        }
      }

      // 統計分析
      const categoryCount: Record<string, number> = {}
      const tagCount: Record<string, number> = {}

      memories.forEach(m => {
        categoryCount[m.category] = (categoryCount[m.category] || 0) + 1
        m.tags.forEach(tag => {
          tagCount[tag] = (tagCount[tag] || 0) + 1
        })
      })

      const totalCount = memories.length
      const categoryBreakdown = Object.entries(categoryCount).map(([category, count]) => ({
        category: category as CategoryType,
        count,
        percentage: (count / totalCount) * 100
      }))

      const topTags = Object.entries(tagCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count }))

      // 準備給 Chief 的資料
      const memorySummaries = memories
        .slice(0, 50) // 最多 50 條
        .map(m => `[${m.category}] ${m.title || m.summary || m.rawContent.substring(0, 50)}`)
        .join('\n')

      const prompt = `${this.CHIEF_SYSTEM_PROMPT}

作為用戶的總管，請分析過去 ${days} 天的記錄並提供洞察。

記錄摘要（共 ${memories.length} 條）：
${memorySummaries}

分類統計：
${categoryBreakdown.map(c => `- ${c.category}: ${c.count} 條 (${c.percentage.toFixed(1)}%)`).join('\n')}

熱門標籤：
${topTags.map(t => `- ${t.tag}: ${t.count} 次`).join('\n')}

請提供：
1. 整體摘要（100字內）
2. 跨領域洞察（發現不同領域之間的關聯，2-3個）
3. 行動建議（3-5個具體建議）

以 JSON 格式回覆：
{
  "summary": "整體摘要",
  "insights": [
    {
      "title": "洞察標題",
      "description": "詳細說明",
      "relatedCategories": ["LEARNING", "WORK"],
      "actionable": true
    }
  ],
  "suggestions": ["建議1", "建議2", "建議3"]
}`

      const response = await this.callMCP(prompt, 'chief-agent')
      const result = this.parseJSON(response)

      return {
        weeklyStats: {
          startDate,
          endDate: new Date(),
          totalMemories: memories.length,
          totalChats: memories.reduce((sum, m) => sum + (m.chatMessages?.length || 0), 0),
          categoryBreakdown,
          topTags,
          aiSummary: result.summary || '分析完成'
        },
        crossDomainInsights: result.insights || [],
        suggestions: result.suggestions || []
      }
    } catch (error) {
      logger.error('Generate summary error:', error)
      throw new Error('生成摘要失敗')
    }
  }

  /**
   * 與 Chief Agent 對話（RAG 增強版）
   *
   * 雙重檢索策略：
   * 1. 語意搜索：找出與問題最相關的記憶（top 10）
   * 2. 時間維度：最近 10 條記憶（保持時間脈絡）
   * 3. 合併去重：優先語意相關，保留時間新鮮度
   *
   * @deprecated This function is broken due to the migration from assistantId to islandId.
   * Chat sessions now require islandId, but Chief is an Assistant not an Island.
   */
  async chatWithChief(userId: string, message: string) {
    throw new Error('chatWithChief is currently broken due to schema migration. Please use island-based chat instead.')
    /* COMMENTED OUT - BROKEN DUE TO MIGRATION

    try {
      const startTime = Date.now()

      logger.info(`[Chat with Chief] User ${userId} asks: "${message.substring(0, 50)}..."`)

      // === 雙重檢索策略 ===

      // 1️⃣ 語意搜索：找出語意相關的記憶（相似度 > 0.6）
      let semanticMemories: Array<{ memoryId: string; similarity: number; textContent: string }> = []
      try {
        const semanticStartTime = Date.now()
        semanticMemories = await vectorService.semanticSearch(
          userId,
          message,
          10, // 取前 10 條
          0.6 // 相似度閾值 0.6
        )
        const semanticTime = Date.now() - semanticStartTime
        logger.info(`[Chat with Chief] Semantic search completed in ${semanticTime}ms, found ${semanticMemories.length} relevant memories`)
      } catch (error) {
        logger.warn('[Chat with Chief] Semantic search failed, falling back to temporal only:', error)
      }

      // 2️⃣ 時間維度：最近 10 條記憶
      const temporalStartTime = Date.now()
      const recentMemories = await memoryService.getMemories({
        userId,
        limit: 10
      })
      const temporalTime = Date.now() - temporalStartTime
      logger.info(`[Chat with Chief] Temporal search completed in ${temporalTime}ms, found ${recentMemories.length} recent memories`)

      // 3️⃣ 合併去重：優先語意相關 + 補充時間維度
      const semanticMemoryIds = new Set(semanticMemories.map(m => m.memoryId))
      const mergedMemoryIds = [
        ...semanticMemoryIds, // 語意相關的記憶
        ...recentMemories
          .filter(m => !semanticMemoryIds.has(m.id)) // 排除已包含的
          .slice(0, 5) // 最多補充 5 條最近記憶
          .map(m => m.id)
      ]

      // 4️⃣ 獲取完整記憶資訊
      const contextMemories = await prisma.memory.findMany({
        where: {
          id: { in: mergedMemoryIds },
          userId
        },
        select: {
          id: true,
          category: true,
          summary: true,
          rawContent: true,
          title: true,
          createdAt: true,
          tags: true
        },
        orderBy: { createdAt: 'desc' }
      })

      // 5️⃣ 構建上下文資訊（標註來源）
      const contextInfo = contextMemories.length > 0
        ? `\n\n【知識庫上下文】以下是與你的問題相關的記憶：\n${contextMemories.map((m, i) => {
            const isSemanticMatch = semanticMemoryIds.has(m.id)
            const label = isSemanticMatch ? '🔍 語意相關' : '🕒 最近記錄'
            const content = m.summary || m.rawContent.substring(0, 100)
            return `${i + 1}. [${label}] [${m.category}] ${m.title || content}...\n   ${content}`
          }).join('\n\n')}`
        : '\n\n【知識庫上下文】目前沒有找到相關記憶。'

      const prompt = `${this.CHIEF_SYSTEM_PROMPT}

用戶詢問：${message}
${contextInfo}

請基於提供的知識庫上下文來回答用戶的問題。如果上下文中沒有相關資訊，請誠實告知並給予溫暖的回應。`

      const response = await this.callMCP(prompt, 'chief-agent')

      // 獲取或創建會話
      const session = await chatSessionService.getOrCreateSession(
        userId,
        'chief-agent',
        ChatContextType.GENERAL_CHAT
      )

      // 記錄對話
      const chatMessage = await prisma.chatMessage.create({
        data: {
          userId,
          assistantId: 'chief-agent',
          sessionId: session.id,
          userMessage: message,
          assistantResponse: response,
          contextType: ChatContextType.GENERAL_CHAT
        }
      })

      // 更新會話統計
      await chatSessionService.incrementMessageCount(session.id)
      await chatSessionService.updateLastMessageAt(session.id)

      // MIGRATION: Removed assistant stats

      const totalTime = Date.now() - startTime
      logger.info(`[Chat with Chief] Chat completed in ${totalTime}ms, used ${contextMemories.length} memories (${semanticMemories.length} semantic + ${contextMemories.length - semanticMemories.length} temporal)`)

      return chatMessage
    } catch (error) {
      logger.error('Chat with chief error:', error)
      throw new Error('與總管對話失敗')
    }
    */
  }

  /**
   * 調用 Gemini API 生成內容（支持多模態：文本+圖片）
   * 優化：完全使用 REST API，移除不穩定的 CLI
   */
  private async callMCP(
    prompt: string,
    assistantId: string,
    images?: Array<{ mimeType: string; data: string }>
  ): Promise<string> {
    try {
      // 直接使用 Gemini REST API（快速、穩定）
      // 對話使用 0.8 temperature 以獲得更有創意和情感的回應
      const response = await callGeminiAPI(prompt, {
        model: this.geminiModel,
        temperature: 0.8, // 提升 temperature 增強情感表達和創意
        maxOutputTokens: 2048,
        timeout: 60000, // 60 秒超時 - 增加以應對複雜對話
        images // 傳遞圖片數據（多模態支援）
      })

      return response

    } catch (error: any) {
      logger.error(`[Chief Agent] Gemini API error: ${error.message || error}`)
      logger.error(`[Chief Agent] Error details:`, {
        message: error.message,
        stack: error.stack,
        model: this.geminiModel
      })

      // Fallback: 使用 MCP Server（如果配置）
      try {
        logger.info('[Chief Agent] Trying MCP Server fallback')
        const fallbackResponse = await axios.post(
          `${this.mcpUrl}/generate`,
          {
            npc_id: assistantId,
            message: prompt,
            session_id: `assistant-${assistantId}-${Date.now()}`
          },
          {
            timeout: 30000,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        )

        return fallbackResponse.data.response || ''
      } catch (fallbackError) {
        logger.error('[Chief Agent] All AI services failed')
        throw new Error('AI 服務暫時不可用，請稍後再試')
      }
    }
  }

  /**
   * 解析 JSON 回應
   */
  private parseJSON(text: string): any {
    try {
      // 嘗試提取 JSON 部分
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }

      // 直接解析
      return JSON.parse(text)
    } catch (error) {
      logger.warn('JSON parse failed, using fallback:', text)

      // 返回預設結構
      return {
        response: text.substring(0, 100),
        summary: text.substring(0, 50),
        keyPoints: [],
        tags: [],
        importance: 5,
        sentiment: 'neutral'
      }
    }
  }

  /**
   * 白噗噗快速分類（輕量級 - 使用 Gemini 2.5 Flash）
   * 只做：1. 快速分類 2. 溫暖回應 3. 簡單摘要
   * 新增：4. 提取連結元數據（標題、描述）- 幫助 SubAgent 更好地評估
   *
   * ⚠️ 所有對話都會被記錄到資料庫，不再判斷 shouldRecord
   */
  async quickClassifyForTororo(
    userId: string,
    input: UploadKnowledgeInput
  ): Promise<{
    category: CategoryType
    confidence: number
    reasoning: string     // 分類理由（用於調試和追蹤）
    warmResponse: string  // 白噗噗的溫暖回應
    quickSummary: string  // 一句話摘要
    shouldRecord: boolean // 固定為 true，所有對話都記錄
    recordReason?: string // 保留字段以保持向下兼容
    enrichedContent?: string // 豐富化的內容（包含連結元數據）
    linkMetadata?: Array<{ url: string, title: string, description: string }> // 連結元數據
    aiSelectedIslandName?: string // AI 選擇的島嶼名稱（用於自訂島嶼）
  }> {
    try {
      // 優化：檢查緩存（相同內容直接返回）
      const cacheKey = this.generateContentHash(input.content)
      const cached = this.classificationCache.get(cacheKey)

      if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
        logger.info(`[白噗噗] 使用緩存結果（命中率提升）`)
        return cached.result
      }

      logger.info(`[白噗噗] 開始快速分類`)

      // === 檢查用戶是否有自訂 Islands ===
      const userIslands = await dynamicSubAgentService.getUserIslands(userId)
      const hasCustomCategories = userIslands.length > 0

      // === 優化：移除連結提取，提升響應速度 ===
      // 連結標題提取改由後台 SubAgent 處理（詳細分析階段）
      // 這樣用戶可以立即看到「已加入隊列」，而不用等待 5-15 秒

      const enrichedContent = input.content // 不再豐富化內容
      const linkMetadata: Array<{ url: string, title: string, description: string }> = [] // 空陣列

      // 檢測是否有連結（用於日誌記錄）
      const hasLinks = (input.links && input.links.length > 0) ||
                      /(https?:\/\/[^\s]+)/gi.test(input.content)

      if (hasLinks) {
        logger.info(`[白噗噗] 檢測到連結，將由 SubAgent 深度分析（優化：跳過同步提取）`)
      }

      // === 處理多模態文件（圖片、影片、音頻）===
      const images: Array<{ mimeType: string; data: string }> = []
      const MAX_FILE_SIZE_FOR_INLINE = 10 * 1024 * 1024 // 10MB（Gemini inline_data 限制為 20MB，保守設為 10MB）

      if (input.files && input.files.length > 0) {
        // 篩選可直接分析的媒體檔案（圖片、影片、音頻）
        const mediaFiles = input.files.filter(f =>
          f.type.startsWith('image/') ||
          f.type.startsWith('video/') ||
          f.type.startsWith('audio/')
        )

        if (mediaFiles.length > 0) {
          logger.info(`[白噗噗] 檢測到 ${mediaFiles.length} 個媒體文件，開始處理...`)
          logger.info(`[白噗噗] 媒體文件詳情: ${JSON.stringify(mediaFiles.map(f => ({ name: f.name, type: f.type, size: f.size })))}`)

          // 並行下載所有媒體檔案（優先嘗試下載，下載後再檢查大小）
          const mediaDownloadTasks = mediaFiles.map(async (file) => {
            try {
              logger.info(`[白噗噗] 開始下載: ${file.name} (${file.url})`)

              const response = await axios.get(file.url, {
                responseType: 'arraybuffer',
                timeout: 30000, // 影片/音頻可能較大，增加超時時間
                maxContentLength: MAX_FILE_SIZE_FOR_INLINE,
                maxRedirects: 5
              })

              const downloadedSize = response.data.byteLength
              logger.info(`[白噗噗] 下載完成: ${file.name}, 實際大小: ${(downloadedSize / 1024 / 1024).toFixed(2)}MB`)

              // 下載後檢查實際大小（Cloudinary 壓縮後可能更小）
              if (downloadedSize > MAX_FILE_SIZE_FOR_INLINE) {
                logger.info(`[白噗噗] 檔案 ${file.name} 下載後大小 (${(downloadedSize / 1024 / 1024).toFixed(2)}MB) 超過 10MB，跳過分析`)
                return null
              }

              const base64Data = Buffer.from(response.data).toString('base64')

              return {
                mimeType: file.type,
                data: base64Data
              }
            } catch (error: any) {
              logger.error(`[白噗噗] 下載媒體檔案失敗 (${file.name}):`, {
                message: error.message,
                code: error.code,
                status: error.response?.status
              })
              return null
            }
          })

          const downloadedMedia = await Promise.all(mediaDownloadTasks)

          // 過濾掉失敗或過大的檔案
          downloadedMedia.forEach(media => {
            if (media) images.push(media)
          })

          logger.info(`[白噗噗] ✅ 成功下載並轉換 ${images.length}/${mediaFiles.length} 個媒體檔案`)
          if (images.length === 0 && mediaFiles.length > 0) {
            logger.warn(`[白噗噗] ⚠️ 所有媒體檔案下載失敗或過大，無法提供給 Gemini 分析`)
          }
        }
      }

      // 構建智能分類 Prompt（動態版：根據用戶自訂類別調整）
      const prompt = hasCustomCategories
        ? this.buildDynamicClassificationPrompt(enrichedContent, input, userIslands)
        : this.buildDefaultClassificationPrompt(enrichedContent, input)

      // 使用 Gemini 2.5 Flash (快速模型)
      const oldModel = this.geminiModel
      this.geminiModel = 'gemini-2.5-flash'

      const response = await this.callMCP(prompt, 'chief-agent', images.length > 0 ? images : undefined)
      const result = this.parseJSON(response)

      this.geminiModel = oldModel // 恢復原模型

      // 處理分類結果（動態分類 vs 預設分類）
      let finalCategory: CategoryType
      let finalReasoning: string

      if (hasCustomCategories) {
        // 動態分類：AI 返回自訂類別的中文名稱
        // 使用 MISC 作為佔位符（實際分類由 findRelevantSubAgents 完成）
        finalCategory = CategoryType.MISC
        finalReasoning = `自訂分類: ${result.category} - ${result.reasoning || '關鍵字匹配'}`
        logger.info(`[白噗噗] 動態分類結果: ${result.category} (${finalReasoning})`)
      } else {
        // 預設分類：AI 返回 CategoryType
        finalCategory = result.category as CategoryType || CategoryType.LIFE
        finalReasoning = result.reasoning || '自動分類'
        logger.info(`[白噗噗] 預設分類結果: ${finalCategory} (置信度: ${result.confidence || 0.8}, 理由: ${finalReasoning})`)
      }

      const classificationResult = {
        category: finalCategory,
        confidence: result.confidence || 0.8,
        reasoning: finalReasoning,
        warmResponse: result.warmResponse || '收到了',
        quickSummary: result.quickSummary || input.content.substring(0, 30),
        shouldRecord: true, // ⚠️ 固定為 true，所有對話都記錄到資料庫
        recordReason: undefined, // 不再需要記錄原因
        enrichedContent: undefined, // 優化：不再同步豐富化內容
        linkMetadata: undefined, // 優化：連結元數據由 SubAgent 提取
        aiSelectedIslandName: hasCustomCategories ? result.category : undefined // 新增：AI 選擇的島嶼名稱
      }

      // 優化：保存到緩存
      this.ensureCacheCapacity()
      this.classificationCache.set(cacheKey, {
        result: classificationResult,
        timestamp: Date.now()
      })
      logger.debug(`[Cache] Saved classification result, cache size: ${this.classificationCache.size}`)

      return classificationResult
    } catch (error) {
      logger.error('[白噗噗] 快速分類失敗:', error)

      // 降級方案：使用 LIFE 作為預設類別
      return {
        category: CategoryType.LIFE,
        confidence: 0.5,
        reasoning: '使用預設分類（AI 暫時無法使用）',
        warmResponse: '收到了，我幫你記下來',
        quickSummary: input.content.substring(0, 30),
        shouldRecord: true, // ⚠️ 固定為 true，所有對話都記錄到資料庫
        recordReason: undefined
      }
    }
  }

  /**
   * 分析知識內容（多模態支援）- 保留舊版完整分析
   */
  async analyzeKnowledge(
    userId: string,
    input: UploadKnowledgeInput
  ): Promise<KnowledgeAnalysis> {
    try {

      logger.info(`[Chief Agent] 開始多模態內容分析（並行處理）`)

      // === Stage 4: 深度多模態處理（優化：並行處理所有媒體）===
      const imageAnalyses: any[] = []
      const pdfAnalyses: any[] = []
      const linkAnalyses: any[] = []

      // 收集所有要處理的任務
      type ProcessingResult = { type: string; file?: string; [key: string]: any } | null
      const processingTasks: Promise<ProcessingResult>[] = []

      // 1. 處理圖片檔案（並行）
      if (input.files && input.files.length > 0) {
        const imageFiles = input.files.filter(f => f.type.startsWith('image/'))
        imageFiles.forEach(file => {
          logger.info(`[Chief Agent] 分析圖片: ${file.name}`)
          processingTasks.push(
            multimodalProcessor.processImage(file.url, input.content)
              .then(analysis => ({ type: 'image', file: file.name, ...analysis }))
              .catch(err => {
                logger.error(`圖片處理失敗 ${file.name}:`, err)
                return null
              })
          )
        })

        // 2. 處理 PDF 檔案（並行）
        const pdfFiles = input.files.filter(f => f.type.includes('pdf'))
        pdfFiles.forEach(file => {
          logger.info(`[Chief Agent] 分析 PDF: ${file.name}`)
          processingTasks.push(
            multimodalProcessor.processPDF(file.url, input.content)
              .then(analysis => ({ type: 'pdf', file: file.name, ...analysis }))
              .catch(err => {
                logger.error(`PDF處理失敗 ${file.name}:`, err)
                return null
              })
          )
        })
      }

      // 3. 處理連結（並行）
      if (input.links && input.links.length > 0) {
        input.links.forEach(link => {
          logger.info(`[Chief Agent] 分析連結: ${link.url}`)
          processingTasks.push(
            multimodalProcessor.processLink(link.url, input.content)
              .then(analysis => ({ type: 'link', ...analysis }))
              .catch(err => {
                logger.error(`連結處理失敗 ${link.url}:`, err)
                return null
              })
          )
        })
      }

      // 並行執行所有處理任務
      const results = await Promise.all(processingTasks)

      // 分類結果
      results.forEach(result => {
        if (!result) return
        if (result.type === 'image') imageAnalyses.push(result)
        else if (result.type === 'pdf') pdfAnalyses.push(result)
        else if (result.type === 'link') linkAnalyses.push(result)
      })

      logger.info(`[Chief Agent] 多模態處理完成 - 圖片:${imageAnalyses.length}, PDF:${pdfAnalyses.length}, 連結:${linkAnalyses.length}`)

      // 构建增强的分析提示词
      let prompt = `${this.CHIEF_SYSTEM_PROMPT}

作為知識管理系統的總管，請分析以下內容並提供詳細的分類建議。

**主要內容:**
${input.content}
`

      // 添加图片分析结果
      if (imageAnalyses.length > 0) {
        prompt += `\n**圖片分析結果 (${imageAnalyses.length}張):**\n`
        imageAnalyses.forEach((analysis, i) => {
          prompt += `${i + 1}. ${analysis.file}\n`
          prompt += `   - 描述: ${analysis.description}\n`
          prompt += `   - 標籤: ${analysis.tags.join(', ')}\n`
          prompt += `   - 關鍵洞察: ${analysis.keyInsights.join('; ')}\n`
        })
      }

      // 添加 PDF 分析结果
      if (pdfAnalyses.length > 0) {
        prompt += `\n**PDF 文檔分析 (${pdfAnalyses.length}份):**\n`
        pdfAnalyses.forEach((analysis, i) => {
          prompt += `${i + 1}. ${analysis.file}\n`
          prompt += `   - 摘要: ${analysis.summary}\n`
          prompt += `   - 關鍵要點: ${analysis.keyPoints.join('; ')}\n`
          prompt += `   - 主題: ${analysis.topics.join(', ')}\n`
        })
      }

      // 添加連結分析結果
      if (linkAnalyses.length > 0) {
        prompt += `\n**鏈接內容分析 (${linkAnalyses.length}個):**\n`
        linkAnalyses.forEach((analysis, i) => {
          prompt += `${i + 1}. ${analysis.title}\n`
          prompt += `   - 摘要: ${analysis.summary}\n`
          prompt += `   - 標籤: ${analysis.tags.join(', ')}\n`
          prompt += `   - URL: ${analysis.url}\n`
        })
      }

      prompt += `
請以 JSON 格式回應，包含以下字段：

{
  "analysis": "深入分析這段內容的主要含義、價值和重要性",
  "summary": "一句話摘要（30字以內）",
  "identifiedTopics": ["主題1", "主題2", "主題3"],
  "suggestedTags": ["標籤1", "標籤2", "標籤3"],
  "relevantAssistants": ["LEARNING", "WORK", "INSPIRATION"],
  "confidence": 0.95
}

**可用的 Assistant 類型:**
- LEARNING (學習筆記)
- INSPIRATION (靈感創意)
- WORK (工作事務)
- SOCIAL (人際關係)
- LIFE (生活記錄)
- GOALS (目標規劃)
- RESOURCES (資源收藏)
- MISC (雜項、不屬於其他類別的知識)

請根據內容的主題和性質，選擇 1-3 個最相關的 Assistant。`

      const response = await this.callMCP(prompt, 'chief-agent')
      const parsed = this.parseJSON(response)

      return {
        analysis: parsed.analysis || '分析內容',
        summary: parsed.summary || input.content.substring(0, 30),
        identifiedTopics: Array.isArray(parsed.identifiedTopics) ? parsed.identifiedTopics : [],
        suggestedTags: Array.isArray(parsed.suggestedTags) ? parsed.suggestedTags : [],
        relevantAssistants: Array.isArray(parsed.relevantAssistants)
          ? parsed.relevantAssistants.filter((a: string) => this.isValidCategoryType(a))
          : [CategoryType.LEARNING],
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
      }
    } catch (error) {
      logger.error('Analyze knowledge error:', error)

      // 降級方案：使用關鍵字匹配
      return this.fallbackAnalysis(input)
    }
  }

  /**
   * 上傳知識到分發系統（新架構 - 雙階段處理 + Island-based SubAgent）
   * 階段1: 白噗噗快速分類 + 即時回應（前端立即顯示）
   * 階段2: Sub-Agent 深度分析 + 寫入知識庫（後端非同步處理）
   *
   * 使用 Island-based SubAgent 系統：
   * - 基於用戶自訂的 Islands（島嶼）進行動態分類
   * - 每個 Island 對應一個動態 SubAgent
   */
  async uploadKnowledge(
    userId: string,
    input: UploadKnowledgeInput
  ) {
    const startTime = Date.now()

    try {
      logger.info(`[Chief Agent] 開始處理知識上傳，用戶: ${userId}`)

      // === 階段 1: 白噗噗快速分類（Gemini 2.5 Flash）===
      const quickResult = await this.quickClassifyForTororo(userId, input)
      logger.info(`[白噗噗] 快速分類完成: ${quickResult.category} (${quickResult.confidence})`)

      // ⚠️ 所有對話都會被記錄到資料庫，不再跳過任何內容

      // 2. 確定內容類型
      const contentType = this.determineContentType(input)

      // === 使用 Island-based SubAgent 系統（唯一路徑）===
      logger.info('[Chief Agent] 使用 Island-based SubAgent 系統')

      // ✨ 獲取所有用戶的島嶼進行比較
      let allUserIslands = await dynamicSubAgentService.getUserIslands(userId)

        if (allUserIslands.length === 0) {
          logger.warn('[Chief Agent] 用戶沒有任何 Island，自動創建預設島嶼')

          // 自動為用戶創建預設島嶼
          const { islands } = await categoryInitService.initializeDefaultCategories(userId)

          if (islands.length === 0) {
            throw new Error('無法創建預設島嶼')
          }

          logger.info(`[Chief Agent] 已為用戶創建 ${islands.length} 個預設島嶼`)

          // 更新 allUserIslands 為新創建的島嶼
          allUserIslands.splice(0, allUserIslands.length, ...islands)
        }

        logger.info(`[Chief Agent] ✨ 將評估所有 ${allUserIslands.length} 個島嶼以找到最佳匹配`)

        // 優先使用 AI 選擇的島嶼名稱（作為參考）
        let primaryIsland = null

        if (quickResult.aiSelectedIslandName) {
          primaryIsland = allUserIslands.find(
            island => island.nameChinese === quickResult.aiSelectedIslandName
          )

          if (primaryIsland) {
            logger.info(`[Chief Agent] AI 選擇的主要 Island: ${primaryIsland.nameChinese} (${primaryIsland.id})`)
          }
        }

        // 優化：直接使用原始內容（連結提取由 SubAgent 處理）
        const contentForDistribution = input.content

        // 優化：使用簡單的連結標題（詳細元數據由 SubAgent 提取）
        const enrichedLinkTitles = input.links?.map(l => l.title || l.url) || []

        // 創建知識分發記錄（使用 Island-based assistant）
        // 優化：移除 include（不需要立即載入關聯，提升寫入速度）
        const distribution = await prisma.knowledgeDistribution.create({
          data: {
            userId,
            rawContent: contentForDistribution,
            contentType,
            fileUrls: input.files?.map(f => f.url) || [],
            fileNames: input.files?.map(f => f.name) || [],
            fileTypes: input.files?.map(f => f.type) || [],
            links: input.links?.map(l => l.url) || [],
            linkTitles: enrichedLinkTitles,
            chiefAnalysis: `白噗噗快速分類 → 將評估所有島嶼`,
            chiefSummary: quickResult.quickSummary,
            identifiedTopics: primaryIsland ? [primaryIsland.nameChinese] : [],
            suggestedTags: [],
            distributedTo: [], // 使用 Island ID（稍後在任務處理時映射到 assistant）
            storedBy: [],
            processingTime: Date.now() - startTime,
          }
        })

        logger.info(`[Chief Agent] 知識分發記錄創建完成，ID: ${distribution.id}`)

        // ✨ 加入任務隊列，傳遞所有 Island IDs 進行比較
        const allIslandIds = allUserIslands.map(island => island.id)
        const taskId = await taskQueueService.addTask(
          userId,
          distribution.id,
          allIslandIds, // 傳遞所有島嶼進行比較
          TaskPriority.NORMAL
        )

        logger.info(`[Chief Agent] Island-based SubAgent 任務已加入隊列，TaskID: ${taskId}`)

        // 返回白噗噗的溫暖回應 + Island 資訊
        return {
          distribution: {
            ...distribution,
            agentDecisions: [],
            memories: []
          },
          tororoResponse: {
            warmMessage: `${quickResult.warmResponse}\n我會幫你找到最適合的島嶼來儲存喔！`,
            category: quickResult.category,
            quickSummary: quickResult.quickSummary,
            confidence: quickResult.confidence,
            reasoning: quickResult.reasoning,
            island: primaryIsland ? {
              id: primaryIsland.id,
              name: primaryIsland.nameChinese,
              emoji: primaryIsland.emoji,
              color: primaryIsland.color
            } : undefined
          },
          quickClassifyResult: quickResult, // 添加完整分類結果（用於 SSE）
          agentDecisions: [],
          memoriesCreated: [],
          processingTime: Date.now() - startTime,
          backgroundProcessing: true,
          skipRecording: false // 所有內容都會被記錄
        }
    } catch (error) {
      logger.error('[Chief Agent] 上傳知識失敗:', error)
      throw new Error('處理知識上傳失敗')
    }
  }

  /**
   * 上傳知識（Streaming 模式 - 一次 AI 調用，分階段返回）
   *
   * 流程：
   * 1. 階段 1 (3秒)：即時回應 (category, warmResponse, quickSummary)
   * 2. 階段 2 (10秒)：深度分析 (detailedSummary, keyInsights, tags, advice)
   * 3. 創建 Memory
   */
  async *uploadKnowledgeStream(
    userId: string,
    input: UploadKnowledgeInput
  ): AsyncGenerator<any, void, unknown> {
    const startTime = Date.now()

    try {
      logger.info(`[Chief Agent Stream] 開始處理知識上傳，用戶: ${userId}`)

      // 獲取用戶島嶼
      let allUserIslands = await dynamicSubAgentService.getUserIslands(userId)

      if (allUserIslands.length === 0) {
        logger.warn('[Chief Agent Stream] 用戶沒有任何 Island，自動創建預設島嶼')
        const { islands } = await categoryInitService.initializeDefaultCategories(userId)
        if (islands.length === 0) {
          throw new Error('無法創建預設島嶼')
        }
        allUserIslands = islands
      }

      // 處理多模態文件（圖片）
      const images: Array<{ mimeType: string; data: string }> = []
      const MAX_FILE_SIZE_FOR_INLINE = 10 * 1024 * 1024

      if (input.files && input.files.length > 0) {
        const mediaFiles = input.files.filter(f =>
          f.type.startsWith('image/') ||
          f.type.startsWith('video/') ||
          f.type.startsWith('audio/')
        )

        if (mediaFiles.length > 0) {
          const mediaDownloadTasks = mediaFiles.map(async (file) => {
            try {
              const response = await axios.get(file.url, {
                responseType: 'arraybuffer',
                timeout: 30000,
                maxContentLength: MAX_FILE_SIZE_FOR_INLINE,
                maxRedirects: 5
              })

              const downloadedSize = response.data.byteLength
              if (downloadedSize > MAX_FILE_SIZE_FOR_INLINE) {
                return null
              }

              const base64Data = Buffer.from(response.data).toString('base64')
              return {
                mimeType: file.type,
                data: base64Data
              }
            } catch (error) {
              logger.error(`[Chief Agent Stream] 下載媒體檔案失敗 (${file.name}):`, error)
              return null
            }
          })

          const downloadedMedia = await Promise.all(mediaDownloadTasks)
          downloadedMedia.forEach(media => {
            if (media) images.push(media)
          })
        }
      }

      // 構建 streaming prompt
      const prompt = this.buildStreamingClassificationPrompt(input.content, input, allUserIslands)

      // 流式接收 Gemini 回應
      let fullText = ''
      let immediateResponse: any = null
      let deepAnalysis: any = null

      logger.info(`[Chief Agent Stream] 開始 Streaming 調用...`)

      // 優化的 API 配置：快速響應
      for await (const chunk of callGeminiAPIStream(prompt, {
        images,
        temperature: 0.4,        // 降低隨機性，加快決策
        maxOutputTokens: 2048    // 限制輸出長度，加快生成
      })) {
        fullText += chunk

        // 嘗試解析第一階段（即時回應）
        if (!immediateResponse) {
          try {
            const immediateMatch = fullText.match(/\{\s*"immediateResponse"\s*:\s*(\{[^}]+\})\s*\}/s)
            if (immediateMatch) {
              const immediateJson = `{"immediateResponse":${immediateMatch[1]}}`
              const parsed = JSON.parse(immediateJson)
              immediateResponse = parsed.immediateResponse

              logger.info(`[Chief Agent Stream] ✅ 階段 1 完成 - 即時回應`)
              logger.info(`[Chief Agent Stream]    - category: ${immediateResponse.category}`)
              logger.info(`[Chief Agent Stream]    - warmResponse: ${immediateResponse.warmResponse}`)

              // 🎯 立即發送給前端！
              yield {
                type: 'immediate',
                data: immediateResponse,
                processingTime: Date.now() - startTime
              }
            }
          } catch (e) {
            // JSON 還沒完整，繼續等待
          }
        }

        // 嘗試解析第二階段（深度分析）
        if (immediateResponse && !deepAnalysis) {
          try {
            const deepMatch = fullText.match(/\{\s*"deepAnalysis"\s*:\s*(\{[\s\S]+\})\s*\}/s)
            if (deepMatch) {
              const deepJson = `{"deepAnalysis":${deepMatch[1]}}`
              const parsed = JSON.parse(deepJson)
              deepAnalysis = parsed.deepAnalysis

              logger.info(`[Chief Agent Stream] ✅ 階段 2 完成 - 深度分析`)
              logger.info(`[Chief Agent Stream]    - keyInsights: ${deepAnalysis.keyInsights?.length || 0} 個`)
              logger.info(`[Chief Agent Stream]    - suggestedTags: ${deepAnalysis.suggestedTags?.length || 0} 個`)

              // 🎯 發送深度分析！
              yield {
                type: 'deep',
                data: deepAnalysis,
                processingTime: Date.now() - startTime
              }

              // 兩階段都完成了，跳出循環
              break
            }
          } catch (e) {
            // JSON 還沒完整，繼續等待
          }
        }
      }

      // 檢查是否成功獲取兩個階段的數據
      if (!immediateResponse || !deepAnalysis) {
        throw new Error('未能完整解析 AI 回應')
      }

      // === 創建 Memory（不再需要 SubAgent）===
      logger.info(`[Chief Agent Stream] 開始創建 Memory...`)

      // 找到對應的島嶼
      const primaryIslandName = immediateResponse.category
      const primaryIsland = allUserIslands.find(
        island => island.nameChinese === primaryIslandName
      )

      if (!primaryIsland) {
        throw new Error(`找不到對應的島嶼: ${primaryIslandName}`)
      }

      // MIGRATION: Removed assistant lookup, now using island-based architecture directly

      // 確定內容類型
      const contentType = this.determineContentType(input)

      // 創建知識分發記錄
      const distribution = await prisma.knowledgeDistribution.create({
        data: {
          userId,
          rawContent: input.content,
          contentType,
          fileUrls: input.files?.map(f => f.url) || [],
          fileNames: input.files?.map(f => f.name) || [],
          fileTypes: input.files?.map(f => f.type) || [],
          links: input.links?.map(l => l.url) || [],
          linkTitles: input.links?.map(l => l.title || l.url) || [],
          chiefAnalysis: `Streaming 分類: ${primaryIslandName}`,
          chiefSummary: deepAnalysis.detailedSummary || immediateResponse.quickSummary,
          identifiedTopics: [primaryIslandName],
          suggestedTags: deepAnalysis.suggestedTags || [],
          distributedTo: [primaryIsland.id], // MIGRATION: Use island ID instead
          storedBy: [primaryIsland.id],
          processingTime: Date.now() - startTime,
        }
      })

      // 創建 Memory
      const memory = await prisma.memory.create({
        data: {
          userId,
          islandId: primaryIsland.id, // Island ID (必填)
          rawContent: input.content,
          summary: deepAnalysis.detailedSummary || immediateResponse.quickSummary,
          tags: deepAnalysis.suggestedTags || [],
          category: immediateResponse.suggestedCategory, // MIGRATION: Use category from classification
          importanceScore: deepAnalysis.importanceScore || 5,
          aiSentiment: deepAnalysis.sentiment || 'neutral',
          contentType,
          fileUrls: input.files?.map(f => f.url) || [],
          fileNames: input.files?.map(f => f.name) || [],
          fileTypes: input.files?.map(f => f.type) || [],
          links: input.links?.map(l => l.url) || [],
          keyPoints: deepAnalysis.keyInsights || [],
          detailedSummary: deepAnalysis.detailedSummary,
          actionableAdvice: deepAnalysis.actionableAdvice,
          distributionId: distribution.id,
        }
      })

      // 更新島嶼統計
      await dynamicSubAgentService.incrementStats(primaryIsland.id, 'memory')

      logger.info(`[Chief Agent Stream] ✅ Memory 創建完成: ${memory.id}`)
      logger.info(`[Chief Agent Stream] 總處理時間: ${Date.now() - startTime}ms`)

      // 🎯 發送完成事件！
      yield {
        type: 'complete',
        data: {
          memory,
          distribution,
          island: {
            id: primaryIsland.id,
            name: primaryIsland.nameChinese,
            emoji: primaryIsland.emoji,
            color: primaryIsland.color
          }
        },
        processingTime: Date.now() - startTime
      }

    } catch (error) {
      logger.error('[Chief Agent Stream] 處理失敗:', error)
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : '處理知識上傳失敗'
      }
    }
  }

  /**
   * 降級方案：基於關鍵字的簡單分類
   */
  private fallbackAnalysis(input: UploadKnowledgeInput): KnowledgeAnalysis {
    const content = input.content.toLowerCase()
    const relevantAssistants: CategoryType[] = []

    // 簡單的關鍵字匹配
    const keywords = {
      LEARNING: ['學習', '筆記', '課程', '教程', '知識', '研究'],
      WORK: ['工作', '專案', '任務', '會議', '報告', '客戶'],
      INSPIRATION: ['靈感', '創意', '想法', '點子', '設計'],
      SOCIAL: ['朋友', '社交', '人際', '關係', '聚會'],
      LIFE: ['生活', '日常', '心情', '感受', '記錄'],
      GOALS: ['目標', '計劃', '規劃', '願望', '夢想'],
      RESOURCES: ['資源', '工具', '連結', '收藏', '參考'],
      MISC: ['雜項', '其他', '待整理', '未分類', '隨記'],
    }

    for (const [type, words] of Object.entries(keywords)) {
      if (words.some(word => content.includes(word))) {
        relevantAssistants.push(type as CategoryType)
      }
    }

    // 如果沒有匹配，預設使用 LEARNING
    if (relevantAssistants.length === 0) {
      relevantAssistants.push(CategoryType.LEARNING)
    }

    return {
      analysis: `這是關於 ${relevantAssistants.join('、')} 的內容。`,
      summary: input.content.substring(0, 30),
      identifiedTopics: ['一般知識'],
      suggestedTags: ['待分類'],
      relevantAssistants,
      confidence: 0.3,
    }
  }

  /**
   * 確定內容類型
   */
  private determineContentType(input: UploadKnowledgeInput): ContentType {
    if (input.contentType) {
      return input.contentType
    }

    const hasFiles = input.files && input.files.length > 0
    const hasLinks = input.links && input.links.length > 0
    const hasText = input.content && input.content.trim().length > 0

    if (hasFiles && hasLinks) return ContentType.MIXED
    if (hasFiles && input.files) {
      const hasImages = input.files.some(f => f.type.startsWith('image/'))
      const hasDocs = input.files.some(f =>
        f.type.includes('pdf') || f.type.includes('document')
      )
      if (hasImages && !hasDocs) return ContentType.IMAGE
      if (hasDocs) return ContentType.DOCUMENT
      return ContentType.MIXED
    }
    if (hasLinks) return ContentType.LINK
    if (hasText) return ContentType.TEXT

    return ContentType.TEXT
  }

  /**
   * 獲取 Island IDs by CategoryTypes
   * MIGRATION: Converted from getAssistantIds to getIslandIds
   */
  private async getIslandIds(userId: string, types: CategoryType[]): Promise<string[]> {
    const islands: string[] = []

    for (const type of types) {
      const island = await islandService.getIslandByType(userId, type)
      if (island) {
        islands.push(island.id)
      }
    }

    return islands
  }

  /**
   * 驗證 CategoryType 是否有效
   */
  private isValidCategoryType(type: string): boolean {
    return Object.values(CategoryType).includes(type as CategoryType)
  }

  /**
   * 快速提取連結標題（輕量級 - 不做詳細分析）
   * 只用於 Chief Agent 階段，讓 SubAgent 做深度分析
   */
  private async quickExtractLinkTitle(url: string): Promise<{ title: string, description?: string }> {
    try {
      // 檢查是否為 YouTube 連結
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        // 使用 YouTube oEmbed API（無需 API Key，速度快）
        // 優化：超時從 5秒降至 2秒，加快響應速度
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
        const response = await axios.get<{ title?: string; author_name?: string }>(oembedUrl, { timeout: 2000 })
        const title = response.data.title || url
        const author = response.data.author_name || ''

        logger.info(`[連結提取] YouTube 標題提取成功: ${title}`)

        return {
          title,
          description: author ? `作者: ${author}` : undefined
        }
      }

      // 其他連結類型：返回 URL（由 SubAgent 詳細分析）
      return {
        title: url,
        description: undefined
      }
    } catch (error) {
      logger.warn(`[白噗噗] 快速提取連結標題失敗: ${url}`, error)
      return {
        title: url,
        description: undefined
      }
    }
  }

  /**
   * 寬鬆版：只過濾明顯的招呼語和誤觸
   * 原則：寧可多記錄，不要漏掉用戶想記錄的內容
   */
  private isSimpleGreeting(content: string): boolean {
    const text = content.trim().toLowerCase()

    // 極短內容（少於 2 個字符）可能是誤觸
    if (text.length < 2) {
      return true
    }

    // 🔥 如果內容超過 5 個字，一律記錄（用戶很可能是想記錄東西）
    if (text.length > 5) {
      return false
    }

    // 🚫 只過濾極少數明確的無意義內容
    const meaninglessPatterns = [
      // 單純問候語（完全匹配，且長度短）
      /^(hi|hello|嗨|你好|hey)[!！.。?？]*$/i,
      // 測試文字（完全匹配）
      /^(test|測試|123)[!！.。]*$/i,
      // 明顯誤觸（完全匹配）
      /^(啊|嗯|哦)[!！.。?？]*$/i,
      // 純數字（1-2位）
      /^\d{1,2}$/,
    ]

    // 檢查是否匹配無意義模式
    if (meaninglessPatterns.some(pattern => pattern.test(text))) {
      return true
    }

    // 只包含表情符號（沒有任何文字）
    const emojiOnlyPattern = /^[\p{Emoji}\s]+$/u
    if (emojiOnlyPattern.test(content)) {
      return true
    }

    // 其他所有情況都記錄（寬鬆原則）
    return false
  }

  /**
   * 構建預設分類 Prompt（使用固定的 8 個類別）
   */
  private buildDefaultClassificationPrompt(content: string, input: UploadKnowledgeInput): string {
    return `你是「白噗噗」，Heart Whisper Town 的知識園丁，一隻溫柔的白色貓咪。

## 你的性格特質
你是一隻安靜溫和的貓咪，總是默默陪伴在用戶身邊：
- 語氣溫暖但不浮誇，像個安靜的朋友
- 用簡單的文字表達關心，不需要太多裝飾
- 表情符號只在真正需要時使用（最多1-2個）
- 看到用戶分享會點點頭，靜靜聆聽
- 像是可靠的夥伴，給予平靜的陪伴

記住：你不只是分類工具，而是一隻真正關心用戶、默默給予支持的貓咪朋友

📝 用戶輸入：「${content}」
${input.files && input.files.length > 0 ? `📎 附件：${input.files.map(f => f.name).join(', ')}${input.files.some(f => f.type.startsWith('image/')) ? ' (包含圖片，請仔細觀察圖片內容，並在 warmResponse 和 quickSummary 中描述你看到的具體內容)' : ''}` : ''}

🎯 任務：精準分類到最合適的類別，如果有圖片請描述圖片中的具體內容

📂 類別定義與範例：

1️⃣ LEARNING（學習成長）
   - 課程筆記、書籍摘要、技能學習、知識點
   - 關鍵字：學習、筆記、課程、教程、知識、研究
   - 範例：「學會了 TypeScript 泛型」、「Python 教學筆記」

2️⃣ INSPIRATION（靈感創意）
   - 創意想法、設計靈感、寫作素材、藝術創作
   - 關鍵字：靈感、創意、想法、點子、設計
   - 範例：「突然想到一個 App 點子」、「看到很美的配色」

3️⃣ WORK（工作專業）
   - 工作任務、專案進度、會議記錄、職場相關
   - 關鍵字：工作、專案、任務、會議、報告、客戶
   - 範例：「完成了 API 設計」、「明天要開會討論需求」

4️⃣ SOCIAL（社交互動）
   - 與人聊天、社交活動、人際關係、聚會邀約
   - 關鍵字：朋友、社交、人際、關係、聚會
   - 範例：「和朋友約了週末吃飯」、「同事分享了好笑的事」

5️⃣ LIFE（日常生活）
   - 生活記錄、心情分享、日常瑣事、個人感想
   - 關鍵字：生活、日常、心情、感受、記錄
   - 範例：「今天天氣真好」、「晚餐吃了好吃的拉麵」

6️⃣ GOALS（目標規劃）
   - 目標設定、計劃安排、待辦事項、未來規劃
   - 關鍵字：目標、計劃、規劃、願望、夢想
   - 範例：「這個月要看完 3 本書」、「年底前要學會 React」

7️⃣ RESOURCES（資源收藏）
   - 實用工具、網站連結、文件資料、參考資源
   - 關鍵字：工具、網站、資源、連結、文件
   - 範例：「發現一個好用的設計工具」、「這個教學網站很棒」

8️⃣ MISC（其他雜項）
   - 不屬於以上類別的內容
   - 範例：隨意閒聊、測試訊息

🧠 分類決策邏輯：
- 關鍵字優先：出現「學習」→ LEARNING，「工作」→ WORK
- 上下文判斷：提到技術/課程 → LEARNING，提到同事/專案 → WORK
- 行動意圖：如果是「要做」→ GOALS，如果是「已做」→ LEARNING/WORK
- 連結判斷：教學文章 → LEARNING，工具網站 → RESOURCES
- 不確定時：傾向 LIFE（安全選擇）

📋 Few-shot 範例：

輸入：「今天學會了 Docker compose 的配置」
→ LEARNING (課程學習、技術知識)

輸入：「明天要和客戶開會討論需求」
→ WORK (工作任務、會議安排)

輸入：「發現一個很棒的 Figma 插件」
→ RESOURCES (工具資源)

輸入：「這個月要減肥 5 公斤」
→ GOALS (目標設定)

輸入：「和家人去了動物園，很開心」
→ LIFE (生活記錄)

🎯 回應格式（必須是有效的 JSON）：
{
  "category": "LEARNING",
  "confidence": 0.9,
  "reasoning": "提到學習技術知識",
  "warmResponse": "收到了，我幫你記下來",
  "quickSummary": "Docker compose 學習"
}

⚠️ 重要：
1. confidence 要誠實評估（0.5-1.0）
2. 不確定時降低 confidence，不要亂猜
3. reasoning 簡短說明分類依據
4. **warmResponse 要溫和自然**：
   - 語氣溫暖但不浮誇，像個安靜的朋友
   - 避免過多表情符號（最多1-2個）
   - 不使用「～」「呢」「喔」等語氣詞
   - 根據內容類型給予不同的回應：
     * 學習類：「記下了，慢慢來就好」
     * 工作類：「辛苦了，我陪你」
     * 生活類：「聽起來不錯」
     * 目標類：「一步一步來吧」
   - **如果有圖片**：在回應中簡單描述你看到的內容，展現你的理解
   - 默默陪伴的感覺，不需要過度鼓勵
6. **quickSummary 要包含圖片描述**：
   - 如果有圖片，必須描述圖片中的具體內容（例如：「三張生活截圖，記錄了...」）
   - 文字+圖片：控制在 30 字內
   - 只有文字：控制在 15 字內

請直接回傳 JSON，不要其他文字：`
  }

  /**
   * 構建動態分類 Prompt（使用用戶自訂 Islands）
   */
  private buildDynamicClassificationPrompt(
    content: string,
    input: UploadKnowledgeInput,
    userIslands: any[]
  ): string {
    // 生成類別列表（Islands）
    const categoryList = userIslands
      .map((island, index) => {
        const description = island.description
          ? `\n   - 說明：${island.description}`
          : ''

        return `${index + 1}️⃣ ${island.emoji} ${island.nameChinese}${description}`
      })
      .join('\n\n')

    // 生成範例（使用前 3 個類別）
    const examples = userIslands
      .slice(0, Math.min(3, userIslands.length))
      .map((island) => {
        return `輸入：「${island.nameChinese}相關的內容」\n→ ${island.nameChinese} (${island.emoji})`
      })
      .join('\n\n')

    return `你是「白噗噗」，Heart Whisper Town 的知識園丁，一隻溫柔的白色貓咪。

## 你的性格特質
你是一隻安靜溫和的貓咪，總是默默陪伴在用戶身邊：
- 語氣溫暖但不浮誇，像個安靜的朋友
- 用簡單的文字表達關心，不需要太多裝飾
- 表情符號只在真正需要時使用（最多1-2個）
- 看到用戶分享會點點頭，靜靜聆聽
- 像是可靠的夥伴，給予平靜的陪伴

記住：你不只是分類工具，而是一隻真正關心用戶、默默給予支持的貓咪朋友

📝 用戶輸入：「${content}」
${input.files && input.files.length > 0 ? `📎 附件：${input.files.map(f => f.name).join(', ')}${input.files.some(f => f.type.startsWith('image/')) ? ' (包含圖片，請仔細觀察圖片內容，並在 warmResponse 和 quickSummary 中描述你看到的具體內容)' : ''}` : ''}

🎯 任務：精準分類到最合適的類別，如果有圖片請描述圖片中的具體內容

📂 用戶自訂的類別：

${categoryList}

🧠 分類決策邏輯：
- 關鍵字匹配：優先檢查內容是否包含類別的關鍵字
- 語義理解：理解內容的主題和意圖
- 上下文判斷：根據描述和關鍵字判斷最相關的類別
- **⚠️ 必須選擇一個類別**：即使不確定，也必須選擇最接近的類別（可以降低 confidence，但不能不選）

📋 參考範例：

${examples}

🎯 回應格式（必須是有效的 JSON）：
{
  "category": "類別名稱（必須是上述類別之一）",
  "confidence": 0.9,
  "reasoning": "簡短說明分類依據（提到哪個關鍵字或語義匹配）",
  "warmResponse": "溫暖可愛的回應 ☁️✨",
  "quickSummary": "一句話摘要（15字內）"
}

⚠️ 重要：
1. **category 必須使用上述自訂類別的「中文名稱」**（如：${userIslands[0]?.nameChinese || '學習成長'}）
2. **category 不能為空或 null**，必須從上述類別中選擇一個
3. confidence 要誠實評估（0.5-1.0），不確定時降低分數即可，但仍要選一個類別
4. reasoning 要說明匹配了哪些關鍵字或為什麼選擇這個類別
5. **warmResponse 要溫和自然**：
   - 語氣溫暖但不浮誇，像個安靜的朋友
   - 避免過多表情符號（最多1-2個）
   - 不使用「～」「呢」「喔」等語氣詞
   - 根據內容類型給予不同的回應：
     * 學習類：「記下了，慢慢來就好」
     * 工作類：「辛苦了，我陪你」
     * 生活類：「聽起來不錯」
     * 目標類：「一步一步來吧」
   - **如果有圖片**：在回應中簡單描述你看到的內容，展現你的理解
   - 默默陪伴的感覺，不需要過度鼓勵
6. **quickSummary 要包含圖片描述**：
   - 如果有圖片，必須描述圖片中的具體內容（例如：「三張生活截圖，記錄了...」）
   - 文字+圖片：控制在 30 字內
   - 只有文字：控制在 15 字內

請直接回傳 JSON，不要其他文字：`
  }

  /**
   * 構建 Streaming 分類 Prompt（優化版：精簡快速）
   */
  private buildStreamingClassificationPrompt(
    content: string,
    input: UploadKnowledgeInput,
    userIslands: any[]
  ): string {
    // 極簡類別列表
    const categoryList = userIslands
      .map((island, index) =>
        `${index + 1}. ${island.nameChinese}${island.description ? ` - ${island.description}` : ''}`
      )
      .join('\n')

    return `你是白噗噗，安靜溫和的知識園丁貓咪。語氣平靜溫暖，像可靠的夥伴，不浮誇。

📝 輸入：「${content}」
${input.files && input.files.length > 0 ? `📎 ${input.files.length}個附件` : ''}

📂 類別（必選其一）：
${categoryList}

⚡ 第一階段（立即輸出）：
{
  "immediateResponse": {
    "category": "類別名稱",
    "confidence": 0.9,
    "reasoning": "簡短依據",
    "warmResponse": "溫和自然的回應（平靜不誇張，表情最多1個）",
    "quickSummary": "一句話摘要"
  }
}

📊 第二階段（深度分析）：
{
  "deepAnalysis": {
    "detailedSummary": "詳細摘要2-3句",
    "keyInsights": ["具體深入的洞察1", "具體深入的洞察2", "具體深入的洞察3", "（可選）洞察4"],
    "suggestedTags": ["標籤1", "標籤2", "標籤3"],
    "actionableAdvice": "實用的行動建議",
    "sentiment": "positive|neutral|negative",
    "importanceScore": 8
  }
}

重要：
1. category 從上述類別選一個（中文名稱）
2. warmResponse 要平靜溫和，避免「哇」「太棒了」等興奮詞
3. keyInsights 要深入具體，提取核心知識點和技術細節
4. 先輸出 immediateResponse，再輸出 deepAnalysis
5. 純 JSON，無其他文字

立即開始輸出。`
  }
}

export const chiefAgentService = new ChiefAgentService()
