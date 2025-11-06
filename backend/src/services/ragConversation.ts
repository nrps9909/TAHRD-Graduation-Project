/**
 * RAG Conversation Service - 對話式 RAG 查詢系統
 * 使用 Gemini 2.5 Flash + 混合檢索（語義 + 結構化）增強生成
 *
 * ⚡ 優化版本：
 * - 智能意圖分析
 * - 混合檢索策略
 * - 性能監控
 */

import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'
import { queryIntentAnalyzer } from './queryIntentAnalyzer'
import { hybridSearchService } from './hybridSearchService'
import { callGeminiAPI } from '../utils/geminiAPI'
import { vectorService } from './vectorService'

const prisma = new PrismaClient()

interface RAGChatInput {
  userId: string
  sessionId: string
  query: string
  maxContext?: number // 最多使用多少條記憶作為上下文
}

interface RAGChatResponse {
  answer: string
  sources: Array<{
    memoryId: string
    title: string
    relevance: number
  }>
  conversationHistory: Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
  }>
}

/**
 * RAG 對話服務
 */
export class RAGConversationService {
  private model = 'gemini-2.5-flash'

  /**
   * RAG 對話 - 核心方法（⚡ 優化版）
   *
   * 流程：
   * 1. ⚡ 意圖分析（判斷查詢類型）
   * 2. ⚡ 混合檢索（根據意圖選擇最佳策略）
   * 3. 獲取對話歷史
   * 4. 構建 RAG Prompt
   * 5. 生成回答
   * 6. 更新會話
   */
  async chat(input: RAGChatInput): Promise<RAGChatResponse> {
    const startTime = Date.now()

    try {
      logger.info(`[RAG] Starting conversation for session ${input.sessionId}`)
      logger.info(`[RAG] Query: "${input.query.substring(0, 100)}..."`)

      // 1. 🚀 直接獲取所有用戶記憶（移除 RAG 檢索層）
      const memoryStartTime = Date.now()
      const allMemories = await prisma.memory.findMany({
        where: {
          userId: input.userId,
          isArchived: false, // 不包含已歸檔的記憶
        },
        orderBy: [
          { importanceScore: 'desc' }, // 先按重要性排序
          { createdAt: 'desc' },       // 再按時間排序
        ],
        select: {
          id: true,
          title: true,
          rawContent: true,
          summary: true,
          tags: true,
          islandId: true,
          createdAt: true,
          importanceScore: true,
          island: {
            select: {
              nameChinese: true,
              emoji: true,
            },
          },
        },
      })
      const memoryTime = Date.now() - memoryStartTime

      logger.info(
        `[RAG] Loaded ALL memories in ${memoryTime}ms: ` +
        `total ${allMemories.length} memories`
      )

      // 2. 轉換為統一格式（包含摘要 + 原始內容片段）
      const allMemoriesFormatted = allMemories.map((m) => {
        // 準備摘要
        const summary = m.summary || '無摘要'

        // 準備原始內容片段（限制長度避免 token 過多）
        const rawContentPreview = m.rawContent
          ? m.rawContent.substring(0, 300) + (m.rawContent.length > 300 ? '...' : '')
          : ''

        return {
          memoryId: m.id,
          title: m.title || '無標題',
          summary,
          rawContentPreview,
          tags: m.tags,
          islandName: m.island?.nameChinese || '未分類',
          islandEmoji: m.island?.emoji || '📝',
          importance: m.importanceScore || 5,
          createdAt: m.createdAt,
        }
      })

      // 3. 獲取對話歷史
      const sessionStartTime = Date.now()
      const session = await this.getOrCreateSession(input.userId, input.sessionId)
      const sessionTime = Date.now() - sessionStartTime

      const conversationHistory = session.messages as Array<{
        role: 'user' | 'assistant'
        content: string
        timestamp: string
      }>

      // 4. 構建 Full Context Prompt（包含所有記憶）
      const ragPrompt = this.buildFullContextPrompt(
        input.query,
        allMemoriesFormatted,
        conversationHistory
      )

      // 5. 調用 Gemini 2.5 Flash 生成回答（1M token 窗口可容納所有記憶）
      const geminiStartTime = Date.now()
      const answer = await this.callGemini(ragPrompt)
      const geminiTime = Date.now() - geminiStartTime

      // 6. 更新對話會話
      await this.updateSession(
        input.sessionId,
        input.query,
        answer,
        allMemoriesFormatted.slice(0, 10).map((r) => ({
          memoryId: r.memoryId,
          title: r.title,
          similarity: 1.0 // 所有記憶都可見，標記為 100% 相關
        }))
      )

      const totalTime = Date.now() - startTime

      // ⚡ 性能日誌
      logger.info(
        `[RAG] Chat completed in ${totalTime}ms: ` +
        `memory=${memoryTime}ms, session=${sessionTime}ms, gemini=${geminiTime}ms`
      )

      // 7. 返回結果
      return {
        answer,
        sources: allMemoriesFormatted.slice(0, 20).map((r) => ({
          memoryId: r.memoryId,
          title: r.title,
          relevance: 1.0, // 所有記憶都可見
        })),
        conversationHistory: [
          ...conversationHistory.map((m) => ({
            role: m.role,
            content: m.content,
            timestamp: new Date(m.timestamp),
          })),
          {
            role: 'user',
            content: input.query,
            timestamp: new Date(),
          },
          {
            role: 'assistant',
            content: answer,
            timestamp: new Date(),
          },
        ],
      }
    } catch (error) {
      const totalTime = Date.now() - startTime
      logger.error(`[RAG] Chat failed after ${totalTime}ms:`, error)
      throw error
    }
  }

