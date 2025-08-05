import Redis from 'ioredis'
import { logger } from './logger'

export const connectRedis = () => {
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  })

  redis.on('connect', () => {
    logger.info('Connected to Redis')
  })

  redis.on('error', (error) => {
    logger.error('Redis connection error:', error)
  })

  redis.on('ready', () => {
    logger.info('Redis is ready to receive commands')
  })

  redis.on('reconnecting', () => {
    logger.info('Reconnecting to Redis...')
  })

  return redis
}