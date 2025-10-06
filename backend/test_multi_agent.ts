import { PrismaClient } from '@prisma/client'
import { multiAgentService } from './src/services/multiAgentService'

const prisma = new PrismaClient()

async function testMultiAgent() {
  console.log('🧪 開始測試 Multi-Agent 系統...\n')

  try {
    // 1. 確保有測試用戶
    let testUser = await prisma.user.findUnique({
      where: { username: 'test_user' }
    })

    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          username: 'test_user',
          email: 'test@example.com',
          passwordHash: 'dummy-hash'
        }
      })
      console.log('✅ 創建測試用戶:', testUser.username)
    } else {
      console.log('✅ 使用現有測試用戶:', testUser.username)
    }

    console.log('\n--- 測試 1: 路由功能 ---')

    // 測試不同類型的訊息
    const testMessages = [
      '聽說小明和小美在一起了！',
      '我想學習 TypeScript',
      '今天吃了很好吃的拉麵',
      '明年想去日本旅遊',
      '跟朋友約了週五看電影',
      '我喜歡上班上的同事了'
    ]

    for (const message of testMessages) {
      console.log(`\n📝 訊息: "${message}"`)
      const routing = await multiAgentService.routeMessage(testUser.id, message)
      console.log(`  ✅ 分類: ${routing.category}`)
      console.log(`  💬 回應: ${routing.greeting}`)
      console.log(`  📊 信心度: ${routing.confidence}`)
    }

    console.log('\n--- 測試 2: 處理並存儲 ---')

    const testContent = '聽說公司要裁員了，大家都很緊張'
    console.log(`\n📝 測試訊息: "${testContent}"`)

    const routing = await multiAgentService.routeMessage(testUser.id, testContent)
    console.log(`✅ 路由結果: ${routing.category} - ${routing.greeting}`)

    const processing = await multiAgentService.processWithAgent(
      testUser.id,
      testContent,
      routing.category
    )

    console.log(`\n✅ 處理結果:`)
    console.log(`  Agent: ${processing.agent.name} (${processing.agent.emoji})`)
    console.log(`  回應: ${processing.response}`)
    console.log(`  摘要: ${processing.memory.summary}`)
    console.log(`  標籤: ${processing.memory.tags.join(', ')}`)
    console.log(`  重要性: ${processing.memory.importance}/10`)

    console.log('\n--- 測試 3: 查詢記憶 ---')

    const memories = await prisma.memoryEntry.findMany({
      where: { userId: testUser.id },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    console.log(`\n📚 找到 ${memories.length} 條記憶:`)
    memories.forEach((mem, i) => {
      console.log(`  ${i + 1}. [${mem.category}] ${mem.summary}`)
    })

    console.log('\n--- 測試 4: 跨資料庫查詢 ---')

    const chatMessage = '我之前有沒有提過裁員的事？'
    console.log(`\n💬 問題: "${chatMessage}"`)

    const chatResult = await multiAgentService.chatWithAgent(
      testUser.id,
      'gossip-guru',
      chatMessage
    )

    console.log(`✅ ${chatResult.agent.name} 回應:`)
    console.log(`  ${chatResult.response}`)

    console.log('\n--- 測試 5: 獲取所有agents ---')

    const agents = await prisma.aIAgent.findMany()
    console.log(`\n🤖 共有 ${agents.length} 個 AI Agents:`)
    agents.forEach(agent => {
      console.log(`  ${agent.emoji} ${agent.name} - ${agent.category || '主助手'}`)
    })

    console.log('\n✅ 所有測試完成！')

  } catch (error) {
    console.error('\n❌ 測試失敗:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 執行測試
testMultiAgent()
  .then(() => {
    console.log('\n🎉 Multi-Agent 系統測試成功！')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 測試過程中發生錯誤:', error)
    process.exit(1)
  })
