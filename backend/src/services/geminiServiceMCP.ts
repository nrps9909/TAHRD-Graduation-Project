import { logger } from '../utils/logger'
import { geminiTracker } from '../utils/geminiTracker'
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
  recentMessages: Array<{
    speaker: 'user' | 'npc'
    content: string
    timestamp: Date
  }>
  relationshipLevel: number
  trustLevel: number
  affectionLevel: number
  userDiaryEntries?: string[]
}

interface AIResponse {
  content: string
  emotionTag: string
  suggestedActions: string[]
  memoryFlowerData?: {
    flowerType: string
    emotionColor: string
  }
  relationshipImpact: {
    trustChange: number
    affectionChange: number
    levelChange: number
  }
  moodChange?: string
}

/**
 * Gemini MCP Service - 使用 MCP 協議的高效能 NPC 對話服務
 */
export class GeminiMCPService {
  private mcpUrl: string
  private sessionId: string

  constructor() {
    this.mcpUrl = process.env.MCP_SERVICE_URL || 'http://localhost:8765'
    this.sessionId = uuidv4()
    this.initialize()
  }

  private async initialize() {
    try {
      // 檢查 MCP 服務狀態
      const response = await axios.get(`${this.mcpUrl}/status`)
      logger.info('🚀 MCP 服務連接成功:', response.data)
    } catch (error) {
      logger.error('MCP 服務連接失敗:', error)
      logger.warn('降級到備用模式')
    }
  }

  async generateNPCResponse(
    npcPersonality: NPCPersonality,
    userMessage: string,
    context: ConversationContext
  ): Promise<AIResponse> {
    // 開始追蹤
    const trackingId = geminiTracker.startTracking(
      npcPersonality.id,
      npcPersonality.name,
      userMessage,
      this.sessionId
    )

    // 記錄上下文
    geminiTracker.recordContext({
      mood: npcPersonality.currentMood,
      relationshipLevel: context.relationshipLevel,
      trustLevel: context.trustLevel,
      affectionLevel: context.affectionLevel
    })

    const startTime = Date.now()

    try {
      // 調用 MCP 服務（優化context傳遞）
      const response = await axios.post(`${this.mcpUrl}/generate`, {
        npc_id: npcPersonality.id,
        message: userMessage,
        context: {
          mood: npcPersonality.currentMood,
          relationship_level: context.relationshipLevel,
          trust_level: context.trustLevel,
          affection_level: context.affectionLevel,
          // 不傳遞 recent_messages 到 MCP，讓 MCP 使用自己的記憶系統
        },
        session_id: this.sessionId
      }, {
        timeout: 30000
      })

      const npcResponse = response.data.response
      const responseTime = Date.now() - startTime

      // 記錄回應
      geminiTracker.recordResponse(npcResponse, responseTime, false)

      // 解析情感並構建完整回應
      return this.buildAIResponse(npcResponse, npcPersonality, context)

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logger.error('MCP 生成錯誤:', error)
      geminiTracker.recordError(errorMsg)
      return this.getFallbackResponse(npcPersonality, userMessage)
    }
  }

  async generateResponse(prompt: string, npcId: string): Promise<string> {
    try {
      const response = await axios.post(`${this.mcpUrl}/generate`, {
        npc_id: npcId,
        message: prompt,
        session_id: `simple-${uuidv4()}`
      })
      
      return response.data.response
    } catch (error) {
      logger.error('MCP 簡單回應錯誤:', error)
      return '嗯，讓我想想...'
    }
  }

  private buildAIResponse(
    content: string,
    npc: NPCPersonality,
    context: ConversationContext
  ): AIResponse {
    // 基於內容分析情感
    const emotionTag = this.detectEmotion(content, npc.currentMood)
    
    // 計算關係影響
    const impact = this.calculateRelationshipImpact(content, context)
    
    return {
      content,
      emotionTag,
      suggestedActions: this.generateSuggestedActions(npc, context),
      memoryFlowerData: this.generateMemoryFlower(content, emotionTag),
      relationshipImpact: impact,
      moodChange: this.detectMoodChange(content, npc.currentMood)
    }
  }

  private detectEmotion(content: string, currentMood: string): string {
    // 基於內容檢測情緒
    const emotions = {
      開心: ['開心', '快樂', '高興', '興奮'],
      溫暖: ['溫暖', '關心', '在乎', '陪伴'],
      思考: ['想想', '思考', '考慮', '或許'],
      擔心: ['擔心', '焦慮', '緊張', '害怕'],
      平靜: ['平靜', '安靜', '寧靜', '放鬆']
    }

    for (const [emotion, keywords] of Object.entries(emotions)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        return emotion
      }
    }

