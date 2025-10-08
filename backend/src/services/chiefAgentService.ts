import { PrismaClient, AssistantType, ChatContextType, ContentType } from '@prisma/client'
import { logger } from '../utils/logger'
import axios from 'axios'
import { exec } from 'child_process'
import { promisify } from 'util'
import { assistantService } from './assistantService'
import { memoryService } from './memoryService'
import { subAgentService } from './subAgentService'
import { multimodalProcessor } from './multimodalProcessor'
import { chatSessionService } from './chatSessionService'

const execAsync = promisify(exec)

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
  private useGeminiCLI: boolean = true
  private geminiModel: string = 'gemini-2.5-flash'

  constructor() {
    this.mcpUrl = process.env.MCP_SERVICE_URL || 'http://localhost:8765'
    this.useGeminiCLI = process.env.USE_GEMINI_CLI !== 'false'

    // 检查 Gemini API Key
    const apiKey = process.env.GEMINI_API_KEY
    if (apiKey) {
      logger.info('Gemini CLI initialized successfully')
    } else {
      logger.warn('GEMINI_API_KEY not found, AI features will be limited')
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
        aiImportance: parsed.importance || 5,
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
   * 調用 AI 服務（使用 Gemini CLI）
   */
  private async callMCP(prompt: string, assistantId: string): Promise<string> {
    // 優先使用 Gemini CLI
    if (this.useGeminiCLI) {
      let retries = 0
      const maxRetries = 3
      const retryDelays = [2000, 5000, 10000] // 2s, 5s, 10s

      while (retries < maxRetries) {
        try {
          logger.info(`[Chief Agent] Calling Gemini CLI (attempt ${retries + 1}/${maxRetries})`)

          // 转义 prompt 中的特殊字符
          const escapedPrompt = prompt
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\$/g, '\\$')
            .replace(/`/g, '\\`')

          // 使用 Gemini CLI 调用，增加超時時間
          const command = `gemini -m ${this.geminiModel} -p "${escapedPrompt}"`
          const { stdout, stderr } = await execAsync(command, {
            maxBuffer: 10 * 1024 * 1024, // 10MB buffer
            timeout: 120000, // 增加到 120 秒
            env: {
              ...process.env,
              GEMINI_API_KEY: process.env.GEMINI_API_KEY
            }
          })

          if (stderr) {
            logger.warn('[Chief Agent] Gemini CLI stderr:', stderr)

            // 檢查是否為速率限制錯誤
            if (stderr.includes('429') || stderr.includes('quota') || stderr.includes('rate limit')) {
              throw new Error('RATE_LIMIT')
            }

            // 如果是其他錯誤但有輸出，仍然嘗試使用
            if (!stdout) {
              throw new Error(stderr)
            }
          }

          const response = stdout.trim()
          if (!response) {
            throw new Error('Empty response from Gemini CLI')
          }

          logger.info(`[Chief Agent] Gemini CLI response received (${response.length} chars)`)
          return response

        } catch (error: any) {
          retries++

          const isRateLimitError =
            error.message?.includes('429') ||
            error.message?.includes('RATE_LIMIT') ||
            error.message?.includes('quota') ||
            error.message?.includes('rate limit')

          logger.error(`[Chief Agent] Gemini CLI error (attempt ${retries}):`, error.message)

          // 如果不是速率限制錯誤或已達最大重試次數，拋出錯誤
          if (!isRateLimitError || retries >= maxRetries) {
            logger.error('[Chief Agent] Max retries reached or non-retryable error')
            // 不拋出錯誤，改為使用降級方案（fallback）
            break
          }

          // 速率限制錯誤，等待後重試
          const delay = retryDelays[retries - 1] || 10000
          logger.info(`[Chief Agent] Rate limit detected, waiting ${delay/1000}s before retry...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }

      // 如果所有重試都失敗，記錄錯誤但不拋出，讓 fallback 接手
      logger.warn('[Chief Agent] Gemini CLI failed after retries, will try fallback method')
    }

    // Fallback: 使用 MCP Server
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
   * 白噗噗快速分類（輕量級 - 使用 Gemini 2.5 Flash）
   * 只做：1. 快速分類 2. 溫暖回應 3. 簡單摘要 4. 判斷是否值得記錄
   */
  async quickClassifyForTororo(
    userId: string,
    input: UploadKnowledgeInput
  ): Promise<{
    category: AssistantType
    confidence: number
    warmResponse: string  // 白噗噗的溫暖回應
    quickSummary: string  // 一句話摘要
    shouldRecord: boolean // 是否值得記錄到知識庫
    recordReason?: string // 不記錄的原因（如果有）
  }> {
    try {
      const chief = await assistantService.getChiefAssistant()
      if (!chief) {
        throw new Error('Chief assistant not found')
      }

      logger.info(`[白噗噗] 開始快速分類`)

      // 構建簡單的分類 Prompt（新增「是否值得記錄」判斷）
      const prompt = `你是白噗噗，一隻溫暖可愛的白貓知識助手 ☁️

用戶給了你這些內容：
"${input.content}"

${input.files && input.files.length > 0 ? `\n附件: ${input.files.map(f => f.name).join(', ')}` : ''}
${input.links && input.links.length > 0 ? `\n連結: ${input.links.map(l => l.url).join(', ')}` : ''}

**你的任務：**
1. 判斷這個內容是否值得記錄到知識庫
2. 如果值得記錄，分類到合適的類別並給予溫暖回應
3. 如果不值得記錄，給予友善的回應但不存儲

**不值得記錄的內容類型（只聊天、不存儲）：**
- 純粹的簡單問候（沒有其他資訊）：早安、晚安、你好、嗨、hi、hello
- 純粹的日常寒暄（沒有實質內容）：今天天氣真好、吃飯了嗎
- 純表情符號或單字：😊、👍、好、嗯、哦
- 無實質內容的測試：測試、test、123
- 單純的感謝或回應：謝謝、感謝、收到、好的

**⚠️ 重要！一定要記錄的內容：**
- **待辦事項、行程、約會**：例如「明天晚上要跟XXX吃飯」「下週要交報告」
- **任何包含時間/日期/人物/地點的資訊**
- 有學習價值的知識、想法、靈感
- 工作相關的任務、專案、經驗
- 個人目標、計劃、反思
- 有用的資源、連結、文件
- 任何用戶希望未來查閱的資訊

**判斷原則：**
- 如果內容包含**時間、日期、人名、地點、具體事項**，一定要記錄（shouldRecord: true）
- 只有純粹的寒暄問候才跳過記錄（shouldRecord: false）

**分類選項與友善名稱:**
- LEARNING (學習成長): 學習、知識、技能、課程
- INSPIRATION (靈感創意): 靈感、創意、想法、設計
- WORK (工作事務): 工作、任務、專案、職涯
- SOCIAL (社交人際): 朋友、人際、八卦、社交
- LIFE (生活記錄): 日常生活、心情、經驗、反思
- GOALS (目標規劃): 目標、夢想、計劃、里程碑
- RESOURCES (資源收藏): 文章、連結、影片、參考資料
- MISC (雜項筆記): 雜項、不屬於其他類別

以 JSON 格式回覆（只回覆 JSON）:

**範例 1 - 值得記錄:**
{
  "shouldRecord": true,
  "category": "WORK",
  "confidence": 0.9,
  "warmResponse": "YouTube 影片欸！這看起來跟你的工作相關～我會放到工作類別喔！💼✨",
  "quickSummary": "工作相關的影片"
}

**範例 2 - 不值得記錄（簡單問候）:**
{
  "shouldRecord": false,
  "category": "MISC",
  "confidence": 0.95,
  "warmResponse": "早安～今天也要開心喔！☁️✨",
  "quickSummary": "日常問候",
  "recordReason": "這是日常問候，我會記住你跟我打招呼，但不會存到知識庫喔～"
}

**範例 3 - 不值得記錄（純表情）:**
{
  "shouldRecord": false,
  "category": "MISC",
  "confidence": 0.9,
  "warmResponse": "😊 我也很開心見到你！有什麼想記錄的嗎？",
  "quickSummary": "表情符號互動",
  "recordReason": "純粹的互動不需要存儲～"
}

**回應風格要求 - 重要！:**
- 如果 shouldRecord = true：warmResponse 要提到分類類別
- 如果 shouldRecord = false：warmResponse 要友善回應但不提存儲
- 溫暖、可愛、鼓勵的語氣
- 使用可愛的表情符號 ☁️ ✨ 💭 💡 🌟 📚 💼 📺
- 讓使用者知道哪些會記錄、哪些不會`

      // 使用 Gemini 2.5 Flash (快速模型)
      const oldModel = this.geminiModel
      this.geminiModel = 'gemini-2.5-flash'

      const response = await this.callMCP(prompt, chief.id)
      const result = this.parseJSON(response)

      this.geminiModel = oldModel // 恢復原模型

      return {
        category: result.category as AssistantType || AssistantType.LIFE,
        confidence: result.confidence || 0.8,
        warmResponse: result.warmResponse || '收到了～ ☁️',
        quickSummary: result.quickSummary || input.content.substring(0, 30),
        shouldRecord: result.shouldRecord !== false, // 預設為 true，除非明確為 false
        recordReason: result.recordReason
      }
    } catch (error) {
      logger.error('[白噗噗] 快速分類失敗:', error)

      // 降級方案：使用關鍵字匹配
      const fallbackCategory = assistantService.fallbackCategoryDetection(input.content)

      // 降級方案：簡單規則判斷是否為寒暄
      const isGreeting = this.isSimpleGreeting(input.content)

      return {
        category: fallbackCategory,
        confidence: 0.5,
        warmResponse: isGreeting
          ? '嗨～有什麼想記錄的嗎？☁️'
          : '收到了！我幫你記錄下來了～ ☁️',
        quickSummary: input.content.substring(0, 30),
        shouldRecord: !isGreeting,
        recordReason: isGreeting ? '簡單問候不需要存儲' : undefined
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

      logger.info(`[Chief Agent] 開始多模態內容分析`)

      // === Stage 4: 深度多模態處理 ===
      const imageAnalyses: any[] = []
      const pdfAnalyses: any[] = []
      const linkAnalyses: any[] = []

      // 1. 處理圖片檔案
      if (input.files && input.files.length > 0) {
        const imageFiles = input.files.filter(f => f.type.startsWith('image/'))
        for (const file of imageFiles) {
          logger.info(`[Chief Agent] 分析圖片: ${file.name}`)
          const analysis = await multimodalProcessor.processImage(file.url, input.content)
          imageAnalyses.push({ file: file.name, ...analysis })
        }

        // 2. 處理 PDF 檔案
        const pdfFiles = input.files.filter(f => f.type.includes('pdf'))
        for (const file of pdfFiles) {
          logger.info(`[Chief Agent] 分析 PDF: ${file.name}`)
          const analysis = await multimodalProcessor.processPDF(file.url, input.content)
          pdfAnalyses.push({ file: file.name, ...analysis })
        }
      }

      // 3. 處理連結
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
   * 上傳知識到分發系統（新架構 - 雙階段處理）
   * 階段1: 白噗噗快速分類 + 即時回應（前端立即顯示）
   * 階段2: Sub-Agent 深度分析 + 寫入知識庫（後端非同步處理）
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
      logger.info(`[白噗噗] 快速分類完成: ${quickResult.category} (${quickResult.confidence}), 是否記錄: ${quickResult.shouldRecord}`)

      // === 如果不值得記錄，直接返回白噗噗的回應（不創建任何記錄）===
      if (!quickResult.shouldRecord) {
        logger.info(`[白噗噗] 內容不值得記錄，僅回應不存儲 - 原因: ${quickResult.recordReason || '簡單互動'}`)

        return {
          distribution: null, // 不創建分發記錄
          tororoResponse: {
            warmMessage: quickResult.warmResponse,
            category: quickResult.category,
            quickSummary: quickResult.quickSummary,
            confidence: quickResult.confidence,
            shouldRecord: false,
            recordReason: quickResult.recordReason
          },
          agentDecisions: [],
          memoriesCreated: [],
          processingTime: Date.now() - startTime,
          backgroundProcessing: false, // 沒有後台處理
          skipRecording: true // 標記為跳過記錄
        }
      }

      // 2. 確定內容類型
      const contentType = this.determineContentType(input)

      // 3. 獲取對應的 Assistant ID
      const targetAssistant = await assistantService.getAssistantByType(quickResult.category)
      if (!targetAssistant) {
        throw new Error(`No assistant found for category: ${quickResult.category}`)
      }

      // 4. 創建知識分發記錄（簡化版 - 只記錄基本資訊）
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
          chiefAnalysis: `白噗噗快速分類: ${quickResult.category}`, // 簡單記錄
          chiefSummary: quickResult.quickSummary,
          identifiedTopics: [quickResult.category],
          suggestedTags: [],
          distributedTo: [targetAssistant.id],
          storedBy: [], // 等 Sub-Agent 處理後更新
          processingTime: Date.now() - startTime,
        },
        include: {
          agentDecisions: true,
          memories: true,
        }
      })

      logger.info(`[Chief Agent] 知識分發記錄創建完成，ID: ${distribution.id}`)

      // === 階段 2: 非同步觸發 Sub-Agent 深度處理 ===
      // 不等待完成，立即返回給前端
      setImmediate(async () => {
        try {
          logger.info(`[Sub-Agent] 開始非同步深度分析，分發ID: ${distribution.id}`)

          const subAgentResult = await subAgentService.processDistribution(
            userId,
            distribution.id,
            [targetAssistant.id]
          )

          logger.info(`[Sub-Agent] 深度分析完成 - 創建記憶: ${subAgentResult.memoriesCreated.length}`)
        } catch (error) {
          logger.error('[Sub-Agent] 非同步處理失敗:', error)
        }
      })

      logger.info(`[Chief Agent] 白噗噗即時回應完成 - 耗時: ${Date.now() - startTime}ms`)

      // 立即返回白噗噗的溫暖回應給前端
      return {
        distribution,
        // 白噗噗的即時回應
        tororoResponse: {
          warmMessage: quickResult.warmResponse,
          category: quickResult.category,
          quickSummary: quickResult.quickSummary,
          confidence: quickResult.confidence
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
   * 簡單規則判斷是否為問候語或寒暄（不值得記錄）
   * 注意：要非常保守，避免誤判！只過濾純粹的寒暄
   */
  private isSimpleGreeting(content: string): boolean {
    const text = content.trim().toLowerCase()

    // 太短的內容（少於 3 個字）才判定為寒暄
    if (text.length < 3) {
      return true
    }

    // 檢查是否包含時間、日期、人名等關鍵資訊（這些一定要記錄）
    const importantPatterns = [
      /明天|今天|昨天|下週|下周|上週|上周|月|日|號|點|分/i,  // 時間
      /要|需要|記得|提醒|待辦|todo|任務/i,                    // 任務
      /跟|和|與|找|約|見面|吃飯|會議|meeting/i,               // 社交/行程
      /學習|工作|專案|計劃|目標/i,                            // 重要類別
    ]

    // 如果包含重要資訊，一定不是寒暄
    if (importantPatterns.some(pattern => pattern.test(text))) {
      return false
    }

    // 只過濾極短且明確的問候語（整句都是問候語）
    const strictGreetingPatterns = [
      /^(早安|晚安|你好|嗨|hi|hello|hey)$/i,           // 完全匹配
      /^(謝謝|感謝|收到|好的|ok)$/i,                   // 完全匹配
      /^(測試|test)$/i,                                // 完全匹配
    ]

    // 只包含表情符號
    const emojiOnlyPattern = /^[\p{Emoji}\s]+$/u
    if (emojiOnlyPattern.test(content)) {
      return true
    }

    // 檢查是否完全匹配問候語（必須是完整的句子，不能有其他內容）
    return strictGreetingPatterns.some(pattern => pattern.test(text))
  }
}

export const chiefAgentService = new ChiefAgentService()
