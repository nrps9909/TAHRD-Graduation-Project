/**
 * TororoKnowledgePanel - 白撲撲知識膠囊製造機
 *
 * 這不是一個 chatbot，而是一個快速、直覺、可愛的知識上傳助手
 *
 * 核心功能：
 * 1. 快速記錄想法（像便利貼一樣）
 * 2. 視覺化標籤和情緒選擇
 * 3. 即時看到知識樹生長
 * 4. Live2D 白撲撲陪伴鼓勵
 */

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import TororoLive2D, { TororoLive2DRef } from './TororoLive2D'

// ============ 類型定義 ============

interface KnowledgeCapsule {
  content: string
  emotion: EmotionType
  category: CategoryType
  tags: string[]
  timestamp: Date
}

type EmotionType = 'happy' | 'peaceful' | 'inspired' | 'thoughtful' | 'excited' | 'grateful'
type CategoryType = 'learning' | 'idea' | 'experience' | 'goal' | 'reflection' | 'discovery'

interface TororoKnowledgePanelProps {
  onCreateKnowledge: (capsule: KnowledgeCapsule) => Promise<void>
  className?: string
}

// ============ 情緒和類型配置 ============

const EMOTIONS = [
  { type: 'happy' as EmotionType, emoji: '😊', color: '#FFD93D', label: '開心' },
  { type: 'peaceful' as EmotionType, emoji: '😌', color: '#A8E6CF', label: '平靜' },
  { type: 'inspired' as EmotionType, emoji: '✨', color: '#FFB7D5', label: '靈感' },
  { type: 'thoughtful' as EmotionType, emoji: '🤔', color: '#C7CEEA', label: '思考' },
  { type: 'excited' as EmotionType, emoji: '🎉', color: '#FFAAA5', label: '興奮' },
  { type: 'grateful' as EmotionType, emoji: '🙏', color: '#B5EAD7', label: '感恩' }
]

const CATEGORIES = [
  { type: 'learning' as CategoryType, icon: '📚', label: '學習' },
  { type: 'idea' as CategoryType, icon: '💡', label: '想法' },
  { type: 'experience' as CategoryType, icon: '🌟', label: '體驗' },
  { type: 'goal' as CategoryType, icon: '🎯', label: '目標' },
  { type: 'reflection' as CategoryType, icon: '🪞', label: '反思' },
  { type: 'discovery' as CategoryType, icon: '🔍', label: '發現' }
]

const QUICK_TAGS = [
  '重要', '有趣', '待深入', '已實踐', '需分享', '靈感來源',
  '日常', '工作', '興趣', '人際', '健康', '成長'
]

// ============ 主組件 ============

