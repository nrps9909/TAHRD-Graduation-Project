import { logger } from '../utils/logger'

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
 * Gemini Service - 統一使用 MCP 優化模式
 */
export class GeminiService {
  private mcpService: any

  constructor() {
    // 統一使用 MCP 模式
    const { GeminiMCPService } = require('./geminiServiceMCP')
    this.mcpService = new GeminiMCPService()
    logger.info('🚀 使用 MCP (Model Context Protocol) 優化模式')
  }

  async generateNPCResponse(
    npcPersonality: NPCPersonality,
    userMessage: string,
    context: ConversationContext
  ): Promise<AIResponse> {
    // 直接使用 MCP 服務
    return await this.mcpService.generateNPCResponse(npcPersonality, userMessage, context)
  }

  async generateResponse(prompt: string, npcId: string): Promise<string> {
    // 使用 MCP 服務生成簡單回應
    return await this.mcpService.generateResponse(prompt, npcId)
  }

  async generateMemoryFlowerDescription(
    conversationContent: string,
    emotionTag: string
  ): Promise<{
    flowerType: string
    emotionColor: string
    description: string
  }> {
    // 使用 MCP 生成記憶花朵描述
    const prompt = `為以下對話生成一朵記憶花朵：
內容：${conversationContent}
情緒：${emotionTag}
請描述花朵類型、顏色和含義。`

    const response = await this.generateResponse(prompt, 'system')
    
    // 簡單解析回應
    return {
      flowerType: 'wildflower',
      emotionColor: 'soft_white',
      description: response || '一段珍貴的對話記憶'
    }
  }

  async generateNPCLetter(
    npc: NPCPersonality,
    relationshipLevel: number,
    recentEvents: string[]
  ): Promise<{
    subject: string
    content: string
  }> {
    const prompt = `以${npc.name}的身份寫一封信給玩家。
關係等級：${relationshipLevel}/10
最近事件：${recentEvents.join(', ')}
請寫一封溫暖真誠的信。`

    const content = await this.generateResponse(prompt, npc.id)
    
    return {
      subject: '來自小鎮的問候',
      content: content || '希望你一切都好。小鎮依然溫暖如昔，期待下次見面。'
    }
  }

  async generateNPCToNPCConversation(prompt: string): Promise<string> {
    // 使用 MCP 生成 NPC 之間的對話
    return await this.generateResponse(prompt, 'npc-conversation')
  }

  // 公開方法供其他模組使用
  async updateMemory(npcId: string, content: string, importance: number = 0.5) {
    await this.mcpService.updateMemory(npcId, content, importance)
  }

  async clearCache() {
    await this.mcpService.clearCache()
  }

  async getServiceStatus() {
    return await this.mcpService.getStatus()
  }
}

export const geminiService = new GeminiService()