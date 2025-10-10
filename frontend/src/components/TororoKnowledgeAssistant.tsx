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

// Register PIXI globally for Live2D
;(window as any).PIXI = PIXI

interface TororoKnowledgeAssistantProps {
  modelPath: string
  onClose?: () => void
}

type ViewMode = 'main' | 'processing' | 'success' | 'history'

interface HistoryRecord {
  id: string
  inputText: string
  files: { name: string; type: string }[]
  timestamp: Date
  result?: any
}

const HISTORY_STORAGE_KEY = 'tororo_knowledge_history'

export default function TororoKnowledgeAssistant({
  modelPath,
  onClose,
}: TororoKnowledgeAssistantProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('main')
  const [inputText, setInputText] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isRecordingTranscribe, setIsRecordingTranscribe] = useState(false) // 語音轉文字
  const [isRecordingDialog, setIsRecordingDialog] = useState(false) // 語音對話
  const [processingResult, setProcessingResult] = useState<any>(null)
  const [audioDialogResponse, setAudioDialogResponse] = useState<string>('')
  const [displayedText, setDisplayedText] = useState<string>('')
  const [isTyping, setIsTyping] = useState(false)
  const [history, setHistory] = useState<HistoryRecord[]>([])
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [conversationHistory, setConversationHistory] = useState<string[]>([]) // 對話歷史

  // Refs
  const live2dContainerRef = useRef<HTMLDivElement | null>(null)
  const appRef = useRef<PIXI.Application | null>(null)
  const modelRef = useRef<Live2DModel | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const aiGenerationAbortControllerRef = useRef<AbortController | null>(null)
  const inputDebounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // GraphQL
  const [uploadKnowledge] = useMutation(UPLOAD_KNOWLEDGE)
  useQuery(GET_CHIEF_ASSISTANT) // Load chief assistant data

  // Sound
  const { play, playRandomMeow } = useSound()

  /**
   * 生成 AI 回應並顯示（優化版本，支援取消）
   */
  const generateAndDisplayResponse = useCallback(async (action: UserAction, additionalContext?: any) => {
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
        fileCount: uploadedFiles.length,
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
  }, [inputText, uploadedFiles.length, history.length, conversationHistory])

  // 載入歷史紀錄
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        const historyWithDates = parsed.map((record: any) => ({
          ...record,
          timestamp: new Date(record.timestamp)
        }))
        setHistory(historyWithDates)
      }
    } catch (error) {
      console.error('載入歷史紀錄失敗:', error)
    }
  }, [])

  // 儲存歷史紀錄
  const saveToHistory = (input: string, files: File[], result?: any) => {
    const record: HistoryRecord = {
      id: `history_${Date.now()}`,
      inputText: input,
      files: files.map(f => ({ name: f.name, type: f.type })),
      timestamp: new Date(),
      result
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
  }

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

          // 縮小到原來的一半：1.8 -> 0.9
          const targetScale = Math.min(containerWidth / 2048, containerHeight / 2048) * 0.9
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
    if (!inputText.trim() && uploadedFiles.length === 0) return

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
  }, [inputText, uploadedFiles.length, viewMode])

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

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setUploadedFiles(prev => {
        const newFiles = [...prev, ...Array.from(files)]
        // 生成 AI 回應
        generateAndDisplayResponse('upload_file', { fileCount: newFiles.length })
        return newFiles
      })
      play('notification')
    }
  }, [play, generateAndDisplayResponse])

  const removeFile = useCallback((index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
    play('button_click')
  }, [play])

  const handleSubmit = useCallback(async () => {
    if (!inputText.trim() && uploadedFiles.length === 0) return

    setViewMode('processing')
    play('message_sent')

    // 生成處理中的 AI 回應
    generateAndDisplayResponse('processing')

    try {
      // 檢查輸入文字中是否包含 URL（YouTube, 文章連結等）
      const urlRegex = /(https?:\/\/[^\s]+)/g
      const foundUrls = inputText.match(urlRegex) || []

      // 分離 URL 和純文字
      const textWithoutUrls = inputText.replace(urlRegex, '').trim()
      const links = foundUrls.map(url => ({
        url: url,
        title: url.includes('youtube.com') || url.includes('youtu.be') ? 'YouTube 影片' : '連結'
      }))

      const input: UploadKnowledgeInput = {
        content: textWithoutUrls || (links.length > 0 ? '分享連結' : '快速記錄'),
        files: uploadedFiles.map(file => ({
          url: URL.createObjectURL(file),
          name: file.name,
          type: file.type.startsWith('image/') ? 'image' : 'file',
        })),
        links: links.length > 0 ? links : undefined,
        contentType: uploadedFiles.some(f => f.type.startsWith('image/')) ? 'IMAGE' : uploadedFiles.length > 0 ? 'DOCUMENT' : links.length > 0 ? 'LINK' : 'TEXT',
      }

      const { data } = await uploadKnowledge({ variables: { input } })

      if (data?.uploadKnowledge) {
        const result = data.uploadKnowledge
        const tororoResponse = result.tororoResponse

        // === 檢查是否為簡單互動（不記錄）===
        if (result.skipRecording || tororoResponse?.shouldRecord === false) {
          // 不儲存歷史，只顯示白噗噗的友善回應
          setDisplayedText(tororoResponse?.warmMessage || '收到了～ ☁️')
          setIsTyping(false)

          // 回到主畫面，不顯示成功頁面
          setViewMode('main')
          setInputText('') // 清空輸入
          setUploadedFiles([]) // 清空檔案
          play('notification') // 使用通知音效而非成功音效
          return
        }

        // === 正常記錄流程 ===
        setProcessingResult(result)
        saveToHistory(inputText, uploadedFiles, result) // 儲存到歷史

        // 立即顯示白噗噗的溫暖回應（只顯示溫馨訊息，不顯示技術性分類）
        if (tororoResponse) {
          // 只顯示白噗噗的溫暖回應，不顯示分類和摘要
          setDisplayedText(tororoResponse.warmMessage)
          setIsTyping(false)
        }

        setViewMode('success')
        play('upload_success')
        playRandomMeow()
      }
    } catch (error) {
      console.error('上傳失敗:', error)
      alert('上傳失敗，請稍後再試')
      setViewMode('main')
    }
  }, [inputText, uploadedFiles, uploadKnowledge, play, generateAndDisplayResponse, saveToHistory, history.length, playRandomMeow])

  const handleReset = useCallback(() => {
    setViewMode('main')
    setInputText('')
    setUploadedFiles([])
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

          canvas.toBlob((blob) => {
            if (blob) {
              const photoFile = new File([blob], `照片_${Date.now()}.jpg`, { type: 'image/jpeg' })
              setUploadedFiles(prev => [...prev, photoFile])
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
        {/* 頂部標題區 - 白噗噗名稱 - 動物森友會白天風格 */}
        <div className="absolute top-8 left-8 z-50">
          <div className="flex items-center gap-3 bg-gradient-to-r from-amber-100/80 to-yellow-100/80 backdrop-blur-md rounded-2xl px-5 py-3 shadow-lg border-2 border-amber-200/60">
            <div>
              <h1 className="text-2xl font-bold text-amber-800">白噗噗</h1>
              <p className="text-sm text-amber-600">甚麼都可以跟我說!</p>
            </div>
          </div>
        </div>

        {/* Top Right Buttons */}
        <div className="absolute top-8 right-8 z-50 flex items-center gap-2">
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
            className="relative w-12 h-12 bg-white/70 hover:bg-white/90 text-amber-600 hover:text-amber-700 rounded-xl shadow-lg border-2 border-amber-200/60 flex items-center justify-center transition-all duration-200 hover:shadow-xl active:scale-95 hover:scale-105 text-xl"
            title="查看歷史紀錄"
          >
            📋
            {history.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold shadow-md">
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
            className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-500 hover:from-red-500 hover:to-red-600 text-white rounded-xl shadow-lg border-2 border-red-300 flex items-center justify-center transition-all duration-200 hover:shadow-xl active:scale-95 hover:scale-105 text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* Live2D Tororo + 對話框容器 - 左側中間偏下 */}
        <div className="absolute left-12 bottom-16 w-[350px] h-[450px] pointer-events-none z-20">
          {/* Live2D 模型 */}
          <div
            ref={live2dContainerRef}
            className="w-full h-full"
          />

          {/* Tororo Speech Bubble - 在貓咪頭上 */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none max-w-[1200px]">
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 15 }}
              className="relative"
            >
              {/* 外層光暈效果 */}
              <div className="absolute inset-0 bg-gradient-to-br from-amber-300/30 to-yellow-300/30 rounded-3xl blur-xl"></div>

              {/* 對話框主體 - 動物森友會白天風格 */}
              <div className="relative bg-gradient-to-br from-amber-50/98 via-yellow-50/98 to-white/98 backdrop-blur-xl rounded-3xl px-6 py-5 shadow-2xl border-3 border-amber-200/70 inline-block min-w-[200px] max-w-[1200px]">

                {/* 主要文字內容 */}
                <div className="relative">
                  <p className="text-sm font-medium text-amber-900 leading-relaxed break-words"
                     style={{
                       textShadow: '0 1px 3px rgba(255,255,255,0.9)',
                       fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft JhengHei", sans-serif'
                     }}>
                    {displayedText || '\u00A0'}
                    {isTyping && (
                      <motion.span
                        className="inline-block w-0.5 h-4 bg-amber-400 ml-1 rounded-full"
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

        {/* Center Content Area - 右側置中 */}
        <div className="relative z-10 h-full w-full flex items-center justify-end pr-32">

          <AnimatePresence mode="wait">
            {/* Main Input Screen - 全新簡約設計 */}
            {viewMode === 'main' && (
              <motion.div
                key="main"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full max-w-2xl"
              >
                {/* 輸入框主體 - 動物森友會白天風格 */}
                <div className="relative">
                  {/* 文字輸入區 */}
                  <div className="bg-gradient-to-br from-amber-50/95 to-yellow-50/95 rounded-3xl shadow-2xl border-4 border-amber-200/80 overflow-hidden transition-all duration-300 focus-within:border-amber-300 focus-within:shadow-[0_20px_60px_rgba(245,158,11,0.25)]">
                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && (inputText.trim() || uploadedFiles.length > 0)) {
                          e.preventDefault()
                          handleSubmit()
                        }
                      }}
                      placeholder="想記錄什麼呢？✨"
                      className="w-full px-6 py-5 bg-white/30 focus:bg-white/50 border-none focus:outline-none text-base resize-none placeholder-amber-400/70 text-amber-900 font-medium selection:bg-amber-200/50 selection:text-amber-900"
                      style={{
                        minHeight: '120px',
                        maxHeight: '300px',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft JhengHei", sans-serif',
                        WebkitTapHighlightColor: 'transparent'
                      }}
                      autoFocus
                    />

                    {/* 文件預覽 */}
                    {uploadedFiles.length > 0 && (
                      <div className="px-6 pb-4 flex flex-wrap gap-2">
                        {uploadedFiles.map((file, index) => (
                          <div key={index} className="inline-flex items-center gap-2 px-3 py-2 bg-white/60 backdrop-blur-sm rounded-xl group hover:bg-white/80 transition-all shadow-sm border-2 border-amber-200/50">
                            <span className="text-xs text-amber-800 font-medium max-w-[120px] truncate">
                              {file.name}
                            </span>
                            <button
                              onClick={() => removeFile(index)}
                              className="w-5 h-5 flex items-center justify-center text-amber-400 hover:text-red-500 transition-colors text-xs font-bold bg-white/50 rounded-full hover:bg-red-50"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 底部工具欄 */}
                    <div className="px-5 py-4 bg-gradient-to-r from-amber-100/80 to-yellow-100/80 backdrop-blur-sm border-t-2 border-amber-200/60 flex items-center justify-between">
                      {/* 左側工具按鈕 */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2.5 text-xl bg-white/60 hover:bg-white/90 text-amber-600 hover:text-amber-700 rounded-xl transition-all shadow-sm hover:shadow-md hover:scale-105 active:scale-95 border-2 border-amber-200/50"
                          title="上傳檔案"
                        >
                          📎
                        </button>

                        <button
                          onClick={toggleTranscribeRecording}
                          className={`p-2.5 text-xl rounded-xl transition-all shadow-sm hover:shadow-md border-2 ${
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
                          className={`p-2.5 text-xl rounded-xl transition-all shadow-sm hover:shadow-md border-2 ${
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
                          className="p-2.5 text-xl bg-white/60 hover:bg-white/90 text-amber-600 hover:text-amber-700 rounded-xl transition-all shadow-sm hover:shadow-md hover:scale-105 active:scale-95 border-2 border-amber-200/50"
                          title="拍照"
                        >
                          📷
                        </button>
                      </div>

                      {/* 右側提交按鈕 */}
                      <button
                        onClick={handleSubmit}
                        disabled={!inputText.trim() && uploadedFiles.length === 0}
                        className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 disabled:from-gray-200 disabled:to-gray-300 text-white disabled:text-gray-400 rounded-xl font-bold transition-all duration-200 active:scale-95 disabled:cursor-not-allowed shadow-lg hover:shadow-xl border-2 border-amber-300 disabled:border-gray-300"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                          <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Processing Screen */}
            {viewMode === 'processing' && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center w-full max-w-2xl"
              >
                <h2 className="text-3xl font-bold text-amber-700 mb-6">
                  處理中...
                </h2>
                <div className="flex items-center justify-center gap-3 mt-6">
                  <div className="w-4 h-4 bg-amber-400 rounded-full animate-bounce shadow-lg" style={{ animationDelay: '0s' }} />
                  <div className="w-4 h-4 bg-yellow-400 rounded-full animate-bounce shadow-lg" style={{ animationDelay: '0.2s' }} />
                  <div className="w-4 h-4 bg-orange-400 rounded-full animate-bounce shadow-lg" style={{ animationDelay: '0.4s' }} />
                </div>
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

                            {/* 結果摘要 */}
                            {record.result?.memoriesCreated && (
                              <div className="text-xs text-amber-600 font-medium">
                                已創建 {record.result.memoriesCreated.length} 個記憶
                              </div>
                            )}
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
                <div className="bg-gradient-to-br from-amber-50/95 to-yellow-50/95 backdrop-blur-sm rounded-3xl p-8 shadow-xl border-2 border-amber-200/70 mb-6">
                  {/* 顯示白噗噗的溫馨回應，而不是技術性摘要 */}
                  <p className="text-lg text-amber-900 mb-4 leading-relaxed font-medium">
                    {processingResult.tororoResponse?.warmMessage || '已成功記錄！'}
                  </p>

                  {processingResult.memoriesCreated.length > 0 && (
                    <div className="flex flex-wrap gap-3 justify-center">
                      {processingResult.memoriesCreated.map((memory: any, index: number) => (
                        <motion.div
                          key={memory.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="px-5 py-2.5 bg-white/70 rounded-xl shadow-md border-2 border-amber-200/60 hover:shadow-lg hover:scale-105 transition-all"
                        >
                          <span className="text-base font-bold text-amber-700">{memory.assistant.nameChinese}</span>
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
