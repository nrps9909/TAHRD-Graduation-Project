/**
 * HijikiChatPanel - 黑噗噗知識查詢聊天面板
 * 動物森友會夜晚風格，紫藍色系
 *
 * 功能:
 * - RAG 知識查詢
 * - 顯示相關記憶來源
 * - 對話歷史持久化
 * - 響應式設計
 */

import { useState, useRef, useEffect } from 'react'
import { useLazyQuery, useMutation } from '@apollo/client'
import { motion, AnimatePresence } from 'framer-motion'
import { CHAT_WITH_HIJIKI, CLEAR_HIJIKI_SESSION } from '../graphql/hijikiChat'
import type { HijikiChatResponse } from '../graphql/hijikiChat'
import { useChatStore } from '../stores/chatStore'
import { useSound } from '../hooks/useSound'

interface HijikiChatPanelProps {
  onClose: () => void
}

export function HijikiChatPanel({ onClose }: HijikiChatPanelProps) {
  const [sessionId] = useState(() => `hijiki-session-${Date.now()}`)
  const [isTyping, setIsTyping] = useState(false)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { play } = useSound()

  // 使用 chatStore 管理狀態
  const {
    hijiki: chatState,
    addHijikiMessage,
    setHijikiInputText,
    setHijikiIsProcessing,
    clearHijikiSession,
  } = useChatStore()

  // GraphQL queries
  const [chatWithHijiki, { loading }] = useLazyQuery<{
    chatWithHijiki: HijikiChatResponse
  }>(CHAT_WITH_HIJIKI)

  const [clearSession] = useMutation(CLEAR_HIJIKI_SESSION)

  // 自動滾動到底部
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chatState.messages])

  // 處理發送訊息
  const handleSendMessage = async () => {
    const message = chatState.inputText.trim()
    if (!message || loading) return

    play('message_sent')

    // 添加用戶訊息
    addHijikiMessage({
      id: `user-${Date.now()}`,
      type: 'user',
      content: message,
      timestamp: new Date(),
    })

    setHijikiInputText('')
    setHijikiIsProcessing(true)
    setIsTyping(true)

    try {
      const { data } = await chatWithHijiki({
        variables: {
          sessionId,
          query: message,
          maxContext: 5,
        },
      })

      if (data?.chatWithHijiki) {
        const response = data.chatWithHijiki

        // 添加助手回覆
        addHijikiMessage({
          id: `assistant-${Date.now()}`,
          type: 'assistant',
          content: response.answer,
          timestamp: new Date(),
          attachments: response.sources.map((source) => ({
            type: 'file' as const,
            name: source.title,
            url: `/memory/${source.memoryId}`,
          })),
        })

        play('notification')
      }
    } catch (error) {
      console.error('Chat failed:', error)

      // 根據錯誤類型提供更具體的錯誤訊息
      let errorMessage = '抱歉，查詢時發生錯誤。請稍後再試。'

      if (error instanceof Error) {
        // 從 GraphQL 錯誤中提取實際的錯誤訊息
        const graphQLError = error as Error & { graphQLErrors?: Array<{ message: string }> }
        const actualError = graphQLError.graphQLErrors?.[0]?.message || error.message

        if (actualError.includes('Network') || actualError.includes('fetch')) {
          errorMessage = '網路連線錯誤，請檢查網路連線後再試。'
        } else if (actualError.includes('401') || actualError.includes('未授權')) {
          errorMessage = '認證失敗，請重新登入後再試。'
        } else if (actualError.includes('timeout') || actualError.includes('超時')) {
          errorMessage = '查詢時間過長，請嘗試簡化問題或稍後再試。'
        } else if (actualError.includes('配額')) {
          errorMessage = 'API 配額已用盡，請稍後再試。'
        } else if (actualError !== error.message) {
          // 如果有更具體的錯誤訊息，顯示它
          errorMessage = actualError
        }
      }

      addHijikiMessage({
        id: `error-${Date.now()}`,
        type: 'assistant',
        content: `😢 ${errorMessage}`,
        timestamp: new Date(),
      })
    } finally {
      setHijikiIsProcessing(false)
      setIsTyping(false)
    }
  }

  // 處理鍵盤事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // 清空對話
  const handleClearChat = async () => {
    try {
      await clearSession({ variables: { sessionId } })
      clearHijikiSession()
      play('button_click')
    } catch (error) {
      console.error('Clear session failed:', error)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      className="fixed right-0 top-0 h-screen w-full md:w-[450px] z-50 flex flex-col"
      style={{
        background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.98) 0%, rgba(45, 42, 95, 0.98) 100%)',
        backdropFilter: 'blur(24px) saturate(180%)',
        borderLeft: '3px solid rgba(139, 92, 246, 0.4)',
        boxShadow: '-8px 0 32px 0 rgba(139, 92, 246, 0.3)',
      }}
    >
      {/* 頭部 */}
      <div
        className="px-6 py-4 border-b flex items-center justify-between"
        style={{
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.4) 0%, rgba(99, 102, 241, 0.3) 100%)',
          borderColor: 'rgba(139, 92, 246, 0.3)',
        }}
      >
        <div className="flex items-center gap-3">
          <span className="text-4xl">🌙</span>
          <div>
            <h2 className="text-xl font-bold" style={{ color: '#FFFFFF' }}>
              黑噗噗
            </h2>
            <p className="text-sm" style={{ color: '#FFFFFF' }}>
              讓我看看！
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleClearChat}
            className="p-2 rounded-xl transition-all hover:scale-110"
            style={{
              background: 'rgba(67, 56, 202, 0.3)',
              color: '#FFFFFF',
            }}
            title="清空對話"
          >
            🗑️
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-xl transition-all hover:scale-110"
            style={{
              background: 'rgba(67, 56, 202, 0.3)',
              color: '#FFFFFF',
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* 對話區域 */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 sm:space-y-4"
      >
        {chatState.messages.length === 0 && !isTyping && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="text-6xl mb-4">🌙</div>
            <h3 className="text-lg font-bold mb-2" style={{ color: '#FFFFFF' }}>
              歡迎使用黑噗噗知識查詢
            </h3>
            <p className="text-sm mb-6" style={{ color: '#FFFFFF' }}>
              我可以幫你在知識庫中查找相關記憶和資訊
            </p>
            <div
              className="text-left space-y-2 px-4 py-3 rounded-xl text-xs"
              style={{
                background: 'rgba(67, 56, 202, 0.2)',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                color: '#FFFFFF',
              }}
            >
              <p style={{ color: '#FFFFFF' }}>💡 試著問我：</p>
              <ul className="space-y-1 pl-4" style={{ color: '#FFFFFF' }}>
                <li>• 我有哪些關於學習的記憶？</li>
                <li>• 最近記錄了什麼想法？</li>
                <li>• 幫我找關於某個主題的筆記</li>
              </ul>
            </div>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {chatState.messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className="max-w-[80%] rounded-2xl px-4 py-3"
                style={
                  message.type === 'user'
                    ? {
                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.5) 0%, rgba(99, 102, 241, 0.4) 100%)',
                        color: '#FFFFFF',
                        border: '2px solid rgba(139, 92, 246, 0.4)',
                      }
                    : {
                        background: 'linear-gradient(135deg, rgba(67, 56, 202, 0.4) 0%, rgba(79, 70, 229, 0.3) 100%)',
                        color: '#FFFFFF',
                        border: '2px solid rgba(99, 102, 241, 0.3)',
                      }
                }
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#FFFFFF' }}>
                  {message.content || (
                    // 如果內容為空，顯示思考中動畫
                    <span className="inline-flex items-center gap-1" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      <span className="animate-bounce" style={{ animationDelay: '0ms' }}>思</span>
                      <span className="animate-bounce" style={{ animationDelay: '150ms' }}>考</span>
                      <span className="animate-bounce" style={{ animationDelay: '300ms' }}>中</span>
                      <span className="animate-bounce" style={{ animationDelay: '450ms' }}>.</span>
                      <span className="animate-bounce" style={{ animationDelay: '600ms' }}>.</span>
                      <span className="animate-bounce" style={{ animationDelay: '750ms' }}>.</span>
                    </span>
                  )}
                </p>
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-bold opacity-75" style={{ color: '#FFFFFF' }}>相關記憶:</p>
                    {message.attachments.map((attachment, idx) => (
                      <a
                        key={idx}
                        href={attachment.url}
                        className="block text-xs px-3 py-2 rounded-lg transition-all hover:scale-105"
                        style={{
                          background: 'rgba(139, 92, 246, 0.2)',
                          border: '1px solid rgba(139, 92, 246, 0.4)',
                          color: '#FFFFFF',
                        }}
                      >
                        📝 {attachment.name}
                      </a>
                    ))}
                  </div>
                )}
                <p
                  className="text-xs mt-2 opacity-60"
                  style={{ color: '#FFFFFF' }}
                >
                  {new Date(message.timestamp).toLocaleTimeString('zh-TW', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div
              className="rounded-2xl px-4 py-3"
              style={{
                background: 'linear-gradient(135deg, rgba(67, 56, 202, 0.4) 0%, rgba(79, 70, 229, 0.3) 100%)',
                border: '2px solid rgba(99, 102, 241, 0.3)',
              }}
            >
              <div className="flex gap-2">
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                  className="w-2 h-2 rounded-full"
                  style={{ background: '#FFFFFF' }}
                />
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                  className="w-2 h-2 rounded-full"
                  style={{ background: '#FFFFFF' }}
                />
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                  className="w-2 h-2 rounded-full"
                  style={{ background: '#FFFFFF' }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* 輸入區域 */}
      <div
        className="p-4 border-t"
        style={{
          background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.95) 0%, rgba(45, 42, 95, 0.95) 100%)',
          borderColor: 'rgba(139, 92, 246, 0.3)',
        }}
      >
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={chatState.inputText}
            onChange={(e) => setHijikiInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="問我知識庫裡的任何問題..."
            className="flex-1 px-4 py-3 rounded-xl resize-none focus:outline-none hijiki-input"
            style={{
              background: 'rgba(67, 56, 202, 0.2)',
              border: '2px solid rgba(139, 92, 246, 0.4)',
              color: '#FFFFFF',
              minHeight: '80px',
              maxHeight: '200px',
            }}
            rows={3}
            disabled={loading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!chatState.inputText.trim() || loading}
            className="px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)',
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </div>
        <p className="text-xs mt-2 opacity-60" style={{ color: '#FFFFFF' }}>
          💡 提示：我會在你的知識庫中搜尋相關記憶來回答問題
        </p>
      </div>
    </motion.div>
  )
}
