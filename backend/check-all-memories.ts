import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkRecentMemories() {
  try {
    // 獲取最近 3 個 Memory
    const memories = await prisma.memory.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: {
        island: true
      }
    })

    if (memories.length === 0) {
      console.log('❌ 沒有找到 Memory')
      return
    }

    console.log(`📦 最近 ${memories.length} 個 Memory 深度分析檢查`)
    console.log('='.repeat(80))

    memories.forEach((memory, index) => {
      console.log(`\n[${index + 1}] Memory ID: ${memory.id}`)
      console.log(`    建立時間: ${memory.createdAt.toLocaleString('zh-TW')}`)
      console.log(`    島嶼: ${memory.island?.emoji} ${memory.island?.nameChinese}`)
      console.log()

      console.log(`    📝 原始內容:`)
      console.log(`       ${memory.rawContent?.substring(0, 60)}...`)
      console.log()

      // 檢查深度分析欄位
      const hasDetailedSummary = !!memory.detailedSummary
      const hasKeyPoints = memory.keyPoints && Array.isArray(memory.keyPoints) && memory.keyPoints.length > 0
      const hasActionableAdvice = !!memory.actionableAdvice
      const hasTags = memory.tags && Array.isArray(memory.tags) && memory.tags.length > 0
      const hasSentiment = !!memory.aiSentiment
      const hasImportance = memory.importanceScore !== null

      console.log(`    📊 深度分析完整性檢查:`)
      console.log(`       詳細摘要: ${hasDetailedSummary ? '✅ 有' : '❌ 無'} ${hasDetailedSummary ? `(${memory.detailedSummary!.length} 字)` : ''}`)
      console.log(`       關鍵洞察: ${hasKeyPoints ? '✅ 有' : '❌ 無'} ${hasKeyPoints ? `(${(memory.keyPoints as string[]).length} 個)` : ''}`)
      console.log(`       行動建議: ${hasActionableAdvice ? '✅ 有' : '❌ 無'} ${hasActionableAdvice ? `(${memory.actionableAdvice!.length} 字)` : ''}`)
      console.log(`       標籤: ${hasTags ? '✅ 有' : '❌ 無'} ${hasTags ? `(${(memory.tags as string[]).length} 個)` : ''}`)
      console.log(`       情感: ${hasSentiment ? '✅ 有' : '❌ 無'} ${hasSentiment ? `(${memory.aiSentiment})` : ''}`)
      console.log(`       重要性: ${hasImportance ? '✅ 有' : '❌ 無'} ${hasImportance ? `(${memory.importanceScore}/10)` : ''}`)

      // 計算完整度
      const completeness = [
        hasDetailedSummary,
        hasKeyPoints,
        hasActionableAdvice,
        hasTags,
        hasSentiment,
        hasImportance
      ].filter(Boolean).length

      console.log()
      console.log(`    🎯 完整度評分: ${completeness}/6 (${Math.round(completeness / 6 * 100)}%)`)

      if (hasKeyPoints) {
        console.log()
        console.log(`    💡 關鍵洞察示例:`)
        const points = memory.keyPoints as string[]
        console.log(`       1. ${points[0]?.substring(0, 80)}...`)
        if (points.length > 1) {
          console.log(`       2. ${points[1]?.substring(0, 80)}...`)
        }
      }

      console.log()
      console.log('    ' + '-'.repeat(76))
    })

    console.log()
    console.log('='.repeat(80))
    console.log('✅ 檢查完成')

    await prisma.$disconnect()

  } catch (error) {
    console.error('❌ 錯誤:', error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

checkRecentMemories()
