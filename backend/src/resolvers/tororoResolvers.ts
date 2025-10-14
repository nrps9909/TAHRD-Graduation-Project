/**
 * Tororo (白噗噗) AI Resolvers
 *
 * 使用 Gemini CLI 生成白噗噗的回應
 */

import { logger } from '../utils/logger'
import { spawn } from 'child_process'

export const tororoResolvers = {
  Mutation: {
    /**
     * 生成白噗噗的 AI 回應
     */
    generateTororoResponse: async (_: any, { prompt }: { prompt: string }) => {
      try {
        logger.info('[Tororo] 開始生成回應')

        // 使用 Gemini CLI 調用 Gemini 2.5 Flash
        const response = await callGeminiCLI(prompt)

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
 * 使用 Gemini CLI 調用 AI
 */
async function callGeminiCLI(prompt: string): Promise<string> {
  const model = 'gemini-2.5-flash'
  const maxRetries = 3
  const retryDelays = [2000, 5000, 10000] // 2s, 5s, 10s

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      logger.info(`[Tororo] 調用 Gemini CLI (嘗試 ${attempt + 1}/${maxRetries})`)

      // 使用 spawn + stdin（正確方式）
      const result = await new Promise<string>((resolve, reject) => {
        const gemini = spawn('gemini', ['-m', model], {
          env: {
            ...process.env,
            GEMINI_API_KEY: process.env.GEMINI_API_KEY
          }
        })

        let stdout = ''
        let stderr = ''
        let timeoutId: NodeJS.Timeout

        gemini.stdout.on('data', (data: Buffer) => {
          stdout += data.toString()
        })

        gemini.stderr.on('data', (data: Buffer) => {
          stderr += data.toString()
        })

        gemini.on('close', (code: number) => {
          clearTimeout(timeoutId)
          if (code === 0) {
            const response = stdout.trim()
            if (!response) {
              reject(new Error('Empty response from Gemini CLI'))
              return
            }
            logger.info(`[Tororo] Gemini CLI 回應成功 (${response.length} chars)`)
            resolve(response)
          } else {
            if (stderr) {
              logger.warn('[Tororo] Gemini CLI stderr:', stderr)
              // 檢查是否為速率限制錯誤
              if (stderr.includes('429') || stderr.includes('quota') || stderr.includes('rate limit')) {
                reject(new Error('RATE_LIMIT'))
                return
              }
            }
            reject(new Error(`Gemini CLI exited with code ${code}: ${stderr}`))
          }
        })

        gemini.on('error', (err: Error) => {
          clearTimeout(timeoutId)
          reject(err)
        })

        // 設置超時（60秒）
        timeoutId = setTimeout(() => {
          gemini.kill()
          reject(new Error('Gemini CLI timeout'))
        }, 60000)

        // 將 prompt 寫入 stdin
        gemini.stdin.write(prompt)
        gemini.stdin.end()
      })

      return result

    } catch (error: any) {
      const isRateLimitError =
        error.message?.includes('429') ||
        error.message?.includes('RATE_LIMIT') ||
        error.message?.includes('quota') ||
        error.message?.includes('rate limit')

      logger.error(`[Tororo] Gemini CLI 錯誤 (嘗試 ${attempt + 1}):`, error.message)

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
