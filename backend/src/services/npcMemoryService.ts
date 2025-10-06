import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'
import { geminiService } from './geminiServiceMCP'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'
import * as fs from 'fs/promises'

const execAsync = promisify(exec)
const prisma = new PrismaClient()

interface Memory {
  id: string
  npcId: string
  memoryType: 'conversation' | 'event' | 'emotion' | 'relationship_change'
  content: string
  context?: any
  importanceScore: number
  emotionalImpact: number
  relatedUserId?: string
  relatedNpcId?: string
  accessCount: number
  lastAccessed: Date
  createdAt: Date
  expiresAt?: Date
}

interface NPCConversation {
  id: string
  npc1Id: string
  npc2Id: string
  content: string
  speakerNpcId: string
  conversationTopic?: string
  emotionalTone?: string
  context?: any
  triggeredBy?: string
  createdAt: Date
}

class NPCMemoryService {
  /**
   * 為 NPC 創建新記憶
   */
  async createMemory(
    npcId: string,
    memoryType: Memory['memoryType'],
    content: string,
    options: {
      importanceScore?: number
      emotionalImpact?: number
      relatedUserId?: string
      relatedNpcId?: string
      context?: any
      expiresAt?: Date
    } = {}
  ): Promise<Memory> {
    try {
      // 使用 AI 評估記憶重要性（如果未提供）
      let importanceScore = options.importanceScore
      if (importanceScore === undefined) {
        importanceScore = await this.calculateMemoryImportance(content, memoryType)
      }

      // 使用 AI 評估情緒影響（如果未提供）
      let emotionalImpact = options.emotionalImpact
      if (emotionalImpact === undefined) {
        emotionalImpact = await this.calculateEmotionalImpact(content)
      }

      const memory = await prisma.nPCMemory.create({
        data: {
          npcId,
          memoryType,
          content,
          importanceScore,
          emotionalImpact,
          relatedUserId: options.relatedUserId,
          relatedNpcId: options.relatedNpcId,
          context: options.context || {},
          expiresAt: options.expiresAt,
        },
      })

      logger.info(`Created memory for NPC ${npcId}: ${memoryType}`)
      return memory as Memory
    } catch (error) {
      logger.error('Failed to create NPC memory:', error)
      throw error
    }
  }

  /**
   * 檢索 NPC 的相關記憶
   */
  async retrieveMemories(
    npcId: string,
    options: {
      memoryType?: Memory['memoryType']
      relatedUserId?: string
      relatedNpcId?: string
      limit?: number
      minImportance?: number
      includeExpired?: boolean
    } = {}
  ): Promise<Memory[]> {
    try {
      const whereClause: any = {
        npcId,
        ...(options.memoryType && { memoryType: options.memoryType }),
        ...(options.relatedUserId && { relatedUserId: options.relatedUserId }),
        ...(options.relatedNpcId && { relatedNpcId: options.relatedNpcId }),
        ...(options.minImportance && { importanceScore: { gte: options.minImportance } }),
        ...(!options.includeExpired && {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        })
      }

      const memories = await prisma.nPCMemory.findMany({
        where: whereClause,
        orderBy: [
          { importanceScore: 'desc' },
          { lastAccessed: 'desc' },
          { createdAt: 'desc' }
        ],
        take: options.limit || 50
      })

      // 更新訪問計數
      const memoryIds = memories.map(m => m.id)
      if (memoryIds.length > 0) {
        await prisma.nPCMemory.updateMany({
          where: { id: { in: memoryIds } },
          data: {
            accessCount: { increment: 1 },
            lastAccessed: new Date()
          }
        })
      }

      return memories as Memory[]
    } catch (error) {
      logger.error('Failed to retrieve NPC memories:', error)
      throw error
    }
  }

