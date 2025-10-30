/**
 * 批量生成向量嵌入腳本
 *
 * 用途：為現有的記憶批量生成向量嵌入，以支持 RAG 語意搜索
 *
 * 使用方式：
 * ```bash
 * npx ts-node scripts/generateEmbeddings.ts [userId] [limit]
 * ```
 *
 * 參數：
 * - userId: 可選，指定用戶 ID。如果不提供，則為所有用戶生成
 * - limit: 可選，每次處理的記憶數量（預設 50）
 */

import { PrismaClient } from '@prisma/client'
import { vectorService } from '../src/services/vectorService'
import { logger } from '../src/utils/logger'

const prisma = new PrismaClient()

interface GenerateOptions {
  userId?: string
  limit?: number
  batchSize?: number
}

async function generateEmbeddings(options: GenerateOptions = {}) {
  const { userId, limit = 1000, batchSize = 10 } = options

  try {
    logger.info('=== 開始批量生成向量嵌入 ===')

    // 1. 統計總記憶數和已有嵌入數
    const whereClause: any = { isArchived: false }
    if (userId) {
      whereClause.userId = userId
    }

    const totalMemories = await prisma.memory.count({ where: whereClause })
    const totalEmbeddings = await prisma.memoryEmbedding.count({
      where: userId ? { userId } : {}
    })

    logger.info(`📊 統計：`)
    logger.info(`  - 總記憶數: ${totalMemories}`)
    logger.info(`  - 已有嵌入: ${totalEmbeddings}`)
    logger.info(`  - 缺少嵌入: ${totalMemories - totalEmbeddings}`)

    // 2. 找出沒有向量的記憶
    const memoriesWithoutEmbedding = await prisma.memory.findMany({
      where: {
        ...whereClause,
        id: {
          notIn: (
            await prisma.memoryEmbedding.findMany({
              where: userId ? { userId } : {},
              select: { memoryId: true },
            })
          ).map((e) => e.memoryId),
        },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        title: true,
        rawContent: true,
        createdAt: true
      }
    })

    if (memoriesWithoutEmbedding.length === 0) {
      logger.info('✅ 所有記憶都已有向量嵌入！')
      return
    }

    logger.info(`\n🚀 開始處理 ${memoriesWithoutEmbedding.length} 條記憶...`)
    logger.info(`   批量大小: ${batchSize}`)

    // 3. 批量處理（避免 API rate limit）
    let successCount = 0
    let failureCount = 0

    for (let i = 0; i < memoriesWithoutEmbedding.length; i += batchSize) {
      const batch = memoriesWithoutEmbedding.slice(i, i + batchSize)
      const batchNumber = Math.floor(i / batchSize) + 1
      const totalBatches = Math.ceil(memoriesWithoutEmbedding.length / batchSize)

      logger.info(`\n📦 批次 ${batchNumber}/${totalBatches} (${batch.length} 條記憶)`)

      // 並發處理批次內的記憶（控制並發數）
      const results = await Promise.allSettled(
        batch.map(async (memory) => {
          try {
            await vectorService.generateEmbedding(memory.id, memory.userId)
            logger.info(`  ✅ ${memory.id.substring(0, 8)}... - ${memory.title || memory.rawContent.substring(0, 30)}`)
            return { success: true, memoryId: memory.id }
          } catch (error: any) {
            logger.error(`  ❌ ${memory.id.substring(0, 8)}... - 失敗: ${error.message}`)
            return { success: false, memoryId: memory.id, error: error.message }
          }
        })
      )

      // 統計批次結果
      const batchSuccess = results.filter((r) => r.status === 'fulfilled').length
      const batchFailure = results.filter((r) => r.status === 'rejected').length
      successCount += batchSuccess
      failureCount += batchFailure

      logger.info(`  批次完成: 成功 ${batchSuccess}, 失敗 ${batchFailure}`)

      // 批次間延遲（避免 API rate limit）
      if (i + batchSize < memoriesWithoutEmbedding.length) {
        const delayMs = 2000
        logger.info(`  ⏳ 等待 ${delayMs / 1000} 秒...`)
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }

    // 4. 最終統計
    logger.info(`\n=== 批量生成完成 ===`)
    logger.info(`✅ 成功: ${successCount}`)
    logger.info(`❌ 失敗: ${failureCount}`)
    logger.info(`📊 成功率: ${((successCount / (successCount + failureCount)) * 100).toFixed(1)}%`)

    // 5. 更新後統計
    const updatedEmbeddings = await prisma.memoryEmbedding.count({
      where: userId ? { userId } : {}
    })
    logger.info(`\n📈 更新後統計：`)
    logger.info(`  - 總嵌入數: ${updatedEmbeddings}`)
    logger.info(`  - 覆蓋率: ${((updatedEmbeddings / totalMemories) * 100).toFixed(1)}%`)

  } catch (error) {
    logger.error('批量生成向量嵌入失敗:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 解析命令行參數
const args = process.argv.slice(2)
const userId = args[0] // 可選
const limit = args[1] ? parseInt(args[1]) : undefined
const batchSize = args[2] ? parseInt(args[2]) : 10

// 執行
generateEmbeddings({ userId, limit, batchSize })
  .then(() => {
    logger.info('\n🎉 腳本執行完成')
    process.exit(0)
  })
  .catch((error) => {
    logger.error('\n❌ 腳本執行失敗:', error)
    process.exit(1)
  })
