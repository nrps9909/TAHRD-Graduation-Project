/**
 * MiniMap - 動森風格小地圖
 * 全新設計的可愛島嶼導覽系統
 */

import { useState } from 'react'
import { useIslandStore } from '../stores/islandStore'
import { Z_INDEX_CLASSES } from '../constants/zIndex'
import type { Island } from '../types/island'

interface MiniMapProps {
  onIslandClick: (islandId: string) => void
}

/**
 * 計算島嶼的圓形布局位置（與 IslandArchipelago 完全一致）
 * 這個函數必須與 IslandArchipelago.tsx 中的 getIslandPosition 保持同步
 */
function getIslandPosition(
  index: number,
  total: number
): [number, number, number] {
  if (total === 1) {
    return [0, 0, 0]
  }

  // 圓形排列，半徑足夠大讓腳掌島嶼不會重疊
  const radius = 80
  const angleStep = (Math.PI * 2) / total
  const angle = angleStep * index - Math.PI / 2 // 從頂部開始

  const x = Math.cos(angle) * radius
  const z = Math.sin(angle) * radius

  return [x, 0, z]
}

/**
 * 將3D位置轉換為2D小地圖位置
 * 自動縮放以適應小地圖視圖
 */
function convertTo2DMapPosition(
  position3D: [number, number, number],
  islands: Island[]
): [number, number] {
  // 計算所有島嶼的邊界來自動縮放
  const allPositions = islands.map((_, i) => getIslandPosition(i, islands.length))
  const xValues = allPositions.map(p => p[0])
  const zValues = allPositions.map(p => p[2])

  const minX = Math.min(...xValues)
  const maxX = Math.max(...xValues)
  const minZ = Math.min(...zValues)
  const maxZ = Math.max(...zValues)

  // 計算範圍並留一些邊距
  const rangeX = maxX - minX
  const rangeZ = maxZ - minZ
  const maxRange = Math.max(rangeX, rangeZ)

  // 小地圖的可用空間（viewBox的80%以留邊距）
  const mapSpace = 80
  const scale = maxRange > 0 ? mapSpace / maxRange : 1

  // 轉換位置（翻轉Z軸因為SVG的Y軸向下）
  const x = position3D[0] * scale
  const z = -position3D[2] * scale // SVG的Y軸向下，所以翻轉Z

  return [x, z]
}

