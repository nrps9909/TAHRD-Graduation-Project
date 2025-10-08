/**
 * HijikiCat - Hijiki (小黑) 的 3D 模型組件
 * 知識管理員，負責搜尋和統計
 * 使用 GLB 模型，黑色主題
 */

import { AnimatedCat } from './AnimatedCat'

interface HijikiCatProps {
  position?: [number, number, number]
  scale?: number
  onClick?: () => void
  hideLabel?: boolean
}

export function HijikiCat({ position = [0, 0, 0], scale = 1, onClick, hideLabel }: HijikiCatProps) {
  return (
    <AnimatedCat
      position={position}
      scale={scale}
      onClick={onClick}
      color="#000000" // 純黑色
      name="黑噗噗"
      subtitle="讓我看看!"
      emoji="🌙"
      ringColor="#4A4A4A"
      lightColor="#FFD700" // 金黃色光效
      hideLabel={hideLabel}
    />
  )
}
