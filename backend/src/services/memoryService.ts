import { PrismaClient, AssistantType, ChatContextType } from '@prisma/client'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

export interface MemoryFilterOptions {
  userId: string
  assistantId?: string
  category?: AssistantType
  tags?: string[]
  search?: string
  isPinned?: boolean
  isArchived?: boolean
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

export interface CreateMemoryInput {
  userId: string
  assistantId: string
  content: string
  category: AssistantType
  summary?: string
  keyPoints?: string[]
  tags?: string[]
  aiSentiment?: string
  title?: string
  emoji?: string
}

/**
 * MemoryService - 管理記憶的 CRUD 操作
 */
export class MemoryService {
  /**
   * 創建新記憶
   */
  async createMemory(input: CreateMemoryInput) {
    try {
      const memory = await prisma.memory.create({
        data: {
          userId: input.userId,
          assistantId: input.assistantId,
          rawContent: input.content,
          summary: input.summary || input.content.substring(0, 100),
          keyPoints: input.keyPoints || [],
          tags: input.tags || [],
          category: input.category,
          aiSentiment: input.aiSentiment || 'neutral',
          title: input.title,
          emoji: input.emoji,
          relatedMemoryIds: [],
          isArchived: false,
          isPinned: false
        },
        include: {
          assistant: true,
          user: true
        }
      })

      logger.info(`Memory created: ${memory.id} for user ${input.userId}`)
      return memory
    } catch (error) {
      logger.error('Failed to create memory:', error)
      throw new Error('創建記憶失敗')
    }
  }

  /**
   * 獲取記憶列表（支援多種過濾）
   */
  async getMemories(filter: MemoryFilterOptions) {
    const {
      userId,
      assistantId,
      category,
      tags,
      search,
      isPinned,
      isArchived,
      startDate,
      endDate,
      limit = 50,
      offset = 0
    } = filter

    const where: any = {
      userId
    }

    if (assistantId) where.assistantId = assistantId
    if (category) where.category = category
    if (isPinned !== undefined) where.isPinned = isPinned
    if (isArchived !== undefined) where.isArchived = isArchived

    // 標籤過濾
    if (tags && tags.length > 0) {
      where.tags = { hasSome: tags }
    }

    // 搜尋過濾
    if (search) {
      where.OR = [
        { rawContent: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } }
      ]
    }

    // 日期範圍過濾
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = startDate
      if (endDate) where.createdAt.lte = endDate
    }

