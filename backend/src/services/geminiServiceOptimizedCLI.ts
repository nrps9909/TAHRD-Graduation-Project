import { logger } from '../utils/logger'
import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'

interface NPCPersonality {
  id: string
  name: string
  personality: string
  backgroundStory?: string
  currentMood: string
}

interface ConversationContext {
  sessionMessages: Array<{
    speaker: 'user' | 'npc'
    content: string
    timestamp: Date
  }>
  sharedMemories?: string[]
  otherNPCMemories?: string[]
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

/**
 * 優化的 Gemini CLI 服務
 * 使用常駐的 Python HTTP 服務來保留 Gemini CLI 的思考模式優勢
 * 同時大幅降低延遲
 */
export class GeminiServiceOptimizedCLI {
  private readonly serviceUrl: string
  private readonly timeout: number
  private isServiceHealthy: boolean = false
  
  constructor() {
    this.serviceUrl = process.env.GEMINI_SERVICE_URL || 'http://localhost:8765'
    this.timeout = parseInt(process.env.GEMINI_TIMEOUT || '30000')
    
    // 檢查服務健康狀態
    this.checkServiceHealth()
    
    // 定期健康檢查
    setInterval(() => this.checkServiceHealth(), 30000)
  }
  
  /**
   * 檢查 Python 服務健康狀態
   */
  private async checkServiceHealth(): Promise<void> {
    try {
      const response = await axios.get(`${this.serviceUrl}/`, {
        timeout: 5000
      })
      
      if (response.data.status === 'healthy') {
        if (!this.isServiceHealthy) {
          logger.info(`✅ Gemini 服務已連接: ${this.serviceUrl}`)
          logger.info(`📚 已載入個性: ${response.data.personalities_loaded}`)
        }
        this.isServiceHealthy = true
      }
    } catch (error) {
      if (this.isServiceHealthy) {
        logger.error('❌ Gemini 服務無法連接，請確認 Python 服務是否運行')
        logger.info('啟動服務: python3 backend/gemini_server.py')
      }
      this.isServiceHealthy = false
    }
  }
  
  /**
   * 生成 NPC 回應（使用優化的 HTTP 服務）
   */
  async generateNPCResponse(
    npcPersonality: NPCPersonality,
    userMessage: string,
    context: ConversationContext
  ): Promise<AIResponse> {
    const startTime = Date.now()
    const requestId = uuidv4()
    
    try {
      // 檢查服務是否健康
      if (!this.isServiceHealthy) {
        await this.checkServiceHealth()
        if (!this.isServiceHealthy) {
          throw new Error('Gemini 服務未運行')
        }
      }
      
      // 準備請求資料
      const requestData = {
        message: userMessage,
        npcData: {
          id: npcPersonality.id,
          name: npcPersonality.name,
          personality: '', // Python 服務會從預載入的快取讀取
          currentMood: npcPersonality.currentMood,
          relationshipLevel: context.relationshipLevel,
          trustLevel: Math.round(context.trustLevel * 100),
          affectionLevel: Math.round(context.affectionLevel * 100)
        },
        context: {
          // 轉換會話歷史為字串陣列
          sessionMessages: context.sessionMessages.map(
            msg => `${msg.speaker === 'user' ? '玩家' : npcPersonality.name}: ${msg.content}`
          ),
          // 共享記憶
          sharedMemories: context.sharedMemories || [],
          // 其他 NPC 的記憶
          otherNPCMemories: context.otherNPCMemories || []
        }
      }
      
      logger.info(`[${requestId}] 發送請求到 Gemini 服務`)
      
      // 發送 HTTP 請求到 Python 服務
      const response = await axios.post(
        `${this.serviceUrl}/generate`,
        requestData,
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
      
      const responseData = response.data
      const totalTime = Date.now() - startTime
      
      logger.info(`[${requestId}] ✅ Gemini CLI 回應成功`, {
        processingTime: responseData.processingTime,
        totalTime: totalTime,
        cached: responseData.cached,
        contentLength: responseData.content.length
      })
      
      // 解析並建構 AIResponse
      return this.parseResponse(responseData.content, npcPersonality)
      
    } catch (error) {
      const totalTime = Date.now() - startTime
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          logger.error(`[${requestId}] Gemini 服務未運行，請執行: python3 backend/gemini_server.py`)
        } else if (error.code === 'ETIMEDOUT') {
          logger.error(`[${requestId}] Gemini 服務超時 (${totalTime}ms)`)
        } else {
          logger.error(`[${requestId}] Gemini 服務錯誤:`, error.message)
        }
      } else {
        logger.error(`[${requestId}] 未知錯誤:`, error)
      }
      
      // 返回備用回應
      return this.getFallbackResponse(npcPersonality, userMessage)
    }
  }
  