  /**
   * 記錄 NPC 間的對話
   */
  async recordNPCConversation(
    npc1Id: string,
    npc2Id: string,
    content: string,
    speakerNpcId: string,
    options: {
      conversationTopic?: string
      emotionalTone?: string
      context?: any
      triggeredBy?: string
    } = {}
  ): Promise<NPCConversation> {
    try {
      const conversation = await prisma.nPCConversation.create({
        data: {
          npc1Id,
          npc2Id,
          content,
          speakerNpcId,
          conversationTopic: options.conversationTopic,
          emotionalTone: options.emotionalTone,
          context: options.context || {},
          triggeredBy: options.triggeredBy
        }
      })

      // 為參與對話的 NPC 創建記憶
      const otherNpcId = speakerNpcId === npc1Id ? npc2Id : npc1Id
      
      // 說話者的記憶
      await this.createMemory(
        speakerNpcId,
        'conversation',
        `我對${await this.getNPCName(otherNpcId)}說：「${content}」`,
        {
          relatedNpcId: otherNpcId,
          context: { conversationId: conversation.id, role: 'speaker', ...options.context },
          importanceScore: 0.6,
          emotionalImpact: await this.calculateEmotionalImpact(content)
        }
      )

      // 聽話者的記憶
      await this.createMemory(
        otherNpcId,
        'conversation',
        `${await this.getNPCName(speakerNpcId)}對我說：「${content}」`,
        {
          relatedNpcId: speakerNpcId,
          context: { conversationId: conversation.id, role: 'listener', ...options.context },
          importanceScore: 0.5,
          emotionalImpact: await this.calculateEmotionalImpact(content) * 0.8
        }
      )

      logger.info(`Recorded conversation between NPCs ${npc1Id} and ${npc2Id}`)
      return conversation as NPCConversation
    } catch (error) {
      logger.error('Failed to record NPC conversation:', error)
      throw error
    }
  }

  /**
   * NPC 間分享記憶/知識
   */
  async shareKnowledge(
    sourceNpcId: string,
    targetNpcId: string,
    memoryId: string,
    sharingMethod: 'conversation' | 'observation' | 'rumor' = 'conversation',
    reliabilityScore: number = 1.0
  ): Promise<void> {
    try {
      // 記錄知識分享
      await prisma.nPCKnowledgeSharing.create({
        data: {
          sourceNpcId,
          targetNpcId,
          sharedMemoryId: memoryId,
          sharingMethod,
          reliabilityScore
        }
      })

      // 獲取原始記憶
      const originalMemory = await prisma.nPCMemory.findUnique({
        where: { id: memoryId }
      })

      if (originalMemory) {
        // 為目標 NPC 創建新的間接記憶
        const sourceName = await this.getNPCName(sourceNpcId)
        const adaptedContent = `${sourceName}告訴我：${originalMemory.content}`
        
        await this.createMemory(
          targetNpcId,
          originalMemory.memoryType,
          adaptedContent,
          {
            importanceScore: originalMemory.importanceScore * reliabilityScore * 0.8,
            emotionalImpact: originalMemory.emotionalImpact * 0.6,
            relatedUserId: originalMemory.relatedUserId,
            relatedNpcId: sourceNpcId,
            context: {
              ...originalMemory.context,
              sharedFrom: sourceNpcId,
              sharingMethod,
              reliability: reliabilityScore
            }
          }
        )
      }

      logger.info(`NPC ${sourceNpcId} shared knowledge with ${targetNpcId}`)
    } catch (error) {
      logger.error('Failed to share knowledge between NPCs:', error)
      throw error
    }
  }

