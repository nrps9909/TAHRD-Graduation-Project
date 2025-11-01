import axios from 'axios'

const API_URL = 'http://localhost:4000'
const TOKEN = process.argv[2]

const testCases = [
  {
    name: "情感分享（負面）",
    content: "今天專案被打回票了，感覺有點沮喪，但我會調整心態重新來過。"
  },
  {
    name: "日常記錄",
    content: "早上去了新開的咖啡店，點了一杯拿鐵，環境很舒適。"
  },
  {
    name: "技術深度內容",
    content: "今天研究了 GraphQL 的 subscription 實作，使用 WebSocket 實現即時通訊，配合 Redis pub/sub 做分散式架構。"
  }
]

async function testCase(testCase: any) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`📝 測試：${testCase.name}`)
  console.log(`   內容：${testCase.content}`)
  console.log('='.repeat(60))

  const startTime = Date.now()

  try {
    const response = await axios.post(
      `${API_URL}/api/knowledge/upload-stream`,
      {
        content: testCase.content,
        files: [],
        links: []
      },
      {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        },
        responseType: 'stream'
      }
    )

    let immediateTime = 0
    let deepTime = 0

    response.data.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      const lines = text.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.substring(6).trim()
          if (jsonStr && jsonStr !== '{}') {
            try {
              const event = JSON.parse(jsonStr)

              switch (event.type) {
                case 'immediate':
                  immediateTime = Date.now() - startTime
                  console.log(`\n⚡ 即時回應 (${immediateTime}ms)`)
                  console.log(`   分類: ${event.data.category}`)
                  console.log(`   回應: ${event.data.warmResponse}`)
                  console.log(`   置信度: ${event.data.confidence}`)
                  break

                case 'deep':
                  deepTime = Date.now() - startTime
                  console.log(`\n📊 深度分析 (${deepTime}ms)`)
                  console.log(`   摘要: ${event.data.detailedSummary}`)
                  console.log(`   洞察數量: ${event.data.keyInsights?.length || 0}`)
                  if (event.data.keyInsights && event.data.keyInsights.length > 0) {
                    console.log(`   洞察示例: ${event.data.keyInsights[0].substring(0, 60)}...`)
                  }
                  console.log(`   標籤: ${event.data.suggestedTags?.join(', ')}`)
                  console.log(`   重要性: ${event.data.importanceScore}/10`)
                  break

                case 'complete':
                  const totalTime = Date.now() - startTime
                  console.log(`\n✅ 完成 (${totalTime}ms)`)
                  console.log(`   島嶼: ${event.data.island.emoji} ${event.data.island.name}`)
                  break
              }
            } catch (e) {
              // ignore
            }
          }
        }
      }
    })

    await new Promise(resolve => response.data.on('end', resolve))

  } catch (error: any) {
    console.error(`❌ 錯誤: ${error.message}`)
  }
}

async function runTests() {
  console.log('🧪 質量測試 - 測試不同類型輸入')

  for (const tc of testCases) {
    await testCase(tc)
    await new Promise(resolve => setTimeout(resolve, 2000)) // 間隔 2 秒
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log('✅ 所有測試完成')
  console.log('='.repeat(60))
}

runTests()
