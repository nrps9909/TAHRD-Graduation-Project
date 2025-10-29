/**
 * Category Initialization Service
 *
 * 為使用者初始化預設的島嶼系統
 */

import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

// 預設島嶼配置（5個固定島嶼）
const DEFAULT_ISLANDS = [
  {
    position: 0,
    name: 'LEARNING_ISLAND',
    nameChinese: '學習島',
    emoji: '📚',
    color: '#FFB3D9',
    description: '知識學習與成長的島嶼',
    positionX: -15,
    positionY: 0,
    positionZ: -10,
  },
  {
    position: 1,
    name: 'LIFE_ISLAND',
    nameChinese: '生活島',
    emoji: '🌱',
    color: '#FFE5B3',
    description: '日常生活與健康的島嶼',
    positionX: 0,
    positionY: 0,
    positionZ: -15,
  },
  {
    position: 2,
    name: 'WORK_ISLAND',
    nameChinese: '工作島',
    emoji: '💼',
    color: '#B3D9FF',
    description: '工作與事業發展的島嶼',
    positionX: 15,
    positionY: 0,
    positionZ: -10,
  },
  {
    position: 3,
    name: 'SOCIAL_ISLAND',
    nameChinese: '社交島',
    emoji: '👥',
    color: '#D9FFB3',
    description: '人際關係與社交的島嶼',
    positionX: -10,
    positionY: 0,
    positionZ: 10,
  },
  {
    position: 4,
    name: 'GOALS_ISLAND',
    nameChinese: '目標島',
    emoji: '🎯',
    color: '#FFB3B3',
    description: '目標規劃與夢想實現的島嶼',
    positionX: 10,
    positionY: 0,
    positionZ: 10,
  },
]

export class CategoryInitService {
  /**
   * 為使用者初始化預設分類系統
   */
  async initializeDefaultCategories(userId: string): Promise<{
    islands: any[]
  }> {
    try {
      logger.info(`[CategoryInit] 開始為使用者 ${userId} 初始化分類系統`)

      // 檢查是否已經初始化
      const existingIslands = await prisma.island.findMany({
        where: { userId },
      })

      if (existingIslands.length > 0) {
        logger.info(`[CategoryInit] 使用者 ${userId} 已有分類系統，跳過初始化`)
        return {
          islands: existingIslands,
        }
      }

      // 創建5個島嶼
      const islands = await Promise.all(
        DEFAULT_ISLANDS.map((island) =>
          prisma.island.create({
            data: {
              userId,
              ...island,
            },
          })
        )
      )

      logger.info(`[CategoryInit] 創建了 ${islands.length} 個島嶼`)
      logger.info(`[CategoryInit] 使用者 ${userId} 的分類系統初始化完成`)

      return { islands }
    } catch (error) {
      logger.error('[CategoryInit] 初始化分類系統失敗:', error)
      throw new Error('初始化分類系統失敗')
    }
  }

  /**
   * 獲取使用者的所有島嶼
   */
  async getUserCategories(userId: string) {
    try {
      const islands = await prisma.island.findMany({
        where: { userId },
        orderBy: { position: 'asc' },
      })

      return islands
    } catch (error) {
      logger.error('[CategoryInit] 獲取分類失敗:', error)
      throw new Error('獲取分類失敗')
    }
  }
}

export const categoryInitService = new CategoryInitService()
