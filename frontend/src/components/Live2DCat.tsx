import {
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react'
import * as PIXI from 'pixi.js'
import { Live2DModel } from 'pixi-live2d-display/cubism4'
import { useMutation } from '@apollo/client'
import { UPLOAD_KNOWLEDGE } from '../graphql/knowledge'
import type { UploadKnowledgeInput } from '../graphql/knowledge'
import { useSound } from '../hooks/useSound'
import { Z_INDEX_CLASSES } from '../constants/zIndex'
import { useCatChat } from '../hooks/useCatChat'
import type { ChatMessage } from '../stores/chatStore'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'

// Register PIXI globally for Live2D
;(window as Window & typeof globalThis & { PIXI: typeof PIXI }).PIXI = PIXI

interface Live2DCatProps {
  modelPath: string
  onClose?: () => void
}

// Type for Live2D internal model with motion manager
interface Live2DInternalModel {
  motionManager?: {
    startMotion: (group: string, index: number) => void
  }
}

// Type assertion helper - 不繼承，只用於類型斷言
interface Live2DModelWithInternal {
  internalModel?: Live2DInternalModel
  [key: string]: unknown
}

// Type for memory created result from GraphQL
interface MemoryCreated {
  assistant: {
    emoji: string
    nameChinese: string
  }
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
    background: 'linear-gradient(135deg, rgba(15, 13, 35, 0.98) 0%, rgba(25, 22, 50, 0.98) 100%)',
    backdropFilter: 'blur(24px) saturate(180%)',
    border: '3px solid rgba(139, 92, 246, 0.4)',
    boxShadow: '0 8px 32px 0 rgba(139, 92, 246, 0.3), inset 0 1px 0 0 rgba(167, 139, 250, 0.3)',
    // 頭部
    headerBg: 'linear-gradient(135deg, rgba(139, 92, 246, 0.4) 0%, rgba(99, 102, 241, 0.3) 100%)',
    headerText: '#FFFFFF',
    headerTextSecondary: '#E0E7FF',
    // 訊息氣泡
    userBubbleBg: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6) 0%, rgba(99, 102, 241, 0.5) 100%)',
    userBubbleText: '#FFFFFF',
    catBubbleBg: 'linear-gradient(135deg, rgba(67, 56, 202, 0.5) 0%, rgba(79, 70, 229, 0.4) 100%)',
    catBubbleText: '#FFFFFF',
    // 按鈕
    buttonBg: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(99, 102, 241, 0.25) 100%)',
    buttonHoverBg: 'linear-gradient(135deg, rgba(139, 92, 246, 0.5) 0%, rgba(99, 102, 241, 0.4) 100%)',
    buttonText: '#FFFFFF',
    // 輸入框
    inputBorder: 'rgba(139, 92, 246, 0.4)',
    inputFocusBorder: 'rgba(99, 102, 241, 0.6)',
    inputBg: 'rgba(30, 27, 75, 0.6)',
    inputText: '#FFFFFF',
    inputPlaceholder: 'rgba(255, 255, 255, 0.5)',
    // 分隔線
    divider: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.4), transparent)',
  }
}

