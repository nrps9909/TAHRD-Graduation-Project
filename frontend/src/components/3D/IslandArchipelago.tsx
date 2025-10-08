/**
 * IslandArchipelago - 環形群島系統
 * 將所有知識庫以環形排列的島嶼形式展示
 */

import { useState } from 'react'
import { useIslandStore } from '../../stores/islandStore'
import { IslandLabel } from './IslandLabel'
import { IslandBeacon } from './IslandBeacon'
import { SimpleIsland } from './SimpleIsland'

interface IslandArchipelagoProps {
  onIslandClick?: (islandId: string) => void
  hideLabels?: boolean
}

/**
 * 計算環形布局位置
 * @param index 島嶼索引
 * @param total 總島嶼數
 * @param radius 環形半徑
 */
function getCircularPosition(
  index: number,
  total: number,
  radius: number = 45
): [number, number, number] {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2 // 從頂部開始
  const x = Math.cos(angle) * radius
  const z = Math.sin(angle) * radius
  return [x, 0, z]
}

export function IslandArchipelago({ onIslandClick, hideLabels = false }: IslandArchipelagoProps) {
  const { islands, getCurrentIsland } = useIslandStore()
  const [hoveredIslandId, setHoveredIslandId] = useState<string | null>(null)
  const currentIsland = getCurrentIsland()

  return (
    <group>
      {islands.map((island, index) => {
        const position = getCircularPosition(index, islands.length)
        const isHovered = hoveredIslandId === island.id
        // 只有當 currentIsland 存在且 ID 匹配時才標記為 current（排除 'overview' 狀態）
        const isCurrent = currentIsland?.id === island.id && currentIsland?.id !== 'overview'

        return (
          <group key={island.id}>
            {/* 島嶼地形 - 使用 SimpleIsland 組件 */}
            <SimpleIsland
              position={position}
              color={island.color}
              scale={isCurrent ? 1.1 : 1.0}
              isActive={isCurrent}
              memories={island.memories}
              islandId={island.id}
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
                position={position}
                onClick={() => onIslandClick?.(island.id)}
                onHover={(hovered) => setHoveredIslandId(hovered ? island.id : null)}
              />
            )}

            {/* 當前島嶼的特殊標記 */}
            {isCurrent && (
              <group position={position}>
                {/* 底部發光圓環 */}
                <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.2, 0]}>
                  <ringGeometry args={[8, 9, 64]} />
                  <meshBasicMaterial
                    color={island.color}
                    transparent
                    opacity={0.4}
                    depthWrite={false}
                  />
                </mesh>

                {/* 環境光 */}
                <pointLight
                  color={island.color}
                  intensity={1.5}
                  distance={20}
                  position={[0, 5, 0]}
                />
              </group>
            )}
          </group>
        )
      })}
    </group>
  )
}
