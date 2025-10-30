/**
 * 黑噗噗對話介面 - 互動式設計
 * 更像是真正在和貓咪對話，而不是聊天室
 */

import { useState, useRef, useEffect } from 'react'
import { useSSEChat } from '../hooks/useSSEChat'
import { useQuery } from '@apollo/client'
import { GET_CHIEF_ASSISTANT } from '../graphql/knowledge'
import { useSound } from '../hooks/useSound'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import { Z_INDEX_CLASSES } from '../constants/zIndex'
import { Live2DDisplay } from './Live2DDisplay'

interface HijikiChatDialogProps {
  onClose: () => void
}

export const HijikiChatDialog: React.FC<HijikiChatDialogProps> = ({ onClose }) => {
  const [inputText, setInputText] = useState('')
  const [currentResponse, setCurrentResponse] = useState('')
  const [conversationHistory, setConversationHistory] = useState<Array<{
    question: string
    answer: string
  }>>([])

  const { sendChatMessage, isStreaming } = useSSEChat()
  const { data: chiefData } = useQuery(GET_CHIEF_ASSISTANT)
  const { play, playRandomMeow } = useSound()
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const responseEndRef = useRef<HTMLDivElement>(null)

  // 自動聚焦輸入框
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // 自動滾動到最新回應
  useEffect(() => {
    responseEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentResponse])

  const handleSubmit = async () => {
    if (!inputText.trim() || isStreaming) return

    const chiefId = chiefData?.chiefAssistant?.id
    if (!chiefId) {
      alert('找不到黑噗噗')
      return
    }

    const question = inputText.trim()
    play('message_sent')

    // 清空輸入框，開始新對話
    setInputText('')
    setCurrentResponse('')

    // 用於累積完整回應的變數
    let fullResponse = ''

    // 發送 SSE 請求
    await sendChatMessage(question, chiefId, {
      onChunk: (chunk) => {
        fullResponse += chunk
        setCurrentResponse((prev) => prev + chunk)
      },
      onComplete: (_data) => {
        // 完成後，將對話加入歷史記錄
        setConversationHistory((prev) => [
          ...prev,
          {
            question,
            answer: fullResponse
          }
        ])
        setCurrentResponse('')
        play('message_received')
        playRandomMeow()
      },
      onError: (error) => {
        setCurrentResponse(`喵嗚~ 出錯了：${error} 😿`)
        setTimeout(() => {
          setCurrentResponse('')
        }, 3000)
      }
    })
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
        background: 'linear-gradient(to bottom right, rgba(10, 8, 25, 0.98) 0%, rgba(20, 18, 40, 0.98) 50%, rgba(30, 25, 50, 0.98) 100%)'
      }}
    >
      {/* 星空背景裝飾 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-20 text-4xl animate-pulse" style={{ animationDuration: '3s' }}>⭐</div>
        <div className="absolute top-40 right-32 text-3xl animate-pulse" style={{ animationDuration: '4s' }}>✨</div>
        <div className="absolute bottom-32 left-40 text-5xl animate-pulse" style={{ animationDuration: '5s' }}>🌙</div>
        <div className="absolute top-60 right-20 text-2xl animate-pulse" style={{ animationDuration: '3.5s' }}>⭐</div>
        <div className="absolute bottom-40 right-32 text-3xl animate-pulse" style={{ animationDuration: '4.5s' }}>💫</div>
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
            className="text-white/70 hover:text-white transition-colors text-3xl"
          >
            ✕
          </button>
        </div>

        {/* 上方：Live2D 模型 + 標題 - 固定高度 */}
        <div className="flex-shrink-0 flex flex-col items-center pt-4 pb-4">
          <Live2DDisplay
            modelPath="/models/hijiki/hijiki.model3.json"
            width={300}
            height={350}
            isThinking={false}
            isSpeaking={!!currentResponse}
          />
          <div className="mt-2 text-center">
            <h2 className="text-xl font-bold text-white flex items-center justify-center gap-2">
              <span className="text-2xl">🌙</span>
              黑噗噗
            </h2>
            <p className="text-xs text-indigo-300">知識管理員・隨時為你解答</p>
          </div>
        </div>

        {/* 中間：對話歷史 - 限制最大高度 */}
        {conversationHistory.length > 0 && (
          <div className="overflow-y-auto mb-4 space-y-4" style={{ maxHeight: '300px' }}>
            {conversationHistory.map((conv, index) => (
              <div key={index} className="space-y-2">
                {/* 用戶問題 - 更小更簡潔 */}
                <div className="flex justify-end">
                  <div
                    className="max-w-[60%] rounded-xl px-3 py-2 text-xs opacity-60"
                    style={{
                      background: 'rgba(139, 92, 246, 0.3)',
                      backdropFilter: 'blur(5px)'
                    }}
                  >
                    <p className="text-white">{conv.question}</p>
                  </div>
                </div>

                {/* 黑噗噗回答 - 從上方模型說出來的感覺 */}
                <div className="flex justify-center">
                  <div
                    className="w-full rounded-3xl px-8 py-6 relative"
                    style={{
                      background: 'linear-gradient(135deg, rgba(67, 56, 202, 0.9) 0%, rgba(79, 70, 229, 0.85) 100%)',
                      backdropFilter: 'blur(20px)',
                      boxShadow: '0 12px 48px rgba(99, 102, 241, 0.5), 0 0 30px rgba(139, 92, 246, 0.3)',
                      border: '2px solid rgba(139, 92, 246, 0.4)'
                    }}
                  >
                    {/* 對話氣泡尾巴 - 指向上方 */}
                    <div
                      className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-6 h-6 rotate-45"
                      style={{
                        background: 'rgba(67, 56, 202, 0.9)',
                        border: '2px solid rgba(139, 92, 246, 0.4)',
                        borderRight: 'none',
                        borderBottom: 'none'
                      }}
                    />

                    <div className="text-white prose prose-base max-w-none prose-invert">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeSanitize]}
                        components={{
                          p: ({ ...props }) => <p style={{ color: '#FFFFFF', marginBottom: '0.5em', lineHeight: '1.8', fontSize: '16px' }} {...props} />,
                          strong: ({ ...props }) => <strong style={{ color: '#E0E7FF', fontWeight: 'bold' }} {...props} />,
                          em: ({ ...props }) => <em style={{ color: '#C7D2FE' }} {...props} />,
                          a: ({ ...props }) => <a style={{ color: '#A5B4FC', textDecoration: 'underline' }} {...props} />,
                        }}
                      >
                        {conv.answer}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 當前回應區域（打字機效果） - 黑噗噗正在說話 */}
        {currentResponse && (
          <div className="mb-6">
            <div className="flex justify-center animate-fadeIn">
              <div
                className="w-full rounded-3xl px-8 py-6 relative"
                style={{
                  background: 'linear-gradient(135deg, rgba(67, 56, 202, 0.95) 0%, rgba(79, 70, 229, 0.9) 100%)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 12px 48px rgba(99, 102, 241, 0.6), 0 0 40px rgba(139, 92, 246, 0.5)',
                  border: '2px solid rgba(139, 92, 246, 0.5)',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }}
              >
                {/* 對話氣泡尾巴 - 指向上方 */}
                <div
                  className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-6 h-6 rotate-45"
                  style={{
                    background: 'rgba(67, 56, 202, 0.95)',
                    border: '2px solid rgba(139, 92, 246, 0.5)',
                    borderRight: 'none',
                    borderBottom: 'none'
                  }}
                />

                {/* 說話中指示器 */}
                <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 text-3xl animate-bounce">
                  🗣️
                </div>

                <div className="text-white prose prose-base max-w-none prose-invert">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeSanitize]}
                    components={{
                      p: ({ ...props }) => <p style={{ color: '#FFFFFF', marginBottom: '0.5em', lineHeight: '1.8', fontSize: '16px' }} {...props} />,
                      strong: ({ ...props }) => <strong style={{ color: '#E0E7FF', fontWeight: 'bold' }} {...props} />,
                      em: ({ ...props }) => <em style={{ color: '#C7D2FE' }} {...props} />,
                    }}
                  >
                    {currentResponse}
                  </ReactMarkdown>
                  {/* 打字游標 */}
                  <span className="inline-block w-2 h-6 ml-1 bg-white animate-pulse" style={{ animationDuration: '0.8s' }} />
                </div>
              </div>
            </div>
            <div ref={responseEndRef} />
          </div>
        )}

        {/* 提示區域 */}
        {conversationHistory.length === 0 && !currentResponse && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <p className="text-white/60 text-lg">問我任何問題吧～ 🌙</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  '我最近記錄了什麼？',
                  '給我一些建議',
                  '幫我總結一下'
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInputText(suggestion)}
                    className="px-4 py-2 rounded-full text-sm text-white/80 hover:text-white transition-colors"
                    style={{
                      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(99, 102, 241, 0.25) 100%)',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 下方：輸入區域 - 固定不被壓縮 */}
        <div className="flex-shrink-0 mt-auto">
          <div
            className="rounded-2xl p-4"
            style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(99, 102, 241, 0.15) 100%)',
              backdropFilter: 'blur(20px)',
              border: '2px solid rgba(139, 92, 246, 0.3)'
            }}
          >
          <div className="flex gap-3 items-end">
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              placeholder={isStreaming ? "黑噗噗正在思考中..." : "問我任何問題..."}
              className="flex-1 bg-transparent text-white placeholder-white/40 outline-none resize-none min-h-[60px] max-h-[120px]"
              style={{ fontFamily: 'inherit' }}
            />

            <button
              onClick={handleSubmit}
              disabled={!inputText.trim() || isStreaming}
              className="px-6 py-3 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: inputText.trim() && !isStreaming
                  ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.8) 0%, rgba(99, 102, 241, 0.7) 100%)'
                  : 'rgba(139, 92, 246, 0.2)',
                color: '#FFFFFF'
              }}
            >
              {isStreaming ? '思考中...' : '發送 ✨'}
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
