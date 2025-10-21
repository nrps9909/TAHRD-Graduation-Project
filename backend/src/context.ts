import { PrismaClient } from '@prisma/client'
import { Server } from 'socket.io'
import Redis from 'ioredis'
import * as jwt from 'jsonwebtoken'
import { getConfig } from './utils/config'

const config = getConfig()

export interface Context {
  prisma: PrismaClient
  redis: Redis
  io: Server
  userId?: string
  user?: any
}

interface CreateContextArgs {
  req: any
  prisma: PrismaClient
  redis: Redis
  io: Server
}

export const createContext = async ({ req, prisma, redis, io }: CreateContextArgs): Promise<Context> => {
  let userId: string | undefined
  let user: any

  // 從請求頭中提取 JWT token
  const authHeader = req.headers.authorization
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '')

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as any
      userId = decoded.userId

      if (userId) {
        user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            username: true,
            email: true,
            isActive: true,
            createdAt: true,
            lastLogin: true,
          }
        })
      }
    } catch (error) {
      // Token 無效或過期，但不拋出錯誤，讓解析器處理
      console.log('Invalid token:', error)
    }
  }

  // 🔧 開發環境：自動創建或獲取測試用戶（僅限開發環境）
  if (config.nodeEnv === 'development' && !userId) {
    try {
      // 嘗試獲取或創建測試用戶
      let testUser = await prisma.user.findUnique({
        where: { username: 'dev_user' }
      })

      if (!testUser) {
        logger.info('🔧 [DEV] Creating test user...')
        testUser = await prisma.user.create({
          data: {
            username: 'dev_user',
            email: 'dev@test.com',
            passwordHash: 'dev_only_hash',
            displayName: '開發測試用戶',
            isActive: true
          }
        })
        logger.info('✅ [DEV] Test user created:', testUser.id)
      }

      userId = testUser.id
      user = testUser
    } catch (error) {
      logger.error('⚠️ [DEV] Failed to create test user:', error)
    }
  } else if (config.nodeEnv === 'production' && !userId) {
    // 生產環境：確保沒有自動創建用戶
    logger.debug('[PROD] No authentication token provided')
  }

  return {
    prisma,
    redis,
    io,
    userId,
    user,
  }
}
