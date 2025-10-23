/**
 * AI Prompt Generator Service
 *
 * 使用 Gemini 2.5 Flash 根據島嶼/小類別名稱自動生成：
 * - 描述（description）
 * - 關鍵字（keywords）
 * - 系統提示詞（systemPrompt）
 * - 個性設定（personality）
 * - 對話風格（chatStyle）
 */

import { callGeminiAPI } from '../utils/geminiAPI'
import { logger } from '../utils/logger'

export interface IslandPromptSuggestion {
  description: string
  keywords: string[]
}

export interface SubcategoryPromptSuggestion {
  description: string
  keywords: string[]
  systemPrompt: string
  personality: string
  chatStyle: string
}

export class PromptGeneratorService {
  /**
   * 根據島嶼名稱生成建議內容
   */
  async generateIslandPrompt(
    nameChinese: string,
    emoji: string = '🏝️'
  ): Promise<IslandPromptSuggestion> {
    try {
      logger.info(`[PromptGenerator] 生成島嶼提示詞: ${nameChinese} ${emoji}`)

      const prompt = `你是一個專業的知識管理助手，幫助用戶設計知識分類系統。

用戶想要創建一個島嶼（大類別）：
- 名稱：${nameChinese}
- 表情符號：${emoji}

請根據這個名稱，生成適合的：
1. 描述（description）：簡短說明這個島嶼適合存放什麼類型的知識（1句話，15-30字）
2. 關鍵字（keywords）：5-8個相關關鍵字，用於自動分類知識

📋 範例：
如果島嶼名稱是「學習成長島」：
- 描述：存放學習筆記、課程心得、技術知識和成長記錄
- 關鍵字：['學習', '筆記', '課程', '技術', '成長', '知識', '教育', '研究']

🎯 回應格式（必須是有效的 JSON）：
{
  "description": "簡短描述這個島嶼的用途",
  "keywords": ["關鍵字1", "關鍵字2", "..."]
}

請直接回傳 JSON，不要其他文字：`

      const response = await callGeminiAPI(prompt, {
        model: 'gemini-2.0-flash-exp',
        temperature: 0.7, // 創意生成使用較高溫度
        maxOutputTokens: 512,
        timeout: 10000
      })

      const result = this.parseJSON(response)

      logger.info(`[PromptGenerator] 島嶼提示詞生成成功: ${nameChinese}`)
      return result

    } catch (error: any) {
      logger.error(`[PromptGenerator] 生成島嶼提示詞失敗:`, error)

      // 返回預設值
      return {
        description: `${nameChinese}相關的知識和記錄`,
        keywords: [nameChinese, '筆記', '記錄', '知識']
      }
    }
  }

  /**
   * 根據小類別名稱生成建議內容
   */
  async generateSubcategoryPrompt(
    nameChinese: string,
    emoji: string = '📚',
    islandName?: string
  ): Promise<SubcategoryPromptSuggestion> {
    try {
      logger.info(`[PromptGenerator] 生成小類別提示詞: ${nameChinese} ${emoji}`)

      const islandContext = islandName ? `\n- 所屬島嶼：${islandName}` : ''

      const prompt = `你是一個專業的 AI 助手設計師，幫助用戶設計知識分類的 AI 助手。

用戶想要創建一個小類別（SubAgent）：
- 名稱：${nameChinese}
- 表情符號：${emoji}${islandContext}

請根據這個名稱，生成適合的：
1. 描述（description）：簡短說明這個類別適合存放什麼知識（1句話，15-30字）
2. 關鍵字（keywords）：5-8個相關關鍵字，用於自動分類
3. 系統提示詞（systemPrompt）：AI 助手的角色定位和職責（50-100字）
4. 個性設定（personality）：AI 的性格特點（20-40字）
5. 對話風格（chatStyle）：如何與用戶互動（20-40字）

📋 範例：
如果小類別名稱是「技術學習」：
- description: "程式設計、框架學習、技術文章和開發筆記"
- keywords: ["技術", "程式", "開發", "coding", "學習", "框架", "教學", "文檔"]
- systemPrompt: "我是你的技術學習助手，專門幫助你整理程式設計筆記、技術文章和開發經驗。我會用清晰的方式組織技術知識，並提供相關的學習建議。"
- personality: "專業、耐心、樂於分享，善於將複雜概念簡化說明"
- chatStyle: "使用技術術語但確保易懂，常提供程式碼範例和實用建議"

🎯 回應格式（必須是有效的 JSON）：
{
  "description": "簡短描述",
  "keywords": ["關鍵字1", "關鍵字2", "..."],
  "systemPrompt": "系統提示詞",
  "personality": "個性描述",
  "chatStyle": "對話風格"
}

請直接回傳 JSON，不要其他文字：`

      const response = await callGeminiAPI(prompt, {
        model: 'gemini-2.0-flash-exp',
        temperature: 0.7,
        maxOutputTokens: 1024,
        timeout: 15000
      })

      const result = this.parseJSON(response)

      logger.info(`[PromptGenerator] 小類別提示詞生成成功: ${nameChinese}`)
      return result

    } catch (error: any) {
      logger.error(`[PromptGenerator] 生成小類別提示詞失敗:`, error)

      // 返回預設值
      return {
        description: `${nameChinese}相關的知識和記錄`,
        keywords: [nameChinese, '筆記', '記錄'],
        systemPrompt: `我是你的${nameChinese}助手，專門幫助你整理和管理${nameChinese}相關的知識。`,
        personality: '友善、專業、樂於助人',
        chatStyle: '清晰明瞭，提供實用建議'
      }
    }
  }

  /**
   * 解析 JSON 回應
   */
  private parseJSON(response: string): any {
    try {
      // 移除可能的 markdown 標記
      let cleaned = response.trim()

      // 移除 ```json 和 ``` 標記
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.substring(7)
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.substring(3)
      }

      if (cleaned.endsWith('```')) {
        cleaned = cleaned.substring(0, cleaned.length - 3)
      }

      cleaned = cleaned.trim()

      return JSON.parse(cleaned)
    } catch (error) {
      logger.error('[PromptGenerator] JSON 解析失敗:', error)
      throw new Error('無法解析 AI 回應')
    }
  }
}

export const promptGeneratorService = new PromptGeneratorService()