  /**
   * 觸發 NPC 間的自發對話
   */
  async triggerNPCInteraction(
    npc1Id: string,
    npc2Id: string,
    context: {
      location?: string
      trigger?: string
      topic?: string
    } = {}
  ): Promise<string[]> {
    try {
      // 獲取兩個 NPC 的個性和記憶
      const [npc1, npc2] = await Promise.all([
        this.getNPCWithMemories(npc1Id),
        this.getNPCWithMemories(npc2Id)
      ])

      // 獲取 NPC 間的關係
      const relationship = await prisma.nPCRelationship.findFirst({
        where: {
          OR: [
            { npc1Id, npc2Id },
            { npc1Id: npc2Id, npc2Id: npc1Id }
          ]
        }
      })

      // 使用 AI 生成對話
      const conversationPrompt = this.buildNPCInteractionPrompt(npc1, npc2, relationship, context)
      
      // 這裡需要修改 geminiService 來支援 NPC 間對話
      const aiResponse = await geminiService.generateNPCToNPCConversation(conversationPromput)
      
      // 解析 AI 回應並記錄對話
      const conversations = this.parseNPCConversation(aiResponse)
      const recordedConversations = []

      for (const conv of conversations) {
        const recorded = await this.recordNPCConversation(
          npc1Id,
          npc2Id,
          conv.content,
          conv.speakerNpcId,
          {
            conversationTopic: context.topic,
            emotionalTone: conv.emotionalTone,
            context: context,
            triggeredBy: context.trigger
          }
        )
        recordedConversations.push(conv.content)
      }

      return recordedConversations
    } catch (error) {
      logger.error('Failed to trigger NPC interaction:', error)
      throw error
    }
  }

  /**
   * 清理過期記憶
   */
  async cleanupExpiredMemories(): Promise<number> {
    try {
      const result = await prisma.nPCMemory.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      })

