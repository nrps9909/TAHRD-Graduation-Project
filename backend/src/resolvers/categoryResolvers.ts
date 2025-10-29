/**
 * Category Management Resolvers
 *
 * 處理島嶼和小類別的 GraphQL 操作
 */

import { categoryService } from '../services/categoryService'
import { categoryInitService } from '../services/categoryInitService'
import { promptGeneratorService } from '../services/promptGeneratorService'
import { logger } from '../utils/logger'

export interface Context {
  userId?: string
}

export const categoryResolvers = {
  Query: {
    /**
     * 獲取所有島嶼（如果沒有則自動初始化）
     */
    islands: async (_parent: any, _args: any, context: Context) => {
      try {
        const userId = context.userId
        if (!userId) {
          throw new Error('未授權：請先登入')
        }

        let islands = await categoryService.getIslands(userId)

        // 如果用戶沒有任何島嶼，自動初始化預設分類系統
        if (islands.length === 0) {
          logger.info(`[categoryResolvers] 用戶 ${userId} 沒有島嶼，自動初始化`)
          try {
            await categoryInitService.initializeDefaultCategories(userId)
            islands = await categoryService.getIslands(userId)
            logger.info(`[categoryResolvers] 已為用戶 ${userId} 自動初始化 ${islands.length} 個島嶼`)
          } catch (initError) {
            logger.error('[categoryResolvers] 自動初始化失敗:', initError)
            // 即使初始化失敗，也返回空陣列而不是拋出錯誤
          }
        }

        return islands
      } catch (error) {
        logger.error('[categoryResolvers] 獲取島嶼失敗:', error)
        throw error
      }
    },

    /**
     * 獲取單個島嶼
     */
    island: async (_parent: any, args: { id: string }, context: Context) => {
      try {
        const userId = context.userId
        if (!userId) {
          throw new Error('未授權：請先登入')
        }

        const island = await categoryService.getIsland(userId, args.id)
        if (!island) {
          throw new Error('島嶼不存在')
        }

        return island
      } catch (error) {
        logger.error('[categoryResolvers] 獲取島嶼失敗:', error)
        throw error
      }
    },

    /**
     * 獲取分類統計
     */
    categoryStats: async (_parent: any, _args: any, context: Context) => {
      try {
        const userId = context.userId
        if (!userId) {
          throw new Error('未授權：請先登入')
        }

        const stats = await categoryService.getCategoryStats(userId)
        return stats
      } catch (error) {
        logger.error('[categoryResolvers] 獲取統計失敗:', error)
        throw error
      }
    },

    /**
     * AI 生成島嶼提示詞
     */
    generateIslandPrompt: async (
      _parent: any,
      args: { nameChinese: string; emoji?: string },
      context: Context
    ) => {
      try {
        const userId = context.userId
        if (!userId) {
          throw new Error('未授權：請先登入')
        }

        const suggestion = await promptGeneratorService.generateIslandPrompt(
          args.nameChinese,
          args.emoji
        )

        logger.info(`[categoryResolvers] AI 生成島嶼提示詞: ${args.nameChinese}`)
        return suggestion
      } catch (error) {
        logger.error('[categoryResolvers] AI 生成島嶼提示詞失敗:', error)
        throw error
      }
    },
  },

  Mutation: {
    /**
     * 初始化分類系統（首次使用）
     */
    initializeCategories: async (_parent: any, _args: any, context: Context) => {
      try {
        const userId = context.userId
        if (!userId) {
          throw new Error('未授權：請先登入')
        }

        await categoryInitService.initializeDefaultCategories(userId)
        const stats = await categoryService.getCategoryStats(userId)

        logger.info(`[categoryResolvers] 使用者 ${userId} 初始化分類系統完成`)
        return stats
      } catch (error) {
        logger.error('[categoryResolvers] 初始化分類系統失敗:', error)
        throw error
      }
    },

    /**
     * 創建島嶼
     */
    createIsland: async (_parent: any, args: { input: any }, context: Context) => {
      try {
        const userId = context.userId
        if (!userId) {
          throw new Error('未授權：請先登入')
        }

        const island = await categoryService.createIsland(userId, args.input)
        logger.info(`[categoryResolvers] 創建島嶼: ${island.nameChinese}`)
        return island
      } catch (error) {
        logger.error('[categoryResolvers] 創建島嶼失敗:', error)
        throw error
      }
    },

    /**
     * 更新島嶼
     */
    updateIsland: async (
      _parent: any,
      args: { id: string; input: any },
      context: Context
    ) => {
      try {
        const userId = context.userId
        if (!userId) {
          throw new Error('未授權：請先登入')
        }

        await categoryService.updateIsland(userId, args.id, args.input)
        const island = await categoryService.getIsland(userId, args.id)

        logger.info(`[categoryResolvers] 更新島嶼: ${args.id}`)
        return island
      } catch (error) {
        logger.error('[categoryResolvers] 更新島嶼失敗:', error)
        throw error
      }
    },

    /**
     * 刪除島嶼
     */
    deleteIsland: async (_parent: any, args: { id: string }, context: Context) => {
      try {
        const userId = context.userId
        if (!userId) {
          throw new Error('未授權：請先登入')
        }

        await categoryService.deleteIsland(userId, args.id)
        logger.info(`[categoryResolvers] 刪除島嶼: ${args.id}`)
        return true
      } catch (error) {
        logger.error('[categoryResolvers] 刪除島嶼失敗:', error)
        throw error
      }
    },

    /**
     * 重新排序島嶼
     */
    reorderIslands: async (
      _parent: any,
      args: { islandIds: string[] },
      context: Context
    ) => {
      try {
        const userId = context.userId
        if (!userId) {
          throw new Error('未授權：請先登入')
        }

        await categoryService.reorderIslands(userId, args.islandIds)
        logger.info(
          `[categoryResolvers] 重新排序 ${args.islandIds.length} 個島嶼`
        )
        return true
      } catch (error) {
        logger.error('[categoryResolvers] 重新排序島嶼失敗:', error)
        throw error
      }
    },
  },

  // Type resolvers
  Island: {
    user: async (parent: any, _: any, { prisma }: any) => {
      return prisma.user.findUnique({
        where: { id: parent.userId }
      })
    },
  },
}
