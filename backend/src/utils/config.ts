/**
 * 配置驗證和管理
 * 確保所有必要的環境變數都已設置
 */

import { logger } from './logger'

export interface AppConfig {
  nodeEnv: 'development' | 'production' | 'test'
  port: number
  jwtSecret: string
  jwtExpiresIn: string
  geminiApiKey: string
  frontendUrl: string
  databaseUrl: string
  redisUrl: string
  cloudinary: {
    cloudName: string
    apiKey: string
    apiSecret: string
  }
}

/**
 * 驗證必要的環境變數
 * 如果缺少必要變數，拒絕啟動應用
 */
export function validateConfig(): AppConfig {
  const errors: string[] = []

  // 必要變數檢查
  const requiredVars = {
    JWT_SECRET: process.env.JWT_SECRET,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
  }

  for (const [key, value] of Object.entries(requiredVars)) {
    if (!value || value.trim() === '') {
      errors.push(`❌ Missing required environment variable: ${key}`)
    }
  }

  // JWT_SECRET 安全性檢查
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    errors.push('❌ JWT_SECRET must be at least 32 characters long for security')
  }

  // 生產環境額外檢查
  if (process.env.NODE_ENV === 'production') {
    const productionVars = {
      FRONTEND_URL: process.env.FRONTEND_URL,
      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
    }

    for (const [key, value] of Object.entries(productionVars)) {
      if (!value || value.trim() === '') {
        errors.push(`❌ Missing production environment variable: ${key}`)
      }
    }
  }

  // 如果有錯誤，記錄並退出
  if (errors.length > 0) {
    logger.error('🔒 Configuration validation failed:')
    errors.forEach(err => logger.error(err))
    logger.error('\n📝 Please set the required environment variables in .env file')
    logger.error('See .env.example for reference\n')
    process.exit(1)
  }

  // 返回驗證過的配置
  const config: AppConfig = {
    nodeEnv: (process.env.NODE_ENV as any) || 'development',
    port: parseInt(process.env.PORT || '4000'),
    jwtSecret: process.env.JWT_SECRET!,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    geminiApiKey: process.env.GEMINI_API_KEY!,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    databaseUrl: process.env.DATABASE_URL!,
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
      apiKey: process.env.CLOUDINARY_API_KEY || '',
      apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    }
  }

  logger.info('✅ Configuration validated successfully')
  logger.info(`   Environment: ${config.nodeEnv}`)
  logger.info(`   Port: ${config.port}`)
  logger.info(`   JWT Secret: ${config.jwtSecret.substring(0, 8)}...`)
  logger.info(`   Gemini API Key: ${config.geminiApiKey.substring(0, 10)}...`)

  return config
}

// 全局配置實例
let appConfig: AppConfig | null = null

export function getConfig(): AppConfig {
  if (!appConfig) {
    appConfig = validateConfig()
  }
  return appConfig
}
