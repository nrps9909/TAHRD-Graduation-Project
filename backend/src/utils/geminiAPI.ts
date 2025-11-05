/**
 * Gemini REST API 統一調用工具
 *
 * 用途：替代不穩定的 Gemini CLI，直接調用 REST API
 * 優勢：更快、更穩定、更可靠
 */

import axios from 'axios'
import { logger } from './logger'

export interface GeminiAPIConfig {
  model?: string
  temperature?: number
  maxOutputTokens?: number
  timeout?: number
  images?: GeminiImageData[]  // 支持多模態輸入（圖片）
}

export interface GeminiImageData {
  mimeType: string  // 例如: 'image/jpeg', 'image/png'
  data: string      // Base64 編碼的圖片數據
}

export interface GeminiAPIResponse {
  text: string
  tokensUsed?: number
}

/**
 * 調用 Gemini REST API 生成文本（支持多模態：文本+圖片）
 *
 * @param prompt 提示詞
 * @param config 配置選項（可包含圖片數據）
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
    timeout = 30000, // 增加默認超時時間到 30 秒
    images = []
  } = config

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured')
  }

  const startTime = Date.now()

  try {
    // 構建 parts 數組（文本 + 可選的圖片）
    const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [
      { text: prompt }
    ]

    // 添加圖片數據（如果有）
    if (images && images.length > 0) {
      images.forEach(image => {
        parts.push({
          inline_data: {
            mime_type: image.mimeType,
            data: image.data
          }
        })
      })
      logger.info(`[Gemini API] Calling ${model} with ${images.length} image(s)...`)
    } else {
      logger.info(`[Gemini API] Calling ${model}...`)
    }

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        contents: [{
          parts
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

    // 调试：打印完整响应
    logger.info(`[Gemini API] Response data: ${JSON.stringify(response.data, null, 2).substring(0, 500)}`)

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) {
      logger.error(`[Gemini API] Empty response structure:`, {
        hasCandidates: !!response.data?.candidates,
        candidatesLength: response.data?.candidates?.length,
        firstCandidate: response.data?.candidates?.[0]
      })
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

        // 安全地提取錯誤訊息
        let message = 'Unknown error'
        try {
          if (responseData && typeof responseData === 'object') {
            message = responseData.error?.message || responseData.message || error.message || 'Unknown error'
          } else if (error.message) {
            message = error.message
          }
        } catch (e) {
          message = String(error)
        }

        logger.error(`[Gemini API] HTTP ${status} after ${duration}ms: ${message}`)
        logger.error(`[Gemini API] Response data:`, responseData)

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
        logger.error(`[Gemini API] Network error after ${duration}ms: ${error.message || error}`)
        throw new Error(`網路錯誤: ${error.message || String(error)}`)
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

/**
 * 調用 Gemini REST API 生成文本（Streaming 模式，支持 SSE）
 *
 * @param prompt 提示詞
 * @param config 配置選項
 * @returns AsyncGenerator 用於流式接收文本片段
 */
export async function* callGeminiAPIStream(
  prompt: string,
  config: GeminiAPIConfig = {}
): AsyncGenerator<string, void, unknown> {
  const {
    model = 'gemini-2.5-flash',
    temperature = 0.7,
    maxOutputTokens = 4096,
    timeout = 60000, // streaming 模式需要更長的超時時間
    images = []
  } = config

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured')
  }

  const startTime = Date.now()

  try {
    // 構建 parts 數組（文本 + 可選的圖片）
    const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [
      { text: prompt }
    ]

    // 添加圖片數據（如果有）
    if (images && images.length > 0) {
      images.forEach(image => {
        parts.push({
          inline_data: {
            mime_type: image.mimeType,
            data: image.data
          }
        })
      })
      logger.info(`[Gemini Stream] Calling ${model} with ${images.length} image(s)...`)
    } else {
      logger.info(`[Gemini Stream] Calling ${model}...`)
    }

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`,
      {
        contents: [{
          parts
        }],
        generationConfig: {
          temperature,
          maxOutputTokens,
        }
      },
      {
        timeout,
        responseType: 'stream',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    // 解析 SSE 流
    let buffer = ''

    for await (const chunk of response.data) {
      buffer += chunk.toString()
      const lines = buffer.split('\n')

      // 保留最後一行（可能不完整）
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim() // 移除 "data: "

          if (jsonStr === '[DONE]') {
            const duration = Date.now() - startTime
            logger.info(`[Gemini Stream] Stream completed in ${duration}ms`)
            return
          }

          try {
            const data = JSON.parse(jsonStr)
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
            if (text) {
              yield text
            }
          } catch (e) {
            // 忽略非 JSON 行或不完整的 JSON
          }
        }
      }
    }

    const duration = Date.now() - startTime
    logger.info(`[Gemini Stream] Stream completed in ${duration}ms`)

  } catch (error: any) {
    const duration = Date.now() - startTime

    if (axios.isAxiosError(error)) {
      if (error.response) {
        const status = error.response.status
        const message = error.response.data?.error?.message || error.message || 'Unknown error'

        logger.error(`[Gemini Stream] HTTP ${status} after ${duration}ms: ${message}`)

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
        logger.error(`[Gemini Stream] Timeout after ${duration}ms`)
        throw new Error(`API 調用超時（${timeout}ms）`)
      } else {
        logger.error(`[Gemini Stream] Network error after ${duration}ms: ${error.message}`)
        throw new Error(`網路錯誤: ${error.message}`)
      }
    }

    logger.error(`[Gemini Stream] Unknown error after ${duration}ms:`, error)
    throw new Error('Gemini API Streaming 調用失敗')
  }
}