    return currentMood || 'neutral'
  }

  private calculateRelationshipImpact(
    content: string,
    context: ConversationContext
  ): { trustChange: number; affectionChange: number; levelChange: number } {
    let trustChange = 0
    let affectionChange = 0

    // 正面詞彙增加好感
    const positiveWords = ['謝謝', '喜歡', '開心', '很好', '太棒了']
    const negativeWords = ['討厭', '不要', '無聊', '煩']

    positiveWords.forEach(word => {
      if (content.includes(word)) {
        trustChange += 0.05
        affectionChange += 0.05
      }
    })

    negativeWords.forEach(word => {
      if (content.includes(word)) {
        trustChange -= 0.02
        affectionChange -= 0.02
      }
    })

    // 關係等級變化（累積到一定程度才改變）
    const levelChange = (trustChange + affectionChange) > 0.2 ? 0.1 : 0

    return {
      trustChange: Math.max(-0.1, Math.min(0.1, trustChange)),
      affectionChange: Math.max(-0.1, Math.min(0.1, affectionChange)),
      levelChange
    }
  }

  private generateSuggestedActions(
    npc: NPCPersonality,
    context: ConversationContext
  ): string[] {
    const actions = []
    
    if (context.relationshipLevel < 3) {
      actions.push('多聊聊天增進了解')
    } else if (context.relationshipLevel < 7) {
      actions.push('分享更多個人故事')
    } else {
      actions.push('一起創造美好回憶')
    }

    return actions
  }

  private generateMemoryFlower(content: string, emotionTag: string): any {
    // 只在重要時刻生成記憶花朵
    const importantKeywords = ['永遠', '承諾', '約定', '重要', '特別']
    
    if (importantKeywords.some(keyword => content.includes(keyword))) {
      const flowerTypes: Record<string, string> = {
        溫暖: 'sunflower',
        開心: 'cherry_blossom',
        思考: 'lavender',
        平靜: 'lily'
      }

      const emotionColors: Record<string, string> = {
        溫暖: 'warm_yellow',
        開心: 'soft_pink',
        思考: 'gentle_purple',
        平靜: 'pure_white'
      }

      return {
        flowerType: flowerTypes[emotionTag] || 'wildflower',
        emotionColor: emotionColors[emotionTag] || 'soft_white'
      }
    }

    return undefined
  }

  private detectMoodChange(content: string, currentMood: string): string | undefined {
    // 檢測是否需要改變心情
    const moodIndicators = {
      cheerful: ['開心', '興奮', '太好了'],
      thoughtful: ['想想', '或許', '可能'],
      worried: ['擔心', '害怕', '不安'],
      calm: ['放鬆', '沒關係', '慢慢來']
    }

    for (const [mood, indicators] of Object.entries(moodIndicators)) {
      if (indicators.some(indicator => content.includes(indicator))) {
        if (mood !== currentMood) {
          return mood
        }
      }
    }

    return undefined
  }

  private getFallbackResponse(npc: NPCPersonality, userMessage: string): AIResponse {
    const fallbackMessages: Record<string, string> = {
      'npc-1': '讓我想想該怎麼說...',
      'npc-2': '哇，這個問題好有趣！',
      'npc-3': '這個問題很 chill 啊！'
    }

    return {
      content: fallbackMessages[npc.id] || '嗯，讓我想想...',
      emotionTag: 'thoughtful',
      suggestedActions: ['繼續對話'],
      relationshipImpact: {
        trustChange: 0,
        affectionChange: 0,
        levelChange: 0
      }
    }
  }

  async updateMemory(npcId: string, content: string, importance: number = 0.5) {
    try {
      await axios.post(`${this.mcpUrl}/memory/update`, {
        npc_id: npcId,
        memory_type: 'conversation',
        content,
        importance
      })
      logger.info(`更新 ${npcId} 記憶成功`)
    } catch (error) {
      logger.error('更新記憶失敗:', error)
    }
  }

  async clearCache() {
    try {
      await axios.post(`${this.mcpUrl}/cache/clear`)
      logger.info('快取已清空')
    } catch (error) {
      logger.error('清空快取失敗:', error)
    }
  }

  async getStatus() {
    try {
      const response = await axios.get(`${this.mcpUrl}/status`)
      return response.data
    } catch (error) {
      logger.error('獲取狀態失敗:', error)
      return null
    }
  }
}

export const geminiService = new GeminiMCPService()