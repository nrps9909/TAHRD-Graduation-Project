/**
 * TororoService - 知識園丁服務
 * 負責創建和種植記憶花
 */

import { PrismaClient, AssistantType } from '@prisma/client'
import { logger } from '../utils/logger'
import { chiefAgentService } from './chiefAgentService'
import { assistantService } from './assistantService'
import { TORORO_SYSTEM_PROMPT } from '../agents/tororo/systemPrompt'

const prisma = new PrismaClient()

export interface TororoCreateInput {
  userId: string
  content: string
  files?: Array<{
    url: string
    name: string
    type: string
  }>
  links?: Array<{
    url: string
    title?: string
  }>
}

export interface TororoResponse {
  success: boolean
  memory?: {
    id: string
    title: string
    emoji: string
    category: string
    importance: number
    summary: string
  }
  warmMessage: string // 貓咪的溫暖稱讚
  recordSummary: string // 記錄了什麼內容
  greeting?: string // 已棄用，保留向後兼容
  suggestion?: string // 已棄用，保留向後兼容
  encouragement?: string // 已棄用，保留向後兼容
  flower?: {
    id: string
    type: string
    size: number
    position: {
      x: number
      y: number
      z: number
    }
  }
  error?: string
}

/**
 * Tororo 知識園丁服務
 */
class TororoService {
  private mcpUrl: string

  constructor() {
    this.mcpUrl = process.env.MCP_SERVICE_URL || 'http://localhost:8765'
  }

  /**
   * 使用 Tororo 創建記憶
   * 整合現有的 chief-subagent 架構
   * @deprecated This function is broken due to processAndCreateMemory being deprecated.
   * Use the streaming knowledge distribution API instead.
   */
  async createMemoryWithTororo(input: TororoCreateInput): Promise<TororoResponse> {
    throw new Error('createMemoryWithTororo is deprecated. Please use the streaming knowledge distribution API instead.')
    /* COMMENTED OUT - BROKEN DUE TO MIGRATION

    try {
      logger.info(`Tororo creating memory for user ${input.userId}`)

      // 1. 使用 Tororo 的系統提示詞調用 Gemini
      const tororoPrompt = this.buildTororoPrompt(input.content)
      const tororoAnalysis = await this.callGemini(tororoPrompt)

      // 2. 使用 chief-subagent 的分類功能
      const classification = await chiefAgentService.classifyContent(input.content)

      // 3. 獲取對應的助手
      const assistant = await assistantService.getAssistantByType(classification.suggestedCategory)

      if (!assistant) {
        throw new Error('無法找到對應的助手')
      }

      // 4. 使用現有的 processAndCreateMemory 創建記憶
      const result = await chiefAgentService.processAndCreateMemory(
        input.userId,
        assistant.id,
        input.content,
        classification.suggestedCategory
      )

      // 5. 生成記憶花資訊
      const flower = this.generateFlowerInfo(result.memory)

      // 6. 組合 Tororo 風格的回應
      return {
        success: true,
        memory: {
          id: result.memory.id,
          title: result.memory.title || tororoAnalysis.analysis?.title || '記憶',
          emoji: result.memory.emoji || tororoAnalysis.analysis?.emoji || '🌸',
          category: result.memory.category,
          importance: result.memory.isPinned ? 8 : 5,
          summary: result.memory.summary || ''
        },
        warmMessage: tororoAnalysis.warmMessage || '你願意記錄知識真好～每個想法都很珍貴呢～',
        recordSummary: tororoAnalysis.recordSummary || `記錄了你的想法，由${this.getCategoryName(classification.suggestedCategory)}來處理喔！`,
        greeting: '', // 已棄用
        suggestion: '', // 已棄用
        encouragement: '', // 已棄用
        flower
      }
    } catch (error) {
      logger.error('Tororo failed to create memory:', error)
      return {
        success: false,
        warmMessage: '抱歉，記錄的時候遇到了一點問題...',
        recordSummary: '處理失敗',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
    */
  }

