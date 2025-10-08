/**
 * ChatBubble - 對話氣泡組件
 * 用於 Tororo 和 Hijiki 的對話界面
 */

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

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
  currentCat: CatAgent | null
  onSendMessage: (message: string, catAgent: CatAgent) => void
  onSwitchCat: (catAgent: CatAgent) => void
  messages: ChatMessage[]
  isLoading?: boolean
  chatHistory?: ChatSession[]
  onLoadSession?: (sessionId: string) => void
  onDeleteSession?: (sessionId: string) => void
  onClearHistory?: () => void
}

export default function ChatBubble({
  currentCat,
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

  // 自動滾動到最新訊息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!inputMessage.trim() || !currentCat) return

    onSendMessage(inputMessage.trim(), currentCat)
    setInputMessage('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // 貓咪配置
  const catConfig = {
    tororo: {
      name: '小白',
      emoji: '☁️',
      color: '#FFFFFF',
      gradient: 'linear-gradient(135deg, #FFFFFF, #FFF8F0)',
      description: '知識園丁'
    },
    hijiki: {
      name: '小黑',
      emoji: '🌙',
      color: '#2C2C2C',
      gradient: 'linear-gradient(135deg, #4A4A4A, #2C2C2C)',
      description: '知識管理員'
    }
  }

  const activeCat = currentCat ? catConfig[currentCat] : null

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {!isExpanded ? (
          /* 收起狀態 - 浮動按鈕 */
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsExpanded(true)}
            className="rounded-full shadow-2xl cursor-pointer relative"
            style={{
              width: '70px',
              height: '70px',
              background: activeCat?.gradient || 'linear-gradient(135deg, #FFB3D9, #FF8FB3)',
              border: '4px solid white'
            }}
          >
            <div className="text-4xl">{activeCat?.emoji || '💬'}</div>
            {messages.length > 0 && (
              <div
                className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center"
              >
                {messages.filter(m => !m.isUser).length}
              </div>
            )}
          </motion.button>
        ) : (
          /* 展開狀態 - 對話窗口 */
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            className="bg-white rounded-3xl shadow-2xl overflow-hidden"
            style={{
              width: '400px',
              height: '600px',
              border: '4px solid #FFE5F0'
            }}
          >
            {/* 頭部 */}
            <div
              className="px-6 py-4 flex items-center justify-between"
              style={{
                background: activeCat?.gradient || 'linear-gradient(135deg, #FFB3D9, #FF8FB3)'
              }}
            >
              <div className="flex items-center gap-3">
                <div className="text-3xl">{activeCat?.emoji}</div>
                <div>
                  <div className="font-bold text-white text-lg">
                    {activeCat?.name || '貓咪管家'}
                  </div>
                  <div className="text-xs text-white opacity-90">
                    {activeCat?.description || '在線'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* 歷史紀錄按鈕 */}
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="p-2 rounded-full hover:bg-white/20 transition-colors relative"
                  title="查看歷史紀錄"
                >
                  <span className="text-xl">📜</span>
                  {chatHistory.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {chatHistory.length}
                    </span>
                  )}
                </button>

                {/* 切換貓咪 */}
                <button
                  onClick={() => onSwitchCat(currentCat === CatAgent.TORORO ? CatAgent.HIJIKI : CatAgent.TORORO)}
                  className="p-2 rounded-full hover:bg-white/20 transition-colors"
                  title={`切換到 ${currentCat === CatAgent.TORORO ? '小黑' : '小白'}`}
                >
                  <span className="text-xl">
                    {currentCat === CatAgent.TORORO ? '🌙' : '☁️'}
                  </span>
                </button>

                {/* 關閉按鈕 */}
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-2 rounded-full hover:bg-white/20 transition-colors text-white"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* 訊息區域 / 歷史紀錄 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ height: '440px' }}>
              {showHistory ? (
                /* 歷史紀錄視圖 */
                <ChatHistoryView
                  chatHistory={chatHistory}
                  onLoadSession={(sessionId) => {
                    onLoadSession?.(sessionId)
                    setShowHistory(false)
                  }}
                  onDeleteSession={onDeleteSession}
                  onClearHistory={onClearHistory}
                  catConfig={catConfig}
                />
              ) : (
                /* 對話視圖 */
                <>
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="text-6xl mb-4">{activeCat?.emoji}</div>
                      <p className="font-medium" style={{ color: '#FF8FB3' }}>
                        {currentCat === CatAgent.TORORO
                          ? '喵～今天想種下什麼新想法呢？'
                          : '喵。需要我幫你找什麼資訊嗎？'
                        }
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <MessageBubble key={msg.id} message={msg} catConfig={catConfig} />
                    ))
                  )}

                  {isLoading && (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gray-100 max-w-[80%]">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-sm text-gray-500">思考中...</span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* 輸入區域 */}
            <div className="p-4 border-t-2 border-pink-100">
              {/* 快速操作 */}
              <div className="flex gap-2 mb-3">
                {currentCat === CatAgent.TORORO ? (
                  <>
                    <QuickActionButton onClick={() => setInputMessage('我想記錄...')} emoji="📝">
                      記錄
                    </QuickActionButton>
                    <QuickActionButton onClick={() => setInputMessage('今天學到...')} emoji="📚">
                      學習
                    </QuickActionButton>
                    <QuickActionButton onClick={() => setInputMessage('突然想到...')} emoji="💡">
                      靈感
                    </QuickActionButton>
                  </>
                ) : (
                  <>
                    <QuickActionButton onClick={() => setInputMessage('找關於...的記憶')} emoji="🔍">
                      搜尋
                    </QuickActionButton>
                    <QuickActionButton onClick={() => setInputMessage('本月統計')} emoji="📊">
                      統計
                    </QuickActionButton>
                    <QuickActionButton onClick={() => setInputMessage('最近趨勢')} emoji="📈">
                      趨勢
                    </QuickActionButton>
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
                  placeholder={`跟 ${activeCat?.name} 說話...`}
                  className="flex-1 px-4 py-3 rounded-2xl border-3 focus:outline-none transition-all"
                  style={{
                    border: '3px solid #FFE5F0',
                    background: 'white'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#FFB3D9'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#FFE5F0'}
                />
                <button
                  onClick={handleSend}
                  disabled={!inputMessage.trim() || isLoading}
                  className="px-6 py-3 rounded-2xl font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: 'linear-gradient(135deg, #FFB3D9, #FF8FB3)',
                    color: 'white',
                    boxShadow: '0 4px 15px rgba(255, 179, 217, 0.4)'
                  }}
                >
                  傳送
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============ 子組件 ============

interface MessageBubbleProps {
  message: ChatMessage
  catConfig: any
}

function MessageBubble({ message, catConfig }: MessageBubbleProps) {
  const isUser = message.isUser
  const cat = message.catAgent ? catConfig[message.catAgent] : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`flex gap-2 max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* 頭像 */}
        {!isUser && (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
            style={{
              background: cat?.gradient || 'linear-gradient(135deg, #FFB3D9, #FF8FB3)'
            }}
          >
            {cat?.emoji}
          </div>
        )}

        {/* 訊息泡泡 */}
        <div
          className="px-4 py-3 rounded-2xl select-text"
          style={isUser ? {
            background: 'linear-gradient(135deg, #FFB3D9, #FF8FB3)',
            color: 'white',
            userSelect: 'text',
            WebkitUserSelect: 'text',
            MozUserSelect: 'text',
            msUserSelect: 'text'
          } : {
            background: '#F8F8F8',
            color: '#333',
            userSelect: 'text',
            WebkitUserSelect: 'text',
            MozUserSelect: 'text',
            msUserSelect: 'text'
          }}
        >
          <p className="text-sm whitespace-pre-wrap select-text" style={{ userSelect: 'text' }}>{message.message}</p>
          <p className="text-xs mt-1 opacity-70 select-text" style={{ userSelect: 'text' }}>
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
}

function QuickActionButton({ onClick, emoji, children }: QuickActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105"
      style={{
        background: 'linear-gradient(135deg, #FFFACD, #FFF5E1)',
        color: '#FF8FB3',
        border: '2px solid #FFE5F0'
      }}
    >
      <span className="mr-1">{emoji}</span>
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
  catConfig: any
}

function ChatHistoryView({
  chatHistory,
  onLoadSession,
  onDeleteSession,
  onClearHistory,
  catConfig
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
        <h3 className="font-bold text-lg" style={{ color: '#FF8FB3' }}>
          📜 對話紀錄
        </h3>
        {chatHistory.length > 0 && (
          <button
            onClick={() => {
              if (window.confirm('確定要清空所有歷史紀錄嗎？')) {
                onClearHistory?.()
              }
            }}
            className="text-xs text-gray-500 hover:text-red-500 transition-colors"
          >
            清空全部
          </button>
        )}
      </div>

      {/* 歷史列表 */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {chatHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-sm text-gray-400">還沒有歷史對話</p>
          </div>
        ) : (
          chatHistory.map((session) => {
            const cat = catConfig[session.catAgent]
            return (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-gradient-to-r from-pink-50 to-white rounded-2xl p-3 hover:shadow-md transition-all cursor-pointer border-2 border-pink-100"
                onClick={() => onLoadSession?.(session.id)}
              >
                <div className="flex items-start gap-3">
                  {/* 貓咪頭像 */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: cat.gradient }}
                  >
                    {cat.emoji}
                  </div>

                  {/* 對話資訊 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm" style={{ color: '#FF8FB3' }}>
                        與 {cat.name} 的對話
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDate(session.startTime)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 truncate">
                      {getSessionPreview(session)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-400">
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
                    className={`px-2 py-1 rounded-lg text-xs transition-all ${
                      confirmDelete === session.id
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-500'
                    }`}
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
