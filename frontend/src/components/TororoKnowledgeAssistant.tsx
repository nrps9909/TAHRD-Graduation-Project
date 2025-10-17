/**
 * 白噗噗知識助手 - 快速直覺的知識上傳介面
 * 設計理念：可愛、直覺、快速，像是打開一個神奇的知識寶盒
 *
 * 性能優化：
 * - Live2D 渲染限制為 30 FPS
 * - AI 生成支援請求取消
 * - 打字機效果使用 requestAnimationFrame
 * - 輸入防抖延長至 5 秒
 * - 使用 React.memo 優化組件渲染
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import * as PIXI from 'pixi.js'
import { Live2DModel } from 'pixi-live2d-display/cubism4'
import { useMutation, useQuery } from '@apollo/client'
import { UPLOAD_KNOWLEDGE, GET_CHIEF_ASSISTANT } from '../graphql/knowledge'
import type { UploadKnowledgeInput } from '../graphql/knowledge'
import { useSound } from '../hooks/useSound'
import { motion, AnimatePresence } from 'framer-motion'
import { generateTororoResponse, detectEmotion, type UserAction } from '../services/tororoAI'
import { Z_INDEX_CLASSES } from '../constants/zIndex'
import { useAuthStore } from '../stores/authStore'
import { io, Socket } from 'socket.io-client'

// Register PIXI globally for Live2D
;(window as Window & typeof globalThis & { PIXI: typeof PIXI }).PIXI = PIXI

interface TororoKnowledgeAssistantProps {
  modelPath: string
  onClose?: () => void
}

type ViewMode = 'main' | 'processing' | 'success' | 'history'

interface UploadResult {
  distribution?: {
    id: string
  }
  memoriesCreated?: Array<{
    id: string
    title: string
    emoji?: string
    summary?: string
    category?: string
    tags?: string[]
    assistant: {
      emoji?: string
      nameChinese: string
    }
  }>
  tororoResponse?: {
    warmMessage?: string
    category?: string
    shouldRecord?: boolean
  }
  backgroundProcessing?: boolean
  skipRecording?: boolean
}

interface HistoryRecord {
  id: string
  inputText: string
  files: { name: string; type: string }[]
  timestamp: Date
  result?: UploadResult
  distributionId?: string  // 儲存 distribution ID 以便後續查詢
  processingStatus?: 'pending' | 'processing' | 'completed' | 'error' // 處理狀態
  memoriesCount?: number // 創建的記憶數量
}

const HISTORY_STORAGE_KEY = 'tororo_knowledge_history'

export default function TororoKnowledgeAssistant({
  modelPath,
  onClose,
}: TororoKnowledgeAssistantProps) {
  // 獲取認證 token
  const { token } = useAuthStore()

  const [viewMode, setViewMode] = useState<ViewMode>('main')
  const [inputText, setInputText] = useState('')
  const [isRecordingTranscribe, setIsRecordingTranscribe] = useState(false) // 語音轉文字
  const [isRecordingDialog, setIsRecordingDialog] = useState(false) // 語音對話
  const [processingResult, setProcessingResult] = useState<UploadResult | null>(null)
  const [audioDialogResponse, setAudioDialogResponse] = useState<string>('')
  const [displayedText, setDisplayedText] = useState<string>('')
  const [isTyping, setIsTyping] = useState(false)
  const [history, setHistory] = useState<HistoryRecord[]>([])
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [conversationHistory, setConversationHistory] = useState<string[]>([]) // 對話歷史
  const [socket, setSocket] = useState<Socket | null>(null) // WebSocket 連接

  // ChatGPT-style 檔案上傳狀態
  const [uploadedCloudinaryFiles, setUploadedCloudinaryFiles] = useState<Array<{
    id: string
    name: string
    url: string
    type: string
    size: number
    status: 'uploading' | 'completed' | 'error'
    progress: number
  }>>([])
  const [isUploading, setIsUploading] = useState(false)

  // Refs
  const live2dContainerRef = useRef<HTMLDivElement | null>(null)
  const appRef = useRef<PIXI.Application | null>(null)
  const modelRef = useRef<Live2DModel | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const aiGenerationAbortControllerRef = useRef<AbortController | null>(null)
  const inputDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // GraphQL
  const [uploadKnowledge] = useMutation(UPLOAD_KNOWLEDGE)
  useQuery(GET_CHIEF_ASSISTANT) // Load chief assistant data

  // Sound
  const { play, playRandomMeow } = useSound()

  /**
   * 生成 AI 回應並顯示（優化版本，支援取消）
   */
  const generateAndDisplayResponse = useCallback(async (action: UserAction, additionalContext?: Record<string, unknown>) => {
    try {
      // 取消之前的請求
      if (aiGenerationAbortControllerRef.current) {
        aiGenerationAbortControllerRef.current.abort()
      }

      // 創建新的 AbortController
      const abortController = new AbortController()
      aiGenerationAbortControllerRef.current = abortController

      // 準備上下文
      const context = {
        action,
        inputText,
        fileCount: uploadedCloudinaryFiles.length,
        historyCount: history.length,
        emotionDetected: inputText ? detectEmotion(inputText) : undefined,
        previousMessages: conversationHistory.slice(-3),
        ...additionalContext
      }

      // 呼叫 AI 生成回應
      const response = await generateTororoResponse(context)

      // 檢查是否被取消
      if (abortController.signal.aborted) return

      // 更新對話歷史
      setConversationHistory(prev => [...prev, response].slice(-10))

      // 設置顯示文字（會觸發打字機效果）
      setAudioDialogResponse(response)

    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log('AI 生成被取消')
      } else {
        console.error('生成 AI 回應失敗:', error)
      }
    }
  }, [inputText, uploadedCloudinaryFiles.length, history.length, conversationHistory])

  // 載入歷史紀錄
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Array<Omit<HistoryRecord, 'timestamp'> & { timestamp: string }>
        const historyWithDates = parsed.map((record) => ({
          ...record,
          timestamp: new Date(record.timestamp)
        }))
        setHistory(historyWithDates)
      }
    } catch (error) {
      console.error('載入歷史紀錄失敗:', error)
    }
  }, [])

  // WebSocket 連接 - 監聽任務完成事件
  useEffect(() => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'
    const userId = token ? user?.id : 'guest-user-id'

    const newSocket = io(backendUrl, {
      transports: ['polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      timeout: 20000,
      upgrade: false,
      rememberUpgrade: false
    })

    newSocket.on('connect', () => {
      console.log('[Tororo] WebSocket connected ✅')
      if (userId) {
        newSocket.emit('join-room', { roomId: userId })
      }
    })

    newSocket.on('disconnect', (reason) => {
      console.log('[Tororo] WebSocket disconnected:', reason)
    })

    // 監聽任務完成事件
    newSocket.on('task-complete', (data: {
      taskId: string
      distributionId: string
      progress: { message: string }
      result: { memoriesCreated: number }
    }) => {
      console.log('[Tororo] 收到 task-complete 事件:', data)

      // 更新對應的歷史記錄狀態
      setHistory(prev => {
        const updated = prev.map(record => {
          if (record.distributionId === data.distributionId) {
            return {
              ...record,
              processingStatus: 'completed' as const,
              memoriesCount: data.result.memoriesCreated
            }
          }
          return record
        })

        // 保存到 localStorage
        try {
          localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated))
        } catch (error) {
          console.error('更新歷史紀錄失敗:', error)
        }

        return updated
      })

      // 播放通知音效
      play('notification')
    })

    // 監聽任務錯誤事件
    newSocket.on('task-error', (data: {
      taskId: string
      distributionId: string
      error: string
    }) => {
      console.log('[Tororo] 收到 task-error 事件:', data)

      // 更新對應的歷史記錄狀態
      setHistory(prev => {
        const updated = prev.map(record => {
          if (record.distributionId === data.distributionId) {
            return {
              ...record,
              processingStatus: 'error' as const
            }
          }
          return record
        })

        try {
          localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated))
        } catch (error) {
          console.error('更新歷史紀錄失敗:', error)
        }

        return updated
      })
    })

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, [token, user?.id, play])

  // 儲存歷史紀錄
  const saveToHistory = useCallback((input: string, files: File[], result?: UploadResult) => {
    const record: HistoryRecord = {
      id: `history_${Date.now()}`,
      inputText: input,
      files: files.map(f => ({ name: f.name, type: f.type })),
      timestamp: new Date(),
      result,
      distributionId: result?.distribution?.id,  // 儲存 distribution ID
      processingStatus: result?.backgroundProcessing ? 'processing' : 'completed', // 初始狀態
      memoriesCount: result?.memoriesCreated?.length || 0
    }

    setHistory(prev => {
      const updated = [record, ...prev].slice(0, 50) // 只保留最近 50 筆
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated))
      } catch (error) {
        console.error('儲存歷史紀錄失敗:', error)
      }
      return updated
    })
  }, [])

  // 刪除歷史紀錄
  const deleteHistory = (id: string) => {
    setHistory(prev => {
      const updated = prev.filter(r => r.id !== id)
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated))
      } catch (error) {
        console.error('刪除歷史紀錄失敗:', error)
      }
      return updated
    })
  }

  // 清空所有歷史
  const clearAllHistory = () => {
    setHistory([])
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY)
    } catch (error) {
      console.error('清空歷史紀錄失敗:', error)
    }
  }

  // Initialize Live2D（優化：降低更新頻率，提升性能）
  useEffect(() => {
    let cleanup: (() => void) | null = null

    const initLive2D = async () => {
      if (!live2dContainerRef.current) return

      try {
        Live2DModel.registerTicker(PIXI.Ticker)

        const containerWidth = live2dContainerRef.current.clientWidth
        const containerHeight = live2dContainerRef.current.clientHeight

        const app = new PIXI.Application({
          width: containerWidth,
          height: containerHeight,
          backgroundAlpha: 0,
          antialias: true,
          resolution: Math.min(window.devicePixelRatio || 1, 2), // 限制最大解析度為 2
          autoDensity: true,
          powerPreference: 'high-performance', // 使用高性能模式
        })

        // 設定更新頻率為 30 FPS 而不是 60 FPS
        app.ticker.maxFPS = 30

        appRef.current = app
        live2dContainerRef.current.appendChild(app.view as HTMLCanvasElement)

        try {
          const model = await Live2DModel.from(modelPath)
          modelRef.current = model

          // 響應式縮放：根據容器寬度自動調整
          // 小屏幕使用較小的縮放比例，大屏幕使用較大的縮放比例
          const baseScale = Math.min(containerWidth / 2048, containerHeight / 2048)
          const responsiveScale = containerWidth < 250 ? 0.5 : containerWidth < 300 ? 0.7 : 0.9
          const targetScale = baseScale * responsiveScale
          model.scale.set(targetScale)
          model.position.set(containerWidth / 2, containerHeight * 0.95)
          model.anchor.set(0.5, 1)

          app.stage.addChild(model)

          // 優化：降低更新頻率
          app.ticker.add(() => {
            if (modelRef.current) {
              modelRef.current.update(app.ticker.deltaTime)
            }
          })
        } catch (error) {
          console.warn('Failed to load Live2D model:', error)
        }
      } catch (error) {
        console.error('Failed to initialize PIXI:', error)
      }
    }

    const timer = setTimeout(() => initLive2D(), 100)

    cleanup = () => {
      clearTimeout(timer)
      if (modelRef.current) {
        try {
          modelRef.current.destroy()
        } catch (e) {
          console.error('Error destroying model:', e)
        }
        modelRef.current = null
      }
      if (appRef.current) {
        try {
          appRef.current.destroy(true)
        } catch (e) {
          console.error('Error destroying app:', e)
        }
        appRef.current = null
      }
      if (live2dContainerRef.current) {
        live2dContainerRef.current.innerHTML = ''
      }
    }

    return () => {
      if (cleanup) cleanup()
    }
  }, [modelPath])

  // Play greeting and generate initial AI response
  useEffect(() => {
    const timer = setTimeout(() => {
      play('meow_greeting')
      playRandomMeow()
      // 生成開場白
      generateAndDisplayResponse('open_panel')
    }, 500)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 監聽輸入變化，生成動態回應（優化：延長延遲時間，減少觸發）
  useEffect(() => {
    if (viewMode !== 'main') return
    if (!inputText.trim() && uploadedCloudinaryFiles.length === 0) return

    // 清除之前的計時器
    if (inputDebounceTimerRef.current) {
      clearTimeout(inputDebounceTimerRef.current)
    }

    // 延長到 5 秒，減少 API 呼叫
    inputDebounceTimerRef.current = setTimeout(() => {
      generateAndDisplayResponse('has_input')
    }, 5000)

    return () => {
      if (inputDebounceTimerRef.current) {
        clearTimeout(inputDebounceTimerRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputText, uploadedCloudinaryFiles.length, viewMode])

  // 打字機效果（優化：使用 requestAnimationFrame 提升性能）
  useEffect(() => {
    const text = audioDialogResponse || ''

    if (!text) {
      setDisplayedText('')
      return
    }

    setIsTyping(true)
    setDisplayedText('')

    let currentIndex = 0
    let lastTime = 0
    const typingSpeed = 50 // 每個字50ms
    let animationFrameId: number

    const animate = (timestamp: number) => {
      if (lastTime === 0) {
        lastTime = timestamp
      }

      const elapsed = timestamp - lastTime

      if (elapsed >= typingSpeed) {
        currentIndex++
        setDisplayedText(text.slice(0, currentIndex))
        lastTime = timestamp

        if (currentIndex > text.length) {
          setIsTyping(false)
          return
        }
      }

      animationFrameId = requestAnimationFrame(animate)
    }

    animationFrameId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationFrameId)
      setIsTyping(false)
    }
  }, [audioDialogResponse])

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    play('notification')
    setIsUploading(true)

    // 為每個檔案建立初始狀態
    const newFiles = Array.from(files).map(file => ({
      id: `file-${Date.now()}-${Math.random()}`,
      name: file.name,
      url: '',
      type: file.type,
      size: file.size,
      status: 'uploading' as const,
      progress: 0
    }))

    setUploadedCloudinaryFiles(prev => [...prev, ...newFiles])

    // ⚡ 優化：並發上傳所有檔案
    const uploadPromises = Array.from(files).map(async (file, index) => {
      const fileId = newFiles[index].id

      try {
        const formData = new FormData()
        formData.append('files', file)

        // 準備認證標頭
        const headers: HeadersInit = {}
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }

        const response = await fetch('http://localhost:4000/api/upload-multiple', {
          method: 'POST',
          headers,
          body: formData
        })

        if (!response.ok) {
          throw new Error('上傳失敗')
        }

        const result = await response.json()
        const uploadedFile = result.files[0]

        // 更新為上傳完成
        setUploadedCloudinaryFiles(prev =>
          prev.map(f =>
            f.id === fileId
              ? {
                  ...f,
                  url: uploadedFile.url,
                  status: 'completed' as const,
                  progress: 100
                }
              : f
          )
        )

        return { success: true, fileId }
      } catch (error) {
        console.error('檔案上傳失敗:', error)
        // 標記為錯誤
        setUploadedCloudinaryFiles(prev =>
          prev.map(f =>
            f.id === fileId
              ? { ...f, status: 'error' as const, progress: 0 }
              : f
          )
        )

        return { success: false, fileId }
      }
    })

    // 等待所有上傳完成（Promise.allSettled 允許部分失敗）
    await Promise.allSettled(uploadPromises)

    setIsUploading(false)
    generateAndDisplayResponse('upload_file', { fileCount: files.length })
  }, [play, generateAndDisplayResponse, token])

  const removeFile = useCallback((fileId: string) => {
    setUploadedCloudinaryFiles(prev => prev.filter(f => f.id !== fileId))
    play('button_click')
  }, [play])

  const handleSubmit = useCallback(async () => {
    if (!inputText.trim() && uploadedCloudinaryFiles.length === 0) return

    // 檢查是否還有檔案正在上傳
    const hasUploadingFiles = uploadedCloudinaryFiles.some(f => f.status === 'uploading')
    if (hasUploadingFiles || isUploading) {
      alert('請等待檔案上傳完成')
      return
    }

    // 🚀 新架構：非阻塞式提交，立即清空輸入框讓用戶繼續輸入
    // 保存當前輸入狀態
    const currentInput = inputText
    const currentFiles = [...uploadedCloudinaryFiles]
    
    // 🎯 立即清空輸入，讓用戶可以繼續輸入下一個
    setInputText('')
    setUploadedCloudinaryFiles([])
    play('message_sent')
    
    // 顯示簡短的提交確認（不阻塞UI）
    setAudioDialogResponse('已送出！可以繼續輸入下一個～ ☁️✨')
    
    // 🔥 異步處理（不阻塞UI）
    ;(async () => {
      try {
        // 1️⃣ 使用已上傳的 Cloudinary URLs（已經在 handleFileChange 中上傳完成）
        const uploadedFileUrls = currentFiles
          .filter(f => f.status === 'completed')
          .map(f => ({
            url: f.url,
            name: f.name,
            type: f.type.startsWith('image/') ? 'image' : 'file'
          }))

        // 2️⃣ 檢查輸入文字中是否包含 URL（YouTube, 文章連結等）
        const urlRegex = /(https?:\/\/[^\s]+)/g
        const foundUrls = currentInput.match(urlRegex) || []

        // 分離 URL 和純文字
        const textWithoutUrls = currentInput.replace(urlRegex, '').trim()
        const links = foundUrls.map(url => ({
          url: url,
          title: url.includes('youtube.com') || url.includes('youtu.be') ? 'YouTube 影片' : '連結'
        }))

        // 3️⃣ 準備 GraphQL 輸入
        const input: UploadKnowledgeInput = {
          content: textWithoutUrls || (links.length > 0 ? '分享連結' : '快速記錄'),
          files: uploadedFileUrls,  // ✅ 使用 Cloudinary URLs
          links: links.length > 0 ? links : undefined,
          contentType: uploadedFileUrls.some(f => f.type === 'image') ? 'IMAGE' : uploadedFileUrls.length > 0 ? 'DOCUMENT' : links.length > 0 ? 'LINK' : 'TEXT',
        }

        const { data } = await uploadKnowledge({ variables: { input } })

        if (data?.uploadKnowledge) {
          const result = data.uploadKnowledge
          const tororoResponse = result.tororoResponse

          // === 檢查是否為簡單互動（不記錄）===
          if (result.skipRecording || tororoResponse?.shouldRecord === false) {
            // 不儲存歷史，顯示白噗噗的友善回應
            setAudioDialogResponse(tororoResponse?.warmMessage || '這個就不記錄囉～ ☁️')
            play('notification')
            return
          }

          // === 正常記錄流程 ===
          // 將 Cloudinary 檔案轉換為 File 格式供歷史記錄使用
          const filesForHistory = currentFiles
            .filter(f => f.status === 'completed')
            .map(f => ({ name: f.name, type: f.type })) as unknown as File[]
          saveToHistory(currentInput, filesForHistory, result) // 儲存到歷史

          // 顯示白噗噗的溫暖回應
          if (tororoResponse?.warmMessage) {
            setAudioDialogResponse(tororoResponse.warmMessage)
          }

          play('notification')
          playRandomMeow()
          
          console.log('✅ 知識已加入處理隊列:', result.distribution?.id)
        }
      } catch (error) {
        console.error('❌ 上傳失敗:', error)
        // 失敗時恢復輸入（可選）
        // setInputText(currentInput)
        // setUploadedCloudinaryFiles(currentFiles)
        setAudioDialogResponse('哎呀，出錯了！可以再試一次～ ☁️')
        play('notification')
      }
    })()
  }, [inputText, uploadedCloudinaryFiles, uploadKnowledge, play, saveToHistory, playRandomMeow, isUploading])

  const handleReset = useCallback(() => {
    setViewMode('main')
    setInputText('')
    setUploadedCloudinaryFiles([])
    setProcessingResult(null)
    play('button_click')
  }, [play])

  // 1. 語音轉文字 - 錄音後轉成文字加到輸入框
  const toggleTranscribeRecording = async () => {
    if (!isRecordingTranscribe) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

        const mediaRecorder = new MediaRecorder(stream)
        mediaRecorderRef.current = mediaRecorder
        audioChunksRef.current = []

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data)
          }
        }

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })

          try {
            const reader = new FileReader()
            reader.readAsDataURL(audioBlob)
            reader.onloadend = async () => {
              const base64Audio = reader.result?.toString().split(',')[1]

              const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-exp-native-audio-thinking-dialog:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    contents: [
                      {
                        parts: [
                          {
                            text: '請將這段語音轉換成文字。如果是中文請用繁體中文輸出，如果是英文請直接輸出英文。只輸出轉錄的文字內容，不要加任何說明。',
                          },
                          {
                            inline_data: {
                              mime_type: 'audio/webm',
                              data: base64Audio,
                            },
                          },
                        ],
                      },
                    ],
                  }),
                }
              )

              if (response.ok) {
                const data = await response.json()
                const transcribedText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

                if (transcribedText) {
                  setInputText(prev => prev + (prev ? '\n' : '') + transcribedText)
                  play('upload_success')
                }
              } else {
                console.error('Gemini 語音識別失敗:', await response.text())
                alert('語音識別失敗，請稍後再試')
              }
            }
          } catch (error) {
            console.error('語音轉文字失敗:', error)
            alert('語音識別失敗，請稍後再試')
          }

          stream.getTracks().forEach(track => track.stop())
        }

        mediaRecorder.start()
        setIsRecordingTranscribe(true)
        play('notification')
        generateAndDisplayResponse('voice_record')
      } catch (error) {
        console.error('無法訪問麥克風:', error)
        alert('無法訪問麥克風，請確認權限設定')
      }
    } else {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
        setIsRecordingTranscribe(false)
        play('notification')
      }
    }
  }

  // 2. 語音對話 - 直接音頻理解並回應
  const toggleDialogRecording = async () => {
    if (!isRecordingDialog) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

        const mediaRecorder = new MediaRecorder(stream)
        mediaRecorderRef.current = mediaRecorder
        audioChunksRef.current = []

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data)
          }
        }

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })

          try {
            const reader = new FileReader()
            reader.readAsDataURL(audioBlob)
            reader.onloadend = async () => {
              const base64Audio = reader.result?.toString().split(',')[1]

              // 直接音頻對話 - 理解語氣和情緒
              const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-exp-native-audio-thinking-dialog:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    contents: [
                      {
                        parts: [
                          {
                            text: '你是白噗噗，一隻溫柔貼心的白貓知識助手。請仔細聆聽用戶的語音，理解他們的情緒和語氣，並給予溫暖、貼心的回應。',
                          },
                          {
                            inline_data: {
                              mime_type: 'audio/webm',
                              data: base64Audio,
                            },
                          },
                        ],
                      },
                    ],
                  }),
                }
              )

              if (response.ok) {
                const data = await response.json()
                const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

                if (responseText) {
                  setAudioDialogResponse(responseText)
                  play('upload_success')
                  playRandomMeow()
                }
              } else {
                console.error('Gemini 語音對話失敗:', await response.text())
                alert('語音對話失敗，請稍後再試')
              }
            }
          } catch (error) {
            console.error('語音對話失敗:', error)
            alert('語音對話失敗，請稍後再試')
          }

          stream.getTracks().forEach(track => track.stop())
        }

        mediaRecorder.start()
        setIsRecordingDialog(true)
        play('notification')
        generateAndDisplayResponse('voice_dialog')
      } catch (error) {
        console.error('無法訪問麥克風:', error)
        alert('無法訪問麥克風，請確認權限設定')
      }
    } else {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
        setIsRecordingDialog(false)
        play('notification')
      }
    }
  }

  // 拍照功能
  const takePhoto = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()

        // 等待用戶拍照
        setTimeout(async () => {
          const canvas = document.createElement('canvas')
          canvas.width = videoRef.current!.videoWidth
          canvas.height = videoRef.current!.videoHeight

          const ctx = canvas.getContext('2d')
          ctx?.drawImage(videoRef.current!, 0, 0)

          canvas.toBlob(async (blob) => {
            if (blob) {
              const photoFile = new File([blob], `照片_${Date.now()}.jpg`, { type: 'image/jpeg' })
              
              // 上傳照片到 Cloudinary
              const formData = new FormData()
              formData.append('files', photoFile)
              
              try {
                const headers: HeadersInit = {}
                if (token) {
                  headers['Authorization'] = `Bearer ${token}`
                }
                
                const response = await fetch('http://localhost:4000/api/upload-multiple', {
                  method: 'POST',
                  headers,
                  body: formData
                })
                
                if (response.ok) {
                  const result = await response.json()
                  const uploadedFile = result.files[0]
                  
                  setUploadedCloudinaryFiles(prev => [...prev, {
                    id: `file-${Date.now()}`,
                    name: photoFile.name,
                    url: uploadedFile.url,
                    type: photoFile.type,
                    size: photoFile.size,
                    status: 'completed',
                    progress: 100
                  }])
                }
              } catch (error) {
                console.error('照片上傳失敗:', error)
              }
              
              play('notification')
              generateAndDisplayResponse('take_photo')
            }
          }, 'image/jpeg')

          // 停止相機
          stream.getTracks().forEach(track => track.stop())
        }, 3000) // 3秒後自動拍照
      }
    } catch (error) {
      console.error('無法訪問相機:', error)
      alert('無法訪問相機，請確認權限設定')
    }
  }

  return (
    <div className={`fixed inset-0 ${Z_INDEX_CLASSES.FULLSCREEN_CHAT} flex items-center justify-center bg-gradient-to-br from-amber-100/90 via-yellow-50/90 to-orange-50/90 backdrop-blur-md animate-fadeIn`}>
      {/* Main Container */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="relative w-[95vw] h-[95vh] max-w-7xl bg-gradient-to-br from-amber-50/98 via-yellow-50/98 to-orange-50/98 backdrop-blur-xl rounded-[3rem] shadow-2xl border-4 border-amber-200/60 overflow-hidden"
      >
        {/* 頂部標題區 - 白噗噗名稱 - 動物森友會白天風格 - 響應式 */}
        <div className="absolute top-4 sm:top-6 lg:top-8 left-4 sm:left-6 lg:left-8 z-50">
          <div className="flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-amber-100/80 to-yellow-100/80 backdrop-blur-md rounded-xl sm:rounded-2xl px-3 py-2 sm:px-5 sm:py-3 shadow-lg border-2 border-amber-200/60">
            <div>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-amber-800">白噗噗</h1>
              <p className="text-xs sm:text-sm text-amber-600">甚麼都可以跟我說!</p>
            </div>
          </div>
        </div>

        {/* Top Right Buttons - 響應式 */}
        <div className="absolute top-4 sm:top-6 lg:top-8 right-4 sm:right-6 lg:right-8 z-50 flex items-center gap-2">
          {/* History Button */}
          <button
            onClick={() => {
              play('button_click')
              const newMode = viewMode === 'history' ? 'main' : 'history'
              setViewMode(newMode)
              if (newMode === 'history') {
                generateAndDisplayResponse('view_history', { historyCount: history.length })
              } else {
                generateAndDisplayResponse('open_panel')
              }
            }}
            className="relative w-10 h-10 sm:w-12 sm:h-12 bg-white/70 hover:bg-white/90 text-amber-600 hover:text-amber-700 rounded-lg sm:rounded-xl shadow-lg border-2 border-amber-200/60 flex items-center justify-center transition-all duration-200 hover:shadow-xl active:scale-95 hover:scale-105 text-lg sm:text-xl"
            title="查看歷史紀錄"
          >
            📋
            {history.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center font-bold shadow-md">
                {history.length}
              </span>
            )}
          </button>

          {/* Close Button */}
          <button
            onClick={() => {
              play('button_click')
              onClose?.()
            }}
            className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-red-400 to-red-500 hover:from-red-500 hover:to-red-600 text-white rounded-lg sm:rounded-xl shadow-lg border-2 border-red-300 flex items-center justify-center transition-all duration-200 hover:shadow-xl active:scale-95 hover:scale-105 text-base sm:text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* Live2D Tororo + 對話框容器 - 左側中間偏下 - 響應式設計 */}
        <div className="absolute left-4 sm:left-8 lg:left-12 bottom-8 sm:bottom-12 lg:bottom-16 w-[200px] h-[300px] sm:w-[250px] sm:h-[350px] lg:w-[350px] lg:h-[450px] pointer-events-none z-20">
          {/* Live2D 模型 */}
          <div
            ref={live2dContainerRef}
            className="w-full h-full"
          />

          {/* Tororo Speech Bubble - 在貓咪頭上 - 響應式寬度 */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none max-w-[180px] sm:max-w-[250px] md:max-w-[350px] lg:max-w-[500px] xl:max-w-[700px]">
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 15 }}
              className="relative"
            >
              {/* 外層光暈效果 */}
              <div className="absolute inset-0 bg-gradient-to-br from-amber-300/30 to-yellow-300/30 rounded-2xl sm:rounded-3xl blur-xl"></div>

              {/* 對話框主體 - 動物森友會白天風格 */}
              <div className="relative bg-gradient-to-br from-amber-50/98 via-yellow-50/98 to-white/98 backdrop-blur-xl rounded-2xl sm:rounded-3xl px-3 py-3 sm:px-6 sm:py-5 shadow-2xl border-2 sm:border-3 border-amber-200/70 inline-block min-w-[150px]">

                {/* 主要文字內容 - 響應式字體 */}
                <div className="relative">
                  <p className="text-xs sm:text-sm font-medium text-amber-900 leading-relaxed break-words"
                     style={{
                       textShadow: '0 1px 3px rgba(255,255,255,0.9)',
                       fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft JhengHei", sans-serif'
                     }}>
                    {displayedText || '\u00A0'}
                    {isTyping && (
                      <motion.span
                        className="inline-block w-0.5 h-3 sm:h-4 bg-amber-400 ml-1 rounded-full"
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                      />
                    )}
                  </p>
                </div>

                {/* 清除按鈕 - 動物森友會風格 */}
                {audioDialogResponse && !isTyping && (
                  <button
                    onClick={() => setAudioDialogResponse('')}
                    className="mt-3 px-3 py-1.5 text-xs font-bold text-amber-700 hover:text-amber-800 bg-white/60 hover:bg-white/90 rounded-full transition-all hover:scale-105 active:scale-95 pointer-events-auto shadow-md border-2 border-amber-200/50"
                  >
                    清除 ✕
                  </button>
                )}

                {/* 底部裝飾線 */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-16 h-1 bg-gradient-to-r from-transparent via-amber-300/60 to-transparent rounded-full"></div>
              </div>

              {/* 對話框尾巴 */}
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
                <div className="relative">
                  {/* 外層邊框 */}
                  <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[14px] border-t-amber-200/70"></div>
                  {/* 內層漸層填充 */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[12px] border-t-yellow-50/98"></div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Center Content Area - 右側置中 - 響應式間距 */}
        <div className="relative z-10 h-full w-full flex items-center justify-end pr-4 sm:pr-8 md:pr-16 lg:pr-24 xl:pr-32">

          <AnimatePresence mode="wait">
            {/* Main Input Screen - 全新簡約設計 - 響應式寬度 */}
            {viewMode === 'main' && (
              <motion.div
                key="main"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl px-4 sm:px-0"
              >
                {/* 輸入框主體 - 動物森友會白天風格 */}
                <div className="relative">
                  {/* 文字輸入區 - 響應式 */}
                  <div className="bg-gradient-to-br from-amber-50/95 to-yellow-50/95 rounded-2xl sm:rounded-3xl shadow-2xl border-2 sm:border-4 border-amber-200/80 overflow-hidden transition-all duration-300 focus-within:border-amber-300 focus-within:shadow-[0_20px_60px_rgba(245,158,11,0.25)]">
                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && (inputText.trim() || uploadedCloudinaryFiles.length > 0) && !isUploading) {
                          e.preventDefault()
                          handleSubmit()
                        }
                      }}
                      placeholder="想記錄什麼呢？✨"
                      className="w-full px-4 py-3 sm:px-6 sm:py-5 bg-white/30 focus:bg-white/50 border-none focus:outline-none text-sm sm:text-base resize-none placeholder-amber-400/70 text-amber-900 font-medium selection:bg-amber-200/50 selection:text-amber-900"
                      style={{
                        minHeight: '80px',
                        maxHeight: '200px',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft JhengHei", sans-serif',
                        WebkitTapHighlightColor: 'transparent'
                      }}
                      autoFocus
                    />

                    {/* 文件預覽 - ChatGPT 風格 */}
                    {uploadedCloudinaryFiles.length > 0 && (
                      <div className="px-6 pb-4 flex flex-wrap gap-2">
                        {uploadedCloudinaryFiles.map((file) => (
                          <div key={file.id} className="inline-flex items-center gap-2 px-3 py-2 bg-white/60 backdrop-blur-sm rounded-xl group hover:bg-white/80 transition-all shadow-sm border-2 border-amber-200/50">
                            <span className="text-xs text-amber-800 font-medium max-w-[120px] truncate">
                              {file.name}
                            </span>
                            {file.status === 'uploading' && (
                              <span className="text-xs text-blue-500 animate-pulse">上傳中...</span>
                            )}
                            {file.status === 'error' && (
                              <span className="text-xs text-red-500">❌</span>
                            )}
                            {file.status === 'completed' && (
                              <span className="text-xs text-green-500">✅</span>
                            )}
                            <button
                              onClick={() => removeFile(file.id)}
                              className="w-5 h-5 flex items-center justify-center text-amber-400 hover:text-red-500 transition-colors text-xs font-bold bg-white/50 rounded-full hover:bg-red-50"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 底部工具欄 - 響應式 */}
                    <div className="px-3 py-3 sm:px-5 sm:py-4 bg-gradient-to-r from-amber-100/80 to-yellow-100/80 backdrop-blur-sm border-t-2 border-amber-200/60 flex items-center justify-between gap-2">
                      {/* 左側工具按鈕 */}
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2 sm:p-2.5 text-base sm:text-xl bg-white/60 hover:bg-white/90 text-amber-600 hover:text-amber-700 rounded-lg sm:rounded-xl transition-all shadow-sm hover:shadow-md hover:scale-105 active:scale-95 border-2 border-amber-200/50"
                          title="上傳檔案"
                        >
                          📎
                        </button>

                        <button
                          onClick={toggleTranscribeRecording}
                          className={`p-2 sm:p-2.5 text-base sm:text-xl rounded-lg sm:rounded-xl transition-all shadow-sm hover:shadow-md border-2 ${
                            isRecordingTranscribe
                              ? 'text-red-500 bg-red-100 border-red-300 animate-pulse'
                              : 'bg-white/60 hover:bg-white/90 text-amber-600 hover:text-amber-700 border-amber-200/50 hover:scale-105 active:scale-95'
                          }`}
                          title={isRecordingTranscribe ? '停止錄音' : '語音轉文字'}
                        >
                          {isRecordingTranscribe ? '⏹️' : '🎤'}
                        </button>

                        <button
                          onClick={toggleDialogRecording}
                          className={`p-2 sm:p-2.5 text-base sm:text-xl rounded-lg sm:rounded-xl transition-all shadow-sm hover:shadow-md border-2 ${
                            isRecordingDialog
                              ? 'text-green-500 bg-green-100 border-green-300 animate-pulse'
                              : 'bg-white/60 hover:bg-white/90 text-amber-600 hover:text-amber-700 border-amber-200/50 hover:scale-105 active:scale-95'
                          }`}
                          title={isRecordingDialog ? '停止對話' : '語音對話'}
                        >
                          {isRecordingDialog ? '⏹️' : '🎧'}
                        </button>

                        <button
                          onClick={takePhoto}
                          className="p-2 sm:p-2.5 text-base sm:text-xl bg-white/60 hover:bg-white/90 text-amber-600 hover:text-amber-700 rounded-lg sm:rounded-xl transition-all shadow-sm hover:shadow-md hover:scale-105 active:scale-95 border-2 border-amber-200/50"
                          title="拍照"
                        >
                          📷
                        </button>
                      </div>

                      {/* 右側提交按鈕 */}
                      <button
                        onClick={handleSubmit}
                        disabled={(!inputText.trim() && uploadedCloudinaryFiles.length === 0) || isUploading}
                        className="px-4 py-2 sm:px-6 sm:py-2.5 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 disabled:from-gray-200 disabled:to-gray-300 text-white disabled:text-gray-400 rounded-lg sm:rounded-xl font-bold transition-all duration-200 active:scale-95 disabled:cursor-not-allowed shadow-lg hover:shadow-xl border-2 border-amber-300 disabled:border-gray-300"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
                          <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Processing Screen - 優化：更友善的等待提示 */}
            {viewMode === 'processing' && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center w-full max-w-2xl"
              >
                <h2 className="text-3xl font-bold text-amber-700 mb-4">
                  白噗噗正在分類中... 🤔
                </h2>
                <p className="text-amber-600 mb-6">
                  預計只需要 3-5 秒就完成囉！☁️✨
                </p>
                <div className="flex items-center justify-center gap-3 mt-6">
                  <div className="w-4 h-4 bg-amber-400 rounded-full animate-bounce shadow-lg" style={{ animationDelay: '0s' }} />
                  <div className="w-4 h-4 bg-yellow-400 rounded-full animate-bounce shadow-lg" style={{ animationDelay: '0.2s' }} />
                  <div className="w-4 h-4 bg-orange-400 rounded-full animate-bounce shadow-lg" style={{ animationDelay: '0.4s' }} />
                </div>

                {/* 優化：顯示提示訊息 */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2 }}
                  className="mt-8 text-sm text-amber-500"
                >
                  <p>💡 小提示：後台會持續深度分析，不會影響你的使用喔～</p>
                </motion.div>
              </motion.div>
            )}

            {/* History Screen */}
            {viewMode === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full max-w-2xl h-[600px] flex flex-col"
              >
                {/* 頭部 */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl font-bold text-amber-800">
                    歷史紀錄
                  </h2>
                  {history.length > 0 && (
                    <button
                      onClick={() => {
                        if (window.confirm('確定要清空所有歷史紀錄嗎？')) {
                          clearAllHistory()
                          play('button_click')
                        }
                      }}
                      className="text-sm text-amber-600 hover:text-red-500 font-medium transition-colors px-4 py-2 rounded-xl hover:bg-red-50 border-2 border-transparent hover:border-red-200"
                    >
                      清空全部
                    </button>
                  )}
                </div>

                {/* 歷史列表 */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                  {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <p className="text-lg text-amber-500 font-medium">還沒有歷史紀錄</p>
                      <p className="text-sm text-amber-400 mt-2">開始記錄你的第一個想法吧！✨</p>
                    </div>
                  ) : (
                    history.map((record, index) => (
                      <motion.div
                        key={record.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-gradient-to-br from-white/90 to-amber-50/90 rounded-2xl p-4 shadow-lg border-2 border-amber-200/50 hover:shadow-xl hover:border-amber-300 transition-all group"
                      >
                        <div className="flex items-start gap-4">
                          {/* 左側：時間 */}
                          <div className="flex-shrink-0 text-center bg-amber-100/50 rounded-xl px-3 py-2">
                            <div className="text-xs text-amber-700 font-medium">
                              {record.timestamp.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })}
                            </div>
                            <div className="text-xs text-amber-600">
                              {record.timestamp.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>

                          {/* 中間：內容 */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-amber-900 font-medium line-clamp-2 mb-2">
                              {record.inputText || '(無文字內容)'}
                            </p>

                            {/* 文件標籤 */}
                            {record.files.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {record.files.map((file, i) => (
                                  <span key={i} className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-lg border border-amber-200/50">
                                    {file.name}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* 結果摘要 - 根據 processingStatus 顯示 */}
                            <div className="text-xs font-medium">
                              {record.processingStatus === 'processing' ? (
                                <div className="space-y-1">
                                  <span className="flex items-center gap-1 text-blue-600">
                                    <span className="inline-block w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                                    後台處理中...
                                  </span>
                                  <p className="text-[10px] text-gray-500">
                                    💡 記憶正在後台創建，請稍後在知識庫查看
                                  </p>
                                </div>
                              ) : record.processingStatus === 'completed' ? (
                                <span className="text-green-600">
                                  ✅ 已創建 {record.memoriesCount || 0} 個記憶
                                </span>
                              ) : record.processingStatus === 'error' ? (
                                <span className="text-red-500">
                                  ❌ 處理失敗
                                </span>
                              ) : record.result?.skipRecording ? (
                                <span className="text-gray-500">
                                  💬 簡單互動（未記錄）
                                </span>
                              ) : (
                                <span className="text-amber-600">
                                  ✨ 處理完成
                                </span>
                              )}
                            </div>
                          </div>

                          {/* 右側：操作按鈕 */}
                          <div className="flex-shrink-0 flex gap-2">
                            {/* 重新載入按鈕 */}
                            <button
                              onClick={() => {
                                setInputText(record.inputText)
                                setViewMode('main')
                                play('button_click')
                                generateAndDisplayResponse('load_history')
                              }}
                              className="px-3 py-2 text-xs font-medium text-amber-600 hover:text-amber-700 bg-white/60 hover:bg-white/90 rounded-xl transition-all border-2 border-amber-200/50 hover:border-amber-300 hover:scale-105"
                              title="重新載入"
                            >
                              載入
                            </button>

                            {/* 刪除按鈕 */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (confirmDelete === record.id) {
                                  deleteHistory(record.id)
                                  play('button_click')
                                  setConfirmDelete(null)
                                  generateAndDisplayResponse('delete_history')
                                } else {
                                  setConfirmDelete(record.id)
                                  setTimeout(() => setConfirmDelete(null), 3000)
                                }
                              }}
                              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border-2 ${
                                confirmDelete === record.id
                                  ? 'bg-red-500 text-white border-red-400'
                                  : 'bg-white/60 text-red-500 border-red-200/50 hover:bg-red-50 hover:border-red-300 hover:scale-105'
                              }`}
                            >
                              {confirmDelete === record.id ? '確定?' : '刪除'}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>

                {/* 返回按鈕 */}
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => {
                      setViewMode('main')
                      play('button_click')
                    }}
                    className="px-8 py-3 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-white rounded-xl font-bold shadow-lg border-2 border-amber-300 transition-all duration-200 hover:shadow-xl active:scale-95 hover:scale-105"
                  >
                    返回記錄
                  </button>
                </div>
              </motion.div>
            )}

            {/* Success Screen */}
            {viewMode === 'success' && processingResult && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="text-center w-full max-w-2xl"
              >
                <h2 className="text-4xl font-bold text-amber-800 mb-6">
                  記住囉！✨
                </h2>

                {/* Result Cards */}
                <div className="bg-gradient-to-br from-amber-50/95 to-yellow-50/95 backdrop-blur-sm rounded-3xl p-8 shadow-xl border-2 border-amber-200/70 mb-6 space-y-4">
                  {/* 顯示分類類別 */}
                  {processingResult.tororoResponse?.category && (
                    <div className="text-center mb-4">
                      <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-100/70 rounded-xl border-2 border-amber-200/50">
                        <span className="text-sm font-bold text-amber-700">分類到</span>
                        <span className="text-base font-bold text-amber-900">{processingResult.tororoResponse.category}</span>
                      </div>
                    </div>
                  )}

                  {/* 顯示記憶標題和詳細資訊 */}
                  {processingResult.memoriesCreated && processingResult.memoriesCreated.length > 0 && (
                    <div className="space-y-3">
                      {processingResult.memoriesCreated.map((memory, index: number) => (
                        <motion.div
                          key={memory.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="bg-white/60 rounded-2xl p-5 border-2 border-amber-200/50 hover:shadow-lg transition-all"
                        >
                          <div className="flex items-start gap-3">
                            {memory.emoji && (
                              <span className="text-3xl flex-shrink-0">{memory.emoji}</span>
                            )}
                            <div className="flex-1 min-w-0">
                              {/* 標題 */}
                              <h3 className="text-lg font-bold text-amber-900 mb-2">{memory.title}</h3>

                              {/* 助手標籤 */}
                              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100/60 rounded-lg mb-2">
                                {memory.assistant.emoji && <span>{memory.assistant.emoji}</span>}
                                <span className="text-sm font-medium text-amber-700">{memory.assistant.nameChinese}</span>
                              </div>

                              {/* 類別 */}
                              {memory.category && (
                                <p className="text-sm text-amber-700 font-medium mb-2">
                                  <span className="font-bold">類別：</span>{memory.category}
                                </p>
                              )}

                              {/* 摘要 */}
                              {memory.summary && (
                                <p className="text-sm text-amber-800 leading-relaxed mb-2">{memory.summary}</p>
                              )}

                              {/* 標籤 */}
                              {memory.tags && memory.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {memory.tags.map((tag: string, i: number) => (
                                    <span key={i} className="px-2.5 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-lg border border-amber-200/50">
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={handleReset}
                    className="px-10 py-4 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-white rounded-xl font-bold text-lg shadow-lg border-2 border-amber-300 transition-all duration-200 hover:shadow-xl active:scale-95 hover:scale-105"
                  >
                    再記錄一個
                  </button>
                  <button
                    onClick={() => {
                      play('button_click')
                      onClose?.()
                    }}
                    className="px-10 py-4 bg-white/80 hover:bg-white text-amber-700 hover:text-amber-800 rounded-xl font-bold text-lg shadow-lg border-2 border-amber-200 hover:border-amber-300 transition-all duration-200 hover:shadow-xl active:scale-95 hover:scale-105"
                  >
                    完成
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Hidden video element for camera capture */}
        <video
          ref={videoRef}
          className="hidden"
          autoPlay
          playsInline
        />
      </motion.div>
    </div>
  )
}
