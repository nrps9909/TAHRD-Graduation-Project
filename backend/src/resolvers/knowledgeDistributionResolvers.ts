import { PrismaClient } from '@prisma/client'
import { chiefAgentService } from '../services/chiefAgentService'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

export const knowledgeDistributionResolvers = {
  Query: {
    /**
     * 获取知识分发列表
     */
    knowledgeDistributions: async (_: any, { limit = 20, offset = 0 }: any, context: any) => {
      try {
        const userId = context.userId
        if (!userId) {
          throw new Error('未认证')
        }

        const distributions = await prisma.knowledgeDistribution.findMany({
          where: { userId },
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' },
          include: {
            agentDecisions: true,
            memories: true,
          },
        })

        return distributions
      } catch (error) {
        logger.error('Query knowledgeDistributions error:', error)
        throw error
      }
    },

    /**
     * 获取单个知识分发记录
     */
    knowledgeDistribution: async (_: any, { id }: any, context: any) => {
      try {
        const userId = context.userId
        if (!userId) {
          throw new Error('未认证')
        }

        const distribution = await prisma.knowledgeDistribution.findFirst({
          where: { id, userId },
          include: {
            agentDecisions: {
              include: {
                distribution: true,
              },
            },
            memories: {
              include: {
                user: true,
                assistant: true,
              },
            },
          },
        })

        if (!distribution) {
          throw new Error('知识分发记录不存在')
        }

        return distribution
      } catch (error) {
        logger.error('Query knowledgeDistribution error:', error)
        throw error
      }
    },

    /**
     * 获取 Agent 决策列表
     */
    agentDecisions: async (_: any, { distributionId }: any, context: any) => {
      try {
        const userId = context.userId
        if (!userId) {
          throw new Error('未认证')
        }

        // 验证分发记录所有权
        const distribution = await prisma.knowledgeDistribution.findFirst({
          where: { id: distributionId, userId },
        })

        if (!distribution) {
          throw new Error('知识分发记录不存在')
        }

        const decisions = await prisma.agentDecision.findMany({
          where: { distributionId },
          orderBy: { relevanceScore: 'desc' },
          include: {
            distribution: true,
          },
        })

        return decisions
      } catch (error) {
        logger.error('Query agentDecisions error:', error)
        throw error
      }
    },
  },

  Mutation: {
    /**
     * 上传知识到分发系统
     */
    uploadKnowledge: async (_: any, { input }: any, context: any) => {
      try {
        const userId = context.userId
        if (!userId) {
          throw new Error('未认证')
        }

        logger.info(`[GraphQL] 用户 ${userId} 上传知识`)

        // 调用 Chief Agent Service
        const result = await chiefAgentService.uploadKnowledge(userId, input)

        logger.info(`[GraphQL] 知识上传成功，分发记录 ID: ${result.distribution.id}`)

        return result
      } catch (error) {
        logger.error('Mutation uploadKnowledge error:', error)
        throw new Error(`上传知识失败: ${error instanceof Error ? error.message : '未知错误'}`)
      }
    },
  },

  // Type resolvers
  KnowledgeDistribution: {
    agentDecisions: async (parent: any) => {
      return prisma.agentDecision.findMany({
        where: { distributionId: parent.id },
        orderBy: { relevanceScore: 'desc' },
      })
    },
    memories: async (parent: any) => {
      return prisma.memory.findMany({
        where: { distributionId: parent.id },
        include: {
          user: true,
          assistant: true,
        },
      })
    },
  },

  AgentDecision: {
    distribution: async (parent: any) => {
      return prisma.knowledgeDistribution.findUnique({
        where: { id: parent.distributionId },
      })
    },
    assistant: async (parent: any) => {
      if (!parent.assistantId) return null
      return prisma.assistant.findUnique({
        where: { id: parent.assistantId },
      })
    },
  },
}
