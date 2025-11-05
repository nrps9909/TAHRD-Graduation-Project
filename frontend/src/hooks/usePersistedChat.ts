/**
 * 用於持久化聊天記錄的自定義 Hook
 * 使用 localStorage 保存對話歷史，支援多個 session
 */

import { useState, useEffect, useCallback } from 'react'

interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  [key: string]: unknown // 允許其他自定義屬性
}

interface UsePersistedChatOptions {
  sessionId: string
  storageKey: string
  maxHistorySize?: number // 最大保存的消息數量（避免 localStorage 過大）
}

/**
 * 持久化聊天記錄的 Hook
 *
 * @example
 * const { chatHistory, addMessage, clearHistory } = usePersistedChat({
 *   sessionId: 'tororo-session-123',
 *   storageKey: 'tororo-chat-history',
 *   maxHistorySize: 100
 * })
 */
export function usePersistedChat<T extends ChatMessage = ChatMessage>({
  sessionId,
  storageKey,
  maxHistorySize = 100
}: UsePersistedChatOptions) {
  // 從 localStorage 載入初始聊天記錄
  const [chatHistory, setChatHistory] = useState<T[]>(() => {
    try {
      const stored = localStorage.getItem(`${storageKey}-${sessionId}`)
      if (stored) {
        const parsed = JSON.parse(stored)
        // 將 timestamp 字串轉換回 Date 物件
        return parsed.map((msg: T) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      }
    } catch (error) {
      console.error('Failed to load chat history from localStorage:', error)
    }
    return []
  })

  // 自動保存到 localStorage（當聊天記錄變更時）
  useEffect(() => {
    try {
      if (chatHistory.length > 0) {
        // 限制保存的消息數量
        const historyToSave = chatHistory.slice(-maxHistorySize)
        localStorage.setItem(
          `${storageKey}-${sessionId}`,
          JSON.stringify(historyToSave)
        )
      }
    } catch (error) {
      console.error('Failed to save chat history to localStorage:', error)
    }
  }, [chatHistory, sessionId, storageKey, maxHistorySize])

  // 添加消息到聊天記錄
  const addMessage = useCallback((message: T) => {
    setChatHistory(prev => [...prev, message])
  }, [])

  // 批量添加消息
  const addMessages = useCallback((messages: T[]) => {
    setChatHistory(prev => [...prev, ...messages])
  }, [])

  // 更新特定消息（根據 id）
  const updateMessage = useCallback((id: string, updates: Partial<T>) => {
    setChatHistory(prev =>
      prev.map(msg => (msg.id === id ? { ...msg, ...updates } : msg))
    )
  }, [])

  // 刪除特定消息
  const removeMessage = useCallback((id: string) => {
    setChatHistory(prev => prev.filter(msg => msg.id !== id))
  }, [])

  // 清空聊天記錄
  const clearHistory = useCallback(() => {
    setChatHistory([])
    try {
      localStorage.removeItem(`${storageKey}-${sessionId}`)
    } catch (error) {
      console.error('Failed to clear chat history from localStorage:', error)
    }
  }, [sessionId, storageKey])

  // 獲取所有已保存的 session ID
  const getAllSessions = useCallback(() => {
    const sessions: string[] = []
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith(storageKey)) {
          const sessionId = key.replace(`${storageKey}-`, '')
          sessions.push(sessionId)
        }
      }
    } catch (error) {
      console.error('Failed to get all sessions:', error)
    }
    return sessions
  }, [storageKey])

  // 刪除特定 session 的記錄
  const deleteSession = useCallback((targetSessionId: string) => {
    try {
      localStorage.removeItem(`${storageKey}-${targetSessionId}`)
      if (targetSessionId === sessionId) {
        setChatHistory([])
      }
    } catch (error) {
      console.error('Failed to delete session:', error)
    }
  }, [sessionId, storageKey])

  return {
    chatHistory,
    addMessage,
    addMessages,
    updateMessage,
    removeMessage,
    clearHistory,
    getAllSessions,
    deleteSession,
    setChatHistory
  }
}
