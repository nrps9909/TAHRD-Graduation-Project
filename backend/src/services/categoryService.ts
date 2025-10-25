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
   * 獲取使用者的所有島嶼（含小類別）
   */
  async getIslands(userId: string) {
    try {
      const islands = await prisma.island.findMany({
        where: { userId },
        orderBy: { position: 'asc' },
        include: {
          subcategories: {
            orderBy: { position: 'asc' },
          },
        },
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
        include: {
          subcategories: {
            orderBy: { position: 'asc' },
          },
        },
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
   * 刪除島嶼（會自動級聯刪除所有小類別，記憶會保留但失去分類關聯）
   *
   * 級聯行為：
   * - Island 刪除 → 自動刪除所有 Subcategory (Cascade)
   * - Subcategory 刪除 → Memory 保留，subcategoryId 設為 null (SetNull)
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

      // 獲取即將刪除的小類別數量（用於日誌記錄）
      const subcategoriesCount = await prisma.subcategory.count({
        where: { islandId, userId },
      })

      // 直接刪除島嶼，資料庫會自動級聯刪除小類別
      const island = await prisma.island.deleteMany({
        where: { id: islandId, userId },
      })

      logger.info(`[CategoryService] 刪除島嶼: ${islandId}，已自動刪除 ${subcategoriesCount} 個小類別`)
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

  // ============ Subcategory (小類別/SubAgent) CRUD ============

  /**
   * 獲取所有小類別
   */
  async getSubcategories(userId: string, islandId?: string) {
    try {
      const subcategories = await prisma.subcategory.findMany({
        where: {
          userId,
          ...(islandId && { islandId }),
        },
        orderBy: { position: 'asc' },
        include: {
          island: true,
        },
      })

      return subcategories
    } catch (error) {
      logger.error('[CategoryService] 獲取小類別失敗:', error)
      throw new Error('獲取小類別失敗')
    }
  }

  /**
   * 獲取單個小類別
   */
  async getSubcategory(userId: string, subcategoryId: string) {
    try {
      const subcategory = await prisma.subcategory.findFirst({
        where: { id: subcategoryId, userId },
        include: {
          island: true,
        },
      })

      return subcategory
    } catch (error) {
      logger.error('[CategoryService] 獲取小類別失敗:', error)
      throw new Error('獲取小類別失敗')
    }
  }

  /**
   * 創建新小類別（SubAgent）
   */
  async createSubcategory(userId: string, data: {
    islandId: string
    name: string
    nameChinese: string
    emoji?: string
    color?: string
    description?: string
    keywords?: string[]
    systemPrompt?: string
    personality?: string
    chatStyle?: string
  }) {
    try {
      const { promptGeneratorService } = await import('./promptGeneratorService')

      // 使用 AI 自動生成設定
      // 如果使用者提供了 description 或 systemPrompt，作為 AI 生成的提示
      let description = data.description
      let keywords = data.keywords
      let systemPrompt = data.systemPrompt
      let personality = data.personality
      let chatStyle = data.chatStyle

      const userProvidedHints = {
        description: data.description,
        systemPrompt: data.systemPrompt
      }

      const needsGeneration = !description || !keywords || !systemPrompt || !personality || !chatStyle

      if (needsGeneration) {
        logger.info(`[CategoryService] 為小類別「${data.nameChinese}」自動生成設定${userProvidedHints.description || userProvidedHints.systemPrompt ? ' (使用者提供提示)' : ''}`)
        try {
          // 獲取島嶼資訊
          const island = await prisma.island.findUnique({
            where: { id: data.islandId },
            select: { nameChinese: true }
          })

          const generated = await promptGeneratorService.generateSubcategoryPrompt(
            data.nameChinese,
            data.emoji || '📚',
            island?.nameChinese,
            userProvidedHints.description || userProvidedHints.systemPrompt ? userProvidedHints : undefined
          )

          description = description || generated.description
          keywords = keywords || generated.keywords
          systemPrompt = systemPrompt || generated.systemPrompt
          personality = personality || generated.personality
          chatStyle = chatStyle || generated.chatStyle

          logger.info(`[CategoryService] AI 生成設定成功`)
        } catch (error) {
          logger.error('[CategoryService] AI 生成設定失敗，使用預設值:', error)
          description = description || `${data.nameChinese}相關的知識和記錄`
          keywords = keywords || [data.nameChinese]
          systemPrompt = systemPrompt || `我是你的${data.nameChinese}助手，專門幫助你整理和管理${data.nameChinese}相關的知識。`
          personality = personality || '友善、專業、樂於助人'
          chatStyle = chatStyle || '清晰明瞭，提供實用建議'
        }
      }

      // 獲取當前最大 position
      const maxPosition = await prisma.subcategory.findFirst({
        where: { userId },
        orderBy: { position: 'desc' },
        select: { position: true },
      })

      const newPosition = maxPosition ? maxPosition.position + 1 : 0

      const subcategory = await prisma.subcategory.create({
        data: {
          userId,
          islandId: data.islandId,
          position: newPosition,
          name: data.name,
          nameChinese: data.nameChinese,
          emoji: data.emoji || '📚',
          color: data.color || '#FFB3D9',
          description: description || `${data.nameChinese}相關的知識和記錄`,
          keywords: keywords || [data.nameChinese],
          systemPrompt: systemPrompt || `我是你的${data.nameChinese}助手，專門幫助你整理和管理${data.nameChinese}相關的知識。`,
          personality: personality || '友善、專業、樂於助人',
          chatStyle: chatStyle || '清晰明瞭，提供實用建議',
        },
      })

      // 更新島嶼的小類別計數
      await prisma.island.update({
        where: { id: data.islandId },
        data: { subcategoryCount: { increment: 1 } },
      })

      logger.info(`[CategoryService] 創建小類別: ${subcategory.nameChinese}`)
      return subcategory
    } catch (error) {
      logger.error('[CategoryService] 創建小類別失敗:', error)
      throw new Error('創建小類別失敗')
    }
  }

  /**
   * 更新小類別
   */
  async updateSubcategory(userId: string, subcategoryId: string, data: {
    islandId?: string
    name?: string
    nameChinese?: string
    emoji?: string
    color?: string
    description?: string
    keywords?: string[]
    systemPrompt?: string
    personality?: string
    chatStyle?: string
    position?: number
    isActive?: boolean
  }) {
    try {
      const oldSubcategory = await prisma.subcategory.findFirst({
        where: { id: subcategoryId, userId },
      })

      if (!oldSubcategory) {
        throw new Error('小類別不存在')
      }

      const subcategory = await prisma.subcategory.update({
        where: { id: subcategoryId },
        data,
      })

      // 如果移動到不同島嶼，更新兩個島嶼的計數
      if (data.islandId && data.islandId !== oldSubcategory.islandId) {
        await Promise.all([
          // 舊島嶼 -1
          prisma.island.update({
            where: { id: oldSubcategory.islandId },
            data: { subcategoryCount: { decrement: 1 } },
          }),
          // 新島嶼 +1
          prisma.island.update({
            where: { id: data.islandId },
            data: { subcategoryCount: { increment: 1 } },
          }),
        ])
      }

      logger.info(`[CategoryService] 更新小類別: ${subcategoryId}`)
      return subcategory
    } catch (error) {
      logger.error('[CategoryService] 更新小類別失敗:', error)
      throw error
    }
  }

  /**
   * 刪除小類別
   */
  async deleteSubcategory(userId: string, subcategoryId: string) {
    try {
      // 檢查是否有記憶
      const memoriesCount = await prisma.memory.count({
        where: { subcategoryId, userId },
      })

      if (memoriesCount > 0) {
        throw new Error('請先刪除或移動該小類別下的所有記憶')
      }

      const subcategory = await prisma.subcategory.findFirst({
        where: { id: subcategoryId, userId },
      })

      if (!subcategory) {
        throw new Error('小類別不存在')
      }

      await prisma.subcategory.delete({
        where: { id: subcategoryId },
      })

      // 更新島嶼的小類別計數
      await prisma.island.update({
        where: { id: subcategory.islandId },
        data: { subcategoryCount: { decrement: 1 } },
      })

      logger.info(`[CategoryService] 刪除小類別: ${subcategoryId}`)
      return true
    } catch (error) {
      logger.error('[CategoryService] 刪除小類別失敗:', error)
      throw error
    }
  }

  /**
   * 重新排序小類別
   */
  async reorderSubcategories(userId: string, subcategoryIds: string[]) {
    try {
      await Promise.all(
        subcategoryIds.map((id, index) =>
          prisma.subcategory.updateMany({
            where: { id, userId },
            data: { position: index },
          })
        )
      )

      logger.info(`[CategoryService] 重新排序 ${subcategoryIds.length} 個小類別`)
      return true
    } catch (error) {
      logger.error('[CategoryService] 重新排序小類別失敗:', error)
      throw new Error('重新排序小類別失敗')
    }
  }

  // ============ 統計和工具方法 ============

  /**
   * 獲取分類統計
   */
  async getCategoryStats(userId: string) {
    try {
      const [islandsCount, subcategoriesCount, totalMemories] = await Promise.all([
        prisma.island.count({ where: { userId } }),
        prisma.subcategory.count({ where: { userId } }),
        prisma.memory.count({ where: { userId, subcategoryId: { not: null } } }),
      ])

      return {
        islandsCount,
        subcategoriesCount,
        totalMemories,
      }
    } catch (error) {
      logger.error('[CategoryService] 獲取統計失敗:', error)
      throw new Error('獲取統計失敗')
    }
  }
}

export const categoryService = new CategoryService()
