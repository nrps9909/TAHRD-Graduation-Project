/**
 * Tororo Chat Session Service - 白噗噗對話會話管理
 * 管理白噗噗的對話歷史記錄
 */

import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

interface TororoMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

/**
 * Tororo 對話會話服務
 */
export class TororoChatSessionService {
  /**
   * 獲取或創建會話
   */
  async getOrCreateSession(userId: string, sessionId: string) {
    let session = await prisma.tororoSession.findFirst({
      where: { userId, sessionId },
    })

    if (!session) {
      session = await prisma.tororoSession.create({
        data: {
          userId,
          sessionId,
          title: '與小白的對話',
          messages: [],
        },
      })
      logger.info(`[Tororo Session] Created new session ${sessionId}`)
    }

    return session
  }

  /**
   * 更新會話（添加對話）
   */
  async updateSession(
    sessionId: string,
    userMessage: string,
    assistantMessage: string
  ) {
    const session = await prisma.tororoSession.findFirst({
      where: { sessionId },
    })

    if (!session) {
      logger.warn(`[Tororo Session] Session ${sessionId} not found`)
      return
    }

    const existingMessages = Array.isArray(session.messages)
      ? (session.messages as any[])
      : []

    const newMessages = [
      ...existingMessages,
      {
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString(),
      },
      {
        role: 'assistant',
        content: assistantMessage,
        timestamp: new Date().toISOString(),
      },
    ]

    await prisma.tororoSession.update({
      where: { id: session.id },
      data: {
        messages: newMessages as any,
        totalMessages: newMessages.length,
        lastActiveAt: new Date(),
      },
    })

    logger.info(`[Tororo Session] Updated session ${sessionId}`)
  }

  /**
   * 獲取用戶的所有會話
   */
  async getUserSessions(userId: string) {
    return await prisma.tororoSession.findMany({
      where: { userId, isActive: true },
      orderBy: { lastActiveAt: 'desc' },
      take: 20,
    })
  }

  /**
   * 獲取單個會話
   */
  async getSession(userId: string, sessionId: string) {
    return await prisma.tororoSession.findFirst({
      where: { userId, sessionId },
    })
  }

  /**
   * 刪除會話
   */
  async deleteSession(userId: string, sessionId: string): Promise<boolean> {
    try {
      await prisma.tororoSession.deleteMany({
        where: { userId, sessionId },
      })

      logger.info(`[Tororo Session] Deleted session ${sessionId}`)
      return true
    } catch (error) {
      logger.error(`[Tororo Session] Delete failed:`, error)
      return false
    }
  }

  /**
   * 清空會話（保留但清除消息）
   */
  async clearSession(userId: string, sessionId: string): Promise<void> {
    await prisma.tororoSession.updateMany({
      where: { userId, sessionId },
      data: {
        messages: [],
        totalMessages: 0,
      },
    })

    logger.info(`[Tororo Session] Cleared session ${sessionId}`)
  }

  /**
   * 更新會話標題
   */
  async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    await prisma.tororoSession.updateMany({
      where: { sessionId },
      data: { title },
    })

    logger.info(`[Tororo Session] Updated session ${sessionId} title to: ${title}`)
  }
}

export const tororoChatSession = new TororoChatSessionService()