  /**
   * 檢索上下文 - 使用語義搜尋
   */
  private async retrieveContext(
    userId: string,
    query: string,
    maxResults: number
  ): Promise<
    Array<{
      memoryId: string
      title: string
      content: string
      tags: string[]
      similarity: number
    }>
  > {
    // 1. 語義搜尋
    const semanticResults = await vectorService.semanticSearch(userId, query, maxResults, 0.3)

    // 2. 獲取完整記憶資訊
    const memoryIds = semanticResults.map((r: { memoryId: string; similarity: number }) => r.memoryId)
    const memories = await prisma.memory.findMany({
      where: {
        id: { in: memoryIds },
        userId,
      },
      select: {
        id: true,
        title: true,
        rawContent: true,
        summary: true,
        tags: true,
        keyPoints: true,
      },
    })

    // 3. 合併結果並排序
    const enrichedResults = semanticResults.map((sr: { memoryId: string; similarity: number }) => {
      const memory = memories.find((m) => m.id === sr.memoryId)
      return {
        memoryId: sr.memoryId,
        title: memory?.title || '無標題',
        content: memory?.summary || memory?.rawContent || '',
        tags: memory?.tags || [],
        similarity: sr.similarity,
      }
    })

    return enrichedResults.sort((a: { similarity: number }, b: { similarity: number }) => b.similarity - a.similarity)
  }

  /**
   * 構建 RAG Prompt（⚡ 優化版）
   *
   * 根據意圖類型調整 prompt 策略
   */
  private buildRAGPrompt(
    query: string,
    context: Array<{ title: string; content: string; tags: string[]; source?: string }>,
    history: Array<{ role: string; content: string }>,
    intent?: any
  ): string {
    // 構建上下文文本（使用清晰的標題而非編號）
    const contextText = context
      .map((c, i) => {
        const sourceLabel = c.source === 'semantic' ? '語義相似' :
                           c.source === 'structured' ? '結構匹配' : '統計結果'
        // 使用清晰的格式，方便 AI 引用
        return `📝 **${c.title}**（${sourceLabel}）\n內容: ${c.content}\n標籤: ${c.tags.join(', ')}`
      })
      .join('\n\n')

    // 對話歷史
    const historyText =
      history.length > 0
        ? history
            .slice(-4) // 只保留最近 4 輪對話
            .map((h) => `${h.role === 'user' ? '用戶' : '小黑'}: ${h.content}`)
            .join('\n')
        : ''

    // 根據意圖類型調整指令
    let intentGuidance = ''
    if (intent) {
      switch (intent.type) {
        case 'temporal':
          intentGuidance = '\n【特別提示】這是時間範圍查詢，請關注記憶的時間順序。'
          break
        case 'categorical':
          intentGuidance = '\n【特別提示】這是分類/標籤查詢，請按類別組織答案。'
          break
        case 'statistical':
          intentGuidance = '\n【特別提示】這是統計查詢，請提供數量和分類統計。'
          break
        case 'hybrid':
          intentGuidance = '\n【特別提示】這是複合查詢，請綜合多個維度回答。'
          break
      }
    }

    return `你是小黑（Hijiki），一個溫暖且專業的知識管理員 🌙

你的任務是基於用戶的知識庫回答問題，像朋友一樣親切地幫助他們回顧記憶。

【知識庫上下文】
${contextText || '（未找到相關記憶）'}
${intentGuidance}
${historyText ? `\n【對話歷史】\n${historyText}\n` : ''}
【用戶問題】
${query}

【回答要求】
1. 直接回答問題，不要每次都自我介紹
2. 使用親切自然的語氣（用「你」而非「您」），像朋友一樣聊天
3. **回答要詳細且完整，充分展現你找到的記憶內容**
4. **如果找到多條記憶，請全部列出來，不要只挑幾個**
5. 引用記憶時，直接使用記憶標題（例如：「你在『心情記錄』中提到...」）
6. 用列表或項目符號清楚呈現多條記憶（例如：• 項目一）
7. 每條記憶都要簡單說明內容，不要只列標題
8. 如果沒有相關資訊，誠實告知並主動提供幫助
9. 避免使用官腔用語（如「關於您詢問」、「不過我觀察到」）
10. **回應長度：2-5 句話（如果只有 1-2 條記憶），或者更長（如果有 3 條以上記憶）**
11. 像朋友一樣表達興趣和關心，而不是只報告結果

請回答：`
  }

