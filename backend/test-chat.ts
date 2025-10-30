/**
 * 測試腳本：驗證 chatWithChief 功能
 */

import { PrismaClient } from '@prisma/client'
import { callGeminiAPI } from './src/utils/geminiAPI'

const prisma = new PrismaClient()

async function testChatWithChief() {
  try {
    console.log('🧪 開始測試 chatWithChief 功能...\n')

    // 1. 測試 Gemini API 基本調用
    console.log('1️⃣ 測試 Gemini API 基本調用...')
    const simplePrompt = '請用中文說 "你好"'
    const simpleResponse = await callGeminiAPI(simplePrompt, {
      model: 'gemini-2.5-flash',
      temperature: 0.2,
      maxOutputTokens: 2048,
      timeout: 15000
    })
    console.log('✅ Gemini API 響應:', simpleResponse)
    console.log()

    // 2. 獲取 Chief Assistant
    console.log('2️⃣ 獲取 Chief Assistant...')
    const chief = await prisma.assistant.findFirst({
      where: { type: 'CHIEF' }
    })
    if (!chief) {
      throw new Error('❌ Chief assistant not found')
    }
    console.log('✅ Chief Assistant:', chief.nameChinese, chief.emoji)
    console.log()

    // 3. 測試完整的 chatWithChief 流程（模擬）
    console.log('3️⃣ 測試 chatWithChief 流程（模擬）...')
    const userId = '6901ab83f1229f9da3562cab' // 你的用戶 ID
    const userMessage = '你好，最近過得怎麼樣？'

    // 獲取最近記憶
    const recentMemories = await prisma.memory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    const contextInfo = recentMemories.length > 0
      ? `\n\n用戶最近的記錄：\n${recentMemories.map(m => `[${m.category}] ${m.summary || m.rawContent.substring(0, 40)}`).join('\n')}`
      : ''

    const prompt = `${chief.systemPrompt}

用戶詢問：${userMessage}
${contextInfo}

請基於你對用戶所有記錄的了解來回答。`

    console.log('📝 Prompt 長度:', prompt.length, '字符')
    console.log()

    console.log('4️⃣ 調用 Gemini API...')
    const response = await callGeminiAPI(prompt, {
      model: 'gemini-2.5-flash',
      temperature: 0.2,
      maxOutputTokens: 2048,
      timeout: 15000
    })

    console.log('✅ Chief 回應:')
    console.log(response)
    console.log()

    console.log('✅ 測試完成！chatWithChief 功能正常')

  } catch (error: any) {
    console.error('❌ 測試失敗:', error.message)
    console.error('詳細錯誤:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testChatWithChief()