    try {
      const memories = await prisma.memory.findMany({
        where,
        orderBy: [
          { isPinned: 'desc' },
          { createdAt: 'desc' }
        ],
        take: limit,
        skip: offset,
        include: {
          assistant: true,
          chatMessages: {
            orderBy: { createdAt: 'desc' },
            take: 3
          }
        }
      })

      return memories
    } catch (error) {
      logger.error('Failed to get memories:', error)
      throw new Error('獲取記憶失敗')
    }
  }

  /**
   * 獲取單個記憶
   */
  async getMemoryById(id: string, userId: string) {
    try {
      const memory = await prisma.memory.findUnique({
        where: { id },
        include: {
          assistant: true,
          user: true,
          chatMessages: {
            orderBy: { createdAt: 'desc' }
          }
        }
      })

      if (!memory) {
        throw new Error('記憶不存在')
      }

      if (memory.userId !== userId) {
        throw new Error('無權訪問此記憶')
      }

      return memory
    } catch (error) {
      logger.error('Failed to get memory by id:', error)
      throw error
    }
  }

  /**
   * 更新記憶
   */
  async updateMemory(
    id: string,
    userId: string,
    updates: {
      title?: string
      rawContent?: string
      emoji?: string
      category?: AssistantType
      subcategoryId?: string | null
      tags?: string[]
      fileUrls?: string[]
      fileNames?: string[]
      fileTypes?: string[]
      links?: string[]
      linkTitles?: string[]
      isPinned?: boolean
      isArchived?: boolean
    }
  ) {
    try {
      // 驗證權限
      const existing = await prisma.memory.findUnique({
        where: { id }
      })

      if (!existing || existing.userId !== userId) {
        throw new Error('無權修改此記憶')
      }

      const memory = await prisma.memory.update({
        where: { id },
        data: {
          ...updates,
          archivedAt: updates.isArchived ? new Date() : null
        },
        include: {
          assistant: true,
          subcategory: true
        }
      })

      logger.info(`Memory updated: ${id}`)
      return memory
    } catch (error) {
      logger.error('Failed to update memory:', error)
      throw error
    }
  }

  /**
   * 刪除記憶
   */
  async deleteMemory(id: string, userId: string) {
    try {
      // 驗證權限
      const existing = await prisma.memory.findUnique({
        where: { id }
      })

      if (!existing || existing.userId !== userId) {
        throw new Error('無權刪除此記憶')
      }

      await prisma.memory.delete({
        where: { id }
      })

      logger.info(`Memory deleted: ${id}`)
      return true
    } catch (error) {
      logger.error('Failed to delete memory:', error)
      throw error
    }
  }

  /**
   * 釘選記憶
   */
  async pinMemory(id: string, userId: string) {
    return this.updateMemory(id, userId, { isPinned: true })
  }

  /**
   * 取消釘選
   */
  async unpinMemory(id: string, userId: string) {
    return this.updateMemory(id, userId, { isPinned: false })
  }

  /**
   * 歸檔記憶
   */
  async archiveMemory(id: string, userId: string) {
    return this.updateMemory(id, userId, { isArchived: true })
  }

  /**
   * 取消歸檔
   */
  async unarchiveMemory(id: string, userId: string) {
    return this.updateMemory(id, userId, { isArchived: false })
  }

  /**
   * 搜尋記憶
   */
  async searchMemories(userId: string, query: string, limit = 20) {
    return this.getMemories({
      userId,
      search: query,
      isArchived: false,
      limit
    })
  }

  /**
   * 獲取相關記憶（基於標籤和內容相似度）
   */
  async getRelatedMemories(memoryId: string, userId: string, limit = 5) {
    try {
      const memory = await prisma.memory.findUnique({
        where: { id: memoryId }
      })

      if (!memory || memory.userId !== userId) {
        return []
      }

      // 優先使用已設定的關聯
      if (memory.relatedMemoryIds && memory.relatedMemoryIds.length > 0) {
        const related = await prisma.memory.findMany({
          where: {
            id: { in: memory.relatedMemoryIds },
            userId
          },
          include: { assistant: true },
          take: limit
        })

        if (related.length > 0) return related
      }

      // 否則根據標籤查找相似記憶
      if (memory.tags && memory.tags.length > 0) {
        const related = await prisma.memory.findMany({
          where: {
            userId,
            id: { not: memoryId },
            tags: { hasSome: memory.tags }
          },
          orderBy: [
            { isPinned: 'desc' },
            { createdAt: 'desc' }
          ],
          take: limit,
          include: { assistant: true }
        })

        return related
      }

      // 最後根據相同類別查找
      return prisma.memory.findMany({
        where: {
          userId,
          id: { not: memoryId },
          category: memory.category
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { assistant: true }
      })
    } catch (error) {
      logger.error('Failed to get related memories:', error)
      return []
    }
  }

  /**
   * 連結記憶
   */
  async linkMemories(memoryId: string, relatedIds: string[], userId: string) {
    try {
      const memory = await prisma.memory.findUnique({
        where: { id: memoryId }
      })

      if (!memory || memory.userId !== userId) {
        throw new Error('無權修改此記憶')
      }

      // 合併現有和新增的關聯
      const existingIds = memory.relatedMemoryIds || []
      const updatedIds = [...new Set([...existingIds, ...relatedIds])]

      const updated = await prisma.memory.update({
        where: { id: memoryId },
        data: { relatedMemoryIds: updatedIds },
        include: { assistant: true }
      })

      logger.info(`Memory links updated: ${memoryId}`)
      return updated
    } catch (error) {
      logger.error('Failed to link memories:', error)
      throw error
    }
  }

  /**
   * 獲取釘選的記憶
   */
  async getPinnedMemories(userId: string) {
    return this.getMemories({
      userId,
      isPinned: true,
      isArchived: false,
      limit: 100
    })
  }
}

export const memoryService = new MemoryService()
