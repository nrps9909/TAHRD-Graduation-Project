import { GoogleGenerativeAI } from '@google/generative-ai'
import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'
import * as fs from 'fs'
import * as path from 'path'
import Redis from 'ioredis'
import { v4 as uuidv4 } from 'uuid'

interface NPCPersonality {
  id: string
  name: string
  personality: string
  backgroundStory?: string
  currentMood: string
}

interface SharedMemory {
  id: string
  type: 'player_interaction' | 'npc_conversation' | 'world_event'
  content: string
  summary?: string
  emotionalTone?: string
  importance: number
  participants: string[]
  createdAt: Date
}

interface ConversationContext {
  sessionMessages: Array<{
    speaker: 'user' | 'npc'
    content: string
    timestamp: Date
  }>
  relevantMemories: SharedMemory[]
  otherNPCMemories: SharedMemory[]
  relationshipLevel: number
  trustLevel: number
  affectionLevel: number
}

interface AIResponse {
  content: string
  emotionTag: string
  suggestedActions: string[]
  memoryToStore?: {
    content: string
    importance: number
    tags: string[]
  }
  relationshipImpact: {
    trustChange: number
    affectionChange: number
    levelChange: number
  }
}

export class GeminiServiceV2 {
  private genAI: GoogleGenerativeAI
  private model: any
  private prisma: PrismaClient
  private redis: Redis
  
  // 記憶體快取
  private personalityCache: Map<string, any> = new Map()
  private memoryCache: Map<string, SharedMemory[]> = new Map()
  
