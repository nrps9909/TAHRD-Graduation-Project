import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Copy, Check, Terminal, ExternalLink, Loader2, Zap } from 'lucide-react'
import { Highlight, themes } from 'prism-react-renderer'
import { generateCode, isApiAvailable } from '@/services/geminiApi'

interface SimulatedOutput {
  userInput: string
  claudeResponse: string
  codeOutput?: string | undefined
  explanation?: string | undefined
}

interface ClaudeSimulatorProps {
  simulatedOutput?: SimulatedOutput
  onUserInput?: (input: string) => void
  placeholder?: string
  readOnly?: boolean
  showTypingEffect?: boolean
  useRealApi?: boolean
  initialInput?: string | null
  onInputUsed?: () => void
  fullHeight?: boolean
}

// 判斷程式碼類型
type CodeType = 'html' | 'javascript' | 'none'

const detectCodeType = (code: string): CodeType => {
  if (code.includes('<!DOCTYPE html>') ||
      code.includes('<html') ||
      (code.includes('<body') && code.includes('</body>')) ||
      (code.includes('<div') && code.includes('style'))) {
    return 'html'
  }
  if ((code.includes('function ') || code.includes('const ') || code.includes('let ')) &&
      (code.includes('console.log') || code.includes('return '))) {
    return 'javascript'
  }
  return 'none'
}

