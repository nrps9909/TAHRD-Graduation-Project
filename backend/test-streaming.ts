/**
 * 測試 Streaming 知識上傳功能
 *
 * 使用方法：
 * npx ts-node test-streaming.ts
 */

import axios from 'axios'
import { EventSource } from 'eventsource' // 需要安裝: npm install eventsource

const API_URL = 'http://localhost:4000'
const TEST_TOKEN = process.env.TEST_TOKEN || 'your-test-token-here'

interface StreamEvent {
  type: 'immediate' | 'deep' | 'complete' | 'error'
  data?: any
  error?: string
  processingTime?: number
}

async function testStreamingUpload() {
  console.log('🧪 開始測試 Streaming 知識上傳...\n')

  const testContent = '今天學習了 React hooks，特別是 useState 和 useEffect 的用法，感覺很有收穫！'

  try {
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

    let immediateReceived = false
    let deepReceived = false
    let completeReceived = false

    response.data.on('data', (chunk: Buffer) => {
      const lines = chunk.toString().split('\n')

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          const eventType = line.substring(7).trim()
          console.log(`📡 收到事件類型: ${eventType}`)
        }

        if (line.startsWith('data: ')) {
          const jsonStr = line.substring(6).trim()

          if (jsonStr && jsonStr !== '{}') {
            try {
              const event: StreamEvent = JSON.parse(jsonStr)

              switch (event.type) {
                case 'immediate':
                  immediateReceived = true
                  console.log('\n🎯 階段 1: 即時回應')
                  console.log(`   分類: ${event.data.category}`)
                  console.log(`   回應: ${event.data.warmResponse}`)
                  console.log(`   摘要: ${event.data.quickSummary}`)
                  console.log(`   置信度: ${event.data.confidence}`)
                  console.log(`   處理時間: ${event.processingTime}ms`)
                  break

                case 'deep':
                  deepReceived = true
                  console.log('\n📊 階段 2: 深度分析')
                  console.log(`   詳細摘要: ${event.data.detailedSummary}`)
                  console.log(`   關鍵洞察 (${event.data.keyInsights?.length || 0} 個):`)
                  event.data.keyInsights?.forEach((insight: string, i: number) => {
                    console.log(`      ${i + 1}. ${insight}`)
                  })
                  console.log(`   建議標籤: ${event.data.suggestedTags?.join(', ')}`)
                  console.log(`   情感: ${event.data.sentiment}`)
                  console.log(`   重要性: ${event.data.importanceScore}/10`)
                  console.log(`   處理時間: ${event.processingTime}ms`)
                  break

                case 'complete':
                  completeReceived = true
                  console.log('\n✅ 階段 3: 處理完成')
                  console.log(`   Memory ID: ${event.data.memory.id}`)
                  console.log(`   島嶼: ${event.data.island.emoji} ${event.data.island.name}`)
                  console.log(`   總處理時間: ${event.processingTime}ms`)
                  break

                case 'error':
                  console.error('\n❌ 錯誤:', event.error)
                  break
              }
            } catch (e) {
              // 忽略非 JSON 行
            }
          }
        }
      }
    })

    response.data.on('end', () => {
      console.log('\n📡 連接結束\n')

      // 驗證所有階段都收到了
      console.log('📋 測試結果:')
      console.log(`   階段 1 (immediate): ${immediateReceived ? '✅' : '❌'}`)
      console.log(`   階段 2 (deep): ${deepReceived ? '✅' : '❌'}`)
      console.log(`   階段 3 (complete): ${completeReceived ? '✅' : '❌'}`)

      if (immediateReceived && deepReceived && completeReceived) {
        console.log('\n🎉 所有測試通過！Streaming 功能正常運作！')
      } else {
        console.log('\n⚠️  部分階段未收到，請檢查日誌')
      }
    })

    response.data.on('error', (error: Error) => {
      console.error('\n❌ Stream 錯誤:', error.message)
    })

  } catch (error: any) {
    console.error('\n❌ 測試失敗:', error.message)
    if (error.response) {
      console.error('   狀態碼:', error.response.status)
      console.error('   回應:', error.response.data)
    }
  }
}

// 執行測試
console.log('='.repeat(60))
console.log('🧪 Streaming 知識上傳測試')
console.log('='.repeat(60))
console.log()

testStreamingUpload().catch(console.error)