  /**
   * 解析回應文字為結構化資料
   */
  private parseResponse(content: string, npc: NPCPersonality): AIResponse {
    // 嘗試檢測是否有特殊標記來判斷重要性
    let importance = 0.5
    let emotionTag = 'neutral'
    
    // 簡單的情感分析
    if (content.includes('開心') || content.includes('快樂') || content.includes('太好了')) {
      emotionTag = 'happy'
      importance = 0.6
    } else if (content.includes('難過') || content.includes('傷心') || content.includes('抱歉')) {
      emotionTag = 'sad'
      importance = 0.7
    } else if (content.includes('擔心') || content.includes('緊張')) {
      emotionTag = 'worried'
      importance = 0.65
    } else if (content.includes('感謝') || content.includes('謝謝')) {
      emotionTag = 'grateful'
      importance = 0.7
    }
    
    // 判斷關係影響
    let trustChange = 0
    let affectionChange = 0
    
    if (content.length > 100) { // 長回應表示認真對待
      trustChange = 0.05
      affectionChange = 0.03
    }
    
    if (emotionTag === 'happy' || emotionTag === 'grateful') {
      affectionChange += 0.05
    }
    
    // 如果是重要對話，標記為需要儲存
    const shouldStore = importance > 0.65
    
    return {
      content: content.trim(),
      emotionTag,
      suggestedActions: [],
      memoryToStore: shouldStore ? {
        content: `${npc.name}: ${content.slice(0, 100)}`,
        importance,
        tags: [emotionTag, npc.id]
      } : undefined,
      relationshipImpact: {
        trustChange,
        affectionChange,
        levelChange: 0
      }
    }
  }
  
  /**
   * 備用回應
   */
  private getFallbackResponse(npc: NPCPersonality, userMessage: string): AIResponse {
    const fallbacks = {
      'npc-1': [
        '要不要坐下來喝杯咖啡慢慢聊？',
        '你看起來有什麼心事呢。',
        '這天氣真適合聊天呢。'
      ],
      'npc-2': [
        '哇！這真是太有趣了！',
        '我們一起去探索吧！',
        '你知道嗎，我最近發現了一個秘密地方！'
      ],
      'npc-3': [
        '月光照在湖面上，就像一首未完成的歌...',
        '有時候，沉默比言語更能表達情感。',
        '你聽過風吹過樹葉的聲音嗎？那是大自然的音樂。'
      ]
    }
    
    const npcFallbacks = fallbacks[npc.id] || ['嗯，讓我想想...', '這很有意思。', '原來如此。']
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
   * 清空服務端快取
   */
  async clearCache(): Promise<void> {
    try {
      await axios.post(`${this.serviceUrl}/clear-cache`)
      logger.info('✅ 服務端快取已清空')
    } catch (error) {
      logger.error('清空快取失敗:', error)
    }
  }
  
  /**
   * 獲取服務統計資料
   */
  async getStats(): Promise<any> {
    try {
      const response = await axios.get(`${this.serviceUrl}/stats`)
      return response.data
    } catch (error) {
      logger.error('獲取統計資料失敗:', error)
      return null
    }
  }
  
  /**
   * 簡單的生成回應（用於 NPC 間對話）
   */
  async generateResponse(prompt: string, npcId: string): Promise<string> {
    try {
      const npcNames = {
        'npc-1': '鋁配咻',
        'npc-2': '流羽岑',
        'npc-3': '沉停鞍'
      }
      
      const response = await this.generateNPCResponse(
        {
          id: npcId,
          name: npcNames[npcId] || 'NPC',
          personality: '',
          currentMood: 'neutral'
        },
        prompt,
        {
          sessionMessages: [],
          relationshipLevel: 5,
          trustLevel: 0.5,
          affectionLevel: 0.5
        }
      )
      
      return response.content
    } catch (error) {
      logger.error('簡單回應生成失敗:', error)
      return '嗯，我明白了。'
    }
  }
}

// 單例模式
export const geminiServiceOptimizedCLI = new GeminiServiceOptimizedCLI()