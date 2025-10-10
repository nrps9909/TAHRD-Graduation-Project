/**
 * IslandStatusCard - 動森風格島嶼狀態卡片
 * 顯示島嶼的詳細資訊、類別說明、記憶數量等
 */

import { formatDistanceToNow } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { Z_INDEX_CLASSES } from '../constants/zIndex'

interface IslandStatusCardProps {
  name: string
  emoji: string
  color: string
  description: string
  memoryCount: number
  categories?: string[]
  updatedAt?: Date
  regionDistribution?: {
    learning: number
    inspiration: number
    work: number
    social: number
    life: number
    goals: number
    resources: number
    misc: number
  }
  className?: string
  onEditClick?: () => void // 編輯按鈕回調
}

// 類別圖標映射
const categoryIcons: Record<string, { emoji: string; name: string; color: string }> = {
  LEARNING: { emoji: '📚', name: '學習', color: '#4A90E2' },
  INSPIRATION: { emoji: '💡', name: '靈感', color: '#F5A623' },
  WORK: { emoji: '💼', name: '工作', color: '#7B68EE' },
  SOCIAL: { emoji: '🤝', name: '社交', color: '#FF6B9D' },
  LIFE: { emoji: '🌸', name: '生活', color: '#50C878' },
  GOALS: { emoji: '🎯', name: '目標', color: '#E74C3C' },
  RESOURCES: { emoji: '📦', name: '資源', color: '#9B59B6' },
  MISC: { emoji: '🌊', name: '雜項', color: '#6C8EAD' }
}

const regionIcons: Record<string, { emoji: string; name: string; color: string }> = {
  learning: { emoji: '📚', name: '學習梯田', color: '#4A90E2' },
  inspiration: { emoji: '💡', name: '靈感高峰', color: '#F5A623' },
  work: { emoji: '💼', name: '工作平原', color: '#7B68EE' },
  social: { emoji: '🤝', name: '社交谷地', color: '#FF6B9D' },
  life: { emoji: '🌸', name: '生活丘陵', color: '#50C878' },
  goals: { emoji: '🎯', name: '目標山脊', color: '#E74C3C' },
  resources: { emoji: '📦', name: '資源高地', color: '#9B59B6' },
  misc: { emoji: '🌊', name: '雜項海域', color: '#6C8EAD' }
}