export default function TororoKnowledgePanel({
  onCreateKnowledge,
  className = ''
}: TororoKnowledgePanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [content, setContent] = useState('')
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionType>('happy')
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('learning')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const tororoRef = useRef<TororoLive2DRef>(null)

  // 處理標籤選擇
  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  // 創建知識膠囊
  const handleCreate = async () => {
    if (!content.trim()) return

    setIsCreating(true)
    tororoRef.current?.triggerMotion('tap_body')

    try {
      const capsule: KnowledgeCapsule = {
        content: content.trim(),
        emotion: selectedEmotion,
        category: selectedCategory,
        tags: selectedTags,
        timestamp: new Date()
      }

      await onCreateKnowledge(capsule)

      // 成功動畫
      setShowSuccess(true)
      tororoRef.current?.triggerExpression('f01')

      setTimeout(() => {
        setShowSuccess(false)
        setContent('')
        setSelectedTags([])
        setIsOpen(false)
      }, 2000)

    } catch (error) {
      console.error('Failed to create knowledge:', error)
    } finally {
      setIsCreating(false)
    }
  }

  // 當前情緒和類型配置
  const currentEmotion = EMOTIONS.find(e => e.type === selectedEmotion)!
  const currentCategory = CATEGORIES.find(c => c.type === selectedCategory)!

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
      <AnimatePresence>
        {!isOpen ? (
          // ============ 浮動按鈕 ============
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="relative rounded-full shadow-2xl overflow-hidden"
            style={{
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, #FFFFFF, #FFF8F0)',
              border: '4px solid #FFE5CC'
            }}
          >
            {/* Live2D 小白預覽 */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-4xl animate-bounce">☁️</div>
            </div>

            {/* 脈動提示 */}
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-yellow-300"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.button>
        ) : (
          // ============ 知識膠囊製造機主面板 ============
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            className="bg-gradient-to-br from-yellow-50 via-white to-pink-50 rounded-3xl shadow-2xl overflow-hidden"
            style={{
              width: '420px',
              height: '680px',
              border: '4px solid #FFE5CC'
            }}
          >
            {/* ============ 頭部：白撲撲 ============ */}
            <div className="relative h-40 bg-gradient-to-br from-yellow-100 to-orange-100 flex items-center justify-between px-6">
              {/* 左側：Live2D 白撲撲 */}
              <div className="flex items-center gap-3">
                <div className="w-20 h-20 relative">
                  <TororoLive2D
                    ref={tororoRef}
                    width={80}
                    height={80}
                    scale={0.15}
                  />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-orange-800">白撲撲</h3>
                  <p className="text-sm text-orange-600">知識園丁 ☁️</p>
                </div>
              </div>

              {/* 右側：關閉按鈕 */}
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-full hover:bg-white/50 transition-colors text-orange-800"
              >
                ✕
              </button>
            </div>

            {/* ============ 主要內容區 ============ */}
            <div className="p-6 space-y-4 overflow-y-auto" style={{ height: 'calc(100% - 10rem)' }}>

              {/* 快速提示 */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-yellow-100 border-2 border-yellow-300 rounded-2xl p-3 text-sm text-yellow-800"
              >
                💭 把你的想法、學習、靈感交給我，我會幫你種成茁壯的知識樹～
              </motion.div>

              {/* 內容輸入 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ✍️ 你想記錄什麼？
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="今天學到了...&#10;突然想到...&#10;我發現..."
                  className="w-full px-4 py-3 rounded-2xl border-3 border-orange-200 focus:border-orange-400 focus:outline-none resize-none transition-all"
                  rows={4}
                  style={{
                    background: 'white',
                    fontSize: '15px'
                  }}
                />
                <div className="text-xs text-gray-500 mt-1 text-right">
                  {content.length} 字
                </div>
              </div>

              {/* 情緒選擇 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {currentEmotion.emoji} 現在的心情
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {EMOTIONS.map((emotion) => (
                    <button
                      key={emotion.type}
                      onClick={() => setSelectedEmotion(emotion.type)}
                      className="px-3 py-2 rounded-xl font-medium transition-all hover:scale-105"
                      style={{
                        background: selectedEmotion === emotion.type
                          ? emotion.color
                          : 'white',
                        border: `2px solid ${emotion.color}`,
                        color: selectedEmotion === emotion.type ? 'white' : emotion.color
                      }}
                    >
                      <span className="mr-1">{emotion.emoji}</span>
                      {emotion.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 類型選擇 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {currentCategory.icon} 記錄類型
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map((category) => (
                    <button
                      key={category.type}
                      onClick={() => setSelectedCategory(category.type)}
                      className="px-3 py-2 rounded-xl font-medium transition-all hover:scale-105"
                      style={{
                        background: selectedCategory === category.type
                          ? 'linear-gradient(135deg, #FFB88C, #FFA07A)'
                          : 'white',
                        border: '2px solid #FFE5CC',
                        color: selectedCategory === category.type ? 'white' : '#FF8C42'
                      }}
                    >
                      <span className="mr-1">{category.icon}</span>
                      {category.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 快速標籤 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🏷️ 快速標籤（選填）
                </label>
                <div className="flex flex-wrap gap-2">
                  {QUICK_TAGS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className="px-3 py-1 rounded-full text-xs font-medium transition-all hover:scale-105"
                      style={{
                        background: selectedTags.includes(tag)
                          ? 'linear-gradient(135deg, #98D8C8, #6BCF7F)'
                          : '#F7F7F7',
                        color: selectedTags.includes(tag) ? 'white' : '#666',
                        border: selectedTags.includes(tag) ? 'none' : '1px solid #E0E0E0'
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ============ 底部：創建按鈕 ============ */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white to-transparent">
              <motion.button
                onClick={handleCreate}
                disabled={!content.trim() || isCreating}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 rounded-2xl font-bold text-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: content.trim()
                    ? 'linear-gradient(135deg, #FFB88C, #FF8C42)'
                    : '#E0E0E0',
                  color: 'white'
                }}
              >
                {isCreating ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">🌸</span>
                    種植中...
                  </span>
                ) : (
                  <span>🌱 種下這棵知識樹</span>
                )}
              </motion.button>
            </div>

            {/* ============ 成功動畫 ============ */}
            <AnimatePresence>
              {showSuccess && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="absolute inset-0 bg-white/95 flex items-center justify-center"
                >
                  <div className="text-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="text-6xl mb-4"
                    >
                      🌳
                    </motion.div>
                    <p className="text-2xl font-bold text-orange-600">
                      種好啦！
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      你的知識樹正在島上生長～
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
