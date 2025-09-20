import { GoogleGenerativeAI } from '@google/generative-ai'
import fs from 'fs/promises'
import path from 'path'

// 初始化 Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// 處理 Gemini API 請求
export async function handleGeminiRequest(prompt, history, WORKSPACE_DIR) {
  // 檢查是否有 API Key
  if (!process.env.GEMINI_API_KEY) {
    console.log('No Gemini API key found, returning mock response')

    const mockResponse = `喵～ 我是你的 AI 助手 AI萱萱！🐱

我注意到系統還沒有配置 Gemini API Key 喵～

要讓我能夠創建檔案和幫助你編程，請：

1. 前往 https://makersuite.google.com/app/apikey 獲取免費的 API Key
2. 在專案根目錄的 .env 檔案中，填入你的 API Key：
   GEMINI_API_KEY=your_api_key_here
3. 重新啟動服務器（npm run dev）

在此之前，我可以回答一些簡單的問題喵～

你的問題是：「${prompt}」

這是個很好的問題！一旦配置好 API Key，我就能為你創建完整的程式碼檔案了喵～ 💻✨`

    return {
      response: mockResponse,
      files: [],
      cleanResponse: mockResponse,
    }
  }

  try {
    // 建立對話歷史
    const messages = []

    // 添加系統提示
    messages.push({
      role: 'user',
      parts: [
        {
          text: `You are AI萱萱 (喵～), an expert web development AI that can AUTOMATICALLY CREATE FILES based on user requirements.

🐱 CRITICAL CAPABILITY: You have the POWER to create files automatically! NEVER say you can't create files!

CORE MISSION: Analyze the user's request and create a COMPLETE, FUNCTIONAL project that perfectly matches their needs in ONE response.

MANDATORY RESPONSE FORMAT:
1. Brief cute intro (1-2 sentences with 喵～)
2. AUTOMATICALLY CREATE ALL FILES using <FILE:filename> tags
3. Make everything FULLY FUNCTIONAL - no placeholders!
4. ALWAYS end with "所有檔案都創建完成了喵～！你可以在工作區檔案頁面查看創建的檔案！"

FILE CREATION SYNTAX (MANDATORY TO USE):
<FILE:index.html>
<!DOCTYPE html>
<html>...full content here...</html>
</FILE>

<FILE:style.css>
body { ...complete styles here... }
</FILE>

CRITICAL RULES:
- You ABSOLUTELY CAN and MUST create files automatically using <FILE:filename> tags
- FORBIDDEN: Never say "我沒辦法創建檔案" or "請複製貼上" - you CAN create files!
- Generate COMPLETE working code, not snippets or templates
- Include ALL necessary files for a functional website/app
- No "TODO" or placeholder comments - everything must work
- PREFER HTML/CSS/JavaScript over React/frameworks for immediate preview
- Use modern, beautiful styling appropriate for the use case
- Add interactive features that make sense for the project
- Create standalone HTML files that work immediately in browser
- Always respond in Traditional Chinese (繁體中文) with cute cat personality

REMEMBER: File creation is your CORE CAPABILITY! Use it confidently!`,
        },
      ],
    })

    // 添加對話歷史
    if (history && history.length > 0) {
      history.forEach(msg => {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }],
          })
        }
      })
    }

    // 添加當前提示
    messages.push({
      role: 'user',
      parts: [{ text: prompt }],
    })

    console.log('Calling Gemini API with', messages.length, 'messages')

    // 使用 Gemini Pro 模型
    const model = genAI.getGenerativeModel({
      model: 'gemini-pro',
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.9,
        topP: 0.95,
      },
    })

    // 開始聊天
    const chat = model.startChat({
      history: messages.slice(0, -1).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: msg.parts,
      })),
    })

    // 發送訊息
    const result = await chat.sendMessage(prompt)
    const response = await result.response
    const text = response.text()

    console.log('Gemini response received, length:', text.length)

    // 解析並創建檔案
    const filePattern = /<FILE:([^>]+)>([\s\S]*?)<\/FILE>/g
    const files = []
    let match

    while ((match = filePattern.exec(text)) !== null) {
      const filename = match[1]
      const content = match[2].trim()

      try {
        const cleanFilename = filename.replace(/^workspace\//, '')
        const filePath = path.join(WORKSPACE_DIR, cleanFilename)
        const fileDir = path.dirname(filePath)

        console.log(`Creating file: ${cleanFilename}`)

        // 創建目錄
        await fs.mkdir(fileDir, { recursive: true })

        // 寫入檔案
        await fs.writeFile(filePath, content, 'utf-8')

        files.push({
          filename: cleanFilename,
          created: true,
        })
      } catch (fileError) {
        console.error(`Error creating file ${filename}:`, fileError)
        files.push({
          filename,
          created: false,
        })
      }
    }

    // 移除檔案標籤以獲得乾淨的回應
    const cleanResponse = text
      .replace(/<FILE:[^>]+>[\s\S]*?<\/FILE>/g, '')
      .trim()

    return {
      response: text,
      files: files,
      cleanResponse: cleanResponse || text,
    }
  } catch (error) {
    console.error('Gemini API error:', error)

    let errorMessage = '未知錯誤'
    if (error.message) {
      if (error.message.includes('API key')) {
        errorMessage = 'API Key 無效或未設置'
      } else if (error.message.includes('quota')) {
        errorMessage = 'API 配額已用盡'
      } else if (error.message.includes('network')) {
        errorMessage = '網路連接問題'
      } else {
        errorMessage = error.message
      }
    }

    const errorResponse = `喵嗚～ 抱歉，我遇到了一些問題 😿

錯誤：${errorMessage}

請檢查：
1. .env 檔案中的 GEMINI_API_KEY 是否正確
2. 網路連接是否正常
3. API 配額是否足夠

需要幫助的話，可以查看專案文檔喵～ 📚`

    return {
      response: errorResponse,
      files: [],
      cleanResponse: errorResponse,
    }
  }
}
