/**
 * 白噗噗對話持久化路由
 * 儲存和讀取知識上傳頁面的對話記錄
 *
 * @deprecated BROKEN: This route uses assistantId for ChatSession/ChatMessage which no longer exists.
 * Needs migration to island-based architecture. The main knowledge upload functionality
 * works through the streaming API (/api/knowledge/distribute).
 */

import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { verifyToken } from '../utils/auth'
import { logger } from '../utils/logger'

const router = Router()
const prisma = new PrismaClient()

// TODO: Replace with actual island ID for Tororo/Chief
// This needs to be dynamically looked up per user, or use a system island
const TORORO_ISLAND_ID = 'PLACEHOLDER_ISLAND_ID'  // FIXME: This is broken

/**
 * 獲取或創建白噗噗的 Chat Session
 */
async function getOrCreateTororoSession(userId: string) {
  // 查找現有的白噗噗 session（未歸檔的）
  let session = await prisma.chatSession.findFirst({
    where: {
      userId,
      islandId: TORORO_ISLAND_ID,  // FIXME: Should be dynamic per user
      isArchived: false
    },
    orderBy: {
      lastMessageAt: 'desc'
    }
  })

  // 如果沒有，創建新的
  if (!session) {
    session = await prisma.chatSession.create({
      data: {
        userId,
        islandId: TORORO_ISLAND_ID,  // FIXME: Should be dynamic per user
        title: '白噗噗知識助手'
      }
    })
    logger.info(`[Tororo Chat] 創建新的 session: ${session.id}`)
  }

  return session
}

/**
 * GET /api/tororo-chat/messages
 * 獲取白噗噗的歷史對話記錄
 */
router.get('/messages', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未授權' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    const userId = decoded.userId

    // 獲取或創建 session
    const session = await getOrCreateTororoSession(userId)

    // 獲取該 session 的所有消息（最近 50 條）
    const messages = await prisma.chatMessage.findMany({
      where: {
        sessionId: session.id
      },
      orderBy: {
        createdAt: 'asc'
      },
      take: 50,
      select: {
        id: true,
        userMessage: true,
        assistantResponse: true,
        createdAt: true,
        memoryId: true
      }
    })

    logger.info(`[Tororo Chat] 獲取 ${messages.length} 條歷史消息`)

    return res.json({
      sessionId: session.id,
      messages: messages.map(m => ({
        id: m.id,
        userMessage: m.userMessage,
        assistantResponse: m.assistantResponse,
        createdAt: m.createdAt,
        memoryId: m.memoryId
      }))
    })

  } catch (error: any) {
    logger.error('[Tororo Chat] 獲取消息失敗:', error)
    return res.status(500).json({ error: error.message || '獲取消息失敗' })
  }
})

/**
 * POST /api/tororo-chat/messages
 * 儲存一條新的對話記錄
 */
router.post('/messages', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未授權' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    const userId = decoded.userId

    const { userMessage, assistantResponse, memoryId } = req.body

    if (!userMessage || !assistantResponse) {
      return res.status(400).json({ error: '缺少必要欄位' })
    }

    // 獲取或創建 session
    const session = await getOrCreateTororoSession(userId)

    // 創建新消息
    const message = await prisma.chatMessage.create({
      data: {
        userId,
        sessionId: session.id,
        islandId: TORORO_ISLAND_ID,  // FIXME: Should be dynamic per user
        userMessage,
        assistantResponse,
        memoryId: memoryId || null,
        contextType: 'MEMORY_CREATION' // 知識上傳創建記憶的上下文
      }
    })

    // 更新 session 的最後消息時間和計數
    await prisma.chatSession.update({
      where: { id: session.id },
      data: {
        lastMessageAt: new Date(),
        messageCount: {
          increment: 1
        }
      }
    })

    logger.info(`[Tororo Chat] 儲存新消息: ${message.id}`)

    return res.json({
      success: true,
      messageId: message.id,
      sessionId: session.id
    })

  } catch (error: any) {
    logger.error('[Tororo Chat] 儲存消息失敗:', error)
    return res.status(500).json({ error: error.message || '儲存消息失敗' })
  }
})

/**
 * DELETE /api/tororo-chat/session
 * 清空白噗噗的對話記錄（歸檔當前 session）
 */
router.delete('/session', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未授權' })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    const userId = decoded.userId

    // 找到現有 session 並歸檔
    const session = await prisma.chatSession.findFirst({
      where: {
        userId,
        islandId: TORORO_ISLAND_ID,  // FIXME: Should be dynamic per user
        isArchived: false
      }
    })

    if (session) {
      await prisma.chatSession.update({
        where: { id: session.id },
        data: {
          isArchived: true,
          archivedAt: new Date()
        }
      })

      logger.info(`[Tororo Chat] 歸檔 session: ${session.id}`)
    }

    return res.json({
      success: true,
      message: '對話記錄已清空'
    })

  } catch (error: any) {
    logger.error('[Tororo Chat] 清空對話失敗:', error)
    return res.status(500).json({ error: error.message || '清空對話失敗' })
  }
})

export default router
