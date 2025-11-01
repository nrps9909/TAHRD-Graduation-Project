/**
 * Chat Session Service
 *
 * 管理聊天會話，類似 ChatGPT 的會話系統
 */

import { PrismaClient, AssistantType, ChatContextType } from '@prisma/client'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

export interface CreateSessionOptions {
  userId: string
  islandId: string
  title?: string
}

export interface UpdateSessionOptions {
  title?: string
  isPinned?: boolean
  isArchived?: boolean
}

export interface GetSessionsOptions {
  userId: string
  islandId?: string
  includeArchived?: boolean
  limit?: number
}

export class ChatSessionService {
  /**
   * 創建新會話
   */
  async createSession(options: CreateSessionOptions) {
    const { userId, islandId, title } = options

    try {
      const session = await prisma.chatSession.create({
        data: {
          userId,
          islandId,
          title: title || '新對話',
          messageCount: 0,
          totalTokens: 0
        },
        include: {
          user: true,
          island: true,
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 10  // 只加載最近10條消息
          }
        }
      })

      logger.info(`Chat session created: ${session.id} for user ${userId}`)
      return session
    } catch (error) {
      logger.error('Failed to create chat session:', error)
      throw new Error('創建會話失敗')
    }
  }

  /**
   * 獲取或創建會話（用於自動管理）
   * 根據上下文類型決定是否創建新會話
   */
  async getOrCreateSession(
    userId: string,
    islandId: string,
    contextType: ChatContextType = ChatContextType.GENERAL_CHAT
  ) {
    try {
      // 對於一般聊天，嘗試獲取最近的未歸檔會話
      if (contextType === ChatContextType.GENERAL_CHAT) {
        const recentSession = await prisma.chatSession.findFirst({
          where: {
            userId,
            islandId,
            isArchived: false
          },
          orderBy: {
            lastMessageAt: 'desc'
          }
        })

        // 如果找到最近的會話且在1小時內有活動，則使用它
        if (recentSession) {
          const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
          if (recentSession.lastMessageAt > hourAgo) {
            return recentSession
          }
        }
      }

      // 否則創建新會話
      return await this.createSession({
        userId,
        islandId,
        title: this.getDefaultTitle(contextType)
      })
    } catch (error) {
      logger.error('Failed to get or create session:', error)
      throw new Error('獲取會話失敗')
    }
  }

  /**
   * 獲取會話詳情
   */
  async getSession(sessionId: string, userId: string) {
    try {
      const session = await prisma.chatSession.findFirst({
        where: {
          id: sessionId,
          userId
        },
        include: {
          user: true,
          island: true,
          messages: {
            orderBy: { createdAt: 'asc' }
          }
        }
      })

      if (!session) {
        throw new Error('會話不存在或無權訪問')
      }

      return session
    } catch (error) {
      logger.error('Failed to get session:', error)
      throw error
    }
  }

  /**
   * 獲取會話列表
   */
  async getSessions(options: GetSessionsOptions) {
    const { userId, islandId, includeArchived = false, limit = 50 } = options

    try {
      const where: any = {
        userId
      }

      if (islandId) {
        where.islandId = islandId
      }

      if (!includeArchived) {
        where.isArchived = false
      }

      const sessions = await prisma.chatSession.findMany({
        where,
        orderBy: [
          { isPinned: 'desc' },  // 置頂的在前
          { lastMessageAt: 'desc' }  // 按最後消息時間倒序
        ],
        take: limit,
        include: {
          island: true,
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1  // 只加載最後一條消息用於預覽
          }
        }
      })

      return sessions
    } catch (error) {
      logger.error('Failed to get sessions:', error)
      throw new Error('獲取會話列表失敗')
    }
  }

  /**
   * 更新會話
   */
  async updateSession(
    sessionId: string,
    userId: string,
    data: UpdateSessionOptions
  ) {
    try {
      // 先驗證權限
      const existing = await prisma.chatSession.findFirst({
        where: { id: sessionId, userId }
      })

      if (!existing) {
        throw new Error('會話不存在或無權訪問')
      }

      const session = await prisma.chatSession.update({
        where: { id: sessionId },
        data: {
          ...data,
          ...(data.isArchived !== undefined && data.isArchived && {
            archivedAt: new Date()
          }),
          ...(data.isArchived !== undefined && !data.isArchived && {
            archivedAt: null
          })
        },
        include: {
          island: true
        }
      })

      logger.info(`Chat session updated: ${sessionId}`)
      return session
    } catch (error) {
      logger.error('Failed to update session:', error)
      throw error
    }
  }

  /**
   * 刪除會話
   */
  async deleteSession(sessionId: string, userId: string) {
    try {
      // 先驗證權限
      const existing = await prisma.chatSession.findFirst({
        where: { id: sessionId, userId }
      })

      if (!existing) {
        throw new Error('會話不存在或無權訪問')
      }

      await prisma.chatSession.delete({
        where: { id: sessionId }
      })

      logger.info(`Chat session deleted: ${sessionId}`)
      return true
    } catch (error) {
      logger.error('Failed to delete session:', error)
      throw error
    }
  }

  /**
   * 歸檔會話
   */
  async archiveSession(sessionId: string, userId: string) {
    return await this.updateSession(sessionId, userId, {
      isArchived: true
    })
  }

  /**
   * 取消歸檔會話
   */
  async unarchiveSession(sessionId: string, userId: string) {
    return await this.updateSession(sessionId, userId, {
      isArchived: false
    })
  }

  /**
   * 增加消息計數
   */
  async incrementMessageCount(sessionId: string, tokenCount?: number) {
    try {
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: {
          messageCount: { increment: 1 },
          ...(tokenCount && {
            totalTokens: { increment: tokenCount }
          })
        }
      })
    } catch (error) {
      logger.error('Failed to increment message count:', error)
    }
  }

  /**
   * 更新最後消息時間
   */
  async updateLastMessageAt(sessionId: string) {
    try {
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: {
          lastMessageAt: new Date()
        }
      })
    } catch (error) {
      logger.error('Failed to update last message time:', error)
    }
  }

  /**
   * 自動生成會話標題（基於首條消息）
   */
  async autoGenerateTitle(sessionId: string, firstMessage: string) {
    try {
      // 簡單版本：取前20個字作為標題
      const title = firstMessage.length > 20
        ? firstMessage.substring(0, 20) + '...'
        : firstMessage

      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { title }
      })

      logger.info(`Auto-generated title for session ${sessionId}: ${title}`)
      return title
    } catch (error) {
      logger.error('Failed to auto-generate title:', error)
      return undefined
    }
  }

  /**
   * 獲取默認標題
   */
  private getDefaultTitle(contextType: ChatContextType): string {
    const titleMap: Record<ChatContextType, string> = {
      [ChatContextType.MEMORY_CREATION]: '記憶創建',
      [ChatContextType.MEMORY_QUERY]: '記憶查詢',
      [ChatContextType.GENERAL_CHAT]: '新對話',
      [ChatContextType.SUMMARY_REQUEST]: '摘要請求',
      [ChatContextType.CLASSIFICATION]: '分類請求'
    }

    return titleMap[contextType] || '新對話'
  }
}

export const chatSessionService = new ChatSessionService()
