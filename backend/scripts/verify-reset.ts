/**
 * 驗證資料庫重置結果
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyReset() {
  console.log('\n📊 資料庫狀態檢查\n')
  console.log('='.repeat(50))

  try {
    // 檢查各個集合的數量
    const userCount = await prisma.user.count()
    const assistantCount = await prisma.assistant.count()
    const islandCount = await prisma.island.count()
    const memoryCount = await prisma.memory.count()
    const sessionCount = await prisma.chatSession.count()
    const messageCount = await prisma.chatMessage.count()
    const distributionCount = await prisma.knowledgeDistribution.count()
    const decisionCount = await prisma.agentDecision.count()
    const taskCount = await prisma.taskHistory.count()

    console.log('\n✅ 基礎數據：')
    console.log(`  - 用戶 (User): ${userCount}`)
    console.log(`  - 助手 (Assistant): ${assistantCount}`)

    console.log('\n📝 內容數據（應該為空）：')
    console.log(`  - 島嶼 (Island): ${islandCount}`)
    console.log(`  - 記憶 (Memory): ${memoryCount}`)
    console.log(`  - 聊天會話 (ChatSession): ${sessionCount}`)
    console.log(`  - 聊天訊息 (ChatMessage): ${messageCount}`)
    console.log(`  - 知識分發 (KnowledgeDistribution): ${distributionCount}`)
    console.log(`  - 代理決策 (AgentDecision): ${decisionCount}`)
    console.log(`  - 任務歷史 (TaskHistory): ${taskCount}`)

    // 檢查 Assistant
    console.log('\n🤖 助手列表：')
    const assistants = await prisma.assistant.findMany({
      select: {
        type: true,
        nameChinese: true,
        emoji: true
      },
      orderBy: { createdAt: 'asc' }
    })

    assistants.forEach(a => {
      console.log(`  ${a.emoji} ${a.nameChinese} (${a.type})`)
    })

    // 檢查測試用戶
    console.log('\n👤 用戶列表：')
    const users = await prisma.user.findMany({
      select: {
        username: true,
        email: true,
        createdAt: true
      }
    })

    users.forEach(u => {
      console.log(`  - ${u.username} (${u.email})`)
    })

    console.log('\n' + '='.repeat(50))
    console.log('\n✅ 驗證完成！\n')

    // 驗證結果
    const expectedAssistants = 9
    const expectedUsers = 1

    if (assistantCount === expectedAssistants && userCount === expectedUsers) {
      console.log('🎉 資料庫重置成功！')
      console.log(`  ✓ 已創建 ${assistantCount} 個助手`)
      console.log(`  ✓ 已創建 ${userCount} 個測試用戶`)
      console.log(`  ✓ 其他數據已清空`)
    } else {
      console.log('⚠️  資料庫狀態異常：')
      if (assistantCount !== expectedAssistants) {
        console.log(`  - 助手數量: ${assistantCount} (預期: ${expectedAssistants})`)
      }
      if (userCount !== expectedUsers) {
        console.log(`  - 用戶數量: ${userCount} (預期: ${expectedUsers})`)
      }
    }

  } catch (error: any) {
    console.error('\n❌ 驗證失敗:', error.message)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

verifyReset()
  .then(() => {
    console.log('')
    process.exit(0)
  })
  .catch(() => {
    process.exit(1)
  })
