import { GraphQLError } from 'graphql'
import { Context } from '../context'
import { chatSessionService } from '../services/chatSessionService'
import { ChatContextType } from '@prisma/client'

export const chatSessionResolvers = {
  Query: {
    /**
     * 獲取會話列表
     */
    chatSessions: async (
      _: any,
      { assistantId, includeArchived = false, limit = 50 }: { assistantId?: string; includeArchived?: boolean; limit?: number },
      { userId, prisma }: Context
    ) => {
      if (!userId) {
        throw new GraphQLError('Must be authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }

      try {
        return await chatSessionService.getSessions({
          userId,
          assistantId,
          includeArchived,
          limit
        })
      } catch (error) {
        throw new GraphQLError('Failed to get chat sessions: ' + (error as Error).message)
      }
    },

    /**
     * 獲取單個會話詳情
     */
    chatSession: async (
      _: any,
      { id }: { id: string },
      { userId, prisma }: Context
    ) => {
      if (!userId) {
        throw new GraphQLError('Must be authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }

      try {
        return await chatSessionService.getSession(id, userId)
      } catch (error) {
        throw new GraphQLError('Failed to get chat session: ' + (error as Error).message)
      }
    }
  },

  Mutation: {
    /**
     * 創建新會話
     */
    createChatSession: async (
      _: any,
      { input }: { input: { assistantId: string; title?: string } },
      { userId, prisma }: Context
    ) => {
      if (!userId) {
        throw new GraphQLError('Must be authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }

      try {
        // 驗證助手存在
        const assistant = await prisma.assistant.findUnique({
          where: { id: input.assistantId }
        })

        if (!assistant) {
          throw new GraphQLError('Assistant not found')
        }

        return await chatSessionService.createSession({
          userId,
          assistantId: input.assistantId,
          title: input.title
        })
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error
        }
        throw new GraphQLError('Failed to create chat session: ' + (error as Error).message)
      }
    },

    /**
     * 更新會話
     */
    updateChatSession: async (
      _: any,
      { id, input }: { id: string; input: { title?: string; isPinned?: boolean; isArchived?: boolean } },
      { userId, prisma }: Context
    ) => {
      if (!userId) {
        throw new GraphQLError('Must be authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }

      try {
        return await chatSessionService.updateSession(id, userId, input)
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error
        }
        throw new GraphQLError('Failed to update chat session: ' + (error as Error).message)
      }
    },

    /**
     * 刪除會話
     */
    deleteChatSession: async (
      _: any,
      { id }: { id: string },
      { userId, prisma }: Context
    ) => {
      if (!userId) {
        throw new GraphQLError('Must be authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }

      try {
        await chatSessionService.deleteSession(id, userId)
        return true
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error
        }
        throw new GraphQLError('Failed to delete chat session: ' + (error as Error).message)
      }
    },

    /**
     * 歸檔會話
     */
    archiveChatSession: async (
      _: any,
      { id }: { id: string },
      { userId, prisma }: Context
    ) => {
      if (!userId) {
        throw new GraphQLError('Must be authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }

      try {
        return await chatSessionService.archiveSession(id, userId)
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error
        }
        throw new GraphQLError('Failed to archive chat session: ' + (error as Error).message)
      }
    },

    /**
     * 取消歸檔會話
     */
    unarchiveChatSession: async (
      _: any,
      { id }: { id: string },
      { userId, prisma }: Context
    ) => {
      if (!userId) {
        throw new GraphQLError('Must be authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }

      try {
        return await chatSessionService.unarchiveSession(id, userId)
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error
        }
        throw new GraphQLError('Failed to unarchive chat session: ' + (error as Error).message)
      }
    }
  },

  // Type Resolvers
  ChatSession: {
    user: async (parent: any, _: any, { prisma }: Context) => {
      return prisma.user.findUnique({
        where: { id: parent.userId }
      })
    },
    assistant: async (parent: any, _: any, { prisma }: Context) => {
      return prisma.assistant.findUnique({
        where: { id: parent.assistantId }
      })
    },
    messages: async (parent: any, _: any, { prisma }: Context) => {
      return prisma.chatMessage.findMany({
        where: { sessionId: parent.id },
        orderBy: { createdAt: 'asc' }
      })
    }
  }
}
