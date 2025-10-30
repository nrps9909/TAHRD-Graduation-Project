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
   * 上傳知識（SSE 打字機效果）
   */
  const uploadKnowledge = useCallback(
    async (
      content: string,
      options: SSEChatOptions = {}
    ): Promise<void> => {
      const token = getToken()
      if (!token) {
        options.onError?.('未登入')
        return
      }

      setIsStreaming(true)

      try {
        const url = new URL(`${API_BASE_URL}/chat/upload-stream`)
        url.searchParams.append('content', content)
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
              options.onError?.(data.error || '上傳失敗')
            } else {
              options.onError?.('連接失敗')
            }
          } catch (error) {
            options.onError?.('上傳失敗')
          } finally {
            eventSource.close()
            setIsStreaming(false)
          }
        })

        eventSource.onerror = () => {
          if (eventSource.readyState === EventSource.CLOSED) {
            return
          }
          options.onError?.('連接中斷')
          eventSource.close()
          setIsStreaming(false)
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
