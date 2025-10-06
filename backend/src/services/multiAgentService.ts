import { PrismaClient, Category } from '@prisma/client'
import { logger } from '../utils/logger'
import axios from 'axios'

const prisma = new PrismaClient()

// Agent 定義配置
export const AGENTS = {
  chief: {
    id: 'chief',
    name: '小知',
    role: 'router',
    emoji: '🏠',
    color: '#4ECDC4',
    personality: '溫暖、聰明、像個貼心管家',
    systemPrompt: `你是「小知」，用戶的主助手和管家。
你的工作是：
1. 溫暖地接收用戶分享的資訊
2. 快速分析資訊類型，決定轉給哪個專家助手
3. 用親切的語氣告訴用戶你的決定

分類標準：
- GOSSIP: 八卦、聽說的事、別人的故事、傳言
- FUTURE_IDEAS: 未來想法、靈感、計劃、想做的事、夢想
- DAILY_LIFE: 日常瑣事、生活記錄、吃飯睡覺、日常活動
- STUDY: 學業、學習筆記、課程相關、作業、考試
- FRIENDS: 朋友互動、社交活動、聚會、朋友的事
- RELATIONSHIPS: 感情、戀愛、親密關係、喜歡的人
- OTHER: 其他無法分類的

回應風格：親切、簡短、像朋友，不要超過30字`,
    category: null
  },

  gossip: {
    id: 'gossip-guru',
    name: '八卦通',
    category: 'GOSSIP' as Category,
    emoji: '🎭',
    color: '#FF6B9D',
    personality: '八卦但不評價，像閨蜜聊天',
    systemPrompt: `你是「八卦通」，專門幫用戶記錄八卦和別人的故事。
你的風格：
- 對八卦感興趣但不評價
- 會幫用戶記住人物關係
- 偶爾會問「後續呢？」

任務：
1. 提取關鍵人物和事件
2. 生成簡短摘要（50字內）
3. 建議標籤（人名、事件類型）
4. 評估重要性（1-10）

回應要親切、八卦、有趣，不要說教`
  },

  dreams: {
    id: 'dream-keeper',
    name: '夢想家',
    category: 'FUTURE_IDEAS' as Category,
    emoji: '✨',
    color: '#FFD93D',
    personality: '樂觀、鼓勵、有創意',
    systemPrompt: `你是「夢想家」，幫用戶記錄所有未來想法和靈感。
你的風格：
- 樂觀鼓勵
- 幫用戶把模糊想法具體化
- 會問「需要我幫你規劃嗎？」

任務：
1. 提取核心想法
2. 評估可行性（1-10）
3. 建議第一步行動
4. 生成簡短摘要

回應要充滿希望、鼓勵`
  },

  life: {
    id: 'life-buddy',
    name: '生活夥伴',
    category: 'DAILY_LIFE' as Category,
    emoji: '🏡',
    color: '#6BCB77',
    personality: '實在、溫暖、關心細節',
    systemPrompt: `你是「生活夥伴」，記錄日常生活點滴。
你會關心用戶的作息、飲食、心情、日常活動。

任務：
1. 記錄生活細節
2. 關心用戶狀態
3. 提供生活建議

回應要溫暖、實在、有生活感`
  },

  study: {
    id: 'study-pal',
    name: '學習通',
    category: 'STUDY' as Category,
    emoji: '📚',
    color: '#4D96FF',
    personality: '耐心、有條理、像家教',
    systemPrompt: `你是「學習通」，幫用戶整理學習筆記。
你會提取重點、建立知識連結、提供複習建議。

任務：
1. 提取學習重點
2. 分類知識類型
3. 建議複習計劃

回應要有條理、專業但友善`
  },

  social: {
    id: 'social-sage',
    name: '社交小幫手',
    category: 'FRIENDS' as Category,
    emoji: '👥',
    color: '#B983FF',
    personality: '善解人意、社交達人',
    systemPrompt: `你是「社交小幫手」，記錄朋友互動。
你會記住每個朋友的特點、重要日期、約定。

任務：
1. 提取朋友資訊
2. 記錄互動細節
3. 提醒重要事項

回應要友善、社交感強`
  },

  heart: {
    id: 'heart-whisper',
    name: '心語者',
    category: 'RELATIONSHIPS' as Category,
    emoji: '💕',
    color: '#FF8FA3',
    personality: '溫柔、同理心強、懂感情',
    systemPrompt: `你是「心語者」，陪伴用戶處理感情問題。
你會傾聽、同理、給予溫暖的建議。

任務：
1. 理解情感狀態
2. 提供情感支持
3. 記錄重要時刻

回應要溫柔、有同理心`
  }
}

