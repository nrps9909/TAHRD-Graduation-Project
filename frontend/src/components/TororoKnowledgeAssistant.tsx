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
import { useQuery, useLazyQuery } from '@apollo/client'
import { GET_CHIEF_ASSISTANT, GET_KNOWLEDGE_DISTRIBUTION } from '../graphql/knowledge'
import { useSound } from '../hooks/useSound'
import { useSSEChat } from '../hooks/useSSEChat'
import { motion, AnimatePresence } from 'framer-motion'
import { generateTororoResponse, detectEmotion, type UserAction } from '../services/tororoAI'
import { Z_INDEX_CLASSES } from '../constants/zIndex'
import { useAuthStore } from '../stores/authStore'
import { io, Socket } from 'socket.io-client'
import { API_ENDPOINTS, MAX_FILE_SIZE, WS_URL } from '../config/api'

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
  processingStatus?: 'pending' | 'processing' | 'completed' | 'error' | 'rejected' // 處理狀態
  memoriesCount?: number // 創建的記憶數量
  progressMessage?: string // 進度訊息
  elapsedTime?: number // 已處理時間（秒）
  errorMessage?: string // 錯誤訊息
  rejectionReason?: string // Chief Agent 拒絕原因
}

const HISTORY_STORAGE_KEY = 'tororo_knowledge_history'

