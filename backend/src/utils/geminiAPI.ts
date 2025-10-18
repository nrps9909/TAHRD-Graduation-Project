/**
 * Gemini REST API 統一調用工具
 *
 * 用途：替代不穩定的 Gemini CLI，直接調用 REST API
 * 優勢：更快、更穩定、更可靠
 */

import axios from 'axios'
import logger from './logger'

export interface GeminiAPIConfig {
  model?: string
  temperature?: number
  maxOutputTokens?: number
  timeout?: number
}

export interface GeminiAPIResponse {
  text: string
  tokensUsed?: number
}

/**
 * 調用 Gemini REST API 生成文本
 *
 * @param prompt 提示詞
 * @param config 配置選項
 * @returns 生成的文本
 */
export async function callGeminiAPI(
  prompt: string,
  config: GeminiAPIConfig = {}
): Promise<string> {
  const {
    model = 'gemini-2.5-flash',
    temperature = 0.7,
    maxOutputTokens = 2048,
    timeout = 15000
  } = config

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured')
  }

  const startTime = Date.now()

  try {
    logger.info(`[Gemini API] Calling ${model}...`)

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature,
          maxOutputTokens,
        }
      },
      {
        timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) {
      throw new Error('Empty response from Gemini API')
    }

    const duration = Date.now() - startTime
    logger.info(`[Gemini API] Response received in ${duration}ms (${text.length} chars)`)

    return text.trim()

  } catch (error: any) {
    const duration = Date.now() - startTime

    if (axios.isAxiosError(error)) {
      // 處理 HTTP 錯誤
      if (error.response) {
        const status = error.response.status
        const responseData = error.response.data
        const message = (responseData && typeof responseData === 'object' && responseData.error?.message)
          || error.message
          || 'Unknown error'

        logger.error(`[Gemini API] HTTP ${status} after ${duration}ms: ${message}`)

        // 處理特定錯誤
        if (status === 429) {
          throw new Error('API 配額已用盡，請稍後再試')
        } else if (status === 400) {
          throw new Error(`請求格式錯誤: ${message}`)
        } else if (status === 403) {
          throw new Error('API Key 無效或權限不足')
        } else {
          throw new Error(`Gemini API 錯誤 (${status}): ${message}`)
        }
      } else if (error.code === 'ECONNABORTED') {
        logger.error(`[Gemini API] Timeout after ${duration}ms`)
        throw new Error(`API 調用超時（${timeout}ms）`)
      } else {
        logger.error(`[Gemini API] Network error after ${duration}ms: ${error.message}`)
        throw new Error(`網路錯誤: ${error.message}`)
      }
    }

    logger.error(`[Gemini API] Unknown error after ${duration}ms:`, error)
    throw new Error('Gemini API 調用失敗')
  }
}

/**
 * 調用 Gemini Embeddings API 生成向量
 *
 * @param text 要嵌入的文本
 * @param model 模型名稱
 * @returns 向量數組
 */
export async function callGeminiEmbedding(
  text: string,
  model: string = 'text-embedding-004'
): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured')
  }

  const startTime = Date.now()

  try {
    logger.info(`[Gemini Embedding] Calling ${model}...`)

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`,
      {
        model: `models/${model}`,
        content: {
          parts: [{ text }]
        }
      },
      {
        timeout: 10000, // 10 秒超時
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    const embedding = response.data?.embedding?.values

    if (!embedding || !Array.isArray(embedding)) {
      throw new Error('Invalid embedding response from Gemini API')
    }

    const duration = Date.now() - startTime
    logger.info(`[Gemini Embedding] Response received in ${duration}ms (${embedding.length} dimensions)`)

    return embedding

  } catch (error: any) {
    const duration = Date.now() - startTime
    logger.error(`[Gemini Embedding] Error after ${duration}ms:`, error.message)

    throw new Error(`向量生成失敗: ${error.message}`)
  }
}

/**
 * 批量調用 Gemini API（帶並發控制）
 *
 * @param prompts 提示詞數組
 * @param config 配置選項
 * @param concurrency 並發數量
 * @returns 生成的文本數組
 */
export async function callGeminiAPIBatch(
  prompts: string[],
  config: GeminiAPIConfig = {},
  concurrency: number = 3
): Promise<string[]> {
  const results: string[] = []
  const errors: string[] = []

  for (let i = 0; i < prompts.length; i += concurrency) {
    const batch = prompts.slice(i, i + concurrency)

    const batchResults = await Promise.allSettled(
      batch.map(prompt => callGeminiAPI(prompt, config))
    )

    batchResults.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        results.push(result.value)
      } else {
        logger.error(`[Gemini API Batch] Prompt ${i + idx} failed:`, result.reason)
        results.push('') // 失敗時推入空字符串
        errors.push(result.reason.message || 'Unknown error')
      }
    })
  }

  if (errors.length > 0) {
    logger.warn(`[Gemini API Batch] ${errors.length}/${prompts.length} requests failed`)
  }

  return results
}
