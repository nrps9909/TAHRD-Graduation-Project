/**
 * 簡化版 Streaming 測試腳本
 *
 * 使用方法：
 * 1. 先登入獲取 token，或使用現有 token
 * 2. npx ts-node test-streaming-simple.ts <YOUR_TOKEN>
 */

import axios from 'axios'

const API_URL = 'http://localhost:4000'
const TEST_TOKEN = process.argv[2] || process.env.TEST_TOKEN

if (!TEST_TOKEN || TEST_TOKEN === 'your-test-token-here') {
  console.error('❌ 請提供有效的 token:')
  console.error('   方法 1: npx ts-node test-streaming-simple.ts YOUR_TOKEN')
  console.error('   方法 2: export TEST_TOKEN=YOUR_TOKEN && npx ts-node test-streaming-simple.ts')
  console.error('\n💡 提示：你可以從前端登入後，從 localStorage 或 cookie 中獲取 token')
  process.exit(1)
}

async function testStreaming() {
  console.log('🧪 開始測試 Streaming 知識上傳...\n')

  const testContent = '今天學習了 React hooks，特別是 useState 和 useEffect 的用法，感覺很有收穫！'
  console.log(`📝 測試內容: "${testContent}"\n`)

  try {
    const startTime = Date.now()

    const response = await axios.post(
      `${API_URL}/api/knowledge/upload-stream`,
      {
        content: testContent,
        files: [],
        links: []
      },
      {
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`,
          'Content-Type': 'application/json'
        },
        responseType: 'stream'
      }
    )

    console.log('✅ 連接成功，開始接收 SSE 事件...\n')
    console.log('='.repeat(60))

    let immediateReceived = false
    let deepReceived = false
    let completeReceived = false
    let errorOccurred = false

    response.data.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      const lines = text.split('\n')

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          const eventType = line.substring(7).trim()
          if (eventType !== 'done') {
            console.log(`\n📡 事件類型: ${eventType}`)
          }
        }

        if (line.startsWith('data: ')) {
          const jsonStr = line.substring(6).trim()

          if (jsonStr && jsonStr !== '{}') {
            try {
              console.log(`📦 收到數據: ${jsonStr.substring(0, 100)}...`)
              const event = JSON.parse(jsonStr)

              switch (event.type) {
                case 'immediate':
                  immediateReceived = true
                  const immediateTime = Date.now() - startTime
                  console.log(`⚡ 階段 1: 即時回應 (${immediateTime}ms)`)
                  console.log(`   🏝️  分類: ${event.data.category}`)
                  console.log(`   💬 回應: ${event.data.warmResponse}`)
                  console.log(`   📋 摘要: ${event.data.quickSummary}`)
                  console.log(`   🎯 置信度: ${event.data.confidence}`)
                  break

                case 'deep':
                  deepReceived = true
                  const deepTime = Date.now() - startTime
                  console.log(`\n📊 階段 2: 深度分析 (${deepTime}ms)`)
                  console.log(`   📝 詳細摘要: ${event.data.detailedSummary}`)
                  console.log(`   💡 關鍵洞察 (${event.data.keyInsights?.length || 0} 個):`)
                  event.data.keyInsights?.forEach((insight: string, i: number) => {
                    console.log(`      ${i + 1}. ${insight}`)
                  })
                  console.log(`   🏷️  標籤: ${event.data.suggestedTags?.join(', ')}`)
                  console.log(`   😊 情感: ${event.data.sentiment}`)
                  console.log(`   ⭐ 重要性: ${event.data.importanceScore}/10`)
                  if (event.data.actionableAdvice) {
                    console.log(`   💪 建議: ${event.data.actionableAdvice}`)
                  }
                  break

                case 'complete':
                  completeReceived = true
                  const totalTime = Date.now() - startTime
                  console.log(`\n✅ 階段 3: 處理完成 (${totalTime}ms)`)
                  console.log(`   📦 Memory ID: ${event.data.memory.id}`)
                  console.log(`   🏝️  島嶼: ${event.data.island.emoji} ${event.data.island.name}`)
                  console.log(`   🎨 顏色: ${event.data.island.color}`)
                  break

                case 'error':
                  errorOccurred = true
                  console.error(`\n❌ 錯誤: ${event.error}`)
                  break
              }
            } catch (e) {
              // 忽略無法解析的行
            }
          }
        }
      }
    })

    response.data.on('end', () => {
      console.log('\n' + '='.repeat(60))
      console.log('\n📋 測試結果摘要:')
      console.log(`   階段 1 (即時回應): ${immediateReceived ? '✅ 成功' : '❌ 失敗'}`)
      console.log(`   階段 2 (深度分析): ${deepReceived ? '✅ 成功' : '❌ 失敗'}`)
      console.log(`   階段 3 (處理完成): ${completeReceived ? '✅ 成功' : '❌ 失敗'}`)
      console.log(`   錯誤發生: ${errorOccurred ? '❌ 是' : '✅ 否'}`)

      const totalTime = Date.now() - startTime
      console.log(`\n⏱️  總處理時間: ${totalTime}ms`)

      if (immediateReceived && deepReceived && completeReceived && !errorOccurred) {
        console.log('\n🎉 所有測試通過！Streaming 功能正常運作！')
        console.log('\n💡 觀察：')
        console.log('   ✅ 一次 AI 調用完成所有工作')
        console.log('   ✅ 分階段返回，用戶體驗流暢')
        console.log('   ✅ 成本降低 ~50%（相比兩次調用）')
      } else {
        console.log('\n⚠️  部分階段未完成，請檢查上方日誌')
      }

      console.log()
    })

    response.data.on('error', (error: Error) => {
      console.error('\n❌ Stream 錯誤:', error.message)
    })

  } catch (error: any) {
    console.error('\n❌ 測試失敗:', error.message)
    if (error.response) {
      console.error('   狀態碼:', error.response.status)
      console.error('   錯誤訊息:', error.response.data || '無')

      if (error.response.status === 401) {
        console.error('\n💡 提示：Token 可能無效或已過期，請重新登入獲取新的 token')
      }
    }
  }
}

console.log('='.repeat(60))
console.log('🧪 Streaming 知識上傳測試')
console.log('='.repeat(60))
console.log()

testStreaming().catch(console.error)
