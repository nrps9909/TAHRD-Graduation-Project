import { PrismaClient, AssistantType, ChatContextType, ContentType } from '@prisma/client'
import { logger } from '../utils/logger'
import axios from 'axios'
import { callGeminiAPI } from '../utils/geminiAPI'
import { assistantService } from './assistantService'
import { memoryService } from './memoryService'
import { subAgentService } from './subAgentService'
import { multimodalProcessor } from './multimodalProcessor'
import { chatSessionService } from './chatSessionService'
import { taskQueueService, TaskPriority } from './taskQueueService'
import { dynamicSubAgentService } from './dynamicSubAgentService'

const prisma = new PrismaClient()

export interface ClassificationResult {
  suggestedCategory: AssistantType
  confidence: number
  reason: string
  alternativeCategories: AssistantType[]
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
  relevantAssistants: AssistantType[]
  confidence: number
}

// 優化：分類結果緩存接口
interface ClassificationCache {
  result: {
    category: AssistantType
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
      const chief = await assistantService.getChiefAssistant()
      if (!chief) {
        throw new Error('Chief assistant not found')
      }

      const prompt = `${chief.systemPrompt}

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

      const response = await this.callMCP(prompt, chief.id)
      const result = this.parseJSON(response)

      return {
        suggestedCategory: result.suggestedCategory as AssistantType,
        confidence: result.confidence || 0.8,
        reason: result.reason || '基於內容分析',
        alternativeCategories: result.alternativeCategories || []
      }
    } catch (error) {
      logger.error('Classification error:', error)

      // 降級處理：使用關鍵字匹配
      const fallbackCategory = assistantService.fallbackCategoryDetection(content)

      return {
        suggestedCategory: fallbackCategory,
        confidence: 0.5,
        reason: '使用關鍵字匹配（AI 服務暫時無法使用）',
        alternativeCategories: []
      }
    }
  }

  /**
   * 處理內容並創建記憶
   */
  async processAndCreateMemory(
    userId: string,
    assistantId: string,
    content: string,
    category: AssistantType,
    contextType: ChatContextType = ChatContextType.MEMORY_CREATION
  ) {
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

      // 更新助手統計
      await assistantService.incrementAssistantStats(assistantId, 'memory')
      await assistantService.incrementAssistantStats(assistantId, 'chat')

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
  }

  /**
   * 分類並創建記憶（一步完成）
   */
  async classifyAndCreate(userId: string, content: string) {
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
  }

  /**
   * 生成全局摘要（Chief Agent 特殊功能）
   */
  async generateSummary(userId: string, days: number = 7) {
    try {
      const chief = await assistantService.getChiefAssistant()
      if (!chief) {
        throw new Error('Chief assistant not found')
      }

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
        category: category as AssistantType,
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

      const prompt = `${chief.systemPrompt}

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

      const response = await this.callMCP(prompt, chief.id)
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
   * 與 Chief Agent 對話
   */
  async chatWithChief(userId: string, message: string) {
    try {
      const chief = await assistantService.getChiefAssistant()
      if (!chief) {
        throw new Error('Chief assistant not found')
      }

      // 獲取用戶的整體資訊
      const recentMemories = await memoryService.getMemories({
        userId,
        limit: 10
      })

      const contextInfo = recentMemories.length > 0
        ? `\n\n用戶最近的記錄：\n${recentMemories.map(m => `[${m.category}] ${m.summary || m.rawContent.substring(0, 40)}`).join('\n')}`
        : ''

      const prompt = `${chief.systemPrompt}

用戶詢問：${message}
${contextInfo}

請基於你對用戶所有記錄的了解來回答。`

      const response = await this.callMCP(prompt, chief.id)

      // 獲取或創建會話
      const session = await chatSessionService.getOrCreateSession(
        userId,
        chief.id,
        ChatContextType.GENERAL_CHAT
      )

      // 記錄對話
      const chatMessage = await prisma.chatMessage.create({
        data: {
          userId,
          assistantId: chief.id,
          sessionId: session.id,
          userMessage: message,
          assistantResponse: response,
          contextType: ChatContextType.GENERAL_CHAT
        }
      })

      // 更新會話統計
      await chatSessionService.incrementMessageCount(session.id)
      await chatSessionService.updateLastMessageAt(session.id)

      await assistantService.incrementAssistantStats(chief.id, 'chat')

      return chatMessage
    } catch (error) {
      logger.error('Chat with chief error:', error)
      throw new Error('與總管對話失敗')
    }
  }

  /**
   * 調用 Gemini API 生成內容
   * 優化：完全使用 REST API，移除不穩定的 CLI
   */
  private async callMCP(prompt: string, assistantId: string): Promise<string> {
    try {
      // 直接使用 Gemini REST API（快速、穩定）
      const response = await callGeminiAPI(prompt, {
        model: this.geminiModel,
        temperature: 0.7,
        maxOutputTokens: 2048,
        timeout: 15000 // 15 秒超時
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
    category: AssistantType
    confidence: number
    reasoning: string     // 分類理由（用於調試和追蹤）
    warmResponse: string  // 白噗噗的溫暖回應
    quickSummary: string  // 一句話摘要
    shouldRecord: boolean // 固定為 true，所有對話都記錄
    recordReason?: string // 保留字段以保持向下兼容
    enrichedContent?: string // 豐富化的內容（包含連結元數據）
    linkMetadata?: Array<{ url: string, title: string, description: string }> // 連結元數據
  }> {
    try {
      // 優化：檢查緩存（相同內容直接返回）
      const cacheKey = this.generateContentHash(input.content)
      const cached = this.classificationCache.get(cacheKey)

      if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
        logger.info(`[白噗噗] 使用緩存結果（命中率提升）`)
        return cached.result
      }

      const chief = await assistantService.getChiefAssistant()
      if (!chief) {
        throw new Error('Chief assistant not found')
      }

      logger.info(`[白噗噗] 開始快速分類`)

      // === 檢查用戶是否有自訂 SubAgent ===
      const userSubAgents = await dynamicSubAgentService.getUserSubAgents(userId)
      const hasCustomCategories = userSubAgents.length > 0

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

      // 構建智能分類 Prompt（動態版：根據用戶自訂類別調整）
      const prompt = hasCustomCategories
        ? this.buildDynamicClassificationPrompt(enrichedContent, input, userSubAgents)
        : this.buildDefaultClassificationPrompt(enrichedContent, input)

      // 使用 Gemini 2.5 Flash (快速模型)
      const oldModel = this.geminiModel
      this.geminiModel = 'gemini-2.5-flash'

      const response = await this.callMCP(prompt, chief.id)
      const result = this.parseJSON(response)

      this.geminiModel = oldModel // 恢復原模型

      // 處理分類結果（動態分類 vs 預設分類）
      let finalCategory: AssistantType
      let finalReasoning: string

      if (hasCustomCategories) {
        // 動態分類：AI 返回自訂類別的中文名稱
        // 使用 MISC 作為佔位符（實際分類由 findRelevantSubAgents 完成）
        finalCategory = AssistantType.MISC
        finalReasoning = `自訂分類: ${result.category} - ${result.reasoning || '關鍵字匹配'}`
        logger.info(`[白噗噗] 動態分類結果: ${result.category} (${finalReasoning})`)
      } else {
        // 預設分類：AI 返回 AssistantType
        finalCategory = result.category as AssistantType || AssistantType.LIFE
        finalReasoning = result.reasoning || '自動分類'
        logger.info(`[白噗噗] 預設分類結果: ${finalCategory} (置信度: ${result.confidence || 0.8}, 理由: ${finalReasoning})`)
      }

      const classificationResult = {
        category: finalCategory,
        confidence: result.confidence || 0.8,
        reasoning: finalReasoning,
        warmResponse: result.warmResponse || '收到了～ ☁️',
        quickSummary: result.quickSummary || input.content.substring(0, 30),
        shouldRecord: true, // ⚠️ 固定為 true，所有對話都記錄到資料庫
        recordReason: undefined, // 不再需要記錄原因
        enrichedContent: undefined, // 優化：不再同步豐富化內容
        linkMetadata: undefined // 優化：連結元數據由 SubAgent 提取
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

      // 降級方案：使用關鍵字匹配
      const fallbackCategory = assistantService.fallbackCategoryDetection(input.content)

      return {
        category: fallbackCategory,
        confidence: 0.5,
        reasoning: '使用關鍵字匹配（AI 暫時無法使用）',
        warmResponse: '收到了！我幫你記錄下來了～ ☁️',
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
      const chief = await assistantService.getChiefAssistant()
      if (!chief) {
        throw new Error('Chief assistant not found')
      }

      logger.info(`[Chief Agent] 開始多模態內容分析（並行處理）`)

      // === Stage 4: 深度多模態處理（優化：並行處理所有媒體）===
      const imageAnalyses: any[] = []
      const pdfAnalyses: any[] = []
      const linkAnalyses: any[] = []

      // 收集所有要處理的任務
      const processingTasks: Promise<any>[] = []

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
      let prompt = `${chief.systemPrompt}

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

      const response = await this.callMCP(prompt, chief.id)
      const parsed = this.parseJSON(response)

      return {
        analysis: parsed.analysis || '分析內容',
        summary: parsed.summary || input.content.substring(0, 30),
        identifiedTopics: Array.isArray(parsed.identifiedTopics) ? parsed.identifiedTopics : [],
        suggestedTags: Array.isArray(parsed.suggestedTags) ? parsed.suggestedTags : [],
        relevantAssistants: Array.isArray(parsed.relevantAssistants)
          ? parsed.relevantAssistants.filter((a: string) => this.isValidAssistantType(a))
          : [AssistantType.LEARNING],
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
      }
    } catch (error) {
      logger.error('Analyze knowledge error:', error)

      // 降級方案：使用關鍵字匹配
      return this.fallbackAnalysis(input)
    }
  }

  /**
   * 上傳知識到分發系統（新架構 - 雙階段處理 + 動態 SubAgent）
   * 階段1: 白噗噗快速分類 + 即時回應（前端立即顯示）
   * 階段2: Sub-Agent 深度分析 + 寫入知識庫（後端非同步處理）
   *
   * 支援雙軌系統：
   * - 用戶有自訂 Subcategory → 使用動態 SubAgent
   * - 用戶無自訂 Subcategory → 使用預設 Assistant
   */
  async uploadKnowledge(
    userId: string,
    input: UploadKnowledgeInput
  ) {
    const startTime = Date.now()

    try {
      logger.info(`[Chief Agent] 開始處理知識上傳，用戶: ${userId}`)

      // === 檢查用戶是否有自訂 Subcategory ===
      const userSubAgents = await dynamicSubAgentService.getUserSubAgents(userId)
      const useDynamicSubAgents = userSubAgents.length > 0

      logger.info(`[Chief Agent] 用戶有 ${userSubAgents.length} 個自訂 SubAgent，使用${useDynamicSubAgents ? '動態' : '預設'}系統`)

      // === 階段 1: 白噗噗快速分類（Gemini 2.5 Flash）===
      const quickResult = await this.quickClassifyForTororo(userId, input)
      logger.info(`[白噗噗] 快速分類完成: ${quickResult.category} (${quickResult.confidence})`)

      // ⚠️ 所有對話都會被記錄到資料庫，不再跳過任何內容

      // 2. 確定內容類型
      const contentType = this.determineContentType(input)

      // === 動態 SubAgent 路徑 ===
      if (useDynamicSubAgents) {
        logger.info('[Chief Agent] 使用動態 SubAgent 系統')

        // 使用關鍵字匹配找到最相關的 SubAgent
        const relevantSubAgents = await dynamicSubAgentService.findRelevantSubAgents(
          userId,
          input.content,
          3 // 取前 3 個最相關的
        )

        if (relevantSubAgents.length === 0) {
          logger.warn('[Chief Agent] 沒有找到相關的 SubAgent，降級到預設系統')
          // 降級到舊系統
        } else {
          const targetSubAgent = relevantSubAgents[0]
          logger.info(`[Chief Agent] 選擇 SubAgent: ${targetSubAgent.nameChinese} (${targetSubAgent.id})`)

          // 優化：直接使用原始內容（連結提取由 SubAgent 處理）
          const contentForDistribution = input.content

          // 優化：使用簡單的連結標題（詳細元數據由 SubAgent 提取）
          const enrichedLinkTitles = input.links?.map(l => l.title || l.url) || []

          // 創建知識分發記錄（使用 subcategoryId）
          // 優化：移除 include（不需要立即載入關聯，提升寫入速度）
          const distribution = await prisma.knowledgeDistribution.create({
            data: {
              userId,
              rawContent: contentForDistribution, // 使用豐富化內容
              contentType,
              fileUrls: input.files?.map(f => f.url) || [],
              fileNames: input.files?.map(f => f.name) || [],
              fileTypes: input.files?.map(f => f.type) || [],
              links: input.links?.map(l => l.url) || [],
              linkTitles: enrichedLinkTitles, // 使用提取的標題
              chiefAnalysis: `白噗噗快速分類 → 動態 SubAgent: ${targetSubAgent.nameChinese}`,
              chiefSummary: quickResult.quickSummary,
              identifiedTopics: [targetSubAgent.nameChinese],
              suggestedTags: targetSubAgent.keywords,
              distributedTo: [], // 動態 SubAgent 不使用 Assistant ID
              storedBy: [],
              processingTime: Date.now() - startTime,
            }
          })

          logger.info(`[Chief Agent] 知識分發記錄創建完成，ID: ${distribution.id}`)

          // 加入任務隊列，但傳遞 subcategoryId 而非 assistantId
          const taskId = await taskQueueService.addTask(
            userId,
            distribution.id,
            [targetSubAgent.id], // 傳遞 subcategoryId
            TaskPriority.NORMAL,
            { useDynamicSubAgent: true } // 標記使用動態 SubAgent
          )

          logger.info(`[Chief Agent] 動態 SubAgent 任務已加入隊列，TaskID: ${taskId}`)

          // 返回白噗噗的溫暖回應 + SubAgent 資訊
          return {
            distribution: {
              ...distribution,
              agentDecisions: [], // 補充空陣列（因優化移除了 include）
              memories: []        // 補充空陣列（因優化移除了 include）
            },
            tororoResponse: {
              warmMessage: `${quickResult.warmResponse}\n由 ${targetSubAgent.emoji} ${targetSubAgent.nameChinese} 來處理喔！`,
              category: quickResult.category,
              quickSummary: quickResult.quickSummary,
              confidence: quickResult.confidence,
              reasoning: quickResult.reasoning,
              subAgent: {
                id: targetSubAgent.id,
                name: targetSubAgent.nameChinese,
                emoji: targetSubAgent.emoji,
                color: targetSubAgent.color
              }
            },
            agentDecisions: [],
            memoriesCreated: [],
            processingTime: Date.now() - startTime,
            backgroundProcessing: true,
            useDynamicSubAgent: true
          }
        }
      }

      // === 預設 Assistant 路徑（降級或無自訂 SubAgent）===
      logger.info('[Chief Agent] 使用預設 Assistant 系統')

      // 3. 獲取對應的 Assistant ID
      const targetAssistant = await assistantService.getAssistantByType(quickResult.category)
      if (!targetAssistant) {
        throw new Error(`No assistant found for category: ${quickResult.category}`)
      }

      // 4. 創建知識分發記錄（簡化版 - 只記錄基本資訊）
      // 優化：直接使用原始內容（連結提取由 SubAgent 處理）
      const contentForDistribution = input.content

      // 優化：使用簡單的連結標題（詳細元數據由 SubAgent 提取）
      const enrichedLinkTitles = input.links?.map(l => l.title || l.url) || []

      // 優化：移除 include（不需要立即載入關聯，提升寫入速度）
      const distribution = await prisma.knowledgeDistribution.create({
        data: {
          userId,
          rawContent: contentForDistribution, // 使用豐富化內容
          contentType,
          fileUrls: input.files?.map(f => f.url) || [],
          fileNames: input.files?.map(f => f.name) || [],
          fileTypes: input.files?.map(f => f.type) || [],
          links: input.links?.map(l => l.url) || [],
          linkTitles: enrichedLinkTitles, // 使用提取的標題
          chiefAnalysis: `白噗噗快速分類: ${quickResult.category}`, // 簡單記錄
          chiefSummary: quickResult.quickSummary,
          identifiedTopics: [quickResult.category],
          suggestedTags: [],
          distributedTo: [targetAssistant.id],
          storedBy: [], // 等 Sub-Agent 處理後更新
          processingTime: Date.now() - startTime,
        }
      })

      logger.info(`[Chief Agent] 知識分發記錄創建完成，ID: ${distribution.id}`)

      // === 階段 2: 加入任務隊列進行 Sub-Agent 深度處理 ===
      // 使用任務隊列系統，防止並發過載
      const taskId = await taskQueueService.addTask(
        userId,
        distribution.id,
        [targetAssistant.id],
        TaskPriority.NORMAL // 可根據需求調整優先級
      )

      logger.info(`[Chief Agent] 任務已加入隊列，TaskID: ${taskId}`)
      logger.info(`[Chief Agent] 白噗噗即時回應完成 - 耗時: ${Date.now() - startTime}ms`)

      // 立即返回白噗噗的溫暖回應給前端
      return {
        distribution: {
          ...distribution,
          agentDecisions: [], // 補充空陣列（因優化移除了 include）
          memories: []        // 補充空陣列（因優化移除了 include）
        },
        // 白噗噗的即時回應
        tororoResponse: {
          warmMessage: quickResult.warmResponse,
          category: quickResult.category,
          quickSummary: quickResult.quickSummary,
          confidence: quickResult.confidence,
          reasoning: quickResult.reasoning
        },
        // 暫時沒有深度分析結果（正在後台處理中）
        agentDecisions: [],
        memoriesCreated: [],
        processingTime: Date.now() - startTime,
        backgroundProcessing: true // 標記後台正在處理
      }
    } catch (error) {
      logger.error('[Chief Agent] 上傳知識失敗:', error)
      throw new Error('處理知識上傳失敗')
    }
  }

  /**
   * 降級方案：基於關鍵字的簡單分類
   */
  private fallbackAnalysis(input: UploadKnowledgeInput): KnowledgeAnalysis {
    const content = input.content.toLowerCase()
    const relevantAssistants: AssistantType[] = []

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
        relevantAssistants.push(type as AssistantType)
      }
    }

    // 如果沒有匹配，預設使用 LEARNING
    if (relevantAssistants.length === 0) {
      relevantAssistants.push(AssistantType.LEARNING)
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
   * 獲取 Assistant IDs
   */
  private async getAssistantIds(types: AssistantType[]): Promise<string[]> {
    const assistants = await prisma.assistant.findMany({
      where: {
        type: { in: types },
        isActive: true,
      },
      select: { id: true },
    })

    return assistants.map(a => a.id)
  }

  /**
   * 驗證 AssistantType 是否有效
   */
  private isValidAssistantType(type: string): boolean {
    return Object.values(AssistantType).includes(type as AssistantType)
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
        const response = await axios.get(oembedUrl, { timeout: 2000 })
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
    return `你是「白噗噗」☁️，一隻溫柔智慧的知識分類助手

📝 用戶輸入：「${content}」
${input.files && input.files.length > 0 ? `📎 附件：${input.files.length}個文件` : ''}

🎯 任務：精準分類到最合適的類別

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
  "warmResponse": "哇～又學到新知識了呢！☁️✨",
  "quickSummary": "Docker compose 學習"
}

⚠️ 重要：
1. confidence 要誠實評估（0.5-1.0）
2. 不確定時降低 confidence，不要亂猜
3. reasoning 簡短說明分類依據
4. warmResponse 要符合白貓個性（溫柔、可愛、鼓勵）
5. quickSummary 控制在 15 字內

請直接回傳 JSON，不要其他文字：`
  }

  /**
   * 構建動態分類 Prompt（使用用戶自訂類別）
   */
  private buildDynamicClassificationPrompt(
    content: string,
    input: UploadKnowledgeInput,
    userSubAgents: any[]
  ): string {
    // 生成類別列表
    const categoryList = userSubAgents
      .map((sub, index) => {
        const keywords = sub.keywords && sub.keywords.length > 0
          ? `\n   - 關鍵字：${sub.keywords.join('、')}`
          : ''
        const description = sub.description
          ? `\n   - 說明：${sub.description}`
          : ''

        return `${index + 1}️⃣ ${sub.emoji} ${sub.nameChinese}${description}${keywords}`
      })
      .join('\n\n')

    // 生成範例（使用前 3 個類別）
    const examples = userSubAgents
      .slice(0, Math.min(3, userSubAgents.length))
      .map((sub) => {
        const keyword = sub.keywords && sub.keywords[0] ? sub.keywords[0] : sub.nameChinese
        return `輸入：「${keyword}相關的內容」\n→ ${sub.nameChinese} (${sub.emoji})`
      })
      .join('\n\n')

    return `你是「白噗噗」☁️，一隻溫柔智慧的知識分類助手

📝 用戶輸入：「${content}」
${input.files && input.files.length > 0 ? `📎 附件：${input.files.length}個文件` : ''}

🎯 任務：精準分類到最合適的類別

📂 用戶自訂的類別：

${categoryList}

🧠 分類決策邏輯：
- 關鍵字匹配：優先檢查內容是否包含類別的關鍵字
- 語義理解：理解內容的主題和意圖
- 上下文判斷：根據描述和關鍵字判斷最相關的類別
- 不確定時：選擇最通用的類別，並降低 confidence

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
1. category 必須使用上述自訂類別的「中文名稱」（如：${userSubAgents[0]?.nameChinese || '學習成長'}）
2. confidence 要誠實評估（0.5-1.0）
3. reasoning 要說明匹配了哪些關鍵字或為什麼選擇這個類別
4. warmResponse 要符合白貓個性（溫柔、可愛、鼓勵）
5. quickSummary 控制在 15 字內

請直接回傳 JSON，不要其他文字：`
  }
}

export const chiefAgentService = new ChiefAgentService()