export function IslandStatusCard({
  name,
  emoji,
  color,
  description,
  memoryCount,
  categories = [],
  updatedAt,
  regionDistribution,
  className = '',
  onEditClick
}: IslandStatusCardProps) {
  // 計算最活躍的區域（前3個）
  const topRegions = regionDistribution
    ? (Object.entries(regionDistribution) as [keyof typeof regionDistribution, number][])
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .filter(([, count]) => count > 0)
    : []

  return (
    <div className={`fixed top-4 left-4 ${Z_INDEX_CLASSES.FIXED_PANEL} w-80 ${className}`}>
      <div
        className="relative rounded-[28px] overflow-hidden transition-all duration-300 hover:scale-[1.02]"
        style={{
          background: 'linear-gradient(145deg, rgba(255, 250, 240, 0.7) 0%, rgba(255, 245, 230, 0.6) 100%)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '3px solid rgba(255, 255, 255, 0.6)',
          boxShadow: `
            0 20px 50px -12px rgba(139, 92, 46, 0.25),
            0 0 0 1px rgba(251, 191, 36, 0.1) inset,
            0 2px 4px rgba(255, 255, 255, 0.8) inset
          `,
        }}
      >
        {/* 頂部光澤效果 */}
        <div
          className="absolute top-0 left-0 right-0 h-20 pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.4) 0%, transparent 100%)',
          }}
        />

        {/* 頭部 - 島嶼資訊 */}
        <div className="relative p-4">
          <div
            className="rounded-[20px] p-4 relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${color}dd 0%, ${color}bb 100%)`,
              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15), inset 0 2px 4px rgba(255, 255, 255, 0.3)',
            }}
          >
            {/* 內部光澤 */}
            <div
              className="absolute top-0 left-0 right-0 h-12 pointer-events-none"
              style={{
                background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.25) 0%, transparent 100%)',
              }}
            />

            {/* 裝飾圓圈 */}
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 transform translate-x-6 -translate-y-6" style={{ background: 'white' }} />
            <div className="absolute bottom-0 left-0 w-16 h-16 rounded-full opacity-10 transform -translate-x-4 translate-y-4" style={{ background: 'white' }} />

            <div className="relative flex items-center gap-3">
              {/* Emoji 圖標框 */}
              <div
                className="w-14 h-14 rounded-[16px] flex items-center justify-center text-2xl"
                style={{
                  background: 'rgba(255, 255, 255, 0.3)',
                  backdropFilter: 'blur(8px)',
                  boxShadow: 'inset 0 2px 6px rgba(255, 255, 255, 0.3), 0 3px 10px rgba(0, 0, 0, 0.1)',
                }}
              >
                {emoji}
              </div>

              {/* 文字資訊 */}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-white mb-0.5" style={{ textShadow: '0 2px 6px rgba(0, 0, 0, 0.2)' }}>
                  {name}
                </h3>
                <p className="text-xs text-white/90 font-medium" style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.15)' }}>
                  {description}
                </p>
              </div>

              {/* 編輯按鈕 */}
              {onEditClick && (
                <button
                  onClick={onEditClick}
                  className="w-10 h-10 rounded-[12px] flex items-center justify-center text-lg transition-all duration-200 hover:scale-110 active:scale-95"
                  style={{
                    background: 'rgba(255, 255, 255, 0.35)',
                    backdropFilter: 'blur(8px)',
                    boxShadow: 'inset 0 2px 6px rgba(255, 255, 255, 0.4), 0 2px 8px rgba(0, 0, 0, 0.15)',
                  }}
                  title="編輯島嶼"
                >
                  🎨
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 主要資訊 */}
        <div className="px-4 pb-4 space-y-3">
          {/* 記憶總數卡片 */}
          <div
            className="rounded-[18px] p-4 relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`,
              border: `2px solid ${color}30`,
              boxShadow: 'inset 0 1px 3px rgba(255, 255, 255, 0.5), 0 3px 10px rgba(0, 0, 0, 0.05)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-9 h-9 rounded-[12px] flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${color}40 0%, ${color}25 100%)`,
                    boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.4)',
                  }}
                >
                  <span className="text-base">🌺</span>
                </div>
                <span className="text-sm font-bold text-gray-700">記憶總數</span>
              </div>
              <span
                className="text-3xl font-black"
                style={{ color }}
              >
                {memoryCount}
              </span>
            </div>
          </div>

          {/* 類別標籤 */}
          {categories.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <div
                  className="w-7 h-7 rounded-[10px] flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.3) 0%, rgba(245, 158, 11, 0.2) 100%)',
                    boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.4)',
                  }}
                >
                  <span className="text-xs">🏷️</span>
                </div>
                <span className="text-xs font-bold" style={{ color: '#4A5568' }}>包含類別</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => {
                  const icon = categoryIcons[category]
                  return (
                    <div
                      key={category}
                      className="px-3 py-1.5 rounded-[12px] text-xs font-bold text-white shadow-sm"
                      style={{
                        background: `linear-gradient(135deg, ${icon?.color || '#999'} 0%, ${icon?.color || '#999'}dd 100%)`,
                        boxShadow: `0 2px 6px ${icon?.color || '#999'}40`,
                      }}
                    >
                      <span className="mr-1">{icon?.emoji || '📌'}</span>
                      {icon?.name || category}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 最活躍區域 */}
          {topRegions.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <div
                  className="w-7 h-7 rounded-[10px] flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.3) 0%, rgba(245, 158, 11, 0.2) 100%)',
                    boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.4)',
                  }}
                >
                  <span className="text-xs">🔥</span>
                </div>
                <span className="text-xs font-bold" style={{ color: '#4A5568' }}>最活躍區域</span>
              </div>
              <div className="space-y-2">
                {topRegions.map(([regionKey, count]) => {
                  const region = regionIcons[regionKey]
                  const percentage = memoryCount > 0 ? (count / memoryCount) * 100 : 0

                  return (
                    <div key={regionKey} className="group">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-6 h-6 rounded-[8px] flex items-center justify-center"
                            style={{
                              background: `linear-gradient(135deg, ${region.color}35 0%, ${region.color}20 100%)`,
                              boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.3)',
                            }}
                          >
                            <span className="text-xs">{region.emoji}</span>
                          </div>
                          <span className="text-xs font-bold" style={{ color: '#4A5568' }}>
                            {region.name}
                          </span>
                        </div>
                        <span
                          className="text-xs font-black px-2 py-0.5 rounded-[8px]"
                          style={{
                            color: region.color,
                            background: `${region.color}20`,
                          }}
                        >
                          {count}
                        </span>
                      </div>
                      <div
                        className="h-2 rounded-full overflow-hidden"
                        style={{
                          background: 'linear-gradient(135deg, rgba(226, 232, 240, 0.8) 0%, rgba(203, 213, 225, 0.6) 100%)',
                          boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)',
                        }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-500 group-hover:opacity-90"
                          style={{
                            width: `${percentage}%`,
                            background: `linear-gradient(90deg, ${region.color} 0%, ${region.color}dd 100%)`,
                            boxShadow: `0 0 6px ${region.color}50`,
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 最近更新 */}
          {updatedAt && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-[14px] mt-2"
              style={{
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.1) 100%)',
                border: '1.5px solid rgba(251, 191, 36, 0.2)',
              }}
            >
              <span className="text-sm">⏱️</span>
              <span className="text-xs font-semibold" style={{ color: '#92400E' }}>
                最近更新：
              </span>
              <span className="text-xs font-bold" style={{ color: '#78350F' }}>
                {formatDistanceToNow(updatedAt, { addSuffix: true, locale: zhTW })}
              </span>
            </div>
          )}
        </div>

        {/* 底部光暈裝飾 */}
        <div
          className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, rgba(251, 191, 36, 0.1), transparent)',
          }}
        />
      </div>
    </div>
  )
}
