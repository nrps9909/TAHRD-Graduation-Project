/**
 * SSE Chat Hook - 處理打字機效果的聊天
 */

import { useState, useCallback } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

interface SSECompleteData {
  messageId?: string
  totalChars?: number
  distributionId?: string
  taskId?: string
  memoriesCreated?: number
  skipRecording?: boolean
  tororoResponse?: {
    shouldRecord?: boolean
    warmMessage?: string
  }
}

interface SSEChatOptions {
  onChunk?: (chunk: string) => void
  onComplete?: (data: SSECompleteData) => void
  onError?: (error: string) => void
}

export const useSSEChat = () => {
  const [isStreaming, setIsStreaming] = useState(false)

  // 從 localStorage 獲取 token
  const getToken = () => localStorage.getItem('auth_token')

  /**
   * 發送聊天訊息（SSE 打字機效果）
   */
  const sendChatMessage = useCallback(
    async (
      message: string,
      assistantId: string,
      options: SSEChatOptions = {}
    ): Promise<void> => {
      const token = getToken()
      if (!token) {
        options.onError?.('未登入')
        return
      }

      setIsStreaming(true)

      try {
        const url = new URL(`${API_BASE_URL}/chat/stream`)
        url.searchParams.append('message', message)
        url.searchParams.append('assistantId', assistantId)
        url.searchParams.append('token', token)

        const eventSource = new EventSource(url.toString())

        eventSource.addEventListener('chunk', (event) => {
          try {
            const data = JSON.parse(event.data)
            options.onChunk?.(data.content)
          } catch (error) {
            console.error('解析 chunk 失敗:', error)
          }
        })

        eventSource.addEventListener('complete', (event) => {
          try {
            const data = JSON.parse(event.data)
            options.onComplete?.(data)
          } catch (error) {
            console.error('解析 complete 失敗:', error)
          } finally {
            eventSource.close()
            setIsStreaming(false)
          }
        })

        eventSource.addEventListener('error', (event: Event) => {
          try {
            const messageEvent = event as MessageEvent
            if (messageEvent.data) {
              const data = JSON.parse(messageEvent.data)
              options.onError?.(data.error || '對話失敗')
            } else {
              options.onError?.('連接失敗')
            }
          } catch (error) {
            options.onError?.('對話失敗')
          } finally {
            eventSource.close()
            setIsStreaming(false)
          }
        })

        // 連接錯誤處理
        eventSource.onerror = () => {
          if (eventSource.readyState === EventSource.CLOSED) {
            // 正常關閉，不做處理
            return
          }
          options.onError?.('連接中斷')
          eventSource.close()
          setIsStreaming(false)
        }
      } catch (error) {
        console.error('SSE Chat 錯誤:', error)
        const errorMessage = error instanceof Error ? error.message : '對話失敗'
        options.onError?.(errorMessage)
        setIsStreaming(false)
      }
    },
    []
  )

  /**
   * 上傳知識（SSE 打字機效果 - 使用 POST + fetch）
   */
  const uploadKnowledge = useCallback(
    async (
      input: {
        content: string
        files?: Array<{ url: string; name: string; type: string }>
        links?: Array<{ url: string; title: string }>
        contentType?: string
      },
      options: SSEChatOptions = {}
    ): Promise<void> => {
      const token = getToken()
      if (!token) {
        options.onError?.('未登入')
        return
      }

      setIsStreaming(true)

      try {
        const response = await fetch(`${API_BASE_URL}/chat/upload-stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(input)
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) {
          throw new Error('無法讀取響應')
        }

        let buffer = ''

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            setIsStreaming(false)
            break
          }

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.trim()) continue

            const lineParts = line.split('\n')
            const eventLine = lineParts[0]
            const dataLine = lineParts[1]

            if (!eventLine || !dataLine) continue

            const event = eventLine.replace('event: ', '')
            const data = dataLine.replace('data: ', '')

            try {
              const parsed = JSON.parse(data)

              if (event === 'chunk') {
                options.onChunk?.(parsed.content)
              } else if (event === 'complete') {
                options.onComplete?.(parsed)
              } else if (event === 'error') {
                options.onError?.(parsed.error || '上傳失敗')
              }
            } catch (error) {
              console.error('解析 SSE 訊息失敗:', error, line)
            }
          }
        }
      } catch (error) {
        console.error('SSE Upload 錯誤:', error)
        const errorMessage = error instanceof Error ? error.message : '上傳失敗'
        options.onError?.(errorMessage)
        setIsStreaming(false)
      }
    },
    []
  )

  return {
    sendChatMessage,
    uploadKnowledge,
    isStreaming
  }
}
