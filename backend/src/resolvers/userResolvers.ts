import { GraphQLError } from 'graphql'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { Context } from '../context'

export const userResolvers = {
  Query: {
    me: async (_: any, args: any, { prisma, userId }: Context) => {
      if (!userId) throw new GraphQLError('Must be authenticated', {
        extensions: { code: 'UNAUTHENTICATED' }
      })
      
      return prisma.user.findUnique({
        where: { id: userId },
        include: {
          relationships: {
            include: { npc: true }
          },
          conversations: {
            include: { npc: true }
          },
          memoryFlowers: {
            include: { npc: true, conversation: true }
          },
          diaryEntries: true,
          worldState: true,
        }
      })
    },

    diaryEntries: async (_: any, args: any, { prisma, userId }: Context) => {
      if (!userId) throw new GraphQLError('Must be authenticated', {
        extensions: { code: 'UNAUTHENTICATED' }
      })
      
      return prisma.diaryEntry.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: { user: true }
      })
    },

    letters: async (_: any, { unreadOnly = false }: any, { prisma, userId }: Context) => {
      if (!userId) throw new GraphQLError('Must be authenticated', {
        extensions: { code: 'UNAUTHENTICATED' }
      })
      
      return prisma.letter.findMany({
        where: {
          recipientType: 'user',
          recipientId: userId,
          ...(unreadOnly && { isRead: false })
        },
        orderBy: { sentAt: 'desc' }
      })
    },

    worldState: async (_: any, args: any, { prisma, userId }: Context) => {
      if (!userId) throw new GraphQLError('Must be authenticated', {
        extensions: { code: 'UNAUTHENTICATED' }
      })
      
      let worldState = await prisma.worldState.findUnique({
        where: { userId },
        include: { user: true }
      })

      // 如果不存在世界狀態，創建默認的
      if (!worldState) {
        worldState = await prisma.worldState.create({
          data: {
            userId,
            weather: 'sunny',
            timeOfDay: 12,
            season: 'spring',
            specialEvents: []
          },
          include: { user: true }
        })
      }

      return worldState
    },
  },

  Mutation: {
    register: async (_: any, { input }: any, { prisma }: Context) => {
      const { username, email, password } = input

      // 檢查用戶是否已存在
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { username }
          ]
        }
      })

      if (existingUser) {
        throw new GraphQLError('User already exists with this email or username', {
          extensions: { code: 'BAD_USER_INPUT' }
        })
      }

      // 密碼哈希
      const passwordHash = await bcrypt.hash(password, 12)

      // 創建用戶
      const user = await prisma.user.create({
        data: {
          username,
          email,
          passwordHash,
        }
      })

      // 創建默認世界狀態
      await prisma.worldState.create({
        data: {
          userId: user.id,
          weather: 'sunny',
          timeOfDay: 12,
          season: 'spring',
          specialEvents: []
        }
      })

      // 生成 JWT token
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET || 'default-secret',
        { expiresIn: '7d' }
      )

      return {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt,
          isActive: user.isActive,
        }
      }
    },

    login: async (_: any, { input }: any, { prisma }: Context) => {
      const { email, password } = input

      // 查找用戶
      const user = await prisma.user.findUnique({
        where: { email }
      })

      if (!user) {
        throw new GraphQLError('Invalid email or password', {
          extensions: { code: 'BAD_USER_INPUT' }
        })
      }

      // 驗證密碼
      const validPassword = await bcrypt.compare(password, user.passwordHash)
      if (!validPassword) {
        throw new GraphQLError('Invalid email or password', {
          extensions: { code: 'BAD_USER_INPUT' }
        })
      }

      // 更新最後登入時間
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      })

      // 生成 JWT token
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET || 'default-secret',
        { expiresIn: '7d' }
      )

      return {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt,
          lastLogin: new Date(),
          isActive: user.isActive,
        }
      }
    },

    logout: async (_: any, args: any, { userId }: Context) => {
      if (!userId) throw new GraphQLError('Must be authenticated', {
        extensions: { code: 'UNAUTHENTICATED' }
      })
      
      // 在實際實現中，你可能想要將 token 加入黑名單
      // 或者使用 Redis 來管理用戶會話
      
      return true
    },

    createDiaryEntry: async (_: any, { input }: any, { prisma, userId }: Context) => {
      if (!userId) throw new GraphQLError('Must be authenticated', {
        extensions: { code: 'UNAUTHENTICATED' }
      })
      
      return prisma.diaryEntry.create({
        data: {
          ...input,
          userId,
        },
        include: { user: true }
      })
    },

    updateDiaryEntry: async (_: any, { id, input }: any, { prisma, userId }: Context) => {
      if (!userId) throw new GraphQLError('Must be authenticated', {
        extensions: { code: 'UNAUTHENTICATED' }
      })
      
      const entry = await prisma.diaryEntry.findUnique({
        where: { id }
      })

      if (!entry || entry.userId !== userId) {
        throw new GraphQLError('Diary entry not found or access denied', {
          extensions: { code: 'BAD_USER_INPUT' }
        })
      }

      return prisma.diaryEntry.update({
        where: { id },
        data: input,
        include: { user: true }
      })
    },

    deleteDiaryEntry: async (_: any, { id }: any, { prisma, userId }: Context) => {
      if (!userId) throw new GraphQLError('Must be authenticated', {
        extensions: { code: 'UNAUTHENTICATED' }
      })
      
      const entry = await prisma.diaryEntry.findUnique({
        where: { id }
      })

      if (!entry || entry.userId !== userId) {
        throw new GraphQLError('Diary entry not found or access denied', {
          extensions: { code: 'BAD_USER_INPUT' }
        })
      }

      await prisma.diaryEntry.delete({
        where: { id }
      })

      return true
    },

    markLetterAsRead: async (_: any, { id }: any, { prisma, userId }: Context) => {
      if (!userId) throw new GraphQLError('Must be authenticated', {
        extensions: { code: 'UNAUTHENTICATED' }
      })
      
      const letter = await prisma.letter.findUnique({
        where: { id }
      })

      if (!letter || letter.recipientId !== userId) {
        throw new GraphQLError('Letter not found or access denied', {
          extensions: { code: 'BAD_USER_INPUT' }
        })
      }

      return prisma.letter.update({
        where: { id },
        data: {
          isRead: true,
          readAt: new Date()
        }
      })
    },

    updateWorldState: async (_: any, { input }: any, { prisma, userId }: Context) => {
      if (!userId) throw new GraphQLError('Must be authenticated', {
        extensions: { code: 'UNAUTHENTICATED' }
      })
      
      return prisma.worldState.upsert({
        where: { userId },
        update: {
          ...input,
          lastUpdated: new Date()
        },
        create: {
          userId,
          weather: input.weather || 'sunny',
          timeOfDay: input.timeOfDay || 12,
          season: input.season || 'spring',
          specialEvents: input.specialEvents || [],
          lastUpdated: new Date()
        },
        include: { user: true }
      })
    },

    updateWishProgress: async (_: any, { wishId, progress, notes }: any, { prisma, userId }: Context) => {
      if (!userId) throw new GraphQLError('Must be authenticated', {
        extensions: { code: 'UNAUTHENTICATED' }
      })
      
      return prisma.userWishProgress.upsert({
        where: {
          userId_wishId: {
            userId,
            wishId
          }
        },
        update: {
          progress,
          notes,
          lastUpdated: new Date()
        },
        create: {
          userId,
          wishId,
          progress,
          notes
        },
        include: {
          user: true,
          wish: {
            include: {
              npc: true
            }
          }
        }
      })
    },
  },

  // Type resolvers
  User: {
    relationships: (parent: any, _: any, { prisma }: Context) =>
      prisma.relationship.findMany({
        where: { userId: parent.id },
        include: { npc: true }
      }),
    
    conversations: (parent: any, _: any, { prisma }: Context) =>
      prisma.conversation.findMany({
        where: { userId: parent.id },
        include: { npc: true },
        orderBy: { timestamp: 'desc' }
      }),
    
    memoryFlowers: (parent: any, _: any, { prisma }: Context) =>
      prisma.memoryFlower.findMany({
        where: { userId: parent.id },
        include: { npc: true, conversation: true }
      }),
    
    diaryEntries: (parent: any, _: any, { prisma }: Context) =>
      prisma.diaryEntry.findMany({
        where: { userId: parent.id },
        orderBy: { createdAt: 'desc' }
      }),
    
    worldState: (parent: any, _: any, { prisma }: Context) =>
      prisma.worldState.findUnique({
        where: { userId: parent.id }
      }),
  },
}