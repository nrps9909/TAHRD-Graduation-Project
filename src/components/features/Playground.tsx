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
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* 背景效果 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-[100px]" />
        {/* 網格背景 */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* 導航列 */}
      <nav className="relative z-10 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-gray-400 hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm chinese-text">返回冒險地圖</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <Terminal className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">
                Claude Code Playground
              </h1>
              <p className="text-xs text-gray-500">
                體驗 AI 程式設計助手
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {apiAvailable ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 rounded-full border border-amber-500/20">
                <Zap size={14} className="text-amber-400" />
                <span className="text-amber-400 text-xs font-medium">Gemini 2.5 Flash</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-500/10 rounded-full border border-gray-500/20">
                <Sparkles size={14} className="text-gray-400" />
                <span className="text-gray-400 text-xs font-medium">模擬模式</span>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto p-6">
        {/* 主要內容區 */}
        <div className="space-y-6">
          {/* 說明區塊 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4 py-4"
          >
            <h2 className="text-2xl font-bold text-white">
              用自然語言寫程式
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto chinese-text">
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
            className="flex flex-wrap justify-center gap-2"
          >
            {suggestions.map((suggestion) => {
              const Icon = suggestion.icon
              return (
                <button
                  key={suggestion.id}
                  onClick={() => handleSuggestionClick(suggestion.text)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 rounded-full text-gray-400 hover:text-gray-200 transition-all text-sm chinese-text"
                >
                  <Icon size={14} />
                  {suggestion.text}
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
            className="flex justify-center gap-6 text-gray-500 text-sm"
          >
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-white/5 rounded text-xs">Enter</kbd>
              <span>送出</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-white/5 rounded text-xs">Shift + Enter</kbd>
              <span>換行</span>
            </div>
          </motion.div>

          {/* 功能說明 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="grid md:grid-cols-3 gap-4 mt-8"
          >
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-3">
                <Code2 className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-white font-medium mb-1">生成程式碼</h3>
              <p className="text-gray-500 text-sm chinese-text">
                描述你想要的功能，AI 會幫你寫出完整的程式碼
              </p>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-3">
                <Bug className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-white font-medium mb-1">除錯修復</h3>
              <p className="text-gray-500 text-sm chinese-text">
                貼上有問題的程式碼，AI 會幫你找出並修復 bug
              </p>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3">
                <Wrench className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-white font-medium mb-1">重構優化</h3>
              <p className="text-gray-500 text-sm chinese-text">
                讓 AI 幫你改善程式碼品質，提升可讀性和效能
              </p>
            </div>
          </motion.div>

          {/* 學習連結 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center py-6"
          >
            <p className="text-gray-500 text-sm chinese-text mb-3">
              想要學習更多 Vibe Coding 技巧？
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl font-medium hover:from-emerald-500 hover:to-emerald-400 transition-all chinese-text"
            >
              <Sparkles size={18} />
              開始冒險學習
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default Playground
