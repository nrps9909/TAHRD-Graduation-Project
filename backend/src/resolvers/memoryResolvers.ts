import { GraphQLError } from 'graphql'
import { Context } from '../context'
import { memoryService } from '../services/memoryService'
import { chiefAgentService } from '../services/chiefAgentService'
import { AssistantType, ChatContextType } from '@prisma/client'

export const memoryResolvers = {
  Query: {
    /**
     * 獲取記憶列表
     */
    memories: async (
      _: any,
      { filter, limit = 50, offset = 0 }: any,
      { userId }: Context
    ) => {
      if (!userId) {
        throw new GraphQLError('Must be authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }

      try {
        return await memoryService.getMemories({
          userId,
          assistantId: filter?.assistantId,
          category: filter?.category,
          tags: filter?.tags,
          search: filter?.search,
          isPinned: filter?.isPinned,
          isArchived: filter?.isArchived,
          startDate: filter?.startDate,
          endDate: filter?.endDate,
          limit,
          offset
        })
      } catch (error) {
        throw new GraphQLError('Failed to fetch memories: ' + (error as Error).message)
      }
    },

    /**
     * 獲取單個記憶
     */
    memory: async (_: any, { id }: { id: string }, { userId }: Context) => {
      if (!userId) {
        throw new GraphQLError('Must be authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }

      try {
        return await memoryService.getMemoryById(id, userId)
      } catch (error) {
        throw new GraphQLError('Failed to fetch memory: ' + (error as Error).message)
      }
    },

    /**
     * 搜尋記憶
     */
    searchMemories: async (
      _: any,
      { query, limit = 20 }: { query: string; limit?: number },
      { userId }: Context
    ) => {
      if (!userId) {
        throw new GraphQLError('Must be authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }

      try {
        return await memoryService.searchMemories(userId, query, limit)
      } catch (error) {
        throw new GraphQLError('Failed to search memories: ' + (error as Error).message)
      }
    },

    /**
     * 獲取相關記憶
     */
    relatedMemories: async (
      _: any,
      { memoryId, limit = 5 }: { memoryId: string; limit?: number },
      { userId }: Context
    ) => {
      if (!userId) {
        throw new GraphQLError('Must be authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }

      try {
        return await memoryService.getRelatedMemories(memoryId, userId, limit)
      } catch (error) {
        throw new GraphQLError('Failed to fetch related memories: ' + (error as Error).message)
      }
    },

    /**
     * 獲取釘選的記憶
     */
    pinnedMemories: async (_: any, __: any, { userId }: Context) => {
      if (!userId) {
        throw new GraphQLError('Must be authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }

      try {
        return await memoryService.getPinnedMemories(userId)
      } catch (error) {
        throw new GraphQLError('Failed to fetch pinned memories: ' + (error as Error).message)
      }
    },

    /**
     * 獲取聊天歷史
     */
    chatHistory: async (
      _: any,
      { assistantId, limit = 50 }: { assistantId?: string; limit?: number },
      { userId, prisma }: Context
    ) => {
      if (!userId) {
        throw new GraphQLError('Must be authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }

      try {
        return await prisma.chatMessage.findMany({
          where: {
            userId,
            ...(assistantId && { assistantId })
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          include: {
            assistant: true,
            memory: true
          }
        })
      } catch (error) {
        throw new GraphQLError('Failed to fetch chat history: ' + (error as Error).message)
      }
    },

    /**
     * 獲取單個聊天訊息
     */
    chatMessage: async (_: any, { id }: { id: string }, { userId, prisma }: Context) => {
      if (!userId) {
        throw new GraphQLError('Must be authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }

      try {
        const message = await prisma.chatMessage.findUnique({
          where: { id },
          include: {
            assistant: true,
            memory: true
          }
        })

        if (!message || message.userId !== userId) {
          throw new GraphQLError('Chat message not found or access denied')
        }

        return message
      } catch (error) {
        throw new GraphQLError('Failed to fetch chat message: ' + (error as Error).message)
      }
    }
  },

  Mutation: {
    /**
     * 創建記憶
     */
    createMemory: async (
      _: any,
      { input }: { input: { assistantId: string; content: string; contextType?: ChatContextType } },
      { userId, prisma }: Context
    ) => {
      if (!userId) {
        throw new GraphQLError('Must be authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }

      try {
        // 獲取助手資訊
        const assistant = await prisma.assistant.findUnique({
          where: { id: input.assistantId }
        })

        if (!assistant) {
          throw new GraphQLError('Assistant not found')
        }

        // 處理並創建記憶
        return await chiefAgentService.processAndCreateMemory(
          userId,
          input.assistantId,
          input.content,
          assistant.type,
          input.contextType || ChatContextType.MEMORY_CREATION
        )
      } catch (error) {
        throw new GraphQLError('Failed to create memory: ' + (error as Error).message)
      }
    },

    /**
     * 更新記憶
     */
    updateMemory: async (
      _: any,
      { id, input }: { id: string; input: any },
      { userId }: Context
    ) => {
      if (!userId) {
        throw new GraphQLError('Must be authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }

      try {
        return await memoryService.updateMemory(id, userId, input)
      } catch (error) {
        throw new GraphQLError('Failed to update memory: ' + (error as Error).message)
      }
    },

    /**
     * 刪除記憶
     */
    deleteMemory: async (_: any, { id }: { id: string }, { userId }: Context) => {
      if (!userId) {
        throw new GraphQLError('Must be authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }

      try {
        return await memoryService.deleteMemory(id, userId)
      } catch (error) {
        throw new GraphQLError('Failed to delete memory: ' + (error as Error).message)
      }
    },

    /**
     * 歸檔記憶
     */
    archiveMemory: async (_: any, { id }: { id: string }, { userId }: Context) => {
      if (!userId) {
        throw new GraphQLError('Must be authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }

      try {
        return await memoryService.archiveMemory(id, userId)
      } catch (error) {
        throw new GraphQLError('Failed to archive memory: ' + (error as Error).message)
      }
    },

    /**
     * 取消歸檔
     */
    unarchiveMemory: async (_: any, { id }: { id: string }, { userId }: Context) => {
      if (!userId) {
        throw new GraphQLError('Must be authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }

      try {
        return await memoryService.unarchiveMemory(id, userId)
      } catch (error) {
        throw new GraphQLError('Failed to unarchive memory: ' + (error as Error).message)
      }
    },

    /**
     * 釘選記憶
     */
    pinMemory: async (_: any, { id }: { id: string }, { userId }: Context) => {
      if (!userId) {
        throw new GraphQLError('Must be authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }

      try {
        return await memoryService.pinMemory(id, userId)
      } catch (error) {
        throw new GraphQLError('Failed to pin memory: ' + (error as Error).message)
      }
    },

    /**
     * 取消釘選
     */
    unpinMemory: async (_: any, { id }: { id: string }, { userId }: Context) => {
      if (!userId) {
        throw new GraphQLError('Must be authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }

      try {
        return await memoryService.unpinMemory(id, userId)
      } catch (error) {
        throw new GraphQLError('Failed to unpin memory: ' + (error as Error).message)
      }
    },

    /**
     * 連結記憶
     */
    linkMemories: async (
      _: any,
      { memoryId, relatedIds }: { memoryId: string; relatedIds: string[] },
      { userId }: Context
    ) => {
      if (!userId) {
        throw new GraphQLError('Must be authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }

      try {
        return await memoryService.linkMemories(memoryId, relatedIds, userId)
      } catch (error) {
        throw new GraphQLError('Failed to link memories: ' + (error as Error).message)
      }
    },

    /**
     * 與助手聊天
     */
    chatWithAssistant: async (
      _: any,
      { input }: { input: { assistantId: string; message: string; contextType?: ChatContextType; memoryId?: string } },
      { userId, prisma }: Context
    ) => {
      if (!userId) {
        throw new GraphQLError('Must be authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }

      try {
        const assistant = await prisma.assistant.findUnique({
          where: { id: input.assistantId }
        })

        if (!assistant) {
          throw new GraphQLError('Assistant not found')
        }

        // 如果是 Chief，使用特殊處理
        if (assistant.type === AssistantType.CHIEF) {
          return await chiefAgentService.chatWithChief(userId, input.message)
        }

        // 其他助手的一般對話
        const chatMessage = await prisma.chatMessage.create({
          data: {
            userId,
            assistantId: input.assistantId,
            userMessage: input.message,
            assistantResponse: '此功能即將推出', // TODO: 實作 sub-agent 對話
            contextType: input.contextType || ChatContextType.GENERAL_CHAT,
            memoryId: input.memoryId
          },
          include: {
            assistant: true,
            memory: true
          }
        })

        return chatMessage
      } catch (error) {
        throw new GraphQLError('Failed to chat with assistant: ' + (error as Error).message)
      }
    }
  },

  // Type Resolvers
  Memory: {
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

    relatedMemories: async (parent: any, _: any, { prisma }: Context) => {
      if (!parent.relatedMemoryIds || parent.relatedMemoryIds.length === 0) {
        return []
      }

      return prisma.memory.findMany({
        where: {
          id: { in: parent.relatedMemoryIds }
        }
      })
    },

    chatMessages: async (parent: any, _: any, { prisma }: Context) => {
      return prisma.chatMessage.findMany({
        where: { memoryId: parent.id },
        orderBy: { createdAt: 'desc' }
      })
    }
  },

  ChatMessage: {
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

    memory: async (parent: any, _: any, { prisma }: Context) => {
      if (!parent.memoryId) return null

      return prisma.memory.findUnique({
        where: { id: parent.memoryId }
      })
    }
  }
}
