/**
 * 優化版本的服務器入口
 * 使用直接 API 調用替代 Python CLI，實現低延遲的 AI NPC 元宇宙
 */

import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'
import { logger } from './utils/logger'
import { geminiServiceV2 } from './services/geminiServiceV2'
import { performanceMonitor, performanceMiddleware } from './utils/performanceMonitor'
import { OptimizedDBQueries } from './utils/dbOptimization'
import { v4 as uuidv4 } from 'uuid'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
})

const prisma = new PrismaClient()
const dbQueries = new OptimizedDBQueries(prisma)

// 中間件
app.use(cors())
app.use(express.json())
app.use(performanceMiddleware())

// 健康檢查
app.get('/health', (req, res) => {
  const stats = performanceMonitor.getStats()
  res.json({
    status: 'healthy',
    performance: stats,
    timestamp: new Date().toISOString()
  })
})

// WebSocket 連接處理
io.on('connection', (socket) => {
  logger.info(`新用戶連接: ${socket.id}`)
  
  // 處理用戶訊息（優化版本）
  socket.on('user-message', async (data) => {
    const requestId = uuidv4()
    const perf = performanceMonitor.startTracking(requestId, data.userId || 'guest', data.npcId)
    
    try {
      const { npcId, content, userId = 'guest-user' } = data
      
      // 標記收到訊息
      performanceMonitor.mark(requestId, 'socketReceived')
      
      // 發送輸入中狀態
      socket.emit('npc-typing', { npcId, isTyping: true })
      
      // 批次查詢資料庫（優化查詢）
      performanceMonitor.mark(requestId, 'dbQueryStart')
      const npcWithContext = await dbQueries.getNPCWithFullContext(npcId, userId)
      performanceMonitor.mark(requestId, 'dbQueryEnd')
      
      if (!npcWithContext) {
        throw new Error(`NPC ${npcId} not found`)
      }
      
      // 準備會話上下文
      const sessionMessages = npcWithContext.relationships[0]?.conversations[0]?.messages.map(msg => ({
        speaker: msg.speaker === userId ? 'user' as const : 'npc' as const,
        content: msg.content,
        timestamp: msg.timestamp
      })) || []
      
      // 獲取共享記憶（從新的記憶系統）
      const sharedMemories = await prisma.$queryRaw<any[]>`
        SELECT content FROM "SharedMemory" 
        WHERE ${npcId} = ANY(participants)
        ORDER BY importance DESC, "createdAt" DESC
        LIMIT 5
      `
      
      const otherNPCMemories = await prisma.$queryRaw<any[]>`
        SELECT content FROM "SharedMemory"
        WHERE ${npcId} != ALL(participants)
        AND ${userId} = ANY(participants)
        ORDER BY "createdAt" DESC
        LIMIT 3
      `
      
      // 構建完整的對話上下文
      const context = {
        sessionMessages: [...sessionMessages, {
          speaker: 'user' as const,
          content,
          timestamp: new Date()
        }],
        relevantMemories: sharedMemories,
        otherNPCMemories: otherNPCMemories,
        relationshipLevel: npcWithContext.relationships[0]?.level || 1,
        trustLevel: npcWithContext.relationships[0]?.trustLevel || 0.5,
        affectionLevel: npcWithContext.relationships[0]?.affectionLevel || 0.5
      }
      
      // 調用優化的 AI 服務（直接 API，無 Python CLI）
      performanceMonitor.mark(requestId, 'aiCallStart')
      const aiResponse = await geminiServiceV2.generateNPCResponse(
        {
          id: npcWithContext.id,
          name: npcWithContext.name,
          personality: npcWithContext.personality,
          currentMood: npcWithContext.currentMood || 'neutral'
        },
        content,
        context
      )
      performanceMonitor.mark(requestId, 'aiCallEnd')
      
      // 儲存對話到資料庫
      const conversation = await prisma.conversation.create({
        data: {
          userId,
          npcId,
          messages: {
            create: [
              {
                speaker: userId,
                content,
                timestamp: new Date()
              },
              {
                speaker: npcId,
                content: aiResponse.content,
                emotionTag: aiResponse.emotionTag,
                timestamp: new Date()
              }
            ]
          }
        }
      })
      
      // 更新關係狀態
      if (aiResponse.relationshipImpact) {
        await prisma.relationship.updateMany({
          where: { userId, npcId },
          data: {
            trustLevel: { increment: aiResponse.relationshipImpact.trustChange },
            affectionLevel: { increment: aiResponse.relationshipImpact.affectionChange },
            level: { increment: aiResponse.relationshipImpact.levelChange }
          }
        })
      }
      
      // 儲存重要記憶
      if (aiResponse.memoryToStore && aiResponse.memoryToStore.importance > 0.7) {
        const memoryId = uuidv4()
        await prisma.$executeRaw`
          INSERT INTO "SharedMemory" (
            id, type, content, importance, participants, "createdAt"
          )
          VALUES (
            ${memoryId},
            'player_interaction',
            ${aiResponse.memoryToStore.content},
            ${aiResponse.memoryToStore.importance},
            ARRAY[${userId}, ${npcId}]::TEXT[],
            NOW()
          )
        `
        
        // 通知所有 NPC
        const allNpcIds = ['npc-1', 'npc-2', 'npc-3']
        for (const notifyNpcId of allNpcIds) {
          await prisma.$executeRaw`
            INSERT INTO "NPCMemoryAccess" (
              id, "npcId", "memoryId", "accessLevel"
            )
            VALUES (
              ${uuidv4()},
              ${notifyNpcId},
              ${memoryId},
              ${notifyNpcId === npcId ? 'experienced' : 'heard'}
            )
            ON CONFLICT DO NOTHING
          `
        }
      }
      
      // 發送回應
      socket.emit('npc-message', {
        npcId,
        content: aiResponse.content,
        emotionTag: aiResponse.emotionTag,
        suggestedActions: aiResponse.suggestedActions
      })
      
      // 停止輸入中狀態
      socket.emit('npc-typing', { npcId, isTyping: false })
      
      // 記錄效能
      performanceMonitor.mark(requestId, 'responseSent')
      const metrics = performanceMonitor.endTracking(requestId)
      
      logger.info(`✅ 對話完成 [${requestId}]`, {
        totalTime: metrics?.totalTime,
        aiTime: metrics?.aiTime,
        dbTime: metrics?.dbTime
      })
      
    } catch (error) {
      logger.error(`對話處理失敗 [${requestId}]:`, error)
      
      socket.emit('npc-message', {
        npcId: data.npcId,
        content: '抱歉，我現在有點恍神...',
        emotionTag: 'confused'
      })
      
      socket.emit('npc-typing', { npcId: data.npcId, isTyping: false })
      performanceMonitor.endTracking(requestId)
    }
  })
  
  // NPC 之間的自動對話
  socket.on('request-npc-conversation', async (data) => {
    try {
      const { npc1Id, npc2Id, topic } = data
      const conversation = await geminiServiceV2.generateNPCToNPCConversation(
        npc1Id,
        npc2Id,
        topic
      )
      
      socket.emit('npc-conversation', {
        npc1Id,
        npc2Id,
        conversation: JSON.parse(conversation)
      })
    } catch (error) {
      logger.error('NPC 對話生成失敗:', error)
    }
  })
  
  socket.on('disconnect', () => {
    logger.info(`用戶斷開連接: ${socket.id}`)
  })
})

// 啟動服務器
const PORT = process.env.PORT || 4000

async function startServer() {
  try {
    // 連接資料庫
    await prisma.$connect()
    logger.info('✅ 資料庫連接成功')
    
    // 預載入 NPC 資料
    const npcData = await dbQueries.preloadNPCData()
    logger.info(`✅ 預載入 ${npcData.size} 個 NPC 資料`)
    
    // 啟動 HTTP 服務器
    httpServer.listen(PORT, () => {
      logger.info(`🚀 優化版服務器運行在 http://localhost:${PORT}`)
      logger.info('📊 效能監控已啟用')
      logger.info('🧠 AI NPC 元宇宙已就緒')
    })
  } catch (error) {
    logger.error('服務器啟動失敗:', error)
    process.exit(1)
  }
}

// 優雅關機
process.on('SIGTERM', async () => {
  logger.info('收到 SIGTERM，正在關閉服務器...')
  await prisma.$disconnect()
  httpServer.close(() => {
    logger.info('服務器已關閉')
    process.exit(0)
  })
})

startServer()