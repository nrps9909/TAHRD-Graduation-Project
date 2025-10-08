/**
 * Cat Agent Resolvers - Tororo & Hijiki GraphQL API
 */

import { tororoService } from '../services/tororoService'
import { hijikiService } from '../services/hijikiService'
import { Context } from '../context'

export const catAgentResolvers = {
  Query: {
    /**
     * Hijiki: 搜尋記憶
     */
    async searchMemoriesWithHijiki(_: any, args: any, context: Context) {
      const userId = context.userId
      if (!userId) {
        throw new Error('未登入')
      }

      return await hijikiService.searchWithHijiki({
        userId,
        query: args.query,
        type: args.type || 'search',
        filters: args.filters
      })
    },

    /**
     * Hijiki: 統計報告
     */
    async getStatisticsWithHijiki(_: any, args: any, context: Context) {
      const userId = context.userId
      if (!userId) {
        throw new Error('未登入')
      }

      return await hijikiService.generateStatistics(
        userId,
        args.period || 'month'
      )
    }
  },

  Mutation: {
    /**
     * Tororo: 創建記憶
     */
    async createMemoryWithTororo(_: any, args: any, context: Context) {
      const userId = context.userId
      if (!userId) {
        throw new Error('未登入')
      }

      return await tororoService.createMemoryWithTororo({
        userId,
        content: args.content,
        files: args.files,
        links: args.links
      })
    }
  }
}
