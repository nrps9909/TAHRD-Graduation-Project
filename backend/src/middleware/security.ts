/**
 * 安全中間件
 * 包含速率限制、輸入驗證等安全措施
 */

import rateLimit from 'express-rate-limit'
import { logger } from '../utils/logger'

/**
 * 全局速率限制
 * 防止 DoS 攻擊
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 100, // 最多 100 個請求
  message: '請求過於頻繁，請稍後再試',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`[RateLimit] IP ${req.ip} 觸發全局速率限制`)
    res.status(429).json({
      error: 'Too many requests',
      message: '請求過於頻繁，請稍後再試',
      retryAfter: Math.ceil(15 * 60) // 15 分鐘後重試
    })
  }
})

/**
 * 認證 API 速率限制
 * 防止暴力破解
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 5, // 最多 5 次登入/註冊嘗試
  skipSuccessfulRequests: true, // 成功的請求不計入
  message: '登入嘗試次數過多，請 15 分鐘後再試',
  handler: (req, res) => {
    logger.warn(`[RateLimit] IP ${req.ip} 觸發認證速率限制`)
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: '登入嘗試次數過多，請 15 分鐘後再試',
      retryAfter: Math.ceil(15 * 60)
    })
  }
})

/**
 * 文件上傳速率限制
 * 防止濫用上傳功能
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 小時
  max: 50, // 最多 50 次上傳
  message: '上傳次數過多，請 1 小時後再試',
  handler: (req, res) => {
    logger.warn(`[RateLimit] IP ${req.ip} 觸發上傳速率限制`)
    res.status(429).json({
      error: 'Too many uploads',
      message: '上傳次數過多，請 1 小時後再試',
      retryAfter: Math.ceil(60 * 60)
    })
  }
})

/**
 * AI API 速率限制
 * 防止 API 費用濫用
 */
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 小時
  max: 100, // 最多 100 次 AI 調用
  message: 'AI 調用次數過多，請 1 小時後再試',
  handler: (req, res) => {
    logger.warn(`[RateLimit] IP ${req.ip} 觸發 AI 速率限制`)
    res.status(429).json({
      error: 'Too many AI requests',
      message: 'AI 調用次數過多，請 1 小時後再試',
      retryAfter: Math.ceil(60 * 60)
    })
  }
})

/**
 * GraphQL 速率限制
 * 防止複雜查詢攻擊
 */
export const graphqlLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 分鐘
  max: 60, // 最多 60 個 GraphQL 請求
  message: 'GraphQL 請求過於頻繁',
  handler: (req, res) => {
    logger.warn(`[RateLimit] IP ${req.ip} 觸發 GraphQL 速率限制`)
    res.status(429).json({
      error: 'Too many GraphQL requests',
      message: 'GraphQL 請求過於頻繁，請稍後再試',
      retryAfter: Math.ceil(60)
    })
  }
})
