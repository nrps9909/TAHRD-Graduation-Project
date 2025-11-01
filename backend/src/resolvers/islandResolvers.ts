/**
 * Island Resolvers - 島嶼相關的 GraphQL Resolvers
 */

import { Context } from '../context'
import { islandService } from '../services/islandService'
import { categoryInitService } from '../services/categoryInitService'
import { logger } from '../utils/logger'

export const islandResolvers = {
  Query: {
    /**
     * 獲取用戶的所有島嶼
     * 如果用戶沒有島嶼，自動初始化預設島嶼
     */
    islands: async (_: any, __: any, { user, prisma }: Context) => {
      // 驗證登入
      if (!user) {
        throw new Error('請先登入')
      }

      let islands = await islandService.getAllIslands(user.id)

      // 如果沒有島嶼，自動初始化
      if (islands.length === 0) {
        logger.info(`[Islands] 用戶 ${user.id} 沒有島嶼，開始自動初始化...`)
        const { islands: newIslands } = await categoryInitService.initializeDefaultCategories(user.id)
        islands = newIslands
        logger.info(`[Islands] 自動初始化完成，創建了 ${islands.length} 個島嶼`)
      }

      logger.info(`[Islands] 查詢島嶼: userId=${user.id}, count=${islands.length}`)
      return islands
    },

    /**
     * 根據 ID 獲取單一島嶼
     */
    island: async (
      _: any,
      { id }: { id: string },
      { user, prisma }: Context
    ) => {
      // 驗證登入
      if (!user) {
        throw new Error('請先登入')
      }

      const island = await islandService.getIslandById(id, user.id)

      if (!island) {
        return null
      }

      // 驗證所有權
      if (island.userId !== user.id) {
        throw new Error('無權訪問此島嶼')
      }

      return island
    },
  },

  Mutation: {
    /**
     * 創建島嶼
     */
    createIsland: async (
      _: any,
      { input }: any,
      { user, prisma }: Context
    ) => {
      if (!user) throw new Error('未登入')

      const island = await islandService.createIsland(user.id, input)
      logger.info(`[Island] 創建島嶼: ${island.nameChinese} (${island.id})`)
      return island
    },

    /**
     * 更新島嶼
     */
    updateIsland: async (
      _: any,
      { id, input }: { id: string; input: any },
      { user, prisma }: Context
    ) => {
      if (!user) throw new Error('未登入')

      // 驗證所有權
      const island = await prisma.island.findUnique({ where: { id } })
      if (!island) {
        throw new Error('找不到島嶼')
      }
      if (island.userId !== user.id) {
        throw new Error('無權修改此島嶼')
      }

      const updated = await islandService.updateIsland(id, input)
      logger.info(`[Island] 更新島嶼: ${updated.nameChinese} (${id})`)
      return updated
    },

    /**
     * 更新島嶼 AI 配置
     * @deprecated Commented out - not in GraphQL schema
     */
    /* updateIslandAIConfig: async (
      _: any,
      { id, systemPrompt, personality, chatStyle, keywords }: any,
      { user, prisma }: Context
    ) => {
      if (!user) throw new Error('未登入')

      // 驗證所有權
      const island = await prisma.island.findUnique({ where: { id } })
      if (!island) {
        throw new Error('找不到島嶼')
      }
      if (island.userId !== user.id) {
        throw new Error('無權修改此島嶼')
      }

      const updated = await islandService.updateIsland(id, {
        systemPrompt,
        personality,
        chatStyle,
        keywords,
      })

      logger.info(`[Island] 更新 AI 配置: ${updated.nameChinese} (${id})`)
      return updated
    }, */

    /**
     * 更新島嶼統計
     * @deprecated Commented out - not in GraphQL schema
     */
    /* incrementIslandStats: async (
      _: any,
      { id, type }: { id: string; type: 'MEMORY' | 'CHAT' },
      { user, prisma }: Context
    ) => {
      if (!user) throw new Error('未登入')

      // 驗證所有權
      const island = await prisma.island.findUnique({ where: { id } })
      if (!island) {
        throw new Error('找不到島嶼')
      }
      if (island.userId !== user.id) {
        throw new Error('無權修改此島嶼')
      }

      await islandService.incrementIslandStats(id, type.toLowerCase() as 'memory' | 'chat')
      const updated = await islandService.getIslandById(id, user.id)

      logger.info(`[Island] 更新統計: ${updated?.nameChinese} (${type})`)
      return updated
    } */

    /**
     * 刪除島嶼
     */
    deleteIsland: async (_: any, { id }: { id: string }, { user, prisma }: Context) => {
      if (!user) throw new Error('未登入')

      // 驗證所有權
      const island = await prisma.island.findUnique({ where: { id } })
      if (!island) {
        throw new Error('找不到島嶼')
      }
      if (island.userId !== user.id) {
        throw new Error('無權刪除此島嶼')
      }

      // 刪除島嶼
      await prisma.island.delete({ where: { id } })

      logger.info(`[Island] 刪除島嶼: ${island.nameChinese} (${id})`)
      return true
    },

    /**
     * 重新排序島嶼
     */
    reorderIslands: async (
      _: any,
      { islandIds }: { islandIds: string[] },
      { user, prisma }: Context
    ) => {
      if (!user) throw new Error('未登入')

      // 驗證所有島嶼都屬於該用戶
      const islands = await prisma.island.findMany({
        where: { id: { in: islandIds } },
      })

      if (islands.some((island) => island.userId !== user.id)) {
        throw new Error('無權修改這些島嶼')
      }

      // 更新排序
      await Promise.all(
        islandIds.map((id, index) =>
          prisma.island.update({
            where: { id },
            data: { position: index + 1 },
          })
        )
      )

      // 清除快取
      islandService.clearCache()

      logger.info(`[Island] 重新排序: ${islandIds.length} 個島嶼`)
      return await islandService.getAllIslands(user.id)
    },
  },

  Island: {
    /**
     * 島嶼的記憶列表
     */
    memories: async (
      parent: any,
      { limit = 50, offset = 0 }: { limit?: number; offset?: number },
      { prisma }: Context
    ) => {
      return await prisma.memory.findMany({
        where: { islandId: parent.id },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      })
    },

    /**
     * 島嶼的聊天會話列表
     */
    chatSessions: async (parent: any, _: any, { prisma }: Context) => {
      return await prisma.chatSession.findMany({
        where: { islandId: parent.id },
        orderBy: { lastMessageAt: 'desc' },
      })
    },

    /**
     * 島嶼所有者
     */
    user: async (parent: any, _: any, { prisma }: Context) => {
      return await prisma.user.findUnique({
        where: { id: parent.userId },
      })
    },
  },
}
