/**
 * useCatChat Hook
 * 管理貓咪對話的狀態和邏輯
 */

import { useState, useCallback, useEffect } from 'react'
import { CatAgent, ChatMessage } from './ChatBubble'

interface UseCatChatOptions {
  initialCat?: CatAgent
  onCreateMemory?: (content: string) => Promise<void>
  onSearchMemories?: (query: string) => Promise<any>
}

// 聊天會話歷史
interface ChatSession {
  id: string
  catAgent: CatAgent
  messages: ChatMessage[]
  startTime: Date
  endTime?: Date
}

const STORAGE_KEY = 'cat_chat_history'

export function useCatChat(options: UseCatChatOptions = {}) {
  const [currentCat, setCurrentCat] = useState<CatAgent>(options.initialCat || CatAgent.TORORO)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string>(`session_${Date.now()}`)

  // 從 localStorage 載入歷史紀錄
  useEffect(() => {
    const loadHistory = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          // 轉換日期字串回 Date 物件
          const history = parsed.map((session: any) => ({
            ...session,
            startTime: new Date(session.startTime),
            endTime: session.endTime ? new Date(session.endTime) : undefined,
            messages: session.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }))
          }))
          setChatHistory(history)
        }
      } catch (error) {
        console.error('Failed to load chat history:', error)
      }
    }
    loadHistory()
  }, [])

  // 儲存當前會話到歷史紀錄
  const saveCurrentSession = useCallback(() => {
    if (messages.length === 0) return

    const session: ChatSession = {
      id: currentSessionId,
      catAgent: currentCat,
      messages: messages,
      startTime: messages[0]?.timestamp || new Date(),
      endTime: new Date()
    }

    setChatHistory(prev => {
      const filtered = prev.filter(s => s.id !== currentSessionId)
      const updated = [session, ...filtered].slice(0, 50) // 只保留最近 50 個會話

      // 儲存到 localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch (error) {
        console.error('Failed to save chat history:', error)
      }

      return updated
    })
  }, [messages, currentSessionId, currentCat])

  // 當訊息變化時自動儲存
  useEffect(() => {
    if (messages.length > 0) {
      const timeoutId = setTimeout(saveCurrentSession, 1000) // 延遲 1 秒儲存
      return () => clearTimeout(timeoutId)
    }
  }, [messages, saveCurrentSession])

  /**
   * 發送訊息
   */
  const sendMessage = useCallback(async (message: string, catAgent: CatAgent) => {
    // 添加用戶訊息
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      catAgent,
      message,
      timestamp: new Date(),
      isUser: true
    }
    setMessages(prev => [...prev, userMessage])

    // 設置載入狀態
    setIsLoading(true)

    try {
      // 根據貓咪類型調用不同的 API
      let response: string

      if (catAgent === CatAgent.TORORO) {
        // Tororo: 創建記憶
        if (options.onCreateMemory) {
          await options.onCreateMemory(message)
          response = '種好啦！你看，這朵花開得多美！✨'
        } else {
          response = '收到你的想法了～讓我幫你種下這朵花！'
        }
      } else {
        // Hijiki: 搜尋記憶
        if (options.onSearchMemories) {
          const results = await options.onSearchMemories(message)
          response = `找到了。共有 ${results?.length || 0} 條相關記憶。`
        } else {
          response = '正在搜尋中...'
        }
      }

      // 添加貓咪回應
      const catResponse: ChatMessage = {
        id: `cat_${Date.now()}`,
        catAgent,
        message: response,
        timestamp: new Date(),
        isUser: false
      }
      setMessages(prev => [...prev, catResponse])
    } catch (error) {
      console.error('Error sending message:', error)

      // 錯誤訊息
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        catAgent,
        message: catAgent === CatAgent.TORORO
          ? '抱歉，種花的時候遇到了一點問題...'
          : '搜尋時發生錯誤。',
        timestamp: new Date(),
        isUser: false
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [options])

  /**
   * 切換貓咪
   */
  const switchCat = useCallback((catAgent: CatAgent) => {
    setCurrentCat(catAgent)

    // 添加系統訊息
    const systemMessage: ChatMessage = {
      id: `system_${Date.now()}`,
      catAgent,
      message: catAgent === CatAgent.TORORO
        ? '喵～小白來了！今天想種下什麼新想法呢？'
        : '喵。小黑待命中。需要我幫你找什麼資訊嗎？',
      timestamp: new Date(),
      isUser: false
    }
    setMessages(prev => [...prev, systemMessage])
  }, [])

  /**
   * 清空訊息
   */
  const clearMessages = useCallback(() => {
    saveCurrentSession() // 儲存當前會話
    setMessages([])
    setCurrentSessionId(`session_${Date.now()}`) // 開始新會話
  }, [saveCurrentSession])

  /**
   * 載入歷史會話
   */
  const loadSession = useCallback((sessionId: string) => {
    const session = chatHistory.find(s => s.id === sessionId)
    if (session) {
      setMessages(session.messages)
      setCurrentCat(session.catAgent)
      setCurrentSessionId(sessionId)
    }
  }, [chatHistory])

  /**
   * 刪除歷史會話
   */
  const deleteSession = useCallback((sessionId: string) => {
    setChatHistory(prev => {
      const updated = prev.filter(s => s.id !== sessionId)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch (error) {
        console.error('Failed to delete session:', error)
      }
      return updated
    })
  }, [])

  /**
   * 清空所有歷史
   */
  const clearHistory = useCallback(() => {
    setChatHistory([])
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error('Failed to clear history:', error)
    }
  }, [])

  return {
    currentCat,
    messages,
    isLoading,
    chatHistory,
    sendMessage,
    switchCat,
    clearMessages,
    loadSession,
    deleteSession,
    clearHistory
  }
}
