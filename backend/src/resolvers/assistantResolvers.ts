import { GraphQLError } from 'graphql'
import { Context } from '../context'
import { assistantService } from '../services/assistantService'
import { chiefAgentService } from '../services/chiefAgentService'
import { AssistantType } from '@prisma/client'

export const assistantResolvers = {
  Query: {
    /**
     * 獲取所有助手
     */
    assistants: async () => {
      try {
        return await assistantService.getAllAssistants()
      } catch (error) {
        throw new GraphQLError('Failed to fetch assistants')
      }
    },

    /**
     * 根據 ID 獲取助手
     */
    assistant: async (_: any, { id }: { id: string }) => {
      try {
        const assistant = await assistantService.getAssistantById(id)
        if (!assistant) {
          throw new GraphQLError('Assistant not found')
        }
        return assistant
      } catch (error) {
        throw new GraphQLError('Failed to fetch assistant')
      }
    },

    /**
     * 根據類型獲取助手
     */
    assistantByType: async (_: any, { type }: { type: AssistantType }) => {
      try {
        const assistant = await assistantService.getAssistantByType(type)
        if (!assistant) {
          throw new GraphQLError(`Assistant not found for type: ${type}`)
        }
        return assistant
      } catch (error) {
        throw new GraphQLError('Failed to fetch assistant by type')
      }
    },

    /**
     * 獲取 Chief 助手
     */
    chiefAssistant: async () => {
      try {
        const chief = await assistantService.getChiefAssistant()
        if (!chief) {
          throw new GraphQLError('Chief assistant not found')
        }
        return chief
      } catch (error) {
        throw new GraphQLError('Failed to fetch chief assistant')
      }
    },

    /**
     * 智能分類內容
     */
    classifyContent: async (_: any, { content }: { content: string }) => {
      try {
        return await chiefAgentService.classifyContent(content)
      } catch (error) {
        throw new GraphQLError('Failed to classify content: ' + (error as Error).message)
      }
    },

    /**
     * 獲取 Chief 摘要
     */
    chiefSummary: async (_: any, { days = 7 }: { days?: number }, { userId }: Context) => {
      if (!userId) {
        throw new GraphQLError('Must be authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }

      try {
        return await chiefAgentService.generateSummary(userId, days)
      } catch (error) {
        throw new GraphQLError('Failed to generate summary: ' + (error as Error).message)
      }
    }
  },

  Mutation: {
    /**
     * 分類並創建記憶（一步完成）
     */
    classifyAndCreate: async (_: any, { content }: { content: string }, { userId }: Context) => {
      if (!userId) {
        throw new GraphQLError('Must be authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }

      try {
        return await chiefAgentService.classifyAndCreate(userId, content)
      } catch (error) {
        throw new GraphQLError('Failed to classify and create: ' + (error as Error).message)
      }
    },

    /**
     * 更新助手配置（顏色、外觀等）
     */
    updateAssistant: async (
      _: any,
      {
        id,
        color,
        modelUrl,
        textureId,
        shape,
        customShapeData,
        islandHeight,
        islandBevel
      }: {
        id: string
        color?: string
        modelUrl?: string
        textureId?: string
        shape?: string
        customShapeData?: string
        islandHeight?: number
        islandBevel?: number
      },
      { prisma }: Context
    ) => {
      try {
        const updateData: any = {}

        if (color !== undefined) {
          updateData.color = color
        }

        if (modelUrl !== undefined) {
          updateData.modelUrl = modelUrl
        }

        if (textureId !== undefined) {
          updateData.textureId = textureId
        }

        if (shape !== undefined) {
          updateData.shape = shape
        }

        if (customShapeData !== undefined) {
          updateData.customShapeData = customShapeData
        }

        if (islandHeight !== undefined) {
          updateData.islandHeight = islandHeight
        }

        if (islandBevel !== undefined) {
          updateData.islandBevel = islandBevel
        }

        const assistant = await prisma.assistant.update({
          where: { id },
          data: {
            ...updateData,
            updatedAt: new Date()
          }
        })

        console.log('✅ Assistant updated:', {
          id,
          color,
          modelUrl,
          textureId,
          shape,
          customShapeData: customShapeData ? 'custom shape saved' : undefined,
          islandHeight,
          islandBevel
        })
        return assistant
      } catch (error) {
        console.error('❌ Failed to update assistant:', error)
        throw new GraphQLError('Failed to update assistant: ' + (error as Error).message)
      }
    }
  },

  // Type Resolvers
  Assistant: {
    position: (parent: any) => ({
      x: parent.positionX,
      y: parent.positionY,
      z: parent.positionZ
    }),

    memories: async (parent: any, _: any, { prisma }: Context) => {
      // FIXME: Need proper island ID mapping
      return prisma.memory.findMany({
        where: { islandId: "PLACEHOLDER" },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    },

    chatMessages: async (parent: any, _: any, { prisma }: Context) => {
      // FIXME: Need proper island ID mapping
      return prisma.chatMessage.findMany({
        where: { islandId: "PLACEHOLDER" },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    }
  }
}
