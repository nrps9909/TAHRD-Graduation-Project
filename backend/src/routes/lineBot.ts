/**
 * LINE Bot Webhook Routes
 * 實現白噗噗官方帳號的訊息接收與回應
 */

import { Router, Request, Response } from 'express'
import { Client, WebhookEvent, TextMessage, MessageEvent } from '@line/bot-sdk'
import { logger } from '../utils/logger'
import { lineBotService } from '../services/lineBotService'
import crypto from 'crypto'

const router = Router()

// LINE Bot 配置
const config = {
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
}

// 初始化 LINE Client（只在有 token 時初始化）
let lineClient: Client | null = null
if (config.channelAccessToken && config.channelSecret) {
  lineClient = new Client(config)
} else {
  logger.warn('[LINE Bot] LINE credentials not configured, LINE Bot features disabled')
}

/**
 * 驗證 LINE Webhook Signature
 */
function validateSignature(body: string, signature: string): boolean {
  const hash = crypto
    .createHmac('SHA256', config.channelSecret)
    .update(body)
    .digest('base64')

  return hash === signature
}

/**
 * LINE Bot Webhook 端點
 * POST /api/line/webhook
 */
router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  try {
    // 驗證 signature
    const signature = req.headers['x-line-signature'] as string
    if (!signature) {
      logger.warn('[LINE Bot] Missing signature')
      res.status(401).json({ error: 'Missing signature' })
      return
    }

    const body = JSON.stringify(req.body)
    if (!validateSignature(body, signature)) {
      logger.warn('[LINE Bot] Invalid signature')
      res.status(401).json({ error: 'Invalid signature' })
      return
    }

    // 處理 webhook 事件
    const events: WebhookEvent[] = req.body.events || []

    logger.info(`[LINE Bot] 收到 ${events.length} 個事件`)

    // 並發處理所有事件
    await Promise.all(
      events.map(event => handleEvent(event))
    )

    // 回應 200 OK（LINE 要求在 5 秒內回應）
    res.status(200).json({ success: true })

  } catch (error: any) {
    logger.error('[LINE Bot] Webhook error:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * 處理單個 webhook 事件
 */
async function handleEvent(event: WebhookEvent): Promise<void> {
  try {
    // 只處理訊息事件
    if (event.type !== 'message') {
      logger.info(`[LINE Bot] 忽略事件類型: ${event.type}`)
      return
    }

    const messageEvent = event as MessageEvent

    // 只處理文字訊息
    if (messageEvent.message.type !== 'text') {
      logger.info(`[LINE Bot] 忽略訊息類型: ${messageEvent.message.type}`)
      await replyMessage(messageEvent.replyToken, '抱歉，我目前只能處理文字訊息喔～')
      return
    }

    const userMessage = messageEvent.message.text
    const lineUserId = messageEvent.source.userId

    if (!lineUserId) {
      logger.warn('[LINE Bot] Missing userId')
      return
    }

    logger.info(`[LINE Bot] 收到訊息: ${userMessage} (用戶: ${lineUserId})`)

    // 使用 lineBotService 處理訊息
    const response = await lineBotService.handleMessage(lineUserId, userMessage)

    // 回應訊息
    await replyMessage(event.replyToken, response)

  } catch (error: any) {
    logger.error('[LINE Bot] Handle event error:', error)

    // 發送錯誤訊息給用戶
    if (event.type === 'message') {
      const messageEvent = event as MessageEvent
      try {
        await replyMessage(messageEvent.replyToken, '抱歉，處理你的訊息時發生了錯誤，請稍後再試～')
      } catch (replyError) {
        logger.error('[LINE Bot] Reply error message failed:', replyError)
      }
    }
  }
}

/**
 * 回應訊息給用戶
 */
async function replyMessage(replyToken: string, text: string): Promise<void> {
  if (!lineClient) {
    logger.warn('[LINE Bot] LINE Client not initialized, cannot reply message')
    return
  }

  const message: TextMessage = {
    type: 'text',
    text
  }

  await lineClient.replyMessage(replyToken, message)
  logger.info(`[LINE Bot] 已回應訊息: ${text.substring(0, 50)}...`)
}

/**
 * 健康檢查端點（測試用）
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'LINE Bot',
    timestamp: new Date().toISOString()
  })
})

export default router
