/**
 * IslandArchipelago - 猫咪脚掌群岛系统
 * 每个岛屿都是一个完整的猫咪脚掌形状陆地
 */

import { useState } from 'react'
import { useIslandStore } from '../../stores/islandStore'
import { Memory } from '../../types/island'
import { IslandLabel } from './IslandLabel'
import { IslandBeacon } from './IslandBeacon'
import { PawIsland } from './PawIsland'

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
  const [hoveredIslandId, setHoveredIslandId] = useState<string | null>(null)
  const currentIsland = getCurrentIsland()

  return (
    <group>
      {islands.map((island, index) => {
        const position = getIslandPosition(index, islands.length)
        const isHovered = hoveredIslandId === island.id
        const isCurrent = currentIsland?.id === island.id && currentIsland?.id !== 'overview'

        // 所有島嶼使用相同大小，選中時稍微放大
        const baseScale = 1.8
        const finalScale = isCurrent ? baseScale * 1.15 : baseScale

        return (
          <group key={island.id}>
            {/* 脚掌岛屿 - 每个岛屿都是完整的猫咪脚掌形状 */}
            <PawIsland
              position={position}
              color={island.color}
              scale={finalScale}
              isActive={isCurrent}
              memories={island.memories}
              islandId={island.id}
              onMemoryClick={onMemoryClick}
            />

            {/* 識別光柱 */}
            <IslandBeacon
              position={position}
              color={island.color}
              height={12}
              isHovered={isHovered || isCurrent}
            />

            {/* 漂浮標籤（可通過 hideLabels 隱藏） */}
            {!hideLabels && (
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
