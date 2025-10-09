/**
 * MemoryDetailModal - 知識詳情彈窗
 * 顯示記憶的完整內容和相關資訊
 */

import { Memory as IslandMemory } from '../types/island'
import { formatDistanceToNow } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { Z_INDEX_CLASSES } from '../constants/zIndex'

interface MemoryDetailModalProps {
  memory: IslandMemory | null
  isOpen: boolean
  onClose: () => void
}

// 類別配置
const CATEGORY_CONFIG: Record<string, { name: string; color: string; emoji: string }> = {
  LEARNING: { name: '學習', color: '#4A90E2', emoji: '📚' },
  INSPIRATION: { name: '靈感', color: '#F5A623', emoji: '💡' },
  WORK: { name: '工作', color: '#7B68EE', emoji: '💼' },
  SOCIAL: { name: '社交', color: '#FF6B9D', emoji: '🤝' },
  LIFE: { name: '生活', color: '#50C878', emoji: '🌸' },
  GOALS: { name: '目標', color: '#E74C3C', emoji: '🎯' },
  RESOURCES: { name: '資源', color: '#9B59B6', emoji: '📦' }
}

export function MemoryDetailModal({ memory, isOpen, onClose }: MemoryDetailModalProps) {
  if (!memory || !isOpen) return null

  // 轉換 category 類型（移除 MISC）
  const categoryKey = memory.category === 'MISC' ? 'LEARNING' : memory.category
  const categoryInfo = CATEGORY_CONFIG[categoryKey] || { name: memory.category, color: '#999', emoji: '📌' }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 bg-black/50 backdrop-blur-sm ${Z_INDEX_CLASSES.MODAL_BACKDROP}`}
            onClick={onClose}
          />

          {/* 彈窗內容 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`fixed inset-0 ${Z_INDEX_CLASSES.MODAL} flex items-center justify-center p-4 pointer-events-none`}
          >
            <div
              className="bg-[#1E1E1E] rounded-3xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden pointer-events-auto border-2 border-gray-800"
              style={{
                boxShadow: `0 20px 60px rgba(0,0,0,0.5)`
              }}
            >
              {/* 頭部 */}
              <div
                className="p-6 text-white relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${categoryInfo.color}dd, ${categoryInfo.color}bb)`
                }}
              >
                {/* 裝飾性背景 */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white transform translate-x-10 -translate-y-10"></div>
                  <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white transform -translate-x-8 translate-y-8"></div>
                </div>

                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-5xl drop-shadow-lg">{categoryInfo.emoji}</span>
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold drop-shadow-md mb-1">{memory.title}</h2>
                        <div className="flex items-center gap-2 text-sm opacity-90">
                          <span>{categoryInfo.emoji}</span>
                          <span>{categoryInfo.name}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={onClose}
                      className="text-white/80 hover:text-white text-3xl font-bold transition-all hover:scale-110 active:scale-95"
                    >
                      ×
                    </button>
                  </div>

                  {/* 標籤和重要度 */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {memory.tags && memory.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-white/20 backdrop-blur-sm"
                      >
                        {tag}
                      </span>
                    ))}
                    <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-medium">
                      <span>⭐</span>
                      <span>重要度: {memory.importance}/10</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 內容區域 */}
              <div className="overflow-y-auto max-h-[calc(85vh-240px)] p-6 space-y-6 bg-[#1E1E1E]">
                {/* 完整內容 */}
                <div>
                  <h3 className="text-sm font-bold text-gray-400 mb-2 flex items-center gap-2">
                    <span>📄</span>
                    知識內容
                  </h3>
                  <div className="p-4 rounded-2xl bg-gray-900 border-2 border-gray-800">
                    <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">
                      {memory.content || '此記憶暫無詳細內容'}
                    </p>
                  </div>
                </div>

                {/* 標籤 */}
                {memory.tags && memory.tags.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-400 mb-2 flex items-center gap-2">
                      <span>🏷️</span>
                      標籤
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {memory.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-800 text-gray-300 border-2 border-gray-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 時間資訊 */}
                <div className="flex items-center justify-between text-xs text-gray-400 pt-4 border-t border-gray-800">
                  <div className="flex items-center gap-2">
                    <span>📅</span>
                    <span>創建時間：</span>
                    <span className="font-medium text-gray-300">
                      {formatDistanceToNow(memory.createdAt, { addSuffix: true, locale: zhTW })}
                    </span>
                  </div>
                </div>
              </div>

              {/* 底部操作按鈕 */}
              <div className="p-6 bg-[#252525] border-t border-gray-800 flex items-center justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-3 rounded-2xl font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 border-2 border-gray-700 transition-all hover:scale-105 active:scale-95"
                >
                  關閉
                </button>
                <button
                  className="px-6 py-3 rounded-2xl font-medium text-white transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: `linear-gradient(135deg, ${categoryInfo.color}, ${categoryInfo.color}dd)`,
                    boxShadow: `0 4px 15px ${categoryInfo.color}40`
                  }}
                >
                  編輯記憶
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
