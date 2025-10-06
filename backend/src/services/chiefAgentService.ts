import { PrismaClient, AssistantType, ChatContextType } from '@prisma/client'
import { logger } from '../utils/logger'
import axios from 'axios'
import { assistantService } from './assistantService'
import { memoryService } from './memoryService'

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
}

export const chiefAgentService = new ChiefAgentService()
