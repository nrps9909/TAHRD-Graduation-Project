/**
 * IslandInfoPanel - 右側島嶼資訊面板
 */

import { useState } from 'react'
import { useIslandStore } from '../stores/islandStore'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

export function IslandInfoPanel() {
  const { getCurrentIsland } = useIslandStore()
  const [isExpanded, setIsExpanded] = useState(true)
  const island = getCurrentIsland()

  if (!island) return null

  const totalMemories = island.memoryCount
  const distribution = island.regionDistribution

  // 区域图标映射
  const regionIcons = {
    learning: { emoji: '📚', name: '學習梯田', color: '#4A90E2' },
    inspiration: { emoji: '💡', name: '靈感高峰', color: '#F5A623' },
    work: { emoji: '💼', name: '工作平原', color: '#7B68EE' },
    social: { emoji: '🤝', name: '社交谷地', color: '#FF6B9D' },
    life: { emoji: '🌸', name: '生活丘陵', color: '#50C878' },
    goals: { emoji: '🎯', name: '目標山脊', color: '#E74C3C' },
    resources: { emoji: '📦', name: '資源高地', color: '#9B59B6' },
    misc: { emoji: '🌊', name: '雜項海域', color: '#6C8EAD' }
  }

  return (
    <div className="fixed top-20 right-4 z-40 w-80">
      {/* 摺疊按鈕 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -left-10 top-4 bg-white/90 backdrop-blur-md rounded-l-xl px-3 py-6 shadow-lg hover:bg-white transition-all group"
      >
        <span className={`text-xl transition-transform duration-300 ${isExpanded ? 'rotate-0' : 'rotate-180'}`}>
          ◀
        </span>
      </button>

      {/* 主面板 */}
      <div
        className={`bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden transition-all duration-500 ${
          isExpanded ? 'translate-x-0 opacity-100' : 'translate-x-96 opacity-0'
        }`}
      >
        {/* 頭部 */}
        <div
          className="p-6 text-white"
          style={{
            background: `linear-gradient(135deg, ${island.color}dd, ${island.color}bb)`
          }}
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">{island.emoji}</span>
            <div className="flex-1">
              <h3 className="text-2xl font-bold">{island.name}</h3>
              <p className="text-sm opacity-90">{island.description}</p>
            </div>
          </div>
        </div>

        {/* 統計資訊 */}
        <div className="p-6 space-y-4">
          {/* 記憶總數 */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 font-medium">記憶總數</span>
              <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                {totalMemories}
              </span>
            </div>
          </div>

          {/* 最近更新 */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>⏱️</span>
            <span>最近更新：</span>
            <span className="font-medium text-gray-800">
              {formatDistanceToNow(island.updatedAt, { addSuffix: true, locale: zhCN })}
            </span>
          </div>

          {/* 分隔線 */}
          <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

          {/* 區域分布 */}
          <div>
            <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span>🗺️</span>
              區域分布
            </h4>
            <div className="space-y-2">
              {(Object.keys(distribution) as Array<keyof typeof distribution>).map((regionKey) => {
                const region = regionIcons[regionKey]
                const count = distribution[regionKey]
                const percentage = totalMemories > 0 ? (count / totalMemories) * 100 : 0

                return (
                  <div key={regionKey} className="group">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="flex items-center gap-1">
                        <span>{region.emoji}</span>
                        <span className="font-medium text-gray-700">{region.name}</span>
                      </span>
                      <span className="font-bold text-gray-800">{count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 group-hover:opacity-80"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: region.color
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 分隔線 */}
          <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

          {/* 快捷操作 */}
          <div className="grid grid-cols-2 gap-2">
            <button className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all text-sm font-medium text-blue-700">
              <span>🔍</span>
              搜尋
            </button>
            <button className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-xl transition-all text-sm font-medium text-purple-700">
              <span>⚙️</span>
              設定
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
