/**
 * ChatSession/ChatMessage 數據遷移腳本
 *
 * 功能：
 * 1. 為所有 ChatSession 補齊 islandId
 * 2. 為所有 ChatMessage 補齊 islandId
 */

import { PrismaClient } from '@prisma/client'
import { islandService } from '../src/services/islandService'

const prisma = new PrismaClient()

async function migrateChatSessions() {
  console.log('=== 開始遷移 ChatSession ===\n')

  try {
    // 獲取所有 ChatSession（有 assistantId 但沒有 islandId）
    const sessions = await prisma.chatSession.findMany({
      where: {
        assistantId: { not: null },
        islandId: null
      },
      include: {
        assistant: true,
        user: true
      }
    })

    console.log(`找到 ${sessions.length} 個會話需要遷移\n`)

    if (sessions.length === 0) {
      console.log('✅ 沒有需要遷移的會話')
      return { success: 0, fail: 0 }
    }

    let successCount = 0
    let failCount = 0

    for (const session of sessions) {
      try {
        if (!session.assistant || !session.user) {
          console.warn(`⚠️  跳過會話 ${session.id}: 缺少 assistant 或 user`)
          failCount++
          continue
        }

        // 根據 assistant.type 找到對應 Island
        const island = await islandService.getIslandByType(
          session.user.id,
          session.assistant.type
        )

        if (!island) {
          console.warn(`⚠️  會話 ${session.id}: 無法為 ${session.assistant.type} 找到對應島嶼`)
          failCount++
          continue
        }

        // 更新 ChatSession
        await prisma.chatSession.update({
          where: { id: session.id },
          data: { islandId: island.id }
        })

        console.log(`✅ 會話 ${session.id}: ${session.assistant.nameChinese} → ${island.nameChinese}`)
        successCount++

      } catch (error: any) {
        console.error(`❌ 會話 ${session.id} 遷移失敗:`, error.message)
        failCount++
      }
    }

    console.log('\n=== ChatSession 遷移完成 ===')
    console.log(`✅ 成功: ${successCount}`)
    console.log(`❌ 失敗: ${failCount}`)

    return { success: successCount, fail: failCount }

  } catch (error: any) {
    console.error('❌ ChatSession 遷移失敗:', error.message)
    throw error
  }
}

async function migrateChatMessages() {
  console.log('\n=== 開始遷移 ChatMessage ===\n')

  try {
    // 獲取所有 ChatMessage（有 assistantId 但沒有 islandId）
    const messages = await prisma.chatMessage.findMany({
      where: {
        assistantId: { not: null },
        islandId: null
      },
      include: {
        session: {
          include: {
            assistant: true,
            user: true
          }
        }
      }
    })

    console.log(`找到 ${messages.length} 條訊息需要遷移\n`)

    if (messages.length === 0) {
      console.log('✅ 沒有需要遷移的訊息')
      return { success: 0, fail: 0 }
    }

    let successCount = 0
    let failCount = 0

    for (const message of messages) {
      try {
        // 優先使用 session.islandId
        let islandId = message.session.islandId

        // 如果 session 沒有 islandId，根據 assistant.type 查找
        if (!islandId && message.session.assistant && message.session.user) {
          const island = await islandService.getIslandByType(
            message.session.user.id,
            message.session.assistant.type
          )
          islandId = island?.id || null
        }

        if (!islandId) {
          console.warn(`⚠️  訊息 ${message.id}: 無法找到對應島嶼`)
          failCount++
          continue
        }

        // 更新 ChatMessage
        await prisma.chatMessage.update({
          where: { id: message.id },
          data: { islandId }
        })

        successCount++

        if (successCount % 100 === 0) {
          console.log(`進度: ${successCount}/${messages.length}`)
        }

      } catch (error: any) {
        console.error(`❌ 訊息 ${message.id} 遷移失敗:`, error.message)
        failCount++
      }
    }

    console.log(`\n✅ ChatMessage 遷移完成: ${successCount} 條`)
    console.log(`❌ 失敗: ${failCount}`)

    return { success: successCount, fail: failCount }

  } catch (error: any) {
    console.error('❌ ChatMessage 遷移失敗:', error.message)
    throw error
  }
}

async function run() {
  try {
    const sessionResult = await migrateChatSessions()
    const messageResult = await migrateChatMessages()

    console.log('\n=== 總結 ===')
    console.log(`ChatSession: ${sessionResult.success} 成功, ${sessionResult.fail} 失敗`)
    console.log(`ChatMessage: ${messageResult.success} 成功, ${messageResult.fail} 失敗`)
    console.log('\n🎉 遷移完成！')

  } catch (error) {
    console.error('\n💥 遷移失敗')
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

run()
