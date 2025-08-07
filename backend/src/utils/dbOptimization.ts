import { PrismaClient } from '@prisma/client'
import { logger } from './logger'

/**
 * 優化的資料庫查詢工具
 */
export class OptimizedDBQueries {
  constructor(private prisma: PrismaClient) {}

  /**
   * 批次獲取 NPC 完整資料（單次查詢）
   */
  async getNPCWithFullContext(npcId: string, userId: string) {
    const startTime = Date.now()
    
    // 使用單一查詢獲取所有相關資料
    const result = await this.prisma.nPC.findUnique({
      where: { id: npcId },
      include: {
        relationships: {
          where: { userId },
          include: {
            conversations: {
              orderBy: { createdAt: 'desc' },
              take: 10,
              include: {
                messages: {
                  orderBy: { timestamp: 'asc' },
                  take: 20
                }
              }
            }
          }
        },
        memoryFlowers: {
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    })
    
    logger.info(`資料庫查詢完成，耗時: ${Date.now() - startTime}ms`)
    return result
  }

  /**
   * 批次插入訊息（優化寫入）
   */
  async batchInsertMessages(messages: Array<{
    conversationId: string
    speaker: string
    content: string
    emotionTag?: string
  }>) {
    // 使用交易確保資料一致性
    return await this.prisma.$transaction(
      messages.map(msg => 
        this.prisma.message.create({
          data: {
            conversationId: msg.conversationId,
            speaker: msg.speaker,
            content: msg.content,
            emotionTag: msg.emotionTag,
            timestamp: new Date()
          }
        })
      )
    )
  }

  /**
   * 預載入常用 NPC 資料
   */
  async preloadNPCData() {
    const npcs = await this.prisma.nPC.findMany({
      where: {
        id: { in: ['npc-1', 'npc-2', 'npc-3'] }
      },
      include: {
        memoryFlowers: {
          take: 3,
          orderBy: { createdAt: 'desc' }
        }
      }
    })
    
    // 轉換為 Map 便於快速查找
    const npcMap = new Map()
    npcs.forEach(npc => npcMap.set(npc.id, npc))
    
    return npcMap
  }

  /**
   * 使用原生 SQL 優化複雜查詢
   */
  async getConversationStats(userId: string) {
    return await this.prisma.$queryRaw`
      SELECT 
        n.id as npc_id,
        n.name as npc_name,
        COUNT(DISTINCT c.id) as conversation_count,
        COUNT(m.id) as message_count,
        MAX(m.timestamp) as last_interaction,
        AVG(r.trust_level) as avg_trust,
        AVG(r.affection_level) as avg_affection
      FROM "NPC" n
      LEFT JOIN "Relationship" r ON r.npc_id = n.id AND r.user_id = ${userId}
      LEFT JOIN "Conversation" c ON c.npc_id = n.id AND c.user_id = ${userId}
      LEFT JOIN "Message" m ON m.conversation_id = c.id
      GROUP BY n.id, n.name
      ORDER BY last_interaction DESC
    `
  }
}