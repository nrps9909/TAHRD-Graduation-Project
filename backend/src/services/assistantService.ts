import { PrismaClient, AssistantType } from '@prisma/client'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

/**
 * AssistantService - 管理 8 個助手的服務
 */
export class AssistantService {
  // 快取所有助手（啟動時載入）
  private assistantsCache: Map<string, any> = new Map()
  private assistantsByType: Map<AssistantType, any> = new Map()

  constructor() {
    this.loadAssistants()
  }

  /**
   * 載入所有助手到快取
   */
  async loadAssistants() {
    try {
      const assistants = await prisma.assistant.findMany({
        where: { isActive: true }
      })

      this.assistantsCache.clear()
      this.assistantsByType.clear()

      assistants.forEach(assistant => {
        this.assistantsCache.set(assistant.id, assistant)
        this.assistantsByType.set(assistant.type, assistant)
      })

      logger.info(`Loaded ${assistants.length} assistants into cache`)
    } catch (error) {
      logger.error('Failed to load assistants:', error)
    }
  }

  /**
   * 獲取所有助手
   */
  async getAllAssistants() {
    if (this.assistantsCache.size === 0) {
      await this.loadAssistants()
    }

    return Array.from(this.assistantsCache.values())
  }

  /**
   * 根據 ID 獲取助手
   */
  async getAssistantById(id: string) {
    if (this.assistantsCache.size === 0) {
      await this.loadAssistants()
    }

    return this.assistantsCache.get(id) || null
  }

  /**
   * 根據類型獲取助手
   */
  async getAssistantByType(type: AssistantType) {
    if (this.assistantsByType.size === 0) {
      await this.loadAssistants()
    }

    return this.assistantsByType.get(type) || null
  }

  /**
   * 獲取 Chief 助手
   */
  async getChiefAssistant() {
    return this.getAssistantByType(AssistantType.CHIEF)
  }

  /**
   * 更新助手統計
   */
  async incrementAssistantStats(assistantId: string, type: 'memory' | 'chat') {
    try {
      await prisma.assistant.update({
        where: { id: assistantId },
        data: {
          totalMemories: type === 'memory' ? { increment: 1 } : undefined,
          totalChats: type === 'chat' ? { increment: 1 } : undefined
        }
      })
    } catch (error) {
      logger.error(`Failed to update assistant stats for ${assistantId}:`, error)
    }
  }

  /**
   * 根據內容關鍵字推測分類（降級方案）
   */
  fallbackCategoryDetection(content: string): AssistantType {
    const lowerContent = content.toLowerCase()

    const patterns: Record<AssistantType, string[]> = {
      [AssistantType.CHIEF]: [],
      [AssistantType.LEARNING]: ['學習', '課程', '作業', '考試', '筆記', '讀書', '複習', '知識', '理解'],
      [AssistantType.INSPIRATION]: ['想法', '靈感', '創意', '設計', '點子', '腦力激盪'],
      [AssistantType.WORK]: ['工作', '任務', '專案', '會議', '職涯', '公司', '主管', '同事'],
      [AssistantType.SOCIAL]: ['朋友', '聚會', '約', '同學', '八卦', '聽說', '據說'],
      [AssistantType.LIFE]: ['今天', '吃', '睡', '起床', '日常', '心情', '感覺'],
      [AssistantType.GOALS]: ['目標', '夢想', '希望', '計劃', '打算', '想要', '未來'],
      [AssistantType.RESOURCES]: ['文章', '連結', 'http', 'www', '影片', '書', '參考'],
      [AssistantType.MISC]: ['雜項', '其他', '待整理', '未分類', '隨記', '雜念']
    }

    // 計算每個類別的匹配分數
    const scores: Record<string, number> = {}

    Object.entries(patterns).forEach(([type, keywords]) => {
      const matchCount = keywords.filter(keyword =>
        lowerContent.includes(keyword)
      ).length

      if (matchCount > 0) {
        scores[type] = matchCount
      }
    })

    // 返回得分最高的類別
    const bestMatch = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]

    if (bestMatch) {
      return bestMatch[0] as AssistantType
    }

    // 預設返回 LIFE（生活記錄）
    return AssistantType.LIFE
  }
}

export const assistantService = new AssistantService()
