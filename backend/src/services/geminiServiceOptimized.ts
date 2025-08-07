import { GoogleGenerativeAI } from '@google/generative-ai'
import { logger } from '../utils/logger'
import * as fs from 'fs'
import * as path from 'path'
import { LRUCache } from 'lru-cache'

interface NPCPersonality {
  id: string
  name: string
  personality: string
  backgroundStory?: string
  currentMood: string
}

interface ConversationContext {
  recentMessages: Array<{
    speaker: 'user' | 'npc'
    content: string
    timestamp: Date
  }>
  relationshipLevel: number
  trustLevel: number
  affectionLevel: number
}

interface AIResponse {
  content: string
  emotionTag: string
  suggestedActions: string[]
  relationshipImpact: {
    trustChange: number
    affectionChange: number
    levelChange: number
  }
}

export class OptimizedGeminiService {
  private genAI: GoogleGenerativeAI
  private model: any
  
  // 快取層
  private personalityCache: Map<string, any> = new Map()
  private responseCache: LRUCache<string, AIResponse>
  
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
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }) // 使用更快的模型
    
    // 初始化 LRU 快取（最多 100 個回應，10 分鐘過期）
    this.responseCache = new LRUCache<string, AIResponse>({
      max: 100,
      ttl: 1000 * 60 * 10
    })
    
    // 預載入所有 NPC 個性資料
    this.preloadPersonalities()
  }

  /**
   * 預載入所有 NPC 個性檔案到記憶體
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
        
        logger.info(`預載入 ${npc.name} 的個性資料完成`)
      } catch (error) {
        logger.error(`載入 ${npc.name} 個性資料失敗:`, error)
      }
    }
  }

  /**
   * 清理文本中的特殊字符
   */
  private cleanText(text: string): string {
    const unwantedChars = ['\u2068', '\u2069', '\u202a', '\u202b', '\u202c', '\u202d', '\u202e']
    for (const char of unwantedChars) {
      text = text.replace(new RegExp(char, 'g'), '')
    }
    return text.trim()
  }

  /**
   * 生成快取鍵
   */
  private getCacheKey(npcId: string, message: string, context: ConversationContext): string {
    return `${npcId}:${message}:${context.relationshipLevel}:${context.recentMessages.length}`
  }

  /**
   * 優化的 NPC 回應生成
   */
  async generateNPCResponse(
    npcPersonality: NPCPersonality,
    userMessage: string,
    context: ConversationContext
  ): Promise<AIResponse> {
    const startTime = Date.now()
    
    try {
      // 檢查快取
      const cacheKey = this.getCacheKey(npcPersonality.id, userMessage, context)
      const cached = this.responseCache.get(cacheKey)
      if (cached) {
        logger.info(`快取命中，耗時: ${Date.now() - startTime}ms`)
        return cached
      }
      
      // 獲取預載入的個性資料
      const personalityData = this.npcPersonalities.get(npcPersonality.id)
      if (!personalityData) {
        throw new Error(`找不到 ${npcPersonality.id} 的個性資料`)
      }
      
      // 建構優化的 prompt
      const prompt = this.buildOptimizedPrompt(
        npcPersonality,
        userMessage,
        context,
        personalityData
      )
      
      // 直接調用 API（移除 Python CLI）
      const result = await this.model.generateContent(prompt)
      const response = await result.response
      const text = response.text()
      
      // 解析回應
      const aiResponse = this.parseAIResponse(text, npcPersonality)
      
      // 存入快取
      this.responseCache.set(cacheKey, aiResponse)
      
      const totalTime = Date.now() - startTime
      logger.info(`AI 回應生成完成，耗時: ${totalTime}ms`)
      
      return aiResponse
      
    } catch (error) {
      logger.error('Gemini generation error:', error)
      return this.getFallbackResponse(npcPersonality, userMessage)
    }
  }

  /**
   * 建構優化的 prompt
   */
  private buildOptimizedPrompt(
    npc: NPCPersonality,
    userMessage: string,
    context: ConversationContext,
    personalityData: { personality: string; chatHistory: string }
  ): string {
    // 只包含最近 3 條對話（減少 token 使用）
    const recentHistory = context.recentMessages
      .slice(-3)
      .map(msg => `${msg.speaker === 'user' ? '玩家' : npc.name}: ${msg.content}`)
      .join('\n')

    return `你是「心語小鎮」的NPC「${npc.name}」。

【角色設定】
${personalityData.personality}

【參考對話風格】
${personalityData.chatHistory.slice(0, 500)} // 只使用前 500 字符

【當前狀態】
- 心情：${npc.currentMood}
- 關係等級：${context.relationshipLevel}/10
- 信任度：${Math.round(context.trustLevel * 100)}%

【最近對話】
${recentHistory}

玩家：${userMessage}

請以 ${npc.name} 的身份回應。返回 JSON 格式：
{
  "content": "回應內容",
  "emotionTag": "情緒標籤",
  "suggestedActions": [],
  "relationshipImpact": {
    "trustChange": 0,
    "affectionChange": 0,
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
        relationshipImpact: {
          trustChange: parsed.relationshipImpact?.trustChange || 0,
          affectionChange: parsed.relationshipImpact?.affectionChange || 0,
          levelChange: parsed.relationshipImpact?.levelChange || 0,
        }
      }
    } catch (error) {
      logger.warn('Failed to parse AI response:', error)
      return this.getFallbackResponse(npc, text)
    }
  }

  /**
   * 備用回應
   */
  private getFallbackResponse(npc: NPCPersonality, userMessage: string): AIResponse {
    const fallbacks = {
      'npc-1': ['真的嗎？要不要來杯咖啡慢慢聊？', '這讓我想起了一些往事...', '你看起來有心事呢。'],
      'npc-2': ['哇！這太有趣了！', '我們一起去探險吧！', '你真的很特別呢！'],
      'npc-3': ['月光下，一切都顯得如此寧靜...', '音樂能表達無法言說的情感。', '你聽過風的聲音嗎？']
    }
    
    const npcFallbacks = fallbacks[npc.id] || ['嗯，我明白了。', '謝謝你告訴我。', '讓我想想...']
    const content = npcFallbacks[Math.floor(Math.random() * npcFallbacks.length)]
    
    return {
      content,
      emotionTag: 'thoughtful',
      suggestedActions: [],
      relationshipImpact: {
        trustChange: 0.01,
        affectionChange: 0.01,
        levelChange: 0
      }
    }
  }

  /**
   * 預熱快取（可在系統啟動時調用）
   */
  async warmupCache() {
    const commonGreetings = ['你好', '嗨', '早安', '晚安', '最近好嗎']
    const npcs = ['npc-1', 'npc-2', 'npc-3']
    
    for (const npcId of npcs) {
      for (const greeting of commonGreetings) {
        try {
          await this.generateNPCResponse(
            {
              id: npcId,
              name: this.getNPCName(npcId),
              personality: '',
              currentMood: 'neutral'
            },
            greeting,
            {
              recentMessages: [],
              relationshipLevel: 1,
              trustLevel: 0.5,
              affectionLevel: 0.5
            }
          )
        } catch (error) {
          logger.warn(`預熱快取失敗: ${npcId} - ${greeting}`)
        }
      }
    }
    
    logger.info('快取預熱完成')
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
export const optimizedGeminiService = new OptimizedGeminiService()