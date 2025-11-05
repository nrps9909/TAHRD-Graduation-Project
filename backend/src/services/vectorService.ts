/**
 * Vector Service - 向量化和語義搜尋
 * 使用 Gemini Embeddings API
 */

import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'
import { callGeminiEmbedding } from '../utils/geminiAPI'
import * as fs from 'fs/promises'
import * as path from 'path'

const prisma = new PrismaClient()

interface EmbeddingResult {
  embedding: number[]
  model: string
  dimension: number
}

/**
 * Vector Service - 處理向量化和相似度搜尋
 */
export class VectorService {
  private embeddingModel = 'text-embedding-004'
  private dimension = 768

  /**
   * 為記憶生成向量嵌入
   */
  async generateEmbedding(memoryId: string, userId: string): Promise<void> {
    try {
      // 1. 獲取記憶內容
      const memory = await prisma.memory.findUnique({
        where: { id: memoryId },
        select: {
          id: true,
          rawContent: true,
          summary: true,
          title: true,
          tags: true,
          keyPoints: true,
        },
      })

      if (!memory) {
        throw new Error(`Memory ${memoryId} not found`)
      }

      // 2. 構建用於向量化的文本（結合多個字段）
      const textContent = this.buildEmbeddingText(memory)

      // 3. 調用 Gemini Embeddings API
      const embeddingResult = await this.callGeminiEmbedding(textContent)

      // 4. 檢查是否已存在嵌入
      const existing = await prisma.memoryEmbedding.findFirst({
        where: { userId, memoryId },
      })

      if (existing) {
        // 更新現有嵌入
        await prisma.memoryEmbedding.update({
          where: { id: existing.id },
          data: {
            embedding: embeddingResult.embedding,
            embeddingModel: embeddingResult.model,
            textContent,
            dimension: embeddingResult.dimension,
            updatedAt: new Date(),
          },
        })
        logger.info(`[Vector] Updated embedding for memory ${memoryId}`)
      } else {
        // 創建新嵌入
        await prisma.memoryEmbedding.create({
          data: {
            userId,
            memoryId,
            embedding: embeddingResult.embedding,
            embeddingModel: embeddingResult.model,
            textContent,
            dimension: embeddingResult.dimension,
          },
        })
        logger.info(`[Vector] Created embedding for memory ${memoryId}`)
      }
    } catch (error) {
      logger.error(`[Vector] Failed to generate embedding for memory ${memoryId}:`, error)
      throw error
    }
  }

  /**
   * 語義搜尋 - 使用餘弦相似度
   */
  async semanticSearch(
    userId: string,
    query: string,
    limit: number = 15,
    minSimilarity: number = 0.3
  ): Promise<
    Array<{
      memoryId: string
      similarity: number
      textContent: string
    }>
  > {
    try {
      // 1. 為查詢生成向量
      const queryEmbedding = await this.callGeminiEmbedding(query)

      // 2. 獲取用戶的所有記憶向量
      const allEmbeddings = await prisma.memoryEmbedding.findMany({
        where: { userId },
        select: {
          memoryId: true,
          embedding: true,
          textContent: true,
        },
      })

      if (allEmbeddings.length === 0) {
        return []
      }

      // 3. 計算餘弦相似度
      const results = allEmbeddings
        .map((item) => {
          const similarity = this.cosineSimilarity(
            queryEmbedding.embedding,
            item.embedding
          )

          return {
            memoryId: item.memoryId,
            similarity,
            textContent: item.textContent,
          }
        })
        .filter((item) => item.similarity >= minSimilarity)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)

      logger.info(`[Vector] Semantic search found ${results.length} results for query: "${query.substring(0, 50)}"`)

      return results
    } catch (error) {
      logger.error('[Vector] Semantic search failed:', error)
      throw error
    }
  }

  /**
   * 批量生成向量（為現有記憶生成向量）
   */
  async batchGenerateEmbeddings(userId: string, limit: number = 50): Promise<number> {
    try {
      // 查找沒有向量的記憶
      const memoriesWithoutEmbedding = await prisma.memory.findMany({
        where: {
          userId,
          isArchived: false,
          id: {
            notIn: (
              await prisma.memoryEmbedding.findMany({
                where: { userId },
                select: { memoryId: true },
              })
            ).map((e) => e.memoryId),
          },
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
      })

      logger.info(`[Vector] Generating embeddings for ${memoriesWithoutEmbedding.length} memories`)

      let count = 0
      for (const memory of memoriesWithoutEmbedding) {
        try {
          await this.generateEmbedding(memory.id, userId)
          count++
          // 避免 API rate limit
          await new Promise((resolve) => setTimeout(resolve, 100))
        } catch (error) {
          logger.error(`[Vector] Failed to generate embedding for memory ${memory.id}:`, error)
        }
      }

      return count
    } catch (error) {
      logger.error('[Vector] Batch generation failed:', error)
      throw error
    }
  }

  /**
   * 調用 Gemini Embeddings API
   */
  /**
   * 調用 Gemini Embedding API 生成向量
   * 優化：完全使用 REST API，移除不穩定的 CLI
   */
  private async callGeminiEmbedding(text: string): Promise<EmbeddingResult> {
    try {
      // 直接使用 Gemini REST API（快速、穩定）
      const embedding = await callGeminiEmbedding(text, this.embeddingModel)

      return {
        embedding,
        model: this.embeddingModel,
        dimension: this.dimension,
      }
    } catch (error: any) {
      logger.error('[Vector] Gemini Embedding API error:', error.message)
      throw new Error(`向量化失敗: ${error.message}`)
    }
  }

  /**
   * 餘弦相似度計算
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('向量維度不匹配')
    }

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i]
      normA += vecA[i] * vecA[i]
      normB += vecB[i] * vecB[i]
    }

    normA = Math.sqrt(normA)
    normB = Math.sqrt(normB)

    if (normA === 0 || normB === 0) {
      return 0
    }

    return dotProduct / (normA * normB)
  }

  /**
   * 構建用於向量化的文本
   */
  private buildEmbeddingText(memory: any): string {
    const parts: string[] = []

    // 標題
    if (memory.title) {
      parts.push(`標題: ${memory.title}`)
    }

    // 原始內容
    parts.push(memory.rawContent)

    // 摘要
    if (memory.summary) {
      parts.push(`摘要: ${memory.summary}`)
    }

    // 關鍵點
    if (memory.keyPoints && memory.keyPoints.length > 0) {
      parts.push(`重點: ${memory.keyPoints.join(', ')}`)
    }

    // 標籤
    if (memory.tags && memory.tags.length > 0) {
      parts.push(`標籤: ${memory.tags.join(', ')}`)
    }

    return parts.join('\n\n')
  }
}

export const vectorService = new VectorService()
