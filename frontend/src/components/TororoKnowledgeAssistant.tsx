/**
 * 白噗噗知識助手 - 快速直覺的知識上傳介面
 * 設計理念：可愛、直覺、快速，像是打開一個神奇的知識寶盒
 */

import { useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import { Live2DModel } from 'pixi-live2d-display/cubism4'
import { useMutation, useQuery } from '@apollo/client'
import { UPLOAD_KNOWLEDGE, GET_CHIEF_ASSISTANT } from '../graphql/knowledge'
import type { UploadKnowledgeInput } from '../graphql/knowledge'
import { useSound } from '../hooks/useSound'
import { motion, AnimatePresence } from 'framer-motion'
import { generateTororoResponse, detectEmotion, type UserAction } from '../services/tororoAI'

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

  // GraphQL
  const [uploadKnowledge] = useMutation(UPLOAD_KNOWLEDGE)
  useQuery(GET_CHIEF_ASSISTANT) // Load chief assistant data

  // Sound
  const { play, playRandomMeow } = useSound()

  /**
   * 生成 AI 回應並顯示
   */
  const generateAndDisplayResponse = async (action: UserAction, additionalContext?: any) => {
    try {
      // 準備上下文
      const context = {
        action,
        inputText,
        fileCount: uploadedFiles.length,
        historyCount: history.length,
        emotionDetected: inputText ? detectEmotion(inputText) : undefined,
        previousMessages: conversationHistory.slice(-3), // 只保留最近 3 句
        ...additionalContext
      }

      // 呼叫 AI 生成回應
      const response = await generateTororoResponse(context)

      // 更新對話歷史
      setConversationHistory(prev => [...prev, response].slice(-10)) // 保留最近 10 句

      // 設置顯示文字（會觸發打字機效果）
      setAudioDialogResponse(response)

    } catch (error) {
      console.error('生成 AI 回應失敗:', error)
    }
  }

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

  // Initialize Live2D
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
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        })

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

  // 監聽輸入變化，生成動態回應
  useEffect(() => {
    if (viewMode !== 'main') return

    const timer = setTimeout(() => {
      if (inputText.trim() || uploadedFiles.length > 0) {
        generateAndDisplayResponse('has_input')
      }
    }, 2000) // 延遲 2 秒，避免打字時頻繁觸發

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputText, uploadedFiles.length, viewMode])

  // 打字機效果
  useEffect(() => {
    const text = audioDialogResponse || ''

    if (!text) {
      setDisplayedText('')
      return
    }

    setIsTyping(true)
    setDisplayedText('')

    let currentIndex = 0
    const typingSpeed = 50 // 每個字50ms

    const typingInterval = setInterval(() => {
      if (currentIndex <= text.length) {
        setDisplayedText(text.slice(0, currentIndex))
        currentIndex++
      } else {
        setIsTyping(false)
        clearInterval(typingInterval)
      }
    }, typingSpeed)

    return () => {
      clearInterval(typingInterval)
      setIsTyping(false)
    }
  }, [audioDialogResponse])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  }

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
    play('button_click')
  }

  const handleSubmit = async () => {
    if (!inputText.trim() && uploadedFiles.length === 0) return

    setViewMode('processing')
    play('message_sent')

    // 生成處理中的 AI 回應
    generateAndDisplayResponse('processing')

    try {
      const input: UploadKnowledgeInput = {
        content: inputText || '快速記錄',
        files: uploadedFiles.map(file => ({
          url: URL.createObjectURL(file),
          name: file.name,
          type: file.type.startsWith('image/') ? 'image' : 'file',
        })),
        contentType: uploadedFiles.some(f => f.type.startsWith('image/')) ? 'IMAGE' : uploadedFiles.length > 0 ? 'DOCUMENT' : 'TEXT',
      }

      const { data } = await uploadKnowledge({ variables: { input } })

      if (data?.uploadKnowledge) {
        setProcessingResult(data.uploadKnowledge)
        saveToHistory(inputText, uploadedFiles, data.uploadKnowledge) // 儲存到歷史
        setViewMode('success')
        play('upload_success')
        playRandomMeow()

        // 生成成功的 AI 回應
        generateAndDisplayResponse('success', {
          recentRecords: history.length + 1
        })
      }
    } catch (error) {
      console.error('上傳失敗:', error)
      alert('上傳失敗，請稍後再試')
      setViewMode('main')
    }
  }

  const handleReset = () => {
    setViewMode('main')
    setInputText('')
    setUploadedFiles([])
    setProcessingResult(null)
    play('button_click')
  }

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-baby-pink/40 via-baby-yellow/40 to-baby-cream/40 backdrop-blur-md animate-fadeIn">
      {/* Main Container */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="relative w-[95vw] h-[95vh] max-w-7xl bg-white/95 backdrop-blur-xl rounded-[3rem] shadow-2xl overflow-hidden"
      >
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
            className="relative w-10 h-10 bg-gray-100 hover:bg-pink-100 text-gray-600 hover:text-pink-500 rounded-lg shadow-sm flex items-center justify-center transition-all duration-200 hover:shadow-md active:scale-95 text-xl"
            title="查看歷史紀錄"
          >
            📜
            {history.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
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
            className="w-10 h-10 bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-500 rounded-lg shadow-sm flex items-center justify-center transition-all duration-200 hover:shadow-md active:scale-95 text-xl"
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
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 max-w-xs pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
              className="relative"
            >
              {/* 對話框主體 - 動態大小 */}
              <div className="bg-white/95 backdrop-blur-md rounded-2xl px-4 py-3 shadow-xl border border-gray-100 inline-block min-w-[120px]">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {displayedText}
                  {isTyping && <span className="inline-block w-0.5 h-4 bg-gray-400 ml-0.5 animate-pulse"></span>}
                </p>

                {/* 清除按鈕 */}
                {audioDialogResponse && !isTyping && (
                  <button
                    onClick={() => setAudioDialogResponse('')}
                    className="mt-1.5 text-xs text-gray-400 hover:text-pink-500 transition-colors pointer-events-auto"
                  >
                    清除 ✕
                  </button>
                )}
              </div>

              {/* 對話框尾巴 */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-white/95"></div>
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
                {/* 輸入框主體 */}
                <div className="relative">
                  {/* 文字輸入區 */}
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden transition-all duration-200 focus-within:border-pink-300 focus-within:shadow-xl">
                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && (inputText.trim() || uploadedFiles.length > 0)) {
                          e.preventDefault()
                          handleSubmit()
                        }
                      }}
                      placeholder="想記錄什麼呢？💭"
                      className="w-full px-6 py-4 bg-transparent border-none focus:outline-none text-base resize-none placeholder-gray-400"
                      style={{
                        minHeight: '100px',
                        maxHeight: '300px',
                      }}
                      autoFocus
                    />

                    {/* 文件預覽 */}
                    {uploadedFiles.length > 0 && (
                      <div className="px-6 pb-4 flex flex-wrap gap-2">
                        {uploadedFiles.map((file, index) => (
                          <div key={index} className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors">
                            <span className="text-base">
                              {file.type.startsWith('image/') ? '🖼️' : file.type.startsWith('audio/') ? '🎤' : '📄'}
                            </span>
                            <span className="text-xs text-gray-600 max-w-[120px] truncate">
                              {file.name}
                            </span>
                            <button
                              onClick={() => removeFile(index)}
                              className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 底部工具欄 */}
                    <div className="px-4 py-3 bg-white border-t border-gray-100 flex items-center justify-between">
                      {/* 左側工具按鈕 */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2 text-gray-500 hover:text-pink-500 hover:bg-pink-50 rounded-lg transition-all"
                          title="上傳檔案"
                        >
                          <span className="text-lg">📎</span>
                        </button>

                        <button
                          onClick={toggleTranscribeRecording}
                          className={`p-2 rounded-lg transition-all ${
                            isRecordingTranscribe
                              ? 'text-red-500 bg-red-50 animate-pulse'
                              : 'text-gray-500 hover:text-purple-500 hover:bg-purple-50'
                          }`}
                          title={isRecordingTranscribe ? '停止錄音' : '語音轉文字'}
                        >
                          <span className="text-lg">{isRecordingTranscribe ? '⏹️' : '🎤'}</span>
                        </button>

                        <button
                          onClick={toggleDialogRecording}
                          className={`p-2 rounded-lg transition-all ${
                            isRecordingDialog
                              ? 'text-green-500 bg-green-50 animate-pulse'
                              : 'text-gray-500 hover:text-teal-500 hover:bg-teal-50'
                          }`}
                          title={isRecordingDialog ? '停止對話' : '語音對話'}
                        >
                          <span className="text-lg">{isRecordingDialog ? '⏹️' : '🎧'}</span>
                        </button>

                        <button
                          onClick={takePhoto}
                          className="p-2 text-gray-500 hover:text-yellow-500 hover:bg-yellow-50 rounded-lg transition-all"
                          title="拍照"
                        >
                          <span className="text-lg">📷</span>
                        </button>
                      </div>

                      {/* 右側提交按鈕 */}
                      <button
                        onClick={handleSubmit}
                        disabled={!inputText.trim() && uploadedFiles.length === 0}
                        className="px-6 py-2 bg-pink-500 hover:bg-pink-600 disabled:bg-gray-100 text-white disabled:text-gray-400 rounded-lg font-medium transition-all duration-200 active:scale-95 disabled:cursor-not-allowed"
                      >
                        記錄 ✨
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
                <h2 className="text-3xl font-bold text-pink-500 mb-6">
                  處理中...
                </h2>
                <div className="flex items-center justify-center gap-3 mt-6">
                  <div className="w-3 h-3 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                  <div className="w-3 h-3 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <div className="w-3 h-3 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
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
                  <h2 className="text-3xl font-bold text-pink-500">
                    📜 歷史紀錄
                  </h2>
                  {history.length > 0 && (
                    <button
                      onClick={() => {
                        if (window.confirm('確定要清空所有歷史紀錄嗎？')) {
                          clearAllHistory()
                          play('button_click')
                        }
                      }}
                      className="text-sm text-gray-500 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
                    >
                      清空全部
                    </button>
                  )}
                </div>

                {/* 歷史列表 */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                  {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="text-6xl mb-4">📭</div>
                      <p className="text-lg text-gray-400">還沒有歷史紀錄</p>
                      <p className="text-sm text-gray-300 mt-2">開始記錄你的第一個想法吧！</p>
                    </div>
                  ) : (
                    history.map((record, index) => (
                      <motion.div
                        key={record.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-start gap-4">
                          {/* 左側：時間 */}
                          <div className="flex-shrink-0 text-center">
                            <div className="text-xs text-gray-400">
                              {record.timestamp.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })}
                            </div>
                            <div className="text-xs text-gray-400">
                              {record.timestamp.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>

                          {/* 中間：內容 */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-700 line-clamp-2 mb-2">
                              {record.inputText || '(無文字內容)'}
                            </p>

                            {/* 文件標籤 */}
                            {record.files.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {record.files.map((file, i) => (
                                  <span key={i} className="text-xs bg-gray-50 px-2 py-0.5 rounded">
                                    {file.type.startsWith('image/') ? '🖼️' : '📄'} {file.name}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* 結果摘要 */}
                            {record.result?.memoriesCreated && (
                              <div className="text-xs text-gray-500">
                                ✅ 已創建 {record.result.memoriesCreated.length} 個記憶
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
                              className="p-2 text-gray-400 hover:text-pink-500 hover:bg-pink-50 rounded-lg transition-all"
                              title="重新載入"
                            >
                              <span className="text-sm">📝</span>
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
                              className={`px-2 py-1 rounded-lg text-xs transition-all ${
                                confirmDelete === record.id
                                  ? 'bg-red-500 text-white'
                                  : 'bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-500'
                              }`}
                            >
                              {confirmDelete === record.id ? '確定?' : '🗑️'}
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
                    className="px-8 py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-semibold shadow-sm transition-all duration-200 hover:shadow-md active:scale-95"
                  >
                    返回記錄 ✍️
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
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className="text-6xl mb-4"
                >
                  ✨
                </motion.div>
                <h2 className="text-3xl font-bold text-pink-500 mb-6">
                  記住囉！
                </h2>

                {/* Result Cards */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm mb-6">
                  <p className="text-lg text-gray-700 mb-4 leading-relaxed">
                    {processingResult.distribution.chiefSummary}
                  </p>

                  {processingResult.memoriesCreated.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-center">
                      {processingResult.memoriesCreated.map((memory: any, index: number) => (
                        <motion.div
                          key={memory.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="px-4 py-2 bg-pink-50 rounded-lg shadow-sm"
                        >
                          <span className="text-xl mr-2">{memory.assistant.emoji}</span>
                          <span className="text-base font-medium text-gray-700">{memory.assistant.nameChinese}</span>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleReset}
                    className="px-8 py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-semibold text-lg shadow-sm transition-all duration-200 hover:shadow-md active:scale-95"
                  >
                    再記錄一個 ✨
                  </button>
                  <button
                    onClick={() => {
                      play('button_click')
                      onClose?.()
                    }}
                    className="px-8 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-semibold text-lg shadow-sm transition-all duration-200 hover:shadow-md active:scale-95"
                  >
                    完成 👋
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
