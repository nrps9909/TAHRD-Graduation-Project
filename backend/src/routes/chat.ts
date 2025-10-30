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

    // 獲取助手資訊
    const assistant = await prisma.assistant.findUnique({
      where: { id: assistantId as string }
    })

    if (!assistant) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: '助手不存在' })}\n\n`)
      res.end()
      return
    }

    logger.info(`[SSE Chat] Starting stream for user ${userId}, assistant ${assistant.nameChinese}`)

    // 如果是 Chief，使用特殊處理
    if (assistant.type === 'CHIEF') {
      try {
        // 調用 chatWithChief 獲取完整回應
        const chatMessage = await chiefAgentService.chatWithChief(userId, message as string)
        const fullResponse = chatMessage.assistantResponse

        // 模擬打字機效果 - 逐字發送
        const words = fullResponse.split('')
        for (let i = 0; i < words.length; i++) {
          const char = words[i]

          // 發送字符
          res.write(`event: chunk\ndata: ${JSON.stringify({
            content: char,
            index: i,
            total: words.length
          })}\n\n`)

          // 每個字符之間的延遲（模擬打字速度）
          // 中文字符慢一點，標點符號快一點
          const delay = /[\u4e00-\u9fa5]/.test(char) ? 50 : 30
          await new Promise(resolve => setTimeout(resolve, delay))
        }

        // 發送完成事件
        res.write(`event: complete\ndata: ${JSON.stringify({
          messageId: chatMessage.id,
          totalChars: fullResponse.length
        })}\n\n`)

        logger.info(`[SSE Chat] Stream completed for user ${userId}`)

      } catch (error: any) {
        logger.error(`[SSE Chat] Error:`, error)
        res.write(`event: error\ndata: ${JSON.stringify({
          error: error.message || '對話失敗'
        })}\n\n`)
      }
    } else {
      // 其他助手（未來實現）
      res.write(`event: error\ndata: ${JSON.stringify({
        error: '此助手暫不支持對話功能'
      })}\n\n`)
    }

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
    const canResponse = '收到了'
    const canWords = canResponse.split('')

    for (let i = 0; i < canWords.length; i++) {
      const char = canWords[i]
      res.write(`event: chunk\ndata: ${JSON.stringify({
        content: char,
        index: i,
        total: canWords.length,
        phase: 'can' // 標記這是罐頭回應
      })}\n\n`)

      const delay = /[\u4e00-\u9fa5]/.test(char) ? 30 : 20 // 罐頭回應快一點
      await new Promise(resolve => setTimeout(resolve, delay))
    }

    // 罐頭回應完成，加個換行
    res.write(`event: chunk\ndata: ${JSON.stringify({
      content: '\n\n',
      phase: 'can'
    })}\n\n`)

    logger.info(`[SSE Upload] 罐頭回應完成，開始處理知識...`)

    // === 第二步：調用 Chief Agent 進行分類和處理 ===
    const result = await chiefAgentService.uploadKnowledge(userId, {
      content: content as string,
      files,
      links,
      contentType
    })

    // === 第三步：打字機效果顯示 Gemini 的溫暖回應 ===
    const warmResponse = result.tororoResponse?.warmMessage ||
                        result.quickClassifyResult?.warmResponse ||
                        '已經幫你處理好了～✨'
    const words = warmResponse.split('')

    for (let i = 0; i < words.length; i++) {
      const char = words[i]

      res.write(`event: chunk\ndata: ${JSON.stringify({
        content: char,
        index: i,
        total: words.length,
        phase: 'gemini' // 標記這是 Gemini 回應
      })}\n\n`)

      const delay = /[\u4e00-\u9fa5]/.test(char) ? 50 : 30
      await new Promise(resolve => setTimeout(resolve, delay))
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
