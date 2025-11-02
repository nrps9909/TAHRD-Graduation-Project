/**
 * Admin Resolvers - 管理員專用查詢
 */

import { PrismaClient } from '@prisma/client'
import { requireAdmin } from '../utils/auth'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

export const adminResolvers = {
  Query: {
    /**
     * 獲取所有用戶列表（分頁）
     */
    adminGetAllUsers: async (
      _: any,
      { limit = 100, offset = 0 }: { limit: number; offset: number },
      context: any
    ) => {
      try {
        // 驗證管理員權限
        if (!context.userId) {
          throw new Error('Not authenticated')
        }
        await requireAdmin(context.userId)

        // 獲取用戶列表
        const users = await prisma.user.findMany({
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: {
                memories: true,
                islands: true
              }
            }
          }
        })

        // 獲取總數
        const total = await prisma.user.count()

        // 轉換為 AdminUserSummary 格式
        const userSummaries = users.map(user => ({
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          displayName: user.displayName,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          memoriesCount: user._count.memories,
          islandsCount: user._count.islands
        }))

        return {
          users: userSummaries,
          total,
          hasMore: offset + limit < total
        }
      } catch (error) {
        logger.error('Error in adminGetAllUsers:', error)
        throw error
      }
    },

    /**
     * 獲取特定用戶的詳細資訊
     */
    adminGetUserById: async (
      _: any,
      { userId }: { userId: string },
      context: any
    ) => {
      try {
        // 驗證管理員權限
        if (!context.userId) {
          throw new Error('Not authenticated')
        }
        await requireAdmin(context.userId)

        // 獲取用戶資訊
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            _count: {
              select: {
                memories: true,
                islands: true,
                chatSessions: true,
                chatMessages: true
              }
            },
            islands: {
              take: 10,
              orderBy: { memoryCount: 'desc' }
            },
            memories: {
              take: 10,
              orderBy: { createdAt: 'desc' },
              include: {
                island: {
                  select: {
                    nameChinese: true,
                    emoji: true
                  }
                }
              }
            }
          }
        })

        if (!user) {
          throw new Error('User not found')
        }

        // 計算帳戶年齡（天數）
        const accountAge = Math.floor(
          (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        )

        return {
          user,
          memoriesCount: user._count.memories,
          islandsCount: user._count.islands,
          chatSessionsCount: user._count.chatSessions,
          totalChatsCount: user._count.chatMessages,
          activeIslands: user.islands,
          recentMemories: user.memories,
          accountAge
        }
      } catch (error) {
        logger.error('Error in adminGetUserById:', error)
        throw error
      }
    },

    /**
     * 獲取用戶統計資料
     */
    adminGetUserStats: async (
      _: any,
      { userId }: { userId: string },
      context: any
    ) => {
      try {
        // 驗證管理員權限
        if (!context.userId) {
          throw new Error('Not authenticated')
        }
        await requireAdmin(context.userId)

        // 獲取用戶基本資訊
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { username: true }
        })

        if (!user) {
          throw new Error('User not found')
        }

        // 按島嶼統計記憶數量
        const memoriesByIsland = await prisma.memory.groupBy({
          by: ['islandId'],
          where: { userId },
          _count: { id: true }
        })

        // 獲取島嶼詳細資訊
        const islandIds = memoriesByIsland.map(m => m.islandId)
        const islands = await prisma.island.findMany({
          where: { id: { in: islandIds } },
          select: { id: true, nameChinese: true, emoji: true }
        })

        const islandMap = new Map(islands.map(i => [i.id, i]))

        const memoriesByIslandFormatted = memoriesByIsland.map(m => ({
          islandId: m.islandId,
          islandName: islandMap.get(m.islandId)?.nameChinese || 'Unknown',
          islandEmoji: islandMap.get(m.islandId)?.emoji || '📝',
          count: m._count.id
        }))

        // 按日期統計記憶數量（最近30天）
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const memoriesOverTime = await prisma.memory.groupBy({
          by: ['createdAt'],
          where: {
            userId,
            createdAt: { gte: thirtyDaysAgo }
          },
          _count: { id: true }
        })

        const memoriesOverTimeFormatted = memoriesOverTime.map(m => ({
          date: m.createdAt.toISOString().split('T')[0],
          count: m._count.id
        }))

        // 統計標籤使用情況
        const memories = await prisma.memory.findMany({
          where: { userId },
          select: { tags: true }
        })

        const tagCounts = new Map<string, number>()
        memories.forEach(memory => {
          memory.tags.forEach(tag => {
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
          })
        })

        const topTags = Array.from(tagCounts.entries())
          .map(([tag, count]) => ({ tag, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)

        // 計算活躍度分數（基於最近30天的記憶數量）
        const recentMemoriesCount = await prisma.memory.count({
          where: {
            userId,
            createdAt: { gte: thirtyDaysAgo }
          }
        })
        const activityScore = Math.min(recentMemoriesCount / 30 * 10, 100)

        // 計算平均重要性分數
        const avgImportanceResult = await prisma.memory.aggregate({
          where: { userId, importanceScore: { not: null } },
          _avg: { importanceScore: true }
        })
        const averageMemoryImportance = avgImportanceResult._avg.importanceScore || 0

        return {
          userId,
          username: user.username,
          memoriesByIsland: memoriesByIslandFormatted,
          memoriesOverTime: memoriesOverTimeFormatted,
          topTags,
          activityScore,
          averageMemoryImportance
        }
      } catch (error) {
        logger.error('Error in adminGetUserStats:', error)
        throw error
      }
    },

    /**
     * 獲取系統整體統計
     */
    adminGetSystemStats: async (_: any, __: any, context: any) => {
      try {
        // 驗證管理員權限
        if (!context.userId) {
          throw new Error('Not authenticated')
        }
        await requireAdmin(context.userId)

        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

        // 基礎統計
        const totalUsers = await prisma.user.count()
        const totalMemories = await prisma.memory.count()
        const totalIslands = await prisma.island.count()
        const totalChatSessions = await prisma.chatSession.count()

        // 活躍用戶統計（基於最後登入時間）
        const activeUsersToday = await prisma.user.count({
          where: { lastLogin: { gte: today } }
        })
        const activeUsersThisWeek = await prisma.user.count({
          where: { lastLogin: { gte: thisWeek } }
        })
        const activeUsersThisMonth = await prisma.user.count({
          where: { lastLogin: { gte: thisMonth } }
        })

        // 記憶創建統計
        const memoriesCreatedToday = await prisma.memory.count({
          where: { createdAt: { gte: today } }
        })
        const memoriesCreatedThisWeek = await prisma.memory.count({
          where: { createdAt: { gte: thisWeek } }
        })
        const memoriesCreatedThisMonth = await prisma.memory.count({
          where: { createdAt: { gte: thisMonth } }
        })

        // 平均統計
        const averageMemoriesPerUser = totalUsers > 0 ? totalMemories / totalUsers : 0
        const averageIslandsPerUser = totalUsers > 0 ? totalIslands / totalUsers : 0

        return {
          totalUsers,
          totalMemories,
          totalIslands,
          totalChatSessions,
          activeUsersToday,
          activeUsersThisWeek,
          activeUsersThisMonth,
          memoriesCreatedToday,
          memoriesCreatedThisWeek,
          memoriesCreatedThisMonth,
          averageMemoriesPerUser,
          averageIslandsPerUser
        }
      } catch (error) {
        logger.error('Error in adminGetSystemStats:', error)
        throw error
      }
    }
  }
}
