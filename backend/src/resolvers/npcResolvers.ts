import { Context } from '../context'
import { personalityLoader } from '../services/npcPersonalityLoader'

export const npcResolvers = {
  Query: {
    npcs: async (_: any, args: any, { prisma }: Context) => {
      const npcs = await prisma.nPC.findMany({
        orderBy: { name: 'asc' }
      })
      
      // 補充真實的個性資料
      return npcs.map(npc => {
        const personalityData = personalityLoader.getPersonality(npc.id)
        if (personalityData) {
          return {
            ...npc,
            personality: personalityData.personality || npc.personality,
            backgroundStory: personalityData.backgroundStory || npc.backgroundStory
          }
        }
        return npc
      })
    },

    npc: async (_: any, { id }: any, { prisma }: Context) => {
      const npc = await prisma.nPC.findUnique({
        where: { id }
      })
      
      if (!npc) return null
      
      // 補充真實的個性資料
      const personalityData = personalityLoader.getPersonality(id)
      if (personalityData) {
        return {
          ...npc,
          personality: personalityData.personality || npc.personality,
          backgroundStory: personalityData.backgroundStory || npc.backgroundStory
        }
      }
      
      return npc
    },

    wishes: async (_: any, args: any, { prisma, userId }: Context) => {
      return prisma.wish.findMany({
        include: {
          npc: true,
          userProgress: userId ? {
            where: { userId }
          } : false
        },
        orderBy: { priority: 'desc' }
      })
    },

    npcWishes: async (_: any, { npcId }: any, { prisma, userId }: Context) => {
      return prisma.wish.findMany({
        where: { npcId },
        include: {
          npc: true,
          userProgress: userId ? {
            where: { userId }
          } : false
        },
        orderBy: { priority: 'desc' }
      })
    },
  },

  // Type resolvers
  NPC: {
    location: (parent: any) => ({
      x: parent.locationX,
      y: parent.locationY,
      z: parent.locationZ,
    }),

    relationships: (parent: any, _: any, { prisma, userId }: Context) => {
      if (!userId) return []
      
      return prisma.relationship.findMany({
        where: {
          npcId: parent.id,
          userId
        },
        include: { user: true }
      })
    },

    conversations: (parent: any, _: any, { prisma, userId }: Context) => {
      if (!userId) return []
      
      return prisma.conversation.findMany({
        where: {
          npcId: parent.id,
          userId
        },
        include: { user: true },
        orderBy: { timestamp: 'desc' },
        take: 50 // 限制返回最近50條對話
      })
    },

    wishes: (parent: any, _: any, { prisma }: Context) =>
      prisma.wish.findMany({
        where: { npcId: parent.id },
        orderBy: { priority: 'desc' }
      }),
  },

  Wish: {
    npc: (parent: any, _: any, { prisma }: Context) =>
      prisma.nPC.findUnique({
        where: { id: parent.npcId }
      }),

    userProgress: (parent: any, _: any, { prisma, userId }: Context) => {
      if (!userId) return []
      
      return prisma.userWishProgress.findMany({
        where: {
          wishId: parent.id,
          userId
        },
        include: { user: true }
      })
    },
  },

  UserWishProgress: {
    user: (parent: any, _: any, { prisma }: Context) =>
      prisma.user.findUnique({
        where: { id: parent.userId }
      }),

    wish: (parent: any, _: any, { prisma }: Context) =>
      prisma.wish.findUnique({
        where: { id: parent.wishId },
        include: { npc: true }
      }),
  },
}