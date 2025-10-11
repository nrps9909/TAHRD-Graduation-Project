/**
 * ChatBubble - 對話氣泡組件
 * 動物森友會風格 - 白噗噗(白天) & 黑噗噗(夜晚)
 */

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'

export enum CatAgent {
  TORORO = 'tororo',
  HIJIKI = 'hijiki'
}

export interface ChatMessage {
  id: string
  catAgent: CatAgent
  message: string
  timestamp: Date
  isUser: boolean
}

export interface ChatSession {
  id: string
  catAgent: CatAgent
  messages: ChatMessage[]
  startTime: Date
  endTime?: Date
}

interface ChatBubbleProps {
  currentCat?: CatAgent
  onSendMessage: (message: string, catAgent: CatAgent) => void
  onSwitchCat: (catAgent: CatAgent) => void
  messages: ChatMessage[]
  isLoading?: boolean
  chatHistory?: ChatSession[]
  onLoadSession?: (sessionId: string) => void
  onDeleteSession?: (sessionId: string) => void
  onClearHistory?: () => void
}

// 動物森友會風格配色
const AC_COLORS = {
  tororo: {
    // 白天模式 - 溫暖黃色系
    name: '白噗噗',
    emoji: '☁️',
    description: '知識園丁',
    // 主背景
    background: 'linear-gradient(135deg, rgba(255, 248, 231, 0.95) 0%, rgba(255, 243, 224, 0.95) 100%)',
    backdropFilter: 'blur(24px) saturate(180%)',
    border: '3px solid rgba(251, 191, 36, 0.4)',
    boxShadow: '0 8px 32px 0 rgba(251, 191, 36, 0.3), inset 0 1px 0 0 rgba(255, 255, 255, 0.8)',
    // 頭部
    headerBg: 'linear-gradient(135deg, rgba(251, 191, 36, 0.4) 0%, rgba(245, 158, 11, 0.3) 100%)',
    headerText: '#8B5C2E',
    headerTextSecondary: '#A67C52',
    // 訊息氣泡
    userBubbleBg: 'linear-gradient(135deg, rgba(251, 191, 36, 0.5) 0%, rgba(245, 158, 11, 0.4) 100%)',
    userBubbleText: '#5D3A1A',
    catBubbleBg: 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(254, 252, 247, 0.7) 100%)',
    catBubbleText: '#5D3A1A',
    // 按鈕
    buttonBg: 'linear-gradient(135deg, rgba(251, 191, 36, 0.3) 0%, rgba(245, 158, 11, 0.25) 100%)',
    buttonHoverBg: 'linear-gradient(135deg, rgba(251, 191, 36, 0.5) 0%, rgba(245, 158, 11, 0.4) 100%)',
    buttonText: '#8B5C2E',
    // 輸入框
    inputBorder: 'rgba(251, 191, 36, 0.4)',
    inputFocusBorder: 'rgba(245, 158, 11, 0.6)',
    inputBg: 'rgba(255, 255, 255, 0.9)',
    // 分隔線
    divider: 'linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.3), transparent)',
  },
  hijiki: {
    // 夜間模式 - 紫藍色系
    name: '黑噗噗',
    emoji: '🌙',
    description: '知識管理員',
    // 主背景
    background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.95) 0%, rgba(45, 42, 95, 0.95) 100%)',
    backdropFilter: 'blur(24px) saturate(180%)',
    border: '3px solid rgba(139, 92, 246, 0.4)',
    boxShadow: '0 8px 32px 0 rgba(139, 92, 246, 0.3), inset 0 1px 0 0 rgba(167, 139, 250, 0.3)',
    // 頭部
    headerBg: 'linear-gradient(135deg, rgba(139, 92, 246, 0.4) 0%, rgba(99, 102, 241, 0.3) 100%)',
    headerText: '#E0E7FF',
    headerTextSecondary: '#C7D2FE',
    // 訊息氣泡
    userBubbleBg: 'linear-gradient(135deg, rgba(139, 92, 246, 0.5) 0%, rgba(99, 102, 241, 0.4) 100%)',
    userBubbleText: '#E0E7FF',
    catBubbleBg: 'linear-gradient(135deg, rgba(67, 56, 202, 0.4) 0%, rgba(79, 70, 229, 0.3) 100%)',
    catBubbleText: '#E0E7FF',
    // 按鈕
    buttonBg: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(99, 102, 241, 0.25) 100%)',
    buttonHoverBg: 'linear-gradient(135deg, rgba(139, 92, 246, 0.5) 0%, rgba(99, 102, 241, 0.4) 100%)',
    buttonText: '#E0E7FF',
    // 輸入框
    inputBorder: 'rgba(139, 92, 246, 0.4)',
    inputFocusBorder: 'rgba(99, 102, 241, 0.6)',
    inputBg: 'rgba(67, 56, 202, 0.2)',
    // 分隔線
    divider: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.4), transparent)',
  }
}

