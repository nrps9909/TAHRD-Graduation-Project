/**
 * MiniMap - 右下角小地圖組件
 * 顯示所有島嶼的俯視圖，可點擊島嶼進入檢視視角
 */

import { useState } from 'react'
import { useIslandStore } from '../stores/islandStore'

interface MiniMapProps {
  onIslandClick: (islandId: string) => void
}

/**
 * 計算環形布局位置（與 IslandArchipelago 相同）
 * 返回 2D 座標 [x, z]
 */
function getCircularPosition2D(
  index: number,
  total: number,
  radius: number = 45
): [number, number] {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2
  const x = Math.cos(angle) * radius
  const z = Math.sin(angle) * radius
  return [x, z]
}

export function MiniMap({ onIslandClick }: MiniMapProps) {
  const { islands, currentIslandId } = useIslandStore()
  const [hoveredIslandId, setHoveredIslandId] = useState<string | null>(null)
  const [hoveredOverview, setHoveredOverview] = useState(false)

  // 小地圖尺寸 - 保持緊湊
  const mapSize = 200
  const viewBox = 80 // SVG viewBox 大小 - 進一步縮小讓島嶼更集中
  const islandRadius = 9 // 島嶼圓圈半徑 - 稍微增大以便點擊
  const circleRadius = 20 // 環形半徑 - 向中間靠攏

  // 處理回到總覽
  const handleBackToOverview = () => {
    onIslandClick('overview')
  }

  return (
    <div className="fixed bottom-8 right-8 z-[9999] group">
      {/* 小地圖容器 - 精緻卡片設計 */}
      <div
        className="relative bg-white/98 backdrop-blur-2xl rounded-[2rem] overflow-hidden transition-all duration-500 hover:shadow-2xl"
        style={{
          width: `${mapSize}px`,
          height: `${mapSize + 40}px`,
          boxShadow: '0 12px 48px rgba(255, 143, 179, 0.25), 0 0 0 1px rgba(255, 179, 217, 0.2)',
          border: '3px solid transparent',
          backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #FFE5F0, #FFFACD, #FFB3D9)',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
        }}
      >
        {/* 頂部裝飾條 */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-300 via-yellow-200 to-pink-300 opacity-60" />

        {/* 標題區 - 優雅設計 */}
        <div className="px-4 py-3 relative">
          {/* 背景裝飾 */}
          <div
            className="absolute inset-0 opacity-40"
            style={{
              background: 'radial-gradient(circle at 20% 50%, rgba(255, 229, 240, 0.8) 0%, transparent 60%)'
            }}
          />

          {/* 標題和按鈕容器 */}
          <div className="relative flex items-center justify-between">
            {/* 左側標題 */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-200 to-yellow-100 flex items-center justify-center shadow-sm">
                <span className="text-sm">🗺️</span>
              </div>
              <div>
                <h3 className="text-sm font-bold bg-gradient-to-r from-pink-500 to-yellow-500 bg-clip-text text-transparent">
                  帶我去
                </h3>
                <p className="text-[10px] text-gray-400">
                  {islands.length} 座島嶼
                </p>
              </div>
            </div>

            {/* 右側返回按鈕 */}
            <button
              onClick={handleBackToOverview}
              onMouseEnter={() => setHoveredOverview(true)}
              onMouseLeave={() => setHoveredOverview(false)}
              className="px-3 py-1.5 rounded-xl font-bold text-xs transition-all duration-200 hover:scale-110 active:scale-95"
              style={{
                background: currentIslandId === 'overview'
                  ? 'linear-gradient(135deg, #FFD700, #FFA500)'
                  : hoveredOverview
                    ? 'linear-gradient(135deg, #FFE5F0, #FFC0E0)'
                    : 'linear-gradient(135deg, #FFF5F8, #FFF8E7)',
                color: currentIslandId === 'overview' ? '#fff' : '#FF8FB3',
                border: currentIslandId === 'overview' ? '2px solid #FFD700' : '2px solid rgba(255, 179, 217, 0.3)',
                boxShadow: currentIslandId === 'overview'
                  ? '0 4px 12px rgba(255, 215, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.5)'
                  : '0 2px 8px rgba(255, 179, 217, 0.15)'
              }}
            >
              返回
            </button>
          </div>
        </div>

        {/* SVG 地圖 - 精緻海洋背景 */}
        <div className="relative" style={{ height: mapSize - 40 }}>
          {/* 裝飾性背景層 */}
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(circle at 60% 40%, rgba(135, 206, 250, 0.15) 0%, rgba(176, 224, 230, 0.08) 50%, transparent 100%)'
            }}
          />

          <svg
            viewBox={`-${viewBox / 2} -${viewBox / 2} ${viewBox} ${viewBox}`}
            className="w-full h-full relative"
            style={{
              background: 'linear-gradient(135deg, #E8F8FF 0%, #D4EFFF 50%, #C8E8FF 100%)'
            }}
          >
          {/* 定義漸變和濾鏡 */}
          <defs>
            {/* 海洋漸變 */}
            <radialGradient id="oceanGradient">
              <stop offset="0%" stopColor="#E8F4FF" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#89CFF0" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#6BB6D8" stopOpacity="0.7" />
            </radialGradient>

            {/* 島嶼陰影 */}
            <filter id="islandShadow">
              <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
              <feOffset dx="0" dy="2" result="offsetblur"/>
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>

            {/* 發光效果 */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* 海洋背景 - 多層次 */}
          <circle cx="0" cy="-3" r={viewBox / 2} fill="url(#oceanGradient)" opacity="0.4" />

          {/* 裝飾性波紋 - 縮小 0.8 倍並向上移 */}
          <circle cx="0" cy="-3" r={(circleRadius + 3) * 0.8} fill="none" stroke="#89CFF0" strokeWidth="0.5" opacity="0.2" strokeDasharray="3,3" />
          <circle cx="0" cy="-3" r={(circleRadius + 6) * 0.8} fill="none" stroke="#89CFF0" strokeWidth="0.5" opacity="0.15" strokeDasharray="3,3" />

          {/* 環形島嶼群 - 改善點擊體驗 */}
          {islands.map((island, index) => {
            const [x, z] = getCircularPosition2D(index, islands.length, circleRadius)
            const isCurrent = currentIslandId === island.id
            const isHovered = hoveredIslandId === island.id
            // 整體向上移動 3 個單位
            const yOffset = -3

            return (
              <g
                key={island.id}
                transform={`translate(${x}, ${z + yOffset})`}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIslandId(island.id)}
                onMouseLeave={() => setHoveredIslandId(null)}
                onClick={() => onIslandClick(island.id)}
                filter={isCurrent ? "url(#glow)" : "url(#islandShadow)"}
              >
                {/* 大型透明點擊區域 - 增加可點擊範圍 */}
                <circle
                  r={islandRadius + 6}
                  fill="transparent"
                  stroke="none"
                  style={{ pointerEvents: 'all' }}
                />

                {/* 當前選中 - 多層光環 */}
                {isCurrent && (
                  <>
                    <circle
                      r={islandRadius + 4}
                      fill="none"
                      stroke="#FFD700"
                      strokeWidth="2"
                      opacity="0.6"
                    >
                      <animate
                        attributeName="r"
                        values={`${islandRadius + 4};${islandRadius + 5};${islandRadius + 4}`}
                        dur="2s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.6;0.3;0.6"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    </circle>
                    <circle
                      r={islandRadius + 2.5}
                      fill="none"
                      stroke="#FFD700"
                      strokeWidth="1.5"
                      opacity="0.8"
                    />
                  </>
                )}

                {/* Hover 效果 - 白色光暈 */}
                {isHovered && !isCurrent && (
                  <circle
                    r={islandRadius + 2}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2"
                    opacity="0.7"
                  >
                    <animate
                      attributeName="opacity"
                      values="0.7;0.4;0.7"
                      dur="1s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}

                {/* 主島嶼圓圈 - 漸變填充 */}
                <defs>
                  <linearGradient id={`gradient-${island.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={island.color} stopOpacity="1" />
                    <stop offset="100%" stopColor={island.color} stopOpacity="0.85" />
                  </linearGradient>
                </defs>

                <circle
                  r={islandRadius}
                  fill={`url(#gradient-${island.id})`}
                  stroke={isCurrent ? '#FFD700' : '#ffffff'}
                  strokeWidth={isCurrent ? '2.5' : '2'}
                  opacity={isHovered || isCurrent ? 1 : 0.9}
                  style={{
                    transition: 'all 0.2s ease',
                    transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                    transformOrigin: 'center'
                  }}
                />

                {/* 內部高光 */}
                <circle
                  cx="-1.5"
                  cy="-1.5"
                  r={islandRadius / 2.5}
                  fill="#ffffff"
                  opacity="0.4"
                />

                {/* 島嶼 emoji 圖標 - 縮小 */}
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="9"
                  style={{
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))'
                  }}
                >
                  {island.emoji}
                </text>

                {/* 記憶數量徽章 - 縮小 */}
                {island.memoryCount > 0 && (
                  <g transform={`translate(${islandRadius - 0.5}, ${-islandRadius + 0.5})`}>
                    {/* 徽章背景 */}
                    <circle
                      r="5"
                      fill="#FF6B9D"
                      stroke="#fff"
                      strokeWidth="1.5"
                      style={{
                        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))'
                      }}
                    />
                    {/* 數字 */}
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="6"
                      fill="#fff"
                      fontWeight="bold"
                    >
                      {island.memoryCount > 99 ? '99+' : island.memoryCount}
                    </text>
                  </g>
                )}
              </g>
            )
          })}

          {/* 中心點標記 - 可選 */}
          <circle
            cx="0"
            cy="-3"
            r="2"
            fill="#FFB3D9"
            opacity="0.3"
          />
        </svg>
        </div>

        {/* 底部島名條 - 簡潔設計 */}
        {(hoveredIslandId || (currentIslandId && currentIslandId !== 'overview')) && (
          <div
            className="absolute bottom-0 left-0 right-0 flex items-center justify-center"
            style={{
              height: '15px',
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 245, 250, 0.98) 100%)',
              backdropFilter: 'blur(10px)',
              borderTop: '1px solid rgba(255, 179, 217, 0.2)'
            }}
          >
            <span className="text-[10px] font-bold bg-gradient-to-r from-pink-500 to-yellow-500 bg-clip-text text-transparent truncate px-2">
              {islands.find(i => i.id === (hoveredIslandId || currentIslandId))?.name || '未選擇'}
            </span>
          </div>
        )}
      </div>

      {/* Tooltip 說明 - 優雅提示 */}
      <div className="absolute bottom-full right-0 mb-4 opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none transform translate-y-3 group-hover:translate-y-0">
        <div
          className="relative bg-white/98 backdrop-blur-xl rounded-2xl px-5 py-3 shadow-2xl border border-pink-100"
          style={{
            boxShadow: '0 12px 40px rgba(255, 143, 179, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
          }}
        >
          {/* 裝飾性漸變邊框 */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-pink-200 via-yellow-100 to-pink-200 opacity-30 -z-10" />

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-pink-200 to-yellow-100 flex items-center justify-center">
              <span className="text-xs">💡</span>
            </div>
            <p className="text-xs text-gray-700 whitespace-nowrap font-medium">
              <span className="font-bold bg-gradient-to-r from-pink-500 to-yellow-500 bg-clip-text text-transparent">點擊島嶼</span>
              <span className="text-gray-600"> 快速導航</span>
            </p>
          </div>

          {/* 小三角指示器 */}
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 -mt-1"
            style={{
              width: 0,
              height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: '8px solid white',
              filter: 'drop-shadow(0 2px 4px rgba(255, 179, 217, 0.2))'
            }}
          />
        </div>
      </div>
    </div>
  )
}
