import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Copy, Check, Sparkles, Terminal, Eye, Code } from 'lucide-react'
import { Highlight, themes } from 'prism-react-renderer'

interface SimulatedOutput {
  userInput: string
  claudeResponse: string
  codeOutput?: string
  explanation?: string
}

interface ClaudeSimulatorProps {
  simulatedOutput?: SimulatedOutput
  onUserInput?: (input: string) => void
  placeholder?: string
  readOnly?: boolean
  showTypingEffect?: boolean
}

// 判斷是否為可預覽的 HTML 程式碼
const isPreviewableHTML = (code: string): boolean => {
  return code.includes('<!DOCTYPE html>') ||
         code.includes('<html') ||
         (code.includes('<body') && code.includes('</body>')) ||
         (code.includes('<div') && code.includes('style'))
}

const ClaudeSimulator: React.FC<ClaudeSimulatorProps> = ({
  simulatedOutput,
  onUserInput,
  placeholder = '輸入你的請求...',
  readOnly = false,
  showTypingEffect = true,
}) => {
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [displayedResponse, setDisplayedResponse] = useState('')
  const [displayedCode, setDisplayedCode] = useState('')
  const [showOutput, setShowOutput] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const outputRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // 當 simulatedOutput 變更時，重置狀態
  useEffect(() => {
    setInput('')
    setIsTyping(false)
    setDisplayedResponse('')
    setDisplayedCode('')
    setShowOutput(false)
    setCopied(false)
    setShowPreview(false)
  }, [simulatedOutput?.userInput])

  // 打字機效果
  useEffect(() => {
    if (
      simulatedOutput &&
      showOutput &&
      showTypingEffect &&
      simulatedOutput.claudeResponse
    ) {
      setIsTyping(true)
      setDisplayedResponse('')
      setDisplayedCode('')

      let charIndex = 0
      const response = simulatedOutput.claudeResponse

      const typeInterval = setInterval(() => {
        if (charIndex < response.length) {
          setDisplayedResponse(response.slice(0, charIndex + 1))
          charIndex++
        } else {
          clearInterval(typeInterval)
          // 開始顯示程式碼
          if (simulatedOutput.codeOutput) {
            typeCode(simulatedOutput.codeOutput)
          } else {
            setIsTyping(false)
          }
        }
      }, 20)

      return () => clearInterval(typeInterval)
    } else if (simulatedOutput && showOutput && !showTypingEffect) {
      setDisplayedResponse(simulatedOutput.claudeResponse)
      setDisplayedCode(simulatedOutput.codeOutput || '')
    }
    return undefined
  }, [simulatedOutput, showOutput, showTypingEffect])

  const typeCode = (code: string) => {
    let charIndex = 0
    const codeInterval = setInterval(() => {
      if (charIndex < code.length) {
        setDisplayedCode(code.slice(0, charIndex + 1))
        charIndex++
      } else {
        clearInterval(codeInterval)
        setIsTyping(false)
      }
    }, 10)
  }

  // 自動滾動到底部
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [displayedResponse, displayedCode])

  const handleSubmit = () => {
    if (!input.trim()) return

    if (onUserInput) {
      onUserInput(input)
    }

    // 如果有模擬輸出，顯示它
    if (simulatedOutput) {
      setShowOutput(true)
    }

    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const copyCode = () => {
    if (simulatedOutput?.codeOutput) {
      navigator.clipboard.writeText(simulatedOutput.codeOutput)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleTryDemo = () => {
    if (simulatedOutput) {
      setInput(simulatedOutput.userInput)
    }
  }

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-700 shadow-2xl">
      {/* 標題列 */}
      <div className="bg-gray-800 px-4 py-3 flex items-center gap-3 border-b border-gray-700">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Terminal size={14} />
          <span>Claude Code Simulator</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Sparkles size={14} className="text-purple-400" />
          <span className="text-purple-400 text-xs">模擬模式</span>
        </div>
      </div>

      {/* 輸出區域 */}
      <div
        ref={outputRef}
        className="h-80 overflow-y-auto p-4 space-y-4 bg-gray-900"
      >
        {/* 預設提示 */}
        {!showOutput && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            <Sparkles className="w-12 h-12 text-purple-500 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">試試看輸入你的請求</p>
            {simulatedOutput && (
              <button
                onClick={handleTryDemo}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
              >
                使用範例輸入
              </button>
            )}
          </motion.div>
        )}

        {/* 使用者輸入 */}
        <AnimatePresence>
          {showOutput && simulatedOutput && (
            <>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm">你</span>
                </div>
                <div className="flex-1">
                  <div className="bg-gray-800 rounded-lg p-3 text-gray-200 text-sm">
                    {simulatedOutput.userInput}
                  </div>
                </div>
              </motion.div>

              {/* Claude 回應 */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm">C</span>
                </div>
                <div className="flex-1 space-y-3">
                  {/* 文字回應 */}
                  <div className="bg-gray-800 rounded-lg p-3 text-gray-200 text-sm whitespace-pre-wrap">
                    {displayedResponse}
                    {isTyping && displayedCode === '' && (
                      <span className="inline-block w-2 h-4 bg-purple-500 ml-1 animate-pulse"></span>
                    )}
                  </div>

                  {/* 程式碼輸出 */}
                  {displayedCode && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative"
                    >
                      {/* 工具列 */}
                      <div className="absolute top-2 right-2 flex gap-2 z-10">
                        {isPreviewableHTML(displayedCode) && !isTyping && (
                          <button
                            onClick={() => setShowPreview(!showPreview)}
                            className={`p-1.5 rounded transition-colors flex items-center gap-1 ${
                              showPreview
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-700 hover:bg-gray-600'
                            }`}
                            title={showPreview ? '顯示程式碼' : '預覽結果'}
                          >
                            {showPreview ? (
                              <>
                                <Code size={14} />
                                <span className="text-xs">程式碼</span>
                              </>
                            ) : (
                              <>
                                <Eye size={14} className="text-green-400" />
                                <span className="text-xs text-green-400">預覽</span>
                              </>
                            )}
                          </button>
                        )}
                        <button
                          onClick={copyCode}
                          className="p-1.5 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
                          title="複製程式碼"
                        >
                          {copied ? (
                            <Check size={14} className="text-green-400" />
                          ) : (
                            <Copy size={14} className="text-gray-400" />
                          )}
                        </button>
                      </div>

                      {/* 預覽模式 */}
                      {showPreview && isPreviewableHTML(displayedCode) ? (
                        <div className="rounded-lg overflow-hidden border border-gray-600">
                          <div className="bg-gray-700 px-3 py-1.5 flex items-center gap-2">
                            <Eye size={14} className="text-green-400" />
                            <span className="text-gray-300 text-xs">即時預覽</span>
                          </div>
                          <iframe
                            ref={iframeRef}
                            srcDoc={displayedCode}
                            className="w-full bg-white"
                            style={{ height: '300px', minHeight: '200px' }}
                            title="HTML Preview"
                            sandbox="allow-scripts"
                          />
                        </div>
                      ) : (
                        /* 程式碼模式 */
                        <>
                          <Highlight
                            theme={themes.nightOwl}
                            code={displayedCode}
                            language="javascript"
                          >
                            {({
                              className,
                              style,
                              tokens,
                              getLineProps,
                              getTokenProps,
                            }) => (
                              <pre
                                className={`${className} rounded-lg p-4 text-sm overflow-x-auto`}
                                style={style}
                              >
                                {tokens.map((line, i) => (
                                  <div key={i} {...getLineProps({ line })}>
                                    <span className="text-gray-500 mr-4 select-none">
                                      {String(i + 1).padStart(3, ' ')}
                                    </span>
                                    {line.map((token, key) => (
                                      <span key={key} {...getTokenProps({ token })} />
                                    ))}
                                  </div>
                                ))}
                              </pre>
                            )}
                          </Highlight>
                          {isTyping && (
                            <span className="inline-block w-2 h-4 bg-purple-500 ml-1 animate-pulse absolute bottom-4 right-4"></span>
                          )}
                        </>
                      )}
                    </motion.div>
                  )}

                  {/* 說明 */}
                  {simulatedOutput.explanation && !isTyping && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="bg-purple-900/30 border border-purple-700/50 rounded-lg p-3 text-purple-200 text-sm"
                    >
                      💡 {simulatedOutput.explanation}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* 輸入區域 */}
      {!readOnly && (
        <div className="border-t border-gray-700 p-4 bg-gray-800">
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="flex-1 bg-gray-900 text-gray-200 rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 border border-gray-700"
              rows={2}
            />
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || isTyping}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed self-end"
            >
              <Send size={18} />
            </button>
          </div>
          <p className="text-gray-500 text-xs mt-2">
            按 Enter 送出，Shift + Enter 換行
          </p>
        </div>
      )}
    </div>
  )
}

export default ClaudeSimulator
