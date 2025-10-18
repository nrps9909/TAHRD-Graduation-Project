/**
 * Tororo (白噗噗) AI Resolvers
 *
 * 使用 Gemini REST API 生成白噗噗的回應
 */

import { logger } from '../utils/logger'
import { callGeminiAPI } from '../utils/geminiAPI'

export const tororoResolvers = {
  Mutation: {
    /**
     * 生成白噗噗的 AI 回應
     */
    generateTororoResponse: async (_: any, { prompt }: { prompt: string }) => {
      try {
        logger.info('[Tororo] 開始生成回應')

        // 使用 Gemini REST API 調用 Gemini 2.5 Flash
        const response = await callGeminiWithRetry(prompt)

        logger.info('[Tororo] 回應生成成功')

        return {
          response,
          success: true
        }
      } catch (error) {
        logger.error('[Tororo] 生成回應失敗:', error)

        // 返回備用回應
        return {
          response: '喵～我稍微有點累了，讓我休息一下再回應你好嗎？💕',
          success: false
        }
      }
    }
  }
}

/**
 * 使用 Gemini REST API 調用 AI（帶重試機制）
 */
async function callGeminiWithRetry(prompt: string): Promise<string> {
  const model = 'gemini-2.5-flash'
  const maxRetries = 3
  const retryDelays = [2000, 5000, 10000] // 2s, 5s, 10s

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      logger.info(`[Tororo] 調用 Gemini REST API (嘗試 ${attempt + 1}/${maxRetries})`)

      const result = await callGeminiAPI(prompt, {
        model,
        temperature: 0.7,
        maxOutputTokens: 2048,
        timeout: 20000
      })

      if (!result || result.trim().length === 0) {
        throw new Error('Empty response from Gemini API')
      }

      logger.info(`[Tororo] Gemini REST API 回應成功 (${result.length} chars)`)
      return result

    } catch (error: any) {
      const isRateLimitError =
        error.message?.includes('429') ||
        error.message?.includes('RATE_LIMIT') ||
        error.message?.includes('quota') ||
        error.message?.includes('rate limit') ||
        error.message?.includes('API 配額已用盡')

      logger.error(`[Tororo] Gemini REST API 錯誤 (嘗試 ${attempt + 1}):`, error.message)

      // 如果不是速率限制錯誤或已達最大重試次數，拋出錯誤
      if (!isRateLimitError || attempt >= maxRetries - 1) {
        logger.error('[Tororo] 達到最大重試次數或非速率限制錯誤')
        throw new Error('生成回應失敗')
      }

      // 速率限制錯誤，等待後重試
      const delay = retryDelays[attempt] || 10000
      logger.info(`[Tororo] 速率限制，等待 ${delay/1000}秒後重試...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw new Error('生成回應失敗（所有重試都失敗）')
}