export default function ChatBubble({
  currentCat = CatAgent.TORORO,
  onSendMessage,
  onSwitchCat,
  messages,
  isLoading = false,
  chatHistory = [],
  onLoadSession,
  onDeleteSession,
  onClearHistory
}: ChatBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [inputMessage, setInputMessage] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const theme = AC_COLORS[currentCat]

  // 自動滾動到最新訊息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!inputMessage.trim()) return
    onSendMessage(inputMessage.trim(), currentCat)
    setInputMessage('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {!isExpanded ? (
          /* 收起狀態 - 動森風格浮動按鈕 */
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsExpanded(true)}
            className="rounded-full shadow-2xl cursor-pointer relative"
            style={{
              width: '80px',
              height: '80px',
              background: theme.headerBg,
              border: theme.border,
              boxShadow: theme.boxShadow,
            }}
          >
            <div className="text-4xl">{theme.emoji}</div>
            {messages.length > 0 && (
              <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  background: currentCat === CatAgent.TORORO
                    ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.9) 0%, rgba(220, 38, 38, 0.9) 100%)'
                    : 'linear-gradient(135deg, rgba(139, 92, 246, 0.9) 0%, rgba(99, 102, 241, 0.9) 100%)',
                  color: '#FFF',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                }}
              >
                {messages.filter(m => !m.isUser).length}
              </div>
            )}
          </motion.button>
        ) : (
          /* 展開狀態 - 動森風格對話窗口 */
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative overflow-hidden rounded-3xl shadow-2xl"
            style={{
              width: '420px',
              height: '650px',
              background: theme.background,
              backdropFilter: theme.backdropFilter,
              WebkitBackdropFilter: theme.backdropFilter,
              border: theme.border,
              boxShadow: theme.boxShadow,
            }}
          >
            {/* 裝飾漸層 */}
            <div
              className="absolute inset-0 rounded-3xl pointer-events-none"
              style={{
                background: currentCat === CatAgent.TORORO
                  ? 'linear-gradient(to bottom, rgba(255, 255, 255, 0.3) 0%, transparent 40%, rgba(251, 191, 36, 0.05) 100%)'
                  : 'linear-gradient(to bottom, rgba(167, 139, 250, 0.2) 0%, transparent 40%, rgba(139, 92, 246, 0.05) 100%)'
              }}
            />

            {/* 頭部 - 動森風格 */}
            <div
              className="relative px-6 py-5 flex items-center justify-between rounded-t-3xl"
              style={{
                background: theme.headerBg,
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.05)'
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                  style={{
                    background: currentCat === CatAgent.TORORO
                      ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.6) 0%, rgba(254, 252, 247, 0.5) 100%)'
                      : 'linear-gradient(135deg, rgba(67, 56, 202, 0.5) 0%, rgba(79, 70, 229, 0.4) 100%)',
                    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  {theme.emoji}
                </div>
                <div>
                  <div className="font-black text-xl" style={{ color: theme.headerText, textShadow: currentCat === CatAgent.TORORO ? '0 1px 2px rgba(255, 255, 255, 0.8)' : '0 1px 2px rgba(0, 0, 0, 0.3)' }}>
                    {theme.name}
                  </div>
                  <div className="text-sm font-semibold" style={{ color: theme.headerTextSecondary }}>
                    {theme.description}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* 歷史記錄 */}
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all hover:scale-110 active:scale-95 relative"
                  style={{
                    background: theme.buttonBg,
                    boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)'
                  }}
                  title="查看歷史紀錄"
                >
                  <span>📜</span>
                  {chatHistory.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{
                        background: currentCat === CatAgent.TORORO ? '#EF4444' : '#8B5CF6',
                        color: '#FFF'
                      }}
                    >
                      {chatHistory.length}
                    </span>
                  )}
                </button>

                {/* 切換貓咪 */}
                <button
                  onClick={() => onSwitchCat(currentCat === CatAgent.TORORO ? CatAgent.HIJIKI : CatAgent.TORORO)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all hover:scale-110 active:scale-95"
                  style={{
                    background: theme.buttonBg,
                    boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)'
                  }}
                  title={`切換到 ${currentCat === CatAgent.TORORO ? '黑噗噗' : '白噗噗'}`}
                >
                  <span>{currentCat === CatAgent.TORORO ? '🌙' : '☁️'}</span>
                </button>

                {/* 關閉按鈕 */}
                <button
                  onClick={() => setIsExpanded(false)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-all hover:scale-110 active:scale-95"
                  style={{
                    background: theme.buttonBg,
                    color: theme.headerText,
                    boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* 分隔線 */}
            <div className="h-[2px] rounded-full" style={{ background: theme.divider }} />

            {/* 訊息區域 */}
            <div className="relative overflow-y-auto p-5 space-y-3" style={{ height: '470px' }}>
              {showHistory ? (
                <ChatHistoryView
                  chatHistory={chatHistory}
                  onLoadSession={(sessionId) => {
                    onLoadSession?.(sessionId)
                    setShowHistory(false)
                  }}
                  onDeleteSession={onDeleteSession}
                  onClearHistory={onClearHistory}
                  theme={theme}
                  currentCat={currentCat}
                />
              ) : (
                <>
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="text-7xl mb-4">{theme.emoji}</div>
                      <p className="font-bold text-lg" style={{ color: theme.headerText }}>
                        {currentCat === CatAgent.TORORO
                          ? '喵～今天想種下什麼新想法呢？'
                          : '喵。需要我幫你找什麼資訊嗎？'
                        }
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <MessageBubble key={msg.id} message={msg} theme={theme} currentCat={currentCat} />
                    ))
                  )}

                  {isLoading && (
                    <ThinkingIndicator theme={theme} currentCat={currentCat} />
                  )}

                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* 分隔線 */}
            <div className="h-[2px] rounded-full" style={{ background: theme.divider }} />

            {/* 輸入區域 - 動森風格 */}
            <div className="relative p-5">
              {/* 快速操作按鈕 */}
              <div className="flex gap-2 mb-3">
                {currentCat === CatAgent.TORORO ? (
                  <>
                    <QuickActionButton onClick={() => setInputMessage('我想記錄...')} emoji="📝" theme={theme}>記錄</QuickActionButton>
                    <QuickActionButton onClick={() => setInputMessage('今天學到...')} emoji="📚" theme={theme}>學習</QuickActionButton>
                    <QuickActionButton onClick={() => setInputMessage('突然想到...')} emoji="💡" theme={theme}>靈感</QuickActionButton>
                  </>
                ) : (
                  <>
                    <QuickActionButton onClick={() => setInputMessage('找關於...的記憶')} emoji="🔍" theme={theme}>搜尋</QuickActionButton>
                    <QuickActionButton onClick={() => setInputMessage('本月統計')} emoji="📊" theme={theme}>統計</QuickActionButton>
                    <QuickActionButton onClick={() => setInputMessage('最近趨勢')} emoji="📈" theme={theme}>趨勢</QuickActionButton>
                  </>
                )}
              </div>

              {/* 輸入框 */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={`跟 ${theme.name} 說話...`}
                  className="flex-1 px-4 py-3 rounded-2xl font-medium text-sm focus:outline-none transition-all placeholder-opacity-60"
                  style={{
                    border: `3px solid ${theme.inputBorder}`,
                    background: theme.inputBg,
                    color: theme.headerText,
                    boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.05)'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = theme.inputFocusBorder}
                  onBlur={(e) => e.currentTarget.style.borderColor = theme.inputBorder}
                />
                <button
                  onClick={handleSend}
                  disabled={!inputMessage.trim() || isLoading}
                  className="px-6 py-3 rounded-2xl font-bold text-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: theme.headerBg,
                    color: theme.headerText,
                    boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
                    textShadow: currentCat === CatAgent.TORORO ? '0 1px 1px rgba(255, 255, 255, 0.5)' : '0 1px 1px rgba(0, 0, 0, 0.3)'
                  }}
                >
                  傳送
                </button>
              </div>
            </div>

            {/* 底部裝飾光暈 */}
            <div
              className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none rounded-b-3xl"
              style={{
                background: currentCat === CatAgent.TORORO
                  ? 'linear-gradient(to top, rgba(251, 191, 36, 0.15), transparent)'
                  : 'linear-gradient(to top, rgba(139, 92, 246, 0.2), transparent)'
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============ 子組件 ============

// 思考指示器組件（帶計時器）
interface ThinkingIndicatorProps {
  theme: typeof AC_COLORS.tororo
  currentCat: CatAgent
}

function ThinkingIndicator({ theme, currentCat }: ThinkingIndicatorProps) {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(s => s + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2"
    >
      {/* 貓咪頭像 */}
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
        style={{
          background: currentCat === CatAgent.TORORO
            ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.3) 0%, rgba(245, 158, 11, 0.25) 100%)'
            : 'linear-gradient(135deg, rgba(139, 92, 246, 0.4) 0%, rgba(99, 102, 241, 0.3) 100%)',
          boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)'
        }}
      >
        {theme.emoji}
      </div>

      {/* 思考泡泡 */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-2xl max-w-[80%]"
        style={{
          background: theme.catBubbleBg,
          boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)'
        }}
      >
        <div className="flex gap-1">
          <span
            className="w-2 h-2 rounded-full animate-bounce"
            style={{ background: theme.buttonText, animationDelay: '0ms' }}
          />
          <span
            className="w-2 h-2 rounded-full animate-bounce"
            style={{ background: theme.buttonText, animationDelay: '150ms' }}
          />
          <span
            className="w-2 h-2 rounded-full animate-bounce"
            style={{ background: theme.buttonText, animationDelay: '300ms' }}
          />
        </div>
        <span className="text-sm font-semibold" style={{ color: theme.catBubbleText }}>
          思考中...
        </span>
        <span
          className="text-xs font-bold px-2 py-1 rounded-full"
          style={{
            background: currentCat === CatAgent.TORORO
              ? 'rgba(251, 191, 36, 0.2)'
              : 'rgba(139, 92, 246, 0.3)',
            color: theme.buttonText
          }}
        >
          {seconds}秒
        </span>
      </div>
    </motion.div>
  )
}

