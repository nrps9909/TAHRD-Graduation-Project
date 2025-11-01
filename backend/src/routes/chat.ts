/**
 * Chat SSE Routes - 實現打字機效果
 */

import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { chiefAgentService } from '../services/chiefAgentService'
import { logger } from '../utils/logger'
import { verifyToken } from '../utils/auth'

const router = Router()
const prisma = new PrismaClient()

/**
 * SSE 聊天端點 - 實現打字機效果
 * GET /api/chat/stream
 */
router.get('/stream', async (req: Request, res: Response) => {
  // 設置 SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // 禁用 Nginx 緩衝

  try {
    // 從查詢參數獲取資訊
    const { message, assistantId, token } = req.query

    if (!message || !assistantId || !token) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: '缺少必要參數' })}\n\n`)
      res.end()
      return
    }

    // 驗證 token
    let userId: string
    try {
      const decoded = verifyToken(token as string)
      userId = decoded.userId
    } catch (error) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: '未授權' })}\n\n`)
      res.end()
      return
    }

    logger.info(`[SSE Chat] Deprecated endpoint called for user ${userId}, assistantId: ${assistantId}`)

    // DEPRECATED: This endpoint is no longer supported - use island-based chat instead
    res.write(`event: error\ndata: ${JSON.stringify({ error: 'This chat endpoint is deprecated. Please use island-based chat.' })}\n\n`)

  } catch (error: any) {
    logger.error(`[SSE Chat] Unexpected error:`, error)
    res.write(`event: error\ndata: ${JSON.stringify({
      error: '服務器錯誤'
    })}\n\n`)
  } finally {
    res.end()
  }
})

/**
 * SSE 知識上傳端點 - 白噗噗回應打字機效果
 * POST /api/chat/upload-stream
 */
router.post('/upload-stream', async (req: Request, res: Response) => {
  // 設置 SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')

  try {
    const { content, files, links, contentType } = req.body
    const token = req.headers.authorization?.replace('Bearer ', '')

    if (!content || !token) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: '缺少必要參數' })}\n\n`)
      res.end()
      return
    }

    // 驗證 token
    let userId: string
    try {
      const decoded = verifyToken(token as string)
      userId = decoded.userId
    } catch (error) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: '未授權' })}\n\n`)
      res.end()
      return
    }

    logger.info(`[SSE Upload] Starting stream for user ${userId}`)

    // === 第一步：立即發送罐頭回應 ===
    const canResponse = '收到了。'
    const canWords = canResponse.split('')

    for (let i = 0; i < canWords.length; i++) {
      const char = canWords[i]
      res.write(`event: chunk\ndata: ${JSON.stringify({
        content: char,
        index: i,
        total: canWords.length,
        phase: 'can' // 標記這是罐頭回應
      })}\n\n`)

      const delay = /[\u4e00-\u9fa5]/.test(char) ? 15 : 10 // 優化：罐頭回應更快（30→15ms）
      await new Promise(resolve => setTimeout(resolve, delay))
    }

    // 罐頭回應完成，發送分段標記（開始新泡泡）
    res.write(`event: sentence-complete\ndata: ${JSON.stringify({
      message: '罐頭回應完成'
    })}\n\n`)

    // 優化：縮短停頓時間（300→150ms）
    await new Promise(resolve => setTimeout(resolve, 150))

    logger.info(`[SSE Upload] 罐頭回應完成，開始處理知識...`)

    // === 第二步：調用 Chief Agent 進行分類和處理 ===
    const result = await chiefAgentService.uploadKnowledge(userId, {
      content: content as string,
      files,
      links,
      contentType
    })

    // === 第三步：打字機效果顯示 Gemini 的溫暖回應，按句號分段 ===
    const warmResponse = result.tororoResponse?.warmMessage ||
                        result.quickClassifyResult?.warmResponse ||
                        '已經幫你處理好了～✨'

    // 按句號、問號、驚嘆號分段
    const sentences = warmResponse.split(/([。！？!?])/).filter(s => s.length > 0)

    // 將標點符號合併到前一個句子
    const mergedSentences: string[] = []
    for (let i = 0; i < sentences.length; i++) {
      if (/[。！？!?]/.test(sentences[i]) && mergedSentences.length > 0) {
        mergedSentences[mergedSentences.length - 1] += sentences[i]
      } else {
        mergedSentences.push(sentences[i])
      }
    }

    // 逐句發送，每句結束後發送分段標記
    for (const sentence of mergedSentences) {
      const words = sentence.split('')

      for (let i = 0; i < words.length; i++) {
        const char = words[i]

        res.write(`event: chunk\ndata: ${JSON.stringify({
          content: char,
          index: i,
          total: words.length,
          phase: 'gemini' // 標記這是 Gemini 回應
        })}\n\n`)

        // 優化：加快打字機速度（50→30ms 中文，30→20ms 英文）
        const delay = /[\u4e00-\u9fa5]/.test(char) ? 30 : 20
        await new Promise(resolve => setTimeout(resolve, delay))
      }

      // 句子完成，發送分段標記（開始新泡泡）
      if (/[。！？!?]$/.test(sentence)) {
        res.write(`event: sentence-complete\ndata: ${JSON.stringify({
          message: '句子完成'
        })}\n\n`)

        // 優化：縮短停頓時間（300→150ms）
        await new Promise(resolve => setTimeout(resolve, 150))
      }
    }

    // 發送完成事件（包含分發記錄資訊和完整結果）
    res.write(`event: complete\ndata: ${JSON.stringify({
      distributionId: result.distribution.id,
      totalChars: canResponse.length + warmResponse.length,
      memoriesCreated: result.memoriesCreated?.length || 0,
      skipRecording: result.skipRecording || false,
      tororoResponse: result.tororoResponse
    })}\n\n`)

    logger.info(`[SSE Upload] Stream completed for user ${userId}`)

  } catch (error: any) {
    logger.error(`[SSE Upload] Error:`, error)
    res.write(`event: error\ndata: ${JSON.stringify({
      error: error.message || '上傳失敗'
    })}\n\n`)
  } finally {
    res.end()
  }
})

export default router