export function MiniMap({ onIslandClick }: MiniMapProps) {
  const { islands, currentIslandId } = useIslandStore()
  const [hoveredIslandId, setHoveredIslandId] = useState<string | null>(null)

  // 根據螢幕大小動態調整尺寸
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const mapSize = isMobile ? 140 : 180 // 手機端更小
  const viewBox = 100
  const viewBoxHeight = 110 // 增加高度以避免底部裁切
  const islandRadius = isMobile ? 8 : 10 // 手機端島嶼更小

  // 計算海洋容器的實際高度，根據 viewBox 比例
  const mapContainerWidth = mapSize - (isMobile ? 16 : 24) // 手機端更少 padding
  const oceanHeight = (mapContainerWidth * viewBoxHeight) / viewBox // 保持與 viewBox 相同比例

  return (
    <div className={`fixed bottom-3 right-3 md:bottom-6 md:right-6 ${Z_INDEX_CLASSES.MINIMAP}`}>
      {/* 主容器 - 動森玻璃卡片 */}
      <div
        className="relative rounded-[28px] overflow-hidden transition-all duration-300 hover:scale-[1.02]"
        style={{
          width: `${mapSize}px`,
          height: `${24 + oceanHeight + 24}px`, // padding-top + 海洋高度 + padding-bottom
          background: 'linear-gradient(145deg, rgba(255, 250, 240, 0.65) 0%, rgba(255, 245, 230, 0.55) 100%)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
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

        {/* 地圖區域 */}
        <div className="relative px-2 md:px-3 pt-2 md:pt-3 pb-2 md:pb-3">
          {/* 海洋背景容器 */}
          <div
            className="relative rounded-[20px] overflow-hidden"
            style={{
              height: `${oceanHeight}px`, // 根據 viewBox 比例計算
              background: 'linear-gradient(135deg, #C3E4FF 0%, #A8D8F0 50%, #8EC5EA 100%)',
              boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.1)',
            }}
          >
            {/* 波浪紋理 */}
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: `
                  radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.4) 0%, transparent 50%),
                  radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.3) 0%, transparent 50%),
                  radial-gradient(circle at 50% 50%, rgba(135, 206, 250, 0.2) 0%, transparent 60%)
                `,
              }}
            />

            {/* SVG 地圖 */}
            <svg
              viewBox={`-${viewBox / 2} -${viewBox / 2} ${viewBox} ${viewBoxHeight}`}
              className="w-full h-full relative z-10"
            >
              <defs>
                {/* 島嶼陰影濾鏡 */}
                <filter id="island-shadow">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="2.5"/>
                  <feOffset dx="0" dy="3" result="offsetblur"/>
                  <feComponentTransfer>
                    <feFuncA type="linear" slope="0.4"/>
                  </feComponentTransfer>
                  <feMerge>
                    <feMergeNode/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>

                {/* 當前島嶼發光 */}
                <filter id="island-glow">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>

                {/* 每個島嶼的漸變 */}
                {islands.map((island) => (
                  <radialGradient key={`grad-${island.id}`} id={`island-grad-${island.id}`}>
                    <stop offset="0%" stopColor={island.color} stopOpacity="1" />
                    <stop offset="100%" stopColor={island.color} stopOpacity="0.8" />
                  </radialGradient>
                ))}
              </defs>

              {/* 島嶼群 - 動態對照實際位置 */}
              {islands.map((island, index) => {
                // 獲取實際3D位置（與 IslandArchipelago 相同的圓形排列）
                const position3D = getIslandPosition(index, islands.length)
                // 轉換為2D小地圖位置
                const [x, z] = convertTo2DMapPosition(position3D, islands)
                // 所有島嶼使用相同大小（與實際場景一致）
                const scale = 1.0
                const isCurrent = currentIslandId === island.id
                const isHovered = hoveredIslandId === island.id
                const isActive = isCurrent || isHovered

                return (
                  <g
                    key={island.id}
                    transform={`translate(${x}, ${z})`}
                    className="cursor-pointer transition-all duration-200"
                    onMouseEnter={() => setHoveredIslandId(island.id)}
                    onMouseLeave={() => setHoveredIslandId(null)}
                    onClick={() => onIslandClick(island.id)}
                    filter={isCurrent ? "url(#island-glow)" : "url(#island-shadow)"}
                  >
                    {/* 擴大點擊區域 */}
                    <circle r={islandRadius + 8} fill="transparent" />

                    {/* 當前島嶼特效 */}
                    {isCurrent && (
                      <>
                        {/* 外圈動畫 */}
                        <circle
                          r={islandRadius + 8}
                          fill="none"
                          stroke="#FFD700"
                          strokeWidth="2.5"
                          opacity="0.5"
                        >
                          <animate
                            attributeName="r"
                            values={`${islandRadius + 6};${islandRadius + 10};${islandRadius + 6}`}
                            dur="2s"
                            repeatCount="indefinite"
                          />
                          <animate
                            attributeName="opacity"
                            values="0.5;0.2;0.5"
                            dur="2s"
                            repeatCount="indefinite"
                          />
                        </circle>
                        {/* 中圈 */}
                        <circle
                          r={islandRadius + 4}
                          fill="none"
                          stroke="#FFD700"
                          strokeWidth="2"
                          opacity="0.7"
                        />
                      </>
                    )}

                    {/* hover 白色光暈 */}
                    {isHovered && !isCurrent && (
                      <circle
                        r={islandRadius + 4}
                        fill="none"
                        stroke="#FFFFFF"
                        strokeWidth="3"
                        opacity="0.8"
                      >
                        <animate
                          attributeName="opacity"
                          values="0.8;0.4;0.8"
                          dur="1s"
                          repeatCount="indefinite"
                        />
                      </circle>
                    )}

                    {/* 島嶼主體 */}
                    <circle
                      r={islandRadius * scale}
                      fill={`url(#island-grad-${island.id})`}
                      stroke={isCurrent ? '#FFD700' : '#FFFFFF'}
                      strokeWidth={isCurrent ? '3' : '2.5'}
                      style={{
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: isActive ? 'scale(1.15)' : 'scale(1)',
                        transformOrigin: 'center',
                      }}
                    />

                    {/* 島嶼高光 */}
                    <circle
                      cx="-2.5"
                      cy="-2.5"
                      r={(islandRadius * scale) / 2.2}
                      fill="#FFFFFF"
                      opacity="0.5"
                    />

                    {/* Emoji 圖標 */}
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={isActive ? "10" : "8"}
                      style={{
                        filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))',
                        transition: 'font-size 0.2s',
                      }}
                    >
                      {island.emoji}
                    </text>

                    {/* 記憶數量徽章 */}
                    {island.memoryCount > 0 && (
                      <g transform={`translate(${(islandRadius * scale) - 1}, ${-(islandRadius * scale) + 1})`}>
                        <circle
                          r="5"
                          fill="#FF6B9D"
                          stroke="#FFFFFF"
                          strokeWidth="1.5"
                          style={{
                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                          }}
                        />
                        <text
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize="6"
                          fill="#FFFFFF"
                          fontWeight="900"
                        >
                          {island.memoryCount > 99 ? '99+' : island.memoryCount}
                        </text>
                      </g>
                    )}
                  </g>
                )
              })}

            </svg>

            {/* 雲朵裝飾 - 縮小 */}
            <div
              className="absolute top-2 left-2 text-lg opacity-40 pointer-events-none"
              style={{
                animation: 'float 6s ease-in-out infinite',
              }}
            >
              ☁️
            </div>
            <div
              className="absolute bottom-2 right-2 text-base opacity-30 pointer-events-none"
              style={{
                animation: 'float 8s ease-in-out infinite',
                animationDelay: '2s',
              }}
            >
              ☁️
            </div>
          </div>
        </div>

        {/* 底部光暈裝飾 */}
        <div
          className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, rgba(251, 191, 36, 0.1), transparent)',
          }}
        />
      </div>

      {/* 浮動動畫樣式 */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </div>
  )
}
