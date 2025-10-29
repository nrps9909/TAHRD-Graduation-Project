/**
 * Category Management Service
 *
 * 提供完整的島嶼和分類 CRUD 操作
 */

import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

export class CategoryService {
  // ============ Island (大類別) CRUD ============

  /**
   * 獲取使用者的所有島嶼
   */
  async getIslands(userId: string) {
    try {
      const islands = await prisma.island.findMany({
        where: { userId },
        orderBy: { position: 'asc' },
      })

      return islands
    } catch (error) {
      logger.error('[CategoryService] 獲取島嶼失敗:', error)
      throw new Error('獲取島嶼失敗')
    }
  }

  /**
   * 獲取單個島嶼
   */
  async getIsland(userId: string, islandId: string) {
    try {
      const island = await prisma.island.findFirst({
        where: { id: islandId, userId },
      })

      return island
    } catch (error) {
      logger.error('[CategoryService] 獲取島嶼失敗:', error)
      throw new Error('獲取島嶼失敗')
    }
  }

  /**
   * 創建新島嶼
   */
  async createIsland(userId: string, data: {
    name: string
    nameChinese: string
    emoji?: string
    color?: string
    description?: string
    positionX?: number
    positionY?: number
    positionZ?: number
  }) {
    try {
      const { promptGeneratorService } = await import('./promptGeneratorService')

      // 使用 AI 自動生成描述
      // 如果使用者提供了 description，作為 AI 生成的提示；如果沒提供，AI 會根據名稱生成
      let description = data.description
      const userProvidedHint = data.description // 保存使用者提供的提示

      logger.info(`[CategoryService] 為島嶼「${data.nameChinese}」自動生成描述${userProvidedHint ? ` (使用者提示: ${userProvidedHint})` : ''}`)
      try {
        const generated = await promptGeneratorService.generateIslandPrompt(
          data.nameChinese,
          data.emoji || '🏝️',
          userProvidedHint // 將使用者提示傳給 AI
        )
        description = generated.description
        logger.info(`[CategoryService] AI 生成描述成功: ${description}`)
      } catch (error) {
        logger.error('[CategoryService] AI 生成描述失敗，使用預設值:', error)
        description = userProvidedHint || `${data.nameChinese}相關的知識和記錄`
      }

      // 獲取當前最大 position
      const maxPosition = await prisma.island.findFirst({
        where: { userId },
        orderBy: { position: 'desc' },
        select: { position: true },
      })

      const newPosition = maxPosition ? maxPosition.position + 1 : 0

      const island = await prisma.island.create({
        data: {
          userId,
          position: newPosition,
          name: data.name,
          nameChinese: data.nameChinese,
          emoji: data.emoji || '🏝️',
          color: data.color || '#FFB3D9',
          description: description || `${data.nameChinese}相關的知識和記錄`,
          positionX: data.positionX ?? 0,
          positionY: data.positionY ?? 0,
          positionZ: data.positionZ ?? 0,
        },
      })

      logger.info(`[CategoryService] 創建島嶼: ${island.nameChinese}`)
      return island
    } catch (error) {
      logger.error('[CategoryService] 創建島嶼失敗:', error)
      throw new Error('創建島嶼失敗')
    }
  }

  /**
   * 更新島嶼
   */
  async updateIsland(userId: string, islandId: string, data: {
    name?: string
    nameChinese?: string
    emoji?: string
    color?: string
    description?: string
    positionX?: number
    positionY?: number
    positionZ?: number
    position?: number
    // 3D 外觀配置（可選）
    customShapeData?: string | null
    islandHeight?: number | null
    islandBevel?: number | null
  }) {
    try {
      const island = await prisma.island.updateMany({
        where: { id: islandId, userId },
        data,
      })

      logger.info(`[CategoryService] 更新島嶼: ${islandId}`)
      return island
    } catch (error) {
      logger.error('[CategoryService] 更新島嶼失敗:', error)
      throw new Error('更新島嶼失敗')
    }
  }

  /**
   * 刪除島嶼
   *
   * 限制：至少需要保留一個島嶼
   */
  async deleteIsland(userId: string, islandId: string) {
    try {
      // 檢查用戶總共有多少島嶼
      const totalIslands = await prisma.island.count({
        where: { userId },
      })

      // 至少需要保留一個島嶼
      if (totalIslands <= 1) {
        throw new Error('無法刪除最後一個島嶼，請至少保留一個島嶼')
      }

      // 刪除島嶼
      const island = await prisma.island.deleteMany({
        where: { id: islandId, userId },
      })

      logger.info(`[CategoryService] 刪除島嶼: ${islandId}`)
      return island
    } catch (error) {
      logger.error('[CategoryService] 刪除島嶼失敗:', error)
      throw error
    }
  }

  /**
   * 重新排序島嶼
   */
  async reorderIslands(userId: string, islandIds: string[]) {
    try {
      // 批量更新 position
      await Promise.all(
        islandIds.map((id, index) =>
          prisma.island.updateMany({
            where: { id, userId },
            data: { position: index },
          })
        )
      )

      logger.info(`[CategoryService] 重新排序 ${islandIds.length} 個島嶼`)
      return true
    } catch (error) {
      logger.error('[CategoryService] 重新排序島嶼失敗:', error)
      throw new Error('重新排序島嶼失敗')
    }
  }

  // ============ 統計和工具方法 ============

  /**
   * 獲取分類統計
   */
  async getCategoryStats(userId: string) {
    try {
      const [islandsCount, totalMemories] = await Promise.all([
        prisma.island.count({ where: { userId } }),
        prisma.memory.count({ where: { userId } }),
      ])

      return {
        islandsCount,
        totalMemories,
      }
    } catch (error) {
      logger.error('[CategoryService] 獲取統計失敗:', error)
      throw new Error('獲取統計失敗')
    }
  }
}

export const categoryService = new CategoryService()