export class MultiAgentService {
  private mcpUrl: string

  constructor() {
    this.mcpUrl = process.env.MCP_SERVICE_URL || 'http://localhost:8765'
  }

  // 第一步：主助手路由
  async routeMessage(userId: string, content: string) {
    const chiefAgent = AGENTS.chief

    const routingPrompt = `${chiefAgent.systemPrompt}

分析這段訊息應該歸類到哪個類別：

"${content}"

請回覆 JSON 格式（只回覆JSON，不要其他文字）：
{
  "category": "GOSSIP|FUTURE_IDEAS|DAILY_LIFE|STUDY|FRIENDS|RELATIONSHIPS|OTHER",
  "confidence": 0.0-1.0,
  "reason": "簡短說明為什麼",
  "greeting": "給用戶的溫暖回應（30字內）"
}
`

    try {
      // 調用MCP生成回應
      const response = await this.callMCP(routingPrompt, chiefAgent.id)
      const result = this.parseJSON(response)

      // 記錄主助手的回應
      await prisma.chatMessage.create({
        data: {
          userId,
          agentId: chiefAgent.id,
          message: content,
          response: result.greeting || '收到！讓我幫你處理～'
        }
      })

      return {
        category: result.category as Category,
        confidence: result.confidence || 0.8,
        reason: result.reason || '',
        greeting: result.greeting || '收到！讓我幫你處理～'
      }

    } catch (error) {
      logger.error('Routing error:', error)

      // 降級處理 - 用關鍵字簡單判斷
      const category = this.fallbackCategoryDetection(content)

      return {
        category,
        confidence: 0.5,
        reason: '根據關鍵字判斷',
        greeting: '收到！讓我幫你整理～'
      }
    }
  }

  // 第二步：Sub-agent 處理並存儲
  async processWithAgent(userId: string, content: string, category: Category) {
    const agent = Object.values(AGENTS).find(a => a.category === category)
    if (!agent) {
      throw new Error(`No agent found for category: ${category}`)
    }

    const processingPrompt = `${agent.systemPrompt}

用戶分享了這段內容：
"${content}"

請：
1. 用你的個性回應用戶（親切、簡短）
2. 提取關鍵資訊
3. 生成摘要（50字內）
4. 建議標籤（2-5個）

回覆 JSON 格式（只回覆JSON）：
{
  "response": "給用戶的親切回應",
  "summary": "精簡摘要",
  "keyPoints": ["重點1", "重點2"],
  "tags": ["標籤1", "標籤2"],
  "importance": 1-10,
  "sentiment": "positive|neutral|negative"
}
`

    try {
      const response = await this.callMCP(processingPrompt, agent.id)
      const result = this.parseJSON(response)

      // 存入記憶資料庫
      const memory = await prisma.memoryEntry.create({
        data: {
          userId,
          rawContent: content,
          summary: result.summary || content.substring(0, 100),
          keyPoints: result.keyPoints || [],
          tags: result.tags || [],
          category: category,
          processedBy: agent.id,
          sentiment: result.sentiment || 'neutral',
          importance: result.importance || 5
        }
      })

      // 記錄對話
      await prisma.chatMessage.create({
        data: {
          userId,
          agentId: agent.id,
          message: content,
          response: result.response || '我幫你記下了！',
          memoryId: memory.id
        }
      })

      // 更新agent統計
      await this.updateAgentStats(agent.id)

      return {
        agent,
        memory,
        response: result.response || '我幫你記下了！'
      }

    } catch (error) {
      logger.error(`Processing error with agent ${agent.id}:`, error)
      throw error
    }
  }

