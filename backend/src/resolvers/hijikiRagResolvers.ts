/**
 * Hijiki RAG Resolvers (小黑知識管理員)
 *
 * 提供基於 RAG 的知識查詢、語義搜尋和分析功能
 */

import { logger } from '../utils/logger'
import { ragConversation } from '../services/ragConversation'
import { vectorService } from '../services/vectorService'
import { analyticsEngine } from '../services/analyticsEngine'

export const hijikiRagResolvers = {
  Query: {
    /**
     * RAG 對話 - 與小黑進行知識查詢對話
     */
    chatWithHijiki: async (
      _: any,
      { sessionId, query, maxContext }: { sessionId: string; query: string; maxContext?: number },
      context: any
    ) => {
      try {
        const userId = context.userId
        if (!userId) {
          throw new Error('未授權')
        }

        logger.info(`[Hijiki RAG] Chat query from user ${userId}: "${query.substring(0, 50)}..."`)

        const result = await ragConversation.chat({
          userId,
          sessionId,
          query,
          maxContext,
        })

        return {
          answer: result.answer,
          sources: result.sources,
          conversationHistory: result.conversationHistory,
        }
      } catch (error) {
        logger.error('[Hijiki RAG] Chat failed:', error)
        throw new Error('對話查詢失敗')
      }
    },

    /**
     * 語義搜尋 - 基於向量相似度搜尋記憶
     */
    semanticSearch: async (
      _: any,
      {
        query,
        limit = 10,
        minSimilarity = 0.5,
      }: { query: string; limit?: number; minSimilarity?: number },
      context: any
    ) => {
      try {
        const userId = context.userId
        if (!userId) {
          throw new Error('未授權')
        }

        logger.info(`[Hijiki RAG] Semantic search: "${query.substring(0, 50)}..."`)

        const results = await vectorService.semanticSearch(userId, query, limit, minSimilarity)

        return {
          results: results.map((r) => ({
            memoryId: r.memoryId,
            title: r.textContent.split('\n')[0] || '無標題',
            content: r.textContent,
            tags: [],
            similarity: r.similarity,
          })),
          totalCount: results.length,
        }
      } catch (error) {
        logger.error('[Hijiki RAG] Semantic search failed:', error)
        throw new Error('語義搜尋失敗')
      }
    },

    /**
     * 知識分析 - 獲取知識庫統計和洞察
     */
    getKnowledgeAnalytics: async (
      _: any,
      { period = 'month' }: { period?: 'week' | 'month' | 'year' | 'all' },
      context: any
    ) => {
      try {
        const userId = context.userId
        if (!userId) {
          throw new Error('未授權')
        }

        logger.info(`[Hijiki RAG] Getting analytics for period: ${period}`)

        const stats = await analyticsEngine.generateStatistics(userId, period)

        return {
          total: stats.total,
          byCategory: stats.byCategory,
          byMonth: stats.byMonth,
          averageImportance: stats.averageImportance,
          topTags: stats.topTags,
          recentGrowth: stats.recentGrowth,
        }
      } catch (error) {
        logger.error('[Hijiki RAG] Analytics failed:', error)
        throw new Error('知識分析失敗')
      }
    },

    /**
     * 獲取用戶的所有對話會話
     */
    getHijikiSessions: async (_: any, __: any, context: any) => {
      try {
        const userId = context.userId
        if (!userId) {
          throw new Error('未授權')
        }

        logger.info(`[Hijiki RAG] Getting sessions for user ${userId}`)

        const sessions = await ragConversation.getUserSessions(userId)

        return sessions.map((session) => ({
          id: session.id,
          sessionId: session.sessionId,
          title: session.title,
          mode: session.mode,
          totalQueries: session.totalQueries,
          lastActiveAt: session.lastActiveAt,
          isActive: session.isActive,
        }))
      } catch (error) {
        logger.error('[Hijiki RAG] Get sessions failed:', error)
        throw new Error('獲取會話列表失敗')
      }
    },
  },

  Mutation: {
    /**
     * 批量生成向量嵌入
     */
    generateEmbeddings: async (
      _: any,
      { limit = 50 }: { limit?: number },
      context: any
    ) => {
      try {
        const userId = context.userId
        if (!userId) {
          throw new Error('未授權')
        }

        logger.info(`[Hijiki RAG] Generating embeddings for user ${userId}, limit: ${limit}`)

        const count = await vectorService.batchGenerateEmbeddings(userId, limit)

        return {
          success: true,
          count,
          message: `成功為 ${count} 條記憶生成向量`,
        }
      } catch (error) {
        logger.error('[Hijiki RAG] Generate embeddings failed:', error)
        return {
          success: false,
          count: 0,
          message: '生成向量失敗',
        }
      }
    },

    /**
     * 清空對話會話
     */
    clearHijikiSession: async (
      _: any,
      { sessionId }: { sessionId: string },
      context: any
    ) => {
      try {
        const userId = context.userId
        if (!userId) {
          throw new Error('未授權')
        }

        logger.info(`[Hijiki RAG] Clearing session ${sessionId} for user ${userId}`)

        await ragConversation.clearSession(userId, sessionId)

        return true
      } catch (error) {
        logger.error('[Hijiki RAG] Clear session failed:', error)
        return false
      }
    },
  },
}
