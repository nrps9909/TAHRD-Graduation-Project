import { Server, Socket } from 'socket.io'
import { PrismaClient } from '@prisma/client'
import Redis from 'ioredis'
import { logger } from './utils/logger'
import { taskQueueService } from './services/taskQueueService'
// Legacy imports - disabled for new architecture
// import { conversationResolvers } from './resolvers/conversationResolvers'
// import { npcInteractionService } from './services/npcInteractionService'

export const socketHandler = (io: Server, prisma: PrismaClient, redis: Redis) => {
  // Legacy NPC conversation listeners - disabled for new architecture
  // npcInteractionService.on('npcMessage', (data) => {
  //   io.emit('npc-conversation', {
  //     type: 'message',
  //     speakerId: data.speakerId,
  //     speakerName: data.speakerName,
  //     listenerId: data.listenerId,
  //     listenerName: data.listenerName,
  //     content: data.content,
  //     emotion: data.emotion,
  //     topic: data.topic,
  //     timestamp: new Date()
  //   })
  //   logger.info(`NPC Conversation: ${data.speakerName} -> ${data.listenerName}: ${data.content.substring(0, 50)}...`)
  // })

  // npcInteractionService.on('conversationEnded', (data) => {
  //   io.emit('npc-conversation', {
  //     type: 'ended',
  //     npc1: data.npc1,
  //     npc2: data.npc2,
  //     topic: data.topic,
  //     messageCount: data.messages.length
  //   })
  //   logger.info(`NPC Conversation ended between ${data.npc1} and ${data.npc2} on topic: ${data.topic}`)
  // })
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

        // Legacy: 直接調用 sendMessage resolver - disabled for new architecture
        // const result = await conversationResolvers.Mutation.sendMessage(
        //   null,
        //   { input: { npcId, content } },
        //   context
        // )

        logger.info('Message received (legacy handler disabled)', { npcId, userId: guestUser.id })
        socket.emit('info', { message: 'Legacy conversation system disabled - use new GraphQL API' })
        
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

    // 手動觸發NPC對話 - disabled for new architecture
    socket.on('trigger-npc-conversation', async ({ npc1Id, npc2Id, topic }) => {
      // Legacy feature disabled
      socket.emit('info', { message: 'Legacy NPC conversation system disabled' })
      // try {
      //   const result = await npcInteractionService.triggerConversation(npc1Id, npc2Id, topic)
      //   if (result.success) {
      //     socket.emit('npc-conversation-started', { npc1Id, npc2Id, topic: topic || 'random' })
      //   } else {
      //     socket.emit('error', { message: result.message || 'Failed to start conversation' })
      //   }
      // } catch (error) {
      //   logger.error('Error triggering NPC conversation:', error)
      //   socket.emit('error', { message: 'Failed to trigger conversation' })
      // }
    })

    // 獲取當前活躍的NPC對話 - disabled for new architecture
    socket.on('get-active-npc-conversations', () => {
      // Legacy feature disabled
      socket.emit('active-npc-conversations', [])
      // const active = npcInteractionService.getActiveConversations()
      // socket.emit('active-npc-conversations', active)
    })

    // 獲取任務隊列狀態（用戶專屬）
    socket.on('get-queue-stats', (data) => {
      const userId = data?.userId
      if (!userId) {
        // 如果沒有提供 userId，返回全局統計（向後兼容）
        const stats = taskQueueService.getStats()
        socket.emit('queue-stats', stats)
      } else {
        // 返回用戶專屬統計
        const userStats = taskQueueService.getUserStats(userId)
        socket.emit('queue-stats', userStats)
      }
    })

    // 獲取用戶的任務列表
    socket.on('get-user-tasks', (data) => {
      const userId = data?.userId
      if (!userId) {
        socket.emit('error', { message: 'User ID required' })
        return
      }
      const tasks = taskQueueService.getUserTasks(userId)
      socket.emit('user-tasks', tasks)
    })

    // 獲取特定任務狀態
    socket.on('get-task-status', (data) => {
      const { taskId, userId } = data || {}
      if (!taskId || !userId) {
        socket.emit('error', { message: 'Task ID and User ID required' })
        return
      }
      const task = taskQueueService.getTaskStatus(taskId, userId)
      socket.emit('task-status', task)
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