/**
 * IslandInfoPanel - 動森風格島嶼資訊面板
 */

import { useState } from 'react'
import { useIslandStore } from '../stores/islandStore'
import { formatDistanceToNow } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { Z_INDEX_CLASSES } from '../constants/zIndex'

export function IslandInfoPanel() {
  const { getCurrentIsland } = useIslandStore()
  const [isExpanded, setIsExpanded] = useState(true)
  const island = getCurrentIsland()

  if (!island) return null

  const totalMemories = island.memoryCount

  return (
    <div className={`fixed top-20 right-4 ${Z_INDEX_CLASSES.FIXED_PANEL} w-80`}>
      {/* 摺疊按鈕 - 動森風格 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -left-10 top-4 rounded-l-2xl px-3 py-6 transition-all duration-300 group hover:scale-105"
        style={{
          background: 'linear-gradient(145deg, rgba(255, 250, 240, 0.75) 0%, rgba(255, 245, 230, 0.65) 100%)',
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          border: '2px solid rgba(255, 255, 255, 0.6)',
          borderRight: 'none',
          boxShadow: '0 8px 24px rgba(139, 92, 46, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.8)',
        }}
      >
        <span
          className={`text-xl transition-transform duration-300 ${isExpanded ? 'rotate-0' : 'rotate-180'}`}
          style={{ color: '#8B5C2E' }}
        >
          ◀
        </span>
      </button>

      {/* 主面板 - 動森玻璃卡片 */}
      <div
        className={`rounded-[32px] overflow-hidden transition-all duration-500 ${
          isExpanded ? 'translate-x-0 opacity-100' : 'translate-x-96 opacity-0'
        }`}
        style={{
          background: 'linear-gradient(145deg, rgba(255, 250, 240, 0.75) 0%, rgba(255, 245, 230, 0.65) 100%)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '3px solid rgba(255, 255, 255, 0.6)',
          boxShadow: `
            0 20px 60px -12px rgba(139, 92, 46, 0.3),
            0 0 0 1px rgba(251, 191, 36, 0.1) inset,
            0 2px 4px rgba(255, 255, 255, 0.8) inset
          `,
        }}
      >
        {/* 頂部光澤效果 */}
        <div
          className="absolute top-0 left-0 right-0 h-24 pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.4) 0%, transparent 100%)',
          }}
        />

        {/* 頭部 - 島嶼資訊 */}
        <div className="relative p-6">
          <div
            className="rounded-[24px] p-5 relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${island.color}dd 0%, ${island.color}bb 100%)`,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15), inset 0 2px 4px rgba(255, 255, 255, 0.3)',
            }}
          >
            {/* 內部光澤 */}
            <div
              className="absolute top-0 left-0 right-0 h-16 pointer-events-none"
              style={{
                background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.25) 0%, transparent 100%)',
              }}
            />

            <div className="relative flex items-center gap-4">
              {/* 島嶼圖標 */}
              <div
                className="w-16 h-16 rounded-[20px] flex items-center justify-center text-3xl"
                style={{
                  background: 'rgba(255, 255, 255, 0.25)',
                  backdropFilter: 'blur(8px)',
                  boxShadow: 'inset 0 2px 8px rgba(255, 255, 255, 0.3), 0 4px 12px rgba(0, 0, 0, 0.1)',
                }}
              >
                {island.emoji}
              </div>

              {/* 島嶼資訊 */}
              <div className="flex-1 min-w-0">
                <h3 className="text-2xl font-bold text-white mb-1" style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.2)' }}>
                  {island.name}
                </h3>
                <p className="text-sm text-white/90 font-medium" style={{ textShadow: '0 1px 4px rgba(0, 0, 0, 0.15)' }}>
                  {island.description}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 統計資訊 */}
        <div className="px-6 pb-6 space-y-4">
          {/* 記憶總數卡片 */}
          <div
            className="rounded-[20px] p-5 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(135, 206, 250, 0.25) 0%, rgba(147, 197, 253, 0.2) 100%)',
              border: '2px solid rgba(135, 206, 250, 0.3)',
              boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.5), 0 4px 12px rgba(135, 206, 250, 0.15)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-10 h-10 rounded-[14px] flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.4) 0%, rgba(59, 130, 246, 0.3) 100%)',
                    boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.4)',
                  }}
                >
                  <span className="text-lg">🌸</span>
                </div>
                <span className="font-bold text-gray-700">記憶總數</span>
              </div>
              <span
                className="text-4xl font-black"
                style={{
                  background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {totalMemories}
              </span>
            </div>
          </div>

          {/* 最近更新 */}
          <div
            className="flex items-center gap-2 px-4 py-2.5 rounded-[16px]"
            style={{
              background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.1) 100%)',
              border: '1.5px solid rgba(251, 191, 36, 0.2)',
            }}
          >
            <span className="text-base">⏱️</span>
            <span className="text-sm font-semibold" style={{ color: '#92400E' }}>
              最近更新：
            </span>
            <span className="text-sm font-bold" style={{ color: '#78350F' }}>
              {formatDistanceToNow(new Date(island.updatedAt), { addSuffix: true, locale: zhTW })}
            </span>
          </div>

          {/* 裝飾性分隔線 */}
          <div
            className="h-[2px] mx-4"
            style={{
              background: 'linear-gradient(to right, transparent, rgba(251, 191, 36, 0.3) 50%, transparent)',
            }}
          />

          {/* 快捷操作 */}
          <div className="grid grid-cols-2 gap-3">
            <button
              className="group/btn relative flex items-center justify-center gap-2 px-4 py-3 rounded-[16px] transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.25) 0%, rgba(59, 130, 246, 0.2) 100%)',
                border: '2px solid rgba(96, 165, 250, 0.3)',
                boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.5), 0 2px 8px rgba(96, 165, 250, 0.15)',
              }}
            >
              <span className="text-base">🔍</span>
              <span className="text-sm font-bold" style={{ color: '#1E40AF' }}>
                搜尋
              </span>
              <div
                className="absolute inset-0 rounded-[16px] opacity-0 group-hover/btn:opacity-100 transition-opacity"
                style={{
                  background: 'radial-gradient(circle at center, rgba(96, 165, 250, 0.2), transparent 70%)',
                }}
              />
            </button>
            <button
              className="group/btn relative flex items-center justify-center gap-2 px-4 py-3 rounded-[16px] transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.25) 0%, rgba(147, 51, 234, 0.2) 100%)',
                border: '2px solid rgba(168, 85, 247, 0.3)',
                boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.5), 0 2px 8px rgba(168, 85, 247, 0.15)',
              }}
            >
              <span className="text-base">⚙️</span>
              <span className="text-sm font-bold" style={{ color: '#6B21A8' }}>
                設定
              </span>
              <div
                className="absolute inset-0 rounded-[16px] opacity-0 group-hover/btn:opacity-100 transition-opacity"
                style={{
                  background: 'radial-gradient(circle at center, rgba(168, 85, 247, 0.2), transparent 70%)',
                }}
              />
            </button>
          </div>
        </div>

        {/* 底部光暈裝飾 */}
        <div
          className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, rgba(251, 191, 36, 0.1), transparent)',
          }}
        />
      </div>
    </div>
  )
}
