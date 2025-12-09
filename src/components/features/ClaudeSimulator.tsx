import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Copy, Check, Sparkles, Terminal, Eye, Code, Loader2, Zap } from 'lucide-react'
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
}

// 判斷程式碼類型
type CodeType = 'html' | 'javascript' | 'none'

const detectCodeType = (code: string): CodeType => {
  // 檢查是否為 HTML
  if (code.includes('<!DOCTYPE html>') ||
      code.includes('<html') ||
      (code.includes('<body') && code.includes('</body>')) ||
      (code.includes('<div') && code.includes('style'))) {
    return 'html'
  }

  // 檢查是否為 JavaScript (有 function 或 console.log)
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
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Consolas', 'Monaco', monospace;
      background: #1a1a2e;
      color: #eee;
      padding: 16px;
      min-height: 100vh;
    }
    .output-title {
      color: #82aaff;
      font-size: 12px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .output-title::before {
      content: '▶';
      color: #addb67;
    }
    .console-output {
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 6px;
      padding: 12px;
      font-size: 13px;
      line-height: 1.5;
    }
    .log-line {
      padding: 4px 0;
      border-bottom: 1px solid #21262d;
    }
    .log-line:last-child { border-bottom: none; }
    .log-type { color: #7ee787; margin-right: 8px; }
    .log-value { color: #f0f6fc; }
    .log-object { color: #79c0ff; }
    .log-number { color: #f78166; }
    .log-string { color: #a5d6ff; }
    .error { color: #f85149; }
  </style>
</head>
<body>
  <div class="output-title">Console 輸出結果</div>
  <div class="console-output" id="output"></div>
  <script>
    const output = document.getElementById('output');
    const originalLog = console.log;
    const logs = [];

    // 格式化輸出值
    function formatValue(val) {
      if (val === null) return '<span class="log-object">null</span>';
      if (val === undefined) return '<span class="log-object">undefined</span>';
      if (typeof val === 'number') return '<span class="log-number">' + val + '</span>';
      if (typeof val === 'string') return '<span class="log-string">"' + val + '"</span>';
      if (typeof val === 'object') {
        try {
          return '<span class="log-object">' + JSON.stringify(val, null, 2) + '</span>';
        } catch(e) {
          return '<span class="log-object">[Object]</span>';
        }
      }
      return '<span class="log-value">' + String(val) + '</span>';
    }

    // 攔截 console.log
    console.log = function(...args) {
      const formatted = args.map(formatValue).join(' ');
      logs.push('<div class="log-line"><span class="log-type">log:</span>' + formatted + '</div>');
      output.innerHTML = logs.join('');
      originalLog.apply(console, args);
    };

    try {
      ${code}
    } catch(e) {
      output.innerHTML += '<div class="log-line error">❌ Error: ' + e.message + '</div>';
    }

    if (logs.length === 0) {
      output.innerHTML = '<div class="log-line" style="color: #8b949e;">（此程式碼沒有 console.log 輸出）</div>';
    }
  </script>
</body>
</html>`
}

const ClaudeSimulator: React.FC<ClaudeSimulatorProps> = ({
  simulatedOutput,
  onUserInput,
  placeholder = '輸入你的請求...',
  readOnly = false,
  showTypingEffect = true,
  useRealApi = false,
}) => {
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [displayedResponse, setDisplayedResponse] = useState('')
  const [displayedCode, setDisplayedCode] = useState('')
  const [showOutput, setShowOutput] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [currentOutput, setCurrentOutput] = useState<SimulatedOutput | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [conversationHistory, setConversationHistory] = useState<SimulatedOutput[]>([])
  const outputRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const apiAvailable = useRealApi && isApiAvailable()

  // 當 simulatedOutput 變更時，重置狀態
  useEffect(() => {
    if (!useRealApi) {
      setInput('')
      setIsTyping(false)
      setDisplayedResponse('')
      setDisplayedCode('')
      setShowOutput(false)
      setCopied(false)
      setShowPreview(false)
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
          // 開始顯示程式碼
          if (output.codeOutput) {
            typeCode(output.codeOutput)
          } else {
            setIsTyping(false)
          }
        }
      }, 20)

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
    }, 10)
  }

  // 自動滾動到底部
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [displayedResponse, displayedCode, conversationHistory])

  const handleSubmit = async () => {
    if (!input.trim()) return

    const userInput = input.trim()
    setInput('')
    setError(null)

    if (onUserInput) {
      onUserInput(userInput)
    }

    // 使用真實 API
    if (apiAvailable) {
      setIsLoading(true)
      setShowOutput(true)

      // 添加用戶輸入到對話歷史
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
      // 使用模擬輸出
      setShowOutput(true)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const copyCode = () => {
    const output = currentOutput || simulatedOutput
    if (output?.codeOutput) {
      navigator.clipboard.writeText(output.codeOutput)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleTryDemo = () => {
    if (simulatedOutput) {
      setInput(simulatedOutput.userInput)
    }
  }

  const activeOutput = currentOutput || simulatedOutput

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
          {apiAvailable ? (
            <>
              <Zap size={14} className="text-amber-400" />
              <span className="text-amber-400 text-xs">Gemini 2.5 Flash</span>
            </>
          ) : (
            <>
              <Sparkles size={14} className="text-emerald-400" />
              <span className="text-emerald-400 text-xs">模擬模式</span>
            </>
          )}
        </div>
      </div>

      {/* 輸出區域 */}
      <div
        ref={outputRef}
        className="h-80 overflow-y-auto p-4 space-y-4 bg-gray-900"
      >
        {/* 預設提示 */}
        {!showOutput && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            {apiAvailable ? (
              <Zap className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            ) : (
              <Sparkles className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            )}
            <p className="text-gray-400 mb-4">
              {apiAvailable ? '輸入你的需求，Gemini 會幫你生成程式碼' : '試試看輸入你的請求'}
            </p>
            {simulatedOutput && !apiAvailable && (
              <button
                onClick={handleTryDemo}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm"
              >
                使用範例輸入
              </button>
            )}
          </motion.div>
        )}

        {/* 載入中 */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 text-gray-400"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center flex-shrink-0">
              <Loader2 size={16} className="text-white animate-spin" />
            </div>
            <span>Gemini 正在思考中...</span>
          </motion.div>
        )}

        {/* 錯誤訊息 */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 text-red-300"
          >
            ❌ {error}
          </motion.div>
        )}

        {/* 使用者輸入和回應 */}
        <AnimatePresence>
          {showOutput && activeOutput && !isLoading && (
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
                    {activeOutput.userInput}
                  </div>
                </div>
              </motion.div>

              {/* Claude/Gemini 回應 */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex gap-3"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  apiAvailable
                    ? 'bg-gradient-to-br from-amber-500 to-amber-600'
                    : 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                }`}>
                  <span className="text-white text-sm">{apiAvailable ? 'G' : 'C'}</span>
                </div>
                <div className="flex-1 space-y-3">
                  {/* 文字回應 */}
                  <div className="bg-gray-800 rounded-lg p-3 text-gray-200 text-sm whitespace-pre-wrap">
                    {displayedResponse}
                    {isTyping && displayedCode === '' && (
                      <span className="inline-block w-2 h-4 bg-emerald-500 ml-1 animate-pulse"></span>
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
                        {detectCodeType(displayedCode) !== 'none' && !isTyping && (
                          <button
                            onClick={() => setShowPreview(!showPreview)}
                            className={`p-1.5 rounded transition-colors flex items-center gap-1 ${
                              showPreview
                                ? 'bg-emerald-600 text-white'
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
                                <span className="text-xs text-green-400">
                                  {detectCodeType(displayedCode) === 'javascript' ? '執行' : '預覽'}
                                </span>
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
                      {showPreview && detectCodeType(displayedCode) !== 'none' ? (
                        <div className="rounded-lg overflow-hidden border border-gray-600">
                          <div className="bg-gray-700 px-3 py-1.5 flex items-center gap-2">
                            <Eye size={14} className="text-green-400" />
                            <span className="text-gray-300 text-xs">
                              {detectCodeType(displayedCode) === 'javascript' ? '執行結果' : '即時預覽'}
                            </span>
                          </div>
                          <iframe
                            ref={iframeRef}
                            srcDoc={
                              detectCodeType(displayedCode) === 'javascript'
                                ? wrapJavaScriptForPreview(displayedCode)
                                : displayedCode
                            }
                            className="w-full bg-white"
                            style={{ height: '300px', minHeight: '200px' }}
                            title="Code Preview"
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
                            <span className="inline-block w-2 h-4 bg-emerald-500 ml-1 animate-pulse absolute bottom-4 right-4"></span>
                          )}
                        </>
                      )}
                    </motion.div>
                  )}

                  {/* 說明 */}
                  {activeOutput.explanation && !isTyping && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="bg-emerald-900/30 border border-emerald-700/50 rounded-lg p-3 text-emerald-200 text-sm"
                    >
                      💡 {activeOutput.explanation}
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
              placeholder={apiAvailable ? '描述你想要的程式...' : placeholder}
              className="flex-1 bg-gray-900 text-gray-200 rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 border border-gray-700"
              rows={2}
              disabled={isLoading}
            />
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || isTyping || isLoading}
              className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed self-end ${
                apiAvailable
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
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
