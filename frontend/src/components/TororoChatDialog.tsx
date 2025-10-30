/**
 * 白噗噗對話介面 - 互動式設計
 * 像是真正在和貓咪對話，並且可以上傳知識
 */

import { useState, useRef, useEffect } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { UPLOAD_KNOWLEDGE, GET_CHIEF_ASSISTANT } from '../graphql/knowledge'
import type { UploadKnowledgeInput } from '../graphql/knowledge'
import { useSound } from '../hooks/useSound'
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
  const [isProcessing, setIsProcessing] = useState(false)

  const [uploadKnowledge] = useMutation(UPLOAD_KNOWLEDGE)
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

    for (const file of Array.from(files)) {
      const fileId = `file-${Date.now()}-${Math.random()}`
      const newFile: UploadedFile = {
        id: fileId,
        name: file.name,
        url: '',
        type: file.type,
        size: file.size,
        status: 'uploading',
        progress: 0
      }

      setUploadedFiles(prev => [...prev, newFile])

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
    }

    // 清空 input
    e.target.value = ''
  }

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
    play('button_click')
  }

  const handleSubmit = async () => {
    if ((!inputText.trim() && uploadedFiles.length === 0) || isProcessing) return

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

    // 清空輸入
    setInputText('')
    setUploadedFiles([])
    setIsProcessing(true)

    try {
      const input: UploadKnowledgeInput = {
        content: userContent,
        files: completedFiles.map(f => ({
          url: f.url,
          name: f.name,
          type: f.type
        })),
        contentType: completedFiles.some(f => f.type.startsWith('image/'))
          ? 'IMAGE'
          : completedFiles.some(f => f.type.includes('pdf'))
          ? 'DOCUMENT'
          : 'TEXT'
      }

      const { data } = await uploadKnowledge({
        variables: { input }
      })

      if (data?.uploadKnowledge) {
        const result = data.uploadKnowledge

        // 構建白噗噗的回應
        let tororoResponse = result.distribution.warmResponse || '喵~ 我收到了！✨\n\n'

        if (result.memoriesCreated.length > 0) {
          tororoResponse += `💾 **已儲存到 ${result.memoriesCreated.length} 個島嶼:**\n`
          result.memoriesCreated.forEach((memory: { assistant: { emoji?: string; nameChinese: string } }) => {
            tororoResponse += `  ${memory.assistant.emoji} ${memory.assistant.nameChinese}\n`
          })
        }

        if (result.distribution.identifiedTopics?.length > 0) {
          tororoResponse += `\n🏷️ **識別主題:** ${result.distribution.identifiedTopics.join('、')}`
        }

        const tororoMessage: ChatItem = {
          id: `tororo-${Date.now()}`,
          type: 'tororo',
          content: tororoResponse,
          timestamp: new Date()
        }

        setChatHistory(prev => [...prev, tororoMessage])

        play('message_received')
        playRandomMeow()
      }
    } catch (error) {
      console.error('上傳失敗:', error)

      const errorMessage: ChatItem = {
        id: `tororo-${Date.now()}`,
        type: 'tororo',
        content: '喵嗚~ 處理失敗了... 請稍後再試 😿',
        timestamp: new Date()
      }

      setChatHistory(prev => [...prev, errorMessage])
    } finally {
      setIsProcessing(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
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

      {/* 主對話容器 - 上下佈局：模型在中上，對話在中下 */}
      <div className="relative w-full max-w-5xl h-full flex flex-col p-6">
        {/* 關閉按鈕 - 固定在右上角 */}
        <div className="absolute top-6 right-6 z-10">
          <button
            onClick={() => {
              play('button_click')
              onClose()
            }}
            className="text-amber-900/70 hover:text-amber-900 transition-colors text-3xl"
          >
            ✕
          </button>
        </div>

        {/* 上方：Live2D 模型 + 標題 - 固定高度 */}
        <div className="flex-shrink-0 flex flex-col items-center pt-4 pb-4">
          <Live2DDisplay
            modelPath="/models/tororo_white/tororo.model3.json"
            width={300}
            height={350}
            isThinking={false}
            isSpeaking={isProcessing}
          />
          <div className="mt-2 text-center">
            <h2 className="text-xl font-bold flex items-center justify-center gap-2" style={{ color: '#8B5C2E' }}>
              <span className="text-2xl">☁️</span>
              白噗噗
            </h2>
            <p className="text-xs" style={{ color: '#A67C52' }}>知識園丁・幫你整理一切</p>
          </div>
        </div>

        {/* 中間：對話歷史 - 限制最大高度 */}
        <div className="overflow-y-auto mb-4 space-y-4" style={{ maxHeight: '300px' }}>
          {chatHistory.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4">
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
              {chatHistory.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={item.type === 'user' ? 'flex justify-end mb-2' : 'flex items-start gap-3 mb-4'}
                >
                  {item.type === 'user' ? (
                    // 用戶訊息 - 更小更簡潔
                    <div
                      className="max-w-[60%] rounded-xl px-3 py-2 text-xs opacity-60"
                      style={{
                        background: 'rgba(251, 191, 36, 0.3)',
                        backdropFilter: 'blur(5px)',
                        color: '#8B5C2E'
                      }}
                    >
                      <div className="whitespace-pre-wrap">{item.content}</div>
                      {item.files && item.files.length > 0 && (
                        <div className="mt-1 space-y-1">
                          {item.files.map((file, idx) => (
                            <div key={idx} className="text-xs">📎 {file.name}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    // 白噗噗回答 - 從上方模型說出來的感覺
                    <div className="flex justify-center w-full">
                      <div
                        className="w-full rounded-3xl px-8 py-6 relative"
                        style={{
                          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(254, 252, 247, 0.95) 100%)',
                          backdropFilter: 'blur(20px)',
                          boxShadow: '0 12px 48px rgba(251, 191, 36, 0.5), 0 0 30px rgba(245, 158, 11, 0.3)',
                          color: '#5D3A1A',
                          border: '2px solid rgba(251, 191, 36, 0.3)'
                        }}
                      >
                        {/* 對話氣泡尾巴 - 指向上方 */}
                        <div
                          className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-6 h-6 rotate-45"
                          style={{
                            background: 'rgba(255, 255, 255, 0.98)',
                            border: '2px solid rgba(251, 191, 36, 0.3)',
                            borderRight: 'none',
                            borderBottom: 'none'
                          }}
                        />

                        <div className="whitespace-pre-wrap text-base" style={{ lineHeight: '1.8', fontSize: '16px' }}>
                          {item.content}
                        </div>
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
            className="rounded-2xl p-4"
            style={{
              background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.15) 100%)',
              backdropFilter: 'blur(20px)',
              border: '2px solid rgba(251, 191, 36, 0.3)'
            }}
          >
          <div className="flex gap-3 items-end">
            {/* 附件按鈕 */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="p-3 rounded-xl transition-all disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.3) 0%, rgba(245, 158, 11, 0.25) 100%)'
              }}
              title="上傳檔案"
            >
              <span className="text-xl">📎</span>
            </button>

            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isProcessing}
              placeholder={isProcessing ? "白噗噗正在處理中..." : "告訴我你想記錄什麼..."}
              className="flex-1 bg-transparent outline-none resize-none min-h-[60px] max-h-[120px]"
              style={{
                color: '#5D3A1A',
                fontFamily: 'inherit'
              }}
            />

            <button
              onClick={handleSubmit}
              disabled={(!inputText.trim() && uploadedFiles.filter(f => f.status === 'completed').length === 0) || isProcessing}
              className="px-6 py-3 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: (inputText.trim() || uploadedFiles.some(f => f.status === 'completed')) && !isProcessing
                  ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.8) 0%, rgba(245, 158, 11, 0.7) 100%)'
                  : 'rgba(251, 191, 36, 0.2)',
                color: '#5D3A1A'
              }}
            >
              {isProcessing ? '處理中...' : '發送 ✨'}
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
  )
}
