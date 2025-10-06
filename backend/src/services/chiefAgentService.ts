import { PrismaClient, AssistantType, ChatContextType, ContentType } from '@prisma/client'
import { logger } from '../utils/logger'
import axios from 'axios'
import { assistantService } from './assistantService'
import { memoryService } from './memoryService'
import { subAgentService } from './subAgentService'
import { multimodalProcessor } from './multimodalProcessor'

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

/**
 * ChiefAgentService - 智能分配與全局管理服務
 */
export class ChiefAgentService {
  private mcpUrl: string

  constructor() {
    this.mcpUrl = process.env.MCP_SERVICE_URL || 'http://localhost:8765'
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
  "suggestedCategory": "LEARNING|INSPIRATION|WORK|SOCIAL|LIFE|GOALS|RESOURCES",
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
- RESOURCES: 文章、連結、影片、參考資料`

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
        aiImportance: parsed.importance || 5,
        title: parsed.title,
        emoji: parsed.emoji
      })

      // 創建對話記錄
      const chatMessage = await prisma.chatMessage.create({
        data: {
          userId,
          assistantId,
          userMessage: content,
          assistantResponse: parsed.response || '我已經幫你記下了！',
          memoryId: memory.id,
          contextType
        }
      })

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

      // 記錄對話
      const chatMessage = await prisma.chatMessage.create({
        data: {
          userId,
          assistantId: chief.id,
          userMessage: message,
          assistantResponse: response,
          contextType: ChatContextType.GENERAL_CHAT
        }
      })

      await assistantService.incrementAssistantStats(chief.id, 'chat')

      return chatMessage
    } catch (error) {
      logger.error('Chat with chief error:', error)
      throw new Error('與總管對話失敗')
    }
  }

  /**
   * 調用 MCP 服務
   */
  private async callMCP(prompt: string, assistantId: string): Promise<string> {
    try {
      const response = await axios.post(
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

      return response.data.response || ''
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error(`MCP service error: ${error.message}`)
        if (error.code === 'ECONNREFUSED') {
          throw new Error('AI 服務未啟動，請確認 MCP Server 運行中')
        }
      }

      logger.error('MCP call error:', error)
      throw new Error('AI 服務暫時無法使用')
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
   * 分析知识内容（多模态支持）
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

      logger.info(`[Chief Agent] 開始多模態內容分析`)

      // === Stage 4: 深度多模态处理 ===
      const imageAnalyses: any[] = []
      const pdfAnalyses: any[] = []
      const linkAnalyses: any[] = []

      // 1. 处理图片文件
      if (input.files && input.files.length > 0) {
        const imageFiles = input.files.filter(f => f.type.startsWith('image/'))
        for (const file of imageFiles) {
          logger.info(`[Chief Agent] 分析圖片: ${file.name}`)
          const analysis = await multimodalProcessor.processImage(file.url, input.content)
          imageAnalyses.push({ file: file.name, ...analysis })
        }

        // 2. 处理 PDF 文件
        const pdfFiles = input.files.filter(f => f.type.includes('pdf'))
        for (const file of pdfFiles) {
          logger.info(`[Chief Agent] 分析 PDF: ${file.name}`)
          const analysis = await multimodalProcessor.processPDF(file.url, input.content)
          pdfAnalyses.push({ file: file.name, ...analysis })
        }
      }

      // 3. 处理链接
      if (input.links && input.links.length > 0) {
        for (const link of input.links) {
          logger.info(`[Chief Agent] 分析連結: ${link.url}`)
          const analysis = await multimodalProcessor.processLink(link.url, input.content)
          linkAnalyses.push(analysis)
        }
      }

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

      // 添加链接分析结果
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

      // 降级方案：使用关键词匹配
      return this.fallbackAnalysis(input)
    }
  }

  /**
   * 上传知识到分发系统
   */
  async uploadKnowledge(
    userId: string,
    input: UploadKnowledgeInput
  ) {
    const startTime = Date.now()

    try {
      logger.info(`[Chief Agent] 開始處理知識上傳，用戶: ${userId}`)

      // 1. 分析知识内容
      const analysis = await this.analyzeKnowledge(userId, input)
      logger.info(`[Chief Agent] 分析完成，相關助手: ${analysis.relevantAssistants.join(', ')}`)

      // 2. 确定内容类型
      const contentType = this.determineContentType(input)

      // 3. 获取相关的 Assistant IDs
      const assistantIds = await this.getAssistantIds(analysis.relevantAssistants)

      // 4. 创建知识分发记录
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
          chiefAnalysis: analysis.analysis,
          chiefSummary: analysis.summary,
          identifiedTopics: analysis.identifiedTopics,
          suggestedTags: analysis.suggestedTags,
          distributedTo: assistantIds,
          storedBy: [],
          processingTime: Date.now() - startTime,
        },
        include: {
          agentDecisions: true,
          memories: true,
        }
      })

      logger.info(`[Chief Agent] 知識分發記錄創建完成，ID: ${distribution.id}`)

      // 5. 触发 Sub-agents 处理
      const subAgentResult = await subAgentService.processDistribution(
        userId,
        distribution.id,
        assistantIds
      )

      logger.info(`[Chief Agent] 完整分發流程完成 - 總耗時: ${Date.now() - startTime}ms`)

      return {
        distribution,
        agentDecisions: subAgentResult.agentDecisions,
        memoriesCreated: subAgentResult.memoriesCreated,
        processingTime: Date.now() - startTime,
      }
    } catch (error) {
      logger.error('[Chief Agent] 上傳知識失敗:', error)
      throw new Error('處理知識上傳失敗')
    }
  }

  /**
   * 降级方案：基于关键词的简单分类
   */
  private fallbackAnalysis(input: UploadKnowledgeInput): KnowledgeAnalysis {
    const content = input.content.toLowerCase()
    const relevantAssistants: AssistantType[] = []

    // 简单的关键词匹配
    const keywords = {
      LEARNING: ['學習', '筆記', '課程', '教程', '知識', '研究'],
      WORK: ['工作', '專案', '任務', '會議', '報告', '客戶'],
      INSPIRATION: ['靈感', '創意', '想法', '點子', '設計'],
      SOCIAL: ['朋友', '社交', '人際', '關係', '聚會'],
      LIFE: ['生活', '日常', '心情', '感受', '記錄'],
      GOALS: ['目標', '計劃', '規劃', '願望', '夢想'],
      RESOURCES: ['資源', '工具', '連結', '收藏', '參考'],
    }

    for (const [type, words] of Object.entries(keywords)) {
      if (words.some(word => content.includes(word))) {
        relevantAssistants.push(type as AssistantType)
      }
    }

    // 如果没有匹配，默认使用 LEARNING
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
   * 确定内容类型
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
   * 获取 Assistant IDs
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
   * 验证 AssistantType 是否有效
   */
  private isValidAssistantType(type: string): boolean {
    return Object.values(AssistantType).includes(type as AssistantType)
  }
}

export const chiefAgentService = new ChiefAgentService()
