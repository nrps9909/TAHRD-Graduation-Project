import { GraphQLError } from 'graphql'
import { multiAgentService, AGENTS } from '../services/multiAgentService'
import { Context } from '../context'
import { Category } from '@prisma/client'

export const multiAgentResolvers = {
  Query: {
    // 獲取所有agents
    agents: async () => {
      return Object.values(AGENTS).map(agent => ({
        id: agent.id,
        name: agent.name,
        emoji: agent.emoji,
        color: agent.color,
        personality: agent.personality,
        category: agent.category,
        messageCount: 0,
        memoryCount: 0
      }))
    },

    // 獲取單個agent
    agent: async (_: any, { id }: any) => {
      const agent = AGENTS[id as keyof typeof AGENTS]
      if (!agent) {
        throw new GraphQLError('Agent not found')
      }

      return {
        id: agent.id,
        name: agent.name,
        emoji: agent.emoji,
        color: agent.color,
        personality: agent.personality,
        category: agent.category,
        messageCount: 0,
        memoryCount: 0
      }
    },

    // 獲取記憶（可按類別過濾）
    memories: async (_: any, { category, limit = 50 }: any, { prisma, userId }: Context) => {
      if (!userId) {
        throw new GraphQLError('Must be authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }

      return prisma.memoryEntry.findMany({
        where: {
          userId,
          ...(category && { category: category as Category })
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          chatHistory: true
        }
      })
    },

    // 獲取單個記憶
    memory: async (_: any, { id }: any, { prisma, userId }: Context) => {
      if (!userId) {
        throw new GraphQLError('Must be authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }

      const memory = await prisma.memoryEntry.findUnique({
        where: { id },
        include: {
          chatHistory: true
        }
      })

      if (!memory || memory.userId !== userId) {
        throw new GraphQLError('Memory not found or access denied')
      }

      return memory
    },

    // 搜尋記憶
    searchMemories: async (_: any, { query }: any, { prisma, userId }: Context) => {
      if (!userId) {
        throw new GraphQLError('Must be authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }

      return prisma.memoryEntry.findMany({
        where: {
          userId,
          OR: [
            { rawContent: { contains: query, mode: 'insensitive' } },
            { summary: { contains: query, mode: 'insensitive' } },
            { tags: { has: query } }
          ]
        },
        orderBy: { importance: 'desc' },
        take: 20
      })
    },

    // 獲取聊天歷史
    chatHistory: async (_: any, { agentId, limit = 20 }: any, { prisma, userId }: Context) => {
      if (!userId) {
        throw new GraphQLError('Must be authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }

      return prisma.chatMessage.findMany({
        where: {
          userId,
          ...(agentId && { agentId })
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          memory: true
        }
      })
    }
  },

  Mutation: {
    // 提交新資訊（主要功能）
    submitMemory: async (_: any, { content }: any, { userId }: Context) => {
      if (!userId) {
        throw new GraphQLError('Must be authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }

      try {
        // 第一步：路由
        const routing = await multiAgentService.routeMessage(userId, content)

        // 第二步：處理
        const processing = await multiAgentService.processWithAgent(
          userId,
          content,
          routing.category
        )

        return {
          routing: {
            category: routing.category,
            greeting: routing.greeting,
            reason: routing.reason,
            confidence: routing.confidence
          },
          processing: {
            agent: {
              id: processing.agent.id,
              name: processing.agent.name,
              emoji: processing.agent.emoji,
              color: processing.agent.color,
              personality: processing.agent.personality,
              category: processing.agent.category,
              messageCount: 0,
              memoryCount: 0
            },
            memory: processing.memory,
            response: processing.response
          }
        }
      } catch (error) {
        throw new GraphQLError('Failed to process memory: ' + (error as Error).message)
      }
    },

    // 與特定agent聊天
    chatWithAgent: async (_: any, { agentId, message }: any, { userId }: Context) => {
      if (!userId) {
        throw new GraphQLError('Must be authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }

      try {
        const result = await multiAgentService.chatWithAgent(userId, agentId, message)

        // 獲取剛創建的chat message
        const chatMessage = await prisma.chatMessage.findFirst({
          where: {
            userId,
            agentId,
            message
          },
          orderBy: { createdAt: 'desc' },
          include: {
            memory: true
          }
        })

        return chatMessage
      } catch (error) {
        throw new GraphQLError('Failed to chat with agent: ' + (error as Error).message)
      }
    }
  },

  // Type resolvers
  MemoryEntry: {
    chatHistory: (parent: any, _: any, { prisma }: Context) =>
      prisma.chatMessage.findMany({
        where: { memoryId: parent.id },
        orderBy: { createdAt: 'desc' }
      })
  },

  ChatMessage: {
    memory: (parent: any, _: any, { prisma }: Context) => {
      if (!parent.memoryId) return null
      return prisma.memoryEntry.findUnique({
        where: { id: parent.memoryId }
      })
    }
  }
}

const prisma = new PrismaClient()