      logger.info(`Cleaned up ${result.count} expired memories`)
      return result.count
    } catch (error) {
      logger.error('Failed to cleanup expired memories:', error)
      throw error
    }
  }

  /**
   * AI 篩選對話記憶 - 整合 test_memory 的功能
   * 使用 Gemini AI 篩選重要對話進入長期記憶
   */
  async filterConversationsWithAI(
    npcId: string,
    userId: string,
    daysToFilter: number = 7
  ): Promise<number> {
    try {
      // 1. 獲取短期記憶（過去 N 天的對話，未標記為長期記憶）
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToFilter)

      const shortTermConversations = await prisma.conversation.findMany({
        where: {
          npcId,
          userId,
          timestamp: { gte: cutoffDate },
          isLongTermMemory: false
        },
        orderBy: { timestamp: 'asc' }
      })

      if (shortTermConversations.length === 0) {
        logger.info(`No short-term conversations to filter for NPC ${npcId}`)
        return 0
      }

      logger.info(`Found ${shortTermConversations.length} short-term conversations for NPC ${npcId}`)

      // 2. 調用 Python AI 篩選腳本
      const npcName = await this.getNPCInternalName(npcId)
      const filteredConversations = await this.callPythonMemoryFilter(npcName, shortTermConversations)

      if (!filteredConversations || filteredConversations.length === 0) {
        logger.info(`No important conversations filtered for NPC ${npcId}`)
        return 0
      }

      // 3. 更新篩選出的對話為長期記憶
      let updatedCount = 0
      for (const conv of filteredConversations) {
        try {
          await prisma.conversation.update({
            where: { id: conv.id },
            data: {
              isLongTermMemory: true,
              aiImportanceScore: conv.ai_importance_score,
              aiEmotionalImpact: conv.ai_emotional_impact,
              aiSummary: conv.ai_summary,
              aiKeywords: conv.ai_keywords || [],
              memoryType: 'long_term',
              archivedAt: new Date()
            }
          })
          updatedCount++
        } catch (error) {
          logger.error(`Failed to update conversation ${conv.id}:`, error)
        }
      }

      logger.info(`✅ Filtered ${updatedCount} conversations into long-term memory for NPC ${npcId}`)
      return updatedCount

    } catch (error) {
      logger.error('Failed to filter conversations with AI:', error)
      throw error
    }
  }

  /**
   * 調用 Python memory_filter.py 腳本
   */
  private async callPythonMemoryFilter(npcName: string, conversations: any[]): Promise<any[]> {
    try {
      // 準備臨時 JSON 文件
      const tempDir = path.join(__dirname, '../../tmp')
      await fs.mkdir(tempDir, { recursive: true })

      const tempFile = path.join(tempDir, `conversations_${npcName}_${Date.now()}.json`)

      // 轉換對話格式
      const conversationsData = conversations.map(conv => ({
        id: conv.id,
        timestamp: conv.timestamp,
        content: conv.content,
        speakerType: conv.speakerType,
        emotionTag: conv.emotionTag,
        createdAt: conv.timestamp
      }))

      await fs.writeFile(tempFile, JSON.stringify(conversationsData, null, 2))

      // 調用 Python 腳本
      const pythonScript = path.join(__dirname, '../../memory_filter.py')
      const command = `python3 ${pythonScript} ${npcName} ${tempFile}`

      logger.info(`Calling Python memory filter: ${command}`)

      const { stdout, stderr } = await execAsync(command, {
        timeout: 60000, // 60 seconds timeout
        env: { ...process.env }
      })

      if (stderr) {
        logger.warn(`Python filter stderr: ${stderr}`)
      }

      // 解析結果
      const result = JSON.parse(stdout)

      // 清理臨時文件
      await fs.unlink(tempFile).catch(() => {})

      return result

    } catch (error) {
      logger.error('Failed to call Python memory filter:', error)
      throw error
    }
  }

  /**
   * 獲取 NPC 的內部名稱 (用於 Python 腳本)
   */
  private async getNPCInternalName(npcId: string): Promise<string> {
    const npc = await prisma.nPC.findUnique({
      where: { id: npcId },
      select: { name: true }
    })

    const nameMapping: Record<string, string> = {
      '陸培修': 'lupeixiu',
      '劉宇岑': 'liuyucen',
      '陳庭安': 'chentingan'
    }

    return nameMapping[npc?.name || ''] || 'unknown'
  }

  /**
   * 獲取 NPC 的長期記憶
   */
  async getLongTermMemories(
    npcId: string,
    userId: string,
    limit: number = 20
  ): Promise<any[]> {
    try {
      const memories = await prisma.conversation.findMany({
        where: {
          npcId,
          userId,
          isLongTermMemory: true
        },
        orderBy: [
          { aiImportanceScore: 'desc' },
          { timestamp: 'desc' }
        ],
        take: limit
      })

      return memories
    } catch (error) {
      logger.error('Failed to get long-term memories:', error)
      throw error
    }
  }

  /**
   * 獲取 NPC 的短期記憶（最近的對話）
   */
  async getShortTermMemories(
    npcId: string,
    userId: string,
    days: number = 7,
    limit: number = 50
  ): Promise<any[]> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)

      const memories = await prisma.conversation.findMany({
        where: {
          npcId,
          userId,
          timestamp: { gte: cutoffDate },
          isLongTermMemory: false
        },
        orderBy: { timestamp: 'desc' },
        take: limit
      })

      return memories
    } catch (error) {
      logger.error('Failed to get short-term memories:', error)
      throw error
    }
  }

  /**
   * 定期歸檔任務：篩選所有 NPC 的短期記憶
   */
  async archiveAllNPCMemories(daysToFilter: number = 7): Promise<void> {
    try {
      logger.info('Starting memory archival task...')

      // 獲取所有 NPC
      const npcs = await prisma.nPC.findMany({
        select: { id: true, name: true }
      })

      // 獲取所有有對話的用戶-NPC 組合
      const userNpcPairs = await prisma.conversation.groupBy({
        by: ['userId', 'npcId'],
        where: {
          isLongTermMemory: false
        }
      })

      let totalFiltered = 0

      for (const pair of userNpcPairs) {
        try {
          const filtered = await this.filterConversationsWithAI(
            pair.npcId,
            pair.userId,
            daysToFilter
          )
          totalFiltered += filtered
        } catch (error) {
          logger.error(`Failed to filter for NPC ${pair.npcId}, User ${pair.userId}:`, error)
        }
      }

      logger.info(`✅ Memory archival completed. Filtered ${totalFiltered} conversations.`)
    } catch (error) {
      logger.error('Failed to archive NPC memories:', error)
      throw error
    }
  }

  /**
   * 私有輔助方法
   */
  private async calculateMemoryImportance(content: string, memoryType: Memory['memoryType']): Promise<number> {
    // 基於記憶類型的基礎重要性
    const baseImportance = {
      conversation: 0.5,
      event: 0.7,
      emotion: 0.6,
      relationship_change: 0.9
    }[memoryType]

    // 可以使用 AI 來更精確地評估重要性
    // 這裡簡化為基礎值 + 隨機變化
    return Math.min(1.0, baseImportance + (Math.random() - 0.5) * 0.3)
  }

  private async calculateEmotionalImpact(content: string): Promise<number> {
    // 簡化的情緒影響計算
    // 在實際應用中，可以使用情感分析 API
    const positiveWords = ['開心', '快樂', '溫暖', '美好', '喜歡', '愛', '謝謝']
    const negativeWords = ['難過', '傷心', '害怕', '生氣', '討厭', '痛苦', '擔心']
    
    let score = 0
    positiveWords.forEach(word => {
      if (content.includes(word)) score += 0.2
    })
    negativeWords.forEach(word => {
      if (content.includes(word)) score -= 0.2
    })

    return Math.max(-1.0, Math.min(1.0, score))
  }

  private async getNPCName(npcId: string): Promise<string> {
    const npc = await prisma.nPC.findUnique({
      where: { id: npcId },
      select: { name: true }
    })
    return npc?.name || '未知'
  }

  private async getNPCWithMemories(npcId: string) {
    return await prisma.nPC.findUnique({
      where: { id: npcId },
      include: {
        memories: {
          where: {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } }
            ]
          },
          orderBy: { importanceScore: 'desc' },
          take: 10
        }
      }
    })
  }

  private buildNPCInteractionPrompt(npc1: any, npc2: any, relationship: any, context: any): string {
    return `
兩個 NPC 即將進行對話：

NPC1: ${npc1.name}
個性: ${npc1.personality}
最近記憶: ${npc1.memories.map((m: any) => m.content).slice(0, 3).join('; ')}

NPC2: ${npc2.name}  
個性: ${npc2.personality}
最近記憶: ${npc2.memories.map((m: any) => m.content).slice(0, 3).join('; ')}

關係: ${relationship ? `${relationship.relationshipType} (強度: ${relationship.strength})` : '初次見面'}
場景: ${context.location || '未知地點'}
觸發原因: ${context.trigger || '偶然相遇'}
話題: ${context.topic || '自由對話'}

請生成 2-3 回合的自然對話，體現各自的個性特色。
格式要求：返回 JSON 數組，每個對話包含 speakerName, content, emotionalTone
    `.trim()
  }

  private parseNPCConversation(aiResponse: string): Array<{
    speakerNpcId: string
    content: string
    emotionalTone: string
  }> {
    try {
      // 解析 AI 回應，提取對話內容
      // 這是一個簡化版本，實際需要更複雜的解析邏輯
      const conversations = JSON.parse(aiResponse)
      return conversations.map((conv: any) => ({
        speakerNpcId: conv.speakerName === '艾瑪' ? 'emma_id' : 
                     conv.speakerName === '莉莉' ? 'lily_id' : 'tom_id',
        content: conv.content,
        emotionalTone: conv.emotionalTone || 'neutral'
      }))
    } catch (error) {
      logger.error('Failed to parse NPC conversation:', error)
      return []
    }
  }
}

export const npcMemoryService = new NPCMemoryService()