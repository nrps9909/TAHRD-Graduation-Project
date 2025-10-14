/**
 * Vector Service - 向量化和語義搜尋
 * 使用 Gemini Embeddings API
 */

import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'
import { spawn } from 'child_process'
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
  private useGeminiCLI = true

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
    limit: number = 10,
    minSimilarity: number = 0.5
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
  private async callGeminiEmbedding(text: string): Promise<EmbeddingResult> {
    if (this.useGeminiCLI) {
      return await this.callGeminiCLIEmbed(text)
    } else {
      // TODO: 使用 HTTP API
      throw new Error('HTTP API not implemented yet')
    }
  }

  /**
   * 使用 Gemini CLI 生成向量
   */
  private async callGeminiCLIEmbed(text: string): Promise<EmbeddingResult> {
    let tempFile: string | null = null
    try {
      // 創建臨時文件
      const tempDir = '/tmp/embeddings'
      await fs.mkdir(tempDir, { recursive: true })
      tempFile = path.join(tempDir, `embed_${Date.now()}.txt`)
      await fs.writeFile(tempFile, text)

      // 使用 spawn 調用 Gemini CLI 的 embed 功能
      const result = await new Promise<string>((resolve, reject) => {
        const gemini = spawn('gemini', ['embed', '-f', tempFile!, '-m', this.embeddingModel], {
          env: {
            ...process.env,
            GEMINI_API_KEY: process.env.GEMINI_API_KEY
          }
        })

        let stdout = ''
        let stderr = ''
        let timeoutId: NodeJS.Timeout

        gemini.stdout.on('data', (data: Buffer) => {
          stdout += data.toString()
        })

        gemini.stderr.on('data', (data: Buffer) => {
          stderr += data.toString()
        })

        gemini.on('close', (code: number) => {
          clearTimeout(timeoutId)
          if (code === 0) {
            resolve(stdout.trim())
          } else {
            if (stderr && stderr.includes('Error')) {
              reject(new Error(stderr))
            } else {
              reject(new Error(`Gemini embed exited with code ${code}`))
            }
          }
        })

        gemini.on('error', (err: Error) => {
          clearTimeout(timeoutId)
          reject(err)
        })

        // 設置超時（30秒）
        timeoutId = setTimeout(() => {
          gemini.kill()
          reject(new Error('Gemini embed timeout'))
        }, 30000)
      })

      // 解析輸出 (Gemini CLI 返回 JSON 格式的向量)
      const parsed = JSON.parse(result)
      const embedding = parsed.embedding || parsed.values || parsed

      // 清理臨時文件
      if (tempFile) {
        await fs.unlink(tempFile).catch(() => {})
      }

      return {
        embedding: Array.isArray(embedding) ? embedding : Object.values(embedding),
        model: this.embeddingModel,
        dimension: this.dimension,
      }
    } catch (error: any) {
      // 清理臨時文件
      if (tempFile) {
        await fs.unlink(tempFile).catch(() => {})
      }
      logger.error('[Vector] Gemini CLI embed error:', error.message)
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
