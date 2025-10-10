import {
  useEffect,
  useRef,
  useState,
} from 'react'
import * as PIXI from 'pixi.js'
import { Live2DModel } from 'pixi-live2d-display/cubism4'
import { useMutation, useQuery } from '@apollo/client'
import { UPLOAD_KNOWLEDGE, CHAT_WITH_CHIEF, GET_CHIEF_ASSISTANT } from '../graphql/knowledge'
import type { UploadKnowledgeInput, ChatWithAssistantInput } from '../graphql/knowledge'
import { useSound } from '../hooks/useSound'
import { Z_INDEX_CLASSES } from '../constants/zIndex'
import { useCatChat } from '../hooks/useCatChat'
import type { ChatMessage } from '../stores/chatStore'

// Register PIXI globally for Live2D
;(window as any).PIXI = PIXI

interface Live2DCatProps {
  modelPath: string
  onClose?: () => void
}

export default function Live2DCat({
  modelPath,
  onClose,
}: Live2DCatProps) {
  // 判断是白猫还是黑猫
  const isBlackCat = modelPath.includes('hijiki')
  const catName = isBlackCat ? '黑噗噗' : '白噗噗'
  const catEmoji = isBlackCat ? '🐈‍⬛' : '🐱'
  const catDescription = isBlackCat ? '你的神秘小夥伴 🌙' : '你的療癒小夥伴 💕'

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
  const [chatWithChief] = useMutation(CHAT_WITH_CHIEF)
  const { data: chiefData } = useQuery(GET_CHIEF_ASSISTANT)

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
    // Delay to ensure user interaction (browsers require user interaction for audio)
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
        // Register PIXI ticker
        Live2DModel.registerTicker(PIXI.Ticker)

        // Get container dimensions
        const containerWidth = live2dContainerRef.current.clientWidth
        const containerHeight = live2dContainerRef.current.clientHeight

        // Create PIXI Application with full container size
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

        // Load Live2D model
        try {
          const model = await Live2DModel.from(modelPath)
          modelRef.current = model

          // Calculate scale to fit container - use 1.1x to occupy ~80% of the space
          const targetScale = Math.min(containerWidth / 2048, containerHeight / 2048) * 1.1

          // Set scale and position - center horizontally, align to bottom with padding
          model.scale.set(targetScale)
          model.position.set(containerWidth / 2, containerHeight * 0.9)
          model.anchor.set(0.5, 1) // Anchor at bottom center

          // Add to stage
          app.stage.addChild(model)

          // Update loop
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
  const playMotionForState = (state: typeof catState) => {
    if (!modelRef.current) return

    try {
      const internalModel = (modelRef.current as any).internalModel
      if (!internalModel?.motionManager) return

      // Map states to motion groups
      const motionMap: Record<typeof catState, string> = {
        idle: 'idle',        // 00_idle
        thinking: 'TapBody', // 思考動作
        listening: 'Shake',  // 聆聽/注意動作
        talking: 'idle',     // 說話時的動作
      }

      const motionGroup = motionMap[state]
      internalModel.motionManager.startMotion(motionGroup, 0)
    } catch (e) {
      console.log('Motion trigger error:', e)
    }
  }

  // Trigger motion when state changes
  useEffect(() => {
    playMotionForState(catState)
  }, [catState])

  // Trigger motion when new message arrives (legacy support)
  useEffect(() => {
    if (modelRef.current && triggerMotion) {
      playMotionForState(catState)
      setTriggerMotion(false)
    }
  }, [triggerMotion, catState])

  const handleSendMessage = async () => {
    // Must have either text or attachments
    if (!inputText.trim() && safeAttachments.length === 0) return
    if (isProcessing) return // Prevent double submission

    const userContent = inputText || '上傳了檔案'
    const hasAttachments = safeAttachments.length > 0

    // Play message sent sound
    play('message_sent')

    // Add user message to UI
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

    // User is speaking -> cat is listening
    setCatState('listening')
    play('meow_curious') // Cat is listening

    // Start thinking after a brief moment
    setTimeout(() => {
      setCatState('thinking')
      play('meow_thinking') // Cat starts thinking
      playTypingSequence() // Simulate AI processing with typing sound
    }, 500)

    try {
      // 判断模式：有文件时使用知识上传模式，否则使用对话模式
      if (hasAttachments) {
        // === 知识上传模式 ===
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

          // Create response message with AI analysis
          let responseContent = `喵~ 我已經幫你分析並儲存了！✨\n\n`
          responseContent += `📝 **摘要:** ${result.distribution.chiefSummary}\n\n`

          if (result.memoriesCreated.length > 0) {
            responseContent += `💾 **已儲存到 ${result.memoriesCreated.length} 個知識庫:**\n`
            result.memoriesCreated.forEach((memory: any) => {
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

          // Play success sounds
          play('upload_success')
          setTimeout(() => {
            play('message_received')
            playRandomMeow() // Happy meow after successful response
          }, 300)

          addMessage(assistantMessage)
        }
      } else {
        // === 对话模式 ===
        const chiefId = chiefData?.chiefAssistant?.id

        if (!chiefId) {
          throw new Error('找不到 Chief Assistant')
        }

        const chatInput: ChatWithAssistantInput = {
          assistantId: chiefId,
          message: userContent,
          contextType: 'GENERAL_CHAT'
        }

        const { data } = await chatWithChief({
          variables: { input: chatInput }
        })

        if (data?.chatWithAssistant) {
          const result = data.chatWithAssistant

          const assistantMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            type: 'assistant',
            content: result.assistantResponse,
            timestamp: new Date(),
          }

          // Play success sounds
          setTimeout(() => {
            play('message_received')
            playRandomMeow() // Happy meow after successful response
          }, 300)

          addMessage(assistantMessage)
        }
      }
    } catch (error) {
      console.error('處理失敗:', error)

      // Error message
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: '喵嗚~ 處理失敗了... 請確認後端服務是否正常運行 😿',
        timestamp: new Date(),
      }
      addMessage(errorMessage)
    } finally {
      setIsProcessing(false)

      // Cat is now talking
      setCatState('talking')

      // Return to idle after speaking
      setTimeout(() => {
        setCatState('idle')
      }, 2000)
    }
  }

  // Helper function to determine content type
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

    // Check if adding these files would exceed the limit
    if (safeAttachments.length + files.length > 10) {
      alert('最多只能上傳 10 個檔案！')
      return
    }

    // Add files to pending attachments
    const newAttachments = Array.from(files).map(file => ({
      type: (type === 'audio' ? 'audio' : type === 'image' ? 'image' : 'file') as 'image' | 'file' | 'audio',
      name: file.name,
      url: URL.createObjectURL(file),
      file: file,
    }))

    newAttachments.forEach(att => addPendingAttachment(att))

    // Play notification sound for successful upload
    play('notification')

    // Reset the file input
    e.target.value = ''
  }

  const removeAttachment = (index: number) => {
    // Revoke the object URL to free memory
    if (safeAttachments[index]) {
      URL.revokeObjectURL(safeAttachments[index].url)
    }
    removePendingAttachment(index)
  }

  const toggleRecording = () => {
    if (isRecording) {
      // Stop recording immediately and add to pending attachments
      setIsRecording(false)
      setCatState('idle')

      // Play notification for recording stopped
      play('notification')

      // Create a mock audio file
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
      // Check if we can add more attachments
      if (safeAttachments.length >= 10) {
        alert('最多只能上傳 10 個檔案！')
        return
      }

      // Start recording - cat is listening
      setIsRecording(true)
      setCatState('listening')

      // Play notification for recording started
      play('notification')
      play('meow_curious') // Cat is curious/listening
    }
  }

  // 主题颜色配置
  const theme = isBlackCat ? {
    // ChatGPT 同款黑白灰配色
    bgGradient: 'from-gray-900/60 via-gray-800/60 to-gray-900/60',
    cardGradient: 'from-[#343541]/95 to-[#202123]/95',
    headerBorder: 'border-gray-700',
    avatarGradient: 'from-gray-700 to-gray-800',
    titleGradient: 'from-gray-300 to-gray-400',
    buttonGradient: 'from-gray-600 to-gray-700',
    buttonHover: 'hover:from-gray-700 hover:to-gray-800',
  } : {
    bgGradient: 'from-baby-pink/30 via-baby-yellow/30 to-baby-peach/30',
    cardGradient: 'from-baby-pink/95 to-baby-yellow/95',
    headerBorder: 'border-baby-blush',
    avatarGradient: 'from-baby-pink to-baby-blush',
    titleGradient: 'from-pink-400 to-yellow-400',
    buttonGradient: 'from-baby-pink to-baby-blush',
    buttonHover: 'hover:scale-110',
  }

  return (
    <div className={`fixed inset-0 ${Z_INDEX_CLASSES.FULLSCREEN_CHAT} flex items-center justify-center bg-gradient-to-br ${isBlackCat ? 'from-slate-900/95 via-indigo-950/95 to-purple-950/95' : theme.bgGradient} backdrop-blur-md animate-fadeIn`}>
      <div className={`relative w-full h-full max-w-7xl max-h-[90vh] mx-4 bg-gradient-to-br ${isBlackCat ? 'from-slate-800/98 via-indigo-900/98 to-purple-900/98' : theme.cardGradient} backdrop-blur-xl rounded-[3rem] ${isBlackCat ? 'shadow-[0_0_60px_rgba(99,102,241,0.3)] border-4 border-indigo-500/40' : 'shadow-cute-xl'} overflow-hidden animate-scale-in`}>

        {/* Header */}
        <div
          className={`relative backdrop-blur-sm border-b-4 px-6 py-4 ${isBlackCat ? 'border-indigo-500/50 bg-gradient-to-r from-slate-800/95 to-indigo-900/95' : `${theme.headerBorder} bg-white/80`}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-14 h-14 bg-gradient-to-br ${isBlackCat ? 'from-indigo-600 to-purple-600' : theme.avatarGradient} rounded-full flex items-center justify-center ${isBlackCat ? 'shadow-[0_0_20px_rgba(99,102,241,0.5)]' : 'shadow-cute'} animate-bounce-gentle border-2 ${isBlackCat ? 'border-indigo-400/40' : ''}`}>
                <span className="text-3xl">{catEmoji}</span>
              </div>
              <div>
                <h2
                  className={`text-2xl font-bold ${isBlackCat ? 'bg-gradient-to-r from-indigo-200 to-purple-200 bg-clip-text text-transparent' : 'bg-gradient-to-r bg-clip-text text-transparent'}`}
                  style={{
                    backgroundImage: isBlackCat ? undefined : `linear-gradient(to right, ${theme.titleGradient})`
                  }}
                >
                  {catName}
                </h2>
                <p className={`text-sm ${isBlackCat ? 'text-indigo-300' : 'text-gray-600'}`}>{catDescription}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Sound Toggle Button */}
              <button
                onClick={() => {
                  toggleSound()
                  play('button_click')
                }}
                className={`w-12 h-12 ${
                  soundEnabled
                    ? isBlackCat ? 'bg-gradient-to-br from-indigo-600 to-purple-600 border-2 border-indigo-400/40' : `bg-gradient-to-br ${theme.buttonGradient}`
                    : 'bg-gray-600'
                } hover:scale-110 text-white rounded-xl ${isBlackCat && soundEnabled ? 'shadow-[0_0_20px_rgba(99,102,241,0.4)]' : 'shadow-cute'} flex items-center justify-center transition-all active:scale-95`}
                title={soundEnabled ? '關閉音效' : '開啟音效'}
              >
                <span className="text-xl">{soundEnabled ? '🔊' : '🔇'}</span>
              </button>

              {/* Close Button */}
              <button
                onClick={() => {
                  play('button_click')
                  onClose?.()
                }}
                className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-500 hover:from-red-500 hover:to-red-600 text-white rounded-xl shadow-lg border-2 border-red-300 flex items-center justify-center transition-all hover:scale-110 active:scale-95 font-bold"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex h-[calc(100%-88px)]">
          {/* Live2D Model Area */}
          <div className={`w-1/3 bg-gradient-to-br ${isBlackCat ? 'from-slate-800/80 to-indigo-900/80 border-r-4 border-indigo-500/30' : 'from-baby-cream/50 to-baby-yellow/50 border-r-4 border-baby-blush/30'} flex flex-col items-center justify-center p-6`}>
            <div className="relative w-full h-full flex items-center justify-center">
              {showFallback ? (
                <div className="text-center animate-gentle-float">
                  <div className="text-9xl mb-4 filter drop-shadow-lg">{catEmoji}</div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl px-6 py-3 shadow-cute">
                    <p className={`text-cute-lg font-bold bg-gradient-to-r ${theme.titleGradient} bg-clip-text text-transparent`}>
                      {catName}在這裡！
                    </p>
                    <p className="text-cute-xs text-gray-500 mt-1">
                      Live2D 模型載入中...
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  ref={live2dContainerRef}
                  className="w-full h-full"
                  style={{
                    position: 'relative',
                  }}
                />
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
                >
                  <div
                    className={`max-w-[70%] select-text ${
                      message.type === 'user'
                        ? `${isBlackCat ? 'bg-gradient-to-br from-indigo-600/90 to-purple-600/90 text-indigo-50 border-2 border-indigo-400/40 shadow-[0_0_20px_rgba(99,102,241,0.3)]' : 'bg-gradient-to-br from-baby-blush to-baby-pink text-gray-800'}`
                        : isBlackCat ? 'bg-gradient-to-br from-slate-700/90 to-slate-800/90 text-indigo-100 border-2 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-white/90 text-gray-800'
                    } rounded-2xl px-5 py-3`}
                  >
                    {message.attachments && message.attachments.map((att, idx) => (
                      <div key={idx} className="mb-2">
                        {att.type === 'image' && (
                          <img src={att.url} alt={att.name} className="rounded-xl max-w-full h-auto" />
                        )}
                        {att.type === 'audio' && (
                          <div className={`flex items-center gap-2 rounded-xl px-3 py-2 select-text ${isBlackCat ? 'bg-slate-600/50 border border-indigo-400/30' : 'bg-baby-cream/50'}`}>
                            <span className="text-2xl">🎵</span>
                            <span className={`text-sm select-text ${isBlackCat ? 'text-indigo-200' : ''}`}>{att.name}</span>
                          </div>
                        )}
                        {att.type === 'file' && (
                          <div className={`flex items-center gap-2 rounded-xl px-3 py-2 select-text ${isBlackCat ? 'bg-slate-600/50 border border-indigo-400/30' : 'bg-baby-cream/50'}`}>
                            <span className="text-2xl">📄</span>
                            <span className={`text-sm select-text ${isBlackCat ? 'text-indigo-200' : ''}`}>{att.name}</span>
                          </div>
                        )}
                      </div>
                    ))}
                    <p className="text-cute-base leading-relaxed select-text">{message.content}</p>
                    <p className={`text-cute-xs mt-1 select-text ${isBlackCat ? 'text-indigo-300/70' : 'text-gray-400'}`}>
                      {new Date(message.timestamp).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className={`border-t-4 ${isBlackCat ? 'border-indigo-500/40' : 'border-baby-blush/30'} ${isBlackCat ? 'bg-gradient-to-r from-slate-800/95 to-indigo-900/95' : 'bg-white/80'} backdrop-blur-sm p-4`}>
              {/* Pending Attachments Preview */}
              {safeAttachments.length > 0 && (
                <div className={`mb-3 p-3 rounded-xl ${isBlackCat ? 'bg-slate-700/50' : 'bg-baby-cream/50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-semibold ${isBlackCat ? 'text-indigo-200' : 'text-gray-700'}`}>
                      待發送的檔案 ({safeAttachments.length}/10)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {safeAttachments.map((att, index) => (
                      <div
                        key={index}
                        className={`relative group rounded-lg p-2 shadow-sm flex items-center gap-2 max-w-[200px] ${isBlackCat ? 'bg-slate-600/60 border-2 border-indigo-400/30' : 'bg-white'}`}
                      >
                        {att.type === 'image' && (
                          <img src={att.url} alt={att.name} className="w-10 h-10 object-cover rounded" />
                        )}
                        {att.type === 'audio' && (
                          <span className="text-2xl">🎵</span>
                        )}
                        {att.type === 'file' && (
                          <span className="text-2xl">📄</span>
                        )}
                        <span className={`text-xs truncate flex-1 ${isBlackCat ? 'text-indigo-100' : 'text-gray-600'}`}>{att.name}</span>
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

              <div className="flex items-end gap-3">
                {/* Upload Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleFileUpload('image')}
                    className={`w-12 h-12 bg-gradient-to-br ${isBlackCat ? 'from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 border-2 border-indigo-400/30' : `${theme.buttonGradient} ${theme.buttonHover}`} text-white rounded-xl shadow-cute transition-all hover:scale-105 active:scale-95 flex items-center justify-center`}
                    title="上傳圖片"
                  >
                    <span className="text-xl">🖼️</span>
                  </button>
                  <button
                    onClick={() => handleFileUpload('file')}
                    className={`w-12 h-12 bg-gradient-to-br ${isBlackCat ? 'from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 border-2 border-indigo-400/30' : 'from-baby-yellow to-baby-butter hover:from-yellow-300 hover:to-yellow-400'} text-white rounded-xl shadow-cute transition-all hover:scale-105 active:scale-95 flex items-center justify-center`}
                    title="上傳檔案"
                  >
                    <span className="text-xl">📎</span>
                  </button>
                  <button
                    onClick={toggleRecording}
                    className={`w-12 h-12 bg-gradient-to-br ${
                      isRecording
                        ? 'from-red-400 to-red-500 animate-pulse'
                        : isBlackCat ? 'from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 border-2 border-indigo-400/30' : 'from-baby-peach to-pink-300 hover:from-pink-300 hover:to-pink-400'
                    } text-white rounded-xl shadow-cute transition-all hover:scale-105 active:scale-95 flex items-center justify-center`}
                    title={isRecording ? '停止錄音' : '錄音'}
                  >
                    <span className="text-xl">{isRecording ? '⏹️' : '🎤'}</span>
                  </button>
                </div>

                {/* Text Input */}
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !isProcessing && handleSendMessage()}
                    disabled={isProcessing}
                    placeholder={`跟${catName}說些什麼吧... ${isBlackCat ? '🌙' : '💕'}`}
                    className={`flex-1 px-5 py-3 ${isBlackCat ? 'bg-slate-700/80 text-indigo-50 placeholder-indigo-300/60 border-indigo-400/40 focus:border-indigo-400 focus:ring-indigo-400/30' : 'bg-white/90 text-gray-800 placeholder-gray-400 border-baby-blush/50 focus:border-baby-pink focus:ring-baby-pink/20'} border-2 rounded-xl focus:outline-none focus:ring-2 font-medium transition-all`}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={(!inputText.trim() && safeAttachments.length === 0) || isProcessing}
                    className={`px-6 py-3 bg-gradient-to-br ${isBlackCat ? 'from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 border-2 border-indigo-300/40' : `${theme.buttonGradient} ${theme.buttonHover}`} disabled:from-gray-300 disabled:to-gray-400 disabled:border-gray-300 text-white rounded-xl font-bold shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95 disabled:cursor-not-allowed disabled:hover:scale-100`}
                  >
                    {isProcessing ? '處理中... ⏳' : '發送 ✨'}
                  </button>
                </div>
              </div>
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
    </div>
  )
}
