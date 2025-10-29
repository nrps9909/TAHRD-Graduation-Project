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

export class PromptGeneratorService {
  /**
   * 根據島嶼名稱生成建議內容
   * @param nameChinese 島嶼名稱
   * @param emoji 表情符號
   * @param userHint 使用者提供的描述提示（可選），例如：「我女朋友」、「工作相關」
   */
  async generateIslandPrompt(
    nameChinese: string,
    emoji: string = '🏝️',
    userHint?: string
  ): Promise<IslandPromptSuggestion> {
    try {
      logger.info(`[PromptGenerator] 生成島嶼提示詞: ${nameChinese} ${emoji}${userHint ? ` (使用者提示: ${userHint})` : ''}`)

      const prompt = `你是一個專業的知識管理助手，幫助用戶設計知識分類系統。

用戶想要創建一個島嶼（大類別）：
- 名稱：${nameChinese}
- 表情符號：${emoji}
${userHint ? `- 使用者補充說明：${userHint}` : ''}

請根據這個名稱${userHint ? '和使用者的補充說明' : ''}，生成適合的：
1. 描述（description）：簡短說明這個島嶼適合存放什麼類型的知識（1句話，15-30字）${userHint ? '，請結合使用者的補充說明來生成更精準的描述' : ''}
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
