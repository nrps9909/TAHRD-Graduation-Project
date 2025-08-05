import { Server, Socket } from 'socket.io'
import { PrismaClient } from '@prisma/client'
import Redis from 'ioredis'
import { logger } from './utils/logger'
import { conversationResolvers } from './resolvers/conversationResolvers'

export const socketHandler = (io: Server, prisma: PrismaClient, redis: Redis) => {
  io.on('connection', (socket: Socket) => {
    logger.info(`Client connected: ${socket.id}`)

    // 用戶加入房間（通常是以用戶ID為房間名）
    socket.on('join-room', ({ roomId }) => {
      socket.join(roomId)
      logger.info(`Socket ${socket.id} joined room: ${roomId}`)
    })

    // 用戶離開房間
    socket.on('leave-room', ({ roomId }) => {
      socket.leave(roomId)
      logger.info(`Socket ${socket.id} left room: ${roomId}`)
    })

    // 處理用戶消息 - 直接調用 GraphQL resolver
    socket.on('user-message', async ({ npcId, content }) => {
      try {
        // 基本驗證
        if (!npcId || !content || !content.trim()) {
          socket.emit('error', { message: 'Invalid message data' })
          return
        }

        logger.info(`Guest user message to NPC ${npcId}: ${content.substring(0, 50)}...`)
        
        // 確保 guest user 存在
        let guestUser = await prisma.user.findUnique({
          where: { username: 'guest' }
        })
        
        if (!guestUser) {
          guestUser = await prisma.user.create({
            data: {
              username: 'guest',
              email: 'guest@example.com',
              passwordHash: 'dummy-hash',
            }
          })
          logger.info('Created guest user for demo purposes')
        }
        
        // 創建 GraphQL context
        const context = {
          prisma,
          userId: guestUser.id,
          io,
          redis
        }

        // 直接調用 sendMessage resolver
        const result = await conversationResolvers.Mutation.sendMessage(
          null,
          { input: { npcId, content } },
          context
        )

        logger.info('Message processed successfully', { npcId, userId: guestUser.id })
        
      } catch (error) {
        logger.error('Error handling user message:', error)
        socket.emit('error', { message: 'Failed to process message' })
        
        // 確保停止輸入指示器
        io.emit('npc-typing', { npcId, isTyping: false })
      }
    })

    // 處理用戶輸入狀態
    socket.on('typing', ({ npcId, isTyping }) => {
      socket.broadcast.emit('user-typing', { 
        socketId: socket.id, 
        npcId, 
        isTyping 
      })
    })

    // 心跳檢測
    socket.on('ping', () => {
      socket.emit('pong')
    })

    // 處理斷線
    socket.on('disconnect', (reason) => {
      logger.info(`Client disconnected: ${socket.id}, reason: ${reason}`)
    })

    // 錯誤處理
    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id}:`, error)
    })
  })

  // 定期清理非活躍連接
  setInterval(() => {
    const connectedSockets = io.sockets.sockets.size
    logger.debug(`Active connections: ${connectedSockets}`)
  }, 30000) // 每30秒記錄一次連接數
}