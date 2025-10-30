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

      {/* 主對話容器 */}
      <div className="relative w-full max-w-4xl h-full flex flex-col p-6">
        {/* 標題 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-5xl">🌙</span>
            <div>
              <h2 className="text-2xl font-bold text-white">黑噗噗</h2>
              <p className="text-sm text-indigo-300">知識管理員・隨時為你解答</p>
            </div>
          </div>

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

        {/* 對話歷史（可選顯示） */}
        {conversationHistory.length > 0 && (
          <div className="flex-1 overflow-y-auto mb-6 space-y-4">
            {conversationHistory.map((conv, index) => (
              <div key={index} className="space-y-3">
                {/* 用戶問題 */}
                <div className="flex justify-end">
                  <div
                    className="max-w-[70%] rounded-2xl px-4 py-3"
                    style={{
                      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6) 0%, rgba(99, 102, 241, 0.5) 100%)',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <p className="text-white text-sm">{conv.question}</p>
                  </div>
                </div>

                {/* 黑噗噗回答 */}
                <div className="flex justify-start">
                  <div
                    className="max-w-[80%] rounded-2xl px-4 py-3"
                    style={{
                      background: 'linear-gradient(135deg, rgba(67, 56, 202, 0.5) 0%, rgba(79, 70, 229, 0.4) 100%)',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeSanitize]}
                      className="text-white text-sm prose prose-sm max-w-none prose-invert"
                      components={{
                        p: ({ ...props }) => <p style={{ color: '#FFFFFF', marginBottom: '0.5em' }} {...props} />,
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
            ))}
          </div>
        )}

        {/* 當前回應區域（打字機效果） */}
        {currentResponse && (
          <div className="mb-6">
            <div className="flex justify-start">
              <div
                className="max-w-[80%] rounded-2xl px-4 py-3"
                style={{
                  background: 'linear-gradient(135deg, rgba(67, 56, 202, 0.5) 0%, rgba(79, 70, 229, 0.4) 100%)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeSanitize]}
                  className="text-white text-sm prose prose-sm max-w-none prose-invert"
                  components={{
                    p: ({ ...props }) => <p style={{ color: '#FFFFFF', marginBottom: '0.5em' }} {...props} />,
                    strong: ({ ...props }) => <strong style={{ color: '#E0E7FF', fontWeight: 'bold' }} {...props} />,
                    em: ({ ...props }) => <em style={{ color: '#C7D2FE' }} {...props} />,
                  }}
                >
                  {currentResponse}
                </ReactMarkdown>
                {/* 打字游標 */}
                <span className="inline-block w-2 h-4 ml-1 bg-white/70 animate-pulse" />
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

        {/* 輸入區域 */}
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
  )
}
