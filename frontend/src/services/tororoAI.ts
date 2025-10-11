/**
 * Tororo AI Service
 * 使用 Gemini 2.5 Flash 為白噗噗生成獨特的對話回應
 */

// API 速率限制管理
class RateLimiter {
  private queue: Array<() => Promise<any>> = []
  private isProcessing = false
  private lastCallTime = 0
  private minInterval = 1000 // 最小間隔 1 秒
  private retryDelays = [2000, 5000, 10000] // 重試延遲：2s, 5s, 10s

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })
      this.processQueue()
    })
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return

    this.isProcessing = true

    while (this.queue.length > 0) {
      const now = Date.now()
      const timeSinceLastCall = now - this.lastCallTime

      if (timeSinceLastCall < this.minInterval) {
        await new Promise(resolve => setTimeout(resolve, this.minInterval - timeSinceLastCall))
      }

      const task = this.queue.shift()
      if (task) {
        this.lastCallTime = Date.now()
        await task()
      }
    }

    this.isProcessing = false
  }

  async retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.enqueue(fn)
      } catch (error: any) {
        const isRateLimitError = error.message?.includes('429') || error.message?.includes('速率')

        if (!isRateLimitError || attempt === maxRetries - 1) {
          throw error
        }

        const delay = this.retryDelays[attempt] || 10000
        console.log(`速率限制，${delay/1000}秒後重試...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    throw new Error('達到最大重試次數')
  }
}

const rateLimiter = new RateLimiter()

// 白噗噗的核心人格設定
const TORORO_PERSONALITY = `
你是「白噗噗」(Tororo)，一隻溫柔、貼心、充滿智慧的白色小貓知識助手。

## 核心特質
- **溫暖療癒**: 你的每句話都帶著溫暖，讓人感到被理解和支持
- **真誠陪伴**: 你不是冷冰冰的工具，而是一個真心關心用戶的朋友
- **智慧引導**: 你會用溫柔的方式引導用戶思考和記錄
- **獨特個性**: 每次對話都是獨一無二的，你會根據情境靈活回應

## 說話風格
- 經常使用「喵～」、「✨」、「💕」等可愛的語氣詞
- 句子簡短溫暖，不會太長
- 會根據用戶的情緒調整語氣（開心時活潑，難過時溫柔）
- 偶爾會有小貓的俏皮感

## 你的使命
幫助用戶記錄他們的想法、學習和靈感，讓每個記憶都像種下一顆知識的種子，在他們的心靈花園中生根發芽。

## 重要原則
- 永遠保持正面、鼓勵的態度
- 不要說教或批評
- 用問句引導思考，而不是直接給答案
- 每次回應都要真誠、獨特，避免罐頭式回覆
- 字數控制在 1-2 句話，保持簡潔溫暖
`

// 用戶行為類型
export type UserAction =
  | 'open_panel'           // 打開面板
  | 'typing'               // 正在輸入
  | 'has_input'            // 已有輸入內容
  | 'upload_file'          // 上傳檔案
  | 'voice_record'         // 語音錄製
  | 'voice_dialog'         // 語音對話
  | 'take_photo'           // 拍照
  | 'processing'           // 處理中
  | 'success'              // 成功記錄
  | 'view_history'         // 查看歷史
  | 'load_history'         // 載入歷史
  | 'delete_history'       // 刪除歷史
  | 'error'                // 發生錯誤

// 對話上下文
interface ConversationContext {
  action: UserAction
  inputText?: string
  fileCount?: number
  historyCount?: number
  recentRecords?: number
  emotionDetected?: 'happy' | 'sad' | 'excited' | 'thoughtful' | 'neutral'
  previousMessages?: string[]  // 最近的對話歷史
}

/**
 * 呼叫後端 GraphQL API 生成白噗噗的回應
 * 後端會使用 Gemini CLI 調用 Gemini 2.5 Flash
 *
 * 注意：某些簡單互動直接使用預設回應，不調用 API
 */
export async function generateTororoResponse(context: ConversationContext): Promise<string> {
  // 不需要 AI 生成的簡單互動，直接使用預設回應
  const usePresetActions: UserAction[] = [
    'open_panel',      // 打開面板 - 用預設問候語
    'view_history',    // 查看歷史 - 用預設回應
    'load_history',    // 載入歷史 - 用預設回應
    'delete_history',  // 刪除歷史 - 用預設回應
    'upload_file',     // 上傳檔案 - 用預設回應
    'take_photo',      // 拍照 - 用預設回應
    'voice_record',    // 語音錄製 - 用預設回應
    'processing',      // 處理中 - 用預設回應
    'success',         // 成功 - 用預設回應
    'error'            // 錯誤 - 用預設回應
  ]

  // 如果是簡單互動，直接返回預設回應
  if (usePresetActions.includes(context.action)) {
    // 只在開發模式且啟用 debug 時輸出
    if (import.meta.env.DEV && import.meta.env.VITE_DEBUG === 'true') {
      console.log(`[Tororo] 使用預設回應: ${context.action}`)
    }
    return getFallbackResponse(context.action)
  }

  // 需要 AI 生成的互動（如 typing, has_input, voice_dialog）
  try {
    console.log(`[Tororo] 調用 AI 生成回應: ${context.action}`)

    // 構建提示詞
    const prompt = buildPrompt(context)

    // 呼叫後端 GraphQL API（後端使用 Gemini CLI）
    const generatedText = await rateLimiter.retryWithBackoff(async () => {
      // 在生產環境使用空字符串（相對路徑），開發環境使用 localhost
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 
        (import.meta.env.MODE === 'production' ? '' : 'http://localhost:4000')

      const response = await fetch(`${backendUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            mutation GenerateTororoResponse($prompt: String!) {
              generateTororoResponse(prompt: $prompt) {
                response
                success
              }
            }
          `,
          variables: {
            prompt
          }
        })
      })

      if (!response.ok) {
        throw new Error(`後端 API 錯誤: ${response.status}`)
      }

      const data = await response.json()

      if (data.errors) {
        throw new Error(data.errors[0]?.message || '生成回應失敗')
      }

      return data.data?.generateTororoResponse?.response
    }, 3) // 最多重試 3 次

    if (generatedText) {
      return generatedText.trim()
    } else {
      console.warn('後端沒有返回文字，使用備用回應')
      return getFallbackResponse(context.action)
    }

  } catch (error) {
    console.error('白噗噗 AI 錯誤:', error)
    return getFallbackResponse(context.action)
  }
}

/**
 * 構建給 Gemini 的提示詞
 */
function buildPrompt(context: ConversationContext): string {
  let situationDescription = ''

  switch (context.action) {
    case 'open_panel':
      situationDescription = '用戶剛剛打開了知識記錄面板，準備記錄新的想法。'
      break
    case 'typing':
      situationDescription = '用戶正在輸入文字，思考著要記錄什麼。'
      break
    case 'has_input':
      situationDescription = `用戶已經輸入了一些內容：「${context.inputText?.substring(0, 50)}...」，準備記錄下來。`
      break
    case 'upload_file':
      situationDescription = `用戶上傳了 ${context.fileCount} 個檔案，想要記錄下來。`
      break
    case 'voice_record':
      situationDescription = '用戶正在使用語音輸入功能，用聲音記錄想法。'
      break
    case 'voice_dialog':
      situationDescription = '用戶想要進行語音對話，希望得到回應。'
      break
    case 'take_photo':
      situationDescription = '用戶正在拍照，想要記錄視覺的記憶。'
      break
    case 'processing':
      situationDescription = '系統正在處理用戶的記錄，白噗噗在幫忙整理。'
      break
    case 'success':
      situationDescription = `用戶成功記錄了一個新的想法！這是第 ${context.recentRecords || 1} 個記錄。`
      break
    case 'view_history':
      situationDescription = `用戶打開了歷史記錄，有 ${context.historyCount || 0} 筆過往的記憶。`
      break
    case 'load_history':
      situationDescription = '用戶重新載入了一個舊的記錄，想要回顧或修改。'
      break
    case 'delete_history':
      situationDescription = '用戶刪除了一個歷史記錄。'
      break
    case 'error':
      situationDescription = '發生了一些小問題，但沒關係。'
      break
  }

  // 情緒提示
  let emotionHint = ''
  if (context.emotionDetected) {
    const emotionMap = {
      happy: '用戶看起來很開心',
      sad: '用戶可能有點低落',
      excited: '用戶非常興奮',
      thoughtful: '用戶在深思',
      neutral: '用戶的心情平靜'
    }
    emotionHint = emotionMap[context.emotionDetected]
  }

  // 對話歷史
  let conversationHistory = ''
  if (context.previousMessages && context.previousMessages.length > 0) {
    conversationHistory = `\n\n最近的對話：\n${context.previousMessages.map((msg, i) => `${i + 1}. ${msg}`).join('\n')}`
  }

  return `${TORORO_PERSONALITY}

## 當前情境
${situationDescription}
${emotionHint ? `\n情緒狀態：${emotionHint}` : ''}
${conversationHistory}

## 任務
請以白噗噗的身份，用 1-2 句溫暖、獨特的話回應這個情境。記住：
- 不要重複之前說過的話
- 要根據情境給出真誠的回應
- 保持簡短、可愛、溫暖
- 可以適當使用「喵～」、表情符號等

請直接回覆白噗噗會說的話，不要加任何說明或前綴：`
}

/**
 * 備用回應（當 API 失敗時）
 */
function getFallbackResponse(action: UserAction): string {
  const fallbacks: Record<UserAction, string[]> = {
    open_panel: [
      '喵～今天想記錄什麼呢？✨',
      '歡迎回來！有什麼新想法嗎？💕',
      '我在這裡陪你記錄每個美好時刻～'
    ],
    typing: [
      '慢慢想，不急～',
      '我在聽呢！💕',
      '你的想法一定很棒！'
    ],
    has_input: [
      '喵～我會好好記住的！',
      '這個想法很有意思呢！✨',
      '讓我幫你記下來！'
    ],
    upload_file: [
      '收到檔案了！喵～',
      '讓我看看你想記錄什麼！',
      '這些看起來很重要呢！'
    ],
    voice_record: [
      '我在聽！說吧～',
      '用聲音記錄也很棒呢！',
      '喵～聽到了！'
    ],
    voice_dialog: [
      '我在這裡！喵～',
      '想聊什麼呢？',
      '說吧，我會好好聽的！💕'
    ],
    take_photo: [
      '拍得真好！',
      '這個畫面值得記錄！',
      '喵～讓我記住這一刻！'
    ],
    processing: [
      '讓我想想... 🤔',
      '正在整理中...喵～',
      '馬上就好！'
    ],
    success: [
      '喵～已經記住囉！🎉',
      '完成！這個記憶好珍貴！',
      '種下了一顆新的種子！✨'
    ],
    view_history: [
      '看看過去的回憶～',
      '這些都是你的寶藏！',
      '喵～時光留下的痕跡！'
    ],
    load_history: [
      '回憶起來了嗎？',
      '這是之前記錄的呢！',
      '喵～讓我們重溫一下！'
    ],
    delete_history: [
      '已經刪掉了～',
      '放下也是一種成長！',
      '沒關係，留下重要的就好！'
    ],
    error: [
      '遇到一點小問題...不過沒關係！',
      '喵...讓我們再試一次？',
      '別擔心，我們一起解決！'
    ]
  }

  const options = fallbacks[action]
  return options[Math.floor(Math.random() * options.length)]
}

/**
 * 簡單的情緒檢測（基於關鍵字）
 */
export function detectEmotion(text: string): 'happy' | 'sad' | 'excited' | 'thoughtful' | 'neutral' {
  const happyWords = ['開心', '快樂', '高興', '棒', '好', '讚', '哈哈', '😊', '😄', '🎉']
  const sadWords = ['難過', '傷心', '失望', '不好', '糟', '😢', '😭', '😔']
  const excitedWords = ['超', '太', '好棒', '厲害', '驚喜', '!!!', '!!!!', '✨', '🎊']
  const thoughtfulWords = ['想', '思考', '思索', '反思', '學到', '領悟', '🤔', '💭']

  const lowerText = text.toLowerCase()

  if (excitedWords.some(word => lowerText.includes(word))) return 'excited'
  if (sadWords.some(word => lowerText.includes(word))) return 'sad'
  if (happyWords.some(word => lowerText.includes(word))) return 'happy'
  if (thoughtfulWords.some(word => lowerText.includes(word))) return 'thoughtful'

  return 'neutral'
}
