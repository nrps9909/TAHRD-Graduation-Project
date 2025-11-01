/**
 * IslandService 測試腳本
 *
 * 測試項目：
 * 1. 獲取用戶島嶼
 * 2. AssistantType 映射到 Island
 * 3. 獲取 systemPrompt
 * 4. 降級分類
 */

import { islandService } from './src/services/islandService'
import { AssistantType } from '@prisma/client'

async function testIslandService() {
  console.log('=== 測試 IslandService ===\n')

  // 替換為你的真實 userId（可以從資料庫查詢）
  const TEST_USER_ID = 'test-user-id'  // ⚠️ 需要替換

  try {
    // 測試 1: 獲取所有島嶼
    console.log('測試 1: 獲取用戶島嶼')
    const islands = await islandService.getAllIslands(TEST_USER_ID)
    console.log(`找到 ${islands.length} 個島嶼:`)
    islands.forEach(island => {
      console.log(`  - ${island.emoji} ${island.nameChinese} (${island.id})`)
      if (island.systemPrompt) {
        console.log(`    SystemPrompt: ${island.systemPrompt.substring(0, 50)}...`)
      }
      if (island.keywords && island.keywords.length > 0) {
        console.log(`    Keywords: ${island.keywords.join(', ')}`)
      }
    })
    console.log()

    if (islands.length === 0) {
      console.log('⚠️  該用戶沒有島嶼，請先創建島嶼')
      return
    }

    // 測試 2: AssistantType 映射
    console.log('測試 2: AssistantType 映射到 Island')
    const types: AssistantType[] = ['LEARNING', 'WORK', 'LIFE', 'SOCIAL']

    for (const type of types) {
      const island = await islandService.getIslandByType(TEST_USER_ID, type)
      if (island) {
        console.log(`  ${type} → ${island.emoji} ${island.nameChinese}`)
      } else {
        console.log(`  ${type} → 無匹配島嶼`)
      }
    }
    console.log()

    // 測試 3: 獲取 systemPrompt
    console.log('測試 3: 獲取 systemPrompt')
    const firstIsland = islands[0]
    const systemPrompt = await islandService.getSystemPrompt(firstIsland.id, TEST_USER_ID)
    console.log(`  島嶼: ${firstIsland.nameChinese}`)
    console.log(`  SystemPrompt: ${systemPrompt?.substring(0, 100)}...`)
    console.log()

    // 測試 4: 降級分類
    console.log('測試 4: 降級關鍵字分類')
    const testContents = [
      '我今天學習了 React 的 useState',
      '明天要開會討論項目進度',
      '今天心情不錯，和朋友聚餐',
      '這個工具很好用，收藏起來'
    ]

    for (const content of testContents) {
      const islandId = await islandService.fallbackClassification(TEST_USER_ID, content)
      if (islandId) {
        const island = await islandService.getIslandById(islandId, TEST_USER_ID)
        console.log(`  "${content}" → ${island?.emoji} ${island?.nameChinese}`)
      } else {
        console.log(`  "${content}" → 無法分類`)
      }
    }
    console.log()

    // 測試 5: 更新統計
    console.log('測試 5: 更新島嶼統計')
    const testIsland = islands[0]
    const beforeCount = testIsland.memoryCount

    await islandService.incrementIslandStats(testIsland.id, 'memory')

    // 重新獲取以驗證
    islandService.clearCache()
    const updatedIsland = await islandService.getIslandById(testIsland.id, TEST_USER_ID)
    console.log(`  島嶼: ${updatedIsland?.nameChinese}`)
    console.log(`  更新前: ${beforeCount}`)
    console.log(`  更新後: ${updatedIsland?.memoryCount}`)
    console.log()

    console.log('✅ 所有測試完成！')

  } catch (error: any) {
    console.error('❌ 測試失敗:', error.message)
    console.error(error.stack)
  }
}

// 執行測試
testIslandService()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