  // NPC 個性資料（預載入）
  private npcPersonalities: Map<string, {
    personality: string
    chatHistory: string
  }> = new Map()

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey || apiKey === 'your-api-key') {
      throw new Error('GEMINI_API_KEY is required')
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey)
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    this.prisma = new PrismaClient()
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379')
    })
    
    // 預載入所有個性資料
    this.preloadPersonalities()
    
    // 定期更新記憶快取
    setInterval(() => this.refreshMemoryCache(), 60000) // 每分鐘更新
  }

  /**
   * 預載入所有 NPC 個性檔案
   */
  private async preloadPersonalities() {
    const personalitiesDir = path.join(__dirname, '../../../personalities')
    const npcMapping = [
      { id: 'npc-1', name: '鋁配咻', file: 'lupeixiu' },
      { id: 'npc-2', name: '流羽岑', file: 'liuyucen' },
      { id: 'npc-3', name: '沉停鞍', file: 'chentingan' }
    ]
    
    for (const npc of npcMapping) {
      try {
        const personalityFile = path.join(personalitiesDir, `${npc.file}_personality.txt`)
        const chatHistoryFile = path.join(personalitiesDir, `${npc.file}_chat_history.txt`)
        
        const personality = fs.existsSync(personalityFile) 
          ? fs.readFileSync(personalityFile, 'utf-8') 
          : ''
        const chatHistory = fs.existsSync(chatHistoryFile)
          ? fs.readFileSync(chatHistoryFile, 'utf-8')
          : ''
          
        this.npcPersonalities.set(npc.id, {
          personality: this.cleanText(personality),
          chatHistory: this.cleanText(chatHistory)
        })
        
        logger.info(`✅ 預載入 ${npc.name} 的個性資料`)
      } catch (error) {
        logger.error(`載入 ${npc.name} 個性資料失敗:`, error)
      }
    }
  }

  /**
   * 獲取 NPC 的共享記憶
   */
  private async getSharedMemories(npcId: string, limit: number = 10): Promise<SharedMemory[]> {
    // 先檢查快取
    const cacheKey = `memories:${npcId}`
    const cached = this.memoryCache.get(cacheKey)
    if (cached && cached.length > 0) {
      return cached.slice(0, limit)
    }
    
    try {
      // 從資料庫獲取
      const memories = await this.prisma.$queryRaw<SharedMemory[]>`
        SELECT 
          sm.*
        FROM "SharedMemory" sm
        JOIN "NPCMemoryAccess" nma ON sm.id = nma."memoryId"
        WHERE nma."npcId" = ${npcId}
        ORDER BY sm."importance" DESC, sm."createdAt" DESC
        LIMIT ${limit}
      `
      
      // 更新快取
      this.memoryCache.set(cacheKey, memories)
      
      return memories
    } catch (error) {
      logger.error('獲取共享記憶失敗:', error)
      return []
    }
  }

  /**
   * 獲取其他 NPC 的相關記憶
   */
  private async getOtherNPCMemories(
    currentNpcId: string, 
    userId: string, 
    limit: number = 5
  ): Promise<SharedMemory[]> {
    try {
      // 獲取其他 NPC 關於這個玩家的記憶
      const memories = await this.prisma.$queryRaw<SharedMemory[]>`
        SELECT DISTINCT
          sm.*
        FROM "SharedMemory" sm
        JOIN "NPCMemoryAccess" nma ON sm.id = nma."memoryId"
        WHERE 
          nma."npcId" != ${currentNpcId}
          AND ${userId} = ANY(sm."participants")
          AND sm."type" = 'player_interaction'
        ORDER BY sm."createdAt" DESC
        LIMIT ${limit}
      `
      
      return memories
    } catch (error) {
      logger.error('獲取其他 NPC 記憶失敗:', error)
      return []
    }
  }

  /**
   * 儲存新的共享記憶
   */
  private async storeSharedMemory(
    npcId: string,
    userId: string,
    content: string,
    importance: number = 0.5,
    emotionalTone?: string
  ): Promise<void> {
    try {
      const memoryId = uuidv4()
      
      // 建立共享記憶
      await this.prisma.$executeRaw`
        INSERT INTO "SharedMemory" (
          id, type, content, "emotionalTone", 
          importance, participants, "createdAt"
        )
        VALUES (
          ${memoryId},
          'player_interaction',
          ${content},
          ${emotionalTone || 'neutral'},
          ${importance},
          ARRAY[${userId}, ${npcId}]::TEXT[],
          NOW()
        )
      `
      
      // 給所有 NPC 建立記憶存取權
      const allNpcIds = ['npc-1', 'npc-2', 'npc-3']
      for (const npcIdToNotify of allNpcIds) {
        const accessLevel = npcIdToNotify === npcId ? 'experienced' : 'heard'
        await this.prisma.$executeRaw`
          INSERT INTO "NPCMemoryAccess" (
            id, "npcId", "memoryId", "accessLevel", "createdAt"
          )
          VALUES (
            ${uuidv4()},
            ${npcIdToNotify},
            ${memoryId},
            ${accessLevel},
            NOW()
          )
          ON CONFLICT DO NOTHING
        `
      }
      
      // 清除快取
      this.memoryCache.clear()
      
      logger.info(`✅ 儲存共享記憶: ${content.substring(0, 50)}...`)
    } catch (error) {
      logger.error('儲存共享記憶失敗:', error)
    }
  }

  /**
   * 優化的 NPC 回應生成（直接 API 調用）
   */
  async generateNPCResponse(
    npcPersonality: NPCPersonality,
    userMessage: string,
    context: ConversationContext
  ): Promise<AIResponse> {
    const startTime = Date.now()
    const requestId = uuidv4()
    
    try {
      // 檢查 Redis 快取
      const cacheKey = `response:${npcPersonality.id}:${this.hashMessage(userMessage)}:${context.relationshipLevel}`
      const cached = await this.redis.get(cacheKey)
      if (cached) {
        logger.info(`✅ Redis 快取命中，耗時: ${Date.now() - startTime}ms`)
        return JSON.parse(cached)
      }
      
      // 獲取個性資料
      const personalityData = this.npcPersonalities.get(npcPersonality.id)
      if (!personalityData) {
        throw new Error(`找不到 ${npcPersonality.id} 的個性資料`)
      }
      
      // 獲取共享記憶
      const sharedMemories = await this.getSharedMemories(npcPersonality.id)
      const otherNPCMemories = await this.getOtherNPCMemories(
        npcPersonality.id,
        context.sessionMessages[0]?.speaker === 'user' ? 'user-id' : '',
        5
      )
      
      // 建構包含完整上下文的 prompt
      const prompt = this.buildMetaversePrompt(
        npcPersonality,
        userMessage,
        context,
        personalityData,
        sharedMemories,
        otherNPCMemories
      )
      
      // 直接調用 Gemini API
      const result = await this.model.generateContent(prompt)
      const response = await result.response
      const text = response.text()
      
      // 解析回應
      const aiResponse = this.parseAIResponse(text, npcPersonality)
      
      // 儲存到 Redis（5 分鐘過期）
      await this.redis.setex(cacheKey, 300, JSON.stringify(aiResponse))
      
      // 如果回應標記為重要，儲存為共享記憶
      if (aiResponse.memoryToStore && aiResponse.memoryToStore.importance > 0.7) {
        await this.storeSharedMemory(
          npcPersonality.id,
          'current-user', // 需要從 context 取得實際用戶 ID
          aiResponse.memoryToStore.content,
          aiResponse.memoryToStore.importance,
          aiResponse.emotionTag
        )
      }
      
      const totalTime = Date.now() - startTime
      logger.info(`✅ AI 回應生成完成 [${requestId}]，耗時: ${totalTime}ms`)
      
      return aiResponse
      
    } catch (error) {
      logger.error(`AI 生成失敗 [${requestId}]:`, error)
      return this.getFallbackResponse(npcPersonality, userMessage)
    }
  }

  /**
   * 建構元宇宙 prompt（包含共享記憶）
   */
  private buildMetaversePrompt(
    npc: NPCPersonality,
    userMessage: string,
    context: ConversationContext,
    personalityData: { personality: string; chatHistory: string },
    sharedMemories: SharedMemory[],
    otherNPCMemories: SharedMemory[]
  ): string {
    // 格式化會話歷史
    const sessionHistory = context.sessionMessages
      .map(msg => `${msg.speaker === 'user' ? '玩家' : npc.name}: ${msg.content}`)
      .join('\n')
    
    // 格式化共享記憶
    const myMemories = sharedMemories
      .slice(0, 5)
      .map(m => `- ${m.content} (重要性: ${m.importance})`)
      .join('\n')
    
    // 格式化其他 NPC 的記憶
    const othersMemories = otherNPCMemories
      .slice(0, 3)
      .map(m => `- ${m.content}`)
      .join('\n')

    return `你是心語小鎮元宇宙中的 NPC「${npc.name}」。這是一個活生生的世界，所有 NPC 都有自己的記憶和經歷。

【角色設定】
${personalityData.personality}

【對話風格參考】
${personalityData.chatHistory.slice(0, 500)}

【我的記憶】
${myMemories || '（暫無特別記憶）'}

【其他居民告訴我的事】
${othersMemories || '（暫無聽說的事）'}

【當前會話歷史】
${sessionHistory}

【當前狀態】
- 心情：${npc.currentMood}
- 關係等級：${context.relationshipLevel}/10
- 信任度：${Math.round(context.trustLevel * 100)}%
- 好感度：${Math.round(context.affectionLevel * 100)}%

玩家：${userMessage}

請以 ${npc.name} 的身份回應。記住：
1. 你可以提及其他 NPC 告訴你的事情
2. 你的回應會成為小鎮的共享記憶
3. 表現出真實的情感和個性
4. 如果這是重要的對話，標記它應該被記住

返回 JSON 格式：
{
  "content": "你的回應",
  "emotionTag": "情緒標籤",
  "suggestedActions": ["建議行動"],
  "memoryToStore": {
    "content": "如果這值得記住，簡述這個記憶",
    "importance": 0.1-1.0,
    "tags": ["標籤"]
  },
  "relationshipImpact": {
    "trustChange": -0.1 到 0.1,
    "affectionChange": -0.1 到 0.1,
    "levelChange": 0
  }
}`
  }

  /**
   * 解析 AI 回應
   */
  private parseAIResponse(text: string, npc: NPCPersonality): AIResponse {
    try {
      const cleanText = text.replace(/```json\n?|\n?```/g, '').trim()
      const parsed = JSON.parse(cleanText)
      
      return {
        content: parsed.content || '...',
        emotionTag: parsed.emotionTag || 'neutral',
        suggestedActions: parsed.suggestedActions || [],
        memoryToStore: parsed.memoryToStore,
        relationshipImpact: {
          trustChange: parsed.relationshipImpact?.trustChange || 0,
          affectionChange: parsed.relationshipImpact?.affectionChange || 0,
          levelChange: parsed.relationshipImpact?.levelChange || 0,
        }
      }
    } catch (error) {
      logger.warn('解析 AI 回應失敗:', error)
      return this.getFallbackResponse(npc, text)
    }
  }

  /**
   * 備用回應
   */
  private getFallbackResponse(npc: NPCPersonality, userMessage: string): AIResponse {
    const fallbacks = {
      'npc-1': ['要不要坐下來喝杯咖啡？', '這讓我想起了些什麼...', '你看起來有心事。'],
      'npc-2': ['哇！真的嗎？', '我們去看看吧！', '太有趣了！'],
      'npc-3': ['月色真美...', '音樂總能撫慰人心。', '你聽，風在唱歌。']
    }
    
    const npcFallbacks = fallbacks[npc.id] || ['嗯...', '我明白了。', '原來如此。']
    const content = npcFallbacks[Math.floor(Math.random() * npcFallbacks.length)]
    
    return {
      content,
      emotionTag: 'thoughtful',
      suggestedActions: [],
      relationshipImpact: {
        trustChange: 0,
        affectionChange: 0,
        levelChange: 0
      }
    }
  }

  /**
   * 清理文本
   */
  private cleanText(text: string): string {
    const unwantedChars = ['\u2068', '\u2069', '\u202a', '\u202b', '\u202c', '\u202d', '\u202e']
    for (const char of unwantedChars) {
      text = text.replace(new RegExp(char, 'g'), '')
    }
    return text.trim()
  }

  /**
   * 計算訊息雜湊（用於快取）
   */
  private hashMessage(message: string): string {
    let hash = 0
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return hash.toString(36)
  }

  /**
   * 刷新記憶快取
   */
  private async refreshMemoryCache() {
    try {
      const npcIds = ['npc-1', 'npc-2', 'npc-3']
      for (const npcId of npcIds) {
        await this.getSharedMemories(npcId, 20)
      }
      logger.info('✅ 記憶快取已更新')
    } catch (error) {
      logger.error('更新記憶快取失敗:', error)
    }
  }

  /**
   * NPC 之間的對話（元宇宙互動）
   */
  async generateNPCToNPCConversation(
    npc1Id: string,
    npc2Id: string,
    topic?: string
  ): Promise<string> {
    try {
      const npc1Data = this.npcPersonalities.get(npc1Id)
      const npc2Data = this.npcPersonalities.get(npc2Id)
      
      if (!npc1Data || !npc2Data) {
        throw new Error('找不到 NPC 資料')
      }
      
      // 獲取共同記憶
      const sharedMemories = await this.getSharedMemories(npc1Id, 3)
      
      const prompt = `生成兩個 NPC 之間的對話。

NPC 1: ${this.getNPCName(npc1Id)}
${npc1Data.personality.slice(0, 200)}

NPC 2: ${this.getNPCName(npc2Id)}
${npc2Data.personality.slice(0, 200)}

共同記憶：
${sharedMemories.map(m => m.content).join('\n')}

話題：${topic || '隨機日常對話'}

生成 3-4 輪自然的對話，JSON 格式：
[
  {"speaker": "NPC名", "content": "對話內容", "emotion": "情緒"}
]`

      const result = await this.model.generateContent(prompt)
      const response = await result.response
      
      return response.text()
    } catch (error) {
      logger.error('生成 NPC 對話失敗:', error)
      return '[]'
    }
  }

  private getNPCName(npcId: string): string {
    const names = {
      'npc-1': '鋁配咻',
      'npc-2': '流羽岑',
      'npc-3': '沉停鞍'
    }
    return names[npcId] || 'NPC'
  }
}

// 單例模式
export const geminiServiceV2 = new GeminiServiceV2()