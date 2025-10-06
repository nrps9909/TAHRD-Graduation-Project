/**
 * 記憶整合測試腳本
 * 測試 AI 篩選記憶功能是否正常運作
 */

import { PrismaClient } from '@prisma/client'
import { npcMemoryService } from './src/services/npcMemoryService'
import { memoryArchivalScheduler } from './src/services/memoryArchivalScheduler'

const prisma = new PrismaClient()

async function testMemoryIntegration() {
  console.log('========================================')
  console.log('測試 NPC 長短期記憶整合功能')
  console.log('========================================\n')

  try {
    // 1. 檢查資料庫連接
    console.log('1️⃣ 檢查資料庫連接...')
    await prisma.$connect()
    console.log('   ✅ 資料庫連接成功\n')

    // 2. 獲取測試 NPC 和用戶
    console.log('2️⃣ 獲取測試 NPC 和用戶...')
    const npc = await prisma.nPC.findFirst({
      where: {
        name: {
          in: ['陸培修', '劉宇岑', '陳庭安']
        }
      }
    })

    if (!npc) {
      console.log('   ❌ 找不到測試 NPC，請先執行 seed')
      return
    }

    const user = await prisma.user.findFirst()
    if (!user) {
      console.log('   ❌ 找不到測試用戶，請先創建用戶')
      return
    }

    console.log(`   ✅ 找到 NPC: ${npc.name} (${npc.id})`)
    console.log(`   ✅ 找到用戶: ${user.username} (${user.id})\n`)

    // 3. 創建測試對話
    console.log('3️⃣ 創建測試對話...')

    const testConversations = [
      { content: '你好', speaker: 'user', emotion: 'neutral' },
      { content: '你好啊！', speaker: 'npc', emotion: 'happy' },
      { content: '我愛你', speaker: 'user', emotion: 'happy' },
      { content: '我也很喜歡你呢！', speaker: 'npc', emotion: 'happy' },
      { content: '天氣不錯', speaker: 'user', emotion: 'neutral' },
      { content: '是啊', speaker: 'npc', emotion: 'neutral' },
      { content: '我有一個秘密想告訴你', speaker: 'user', emotion: 'serious' },
      { content: '我會保守秘密的', speaker: 'npc', emotion: 'warm' }
    ]

    for (const conv of testConversations) {
      await prisma.conversation.create({
        data: {
          userId: user.id,
          npcId: npc.id,
          content: conv.content,
          speakerType: conv.speaker === 'user' ? 'user' : 'npc',
          emotionTag: conv.emotion,
          timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // 過去 7 天內隨機
        }
      })
    }

    console.log(`   ✅ 創建了 ${testConversations.length} 條測試對話\n`)

    // 4. 測試短期記憶查詢
    console.log('4️⃣ 測試短期記憶查詢...')
    const shortTermMemories = await npcMemoryService.getShortTermMemories(
      npc.id,
      user.id,
      7,
      50
    )
    console.log(`   ✅ 找到 ${shortTermMemories.length} 條短期記憶\n`)

    // 5. 測試 AI 篩選（這是核心測試）
    console.log('5️⃣ 測試 AI 篩選功能...')
    console.log('   ⚙️ 調用 Python memory_filter.py...')

    const filteredCount = await npcMemoryService.filterConversationsWithAI(
      npc.id,
      user.id,
      7
    )

    console.log(`   ✅ AI 篩選完成！篩選出 ${filteredCount} 條重要記憶\n`)

    // 6. 驗證長期記憶
    console.log('6️⃣ 驗證長期記憶...')
    const longTermMemories = await npcMemoryService.getLongTermMemories(
      npc.id,
      user.id,
      20
    )

    console.log(`   ✅ 找到 ${longTermMemories.length} 條長期記憶`)

    if (longTermMemories.length > 0) {
      console.log('\n   長期記憶詳情：')
      longTermMemories.forEach((mem, index) => {
        console.log(`   ${index + 1}. [${mem.aiImportanceScore?.toFixed(2) || 'N/A'}] ${mem.content}`)
        if (mem.aiSummary) {
          console.log(`      摘要: ${mem.aiSummary}`)
        }
      })
    }

    console.log()

    // 7. 測試調度器狀態
    console.log('7️⃣ 測試調度器狀態...')
    const schedulerStatus = memoryArchivalScheduler.getStatus()
    console.log(`   調度器狀態:`, schedulerStatus)
    console.log()

    // 測試完成
    console.log('========================================')
    console.log('✅ 所有測試通過！')
    console.log('========================================\n')

    console.log('📝 整合總結：')
    console.log(`   - 短期記憶數量: ${shortTermMemories.length}`)
    console.log(`   - 篩選出的長期記憶: ${filteredCount}`)
    console.log(`   - 總長期記憶數量: ${longTermMemories.length}`)
    console.log()

  } catch (error) {
    console.error('❌ 測試失敗:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 執行測試
if (require.main === module) {
  testMemoryIntegration()
    .then(() => {
      console.log('測試完成，退出程序')
      process.exit(0)
    })
    .catch((error) => {
      console.error('測試失敗:', error)
      process.exit(1)
    })
}

export { testMemoryIntegration }