  /**
   * 構建 Full Context Prompt（🚀 新版：包含所有記憶）
   *
   * 不使用 RAG 檢索，直接將所有記憶 feed 給 LLM
   * Gemini 2.5 Flash 有 1M token 窗口，足以容納所有記憶
   * ✨ 同時包含摘要和原始內容片段，確保能搜尋到人名等細節
   */
  private buildFullContextPrompt(
    query: string,
    allMemories: Array<{
      memoryId: string
      title: string
      summary: string
      rawContentPreview: string
      tags: string[]
      islandName: string
      islandEmoji: string
      importance: number
      createdAt: Date
    }>,
    history: Array<{ role: string; content: string }>
  ): string {
    // 構建完整的記憶庫文本（包含摘要 + 原始內容片段）
    const memoriesText = allMemories.length > 0
      ? allMemories
          .map((m, i) => {
            const dateStr = new Date(m.createdAt).toLocaleDateString('zh-TW', {
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })

            // 構建記憶條目：標題 + 摘要 + 原始內容片段
            let memoryText = `${i + 1}. ${m.islandEmoji} **${m.title}** [${m.islandName}] (${dateStr})
   重要度: ${m.importance}/10
   摘要: ${m.summary}
   標籤: ${m.tags.join(', ') || '無'}`

            // 如果有原始內容，追加預覽（用於搜尋人名等細節）
            if (m.rawContentPreview) {
              memoryText += `\n   原始內容: ${m.rawContentPreview}`
            }

            return memoryText
          })
          .join('\n\n')
      : '（還沒有任何記憶）'

    // 對話歷史
    const historyText =
      history.length > 0
        ? history
            .slice(-4) // 保留最近 4 輪對話
            .map((h) => `${h.role === 'user' ? '用戶' : '小黑'}: ${h.content}`)
            .join('\n')
        : ''

    return `你是小黑（Hijiki），一個溫暖且專業的知識管理員 🌙

你可以看到用戶的**所有記憶**，不會漏掉任何一條。
每條記憶都包含：摘要（整體描述）和原始內容（對話細節、人名等）。

【完整知識庫】（共 ${allMemories.length} 條記憶）
${memoriesText}

${historyText ? `【對話歷史】\n${historyText}\n` : ''}
【用戶問題】
${query}

【回答要求】
1. 直接回答問題，不要每次都自我介紹
2. 使用親切自然的語氣（用「你」而非「您」），像朋友一樣聊天
3. **你可以看到所有 ${allMemories.length} 條記憶的摘要和原始內容，請充分利用它們來回答**
4. **搜尋人名時，請特別注意「原始內容」欄位，因為人名通常在對話細節中**
5. **如果問題涉及多條記憶，請全部列出來**
6. 引用記憶時，直接使用記憶標題（例如：「你在『心情記錄』中提到...」）
7. 用列表或項目符號清楚呈現多條記憶（例如：• 項目一）
8. 每條記憶都要簡單說明內容，不要只列標題
9. 如果沒有相關資訊，誠實告知並主動提供幫助
10. 避免使用官腔用語（如「關於您詢問」、「不過我觀察到」）
11. **回應長度：根據找到的記憶數量調整，1-2 條記憶用 2-3 句話，3 條以上用更長的回應**
12. 像朋友一樣表達興趣和關心，而不是只報告結果

請回答：`
  }

