import { useState } from 'react'
import { ArrowLeft, Terminal, Zap, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import ClaudeSimulator from './ClaudeSimulator'
import { isApiAvailable } from '@/services/geminiApi'

const Playground: React.FC = () => {
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null)
  const apiAvailable = isApiAvailable()

  // 快速建議 - 簡化版
  const suggestions = [
    '幫我寫一個 Hello World 網頁',
    '做一個簡單的計算機',
    '建立一個待辦事項功能',
  ]

  return (
    <div className="h-screen flex flex-col bg-[#1a1a1a]">
      {/* 頂部導航 - 精簡版 */}
      <nav className="flex-shrink-0 border-b border-white/10 bg-[#0d0d0d]">
        <div className="px-3 sm:px-4 py-2 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            <span className="text-xs sm:text-sm hidden sm:inline">返回</span>
          </Link>

          <div className="flex items-center gap-2">
            <Terminal size={14} className="text-white" />
            <span className="text-white text-sm font-medium">Claude Code</span>
          </div>

          <div className="flex items-center gap-1.5">
            {apiAvailable ? (
              <>
                <Zap size={12} className="text-orange-400" />
                <span className="text-orange-400 text-xs">Gemini</span>
              </>
            ) : (
              <>
                <Sparkles size={12} className="text-gray-500" />
                <span className="text-gray-500 text-xs">模擬</span>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* 主要終端機區域 - 佔滿剩餘空間 */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* 快速建議 - 只在沒有對話時顯示 */}
        <div className="flex-shrink-0 px-3 py-2 border-b border-white/5 bg-[#0d0d0d]">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar">
            {suggestions.map((text, index) => (
              <button
                key={index}
                onClick={() => setSelectedSuggestion(text)}
                className="flex-shrink-0 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-gray-400 hover:text-white transition-all text-xs whitespace-nowrap"
              >
                {text}
              </button>
            ))}
          </div>
        </div>

        {/* 終端機 - 佔滿剩餘空間 */}
        <div className="flex-1 min-h-0">
          <ClaudeSimulator
            readOnly={false}
            showTypingEffect={true}
            useRealApi={true}
            initialInput={selectedSuggestion}
            onInputUsed={() => setSelectedSuggestion(null)}
            fullHeight={true}
          />
        </div>
      </div>
    </div>
  )
}

export default Playground
