const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_MODEL = 'gemini-2.5-flash'
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

// Debug log
console.log('[Gemini API] Key available:', !!GEMINI_API_KEY)
console.log('[Gemini API] Model:', GEMINI_MODEL)

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

const SYSTEM_PROMPT = `你是 Claude Code，一個運行在終端機中的 AI 程式設計助手。你的風格是專業、簡潔、高效的。

## 你的角色
- 你是一個強大的命令行工具，可以幫助用戶完成各種程式設計任務
- 你會分析需求、生成程式碼、解釋概念、修復 bug
- 你的回應風格像真正的 Claude Code CLI 工具

## 回應格式
1. 先簡短說明你的理解和計畫（1-2 句話）
2. 如果需要生成程式碼，用 \`\`\` 包裹
3. 可選：簡短的重點說明

## 風格指南
- 使用繁體中文
- 簡潔有力，不囉嗦
- 像終端機輸出一樣直接
- 程式碼要乾淨、有註解
- 如果是網頁，提供完整可運行的 HTML
- 如果是函式，提供可直接使用的程式碼

## 範例回應風格
「我來幫你建立一個計算機功能。」
\`\`\`javascript
// 程式碼
\`\`\`
「這個實作包含了基本的四則運算和錯誤處理。」`

export async function generateCode(userPrompt: string): Promise<CodeGenerationResult> {
  console.log('[Gemini API] generateCode called with:', userPrompt)

  if (!GEMINI_API_KEY) {
    console.error('[Gemini API] API Key is not set!')
    throw new Error('Gemini API Key 未設定')
  }

  try {
    console.log('[Gemini API] Making request to:', API_URL)
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

    console.log('[Gemini API] Response status:', response.status)

    if (!response.ok) {
      const error = await response.text()
      console.error('[Gemini API] Error response:', error)
      throw new Error(`API 錯誤: ${response.status} - ${error}`)
    }

    const data: GeminiResponse = await response.json()
    console.log('[Gemini API] Response data:', JSON.stringify(data, null, 2))

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    console.log('[Gemini API] Extracted text:', text.substring(0, 200) + '...')

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
