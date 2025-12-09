const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_MODEL = 'gemini-2.5-flash'
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

interface GeminiResponse {
  candidates: {
    content: {
      parts: { text: string }[]
    }
  }[]
}

export interface CodeGenerationResult {
  response: string
  code: string | undefined
  explanation: string | undefined
}

const SYSTEM_PROMPT = `你是一個友善的程式設計助手，專門幫助初學者學習程式設計。
你的任務是根據用戶的自然語言請求生成程式碼。

回應格式要求：
1. 先用一句話簡短說明你要做什麼
2. 然後提供程式碼（用 \`\`\` 包裹）
3. 最後簡短解釋程式碼的重點

注意事項：
- 使用繁體中文回應
- 程式碼要簡潔易懂
- 加上適當的註解
- 如果是網頁相關，提供完整可運行的 HTML
- 如果是 JavaScript 函式，提供完整的程式碼`

export async function generateCode(userPrompt: string): Promise<CodeGenerationResult> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API Key 未設定')
  }

  try {
    const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: SYSTEM_PROMPT },
              { text: `用戶請求：${userPrompt}` }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
        }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Gemini API Error:', error)
      throw new Error(`API 錯誤: ${response.status}`)
    }

    const data: GeminiResponse = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // 解析回應，分離文字和程式碼
    const codeMatch = text.match(/```[\w]*\n?([\s\S]*?)```/)
    const code = codeMatch ? codeMatch[1].trim() : undefined

    // 移除程式碼區塊後的文字作為回應
    const responseText = text.replace(/```[\w]*\n?[\s\S]*?```/g, '').trim()

    // 分離說明和解釋
    const parts = responseText.split('\n\n')
    const explanation = parts.length > 1 ? parts[parts.length - 1] : undefined
    const mainResponse = parts.length > 1 ? parts.slice(0, -1).join('\n\n') : responseText

    return {
      response: mainResponse || '我來幫你生成程式碼：',
      code,
      explanation
    }
  } catch (error) {
    console.error('Gemini API Error:', error)
    throw error
  }
}

export function isApiAvailable(): boolean {
  return !!GEMINI_API_KEY
}
