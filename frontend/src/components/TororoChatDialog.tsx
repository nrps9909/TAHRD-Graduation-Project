/**
 * 白噗噗對話介面 - 互動式設計
 * 像是真正在和貓咪對話，並且可以上傳知識
 */

import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@apollo/client'
import { GET_CHIEF_ASSISTANT } from '../graphql/knowledge'
import { useSound } from '../hooks/useSound'
import { useSSEChat } from '../hooks/useSSEChat'
import { motion, AnimatePresence } from 'framer-motion'
import { Z_INDEX_CLASSES } from '../constants/zIndex'
import { API_ENDPOINTS } from '../config/api'
import axios from 'axios'
import { useAuthStore } from '../stores/authStore'
import { Live2DDisplay } from './Live2DDisplay'

interface TororoChatDialogProps {
  onClose: () => void
}

interface ChatItem {
  id: string
  type: 'user' | 'tororo'
  content: string
  files?: Array<{
    name: string
    url: string
    type: string
  }>
  timestamp: Date
  isComplete?: boolean  // 標記訊息是否完成（用於分段泡泡）
}

interface UploadedFile {
  id: string
  name: string
  url: string
  type: string
  size: number
  status: 'uploading' | 'completed' | 'error'
  progress: number
}

export const TororoChatDialog: React.FC<TororoChatDialogProps> = ({ onClose }) => {
  const [inputText, setInputText] = useState('')
  const [chatHistory, setChatHistory] = useState<ChatItem[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])

  const { uploadKnowledge: uploadKnowledgeSSE } = useSSEChat()
  useQuery(GET_CHIEF_ASSISTANT) // Load chief assistant data
  const { play, playRandomMeow } = useSound()
  const { token } = useAuthStore()

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // 自動聚焦輸入框
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // 自動滾動到最新訊息
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  // 自動調整輸入框高度
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px'
    }
  }, [inputText])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    play('notification')

    // 1️⃣ 先創建所有文件的初始狀態（立即顯示在 UI）
    const newFiles = Array.from(files).map(file => ({
      id: `file-${Date.now()}-${Math.random()}`,
      name: file.name,
      url: '',
      type: file.type,
      size: file.size,
      status: 'uploading' as const,
      progress: 0
    }))

    // 2️⃣ 一次性添加所有文件到狀態
    setUploadedFiles(prev => [...prev, ...newFiles])

    // 3️⃣ 並發上傳所有文件（像 Discord 一樣）
    const uploadPromises = Array.from(files).map(async (file, index) => {
      const fileId = newFiles[index].id

      try {
        // 上傳到 Cloudinary
        const formData = new FormData()
        formData.append('file', file)

        const response = await axios.post(API_ENDPOINTS.UPLOAD_SINGLE, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          },
          onUploadProgress: (progressEvent: { loaded: number; total?: number }) => {
            const progress = progressEvent.total
              ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
              : 0

            setUploadedFiles(prev =>
              prev.map(f =>
                f.id === fileId ? { ...f, progress } : f
              )
            )
          }
        })

        setUploadedFiles(prev =>
          prev.map(f =>
            f.id === fileId
              ? { ...f, url: response.data.url, status: 'completed' as const }
              : f
          )
        )

        play('upload_success')
      } catch (error) {
        console.error('檔案上傳失敗:', error)
        setUploadedFiles(prev =>
          prev.map(f =>
            f.id === fileId ? { ...f, status: 'error' as const } : f
          )
        )
      }
    })

    // 4️⃣ 等待所有上傳完成（Promise.allSettled 允許部分失敗）
    await Promise.allSettled(uploadPromises)

    // 清空 input
    e.target.value = ''
  }

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
    play('button_click')
  }

  const handleSubmit = async () => {
    if (!inputText.trim() && uploadedFiles.length === 0) return

    const userContent = inputText.trim() || '上傳了檔案'
    const completedFiles = uploadedFiles.filter(f => f.status === 'completed')

    play('message_sent')

    // 添加用戶訊息到聊天記錄
    const userMessage: ChatItem = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: userContent,
      files: completedFiles.map(f => ({
        name: f.name,
        url: f.url,
        type: f.type
      })),
      timestamp: new Date()
    }

    setChatHistory(prev => [...prev, userMessage])

    // 立即清空輸入，讓用戶可以繼續輸入下一個（像 IG 一樣）
    setInputText('')
    setUploadedFiles([])

    // 創建第一個白噗噗訊息用於顯示打字機效果
    let currentMessageId = `tororo-${Date.now()}`
    const tororoMessage: ChatItem = {
      id: currentMessageId,
      type: 'tororo',
      content: '',
      timestamp: new Date(),
      isComplete: false
    }
    setChatHistory(prev => [...prev, tororoMessage])

    // 在背景處理，不阻塞用戶輸入（非阻塞式）
    ;(async () => {
      try {
      const contentTypeValue = completedFiles.some(f => f.type.startsWith('image/'))
        ? 'IMAGE'
        : completedFiles.some(f => f.type.includes('pdf'))
        ? 'DOCUMENT'
        : 'TEXT'

      let accumulatedResponse = ''

      await new Promise<void>((resolve, reject) => {
        uploadKnowledgeSSE({
          content: userContent,
          files: completedFiles.map(f => ({
            url: f.url,
            name: f.name,
            type: f.type
          })),
          contentType: contentTypeValue
        }, {
          onChunk: (chunk) => {
            // 累積回應文字並顯示打字機效果
            accumulatedResponse += chunk
            setChatHistory(prev =>
              prev.map(msg =>
                msg.id === currentMessageId
                  ? { ...msg, content: accumulatedResponse }
                  : msg
              )
            )
          },
          onSentenceComplete: () => {
            // 句子完成，標記當前泡泡為完成並創建新泡泡
            setChatHistory(prev =>
              prev.map(msg =>
                msg.id === currentMessageId
                  ? { ...msg, isComplete: true }
                  : msg
              )
            )

            // 重置累積文字，創建新泡泡
            accumulatedResponse = ''
            currentMessageId = `tororo-${Date.now()}-${Math.random()}`

            setChatHistory(prev => [
              ...prev,
              {
                id: currentMessageId,
                type: 'tororo' as const,
                content: '',
                timestamp: new Date(),
                isComplete: false
              }
            ])
          },
          onComplete: () => {
            // 標記最後一個泡泡為完成，並移除空白泡泡
            setChatHistory(prev =>
              prev
                .map(msg =>
                  msg.id === currentMessageId
                    ? { ...msg, isComplete: true }
                    : msg
                )
                .filter(msg => msg.content.trim() !== '') // 過濾掉空白訊息
            )
            resolve()
            play('message_received')
            playRandomMeow()
          },
          onError: (error) => {
            reject(new Error(error))
          }
        })
      })
      } catch (error) {
        console.error('上傳失敗:', error)

        // 更新為錯誤訊息（使用最新的 messageId）
        setChatHistory(prev =>
          prev.map(msg =>
            msg.id === currentMessageId
              ? { ...msg, content: '喵嗚~ 處理失敗了... 請稍後再試 😿', isComplete: true }
              : msg
          )
        )
      }
    })()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // 處理 Ctrl+V 貼上圖片和檔案
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items
    const files: File[] = []

    // 檢查剪貼簿中的檔案
    for (let i = 0; i < items.length; i++) {
      const item = items[i]

      // 如果是檔案類型
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file) {
          // 🔧 修復：為剪貼簿的檔案生成正確的名稱和類型
          let fileName = file.name
          let fileType = file.type

          // 如果檔案名稱是空的或是默認名稱，生成一個新的
          if (!fileName || fileName === 'image.png' || fileName === 'blob') {
            const timestamp = new Date().getTime()
            const extension = fileType.split('/')[1] || 'png'
            fileName = `pasted-image-${timestamp}.${extension}`
          }

          // 創建一個新的 File 對象，確保名稱正確
          const fixedFile = new File([file], fileName, {
            type: fileType || 'image/png',
            lastModified: file.lastModified
          })

          files.push(fixedFile)
        }
      }
    }

    // 如果有檔案，則處理上傳
    if (files.length > 0) {
      e.preventDefault() // 防止預設的貼上行為
      play('notification')

      // 1️⃣ 先創建所有文件的初始狀態（立即顯示在 UI）
      const newFiles = files.map(file => ({
        id: `file-${Date.now()}-${Math.random()}`,
        name: file.name,
        url: '',
        type: file.type,
        size: file.size,
        status: 'uploading' as const,
        progress: 0
      }))

      // 2️⃣ 一次性添加所有文件到狀態
      setUploadedFiles(prev => [...prev, ...newFiles])

      // 3️⃣ 並發上傳所有文件（像 Discord 一樣）
      const uploadPromises = files.map(async (file, index) => {
        const fileId = newFiles[index].id

        try {
          // 上傳到 Cloudinary
          const formData = new FormData()
          formData.append('file', file)

          const response = await axios.post(API_ENDPOINTS.UPLOAD_SINGLE, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: `Bearer ${token}`
            },
            onUploadProgress: (progressEvent: { loaded: number; total?: number }) => {
              const progress = progressEvent.total
                ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
                : 0

              setUploadedFiles(prev =>
                prev.map(f =>
                  f.id === fileId ? { ...f, progress } : f
                )
              )
            }
          })

          setUploadedFiles(prev =>
            prev.map(f =>
              f.id === fileId
                ? { ...f, url: response.data.url, status: 'completed' as const }
                : f
            )
          )

          play('upload_success')
        } catch (error) {
          console.error('檔案上傳失敗:', error)
          setUploadedFiles(prev =>
            prev.map(f =>
              f.id === fileId ? { ...f, status: 'error' as const } : f
            )
          )
        }
      })

      // 4️⃣ 等待所有上傳完成（Promise.allSettled 允許部分失敗）
      await Promise.allSettled(uploadPromises)
    }
  }

  return (
    <div
      className={`fixed inset-0 ${Z_INDEX_CLASSES.FULLSCREEN_CHAT} flex items-center justify-center animate-fadeIn`}
      style={{
        background: 'linear-gradient(to bottom right, rgba(255, 248, 231, 0.98) 0%, rgba(255, 243, 224, 0.98) 50%, rgba(255, 237, 213, 0.98) 100%)'
      }}
    >
      {/* 裝飾背景 - 雲朵和陽光 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-20 text-4xl animate-bounce" style={{ animationDuration: '3s' }}>☁️</div>
        <div className="absolute top-40 right-32 text-3xl animate-bounce" style={{ animationDuration: '4s' }}>☀️</div>
        <div className="absolute bottom-32 left-40 text-5xl animate-bounce" style={{ animationDuration: '5s' }}>🌈</div>
        <div className="absolute top-60 right-20 text-2xl animate-bounce" style={{ animationDuration: '3.5s' }}>✨</div>
        <div className="absolute bottom-40 right-32 text-3xl animate-bounce" style={{ animationDuration: '4.5s' }}>☁️</div>
      </div>

      {/* 主對話容器 - 左右佈局：充分利用橫向空間 */}
      <div className="relative w-full max-w-6xl h-full flex p-4 gap-6">
        {/* 關閉按鈕 - 固定在右上角 */}
        <div className="absolute top-6 right-6 z-10">
          <button
            onClick={() => {
              play('button_click')
              onClose()
            }}
            className="text-amber-900/70 hover:text-amber-900 transition-colors text-3xl"
            aria-label="關閉對話視窗"
          >
            ✕
          </button>
        </div>

        {/* 左側：Live2D 模型 - 固定寬度，垂直置中 */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center" style={{ width: '350px' }}>
          <Live2DDisplay
            modelPath="/models/tororo_white/tororo.model3.json"
            width={350}
            height={450}
            isThinking={false}
            isSpeaking={chatHistory.some(msg => msg.type === 'tororo' && !msg.isComplete)}
          />
          <div className="mt-4 text-center">
            <h2 className="text-2xl font-bold flex items-center justify-center gap-2" style={{ color: '#8B5C2E' }}>
              <span className="text-3xl">☁️</span>
              白噗噗
            </h2>
            <p className="text-sm" style={{ color: '#A67C52' }}>知識園丁・幫你整理一切</p>
          </div>
        </div>

        {/* 右側：對話區域 - 彈性寬度 */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* 對話歷史 - 佔據剩餘空間 */}
        <div className="flex-1 overflow-y-auto mb-6 space-y-3 sm:space-y-4">
          {chatHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="space-y-4">
                <p className="text-amber-900/60 text-lg">跟我說點什麼吧～ ☁️</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    '我想記錄今天的心情',
                    '上傳一些學習筆記',
                    '分享一個連結'
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInputText(suggestion)}
                      className="px-4 py-2 rounded-full text-sm transition-colors"
                      style={{
                        background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.3) 0%, rgba(245, 158, 11, 0.25) 100%)',
                        backdropFilter: 'blur(10px)',
                        color: '#8B5C2E'
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <AnimatePresence>
              {chatHistory.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={item.type === 'user' ? 'flex justify-end mb-2' : 'flex justify-start mb-4'}
                >
                  {item.type === 'user' ? (
                    // 用戶訊息 - 統一樣式
                    <div
                      className="max-w-[75%] rounded-2xl px-4 py-3 text-sm"
                      style={{
                        background: 'rgba(251, 191, 36, 0.5)',
                        backdropFilter: 'blur(5px)',
                        color: '#4A2C0E'
                      }}
                    >
                      <div style={{ whiteSpace: 'pre-line' }}>{item.content.trim()}</div>
                      {item.files && item.files.length > 0 && (
                        <div className="mt-1 space-y-1">
                          {item.files.map((file, idx) => (
                            <div key={idx} className="text-xs">📎 {file.name}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    // 白噗噗回答 - 從左側模型說出來
                    <div
                      className="max-w-[75%] rounded-2xl px-4 py-3 relative"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(254, 252, 247, 0.95) 100%)',
                        backdropFilter: 'blur(20px)',
                        boxShadow: '0 12px 48px rgba(251, 191, 36, 0.5), 0 0 30px rgba(245, 158, 11, 0.3)',
                        color: '#5D3A1A',
                        border: '2px solid rgba(251, 191, 36, 0.3)'
                      }}
                    >
                        {/* 對話氣泡尾巴 - 只在第一個泡泡顯示 */}
                        {index === chatHistory.findIndex(msg => msg.type === 'tororo') && (
                          <div
                            className="absolute -left-3 top-8 w-6 h-6 rotate-45"
                            style={{
                              background: 'rgba(255, 255, 255, 0.98)',
                              border: '2px solid rgba(251, 191, 36, 0.3)',
                              borderRight: 'none',
                              borderTop: 'none'
                            }}
                          />
                        )}

                      <div className="text-base" style={{ lineHeight: '1.6', fontSize: '16px', whiteSpace: 'pre-line' }}>
                        {item.content.trim() || (
                          // 如果內容為空，顯示思考中動畫
                          <span className="inline-flex items-center gap-1 text-amber-600/70">
                            <span className="animate-bounce" style={{ animationDelay: '0ms' }}>思</span>
                            <span className="animate-bounce" style={{ animationDelay: '150ms' }}>考</span>
                            <span className="animate-bounce" style={{ animationDelay: '300ms' }}>中</span>
                            <span className="animate-bounce" style={{ animationDelay: '450ms' }}>.</span>
                            <span className="animate-bounce" style={{ animationDelay: '600ms' }}>.</span>
                            <span className="animate-bounce" style={{ animationDelay: '750ms' }}>.</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* 下方：輸入區域 - 固定不被壓縮 */}
        <div className="flex-shrink-0 mt-auto">
          {/* 已上傳檔案列表 */}
          {uploadedFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className="px-3 py-2 rounded-lg flex items-center gap-2 text-sm"
                  style={{
                    background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.15) 100%)',
                    backdropFilter: 'blur(10px)',
                    color: '#8B5C2E'
                  }}
                >
                  {file.status === 'uploading' && (
                    <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                  )}
                  {file.status === 'completed' && <span>✅</span>}
                  {file.status === 'error' && <span>❌</span>}

                  <span className="truncate max-w-[150px]">{file.name}</span>

                  {file.status === 'completed' && (
                    <button
                      onClick={() => removeFile(file.id)}
                      className="ml-auto text-amber-900/50 hover:text-amber-900"
                      aria-label={`移除檔案 ${file.name}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 輸入區域 */}
          <div
            className="rounded-xl md:rounded-2xl p-2 sm:p-3 md:p-4"
            style={{
              background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.15) 100%)',
              backdropFilter: 'blur(20px)',
              border: '2px solid rgba(251, 191, 36, 0.3)'
            }}
          >
          <div className="flex gap-2 md:gap-3 items-end">
            {/* 附件按鈕 */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 md:p-3 rounded-lg md:rounded-xl transition-all flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.3) 0%, rgba(245, 158, 11, 0.25) 100%)'
              }}
              title="上傳檔案"
              aria-label="上傳檔案"
            >
              <span className="text-lg md:text-xl">📎</span>
            </button>

            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="告訴我你想記錄什麼..."
              className="flex-1 bg-transparent outline-none resize-none min-h-[50px] sm:min-h-[60px] max-h-[100px] sm:max-h-[120px] tororo-input text-sm md:text-base"
              style={{
                color: '#8B5C2E',
                caretColor: '#8B5C2E',
                fontFamily: 'inherit'
              }}
            />

            <button
              onClick={handleSubmit}
              disabled={!inputText.trim() && uploadedFiles.filter(f => f.status === 'completed').length === 0}
              className="px-3 py-2 sm:px-4 sm:py-2.5 md:px-6 md:py-3 rounded-lg md:rounded-xl font-medium text-sm md:text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              style={{
                background: (inputText.trim() || uploadedFiles.some(f => f.status === 'completed'))
                  ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.8) 0%, rgba(245, 158, 11, 0.7) 100%)'
                  : 'rgba(251, 191, 36, 0.2)',
                color: '#5D3A1A'
              }}
              aria-label="發送訊息"
            >
              <span className="hidden sm:inline">發送 ✨</span>
              <span className="inline sm:hidden">✨</span>
            </button>
          </div>
          </div>

          {/* 隱藏的檔案輸入 */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
        </div>
      </div>
    </div>
  )
}
