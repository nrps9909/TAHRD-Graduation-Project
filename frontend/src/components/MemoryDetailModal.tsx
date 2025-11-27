/**
 * MemoryDetailModal - 知識詳情彈窗
 * 顯示記憶的完整內容和相關資訊
 */

import { Memory as IslandMemory, Island } from '../types/island'
import { formatDistanceToNow } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { Z_INDEX_CLASSES } from '../constants/zIndex'
import { useNavigate } from 'react-router-dom'

interface MemoryDetailModalProps {
  memory: IslandMemory | null
  island?: Island | null  // 記憶所屬的島嶼
  isOpen: boolean
  onClose: () => void
}

export function MemoryDetailModal({ memory, island, isOpen, onClose }: MemoryDetailModalProps) {
  const navigate = useNavigate()

  if (!memory || !isOpen) return null

  // 使用島嶼信息顯示，如果沒有島嶼則使用默認值
  const displayInfo = island
    ? {
        name: island.nameChinese,
        emoji: island.emoji,
        color: island.color
      }
    : {
        name: '未分類',
        emoji: '📌',
        color: '#999'
      }

  // 處理編輯記憶按鈕點擊
  const handleEditMemory = () => {
    navigate(`/database?memoryId=${memory.id}`)
  }

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
              className="bg-[#1E1E1E] rounded-2xl sm:rounded-3xl shadow-2xl w-[95vw] sm:w-full max-w-lg sm:max-w-xl md:max-w-3xl max-h-[90vh] sm:max-h-[85vh] overflow-hidden pointer-events-auto border-2 border-gray-800"
              style={{
                boxShadow: `0 20px 60px rgba(0,0,0,0.5)`
              }}
            >
              {/* 頭部 */}
              <div
                className="p-4 sm:p-6 text-white relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${displayInfo.color}dd, ${displayInfo.color}bb)`
                }}
              >
                {/* 裝飾性背景 - 使用島嶼顏色 */}
                <div className="absolute inset-0 opacity-10">
                  <div
                    className="absolute top-0 right-0 w-24 sm:w-40 h-24 sm:h-40 rounded-full transform translate-x-6 sm:translate-x-10 -translate-y-6 sm:-translate-y-10"
                    style={{ backgroundColor: displayInfo.color }}
                  ></div>
                  <div
                    className="absolute bottom-0 left-0 w-20 sm:w-32 h-20 sm:h-32 rounded-full transform -translate-x-5 sm:-translate-x-8 translate-y-5 sm:translate-y-8"
                    style={{ backgroundColor: displayInfo.color }}
                  ></div>
                </div>

                <div className="relative">
                  <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <span className="text-3xl sm:text-5xl drop-shadow-lg flex-shrink-0">{displayInfo.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg sm:text-2xl font-bold drop-shadow-md mb-1 line-clamp-2">{memory.title}</h2>
                        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm opacity-90">
                          <span>{island ? '🏝️' : displayInfo.emoji}</span>
                          <span className="truncate">{displayInfo.name}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={onClose}
                      className="text-white/80 hover:text-white text-2xl sm:text-3xl font-bold transition-all hover:scale-110 active:scale-95 flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>

                  {/* 標籤 */}
                  {memory.tags && memory.tags.length > 0 && (
                    <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap">
                      {memory.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium bg-white/20 backdrop-blur-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 內容區域 */}
              <div className="overflow-y-auto max-h-[calc(90vh-200px)] sm:max-h-[calc(85vh-240px)] p-4 sm:p-6 space-y-4 sm:space-y-6 bg-[#1E1E1E]">
                {/* 社交成長紀錄格式（檢查社交相關欄位） */}
                {(memory.socialContext || memory.userReaction || memory.aiFeedback ||
                  (memory.socialSkillTags && memory.socialSkillTags.length > 0) ||
                  memory.progressChange !== undefined
                ) && (
                  <div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-gradient-to-br from-pink-900/30 to-purple-900/30 border-2 border-pink-500/30">
                    <h3 className="text-base sm:text-lg font-bold text-pink-300 mb-3 sm:mb-4 flex items-center gap-2">
                      <span>🌟</span>
                      社交成長紀錄
                    </h3>

                    <div className="space-y-4">
                      {/* 主題 */}
                      <div>
                        <div className="text-xs font-semibold text-pink-400 mb-1">[主題]</div>
                        <div className="text-gray-200 font-medium">{memory.title}</div>
                      </div>

                      {/* 情境 */}
                      {memory.socialContext && (
                        <div>
                          <div className="text-xs font-semibold text-pink-400 mb-1">[情境]</div>
                          <div className="text-gray-300">{memory.socialContext}</div>
                        </div>
                      )}

                      {/* 使用者反應 */}
                      {memory.userReaction && (
                        <div>
                          <div className="text-xs font-semibold text-pink-400 mb-1">[使用者反應]</div>
                          <div className="text-gray-300">{memory.userReaction}</div>
                        </div>
                      )}

                      {/* AI 回饋 */}
                      {memory.aiFeedback && (
                        <div className="p-3 rounded-xl bg-pink-500/10 border border-pink-500/20">
                          <div className="text-xs font-semibold text-pink-400 mb-1">[AI 回饋]</div>
                          <div className="text-pink-200 italic">{memory.aiFeedback}</div>
                        </div>
                      )}

                      {/* 社交能力標籤 */}
                      {memory.socialSkillTags && memory.socialSkillTags.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold text-pink-400 mb-2">[社交能力標籤]</div>
                          <div className="flex flex-wrap gap-2">
                            {memory.socialSkillTags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 rounded-full text-xs font-medium bg-pink-500/20 text-pink-200 border border-pink-500/30"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 進度變化 */}
                      {memory.progressChange !== undefined && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                          <div className="text-xs font-semibold text-purple-300">[進度變化]</div>
                          <div className="flex items-center gap-2">
                            {memory.progressChange > 0 && (
                              <>
                                <span className="text-2xl">📈</span>
                                <span className="text-green-400 font-bold">成長 +{memory.progressChange}</span>
                              </>
                            )}
                            {memory.progressChange === 0 && (
                              <>
                                <span className="text-2xl">➡️</span>
                                <span className="text-yellow-400 font-bold">維持 0</span>
                              </>
                            )}
                            {memory.progressChange < 0 && (
                              <>
                                <span className="text-2xl">📉</span>
                                <span className="text-orange-400 font-bold">退步 {memory.progressChange}</span>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 建議行動 */}
                      {memory.actionableAdvice && (
                        <div>
                          <div className="text-xs font-semibold text-pink-400 mb-1">[建議行動]</div>
                          <div className="text-gray-300">{memory.actionableAdvice}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 完整內容 */}
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-gray-400 mb-2 flex items-center gap-2">
                    <span>📄</span>
                    知識內容
                  </h3>
                  <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gray-900 border-2 border-gray-800">
                    <p className="text-sm sm:text-base text-gray-200 leading-relaxed whitespace-pre-wrap">
                      {memory.content || '此記憶暫無詳細內容'}
                    </p>
                  </div>
                </div>

                {/* 時間資訊 */}
                <div className="flex items-center justify-between text-[10px] sm:text-xs text-gray-400 pt-3 sm:pt-4 border-t border-gray-800">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span>📅</span>
                    <span className="hidden sm:inline">創建時間：</span>
                    <span className="font-medium text-gray-300">
                      {formatDistanceToNow(memory.createdAt, { addSuffix: true, locale: zhTW })}
                    </span>
                  </div>
                </div>
              </div>

              {/* 底部操作按鈕 */}
              <div className="p-3 sm:p-6 bg-[#252525] border-t border-gray-800 flex items-center justify-end gap-2 sm:gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl font-medium text-sm sm:text-base text-gray-300 bg-gray-800 hover:bg-gray-700 border-2 border-gray-700 transition-all hover:scale-105 active:scale-95"
                >
                  關閉
                </button>
                <button
                  onClick={handleEditMemory}
                  className="px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl font-medium text-sm sm:text-base text-white transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: `linear-gradient(135deg, ${displayInfo.color}, ${displayInfo.color}dd)`,
                    boxShadow: `0 4px 15px ${displayInfo.color}40`
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
