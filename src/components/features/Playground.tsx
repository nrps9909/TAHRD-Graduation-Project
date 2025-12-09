import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, ArrowLeft, Zap, Terminal, Cpu, Code2, Bug, Wrench, FileCode } from 'lucide-react'
import { Link } from 'react-router-dom'
import ClaudeSimulator from './ClaudeSimulator'
import { isApiAvailable } from '@/services/geminiApi'

// 建議的快速提示
const suggestions = [
  {
    id: 'hello',
    text: '幫我寫一個 Hello World 網頁',
    icon: Code2,
  },
  {
    id: 'calculator',
    text: '做一個簡單的計算機',
    icon: Cpu,
  },
  {
    id: 'todo',
    text: '建立一個待辦事項功能',
    icon: FileCode,
  },
  {
    id: 'debug',
    text: '這段程式碼有 bug，幫我修復',
    icon: Bug,
  },
  {
    id: 'refactor',
    text: '幫我重構這段程式碼',
    icon: Wrench,
  },
]

const Playground: React.FC = () => {
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null)
  const apiAvailable = isApiAvailable()

  const handleSuggestionClick = (text: string) => {
    setSelectedSuggestion(text)
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Apple 風格背景效果 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-apple-blue/[0.03] rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-apple-purple/[0.02] rounded-full blur-[100px]" />
      </div>

      {/* 導航列 - Apple 風格 */}
      <nav className="relative z-10 border-b border-white/10 glass">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-1.5 sm:gap-2 text-apple-gray-400 hover:text-apple-blue transition-colors"
          >
            <ArrowLeft size={16} className="sm:w-[18px] sm:h-[18px]" />
            <span className="text-xs sm:text-sm chinese-text hidden xs:inline">返回冒險地圖</span>
            <span className="text-xs sm:text-sm chinese-text xs:hidden">返回</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-apple-blue flex items-center justify-center">
              <Terminal className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            </div>
            <div className="hidden xs:block">
              <h1 className="text-sm sm:text-lg font-semibold text-apple-gray-50">
                Claude Code Playground
              </h1>
              <p className="text-[10px] sm:text-xs text-apple-gray-400">
                體驗 AI 程式設計助手
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {apiAvailable ? (
              <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-apple-orange/10 rounded-full">
                <Zap size={12} className="sm:w-3.5 sm:h-3.5 text-apple-orange" />
                <span className="text-apple-orange text-[10px] sm:text-xs font-medium">Gemini</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-apple-gray-700 rounded-full">
                <Sparkles size={12} className="sm:w-3.5 sm:h-3.5 text-apple-gray-400" />
                <span className="text-apple-gray-400 text-[10px] sm:text-xs font-medium">模擬</span>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto p-4 sm:p-6">
        {/* 主要內容區 */}
        <div className="space-y-4 sm:space-y-6">
          {/* 說明區塊 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-3 sm:space-y-4 py-4 sm:py-6"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-apple-gray-50 tracking-tight">
              用自然語言寫程式
            </h2>
            <p className="text-apple-gray-400 max-w-2xl mx-auto chinese-text text-sm sm:text-base px-4">
              {apiAvailable
                ? '輸入你的需求，AI 會幫你生成程式碼。就像和一位專業程式設計師對話一樣！'
                : '請設定 Gemini API Key 以啟用真實的 AI 回應功能。'}
            </p>
          </motion.div>

          {/* 快速建議 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap justify-center gap-2 sm:gap-3 px-2"
          >
            {suggestions.map((suggestion) => {
              const Icon = suggestion.icon
              return (
                <button
                  key={suggestion.id}
                  onClick={() => handleSuggestionClick(suggestion.text)}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-apple-gray-800 hover:bg-apple-gray-700 border border-white/10 hover:border-white/20 rounded-full text-apple-gray-300 hover:text-apple-gray-50 transition-all duration-300 text-xs sm:text-sm chinese-text"
                >
                  <Icon size={12} className="sm:w-3.5 sm:h-3.5" />
                  <span className="line-clamp-1">{suggestion.text}</span>
                </button>
              )
            })}
          </motion.div>

          {/* 模擬器 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <ClaudeSimulator
              readOnly={false}
              showTypingEffect={true}
              useRealApi={true}
              initialInput={selectedSuggestion}
              onInputUsed={() => setSelectedSuggestion(null)}
            />
          </motion.div>

          {/* 底部提示 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex justify-center gap-4 sm:gap-6 text-apple-gray-400 text-xs sm:text-sm"
          >
            <div className="flex items-center gap-1.5 sm:gap-2">
              <kbd className="px-2 sm:px-2.5 py-1 bg-apple-gray-800 rounded-lg text-[10px] sm:text-xs border border-white/10">Enter</kbd>
              <span>送出</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <kbd className="px-2 sm:px-2.5 py-1 bg-apple-gray-800 rounded-lg text-[10px] sm:text-xs border border-white/10">Shift+Enter</kbd>
              <span>換行</span>
            </div>
          </motion.div>

          {/* 功能說明 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-8 sm:mt-10"
          >
            <div className="glass rounded-2xl p-4 sm:p-5">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-apple-blue/10 flex items-center justify-center mb-3 sm:mb-4">
                <Code2 className="w-5 h-5 sm:w-6 sm:h-6 text-apple-blue" />
              </div>
              <h3 className="text-apple-gray-50 font-semibold mb-1.5 text-sm sm:text-base">生成程式碼</h3>
              <p className="text-apple-gray-400 text-xs sm:text-sm chinese-text">
                描述你想要的功能，AI 會幫你寫出完整的程式碼
              </p>
            </div>
            <div className="glass rounded-2xl p-4 sm:p-5">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-apple-orange/10 flex items-center justify-center mb-3 sm:mb-4">
                <Bug className="w-5 h-5 sm:w-6 sm:h-6 text-apple-orange" />
              </div>
              <h3 className="text-apple-gray-50 font-semibold mb-1.5 text-sm sm:text-base">除錯修復</h3>
              <p className="text-apple-gray-400 text-xs sm:text-sm chinese-text">
                貼上有問題的程式碼，AI 會幫你找出並修復 bug
              </p>
            </div>
            <div className="glass rounded-2xl p-4 sm:p-5">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-apple-purple/10 flex items-center justify-center mb-3 sm:mb-4">
                <Wrench className="w-5 h-5 sm:w-6 sm:h-6 text-apple-purple" />
              </div>
              <h3 className="text-apple-gray-50 font-semibold mb-1.5 text-sm sm:text-base">重構優化</h3>
              <p className="text-apple-gray-400 text-xs sm:text-sm chinese-text">
                讓 AI 幫你改善程式碼品質，提升可讀性和效能
              </p>
            </div>
          </motion.div>

          {/* 學習連結 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center py-6 sm:py-8"
          >
            <p className="text-apple-gray-400 text-xs sm:text-sm chinese-text mb-3 sm:mb-4">
              想要學習更多 Vibe Coding 技巧？
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 sm:gap-2 px-5 sm:px-7 py-3 sm:py-3.5 bg-apple-blue text-white rounded-full font-medium hover:bg-apple-blue-light transition-all duration-300 chinese-text text-sm sm:text-base"
            >
              <Sparkles size={16} className="sm:w-[18px] sm:h-[18px]" />
              開始冒險學習
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default Playground
