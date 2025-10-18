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

      // 1. ⚡ 意圖分析（新增）
      const intentStartTime = Date.now()
      const intent = await queryIntentAnalyzer.analyze(input.query)
      const intentTime = Date.now() - intentStartTime

      logger.info(
        `[RAG] Intent analysis completed in ${intentTime}ms: ` +
        `type=${intent.type}, confidence=${intent.confidence.toFixed(2)}`
      )

      // 2. ⚡ 混合檢索（替換原來的純語義搜尋）
      const searchStartTime = Date.now()
      const searchResults = await hybridSearchService.search(
        input.userId,
        intent,
        input.maxContext || 5
      )
      const searchTime = Date.now() - searchStartTime

      logger.info(
        `[RAG] Hybrid search completed in ${searchTime}ms: ` +
        `found ${searchResults.length} results`
      )

      // 3. 獲取對話歷史
      const sessionStartTime = Date.now()
      const session = await this.getOrCreateSession(input.userId, input.sessionId)
      const sessionTime = Date.now() - sessionStartTime

      const conversationHistory = session.messages as Array<{
        role: 'user' | 'assistant'
        content: string
        timestamp: string
      }>

      // 4. 構建 RAG Prompt（包含意圖資訊）
      const ragPrompt = this.buildRAGPrompt(
        input.query,
        searchResults,
        conversationHistory,
        intent
      )

      // 5. 調用 Gemini 2.5 Flash 生成回答
      const geminiStartTime = Date.now()
      const answer = await this.callGemini(ragPrompt)
      const geminiTime = Date.now() - geminiStartTime

      // 6. 更新對話會話
      await this.updateSession(
        input.sessionId,
        input.query,
        answer,
        searchResults.map((r) => ({ memoryId: r.memoryId, title: r.title, similarity: r.similarity }))
      )

      const totalTime = Date.now() - startTime

      // ⚡ 性能日誌
      logger.info(
        `[RAG] Chat completed in ${totalTime}ms: ` +
        `intent=${intentTime}ms, search=${searchTime}ms, ` +
        `session=${sessionTime}ms, gemini=${geminiTime}ms`
      )

      // 7. 返回結果
      return {
        answer,
        sources: searchResults.map((r) => ({
          memoryId: r.memoryId,
          title: r.title,
          relevance: r.similarity,
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
    const semanticResults = await vectorService.semanticSearch(userId, query, maxResults, 0.5)

    // 2. 獲取完整記憶資訊
    const memoryIds = semanticResults.map((r) => r.memoryId)
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
    const enrichedResults = semanticResults.map((sr) => {
      const memory = memories.find((m) => m.id === sr.memoryId)
      return {
        memoryId: sr.memoryId,
        title: memory?.title || '無標題',
        content: memory?.summary || memory?.rawContent || '',
        tags: memory?.tags || [],
        similarity: sr.similarity,
      }
    })

    return enrichedResults.sort((a, b) => b.similarity - a.similarity)
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
    // 構建上下文文本（標註來源）
    const contextText = context
      .map((c, i) => {
        const sourceLabel = c.source === 'semantic' ? '語義相似' :
                           c.source === 'structured' ? '結構匹配' : '統計結果'
        return `[記憶 ${i + 1}]（${sourceLabel}）${c.title}\n內容: ${c.content}\n標籤: ${c.tags.join(', ')}`
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

    return `你是小黑（Hijiki），一個專業的知識管理員 🌙

你的任務是基於用戶的知識庫回答問題。

【知識庫上下文】
${contextText || '（未找到相關記憶）'}
${intentGuidance}
${historyText ? `\n【對話歷史】\n${historyText}\n` : ''}
【用戶問題】
${query}

【回答要求】
1. 基於提供的知識庫上下文回答
2. 如果知識庫中沒有相關資訊，誠實告知
3. 用清晰、專業且友善的語氣
4. 適當引用具體的記憶內容（可以提到記憶編號）
5. 回答要簡潔明瞭，突出重點

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
        timeout: 20000
      })

      logger.info(`[RAG] Gemini REST API response generated (${response.length} chars)`)
      return response
    } catch (error: any) {
      logger.error('[RAG] Gemini REST API call failed:', error.message)
      throw new Error('生成回答失敗')
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
   * 清空會話歷史
   */
  async clearSession(userId: string, sessionId: string): Promise<void> {
    await prisma.hijikiSession.updateMany({
      where: { userId, sessionId },
      data: {
        messages: [],
        isActive: false,
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
}

export const ragConversation = new RAGConversationService()
