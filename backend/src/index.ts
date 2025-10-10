import dotenv from 'dotenv'
import path from 'path'
import express from 'express'

// 從根目錄載入 .env
dotenv.config({ path: path.join(__dirname, '../../.env') })

// 調試環境變數
console.log('[DEBUG] Backend 啟動時的環境變數:')
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '已設置' : '未設置')
console.log('NODE_ENV:', process.env.NODE_ENV)
import { createServer } from 'http'
import { Server } from 'socket.io'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'
import cors from 'cors'
import { typeDefs } from './schema'
import { resolvers } from './resolvers'
import { createContext } from './context'
import { socketHandler } from './socket'
import { logger } from './utils/logger'
// import trackingRoutes from './routes/trackingRoutes' // Removed - old tracking system
import { connectRedis } from './utils/redis'
import { PrismaClient } from '@prisma/client'
import { taskQueueService } from './services/taskQueueService'

const PORT = process.env.PORT || 4000

async function startServer() {
  try {
    // 初始化 Express 應用
    const app = express()
    const httpServer = createServer(app)
    
    // 初始化資料庫連接
    const prisma = new PrismaClient()
    await prisma.$connect()
    logger.info('Database connected successfully')
    
    // 初始化 Redis 連接
    const redis = connectRedis()
    
    // 初始化 Socket.IO
    const io = new Server(httpServer, {
      cors: {
        origin: function (origin, callback) {
          // 允許的 origins 列表
          const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:5173', // Vite 預設端口
            process.env.FRONTEND_URL
          ].filter(Boolean)
          
          // 開發環境允許任何 localhost
          if (process.env.NODE_ENV === 'development' && origin && origin.includes('localhost')) {
            callback(null, true)
          } else if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true)
          } else {
            callback(new Error('Not allowed by CORS'))
          }
        },
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    })
    
    // Socket.IO 事件處理
    socketHandler(io, prisma, redis)

    // 設置任務隊列的 Socket.IO 實例
    taskQueueService.setIO(io)
    
    // 初始化 Apollo Server
    const server = new ApolloServer({
      typeDefs,
      resolvers,
      plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
      introspection: process.env.NODE_ENV !== 'production',
    })
    
    await server.start()
    
    // 中間件設置
    app.use(cors({
      origin: function (origin, callback) {
        // 允許的 origins 列表
        const allowedOrigins = [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://localhost:5173', // Vite 預設端口
          'https://jesse-chen.com',
          'https://www.jesse-chen.com',
          'http://jesse-chen.com',
          'http://www.jesse-chen.com',
          process.env.FRONTEND_URL
        ].filter(Boolean)
        
        // 開發環境允許任何 localhost
        if (process.env.NODE_ENV === 'development' && origin && origin.includes('localhost')) {
          callback(null, true)
        } 
        // 生產環境：允許沒有 origin（Nginx 代理的同源請求）
        else if (!origin && process.env.NODE_ENV === 'production') {
          callback(null, true)
        }
        // 檢查是否在允許列表中
        else if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true)
        } else {
          callback(new Error('Not allowed by CORS'))
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }))
    
    app.use(express.json({ limit: '10mb' }))
    
    // GraphQL endpoint
    app.use('/graphql', expressMiddleware(server, {
      context: ({ req }) => createContext({ req, prisma, redis, io })
    }))
    
    // 根路徑端點
    app.get('/', (req, res) => {
      res.json({
        message: '🌸 歡迎來到心語小鎮 API',
        version: '1.0.0',
        endpoints: {
          graphql: `http://localhost:${PORT}/graphql`,
          health: `http://localhost:${PORT}/health`,
          websocket: `ws://localhost:${PORT}`
        }
      })
    })
    
    // 健康檢查端點
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      })
    })
    
    // 追蹤 API 路由 - Removed old tracking system
    // app.use(trackingRoutes)
    
    // 啟動服務器
    httpServer.listen(PORT, () => {
      logger.info(`🌸 心語小鎮服務器啟動成功！`)
      logger.info(`📍 GraphQL: http://localhost:${PORT}/graphql`)
      logger.info(`🔌 WebSocket: ws://localhost:${PORT}`)
      logger.info(`🏥 Health Check: http://localhost:${PORT}/health`)
    })
    
    // 優雅關閉處理
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`)

      httpServer.close(async () => {
        await server.stop()
        await prisma.$disconnect()
        redis.disconnect()
        taskQueueService.cleanup() // 清理任務隊列
        process.exit(0)
      })
    }
    
    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))
    
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

// 處理未捕獲的異常
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error)
  process.exit(1)
})

startServer()