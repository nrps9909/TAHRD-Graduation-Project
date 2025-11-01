import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkLatestMemory() {
  try {
    // 獲取最新的 Memory
    const memory = await prisma.memory.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        island: true
      }
    })

    if (!memory) {
      console.log('❌ 沒有找到 Memory')
      return
    }

    console.log('📦 最新 Memory 內容檢查')
    console.log('='.repeat(80))
    console.log(`ID: ${memory.id}`)
    console.log(`建立時間: ${memory.createdAt}`)
    console.log(`島嶼: ${memory.island?.emoji} ${memory.island?.nameChinese}`)
    console.log()

    console.log('📝 原始內容 (rawContent):')
    console.log(`   ${memory.rawContent}`)
    console.log()

    console.log('📋 摘要 (summary):')
    console.log(`   ${memory.summary}`)
    console.log()

    console.log('📊 詳細摘要 (detailedSummary):')
    console.log(`   ${memory.detailedSummary || '❌ 無'}`)
    console.log()

    console.log('💡 關鍵洞察 (keyPoints):')
    if (memory.keyPoints && Array.isArray(memory.keyPoints)) {
      memory.keyPoints.forEach((point: string, i: number) => {
        console.log(`   ${i + 1}. ${point}`)
      })
    } else {
      console.log('   ❌ 無')
    }
    console.log()

    console.log('🏷️  標籤 (tags):')
    if (memory.tags && Array.isArray(memory.tags)) {
      console.log(`   ${memory.tags.join(', ')}`)
    } else {
      console.log('   ❌ 無')
    }
    console.log()

    console.log('💪 行動建議 (actionableAdvice):')
    console.log(`   ${memory.actionableAdvice || '❌ 無'}`)
    console.log()

    console.log('😊 情感 (aiSentiment):')
    console.log(`   ${memory.aiSentiment || '❌ 無'}`)
    console.log()

    console.log('⭐ 重要性 (importanceScore):')
    console.log(`   ${memory.importanceScore || '❌ 無'}/10`)
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

checkLatestMemory()
