/**
 * 完全重置資料庫腳本
 *
 * ⚠️ 警告：此腳本會刪除所有數據，包括：
 * - 所有用戶帳號
 * - 所有記憶 (Memory)
 * - 所有島嶼 (Island)
 * - 所有助手 (Assistant)
 * - 所有聊天記錄 (ChatSession, ChatMessage)
 * - 所有知識分發記錄 (KnowledgeDistribution)
 * - 所有任務歷史 (TaskHistory)
 *
 * 執行後會重新初始化：
 * - Chief Assistant（系統助手）
 * - 預設的 8 個 Assistant 類型
 */

import { PrismaClient } from '@prisma/client'
import { logger } from '../src/utils/logger'

const prisma = new PrismaClient()

async function resetDatabase() {
  console.log('\n' + '='.repeat(60))
  console.log('⚠️  資料庫完全重置腳本')
  console.log('='.repeat(60) + '\n')

  console.log('此操作將刪除以下所有數據：')
  console.log('  ❌ 所有用戶帳號')
  console.log('  ❌ 所有記憶 (Memory)')
  console.log('  ❌ 所有島嶼 (Island)')
  console.log('  ❌ 所有助手 (Assistant)')
  console.log('  ❌ 所有聊天記錄')
  console.log('  ❌ 所有知識分發記錄')
  console.log('  ❌ 所有任務歷史\n')

  console.log('開始清理...\n')

  try {
    // 1. 刪除所有 ChatMessage
    const deletedMessages = await prisma.chatMessage.deleteMany({})
    console.log(`✅ 刪除 ${deletedMessages.count} 條聊天訊息`)

    // 2. 刪除所有 ChatSession
    const deletedSessions = await prisma.chatSession.deleteMany({})
    console.log(`✅ 刪除 ${deletedSessions.count} 個聊天會話`)

    // 3. 刪除所有 AgentDecision
    const deletedDecisions = await prisma.agentDecision.deleteMany({})
    console.log(`✅ 刪除 ${deletedDecisions.count} 個代理決策`)

    // 4. 刪除所有 KnowledgeDistribution
    const deletedDistributions = await prisma.knowledgeDistribution.deleteMany({})
    console.log(`✅ 刪除 ${deletedDistributions.count} 個知識分發記錄`)

    // 5. 刪除所有 Memory
    const deletedMemories = await prisma.memory.deleteMany({})
    console.log(`✅ 刪除 ${deletedMemories.count} 個記憶`)

    // 6. 刪除所有 Island
    const deletedIslands = await prisma.island.deleteMany({})
    console.log(`✅ 刪除 ${deletedIslands.count} 個島嶼`)

    // 7. 刪除所有 TaskHistory
    const deletedTasks = await prisma.taskHistory.deleteMany({})
    console.log(`✅ 刪除 ${deletedTasks.count} 個任務歷史`)

    // 8. 刪除所有 Assistant（包括 Chief）
    const deletedAssistants = await prisma.assistant.deleteMany({})
    console.log(`✅ 刪除 ${deletedAssistants.count} 個助手`)

    // 9. 刪除所有 User
    const deletedUsers = await prisma.user.deleteMany({})
    console.log(`✅ 刪除 ${deletedUsers.count} 個用戶`)

    console.log('\n' + '='.repeat(60))
    console.log('🎉 資料庫清理完成！')
    console.log('='.repeat(60) + '\n')

    console.log('📊 清理統計：')
    console.log(`  - 用戶: ${deletedUsers.count}`)
    console.log(`  - 助手: ${deletedAssistants.count}`)
    console.log(`  - 島嶼: ${deletedIslands.count}`)
    console.log(`  - 記憶: ${deletedMemories.count}`)
    console.log(`  - 聊天會話: ${deletedSessions.count}`)
    console.log(`  - 聊天訊息: ${deletedMessages.count}`)
    console.log(`  - 知識分發: ${deletedDistributions.count}`)
    console.log(`  - 代理決策: ${deletedDecisions.count}`)
    console.log(`  - 任務歷史: ${deletedTasks.count}`)

    console.log('\n💡 建議：')
    console.log('  1. 執行 seed 腳本重新創建基礎數據：')
    console.log('     npx prisma db seed')
    console.log('  2. 或直接啟動應用，系統會自動初始化')
    console.log('')

  } catch (error: any) {
    console.error('\n❌ 清理失敗:', error.message)
    console.error(error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 執行重置
resetDatabase()
  .then(() => {
    console.log('✅ 腳本執行完成')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ 腳本執行失敗')
    process.exit(1)
  })
