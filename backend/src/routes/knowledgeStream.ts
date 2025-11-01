/**
 * Knowledge Upload Stream Routes - 實現一次 AI 調用的流式上傳
 */

import { Router, Request, Response } from 'express'
import { chiefAgentService } from '../services/chiefAgentService'
import { logger } from '../utils/logger'
import { verifyToken } from '../utils/auth'

const router = Router()

/**
 * SSE 知識上傳端點 - 實現流式回應（一次 AI 調用）
 * POST /api/knowledge/upload-stream
 *
 * 流程：
 * 1. 階段 1 (3秒)：即時回應 (category, warmResponse, quickSummary)
 * 2. 階段 2 (10秒)：深度分析 (detailedSummary, keyInsights, tags)
 * 3. 創建 Memory
 */
router.post('/upload-stream', async (req: Request, res: Response) => {
  // 設置 SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // 禁用 Nginx 緩衝

  try {
    // 從請求頭獲取 token
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: '未授權' })}\n\n`)
      res.end()
      return
    }

    const token = authHeader.substring(7)

    // 驗證 token
    let userId: string
    try {
      const decoded = verifyToken(token)
      userId = decoded.userId
    } catch (error) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: '未授權' })}\n\n`)
      res.end()
      return
    }

    // 獲取上傳數據
    const { content, files, links } = req.body

    if (!content) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: '缺少內容' })}\n\n`)
      res.end()
      return
    }

    logger.info(`[Knowledge Stream] 開始處理用戶 ${userId} 的知識上傳`)

    // 使用 streaming 上傳
    const streamGenerator = chiefAgentService.uploadKnowledgeStream(userId, {
      content,
      files: files || [],
      links: links || []
    })

    // 流式發送事件
    for await (const event of streamGenerator) {
      const eventType = event.type || 'message'
      const eventData = JSON.stringify(event)

      res.write(`event: ${eventType}\ndata: ${eventData}\n\n`)

      logger.info(`[Knowledge Stream] 發送事件: ${eventType}`)

      // 如果是完成或錯誤事件，結束連接
      if (eventType === 'complete' || eventType === 'error') {
        break
      }
    }

    res.write(`event: done\ndata: {}\n\n`)
    res.end()

    logger.info(`[Knowledge Stream] 處理完成`)

  } catch (error: any) {
    logger.error('[Knowledge Stream] Error:', error)
    res.write(`event: error\ndata: ${JSON.stringify({
      error: error.message || '處理失敗'
    })}\n\n`)
    res.end()
  }
})

export default router
