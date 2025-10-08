import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation } from '@apollo/client'
import { CREATE_MEMORY } from '../graphql/memory'

interface QuickInputBarProps {
  onMemoryCreated?: () => void
}

export default function QuickInputBar({ onMemoryCreated }: QuickInputBarProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [input, setInput] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const [createMemory] = useMutation(CREATE_MEMORY, {
    onCompleted: () => {
      setInput('')
      setIsExpanded(false)
      onMemoryCreated?.()
    },
    onError: (error) => {
      console.error('建立記憶失敗:', error)
    }
  })

  // 自動聚焦
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isExpanded])

  // 快捷鍵支援 (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsExpanded(true)
      }
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isExpanded])

  const handleSubmit = async () => {
    if (!input.trim() || isUploading) return

    setIsUploading(true)
    try {
      await createMemory({
        variables: {
          input: {
            title: input.slice(0, 50), // 取前50字作為標題
            content: input,
            contentType: 'TEXT',
            importance: 5
          }
        }
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <>
      {/* 快速輸入按鈕 - 底部中央 */}
      <AnimatePresence>
        {!isExpanded && (
          <motion.button
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            onClick={() => setIsExpanded(true)}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 group"
          >
            <div className="relative">
              {/* 主按鈕 */}
              <div className="px-8 py-4 rounded-full backdrop-blur-xl bg-gradient-to-r from-pink-500/90 to-yellow-500/90 border border-white/30 shadow-2xl transition-all group-hover:shadow-pink-500/50 group-hover:scale-105">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💭</span>
                  <span className="text-white font-bold text-lg">快速記錄想法...</span>
                  <span className="text-white/60 text-sm">(⌘K)</span>
                </div>
              </div>

              {/* 脈衝動畫 */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-400 to-yellow-400 opacity-0 group-hover:opacity-20 blur-xl transition-opacity" />
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* 展開的輸入框 */}
      <AnimatePresence>
        {isExpanded && (
          <>
            {/* 背景遮罩 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
              onClick={() => setIsExpanded(false)}
            />

            {/* 輸入卡片 */}
            <motion.div
              initial={{ y: 100, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 100, opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-3xl px-4"
            >
              <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-pink-200/50 overflow-hidden">
                {/* 標題區 */}
                <div className="bg-gradient-to-r from-pink-500 to-yellow-500 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">✨</span>
                    <div>
                      <h3 className="text-white font-black text-lg">快速記錄</h3>
                      <p className="text-white/80 text-xs">隨時記錄你的想法和靈感</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all"
                  >
                    ✕
                  </button>
                </div>

                {/* 輸入區 */}
                <div className="p-6">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="輸入任何想法、筆記、靈感... 按下 Cmd/Ctrl + Enter 送出"
                    className="w-full h-40 px-4 py-3 rounded-2xl border-2 border-pink-200 focus:border-pink-400 focus:outline-none resize-none text-gray-700 placeholder-gray-400"
                  />

                  {/* 快捷提示標籤 */}
                  <div className="flex items-center gap-2 mt-4 flex-wrap">
                    <button
                      onClick={() => setInput(input + '💡 ')}
                      className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-sm font-medium hover:bg-yellow-200 transition-all"
                    >
                      💡 靈感
                    </button>
                    <button
                      onClick={() => setInput(input + '📝 ')}
                      className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium hover:bg-blue-200 transition-all"
                    >
                      📝 筆記
                    </button>
                    <button
                      onClick={() => setInput(input + '🎯 ')}
                      className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium hover:bg-green-200 transition-all"
                    >
                      🎯 目標
                    </button>
                    <button
                      onClick={() => setInput(input + '❓ ')}
                      className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm font-medium hover:bg-purple-200 transition-all"
                    >
                      ❓ 問題
                    </button>
                    <button
                      onClick={() => setInput(input + '📚 ')}
                      className="px-3 py-1 rounded-full bg-pink-100 text-pink-700 text-sm font-medium hover:bg-pink-200 transition-all"
                    >
                      📚 學習
                    </button>
                  </div>

                  {/* 操作按鈕 */}
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-gray-500">
                      💡 小提示：使用 <kbd className="px-2 py-1 bg-gray-100 rounded">⌘K</kbd> 快速開啟
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setIsExpanded(false)}
                        className="px-6 py-2 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-all"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={!input.trim() || isUploading}
                        className="px-6 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-yellow-500 text-white font-bold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {isUploading ? (
                          <span className="flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            儲存中...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            ✨ 立即儲存
                            <span className="text-white/60 text-xs">(⌘↵)</span>
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