export default function Live2DCat({
  modelPath,
  onClose,
}: Live2DCatProps) {
  // 判断是白猫还是黑猫
  const isBlackCat = modelPath.includes('hijiki')
  const theme = isBlackCat ? AC_COLORS.hijiki : AC_COLORS.tororo

  // === 使用優化的 Hook 管理對話狀態 ===
  const {
    messages,
    inputText,
    catState,
    isProcessing,
    isRecording,
    pendingAttachments,
    addMessage,
    setInputText,
    setCatState,
    setIsProcessing,
    setIsRecording,
    setPendingAttachments,
    addPendingAttachment,
    removePendingAttachment,
  } = useCatChat(isBlackCat ? 'hijiki' : 'tororo')

  // 確保 pendingAttachments 始終是數組
  const safeAttachments = pendingAttachments || []

  const [triggerMotion, setTriggerMotion] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)

  // Apollo GraphQL hooks
  const [uploadKnowledge] = useMutation(UPLOAD_KNOWLEDGE)
  // REMOVED: chiefAssistant query and chatWithChief mutation (migrated to Island-based architecture)

  // Sound system
  const { play, playRandomMeow, playTypingSequence, enabled: soundEnabled, toggleSound } = useSound()

  // Live2D refs
  const live2dContainerRef = useRef<HTMLDivElement | null>(null)
  const appRef = useRef<PIXI.Application | null>(null)
  const modelRef = useRef<Live2DModel | null>(null)
  const [showFallback, setShowFallback] = useState(false)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Play greeting sound when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      play('meow_greeting')
    }, 500)

    return () => clearTimeout(timer)
  }, [play])

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

          const targetScale = Math.min(containerWidth / 2048, containerHeight / 2048) * 1.1

          model.scale.set(targetScale)
          model.position.set(containerWidth / 2, containerHeight * 0.9)
          model.anchor.set(0.5, 1)

          app.stage.addChild(model)

          app.ticker.add(() => {
            if (modelRef.current) {
              const deltaTime = app.ticker.deltaTime
              modelRef.current.update(deltaTime)
            }
          })

          console.log('Live2D model loaded successfully!')
        } catch (modelError) {
          console.warn('Failed to load Live2D model:', modelError)
          setShowFallback(true)
        }
      } catch (error) {
        console.error('Failed to initialize PIXI:', error)
        setShowFallback(true)
      }
    }

    const timer = setTimeout(() => {
      initLive2D()
    }, 100)

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

  // Helper function to play motion based on state
  const playMotionForState = useCallback((state: typeof catState) => {
    if (!modelRef.current) return

    try {
      const model = modelRef.current as unknown as Live2DModelWithInternal
      const internalModel = model.internalModel
      if (!internalModel?.motionManager) return

      const motionMap: Record<typeof catState, string> = {
        idle: 'idle',
        thinking: 'TapBody',
        listening: 'Shake',
        talking: 'idle',
      }

      const motionGroup = motionMap[state]
      internalModel.motionManager.startMotion(motionGroup, 0)
    } catch (e) {
      console.log('Motion trigger error:', e)
    }
  }, [])

  useEffect(() => {
    playMotionForState(catState)
  }, [catState, playMotionForState])

  useEffect(() => {
    if (modelRef.current && triggerMotion) {
      playMotionForState(catState)
      setTriggerMotion(false)
    }
  }, [triggerMotion, catState, playMotionForState])

  const handleSendMessage = async () => {
    if (!inputText.trim() && safeAttachments.length === 0) return
    if (isProcessing) return

    const userContent = inputText || '上傳了檔案'
    const hasAttachments = safeAttachments.length > 0

    play('message_sent')

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: userContent,
      timestamp: new Date(),
      attachments: hasAttachments ? safeAttachments.map(att => ({
        type: att.type,
        name: att.name,
        url: att.url
      })) : undefined,
    }

    addMessage(newMessage)
    setInputText('')
    const attachments = [...safeAttachments]
    setPendingAttachments([])
    setIsProcessing(true)

    setCatState('listening')
    play('meow_curious')

    setTimeout(() => {
      setCatState('thinking')
      play('meow_thinking')
      playTypingSequence()
    }, 500)

    try {
      if (hasAttachments) {
        const input: UploadKnowledgeInput = {
          content: userContent,
          files: attachments.map(att => ({
            url: att.url,
            name: att.name,
            type: att.type,
          })),
          contentType: determineContentType(attachments),
        }

        const { data } = await uploadKnowledge({
          variables: { input }
        })

        if (data?.uploadKnowledge) {
          const result = data.uploadKnowledge

          let responseContent = `喵~ 我已經幫你分析並儲存了！✨\n\n`
          responseContent += `📝 **摘要:** ${result.distribution.chiefSummary}\n\n`

          if (result.memoriesCreated.length > 0) {
            responseContent += `💾 **已儲存到 ${result.memoriesCreated.length} 個知識庫:**\n`
            result.memoriesCreated.forEach((memory: MemoryCreated) => {
              responseContent += `  ${memory.assistant.emoji} ${memory.assistant.nameChinese}\n`
            })
          }

          if (result.distribution.identifiedTopics.length > 0) {
            responseContent += `\n🏷️ **主題:** ${result.distribution.identifiedTopics.join('、')}`
          }

          const assistantMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            type: 'assistant',
            content: responseContent,
            timestamp: new Date(),
          }

          play('upload_success')
          setTimeout(() => {
            play('message_received')
            playRandomMeow()
          }, 300)

          addMessage(assistantMessage)
        }
      } else {
        // REMOVED: General chat with Chief Assistant (migrated to Island-based architecture)
        // This feature has been replaced by Island-specific chat functionality
        throw new Error('一般聊天功能已遷移至島嶼系統，請使用島嶼頁面的聊天功能')
      }
    } catch (error) {
      console.error('處理失敗:', error)

      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: '喵嗚~ 處理失敗了... 請確認後端服務是否正常運行 😿',
        timestamp: new Date(),
      }
      addMessage(errorMessage)
    } finally {
      setIsProcessing(false)

      setCatState('talking')

      setTimeout(() => {
        setCatState('idle')
      }, 2000)
    }
  }

  const determineContentType = (attachments: typeof pendingAttachments): 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'MIXED' => {
    if (attachments.length === 0) return 'TEXT'

    const hasImage = attachments.some(att => att.type.startsWith('image/'))
    const hasDoc = attachments.some(att => att.type.includes('pdf') || att.type.includes('document'))

    if (hasImage && !hasDoc) return 'IMAGE'
    if (hasDoc && !hasImage) return 'DOCUMENT'
    return 'MIXED'
  }

  const handleFileUpload = (type: 'file' | 'image' | 'audio') => {
    play('button_click')
    if (type === 'file') fileInputRef.current?.click()
    if (type === 'image') imageInputRef.current?.click()
    if (type === 'audio') audioInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'file' | 'image' | 'audio') => {
    const files = e.target.files
    if (!files || files.length === 0) return

    if (safeAttachments.length + files.length > 10) {
      alert('最多只能上傳 10 個檔案！')
      return
    }

    const newAttachments = Array.from(files).map(file => ({
      type: (type === 'audio' ? 'audio' : type === 'image' ? 'image' : 'file') as 'image' | 'file' | 'audio',
      name: file.name,
      url: URL.createObjectURL(file),
      file: file,
    }))

    newAttachments.forEach(att => addPendingAttachment(att))

    play('notification')

    e.target.value = ''
  }

  const removeAttachment = (index: number) => {
    if (safeAttachments[index]) {
      URL.revokeObjectURL(safeAttachments[index].url)
    }
    removePendingAttachment(index)
  }

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false)
      setCatState('idle')

      play('notification')

      const audioBlob = new Blob([], { type: 'audio/mp3' })
      const audioUrl = URL.createObjectURL(audioBlob)
      const audioFileName = `語音訊息_${Date.now()}.mp3`

      addPendingAttachment({
        type: 'audio',
        name: audioFileName,
        url: audioUrl,
        file: new File([audioBlob], audioFileName, { type: 'audio/mp3' })
      })
    } else {
      if (safeAttachments.length >= 10) {
        alert('最多只能上傳 10 個檔案！')
        return
      }

      setIsRecording(true)
      setCatState('listening')

      play('notification')
      play('meow_curious')
    }
  }

  return (
    <div 
      className={`fixed inset-0 ${Z_INDEX_CLASSES.FULLSCREEN_CHAT} flex items-center justify-center backdrop-blur-md animate-fadeIn p-2 sm:p-4`}
      style={{
        background: isBlackCat 
          ? 'linear-gradient(to bottom right, rgba(10, 8, 25, 0.98) 0%, rgba(20, 18, 40, 0.98) 50%, rgba(30, 25, 50, 0.98) 100%)'
          : 'linear-gradient(to bottom right, rgba(255, 248, 231, 0.95) 0%, rgba(255, 243, 224, 0.95) 50%, rgba(255, 237, 213, 0.95) 100%)'
      }}
    >
      {/* 裝飾背景 - 星星/雲朵 - 響應式 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {isBlackCat ? (
          <>
            <div className="absolute top-10 sm:top-20 left-10 sm:left-20 text-2xl sm:text-4xl animate-pulse" style={{ animationDuration: '3s' }}>⭐</div>
            <div className="absolute top-20 sm:top-40 right-16 sm:right-32 text-xl sm:text-3xl animate-pulse" style={{ animationDuration: '4s' }}>✨</div>
            <div className="absolute bottom-16 sm:bottom-32 left-20 sm:left-40 text-3xl sm:text-5xl animate-pulse" style={{ animationDuration: '5s' }}>🌙</div>
            <div className="absolute top-40 sm:top-60 right-10 sm:right-20 text-lg sm:text-2xl animate-pulse" style={{ animationDuration: '3.5s' }}>⭐</div>
            <div className="absolute bottom-40 right-32 text-xl sm:text-3xl animate-pulse hidden sm:block" style={{ animationDuration: '4.5s' }}>💫</div>
          </>
        ) : (
          <>
            <div className="absolute top-10 sm:top-20 left-10 sm:left-20 text-2xl sm:text-4xl animate-bounce" style={{ animationDuration: '3s' }}>☁️</div>
            <div className="absolute top-20 sm:top-40 right-16 sm:right-32 text-xl sm:text-3xl animate-bounce" style={{ animationDuration: '4s' }}>☀️</div>
            <div className="absolute bottom-16 sm:bottom-32 left-20 sm:left-40 text-3xl sm:text-5xl animate-bounce" style={{ animationDuration: '5s' }}>🌈</div>
          </>
        )}
      </div>

      <div 
        className="relative w-full h-full max-w-7xl rounded-2xl sm:rounded-[3rem] overflow-hidden animate-scale-in"
        style={{
          background: theme.background,
          backdropFilter: theme.backdropFilter,
          WebkitBackdropFilter: theme.backdropFilter,
          border: theme.border,
          boxShadow: theme.boxShadow,
        }}
      >
        {/* 裝飾漸層 */}
        <div
          className="absolute inset-0 rounded-[3rem] pointer-events-none"
          style={{
            background: isBlackCat
              ? 'linear-gradient(to bottom, rgba(167, 139, 250, 0.2) 0%, transparent 40%, rgba(139, 92, 246, 0.05) 100%)'
              : 'linear-gradient(to bottom, rgba(255, 255, 255, 0.3) 0%, transparent 40%, rgba(251, 191, 36, 0.05) 100%)'
          }}
        />

        {/* Header - 動物森友會風格 - 響應式 */}
        <div
          className="relative px-3 sm:px-6 py-3 sm:py-5 flex items-center justify-between rounded-t-2xl sm:rounded-t-[3rem]"
          style={{
            background: theme.headerBg,
            boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.05)'
          }}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center text-2xl sm:text-3xl flex-shrink-0"
              style={{
                background: isBlackCat
                  ? 'linear-gradient(135deg, rgba(67, 56, 202, 0.5) 0%, rgba(79, 70, 229, 0.4) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.6) 0%, rgba(254, 252, 247, 0.5) 100%)',
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)'
              }}
            >
              {theme.emoji}
            </div>
            <div>
              <div 
                className="font-black text-base sm:text-xl" 
                style={{ 
                  color: theme.headerText, 
                  textShadow: isBlackCat ? '0 2px 4px rgba(0, 0, 0, 0.5)' : '0 1px 2px rgba(255, 255, 255, 0.8)' 
                }}
              >
                {theme.name}
              </div>
              <div className="text-xs sm:text-sm font-semibold" style={{ color: theme.headerTextSecondary }}>
                {theme.description}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Sound Toggle */}
            <button
              onClick={() => {
                toggleSound()
                play('button_click')
              }}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center text-base sm:text-lg transition-all hover:scale-110 active:scale-95"
              style={{
                background: soundEnabled ? theme.buttonBg : 'rgba(156, 163, 175, 0.3)',
                boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)'
              }}
              title={soundEnabled ? '關閉音效' : '開啟音效'}
            >
              <span>{soundEnabled ? '🔊' : '🔇'}</span>
            </button>

            {/* Close Button */}
            <button
              onClick={() => {
                play('button_click')
                onClose?.()
              }}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center font-bold transition-all hover:scale-110 active:scale-95 text-sm sm:text-base"
              style={{
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.9) 0%, rgba(220, 38, 38, 0.9) 100%)',
                color: '#FFF',
                boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* 分隔線 */}
        <div className="h-[2px] rounded-full" style={{ background: theme.divider }} />

        {/* Main Content - 響應式 */}
        <div className="flex flex-col md:flex-row h-[calc(100%-64px)] sm:h-[calc(100%-88px)]">
          {/* Live2D Model Area - 響應式 - 手機版縮小高度 */}
          <div
            className="w-full md:w-1/3 h-[100px] sm:h-[140px] md:h-full flex flex-col items-center justify-center p-1 sm:p-2 md:p-6 relative"
            style={{
              background: isBlackCat
                ? 'linear-gradient(135deg, rgba(67, 56, 202, 0.15) 0%, rgba(79, 70, 229, 0.1) 100%)'
                : 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)'
            }}
          >
            {/* 裝飾邊框 */}
            <div 
              className="absolute right-0 top-0 bottom-0 w-[2px] hidden md:block rounded-full" 
              style={{ background: theme.divider }} 
            />
            <div 
              className="absolute left-0 right-0 bottom-0 h-[2px] md:hidden rounded-full" 
              style={{ background: theme.divider }} 
            />

            <div className="relative w-full h-full flex items-center justify-center">
              {showFallback ? (
                <div className="text-center animate-bounce-gentle">
                  <div className="text-4xl sm:text-6xl md:text-9xl mb-2 md:mb-4 filter drop-shadow-lg">{theme.emoji}</div>
                  <div
                    className="rounded-xl md:rounded-2xl px-3 py-1.5 sm:px-4 sm:py-2 md:px-6 md:py-3 hidden sm:block"
                    style={{
                      background: theme.catBubbleBg,
                      boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)'
                    }}
                  >
                    <p className="text-sm md:text-lg font-bold" style={{ color: theme.headerText }}>
                      {theme.name}在這裡！
                    </p>
                    <p className="text-xs mt-1 hidden md:block" style={{ color: theme.headerTextSecondary }}>
                      Live2D 模型載入中...
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    ref={live2dContainerRef}
                    className="w-full h-full"
                    style={{ position: 'relative' }}
                  />

                  {/* 懸浮對話泡泡 - 顯示最新助理訊息 - 手機版隱藏以節省空間 */}
                  {messages.length > 0 && messages[messages.length - 1].type === 'assistant' && (
                    <div
                      className="absolute top-2 sm:top-4 md:top-12 left-1/2 transform -translate-x-1/2 max-w-[90%] md:max-w-[85%] animate-slide-down z-10 hidden md:block"
                      style={{
                        animation: 'slideDown 0.3s ease-out'
                      }}
                    >
                      <div
                        className="relative rounded-2xl px-3 py-2 sm:px-4 sm:py-3 shadow-2xl"
                        style={{
                          background: theme.catBubbleBg,
                          border: `2px solid ${isBlackCat ? 'rgba(139, 92, 246, 0.5)' : 'rgba(251, 191, 36, 0.5)'}`,
                          boxShadow: isBlackCat
                            ? '0 8px 24px rgba(139, 92, 246, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.1)'
                            : '0 8px 24px rgba(251, 191, 36, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.5)'
                        }}
                      >
                        {/* 對話泡泡箭頭 - 指向貓咪 */}
                        <div
                          className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 rotate-45"
                          style={{
                            background: theme.catBubbleBg,
                            borderRight: `2px solid ${isBlackCat ? 'rgba(139, 92, 246, 0.5)' : 'rgba(251, 191, 36, 0.5)'}`,
                            borderBottom: `2px solid ${isBlackCat ? 'rgba(139, 92, 246, 0.5)' : 'rgba(251, 191, 36, 0.5)'}`
                          }}
                        />

                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base sm:text-lg">{theme.emoji}</span>
                          <span className="text-xs sm:text-sm font-bold" style={{ color: theme.catBubbleText }}>
                            {theme.name}
                          </span>
                        </div>

                        <p
                          className="text-xs sm:text-sm leading-relaxed line-clamp-3"
                          style={{ color: theme.catBubbleText }}
                        >
                          {messages[messages.length - 1].content.split('\n')[0]}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 處理中的對話泡泡 - 手機版隱藏 */}
                  {isProcessing && (
                    <div
                      className="absolute top-4 sm:top-8 md:top-12 left-1/2 transform -translate-x-1/2 max-w-[80%] animate-pulse z-10 hidden md:block"
                    >
                      <div
                        className="relative rounded-2xl px-4 py-3 shadow-2xl"
                        style={{
                          background: theme.catBubbleBg,
                          border: `2px solid ${isBlackCat ? 'rgba(139, 92, 246, 0.5)' : 'rgba(251, 191, 36, 0.5)'}`,
                        }}
                      >
                        <div
                          className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 rotate-45"
                          style={{
                            background: theme.catBubbleBg,
                            borderRight: `2px solid ${isBlackCat ? 'rgba(139, 92, 246, 0.5)' : 'rgba(251, 191, 36, 0.5)'}`,
                            borderBottom: `2px solid ${isBlackCat ? 'rgba(139, 92, 246, 0.5)' : 'rgba(251, 191, 36, 0.5)'}`
                          }}
                        />

                        <div className="flex items-center gap-2">
                          <span className="text-lg">{theme.emoji}</span>
                          <div className="flex gap-1">
                            <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: theme.catBubbleText, animationDelay: '0ms' }} />
                            <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: theme.catBubbleText, animationDelay: '150ms' }} />
                            <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: theme.catBubbleText, animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Chat Area - 響應式 */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Messages - 響應式 - 手機版更緊湊間距 */}
            <div className="flex-1 overflow-y-auto p-1.5 sm:p-3 md:p-4 lg:p-6 space-y-1.5 sm:space-y-2 md:space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <div className="text-5xl sm:text-6xl md:text-7xl mb-3 sm:mb-4">{theme.emoji}</div>
                  <p className="font-bold text-sm sm:text-base md:text-lg" style={{ color: theme.headerText }}>
                    {isBlackCat
                      ? '喵。需要我幫你找什麼資訊嗎？'
                      : '喵～今天想種下什麼新想法呢？'
                    }
                  </p>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
                >
                  <div className={`flex gap-1.5 sm:gap-2 max-w-[90%] sm:max-w-[85%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* 頭像 */}
                    {message.type === 'assistant' && (
                      <div
                        className="w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center text-sm sm:text-lg md:text-xl flex-shrink-0"
                        style={{
                          background: isBlackCat
                            ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.4) 0%, rgba(99, 102, 241, 0.3) 100%)'
                            : 'linear-gradient(135deg, rgba(251, 191, 36, 0.3) 0%, rgba(245, 158, 11, 0.25) 100%)',
                          boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)'
                        }}
                      >
                        {theme.emoji}
                      </div>
                    )}

                    {/* 訊息泡泡 */}
                    <div
                      className="px-2.5 py-2 sm:px-3 sm:py-2.5 md:px-4 md:py-3 rounded-xl sm:rounded-2xl select-text"
                      style={{
                        background: message.type === 'user' ? theme.userBubbleBg : theme.catBubbleBg,
                        color: message.type === 'user' ? theme.userBubbleText : theme.catBubbleText,
                        boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
                        userSelect: 'text',
                        WebkitUserSelect: 'text',
                      }}
                    >
                      {message.attachments && message.attachments.map((att, idx) => (
                        <div key={idx} className="mb-2">
                          {att.type === 'image' && (
                            <img src={att.url} alt={att.name} className="rounded-xl max-w-full h-auto" />
                          )}
                          {att.type === 'audio' && (
                            <div 
                              className="flex items-center gap-2 rounded-xl px-3 py-2"
                              style={{
                                background: isBlackCat ? 'rgba(139, 92, 246, 0.2)' : 'rgba(251, 191, 36, 0.2)'
                              }}
                            >
                              <span className="text-2xl">🎵</span>
                              <span className="text-sm">{att.name}</span>
                            </div>
                          )}
                          {att.type === 'file' && (
                            <div 
                              className="flex items-center gap-2 rounded-xl px-3 py-2"
                              style={{
                                background: isBlackCat ? 'rgba(139, 92, 246, 0.2)' : 'rgba(251, 191, 36, 0.2)'
                              }}
                            >
                              <span className="text-2xl">📄</span>
                              <span className="text-sm">{att.name}</span>
                            </div>
                          )}
                        </div>
                      ))}
                      
                      <div className="text-xs sm:text-sm font-medium select-text leading-relaxed prose prose-sm max-w-none">
                        {message.content ? (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeSanitize]}
                            components={{
                              p: ({ children }) => (
                                <p className="mb-2 last:mb-0" style={{ color: isBlackCat ? '#FFFFFF' : 'inherit' }}>
                                  {children}
                                </p>
                              ),
                              ul: ({ children }) => (
                                <ul className="list-disc ml-4 mb-2" style={{ color: isBlackCat ? '#FFFFFF' : 'inherit' }}>
                                  {children}
                                </ul>
                              ),
                              ol: ({ children }) => (
                                <ol className="list-decimal ml-4 mb-2" style={{ color: isBlackCat ? '#FFFFFF' : 'inherit' }}>
                                  {children}
                                </ol>
                              ),
                              li: ({ children }) => (
                                <li className="mb-1" style={{ color: isBlackCat ? '#FFFFFF' : 'inherit' }}>
                                  {children}
                                </li>
                              ),
                              strong: ({ children }) => (
                                <strong className="font-bold" style={{ color: isBlackCat ? '#FFFFFF' : 'inherit' }}>
                                  {children}
                                </strong>
                              ),
                              em: ({ children }) => (
                                <em className="italic" style={{ color: isBlackCat ? '#FFFFFF' : 'inherit' }}>
                                  {children}
                                </em>
                              ),
                              code: ({ children }) => (
                                <code
                                  className="px-1.5 py-0.5 rounded text-xs font-mono"
                                  style={{
                                    background: isBlackCat ? 'rgba(139, 92, 246, 0.2)' : 'rgba(251, 191, 36, 0.2)',
                                    color: isBlackCat ? '#FFFFFF' : 'inherit'
                                  }}
                                >
                                  {children}
                                </code>
                              ),
                              pre: ({ children }) => (
                                <pre
                                  className="p-3 rounded-lg overflow-x-auto text-xs font-mono my-2"
                                  style={{
                                    background: isBlackCat ? 'rgba(139, 92, 246, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                                    color: isBlackCat ? '#FFFFFF' : 'inherit'
                                  }}
                                >
                                  {children}
                                </pre>
                              ),
                              blockquote: ({ children }) => (
                                <blockquote
                                  className="border-l-4 pl-3 py-1 my-2"
                                  style={{
                                    borderColor: isBlackCat ? 'rgba(139, 92, 246, 0.5)' : 'rgba(251, 191, 36, 0.5)',
                                    color: isBlackCat ? '#FFFFFF' : 'inherit'
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
                                  style={{ color: isBlackCat ? '#FFFFFF' : 'inherit' }}
                                >
                                  {children}
                                </a>
                              ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        ) : (
                          // 如果內容為空，顯示思考中動畫
                          <span className="inline-flex items-center gap-1" style={{ color: isBlackCat ? 'rgba(255, 255, 255, 0.7)' : 'rgba(139, 92, 46, 0.7)' }}>
                            <span className="animate-bounce" style={{ animationDelay: '0ms' }}>思</span>
                            <span className="animate-bounce" style={{ animationDelay: '150ms' }}>考</span>
                            <span className="animate-bounce" style={{ animationDelay: '300ms' }}>中</span>
                            <span className="animate-bounce" style={{ animationDelay: '450ms' }}>.</span>
                            <span className="animate-bounce" style={{ animationDelay: '600ms' }}>.</span>
                            <span className="animate-bounce" style={{ animationDelay: '750ms' }}>.</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] sm:text-xs mt-1.5 sm:mt-2 opacity-70 select-text font-semibold">
                        {new Date(message.timestamp).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {isProcessing && (
                <div className="flex items-start gap-1.5 sm:gap-2">
                  <div
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center text-base sm:text-xl flex-shrink-0"
                    style={{
                      background: isBlackCat
                        ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.4) 0%, rgba(99, 102, 241, 0.3) 100%)'
                        : 'linear-gradient(135deg, rgba(251, 191, 36, 0.3) 0%, rgba(245, 158, 11, 0.25) 100%)',
                      boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    {theme.emoji}
                  </div>

                  <div
                    className="flex items-center gap-2 sm:gap-3 px-3 py-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl max-w-[80%]"
                    style={{
                      background: theme.catBubbleBg,
                      boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)'
                    }}
                  >
                    <div className="flex gap-1">
                      <span
                        className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-bounce"
                        style={{ background: theme.buttonText, animationDelay: '0ms' }}
                      />
                      <span
                        className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-bounce"
                        style={{ background: theme.buttonText, animationDelay: '150ms' }}
                      />
                      <span
                        className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-bounce"
                        style={{ background: theme.buttonText, animationDelay: '300ms' }}
                      />
                    </div>
                    <span className="text-xs sm:text-sm font-semibold" style={{ color: theme.catBubbleText }}>
                      思考中...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* 分隔線 */}
            <div className="h-[2px] rounded-full" style={{ background: theme.divider }} />

            {/* Input Area - 響應式 - 手機版更緊湊 */}
            <div className="relative p-1.5 sm:p-3 md:p-4 lg:p-5">
              {/* Pending Attachments Preview - 響應式 */}
              {safeAttachments.length > 0 && (
                <div
                  className="mb-1.5 sm:mb-2 md:mb-3 p-1.5 sm:p-2 md:p-3 rounded-lg sm:rounded-xl md:rounded-2xl"
                  style={{
                    background: isBlackCat ? 'rgba(67, 56, 202, 0.15)' : 'rgba(251, 191, 36, 0.1)',
                    border: `2px solid ${isBlackCat ? 'rgba(139, 92, 246, 0.2)' : 'rgba(251, 191, 36, 0.2)'}`
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs sm:text-sm font-semibold" style={{ color: theme.headerText }}>
                      待發送的檔案 ({safeAttachments.length}/10)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {safeAttachments.map((att, index) => (
                      <div
                        key={index}
                        className="relative group rounded-xl p-2 flex items-center gap-2 max-w-[200px]"
                        style={{
                          background: theme.catBubbleBg,
                          boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)'
                        }}
                      >
                        {att.type === 'image' && (
                          <img src={att.url} alt={att.name} className="w-10 h-10 object-cover rounded" />
                        )}
                        {att.type === 'audio' && <span className="text-2xl">🎵</span>}
                        {att.type === 'file' && <span className="text-2xl">📄</span>}
                        <span className="text-xs truncate flex-1" style={{ color: theme.catBubbleText }}>
                          {att.name}
                        </span>
                        <button
                          onClick={() => removeAttachment(index)}
                          className="w-5 h-5 bg-red-400 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-xs transition-all hover:scale-110"
                          title="移除"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 快速操作按鈕 - 響應式 */}
              <div className="flex gap-1 sm:gap-1.5 md:gap-2 mb-1.5 sm:mb-2 md:mb-3 flex-wrap">
                <button
                  onClick={() => handleFileUpload('image')}
                  className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-bold transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: theme.buttonBg,
                    color: theme.buttonText,
                    boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  <span className="mr-1">🖼️</span><span className="hidden sm:inline">圖片</span>
                </button>
                <button
                  onClick={() => handleFileUpload('file')}
                  className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-bold transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: theme.buttonBg,
                    color: theme.buttonText,
                    boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  <span className="mr-1">📎</span><span className="hidden sm:inline">檔案</span>
                </button>
                <button
                  onClick={toggleRecording}
                  className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-bold transition-all hover:scale-105 active:scale-95 ${
                    isRecording ? 'animate-pulse' : ''
                  }`}
                  style={{
                    background: isRecording 
                      ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.9) 0%, rgba(220, 38, 38, 0.9) 100%)'
                      : theme.buttonBg,
                    color: isRecording ? '#FFF' : theme.buttonText,
                    boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  <span className="mr-1">{isRecording ? '⏹️' : '🎤'}</span>
                  <span className="hidden sm:inline">{isRecording ? '停止' : '錄音'}</span>
                </button>
              </div>

              {/* 輸入框 - 響應式 */}
              <div className="flex gap-1 sm:gap-1.5 md:gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !isProcessing && handleSendMessage()}
                  disabled={isProcessing}
                  placeholder={`跟 ${theme.name} 說話...`}
                  className={`flex-1 px-2.5 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-3 rounded-lg sm:rounded-xl md:rounded-2xl font-medium text-xs sm:text-sm focus:outline-none transition-all ${isBlackCat ? 'hijiki-input' : 'tororo-input'}`}
                  style={{
                    border: `2px solid ${theme.inputBorder}`,
                    background: theme.inputBg,
                    color: isBlackCat ? '#FFFFFF' : theme.headerText,
                    boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.05)'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = theme.inputFocusBorder}
                  onBlur={(e) => e.currentTarget.style.borderColor = theme.inputBorder}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={(!inputText.trim() && safeAttachments.length === 0) || isProcessing}
                  className="px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 md:py-3 rounded-lg sm:rounded-xl md:rounded-2xl font-bold text-xs sm:text-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  style={{
                    background: theme.headerBg,
                    color: theme.headerText,
                    boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
                    textShadow: isBlackCat ? '0 2px 4px rgba(0, 0, 0, 0.5)' : '0 1px 1px rgba(255, 255, 255, 0.5)'
                  }}
                >
                  <span className="hidden sm:inline">傳送</span>
                  <span className="sm:hidden">✨</span>
                </button>
              </div>
            </div>

            {/* 底部裝飾光暈 */}
            <div
              className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none rounded-b-3xl"
              style={{
                background: isBlackCat
                  ? 'linear-gradient(to top, rgba(139, 92, 246, 0.2), transparent)'
                  : 'linear-gradient(to top, rgba(251, 191, 36, 0.15), transparent)'
              }}
            />
          </div>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFileChange(e, 'file')}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFileChange(e, 'image')}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        multiple
        className="hidden"
        onChange={(e) => handleFileChange(e, 'audio')}
      />
    </div>
  )
}
