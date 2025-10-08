/**
 * RAG Conversation Service - 對話式 RAG 查詢系統
 * 使用 Gemini 2.5 Flash + 向量檢索增強生成
 */

import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'
import { vectorService } from './vectorService'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
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
   * RAG 對話 - 核心方法
   */
  async chat(input: RAGChatInput): Promise<RAGChatResponse> {
    try {
      logger.info(`[RAG] Starting conversation for session ${input.sessionId}`)

      // 1. 檢索相關記憶（使用語義搜尋）
      const relevantMemories = await this.retrieveContext(
        input.userId,
        input.query,
        input.maxContext || 5
      )

      logger.info(`[RAG] Retrieved ${relevantMemories.length} relevant memories`)

      // 2. 獲取對話歷史
      const session = await this.getOrCreateSession(input.userId, input.sessionId)
      const conversationHistory = session.messages as Array<{
        role: 'user' | 'assistant'
        content: string
        timestamp: string
      }>

      // 3. 構建 RAG Prompt
      const ragPrompt = this.buildRAGPrompt(
        input.query,
        relevantMemories,
        conversationHistory
      )

      // 4. 調用 Gemini 2.5 Flash 生成回答
      const answer = await this.callGemini(ragPrompt)

      // 5. 更新對話會話
      await this.updateSession(input.sessionId, input.query, answer, relevantMemories)

      // 6. 返回結果
      return {
        answer,
        sources: relevantMemories.map((m) => ({
          memoryId: m.memoryId,
          title: m.title,
          relevance: m.similarity,
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
      logger.error('[RAG] Chat failed:', error)
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
   * 構建 RAG Prompt
   */
  private buildRAGPrompt(
    query: string,
    context: Array<{ title: string; content: string; tags: string[] }>,
    history: Array<{ role: string; content: string }>
  ): string {
    const contextText = context
      .map(
        (c, i) =>
          `[記憶 ${i + 1}] ${c.title}\n內容: ${c.content}\n標籤: ${c.tags.join(', ')}`
      )
      .join('\n\n')

    const historyText =
      history.length > 0
        ? history
            .slice(-4) // 只保留最近 4 輪對話
            .map((h) => `${h.role === 'user' ? '用戶' : '小黑'}: ${h.content}`)
            .join('\n')
        : ''

    return `你是小黑（Hijiki），一個專業的知識管理員 🌙

你的任務是基於用戶的知識庫回答問題。

【知識庫上下文】
${contextText}

${historyText ? `【對話歷史】\n${historyText}\n` : ''}
【用戶問題】
${query}

【回答要求】
1. 基於提供的知識庫上下文回答
2. 如果知識庫中沒有相關資訊，誠實告知
3. 用清晰、專業且友善的語氣
4. 適當引用具體的記憶內容
5. 回答要簡潔明瞭

請回答：`
  }

  /**
   * 調用 Gemini 2.5 Flash
   */
  private async callGemini(prompt: string): Promise<string> {
    try {
      // 轉義特殊字符
      const escapedPrompt = prompt
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\$/g, '\\$')
        .replace(/`/g, '\\`')

      const command = `gemini -m ${this.model} -p "${escapedPrompt}"`

      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024,
        timeout: 30000,
        env: {
          ...process.env,
          GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        },
      })

      if (stderr && stderr.includes('Error')) {
        logger.error('[RAG] Gemini error:', stderr)
      }

      const response = stdout.trim()
      logger.info(`[RAG] Gemini response generated (${response.length} chars)`)

      return response
    } catch (error: any) {
      logger.error('[RAG] Gemini call failed:', error.message)
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
