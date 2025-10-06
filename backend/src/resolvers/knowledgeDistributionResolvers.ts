import { PrismaClient } from '@prisma/client'
import { chiefAgentService } from '../services/chiefAgentService'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

export const knowledgeDistributionResolvers = {
  Query: {
    /**
     * �����h
     */
    knowledgeDistributions: async (_: any, { limit = 20, offset = 0 }: any, context: any) => {
      try {
        const userId = context.userId
        if (!userId) {
          throw new Error('*�
')
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
     * ��U*���
     */
    knowledgeDistribution: async (_: any, { id }: any, context: any) => {
      try {
        const userId = context.userId
        if (!userId) {
          throw new Error('*�
')
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
          throw new Error('�X|X(')
        }

        return distribution
      } catch (error) {
        logger.error('Query knowledgeDistribution error:', error)
        throw error
      }
    },

    /**
     * ��ф Agent �Vh
     */
    agentDecisions: async (_: any, { distributionId }: any, context: any) => {
      try {
        const userId = context.userId
        if (!userId) {
          throw new Error('*�
')
        }

        // ��ѰU^�SM(7
        const distribution = await prisma.knowledgeDistribution.findFirst({
          where: { id: distributionId, userId },
        })

        if (!distribution) {
          throw new Error('�X|X(')
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
     * 
 ��0���
     */
    uploadKnowledge: async (_: any, { input }: any, context: any) => {
      try {
        const userId = context.userId
        if (!userId) {
          throw new Error('*�
')
        }

        logger.info(`[GraphQL] (6 ${userId} 
��X`)

        // ( Chief Agent Service
        const result = await chiefAgentService.uploadKnowledge(userId, input)

        logger.info(`[GraphQL] �X
��| ID: ${result.distribution.id}`)

        return result
      } catch (error) {
        logger.error('Mutation uploadKnowledge error:', error)
        throw new Error(`
��X1W: ${error instanceof Error ? error.message : '*�/�'}`)
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