interface MessageBubbleProps {
  message: ChatMessage
  theme: typeof AC_COLORS.tororo
  currentCat: CatAgent
}

function MessageBubble({ message, theme, currentCat }: MessageBubbleProps) {
  const isUser = message.isUser

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`flex gap-2 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* 頭像 */}
        {!isUser && (
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
            style={{
              background: currentCat === CatAgent.TORORO
                ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.3) 0%, rgba(245, 158, 11, 0.25) 100%)'
                : 'linear-gradient(135deg, rgba(139, 92, 246, 0.4) 0%, rgba(99, 102, 241, 0.3) 100%)',
              boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)'
            }}
          >
            {theme.emoji}
          </div>
        )}

        {/* 訊息泡泡 */}
        <div
          className="px-4 py-3 rounded-2xl select-text"
          style={{
            background: isUser ? theme.userBubbleBg : theme.catBubbleBg,
            color: isUser ? theme.userBubbleText : theme.catBubbleText,
            boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
            userSelect: 'text',
            WebkitUserSelect: 'text',
            textShadow: currentCat === CatAgent.TORORO && isUser ? '0 1px 1px rgba(255, 255, 255, 0.5)' : 'none'
          }}
        >
          <div className="text-sm font-medium select-text leading-relaxed prose prose-sm max-w-none"
            style={{ color: isUser ? theme.userBubbleText : theme.catBubbleText }}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSanitize]}
              components={{
                // 自訂樣式以符合主題
                p: ({ children }) => (
                  <p className="mb-2 last:mb-0" style={{ color: isUser ? theme.userBubbleText : theme.catBubbleText }}>
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc ml-4 mb-2" style={{ color: isUser ? theme.userBubbleText : theme.catBubbleText }}>
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal ml-4 mb-2" style={{ color: isUser ? theme.userBubbleText : theme.catBubbleText }}>
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="mb-1" style={{ color: isUser ? theme.userBubbleText : theme.catBubbleText }}>
                    {children}
                  </li>
                ),
                strong: ({ children }) => (
                  <strong className="font-bold" style={{ color: isUser ? theme.userBubbleText : theme.catBubbleText }}>
                    {children}
                  </strong>
                ),
                em: ({ children }) => (
                  <em className="italic" style={{ color: isUser ? theme.userBubbleText : theme.catBubbleText }}>
                    {children}
                  </em>
                ),
                code: ({ children }) => (
                  <code
                    className="px-1.5 py-0.5 rounded text-xs font-mono"
                    style={{
                      background: currentCat === CatAgent.TORORO
                        ? 'rgba(251, 191, 36, 0.2)'
                        : 'rgba(139, 92, 246, 0.2)',
                      color: isUser ? theme.userBubbleText : theme.catBubbleText
                    }}
                  >
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre
                    className="p-3 rounded-lg overflow-x-auto text-xs font-mono my-2"
                    style={{
                      background: currentCat === CatAgent.TORORO
                        ? 'rgba(251, 191, 36, 0.15)'
                        : 'rgba(139, 92, 246, 0.15)',
                      color: isUser ? theme.userBubbleText : theme.catBubbleText
                    }}
                  >
                    {children}
                  </pre>
                ),
                blockquote: ({ children }) => (
                  <blockquote
                    className="border-l-4 pl-3 py-1 my-2"
                    style={{
                      borderColor: currentCat === CatAgent.TORORO
                        ? 'rgba(251, 191, 36, 0.5)'
                        : 'rgba(139, 92, 246, 0.5)',
                      color: isUser ? theme.userBubbleText : theme.catBubbleText
                    }}
                  >
                    {children}
                  </blockquote>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:opacity-80 transition-opacity"
                    style={{ color: isUser ? theme.userBubbleText : theme.catBubbleText }}
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {message.message}
            </ReactMarkdown>
          </div>
          <p className="text-xs mt-2 opacity-70 select-text font-semibold">
            {message.timestamp.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

interface QuickActionButtonProps {
  onClick: () => void
  emoji: string
  children: React.ReactNode
  theme: typeof AC_COLORS.tororo
}

function QuickActionButton({ onClick, emoji, children, theme }: QuickActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-2 rounded-full text-xs font-bold transition-all hover:scale-105 active:scale-95"
      style={{
        background: theme.buttonBg,
        color: theme.buttonText,
        boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)'
      }}
    >
      <span className="mr-1.5">{emoji}</span>
      {children}
    </button>
  )
}

// ============ 歷史紀錄視圖組件 ============

interface ChatHistoryViewProps {
  chatHistory: ChatSession[]
  onLoadSession?: (sessionId: string) => void
  onDeleteSession?: (sessionId: string) => void
  onClearHistory?: () => void
  theme: typeof AC_COLORS.tororo
  currentCat: CatAgent
}

function ChatHistoryView({
  chatHistory,
  onLoadSession,
  onDeleteSession,
  onClearHistory,
  theme
}: ChatHistoryViewProps) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const formatDate = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '剛剛'
    if (minutes < 60) return `${minutes} 分鐘前`
    if (hours < 24) return `${hours} 小時前`
    if (days < 7) return `${days} 天前`
    return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
  }

  const getSessionPreview = (session: ChatSession) => {
    const userMessages = session.messages.filter(m => m.isUser)
    if (userMessages.length === 0) return '空白對話'
    return userMessages[0].message.substring(0, 30) + (userMessages[0].message.length > 30 ? '...' : '')
  }

  return (
    <div className="h-full flex flex-col">
      {/* 頭部 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-black text-lg" style={{ color: theme.headerText }}>
          📜 對話紀錄
        </h3>
        {chatHistory.length > 0 && (
          <button
            onClick={() => {
              if (window.confirm('確定要清空所有歷史紀錄嗎？')) {
                onClearHistory?.()
              }
            }}
            className="text-xs font-bold px-3 py-1.5 rounded-full transition-all hover:scale-105"
            style={{
              background: theme.buttonBg,
              color: theme.buttonText
            }}
          >
            清空全部
          </button>
        )}
      </div>

      {/* 歷史列表 */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {chatHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-5xl mb-3">📭</div>
            <p className="text-sm font-semibold" style={{ color: theme.headerTextSecondary }}>還沒有歷史對話</p>
          </div>
        ) : (
          chatHistory.map((session) => {
            const cat = AC_COLORS[session.catAgent]
            return (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="rounded-2xl p-3 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                onClick={() => onLoadSession?.(session.id)}
                style={{
                  background: theme.catBubbleBg,
                  boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)'
                }}
              >
                <div className="flex items-start gap-3">
                  {/* 貓咪頭像 */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{
                      background: cat.headerBg,
                      boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)'
                    }}
                  >
                    {cat.emoji}
                  </div>

                  {/* 對話資訊 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm" style={{ color: theme.headerText }}>
                        與 {cat.name} 的對話
                      </span>
                      <span className="text-xs font-semibold" style={{ color: theme.headerTextSecondary }}>
                        {formatDate(session.startTime)}
                      </span>
                    </div>
                    <p className="text-xs font-medium truncate" style={{ color: theme.catBubbleText }}>
                      {getSessionPreview(session)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs font-semibold" style={{ color: theme.headerTextSecondary }}>
                        💬 {session.messages.length} 則訊息
                      </span>
                    </div>
                  </div>

                  {/* 刪除按鈕 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirmDelete === session.id) {
                        onDeleteSession?.(session.id)
                        setConfirmDelete(null)
                      } else {
                        setConfirmDelete(session.id)
                        setTimeout(() => setConfirmDelete(null), 3000)
                      }
                    }}
                    className="px-2 py-1 rounded-lg text-xs font-bold transition-all hover:scale-110"
                    style={confirmDelete === session.id ? {
                      background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.9) 0%, rgba(220, 38, 38, 0.9) 100%)',
                      color: '#FFF'
                    } : {
                      background: theme.buttonBg,
                      color: theme.buttonText
                    }}
                  >
                    {confirmDelete === session.id ? '確定?' : '🗑️'}
                  </button>
                </div>
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}
