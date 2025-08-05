import { GraphQLError } from 'graphql'
import { geminiService } from '../services/geminiService'
import { pubsub } from '../utils/pubsub'
import { logger } from '../utils/logger'
import { Context } from '../context'

export const conversationResolvers = {
  Query: {
    conversations: async (_: any, { npcId, limit = 50 }: any, { prisma, userId }: Context) => {
      if (!userId) throw new GraphQLError('Must be authenticated', {
        extensions: { code: 'UNAUTHENTICATED' }
      })
      
      return prisma.conversation.findMany({
        where: {
          userId,
          ...(npcId && { npcId }),
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
        include: {
          user: true,
          npc: true,
        },
      })
    },

    conversation: async (_: any, { id }: any, { prisma, userId }: Context) => {
      if (!userId) throw new GraphQLError('Must be authenticated', {
        extensions: { code: 'UNAUTHENTICATED' }
      })
      
      const conversation = await prisma.conversation.findUnique({
        where: { id },
        include: {
          user: true,
          npc: true,
        },
      })
      
      if (!conversation || conversation.userId !== userId) {
        throw new GraphQLError('Conversation not found or access denied', {
          extensions: { code: 'FORBIDDEN' }
        })
      }
      
      return conversation
    },

    relationships: async (_: any, args: any, { prisma, userId }: Context) => {
      if (!userId) throw new GraphQLError('Must be authenticated', {
        extensions: { code: 'UNAUTHENTICATED' }
      })
      
      return prisma.relationship.findMany({
        where: { userId },
        include: {
          user: true,
          npc: true,
        },
      })
    },

    relationship: async (_: any, { npcId }: any, { prisma, userId }: Context) => {
      if (!userId) throw new GraphQLError('Must be authenticated', {
        extensions: { code: 'UNAUTHENTICATED' }
      })
      
      return prisma.relationship.findUnique({
        where: {
          userId_npcId: {
            userId,
            npcId,
          },
        },
        include: {
          user: true,
          npc: true,
        },
      })
    },

    memoryFlowers: async (_: any, args: any, { prisma, userId }: Context) => {
      if (!userId) throw new GraphQLError('Must be authenticated', {
        extensions: { code: 'UNAUTHENTICATED' }
      })
      
      return prisma.memoryFlower.findMany({
        where: { userId },
        include: {
          user: true,
          npc: true,
          conversation: true,
        },
        orderBy: { createdAt: 'desc' },
      })
    },
  },

  Mutation: {
    sendMessage: async (_: any, { input }: any, { prisma, userId, io }: Context) => {
      if (!userId) throw new GraphQLError('Must be authenticated', {
        extensions: { code: 'UNAUTHENTICATED' }
      })
      
      const { npcId, content } = input
      
      try {
        // 儲存用戶訊息
        const userMessage = await prisma.conversation.create({
          data: {
            userId,
            npcId,
            content,
            speakerType: 'user',
          },
          include: {
            user: true,
            npc: true,
          },
        })

        // 獲取 NPC 資訊和關係狀態
        const npc = await prisma.nPC.findUnique({
          where: { id: npcId },
        })
        
        if (!npc) {
          throw new Error('NPC not found')
        }

        // 獲取或創建關係
        let relationship = await prisma.relationship.findUnique({
          where: {
            userId_npcId: {
              userId,
              npcId,
            },
          },
        })

        if (!relationship) {
          relationship = await prisma.relationship.create({
            data: {
              userId,
              npcId,
              relationshipLevel: 1,
              trustLevel: 0.1,
              affectionLevel: 0.1,
              totalInteractions: 0,
            },
          })
        }

        // 獲取最近對話歷史
        const recentMessages = await prisma.conversation.findMany({
          where: {
            userId,
            npcId,
          },
          orderBy: { timestamp: 'desc' },
          take: 10,
        })

        // 構建對話上下文
        const context = {
          recentMessages: recentMessages.map(msg => ({
            speaker: msg.speakerType as 'user' | 'npc',
            content: msg.content,
            timestamp: msg.timestamp,
          })),
          relationshipLevel: relationship.relationshipLevel,
          trustLevel: relationship.trustLevel,
          affectionLevel: relationship.affectionLevel,
        }

        // 發送給 Socket.IO 客戶端，表示 NPC 正在輸入
        io.emit('npc-typing', { npcId, isTyping: true })

        // 調用 Gemini AI 生成回應
        const aiResponse = await geminiService.generateNPCResponse(
          {
            id: npc.id,
            name: npc.name,
            personality: npc.personality,
            backgroundStory: npc.backgroundStory || undefined,
            currentMood: npc.currentMood,
          },
          content,
          context
        )

        // 儲存 NPC 回應
        const npcMessage = await prisma.conversation.create({
          data: {
            userId,
            npcId,
            content: aiResponse.content,
            speakerType: 'npc',
            emotionTag: aiResponse.emotionTag,
          },
          include: {
            user: true,
            npc: true,
          },
        })

        // 更新關係狀態
        const updatedRelationship = await prisma.relationship.update({
          where: {
            userId_npcId: {
              userId,
              npcId,
            },
          },
          data: {
            trustLevel: Math.min(1.0, relationship.trustLevel + aiResponse.relationshipImpact.trustChange),
            affectionLevel: Math.min(1.0, relationship.affectionLevel + aiResponse.relationshipImpact.affectionChange),
            relationshipLevel: Math.min(10, relationship.relationshipLevel + aiResponse.relationshipImpact.levelChange),
            totalInteractions: relationship.totalInteractions + 1,
            lastInteraction: new Date(),
          },
        })

        // 更新 NPC 情緒（如果有變化）
        if (aiResponse.moodChange && aiResponse.moodChange !== npc.currentMood) {
          await prisma.nPC.update({
            where: { id: npcId },
            data: { currentMood: aiResponse.moodChange },
          })

          // 廣播情緒變化
          io.emit('npc-mood-changed', {
            npcId,
            mood: aiResponse.moodChange,
          })
        }

        // 如果是重要對話，創建記憶花朵
        if (aiResponse.memoryFlowerData && 
            (updatedRelationship.relationshipLevel > relationship.relationshipLevel || 
             aiResponse.relationshipImpact.trustChange > 0.1)) {
          
          const memoryFlower = await prisma.memoryFlower.create({
            data: {
              userId,
              npcId,
              conversationId: npcMessage.id,
              flowerType: aiResponse.memoryFlowerData.flowerType,
              emotionColor: aiResponse.memoryFlowerData.emotionColor,
              positionX: Math.random() * 20 - 10, // 隨機位置
              positionY: 0,
              positionZ: Math.random() * 20 - 10,
              growthStage: 1,
            },
            include: {
              user: true,
              npc: true,
              conversation: true,
            },
          })

          // 廣播新的記憶花朵
          pubsub.publish('MEMORY_FLOWER_GROWN', { memoryFlowerGrown: memoryFlower })
        }

        // 停止輸入指示器並發送 NPC 回應
        io.emit('npc-typing', { npcId, isTyping: false })
        io.emit('npc-message', {
          id: npcMessage.id,
          npcId,
          content: aiResponse.content,
          timestamp: npcMessage.timestamp,
          emotionTag: aiResponse.emotionTag,
        })

        // 發布對話訂閱
        pubsub.publish('CONVERSATION_ADDED', {
          conversationAdded: npcMessage,
          npcId,
        })

        return {
          content: aiResponse.content,
          emotionTag: aiResponse.emotionTag,
          suggestedActions: aiResponse.suggestedActions,
          memoryFlowerData: aiResponse.memoryFlowerData,
          relationshipImpact: aiResponse.relationshipImpact,
        }

      } catch (error) {
        logger.error('Error in sendMessage:', error)
        
        // 發送錯誤時也要停止輸入指示器
        io.emit('npc-typing', { npcId, isTyping: false })
        
        throw new Error('Failed to process message')
      }
    },
  },

  Subscription: {
    conversationAdded: {
      subscribe: (_: any, { npcId }: any) => 
        pubsub.asyncIterator(['CONVERSATION_ADDED']),
      resolve: (payload: any, { npcId }: any) => {
        if (payload.npcId === npcId) {
          return payload.conversationAdded
        }
        return null
      },
    },

    memoryFlowerGrown: {
      subscribe: () => pubsub.asyncIterator(['MEMORY_FLOWER_GROWN']),
    },
  },

  // Type resolvers
  Conversation: {
    user: (parent: any, _: any, { prisma }: Context) =>
      prisma.user.findUnique({ where: { id: parent.userId } }),
    
    npc: (parent: any, _: any, { prisma }: Context) =>
      prisma.nPC.findUnique({ where: { id: parent.npcId } }),
  },

  Relationship: {
    user: (parent: any, _: any, { prisma }: Context) =>
      prisma.user.findUnique({ where: { id: parent.userId } }),
    
    npc: (parent: any, _: any, { prisma }: Context) =>
      prisma.nPC.findUnique({ where: { id: parent.npcId } }),
  },

  MemoryFlower: {
    user: (parent: any, _: any, { prisma }: Context) =>
      prisma.user.findUnique({ where: { id: parent.userId } }),
    
    npc: (parent: any, _: any, { prisma }: Context) =>
      prisma.nPC.findUnique({ where: { id: parent.npcId } }),
    
    conversation: (parent: any, _: any, { prisma }: Context) =>
      prisma.conversation.findUnique({ where: { id: parent.conversationId } }),
    
    position: (parent: any) => ({
      x: parent.positionX,
      y: parent.positionY,
      z: parent.positionZ,
    }),
  },
}