// 將 JavaScript 程式碼包裝成可執行的 HTML
const wrapJavaScriptForPreview = (code: string): string => {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>JavaScript 執行結果</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'SF Mono', 'Consolas', 'Monaco', monospace;
      background: #0d0d0d;
      color: #e0e0e0;
      padding: 20px;
      min-height: 100vh;
    }
    .header {
      color: #00d9ff;
      font-size: 14px;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #333;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .header::before {
      content: '▶';
      color: #00ff88;
    }
    .console-output {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 16px;
      font-size: 14px;
      line-height: 1.6;
    }
    .log-line {
      padding: 6px 0;
      border-bottom: 1px solid #222;
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    .log-line:last-child { border-bottom: none; }
    .log-type {
      color: #888;
      font-size: 11px;
      text-transform: uppercase;
      min-width: 40px;
    }
    .log-value { color: #fff; flex: 1; }
    .log-object { color: #00d9ff; }
    .log-number { color: #ff9500; }
    .log-string { color: #00ff88; }
    .log-boolean { color: #ff6b6b; }
    .error {
      color: #ff4444;
      background: rgba(255, 68, 68, 0.1);
      padding: 12px;
      border-radius: 6px;
      margin-top: 8px;
    }
    .empty-state {
      color: #666;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="header">Console 輸出結果</div>
  <div class="console-output" id="output"></div>
  <script>
    const output = document.getElementById('output');
    const originalLog = console.log;
    const logs = [];

    function formatValue(val) {
      if (val === null) return '<span class="log-object">null</span>';
      if (val === undefined) return '<span class="log-object">undefined</span>';
      if (typeof val === 'number') return '<span class="log-number">' + val + '</span>';
      if (typeof val === 'string') return '<span class="log-string">"' + val.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '"</span>';
      if (typeof val === 'boolean') return '<span class="log-boolean">' + val + '</span>';
      if (typeof val === 'object') {
        try {
          return '<span class="log-object">' + JSON.stringify(val, null, 2).replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span>';
        } catch(e) {
          return '<span class="log-object">[Object]</span>';
        }
      }
      return '<span class="log-value">' + String(val).replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span>';
    }

    console.log = function(...args) {
      const formatted = args.map(formatValue).join(' ');
      logs.push('<div class="log-line"><span class="log-type">log</span><div class="log-value">' + formatted + '</div></div>');
      output.innerHTML = logs.join('');
      originalLog.apply(console, args);
    };

    try {
      ${code}
    } catch(e) {
      output.innerHTML += '<div class="error">Error: ' + e.message + '</div>';
    }

    if (logs.length === 0) {
      output.innerHTML = '<div class="empty-state">此程式碼沒有 console.log 輸出</div>';
    }
  </script>
</body>
</html>`
}

// 生成完整 HTML 預覽頁面
const generatePreviewHTML = (code: string, codeType: CodeType): string => {
  if (codeType === 'javascript') {
    return wrapJavaScriptForPreview(code)
  }
  // HTML 直接返回
  return code
}

// 在新分頁開啟預覽
const openPreviewInNewTab = (code: string) => {
  const codeType = detectCodeType(code)
  if (codeType === 'none') return

  const previewHTML = generatePreviewHTML(code, codeType)
  const blob = new Blob([previewHTML], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  // 延遲釋放 URL 以確保新分頁載入完成
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const ClaudeSimulator: React.FC<ClaudeSimulatorProps> = ({
  simulatedOutput,
  onUserInput,
  placeholder = '輸入你的請求...',
  readOnly = false,
  showTypingEffect = true,
  useRealApi = false,
  initialInput,
  onInputUsed,
  fullHeight = false,
}) => {
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [displayedResponse, setDisplayedResponse] = useState('')
  const [displayedCode, setDisplayedCode] = useState('')
  const [showOutput, setShowOutput] = useState(false)
  const [copied, setCopied] = useState(false)
  const [currentOutput, setCurrentOutput] = useState<SimulatedOutput | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [conversationHistory, setConversationHistory] = useState<SimulatedOutput[]>([])
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  const apiAvailable = useRealApi && isApiAvailable()

  // 處理 initialInput 變化
  useEffect(() => {
    if (initialInput) {
      setInput(initialInput)
      onInputUsed?.()
    }
  }, [initialInput, onInputUsed])

  // 當 simulatedOutput 變更時，重置狀態
  useEffect(() => {
    if (!useRealApi) {
      setInput('')
      setIsTyping(false)
      setDisplayedResponse('')
      setDisplayedCode('')
      setShowOutput(false)
      setCopied(false)
      setCurrentOutput(null)
      setError(null)
    }
  }, [simulatedOutput?.userInput, useRealApi])

  // 打字機效果
  useEffect(() => {
    const output = currentOutput || simulatedOutput
    if (output && showOutput && showTypingEffect && output.claudeResponse) {
      setIsTyping(true)
      setDisplayedResponse('')
      setDisplayedCode('')

      let charIndex = 0
      const response = output.claudeResponse

      const typeInterval = setInterval(() => {
        if (charIndex < response.length) {
          setDisplayedResponse(response.slice(0, charIndex + 1))
          charIndex++
        } else {
          clearInterval(typeInterval)
          if (output.codeOutput) {
            typeCode(output.codeOutput)
          } else {
            setIsTyping(false)
          }
        }
      }, 15)

      return () => clearInterval(typeInterval)
    } else if (output && showOutput && !showTypingEffect) {
      setDisplayedResponse(output.claudeResponse)
      setDisplayedCode(output.codeOutput || '')
    }
    return undefined
  }, [currentOutput, simulatedOutput, showOutput, showTypingEffect])

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
    }, 8)
  }

  // 自動滾動
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)

  const handleScroll = () => {
    if (outputRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = outputRef.current
      setShouldAutoScroll(scrollHeight - scrollTop - clientHeight < 100)
    }
  }

  useEffect(() => {
    if (outputRef.current && shouldAutoScroll) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [conversationHistory.length, isLoading, displayedResponse, displayedCode, shouldAutoScroll])

  const handleSubmit = async () => {
    if (!input.trim()) return

    const userInput = input.trim()
    setInput('')
    setError(null)

    if (onUserInput) {
      onUserInput(userInput)
    }

    if (apiAvailable) {
      setIsLoading(true)
      setShowOutput(true)

      const userMessage: SimulatedOutput = {
        userInput,
        claudeResponse: '',
      }
      setCurrentOutput(userMessage)

      try {
        const result = await generateCode(userInput)
        const newOutput: SimulatedOutput = {
          userInput,
          claudeResponse: result.response,
          codeOutput: result.code,
          explanation: result.explanation,
        }
        setCurrentOutput(newOutput)
        setConversationHistory(prev => [...prev, newOutput])
      } catch (err) {
        setError(err instanceof Error ? err.message : '發生錯誤')
        setCurrentOutput(null)
      } finally {
        setIsLoading(false)
      }
    } else if (simulatedOutput) {
      setShowOutput(true)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const copyCode = useCallback((code: string, index?: number) => {
    navigator.clipboard.writeText(code)
    if (index !== undefined) {
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    } else {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [])

  const activeOutput = currentOutput || simulatedOutput

  return (
    <div className={`flex flex-col bg-[#0d0d0d] ${fullHeight ? 'h-full' : 'rounded-xl overflow-hidden'}`}>
      {/* 終端機標題列 */}
      <div className="flex-shrink-0 bg-[#1a1a1a] px-3 py-2 flex items-center gap-2 border-b border-white/5">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
          <div className="w-3 h-3 rounded-full bg-[#27ca40]"></div>
        </div>
        <div className="flex-1 flex items-center justify-center gap-1.5 text-gray-500 text-xs">
          <Terminal size={12} />
          <span>claude-code — bash</span>
        </div>
        <div className="flex items-center gap-1">
          {apiAvailable ? (
            <Zap size={10} className="text-orange-400" />
          ) : null}
        </div>
      </div>

      {/* 終端機輸出區域 */}
      <div
        ref={outputRef}
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto p-4 font-mono text-sm ${fullHeight ? '' : 'h-[400px]'}`}
        style={{ backgroundColor: '#0d0d0d' }}
      >
        {/* 歡迎訊息 */}
        {conversationHistory.length === 0 && !showOutput && !isLoading && (
          <div className="text-gray-500 mb-4">
            <div className="text-cyan-400 mb-2">╭─ Claude Code Simulator</div>
            <div className="text-gray-400 mb-1">│</div>
            <div className="text-gray-400 mb-1">│ {apiAvailable ? '✓ Gemini API 已連接' : '○ 模擬模式'}</div>
            <div className="text-gray-400 mb-1">│</div>
            <div className="text-gray-400 mb-2">╰─ 輸入你的需求開始 Vibe Coding...</div>
          </div>
        )}

        {/* 對話歷史 */}
        {conversationHistory.map((item, index) => (
          <div key={index} className="mb-6">
            {/* 用戶輸入 */}
            <div className="flex items-start gap-2 mb-3">
              <span className="text-green-400 flex-shrink-0">❯</span>
              <span className="text-white">{item.userInput}</span>
            </div>

            {/* AI 回應 */}
            <div className="pl-4 border-l border-gray-700">
              <div className="text-gray-300 whitespace-pre-wrap mb-3">{item.claudeResponse}</div>

              {/* 程式碼區塊 */}
              {item.codeOutput && (
                <div className="relative mt-3 rounded-lg overflow-hidden border border-gray-700">
                  {/* 程式碼標題列 */}
                  <div className="flex items-center justify-between px-3 py-2 bg-[#1a1a1a] border-b border-gray-700">
                    <span className="text-gray-400 text-xs">
                      {detectCodeType(item.codeOutput) === 'html' ? 'HTML' :
                       detectCodeType(item.codeOutput) === 'javascript' ? 'JavaScript' : 'Code'}
                    </span>
                    <div className="flex items-center gap-2">
                      {detectCodeType(item.codeOutput) !== 'none' && (
                        <button
                          onClick={() => openPreviewInNewTab(item.codeOutput!)}
                          className="flex items-center gap-1 px-2 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded text-xs transition-colors"
                          title="在新分頁預覽"
                        >
                          <ExternalLink size={12} />
                          <span>預覽</span>
                        </button>
                      )}
                      <button
                        onClick={() => copyCode(item.codeOutput!, index)}
                        className="flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors"
                        title="複製程式碼"
                      >
                        {copiedIndex === index ? (
                          <Check size={12} className="text-green-400" />
                        ) : (
                          <Copy size={12} className="text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 程式碼內容 */}
                  <Highlight
                    theme={themes.nightOwl}
                    code={item.codeOutput}
                    language={detectCodeType(item.codeOutput) === 'html' ? 'markup' : 'javascript'}
                  >
                    {({ className, style, tokens, getLineProps, getTokenProps }) => (
                      <pre
                        className={`${className} p-4 text-xs overflow-x-auto`}
                        style={{ ...style, background: '#0d0d0d', margin: 0 }}
                      >
                        {tokens.map((line, i) => (
                          <div key={i} {...getLineProps({ line })}>
                            <span className="text-gray-600 mr-4 select-none w-8 inline-block text-right">
                              {i + 1}
                            </span>
                            {line.map((token, key) => (
                              <span key={key} {...getTokenProps({ token })} />
                            ))}
                          </div>
                        ))}
                      </pre>
                    )}
                  </Highlight>
                </div>
              )}

              {/* 說明 */}
              {item.explanation && (
                <div className="mt-3 text-yellow-400/80 text-xs">
                  💡 {item.explanation}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* 載入中 */}
        {isLoading && currentOutput && (
          <div className="mb-4">
            <div className="flex items-start gap-2 mb-3">
              <span className="text-green-400">❯</span>
              <span className="text-white">{currentOutput.userInput}</span>
            </div>
            <div className="pl-4 border-l border-gray-700">
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 size={14} className="animate-spin" />
                <span>思考中...</span>
              </div>
            </div>
          </div>
        )}

        {/* 錯誤訊息 */}
        {error && (
          <div className="mb-4 text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
            ✗ {error}
          </div>
        )}

        {/* 當前回應（打字效果） */}
        <AnimatePresence>
          {showOutput && activeOutput && !isLoading &&
           !conversationHistory.some(h => h.userInput === activeOutput.userInput && h.claudeResponse === activeOutput.claudeResponse) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-4"
            >
              <div className="flex items-start gap-2 mb-3">
                <span className="text-green-400">❯</span>
                <span className="text-white">{activeOutput.userInput}</span>
              </div>
              <div className="pl-4 border-l border-gray-700">
                <div className="text-gray-300 whitespace-pre-wrap">
                  {displayedResponse}
                  {isTyping && !displayedCode && (
                    <span className="inline-block w-2 h-4 bg-cyan-400 ml-0.5 animate-pulse"></span>
                  )}
                </div>

                {displayedCode && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative mt-3 rounded-lg overflow-hidden border border-gray-700"
                  >
                    <div className="flex items-center justify-between px-3 py-2 bg-[#1a1a1a] border-b border-gray-700">
                      <span className="text-gray-400 text-xs">
                        {detectCodeType(displayedCode) === 'html' ? 'HTML' :
                         detectCodeType(displayedCode) === 'javascript' ? 'JavaScript' : 'Code'}
                      </span>
                      {!isTyping && (
                        <div className="flex items-center gap-2">
                          {detectCodeType(displayedCode) !== 'none' && (
                            <button
                              onClick={() => openPreviewInNewTab(displayedCode)}
                              className="flex items-center gap-1 px-2 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded text-xs transition-colors"
                            >
                              <ExternalLink size={12} />
                              <span>預覽</span>
                            </button>
                          )}
                          <button
                            onClick={() => copyCode(displayedCode)}
                            className="flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors"
                          >
                            {copied ? (
                              <Check size={12} className="text-green-400" />
                            ) : (
                              <Copy size={12} className="text-gray-400" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    <Highlight
                      theme={themes.nightOwl}
                      code={displayedCode}
                      language={detectCodeType(displayedCode) === 'html' ? 'markup' : 'javascript'}
                    >
                      {({ className, style, tokens, getLineProps, getTokenProps }) => (
                        <pre
                          className={`${className} p-4 text-xs overflow-x-auto`}
                          style={{ ...style, background: '#0d0d0d', margin: 0 }}
                        >
                          {tokens.map((line, i) => (
                            <div key={i} {...getLineProps({ line })}>
                              <span className="text-gray-600 mr-4 select-none w-8 inline-block text-right">
                                {i + 1}
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
                      <span className="absolute bottom-4 right-4 w-2 h-4 bg-cyan-400 animate-pulse"></span>
                    )}
                  </motion.div>
                )}

                {activeOutput.explanation && !isTyping && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-3 text-yellow-400/80 text-xs"
                  >
                    💡 {activeOutput.explanation}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 命令提示符 */}
        {!isLoading && !isTyping && (
          <div className="flex items-center gap-2 text-gray-500">
            <span className="text-green-400">❯</span>
            <span className="animate-pulse">_</span>
          </div>
        )}
      </div>

      {/* 輸入區域 */}
      {!readOnly && (
        <div className="flex-shrink-0 border-t border-white/5 p-3 bg-[#1a1a1a]">
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-[#0d0d0d] rounded-lg px-3 py-2 border border-gray-700 focus-within:border-cyan-500/50 transition-colors">
              <span className="text-green-400 text-sm">❯</span>
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={apiAvailable ? '輸入你的需求...' : placeholder}
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-600"
                disabled={isLoading}
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || isTyping || isLoading}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 disabled:text-gray-500 text-black font-medium rounded-lg transition-all disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
            <span>Enter 送出 • Shift+Enter 換行</span>
            {apiAvailable && <span className="text-orange-400">Gemini 2.5</span>}
          </div>
        </div>
      )}
    </div>
  )
}

export default ClaudeSimulator