  /**
   * 調用 Gemini REST API 生成回答
   */
  private async callGemini(prompt: string): Promise<string> {
    try {
      const response = await callGeminiAPI(prompt, {
        model: this.model,
        temperature: 0.7,
        maxOutputTokens: 2048,
        timeout: 30000 // 增加到 30 秒以處理複雜的 RAG 查詢
      })

      logger.info(`[RAG] Gemini REST API response generated (${response.length} chars)`)
      return response
    } catch (error: any) {
      logger.error('[RAG] Gemini REST API call failed:', error.message)
      // 提供更詳細的錯誤訊息
      if (error.message.includes('超時')) {
        throw new Error('抱歉，查詢時間過長，請嘗試簡化問題或稍後再試')
      } else if (error.message.includes('配額')) {
        throw new Error('API 配額已用盡，請稍後再試')
      } else {
        throw new Error(`生成回答失敗: ${error.message}`)
      }
    }
  }

  /**
   * 獲取或創建會話
   */
  private async getOrCreateSession(userId: string, sessionId: string) {
    let session = await prisma.hijikiSession.findFirst({
      where: { userId, sessionId },
    })

    if (!session) {
      session = await prisma.hijikiSession.create({
        data: {
          userId,
          sessionId,
          title: '與小黑的對話',
          mode: 'chat',
          messages: [],
          usedMemoryIds: [],
        },
      })
      logger.info(`[RAG] Created new session ${sessionId}`)
    }

    return session
  }

  /**
   * 獲取會話（不創建新的）
   */
  async getSession(userId: string, sessionId: string) {
    return await prisma.hijikiSession.findFirst({
      where: { userId, sessionId },
    })
  }

  /**
   * 更新會話
   */
  private async updateSession(
    sessionId: string,
    userQuery: string,
    assistantAnswer: string,
    usedMemories: Array<{ memoryId: string }>
  ) {
    const session = await prisma.hijikiSession.findFirst({
      where: { sessionId },
    })

    if (!session) return

    const newMessages = [
      ...(session.messages as any[]),
      {
        role: 'user',
        content: userQuery,
        timestamp: new Date().toISOString(),
      },
      {
        role: 'assistant',
        content: assistantAnswer,
        timestamp: new Date().toISOString(),
      },
    ]

    const usedMemoryIds = [
      ...new Set([...session.usedMemoryIds, ...usedMemories.map((m) => m.memoryId)]),
    ]

    await prisma.hijikiSession.update({
      where: { id: session.id },
      data: {
        messages: newMessages,
        usedMemoryIds,
        totalQueries: session.totalQueries + 1,
        lastActiveAt: new Date(),
      },
    })

    logger.info(`[RAG] Updated session ${sessionId}`)
  }

  /**
   * 清空會話歷史（保持 isActive 為 true）
   */
  async clearSession(userId: string, sessionId: string): Promise<void> {
    await prisma.hijikiSession.updateMany({
      where: { userId, sessionId },
      data: {
        messages: [],
        // 不改變 isActive 狀態，保持會話在列表中可見
      },
    })

    logger.info(`[RAG] Cleared session ${sessionId}`)
  }

  /**
   * 獲取用戶的所有會話
   */
  async getUserSessions(userId: string) {
    return await prisma.hijikiSession.findMany({
      where: { userId, isActive: true },
      orderBy: { lastActiveAt: 'desc' },
      take: 20,
    })
  }

  /**
   * 刪除會話
   */
  async deleteSession(userId: string, sessionId: string): Promise<boolean> {
    try {
      await prisma.hijikiSession.deleteMany({
        where: { userId, sessionId },
      })

      logger.info(`[RAG] Deleted session ${sessionId}`)
      return true
    } catch (error) {
      logger.error(`[RAG] Delete session failed:`, error)
      return false
    }
  }
}

export const ragConversation = new RAGConversationService()
