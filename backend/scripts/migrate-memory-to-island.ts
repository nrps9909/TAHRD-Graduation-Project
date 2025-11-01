/**
 * Memory 數據遷移腳本 - 補齊 islandId
 *
 * 功能：
 * 1. 為所有只有 assistantId 但沒有 islandId 的 Memory 補齊 islandId
 * 2. 根據 assistant.type 映射到對應的 Island
 * 3. 重新計算 Island 統計
 */

import { PrismaClient } from '@prisma/client'
import { islandService } from '../src/services/islandService'

const prisma = new PrismaClient()

async function migrateMemories() {
  console.log('=== 開始遷移 Memory 數據 ===\n')

  try {
    // 1. 獲取需要遷移的 Memory（只有 assistantId，沒有 islandId）
    const memories = await prisma.memory.findMany({
      where: {
        assistantId: { not: null },
        islandId: null
      },
      include: {
        assistant: true,
        user: true
      }
    })

    console.log(`找到 ${memories.length} 條需要遷移的記憶\n`)

    if (memories.length === 0) {
      console.log('✅ 沒有需要遷移的記憶')
      return
    }

    let successCount = 0
    let failCount = 0
    const failedMemories: any[] = []

    // 2. 遷移每條記憶
    for (const memory of memories) {
      try {
        if (!memory.assistant || !memory.user) {
          console.warn(`⚠️  跳過記憶 ${memory.id}: 缺少 assistant 或 user`)
          failCount++
          failedMemories.push({ id: memory.id, reason: '缺少 assistant 或 user' })
          continue
        }

        // 根據 assistant.type 找到對應的 Island
        const island = await islandService.getIslandByType(
          memory.user.id,
          memory.assistant.type
        )

        if (!island) {
          console.warn(`⚠️  記憶 ${memory.id}: 無法為 ${memory.assistant.type} 找到對應島嶼`)
          failCount++
          failedMemories.push({
            id: memory.id,
            userId: memory.user.id,
            assistantType: memory.assistant.type,
            reason: '無法找到對應島嶼'
          })
          continue
        }

        // 更新 Memory
        await prisma.memory.update({
          where: { id: memory.id },
          data: { islandId: island.id }
        })

        console.log(`✅ 記憶 ${memory.id}: ${memory.assistant.nameChinese} → ${island.nameChinese}`)
        successCount++

        // 每 10 條記錄顯示進度
        if (successCount % 10 === 0) {
          console.log(`進度: ${successCount}/${memories.length}`)
        }

      } catch (error: any) {
        console.error(`❌ 記憶 ${memory.id} 遷移失敗:`, error.message)
        failCount++
        failedMemories.push({ id: memory.id, error: error.message })
      }
    }

    console.log('\n=== 遷移完成 ===')
    console.log(`✅ 成功: ${successCount}`)
    console.log(`❌ 失敗: ${failCount}`)
    console.log(`📊 總數: ${memories.length}`)

    if (failedMemories.length > 0) {
      console.log('\n失敗的記憶列表:')
      failedMemories.forEach(m => {
        console.log(`  - ID: ${m.id}`)
        if (m.userId) console.log(`    User: ${m.userId}`)
        if (m.assistantType) console.log(`    Type: ${m.assistantType}`)
        if (m.reason) console.log(`    原因: ${m.reason}`)
        if (m.error) console.log(`    錯誤: ${m.error}`)
      })
    }

  } catch (error: any) {
    console.error('❌ 遷移過程發生錯誤:', error.message)
    console.error(error.stack)
    throw error
  }
}

async function recalculateIslandStats() {
  console.log('\n=== 重新計算 Island 統計 ===\n')

  try {
    const islands = await prisma.island.findMany()

    for (const island of islands) {
      // 計算記憶數
      const memoryCount = await prisma.memory.count({
        where: { islandId: island.id }
      })

      // 計算聊天數（如果 ChatSession 已遷移）
      const totalChats = await prisma.chatSession.count({
        where: { islandId: island.id }
      })

      // 更新統計
      await prisma.island.update({
        where: { id: island.id },
        data: {
          memoryCount,
          totalChats
        }
      })

      console.log(`✅ ${island.nameChinese}: ${memoryCount} 條記憶, ${totalChats} 個聊天`)
    }

    console.log('\n✅ 統計計算完成')

  } catch (error: any) {
    console.error('❌ 統計計算失敗:', error.message)
    throw error
  }
}

async function verifyMigration() {
  console.log('\n=== 驗證遷移結果 ===\n')

  try {
    const total = await prisma.memory.count()
    const onlyAssistant = await prisma.memory.count({
      where: { assistantId: { not: null }, islandId: null }
    })
    const onlyIsland = await prisma.memory.count({
      where: { assistantId: null, islandId: { not: null } }
    })
    const both = await prisma.memory.count({
      where: { assistantId: { not: null }, islandId: { not: null } }
    })
    const neither = await prisma.memory.count({
      where: { assistantId: null, islandId: null }
    })

    console.log(`總記憶數: ${total}`)
    console.log(`只有 assistantId: ${onlyAssistant}`)
    console.log(`只有 islandId: ${onlyIsland}`)
    console.log(`兩者都有: ${both}`)
    console.log(`兩者都無: ${neither}`)

    if (onlyAssistant > 0) {
      console.warn(`\n⚠️  仍有 ${onlyAssistant} 條記憶只有 assistantId，需要手動處理`)
    } else {
      console.log('\n✅ 所有記憶都已遷移到 Island')
    }

  } catch (error: any) {
    console.error('❌ 驗證失敗:', error.message)
    throw error
  }
}

// 執行遷移
async function run() {
  try {
    await migrateMemories()
    await recalculateIslandStats()
    await verifyMigration()
    console.log('\n🎉 所有步驟完成！')
  } catch (error) {
    console.error('\n💥 遷移失敗')
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

run()
