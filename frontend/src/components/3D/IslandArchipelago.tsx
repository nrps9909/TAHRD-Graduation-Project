/**
 * IslandArchipelago - 猫咪脚掌群岛系统
 * 每个岛屿都是一个完整的猫咪脚掌形状陆地
 * 支持自订形状：如果岛屿有 customShapeData，则使用 CustomIsland 渲染
 */

import { useState } from 'react'
import { useIslandStore } from '../../stores/islandStore'
import { Memory } from '../../types/island'
import { IslandLabel } from './IslandLabel'
import { PawIsland } from './PawIsland'
import { CustomIsland } from './CustomIsland'

interface IslandArchipelagoProps {
  onIslandClick?: (islandId: string) => void
  onMemoryClick?: (memory: Memory) => void
  hideLabels?: boolean
}

/**
 * 计算脚掌岛屿的圆形布局位置
 * 多个脚掌岛屿呈圆形排列
 */
function getIslandPosition(
  index: number,
  total: number
): [number, number, number] {
  if (total === 1) {
    return [0, 0, 0]
  }

  // 圆形排列，半径足够大让脚掌岛屿不会重叠
  const radius = 80
  const angleStep = (Math.PI * 2) / total
  const angle = angleStep * index - Math.PI / 2 // 从顶部开始

  const x = Math.cos(angle) * radius
  const z = Math.sin(angle) * radius

  return [x, 0, z]
}

export function IslandArchipelago({ onIslandClick, onMemoryClick, hideLabels = false }: IslandArchipelagoProps) {
  const { islands, getCurrentIsland } = useIslandStore()
  const [_hoveredIslandId, setHoveredIslandId] = useState<string | null>(null)
  const currentIsland = getCurrentIsland()

  return (
    <group>
      {islands.map((island, index) => {
        const position = getIslandPosition(index, islands.length)
        const isCurrent = currentIsland?.id === island.id && currentIsland?.id !== 'overview'

        // 所有島嶼使用相同大小，選中時稍微放大
        const baseScale = 1.8
        const finalScale = isCurrent ? baseScale * 1.15 : baseScale

        // 檢查是否有自訂形狀資料
        const hasCustomShape = island.customShapeData && island.customShapeData.length > 0
        let customShapePoints: Array<{ x: number; y: number }> = []

        if (hasCustomShape) {
          try {
            customShapePoints = JSON.parse(island.customShapeData!)
            // 只在開發模式且非生產環境時輸出 debug 訊息
            if (import.meta.env.DEV && import.meta.env.VITE_DEBUG === 'true') {
              console.log(`🎨 [IslandArchipelago] 載入自訂形狀 ${island.name}:`, customShapePoints.length, '個點')
            }
          } catch (error) {
            console.error(`❌ [IslandArchipelago] 解析 ${island.name} 形狀資料失敗:`, error)
          }
        }

        return (
          <group key={island.id}>
            {/* 根據是否有自訂形狀選擇渲染組件 */}
            {hasCustomShape && customShapePoints.length >= 3 ? (
              <CustomIsland
                position={position}
                color={island.color}
                scale={finalScale}
                isActive={isCurrent}
                memories={island.memories}
                islandId={island.id}
                onMemoryClick={onMemoryClick}
                shapePoints={customShapePoints}
                height={island.islandHeight || 2}
                bevel={island.islandBevel || 0.5}
              />
            ) : (
              <PawIsland
                position={position}
                color={island.color}
                scale={finalScale}
                isActive={isCurrent}
                memories={island.memories}
                islandId={island.id}
                onMemoryClick={onMemoryClick}
              />
            )}

            {/* 漂浮標籤（可通過 hideLabels 隱藏） */}
            {/* 當聚焦到該島嶼時，隱藏標籤以避免擋住樹木 */}
            {!hideLabels && !isCurrent && (
              <IslandLabel
                island={island}
                position={[position[0], position[1] + 2, position[2]]}
                onClick={() => onIslandClick?.(island.id)}
                onHover={(hovered) => setHoveredIslandId(hovered ? island.id : null)}
              />
            )}
          </group>
        )
      })}
    </group>
  )
}