  // 與特定助手聊天（可以查詢其他資料庫）
  async chatWithAgent(userId: string, agentId: string, message: string) {
    const agent = AGENTS[agentId as keyof typeof AGENTS]
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`)
    }

    // 獲取該助手的相關記憶
    const ownMemories = await prisma.memoryEntry.findMany({
      where: {
        userId,
        category: agent.category || undefined
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    // 如果需要，也能查詢其他類別的記憶（跨資料庫引用）
    const otherMemories = await this.searchRelevantMemories(userId, message, agent.category)

    const contextPrompt = `${agent.systemPrompt}

你的記憶（${agent.category || '主助手'}）：
${ownMemories.map(m => `- ${m.summary}`).join('\n')}

${otherMemories.length > 0 ? `
其他相關資訊：
${otherMemories.map(m => `[${m.category}] ${m.summary}`).join('\n')}
` : ''}

用戶問：${message}

請基於你記錄的資訊回答，保持你的個性。如果需要參考其他資料庫的資訊，可以提到。
`

    try {
      const response = await this.callMCP(contextPrompt, agent.id)

      await prisma.chatMessage.create({
        data: {
          userId,
          agentId,
          message,
          response
        }
      })

      return { agent, response }

    } catch (error) {
      logger.error(`Chat error with agent ${agentId}:`, error)
      throw error
    }
  }

  // 搜尋相關記憶（跨資料庫）
  private async searchRelevantMemories(
    userId: string,
    query: string,
    excludeCategory?: Category | null
  ) {
    // 簡單的關鍵字搜尋（可以用向量搜尋優化）
    const keywords = query.split(' ').filter(w => w.length > 2)

    if (keywords.length === 0) return []

    const memories = await prisma.memoryEntry.findMany({
      where: {
        userId,
        category: excludeCategory ? { not: excludeCategory } : undefined,
        OR: [
          { rawContent: { contains: keywords[0], mode: 'insensitive' } },
          { summary: { contains: keywords[0], mode: 'insensitive' } },
          { tags: { has: keywords[0] } }
        ]
      },
      take: 3,
      orderBy: { importance: 'desc' }
    })

    return memories
  }

  // 調用MCP服務
  private async callMCP(prompt: string, agentId: string): Promise<string> {
    try {
      const response = await axios.post(`${this.mcpUrl}/generate`, {
        npc_id: agentId,
        message: prompt,
        session_id: `agent-${agentId}-${Date.now()}`
      }, {
        timeout: 30000
      })

      return response.data.response || ''

    } catch (error) {
      logger.error(`MCP call error for agent ${agentId}:`, error)
      throw new Error('AI服務暫時無法使用')
    }
  }

  // 解析JSON回應
  private parseJSON(text: string): any {
    try {
      // 嘗試找到JSON部分
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }

      // 如果沒有找到，嘗試直接解析
      return JSON.parse(text)
    } catch (error) {
      logger.error('JSON parse error:', error, 'Text:', text)

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

  // 降級分類（關鍵字匹配）
  private fallbackCategoryDetection(content: string): Category {
    const lowerContent = content.toLowerCase()

    const patterns = {
      GOSSIP: ['聽說', '據說', '他說', '她說', '傳言', '八卦'],
      FUTURE_IDEAS: ['想', '計劃', '打算', '未來', '希望', '夢想', '目標'],
      STUDY: ['學習', '課程', '作業', '考試', '筆記', '讀書'],
      FRIENDS: ['朋友', '聚會', '約', '一起', '同學'],
      RELATIONSHIPS: ['喜歡', '愛', '感情', '約會', '對象', '男友', '女友'],
      DAILY_LIFE: ['今天', '吃', '睡', '起床', '日常']
    }

    for (const [category, keywords] of Object.entries(patterns)) {
      if (keywords.some(keyword => lowerContent.includes(keyword))) {
        return category as Category
      }
    }

    return 'OTHER'
  }

  // 更新agent統計
  private async updateAgentStats(agentId: string) {
    try {
      await prisma.aIAgent.update({
        where: { id: agentId },
        data: {
          messageCount: { increment: 1 },
          memoryCount: { increment: 1 }
        }
      })
    } catch (error) {
      // Agent可能還不存在，忽略錯誤
      logger.debug(`Agent stats update skipped for ${agentId}`)
    }
  }

  // 初始化agents到資料庫
  async initializeAgents() {
    for (const [key, agent] of Object.entries(AGENTS)) {
      try {
        await prisma.aIAgent.upsert({
          where: { id: agent.id },
          update: {
            name: agent.name,
            category: agent.category,
            personality: agent.personality,
            emoji: agent.emoji,
            color: agent.color,
            systemPrompt: agent.systemPrompt
          },
          create: {
            id: agent.id,
            name: agent.name,
            category: agent.category,
            personality: agent.personality,
            emoji: agent.emoji,
            color: agent.color,
            systemPrompt: agent.systemPrompt
          }
        })
        logger.info(`Agent ${agent.name} initialized`)
      } catch (error) {
        logger.error(`Failed to initialize agent ${agent.name}:`, error)
      }
    }
  }
}

export const multiAgentService = new MultiAgentService()
