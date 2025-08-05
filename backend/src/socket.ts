import { Server, Socket } from 'socket.io'
import { PrismaClient } from '@prisma/client'
import Redis from 'ioredis'
import { logger } from './utils/logger'

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

    // 處理用戶消息（這裡主要是為了即時性，實際的AI處理在GraphQL resolver中）
    socket.on('user-message', async ({ npcId, content }) => {
      try {
        // 廣播用戶開始輸入（可選）
        socket.broadcast.emit('user-typing', { 
          socketId: socket.id, 
          npcId, 
          isTyping: true 
        })

        // 這裡可以添加一些即時驗證邏輯
        logger.info(`User message to NPC ${npcId}: ${content.substring(0, 50)}...`)
        
        // 實際的消息處理會在 GraphQL mutation 中進行
        
      } catch (error) {
        logger.error('Error handling user message:', error)
        socket.emit('error', { message: 'Failed to process message' })
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