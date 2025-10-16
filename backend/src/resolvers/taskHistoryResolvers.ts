/**
 * TaskHistory Resolvers - 任務處理歷史記錄
 *
 * 功能:
 * - 查詢用戶的任務處理歷史
 * - 提供持久化的處理記錄(不依賴 WebSocket)
 */

import { Context } from '../context'
import { logger } from '../utils/logger'

export const taskHistoryResolvers = {
  Query: {
    /**
     * 查詢任務歷史列表
     */
    taskHistories: async (
      _parent: any,
      { limit = 50, offset = 0 }: { limit?: number; offset?: number },
      { user, prisma }: Context
    ) => {
      if (!user) {
        throw new Error('未登入')
      }

      try {
        const histories = await prisma.taskHistory.findMany({
          where: { userId: user.id },
          orderBy: { completedAt: 'desc' },
          take: limit,
          skip: offset,
        })

        logger.info(`[TaskHistory] 查詢歷史: userId=${user.id}, count=${histories.length}`)

        return histories.map((history) => ({
          ...history,
          categoriesInfo: history.categoriesInfo as any[], // JSON to array
        }))
      } catch (error: any) {
        logger.error('[TaskHistory] 查詢失敗:', error)
        throw new Error(`查詢任務歷史失敗: ${error.message}`)
      }
    },

    /**
     * 查詢單個任務歷史
     */
    taskHistory: async (
      _parent: any,
      { id }: { id: string },
      { user, prisma }: Context
    ) => {
      if (!user) {
        throw new Error('未登入')
      }

      try {
        const history = await prisma.taskHistory.findUnique({
          where: { id },
        })

        if (!history) {
          throw new Error('找不到任務歷史')
        }

        if (history.userId !== user.id) {
          throw new Error('無權訪問此任務歷史')
        }

        return {
          ...history,
          categoriesInfo: history.categoriesInfo as any[],
        }
      } catch (error: any) {
        logger.error('[TaskHistory] 查詢失敗:', error)
        throw new Error(`查詢任務歷史失敗: ${error.message}`)
      }
    },
  },
}
