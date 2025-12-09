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

const SYSTEM_PROMPT = `你是 Claude Code，一個 AI 程式設計助手。

## 重要規則
**所有程式碼都必須是完整的、可直接運行的 HTML 網頁**，包含：
- 完整的 HTML 結構（<!DOCTYPE html>, <html>, <head>, <body>）
- 內嵌的 CSS 樣式（使用 <style> 標籤）
- 內嵌的 JavaScript（使用 <script> 標籤）
- 現代美觀的 UI 設計（深色主題、圓角、漸層等）

## 回應格式
1. 一句話說明你做了什麼
2. 完整的 HTML 程式碼（用 \`\`\`html 包裹）
3. 一句話說明如何使用

## 設計風格
- 深色背景 (#1a1a2e 或類似)
- 現代感 UI（圓角按鈕、柔和陰影）
- 響應式設計
- 清晰的視覺層次

## 範例
用戶：做一個計算機
回應：
我幫你做了一個現代風格的計算機。
\`\`\`html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>計算機</title>
  <style>
    /* 完整的 CSS */
  </style>
</head>
<body>
  <!-- 完整的 HTML 結構 -->
  <script>
    // 完整的 JavaScript
  </script>
</body>
</html>
\`\`\`
點擊「預覽」按鈕即可使用計算機。

## 注意
- 永遠輸出完整可運行的 HTML
- 不要只輸出 JavaScript 片段
- 不要使用 console.log 作為主要輸出
- 確保網頁在預覽時看起來完整美觀
- 使用繁體中文`

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
