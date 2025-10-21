import { GraphQLError } from 'graphql'
import { Context } from '../context'
import * as bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'
import { logger } from '../utils/logger'
import { categoryInitService } from '../services/categoryInitService'
import { getConfig } from '../utils/config'

const config = getConfig()
const JWT_SECRET = config.jwtSecret
const JWT_EXPIRES_IN = config.jwtExpiresIn

export const authResolvers = {
  Mutation: {
    /**
     * 註冊新用戶
     */
    register: async (
      _: any,
      { input }: { input: { username: string; email: string; password: string; displayName?: string } },
      { prisma }: Context
    ) => {
      try {
        // 驗證輸入
        if (!input.username || input.username.length < 3) {
          throw new GraphQLError('Username must be at least 3 characters long')
        }

        if (!input.email || !input.email.includes('@')) {
          throw new GraphQLError('Valid email is required')
        }

        if (!input.password || input.password.length < 6) {
          throw new GraphQLError('Password must be at least 6 characters long')
        }

        // 檢查用戶名是否已存在
        const existingUsername = await prisma.user.findUnique({
          where: { username: input.username }
        })

        if (existingUsername) {
          throw new GraphQLError('Username already exists')
        }

        // 檢查郵箱是否已存在
        const existingEmail = await prisma.user.findUnique({
          where: { email: input.email }
        })

        if (existingEmail) {
          throw new GraphQLError('Email already exists')
        }

        // 加密密碼
        const passwordHash = await bcrypt.hash(input.password, 10)

        // 創建用戶
        const user = await prisma.user.create({
          data: {
            username: input.username,
            email: input.email,
            passwordHash,
            displayName: input.displayName || input.username,
            isActive: true,
            lastLogin: new Date()
          },
          select: {
            id: true,
            username: true,
            email: true,
            displayName: true,
            avatarUrl: true,
            isActive: true,
            createdAt: true,
            updatedAt: true
          }
        })

        // 生成 JWT token
        const token = jwt.sign(
          { userId: user.id, username: user.username },
          config.jwtSecret,
          { expiresIn: config.jwtExpiresIn } as jwt.SignOptions
        )

        logger.info(`User registered: ${user.username} (${user.id})`)

        // 自動初始化分類系統（5個島嶼 + 7個小類別）
        try {
          await categoryInitService.initializeDefaultCategories(user.id)
          logger.info(`[Auth] 已為新用戶 ${user.username} 初始化分類系統`)
        } catch (error) {
          logger.error(`[Auth] 初始化分類系統失敗:`, error)
          // 不阻擋註冊流程，只記錄錯誤
        }

        return {
          token,
          user
        }
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error
        }
        logger.error('Registration failed:', error)
        throw new GraphQLError('Registration failed: ' + (error as Error).message)
      }
    },

    /**
     * 用戶登入
     */
    login: async (
      _: any,
      { input }: { input: { email: string; password: string } },
      { prisma }: Context
    ) => {
      try {
        // 驗證輸入
        if (!input.email || !input.password) {
          throw new GraphQLError('Email and password are required')
        }

        // 查找用戶
        const user = await prisma.user.findUnique({
          where: { email: input.email }
        })

        if (!user) {
          throw new GraphQLError('Invalid email or password')
        }

        // 檢查用戶是否啟用
        if (!user.isActive) {
          throw new GraphQLError('Account is disabled')
        }

        // 驗證密碼
        const isValidPassword = await bcrypt.compare(input.password, user.passwordHash)

        if (!isValidPassword) {
          throw new GraphQLError('Invalid email or password')
        }

        // 更新最後登入時間
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() }
        })

        // 生成 JWT token
        const token = jwt.sign(
          { userId: user.id, username: user.username },
          config.jwtSecret,
          { expiresIn: config.jwtExpiresIn } as jwt.SignOptions
        )

        logger.info(`User logged in: ${user.username} (${user.id})`)

        return {
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            isActive: user.isActive,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
          }
        }
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error
        }
        logger.error('Login failed:', error)
        throw new GraphQLError('Login failed: ' + (error as Error).message)
      }
    },

    /**
     * 用戶登出（前端處理 token 清除）
     */
    logout: async (
      _: any,
      __: any,
      { userId }: Context
    ) => {
      if (!userId) {
        throw new GraphQLError('Must be authenticated', {
          extensions: { code: 'UNAUTHENTICATED' }
        })
      }

      logger.info(`User logged out: ${userId}`)

      // 由於使用 JWT，登出主要在前端處理（刪除 token）
      // 後端可以選擇將 token 加入黑名單（需要 Redis）
      // 這裡簡單返回成功
      return true
    }
  }
}