  /**
   * 建立 Tororo 的 prompt
   */
  private buildTororoPrompt(content: string): string {
    return `${TORORO_SYSTEM_PROMPT}

用戶分享了以下內容：
"${content}"

請分析並回應（以 JSON 格式）。`
  }

  /**
   * 調用 Gemini API
   */
  private async callGemini(prompt: string): Promise<any> {
    try {
      const response = await fetch(`${this.mcpUrl}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model: 'gemini-2.5-flash',
          temperature: 0.8
        })
      })

      if (!response.ok) {
        throw new Error(`MCP service error: ${response.statusText}`)
      }

      const data = await response.json() as any
      return this.parseJSON(data.response || data.text || '{}')
    } catch (error) {
      logger.error('Gemini API call failed:', error)
      // 返回默認回應
      return {
        greeting: '喵～',
        analysis: {
          category: 'LIFE',
          importance: 5,
          tags: [],
          title: '記憶',
          emoji: '🌸',
          summary: '一個特別的記憶',
          keyPoints: [],
          sentiment: 'neutral'
        },
        suggestion: '讓我幫你記下這個想法～',
        encouragement: '每個想法都很珍貴！'
      }
    }
  }

  /**
   * 解析 JSON
   */
  private parseJSON(text: string): any {
    try {
      // 移除 markdown code block
      let cleaned = text.trim()
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '')
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/```\n?/g, '')
      }

      return JSON.parse(cleaned)
    } catch (error) {
      logger.error('JSON parse error:', error)
      return {}
    }
  }

  /**
   * 生成記憶花資訊
   */
  private generateFlowerInfo(memory: any) {
    const region = this.getRegionPosition(memory.category)

    // 根據是否釘選計算大小
    const baseSize = 1.0
    const sizeMultiplier = memory.isPinned ? 1.5 : 1.0

    return {
      id: `flower_${memory.id}`,
      type: this.getFlowerType(memory.category),
      size: baseSize * sizeMultiplier,
      position: {
        x: region.x + (Math.random() - 0.5) * 10,
        y: region.y,
        z: region.z + (Math.random() - 0.5) * 10
      }
    }
  }

  /**
   * 獲取區域位置
   */
  private getRegionPosition(category: AssistantType) {
    const positions: Record<AssistantType, { x: number; y: number; z: number }> = {
      LEARNING: { x: 0, y: 5, z: -20 },
      INSPIRATION: { x: -15, y: 2, z: -10 },
      GOALS: { x: 15, y: 6, z: -10 },
      WORK: { x: 18, y: 0, z: 5 },
      SOCIAL: { x: -18, y: 0, z: 5 },
      LIFE: { x: 0, y: 1, z: 15 },
      RESOURCES: { x: -10, y: 1, z: 12 },
      CHIEF: { x: 0, y: 2, z: 0 },
      MISC: { x: 10, y: 1, z: 12 }
    }
    return positions[category] || positions.LIFE
  }

  /**
   * 獲取花朵類型
   */
  private getFlowerType(category: AssistantType): string {
    const types: Record<AssistantType, string> = {
      LEARNING: '櫻花',
      INSPIRATION: '星光花',
      GOALS: '火焰花',
      WORK: '齒輪花',
      SOCIAL: '熱帶花',
      LIFE: '向日葵',
      RESOURCES: '水晶花',
      CHIEF: '皇冠花',
      MISC: '雜草花'
    }
    return types[category] || '花朵'
  }

  /**
   * 獲取分類名稱
   */
  private getCategoryName(category: AssistantType): string {
    const names: Record<AssistantType, string> = {
      LEARNING: '學習高地',
      INSPIRATION: '靈感森林',
      GOALS: '目標峰頂',
      WORK: '工作碼頭',
      SOCIAL: '社交海灘',
      LIFE: '生活花園',
      RESOURCES: '資源倉庫',
      CHIEF: '中央廣場',
      MISC: '雜物間'
    }
    return names[category] || '知識島'
  }
}

export const tororoService = new TororoService()