export default function TororoKnowledgeAssistant({
  modelPath,
  onClose,
}: TororoKnowledgeAssistantProps) {
  // 獲取認證 token 和用戶資訊
  const { token, user } = useAuthStore()

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
  const socketRef = useRef<Socket | null>(null) // WebSocket 連接引用
  const textareaRef = useRef<HTMLTextAreaElement>(null) // Textarea 引用，用於自動調整高度

  // SSE Chat Hook
  const { uploadKnowledge: uploadKnowledgeSSE } = useSSEChat()

  // GraphQL (only for queries)
  useQuery(GET_CHIEF_ASSISTANT) // Load chief assistant data
  const [getDistribution] = useLazyQuery(GET_KNOWLEDGE_DISTRIBUTION)

  // Sound
  const { play, playRandomMeow } = useSound()

  /**
   * 自動調整 textarea 高度（像 ChatGPT 一樣）
   */
  const autoResizeTextarea = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    // 重置高度以獲取正確的 scrollHeight
    textarea.style.height = 'auto'

    // 計算新高度（最小 70px，最大 300px）
    const minHeight = 70
    const maxHeight = 300
    const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight)

    textarea.style.height = `${newHeight}px`
  }, [])

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

  // 自動調整 textarea 高度當輸入文字變化時
  useEffect(() => {
    autoResizeTextarea()
  }, [inputText, autoResizeTextarea])

  /**
   * 同步 pending 狀態的任務 - 檢查它們是否已完成
   */
  const syncPendingTasks = useCallback(async () => {
    const pendingRecords = history.filter(
      record => record.processingStatus === 'pending' && record.distributionId
    )

    if (pendingRecords.length === 0) return

    console.log(`[Tororo] 🔄 檢查 ${pendingRecords.length} 個 pending 任務的狀態`)

    for (const record of pendingRecords) {
      try {
        const { data } = await getDistribution({
          variables: { id: record.distributionId },
          fetchPolicy: 'network-only', // 強制從伺服器獲取最新數據
        })

        if (data?.knowledgeDistribution) {
          const distribution = data.knowledgeDistribution
          const memoriesCount = distribution.memories?.length || 0

          // 如果已經有 memories 創建，說明處理完成了
          if (memoriesCount > 0) {
            console.log(`[Tororo] ✅ Distribution ${record.distributionId} 已完成，創建了 ${memoriesCount} 個記憶`)

            setHistory(prev => {
              const updated = prev.map(r => {
                if (r.distributionId === record.distributionId) {
                  return {
                    ...r,
                    processingStatus: 'completed' as const,
                    memoriesCount
                  }
                }
                return r
              })

              // 保存到 localStorage
              try {
                localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated))
              } catch (error) {
                console.error('更新歷史紀錄失敗:', error)
              }

              return updated
            })
          }
        }
      } catch (error) {
        console.error(`[Tororo] 檢查 distribution ${record.distributionId} 狀態失敗:`, error)
      }
    }
  }, [history, getDistribution])

  // WebSocket 連接 - 監聽任務完成事件
  // 🔧 修復：避免反覆斷開重連，只在 userId 變化時重新建立連接
  useEffect(() => {
    const userId = token ? user?.id : 'guest-user-id'

    // 如果沒有 userId，不建立連接
    if (!userId || userId === 'guest-user-id') {
      console.log('[Tororo] 等待用戶認證，暫不建立 WebSocket 連接')
      return
    }

    const newSocket = io(WS_URL, {
      // ⚠️ Cloudflare 問題：WebSocket 升級會失敗，只使用 polling
      transports: ['polling'], // 禁用 WebSocket，只用 polling
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      // 超時時間必須大於後端 pingInterval (25秒)，避免過早斷線
      timeout: 60000,
      // 允許升級到 WebSocket（Nginx 已配置支持）
      upgrade: true,
      rememberUpgrade: true,
      // 自動重連時使用相同的 transport
      forceNew: false
    })

    newSocket.on('connect', () => {
      console.log('[Tororo] WebSocket connected ✅')
      if (userId) {
        newSocket.emit('join-room', { roomId: userId })
      }
      // 連接後立即同步 pending 任務狀態
      setTimeout(() => syncPendingTasks(), 1000)
    })

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('[Tororo] WebSocket reconnected after', attemptNumber, 'attempts')
      if (userId) {
        newSocket.emit('join-room', { roomId: userId })
      }
      // 重連後同步 pending 任務狀態
      setTimeout(() => syncPendingTasks(), 1000)
    })

    newSocket.on('disconnect', (reason) => {
      console.log('[Tororo] WebSocket disconnected:', reason)
    })

    // 監聽任務開始事件
    newSocket.on('task-start', (data: {
      taskId: string
      distributionId: string
      progress: { message: string }
    }) => {
      console.log('[Tororo] 收到 task-start 事件:', data)

      // 更新對應的歷史記錄狀態為 processing
      setHistory(prev => {
        const updated = prev.map(record => {
          if (record.distributionId === data.distributionId && record.processingStatus !== 'completed') {
            return {
              ...record,
              processingStatus: 'processing' as const,
              progressMessage: data.progress.message
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
    })

    // 監聽任務進度更新事件
    newSocket.on('task-progress', (data: {
      taskId: string
      distributionId: string
      progress: { current: number; total: number; message: string }
      elapsedTime: number
    }) => {
      console.log('[Tororo] 收到 task-progress 事件:', data)

      // 更新對應的歷史記錄進度資訊
      setHistory(prev => {
        const updated = prev.map(record => {
          if (record.distributionId === data.distributionId && record.processingStatus === 'processing') {
            return {
              ...record,
              progressMessage: data.progress.message,
              elapsedTime: data.elapsedTime
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

    socketRef.current = newSocket

    return () => {
      newSocket.disconnect()
    }
  }, [token, user?.id, play, syncPendingTasks])

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

    // 為每個檔案建立初始狀態並驗證大小
    const newFiles = Array.from(files).map(file => {
      // 驗證文件大小
      if (file.size > MAX_FILE_SIZE) {
        alert(`檔案 "${file.name}" 過大，最大限制 10MB`)
        return {
          id: `file-${Date.now()}-${Math.random()}`,
          name: file.name,
          url: '',
          type: file.type,
          size: file.size,
          status: 'error' as const,
          progress: 0
        }
      }

      return {
        id: `file-${Date.now()}-${Math.random()}`,
        name: file.name,
        url: '',
        type: file.type,
        size: file.size,
        status: 'uploading' as const,
        progress: 0
      }
    })

    setUploadedCloudinaryFiles(prev => [...prev, ...newFiles])

    // ⚡ 優化：並發上傳所有檔案
    const uploadPromises = Array.from(files).map(async (file, index) => {
      const fileId = newFiles[index].id

      // 如果文件已標記為錯誤（超過大小限制），跳過上傳
      if (newFiles[index].status === 'error') {
        return { success: false, fileId }
      }

      try {
        const formData = new FormData()
        formData.append('files', file)

        // 準備認證標頭
        const headers: HeadersInit = {}
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }

        const response = await fetch(API_ENDPOINTS.UPLOAD_MULTIPLE, {
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
    const currentInput = inputText
    const currentFiles = [...uploadedCloudinaryFiles]

    // 🎯 1. 立即創建歷史記錄（pending 狀態）- 優先考慮用戶體驗
    const recordId = `record-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const filesForHistory = currentFiles
      .filter(f => f.status === 'completed')
      .map(f => ({ name: f.name, type: f.type }))

    const newRecord: HistoryRecord = {
      id: recordId,
      inputText: currentInput,
      files: filesForHistory,
      timestamp: new Date(),
      processingStatus: 'pending' // 初始狀態：等待處理
    }

    // 立即顯示在歷史記錄中
    setHistory(prev => {
      const updated = [newRecord, ...prev].slice(0, 50) // 只保留最近 50 筆
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated))
      } catch (error) {
        console.error('保存歷史記錄失敗:', error)
      }
      return updated
    })

    // 🎯 2. 立即清空輸入，讓用戶可以繼續輸入下一個
    setInputText('')
    setUploadedCloudinaryFiles([])
    play('message_sent')

    // 重置 textarea 高度
    if (textareaRef.current) {
      textareaRef.current.style.height = '70px'
    }

    // 顯示簡短的提交確認（不阻塞UI）
    setAudioDialogResponse('已送出！可以繼續輸入下一個～ ☁️✨')

    // 🔥 3. 異步處理（不阻塞UI）
    ;(async () => {
      try {
        // 1️⃣ 使用已上傳的 Cloudinary URLs
        const uploadedFileUrls = currentFiles
          .filter(f => f.status === 'completed')
          .map(f => ({
            url: f.url,
            name: f.name,
            type: f.type.startsWith('image/') ? 'image' : 'file',
            size: f.size // 新增：傳遞檔案大小資訊
          }))

        // 2️⃣ 檢查輸入文字中是否包含 URL
        const urlRegex = /(https?:\/\/[^\s]+)/g
        const foundUrls = currentInput.match(urlRegex) || []
        const textWithoutUrls = currentInput.replace(urlRegex, '').trim()
        const links = foundUrls.map(url => ({
          url: url,
          title: url.includes('youtube.com') || url.includes('youtu.be') ? 'YouTube 影片' : '連結'
        }))

        // 3️⃣ 準備 SSE 輸入
        const input = {
          content: textWithoutUrls || (links.length > 0 ? '分享連結' : '快速記錄'),
          files: uploadedFileUrls,
          links: links.length > 0 ? links : undefined,
          contentType: uploadedFileUrls.some(f => f.type === 'image') ? 'IMAGE' : uploadedFileUrls.length > 0 ? 'DOCUMENT' : links.length > 0 ? 'LINK' : 'TEXT',
        }

        // 用於累積打字機效果的文字
        let accumulatedResponse = ''

        // 調用 SSE 上傳
        await new Promise<{
          distribution: { id: string }
          backgroundProcessing: boolean
          skipRecording?: boolean
          tororoResponse?: { shouldRecord?: boolean; warmMessage?: string }
          memoriesCreated: never[]
          createdMemories: never[]
        }>((resolve, reject) => {
          uploadKnowledgeSSE(input, {
            onChunk: (chunk) => {
              // 累積回應文字並顯示打字機效果
              accumulatedResponse += chunk
              setAudioDialogResponse(accumulatedResponse)
            },
            onComplete: (data) => {
              // SSE 完成，返回結果
              resolve({
                distribution: { id: data.distributionId || '' },
                backgroundProcessing: true,
                skipRecording: data.skipRecording,
                tororoResponse: data.tororoResponse,
                memoriesCreated: [],
                createdMemories: []
              })
            },
            onError: (error) => {
              reject(new Error(error))
            }
          })
        }).then(result => {
          const tororoResponse = result.tororoResponse

          // === 處理 Chief Agent 拒絕的情況 ===
          if (result.skipRecording || tororoResponse?.shouldRecord === false) {
            setAudioDialogResponse(tororoResponse?.warmMessage || '這個就不記錄囉～ ☁️')
            play('notification')

            // 更新歷史記錄狀態為 rejected
            setHistory(prev => {
              const updated = prev.map(record => {
                if (record.id === recordId) {
                  return {
                    ...record,
                    processingStatus: 'rejected' as const,
                    rejectionReason: tororoResponse?.warmMessage || '此內容不需要記錄'
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
            return
          }

          // === 正常記錄流程 ===
          // 更新歷史記錄，添加 distributionId 和結果
          setHistory(prev => {
            const updated = prev.map(record => {
              if (record.id === recordId) {
                // 明確指定類型，避免 TypeScript 類型推斷問題
                const newStatus: 'pending' | 'completed' = result.backgroundProcessing ? 'pending' : 'completed'
                const updatedRecord: HistoryRecord = {
                  ...record,
                  result,
                  distributionId: result.distribution?.id,
                  processingStatus: newStatus,
                  memoriesCount: result.backgroundProcessing ? undefined : result.createdMemories?.length || 0
                }
                return updatedRecord
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

          playRandomMeow()
          play('notification')
          console.log('✅ 知識已加入處理隊列:', result.distribution?.id)
        })
      } catch (error) {
        console.error('❌ 上傳失敗:', error)
        const errorMessage = error instanceof Error ? error.message : '未知錯誤'
        setAudioDialogResponse('哎呀，出錯了！可以再試一次～ ☁️')
        play('notification')

        // 更新歷史記錄狀態為 error，並記錄錯誤原因
        setHistory(prev => {
          const updated = prev.map(record => {
            if (record.id === recordId) {
              return {
                ...record,
                processingStatus: 'error' as const,
                errorMessage: errorMessage
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
      }
    })()
  }, [inputText, uploadedCloudinaryFiles, uploadKnowledgeSSE, play, playRandomMeow, isUploading])

  const handleReset = useCallback(() => {
    setViewMode('main')
    setInputText('')
    setUploadedCloudinaryFiles([])
    setProcessingResult(null)
    play('button_click')

    // 重置 textarea 高度
    if (textareaRef.current) {
      textareaRef.current.style.height = '70px'
    }
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

              // 調用後端 API 進行語音轉文字
              const response = await fetch(API_ENDPOINTS.SPEECH_TO_TEXT, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(token && { 'Authorization': `Bearer ${token}` })
                },
                body: JSON.stringify({
                  audioData: base64Audio,
                  mimeType: 'audio/webm'
                }),
              })

              if (response.ok) {
                const data = await response.json()
                const transcribedText = data.text || ''

                if (transcribedText) {
                  setInputText(prev => prev + (prev ? '\n' : '') + transcribedText)
                  play('upload_success')
                  // 調整 textarea 高度
                  setTimeout(() => autoResizeTextarea(), 0)
                }
              } else {
                const errorData = await response.json()
                console.error('語音識別失敗:', errorData)
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

              // 調用後端 API 進行語音對話
              const response = await fetch(API_ENDPOINTS.AUDIO_DIALOG, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(token && { 'Authorization': `Bearer ${token}` })
                },
                body: JSON.stringify({
                  audioData: base64Audio,
                  mimeType: 'audio/webm',
                  systemPrompt: '你是白噗噗，一隻溫柔貼心的白貓知識助手。請仔細聆聽用戶的語音，理解他們的情緒和語氣，並給予溫暖、貼心的回應。'
                }),
              })

              if (response.ok) {
                const data = await response.json()
                const responseText = data.text || ''

                if (responseText) {
                  setAudioDialogResponse(responseText)
                  play('upload_success')
                  playRandomMeow()
                }
              } else {
                const errorData = await response.json()
                console.error('語音對話失敗:', errorData)
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
                
                const response = await fetch(API_ENDPOINTS.UPLOAD_MULTIPLE, {
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
          <div className="flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-purple-900/80 to-indigo-900/80 backdrop-blur-md rounded-xl sm:rounded-2xl px-3 py-2 sm:px-5 sm:py-3 shadow-lg border-2 border-purple-500/60">
            <div>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">白噗噗</h1>
              <p className="text-xs sm:text-sm text-gray-700">甚麼都可以跟我說!</p>
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
            className="relative w-10 h-10 sm:w-12 sm:h-12 bg-white/10 hover:bg-white/20 text-gray-900 hover:text-gray-900 rounded-lg sm:rounded-xl shadow-lg border-2 border-gray-300 flex items-center justify-center transition-all duration-200 hover:shadow-xl active:scale-95 hover:scale-105 text-lg sm:text-xl"
            title="查看歷史紀錄"
          >
            📋
            {history.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center font-bold shadow-md">
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

          {/* Tororo Speech Bubble - 精確頭部定位版本 */}
          {/*
            🎯 精確定位系統說明：

            Live2D 容器設定：
            - 容器大小: 200x300px (小) → 250x350px (中) → 350x450px (大)
            - 底部定位: bottom-8/12/16

            Live2D 模型設定 (見 line 498):
            - anchor: (0.5, 1) - 底部中心對齊
            - position: (containerWidth/2, containerHeight*0.95)
            - scale: 動態縮放

            對話框定位邏輯：
            1. 貓咪模型從容器底部向上延伸，頭部約在容器頂部 5-15% 位置
            2. 對話框需要定位在頭部上方，留出適當間距
            3. 使用 CSS clamp() 實現響應式定位，適應所有屏幕尺寸

            定位參數：
            - 小屏幕 (<640px): 頂部向下 10px (頭部較低)
            - 中屏幕 (640-1024px): 頂部向下 6-8% (動態計算)
            - 大屏幕 (>1024px): 頂部向下最多 35px (頭部較高)
          */}
          <div
            className="absolute pointer-events-none"
            style={{
              // 🎯 垂直定位：精確對齊貓咪頭部
              // clamp(最小值, 首選值, 最大值)
              // - 最小: 10px (防止頂部溢出)
              // - 首選: 6% (相對於容器高度，適應大多數情況)
              // - 最大: 35px (大屏幕時的最大偏移)
              top: 'clamp(10px, 6%, 35px)',

              // 🎯 水平定位：居中對齊貓咪頭部
              left: '50%',
              transform: 'translateX(-50%)',

              // 📏 響應式寬度：確保對話框不會太寬或太窄
              width: 'clamp(200px, 90vw, 440px)',
              maxWidth: '440px',

              // 🎨 添加微妙的浮動動畫效果
              // 使用 CSS 變量以便後續可通過 motion 控制
              transition: 'top 0.3s ease-out',
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 15 }}
              className="relative"
            >
              {/* 對話框主體 - 精簡動森風格 */}
              <div
                className="relative rounded-xl md:rounded-2xl px-3 py-2 md:px-4 md:py-3 shadow-lg inline-block min-w-[160px]"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 248, 231, 0.98) 0%, rgba(255, 243, 224, 0.96) 100%)',
                  backdropFilter: 'blur(12px)',
                  border: '1.5px solid rgba(251, 191, 36, 0.4)',
                }}
              >
                {/* 頂部微光效果 */}
                <div
                  className="absolute top-0 left-0 right-0 h-1/2 rounded-t-xl md:rounded-t-2xl pointer-events-none"
                  style={{
                    background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.4) 0%, transparent 100%)',
                  }}
                />

                {/* 文字內容 */}
                <div className="relative">
                  <p
                    className="text-xs md:text-sm font-medium text-gray-900 leading-relaxed break-words"
                    style={{
                      textShadow: '0 1px 2px rgba(255,255,255,0.8)',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft JhengHei", sans-serif'
                    }}
                  >
                    {displayedText || '\u00A0'}
                    {isTyping && (
                      <motion.span
                        className="inline-block w-0.5 h-3 md:h-3.5 bg-amber-500 ml-1 rounded-full"
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                      />
                    )}
                  </p>
                </div>

                {/* 清除按鈕 */}
                {audioDialogResponse && !isTyping && (
                  <button
                    onClick={() => setAudioDialogResponse('')}
                    className="mt-2 px-2.5 py-1 text-[10px] md:text-xs font-bold text-white hover:text-white bg-purple-500/70 hover:bg-purple-600 rounded-full transition-all hover:scale-105 active:scale-95 pointer-events-auto shadow-sm border border-purple-300/60"
                  >
                    清除 ✕
                  </button>
                )}
              </div>

              {/* 對話框尾巴 - 指向貓咪頭部 */}
              <div
                className="absolute left-1/2 -translate-x-1/2"
                style={{
                  // 尾巴從對話框底部延伸出來
                  bottom: '-14px',
                }}
              >
                {/* 外層陰影/邊框 */}
                <div className="relative">
                  <div
                    className="w-0 h-0"
                    style={{
                      borderLeft: '12px solid transparent',
                      borderRight: '12px solid transparent',
                      borderTop: '14px solid rgba(251, 191, 36, 0.4)',
                    }}
                  />
                  {/* 內層填充 */}
                  <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0"
                    style={{
                      borderLeft: '11px solid transparent',
                      borderRight: '11px solid transparent',
                      borderTop: '13px solid rgba(255, 248, 231, 0.98)',
                    }}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Center Content Area - 右側置中 - 優化響應式間距 */}
        <div className="relative z-10 h-full w-full flex items-center justify-end px-3 sm:px-6 md:pr-12 lg:pr-20 xl:pr-28">

          <AnimatePresence mode="wait">
            {/* Main Input Screen - 重新設計的精簡版 */}
            {viewMode === 'main' && (
              <motion.div
                key="main"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg"
              >
                {/* 輸入框主體 - 精簡動森風格 */}
                <div className="relative">
                  <div
                    className="rounded-xl md:rounded-2xl shadow-lg overflow-hidden transition-all duration-300 focus-within:shadow-xl focus-within:shadow-amber-200/50"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 248, 231, 0.98) 0%, rgba(255, 243, 224, 0.95) 100%)',
                      backdropFilter: 'blur(12px)',
                      border: '2px solid rgba(251, 191, 36, 0.3)',
                    }}
                  >
                    {/* 輸入區域 */}
                    <textarea
                      ref={textareaRef}
                      value={inputText}
                      onChange={(e) => {
                        setInputText(e.target.value)
                        autoResizeTextarea()
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && (inputText.trim() || uploadedCloudinaryFiles.length > 0) && !isUploading) {
                          e.preventDefault()
                          handleSubmit()
                        }
                      }}
                      placeholder="想記錄些什麼呢？✨"
                      className="w-full px-3 py-2.5 md:px-4 md:py-3 bg-white/40 focus:bg-white/60 border-none focus:outline-none text-sm md:text-base resize-none placeholder-gray-500 text-gray-900 font-medium selection:bg-purple-200/50 transition-colors"
                      style={{
                        height: '70px',
                        overflowY: 'hidden',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft JhengHei", sans-serif',
                      }}
                      autoFocus
                    />

                    {/* 文件預覽 - 精簡版 */}
                    {uploadedCloudinaryFiles.length > 0 && (
                      <div className="px-3 pb-2 md:px-4 md:pb-3 flex flex-wrap gap-1.5">
                        {uploadedCloudinaryFiles.map((file) => (
                          <div
                            key={file.id}
                            className="inline-flex items-center gap-1.5 px-2 py-1 md:px-2.5 md:py-1.5 bg-white/10 rounded-lg hover:bg-white/20 transition-all shadow-sm border border-white/30"
                          >
                            <span className="text-xs text-gray-900 font-medium max-w-[100px] md:max-w-[150px] truncate">
                              {file.name}
                            </span>
                            {file.status === 'uploading' && (
                              <span className="text-xs text-blue-600 animate-pulse">⏳</span>
                            )}
                            {file.status === 'error' && (
                              <span className="text-xs text-red-600">❌</span>
                            )}
                            {file.status === 'completed' && (
                              <span className="text-xs text-green-600">✅</span>
                            )}
                            <button
                              onClick={() => removeFile(file.id)}
                              className="w-4 h-4 flex items-center justify-center text-gray-900 hover:text-red-600 transition-colors text-[10px] font-bold bg-white/20 rounded-full hover:bg-red-500/20"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 底部工具欄 - 簡化版 */}
                    <div
                      className="px-2.5 py-2 md:px-3 md:py-2.5 flex items-center justify-between gap-2"
                      style={{
                        background: 'linear-gradient(to right, rgba(251, 191, 36, 0.12) 0%, rgba(245, 158, 11, 0.1) 100%)',
                        borderTop: '1px solid rgba(251, 191, 36, 0.2)',
                      }}
                    >
                      {/* 工具按鈕組 */}
                      <div className="flex items-center gap-1 md:gap-1.5">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="p-1.5 md:p-2 text-base md:text-lg bg-white/10 hover:bg-white/20 text-gray-900 hover:text-gray-900 rounded-lg transition-all hover:scale-105 active:scale-95 border border-gray-300"
                          title="上傳檔案"
                        >
                          📎
                        </button>

                        <button
                          onClick={toggleTranscribeRecording}
                          className={`p-1.5 md:p-2 text-base md:text-lg rounded-lg transition-all border ${
                            isRecordingTranscribe
                              ? 'text-red-500 bg-red-100 border-red-300 animate-pulse'
                              : 'bg-white/10 hover:bg-white/20 text-gray-900 hover:text-gray-900 border-gray-300 hover:scale-105 active:scale-95'
                          }`}
                          title={isRecordingTranscribe ? '停止錄音' : '語音轉文字'}
                        >
                          {isRecordingTranscribe ? '⏹️' : '🎤'}
                        </button>

                        <button
                          onClick={toggleDialogRecording}
                          className={`p-1.5 md:p-2 text-base md:text-lg rounded-lg transition-all border ${
                            isRecordingDialog
                              ? 'text-green-500 bg-green-100 border-green-300 animate-pulse'
                              : 'bg-white/10 hover:bg-white/20 text-gray-900 hover:text-gray-900 border-gray-300 hover:scale-105 active:scale-95'
                          }`}
                          title={isRecordingDialog ? '停止對話' : '語音對話'}
                        >
                          {isRecordingDialog ? '⏹️' : '🎧'}
                        </button>

                        <button
                          onClick={takePhoto}
                          className="p-1.5 md:p-2 text-base md:text-lg bg-white/10 hover:bg-white/20 text-gray-900 hover:text-gray-900 rounded-lg transition-all hover:scale-105 active:scale-95 border border-gray-300"
                          title="拍照"
                        >
                          📷
                        </button>
                      </div>

                      {/* 發送按鈕 */}
                      <button
                        onClick={handleSubmit}
                        disabled={(!inputText.trim() && uploadedCloudinaryFiles.length === 0) || isUploading}
                        className="px-3 py-1.5 md:px-4 md:py-2 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 disabled:from-gray-200 disabled:to-gray-300 text-white disabled:text-gray-400 rounded-lg font-bold text-sm md:text-base transition-all active:scale-95 disabled:cursor-not-allowed shadow-md hover:shadow-lg border border-amber-500/30 disabled:border-gray-300 flex items-center gap-1.5"
                      >
                        <span className="hidden md:inline">發送</span>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
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
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  白噗噗正在分類中... 🤔
                </h2>
                <p className="text-gray-900/80 mb-6">
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
                  className="mt-8 text-sm text-gray-900/70"
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
                  <h2 className="text-3xl font-bold text-gray-900">
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
                      className="text-sm text-gray-900 hover:text-red-300 font-medium transition-colors px-4 py-2 rounded-xl hover:bg-red-500/20 border-2 border-transparent hover:border-red-300"
                    >
                      清空全部
                    </button>
                  )}
                </div>

                {/* 歷史列表 */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                  {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <p className="text-lg text-gray-900 font-medium">還沒有歷史紀錄</p>
                      <p className="text-sm text-gray-900/70 mt-2">開始記錄你的第一個想法吧！✨</p>
                    </div>
                  ) : (
                    history.map((record, index) => (
                      <motion.div
                        key={record.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-gradient-to-br from-white/10 to-white/5 rounded-2xl p-4 shadow-lg border-2 border-white/20 hover:shadow-xl hover:border-white/30 transition-all group"
                      >
                        <div className="flex items-start gap-4">
                          {/* 左側：時間 */}
                          <div className="flex-shrink-0 text-center bg-white/10 rounded-xl px-3 py-2">
                            <div className="text-xs text-gray-900 font-medium">
                              {record.timestamp.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })}
                            </div>
                            <div className="text-xs text-gray-900/70">
                              {record.timestamp.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>

                          {/* 中間：內容 */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 font-medium line-clamp-2 mb-2">
                              {record.inputText || '(無文字內容)'}
                            </p>

                            {/* 文件標籤 */}
                            {record.files.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {record.files.map((file, i) => (
                                  <span key={i} className="text-xs bg-purple-500/30 text-gray-900 px-2 py-1 rounded-lg border border-purple-300/50">
                                    {file.name}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* 結果摘要 - 根據 processingStatus 顯示 */}
                            <div className="text-xs font-medium">
                              {record.processingStatus === 'pending' ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="flex items-center gap-1 text-gray-900/70">
                                      <span className="inline-block w-2 h-2 bg-white/50 rounded-full animate-pulse"></span>
                                      等待處理...
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-gray-900/60">
                                    📋 已送出，等待後台開始處理
                                  </p>
                                </div>
                              ) : record.processingStatus === 'processing' ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="flex items-center gap-1 text-blue-300">
                                      <span className="inline-block w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                                      後台處理中...
                                    </span>
                                    {record.elapsedTime !== undefined && record.elapsedTime > 0 && (
                                      <span className="text-[10px] font-mono text-blue-300 bg-blue-500/20 px-1.5 py-0.5 rounded">
                                        {record.elapsedTime}秒
                                      </span>
                                    )}
                                  </div>
                                  {record.progressMessage && (
                                    <p className="text-[10px] text-blue-300">
                                      {record.progressMessage}
                                    </p>
                                  )}
                                  <p className="text-[10px] text-gray-900/60">
                                    💡 記憶正在後台創建，請稍後在知識庫查看
                                  </p>
                                </div>
                              ) : record.processingStatus === 'completed' ? (
                                <span className="text-green-300">
                                  ✅ 已創建 {record.memoriesCount || 0} 個記憶
                                </span>
                              ) : record.processingStatus === 'rejected' ? (
                                <div className="space-y-1">
                                  <span className="text-orange-300">
                                    🚫 不需要記錄
                                  </span>
                                  {record.rejectionReason && (
                                    <p className="text-[10px] text-orange-300 mt-1">
                                      {record.rejectionReason}
                                    </p>
                                  )}
                                </div>
                              ) : record.processingStatus === 'error' ? (
                                <div className="space-y-1">
                                  <span className="text-red-300">
                                    ❌ 處理失敗
                                  </span>
                                  {record.errorMessage && (
                                    <p className="text-[10px] text-red-300 mt-1">
                                      {record.errorMessage}
                                    </p>
                                  )}
                                </div>
                              ) : record.result?.skipRecording ? (
                                <span className="text-gray-900/60">
                                  💬 簡單互動（未記錄）
                                </span>
                              ) : (
                                <span className="text-gray-900">
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
                              className="px-3 py-2 text-xs font-medium text-white hover:text-white bg-purple-500/60 hover:bg-purple-500/90 rounded-xl transition-all border-2 border-purple-300/50 hover:border-purple-300 hover:scale-105"
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
                                  : 'bg-white/10 text-red-300 border-red-300/50 hover:bg-red-500/20 hover:border-red-300 hover:scale-105'
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
                <h2 className="text-4xl font-bold text-gray-900 mb-6">
                  記住囉！✨
                </h2>

                {/* Result Cards */}
                <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-3xl p-8 shadow-xl border-2 border-white/20 mb-6 space-y-4">
                  {/* 顯示分類類別 */}
                  {processingResult.tororoResponse?.category && (
                    <div className="text-center mb-4">
                      <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-500/30 rounded-xl border-2 border-purple-300/50">
                        <span className="text-sm font-bold text-gray-900">分類到</span>
                        <span className="text-base font-bold text-gray-900">{processingResult.tororoResponse.category}</span>
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
                          className="bg-white/10 rounded-2xl p-5 border-2 border-white/20 hover:shadow-lg transition-all"
                        >
                          <div className="flex items-start gap-3">
                            {memory.emoji && (
                              <span className="text-3xl flex-shrink-0">{memory.emoji}</span>
                            )}
                            <div className="flex-1 min-w-0">
                              {/* 標題 */}
                              <h3 className="text-lg font-bold text-gray-900 mb-2">{memory.title}</h3>

                              {/* 助手標籤 */}
                              <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/30 rounded-lg mb-2">
                                {memory.assistant.emoji && <span>{memory.assistant.emoji}</span>}
                                <span className="text-sm font-medium text-gray-900">{memory.assistant.nameChinese}</span>
                              </div>

                              {/* 類別 */}
                              {memory.category && (
                                <p className="text-sm text-gray-900 font-medium mb-2">
                                  <span className="font-bold">類別：</span>{memory.category}
                                </p>
                              )}

                              {/* 摘要 */}
                              {memory.summary && (
                                <p className="text-sm text-gray-700 leading-relaxed mb-2">{memory.summary}</p>
                              )}

                              {/* 標籤 */}
                              {memory.tags && memory.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {memory.tags.map((tag: string, i: number) => (
                                    <span key={i} className="px-2.5 py-1 text-xs font-medium bg-purple-500/30 text-gray-900 rounded-lg border border-purple-300/50">
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
                    className="px-10 py-4 bg-white/10 hover:bg-white/20 text-gray-900 hover:text-gray-900 rounded-xl font-bold text-lg shadow-lg border-2 border-gray-300 hover:border-gray-400 transition-all duration-200 hover:shadow-xl active:scale-95 hover:scale-105"
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
