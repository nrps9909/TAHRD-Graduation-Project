/**
 * Tororo Chat Session Resolvers (小白對話會話)
 *
 * 提供白噗噗的對話會話管理功能
 */

import { logger } from '../utils/logger'
import { tororoChatSession } from '../services/tororoChatSession'

export const tororoChatResolvers = {
  Query: {
    /**
     * 獲取用戶的所有 Tororo 對話會話
     */
    getTororoSessions: async (_: any, __: any, context: any) => {
      try {
        const userId = context.userId
        if (!userId) {
          throw new Error('未授權')
        }

        logger.info(`[Tororo Chat] Getting sessions for user ${userId}`)

        const sessions = await tororoChatSession.getUserSessions(userId)

        return sessions.map((session) => ({
          id: session.id,
          sessionId: session.sessionId,
          title: session.title,
          totalMessages: session.totalMessages,
          lastActiveAt: session.lastActiveAt,
          isActive: session.isActive,
        }))
      } catch (error) {
        logger.error('[Tororo Chat] Get sessions failed:', error)
        throw new Error('獲取會話列表失敗')
      }
    },

    /**
     * 獲取單個 Tororo 對話會話的詳情（包含消息）
     */
    getTororoSession: async (
      _: any,
      { sessionId }: { sessionId: string },
      context: any
    ) => {
      try {
        const userId = context.userId
        if (!userId) {
          throw new Error('未授權')
        }

        logger.info(`[Tororo Chat] Getting session ${sessionId} for user ${userId}`)

        const session = await tororoChatSession.getSession(userId, sessionId)

        if (!session) {
          return null
        }

        const messages = Array.isArray(session.messages) ? session.messages : []

        return {
          id: session.id,
          sessionId: session.sessionId,
          title: session.title,
          messages: messages.map((msg: any) => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
          })),
          totalMessages: session.totalMessages,
          lastActiveAt: session.lastActiveAt,
          isActive: session.isActive,
        }
      } catch (error) {
        logger.error('[Tororo Chat] Get session failed:', error)
        return null
      }
    },
  },

  Mutation: {
    /**
     * 保存 Tororo 對話消息
     */
    saveTororoMessage: async (
      _: any,
      {
        sessionId,
        userMessage,
        assistantMessage,
      }: {
        sessionId: string
        userMessage: string
        assistantMessage: string
      },
      context: any
    ) => {
      try {
        const userId = context.userId
        if (!userId) {
          throw new Error('未授權')
        }

        logger.info(`[Tororo Chat] Saving message for session ${sessionId}`)

        // 先獲取或創建會話
        await tororoChatSession.getOrCreateSession(userId, sessionId)

        // 更新會話（添加對話）
        await tororoChatSession.updateSession(sessionId, userMessage, assistantMessage)

        // 更新會話標題（使用第一條用戶消息的前30個字符）
        const session = await tororoChatSession.getOrCreateSession(userId, sessionId)
        if (session.title === '與小白的對話' && userMessage) {
          const newTitle = userMessage.substring(0, 30) + (userMessage.length > 30 ? '...' : '')
          await tororoChatSession.updateSessionTitle(sessionId, newTitle)
        }

        return true
      } catch (error) {
        logger.error('[Tororo Chat] Save message failed:', error)
        return false
      }
    },

    /**
     * 刪除 Tororo 對話會話
     */
    deleteTororoSession: async (
      _: any,
      { sessionId }: { sessionId: string },
      context: any
    ) => {
      try {
        const userId = context.userId
        if (!userId) {
          throw new Error('未授權')
        }

        logger.info(`[Tororo Chat] Deleting session ${sessionId} for user ${userId}`)

        const success = await tororoChatSession.deleteSession(userId, sessionId)

        return success
      } catch (error) {
        logger.error('[Tororo Chat] Delete session failed:', error)
        return false
      }
    },
  },
}
