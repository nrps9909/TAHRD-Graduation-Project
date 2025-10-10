/**
 * TororoCat - Tororo (小白) 的 3D 模型组件
 * 知識園丁，負責創建和種植記憶
 * 使用 GLB 模型，白色主題
 */

import { AnimatedCat } from './AnimatedCat'

interface TororoCatProps {
  position?: [number, number, number]
  scale?: number
  onClick?: () => void
  hideLabel?: boolean
}

export function TororoCat({ position = [0, 0, 0], scale = 1, onClick, hideLabel }: TororoCatProps) {
  return (
    <AnimatedCat
      position={position}
      scale={scale}
      onClick={onClick}
      color="#FFFFFF" // 白色
      name="白噗噗"
      subtitle="你給我好好記住!"
      emoji="🐱"
      lightColor="#FFFFFF"
      hideLabel={hideLabel}
    />
  )
}
