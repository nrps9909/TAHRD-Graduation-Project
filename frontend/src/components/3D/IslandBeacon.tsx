/**
 * IslandBeacon - 島嶼識別光柱（簡約版）
 * 從島嶼中心向天空射出的柔和光柱
 */

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh, Color } from 'three'

interface IslandBeaconProps {
  position: [number, number, number] // 島嶼中心位置
  color: string // 光柱顏色
  height?: number // 光柱高度
  isHovered?: boolean // 是否懸停狀態
}

export function IslandBeacon({
  position,
  color,
  height = 10, // 降低高度
  isHovered = false
}: IslandBeaconProps) {
  const beaconRef = useRef<Mesh>(null)
  const threeColor = new Color(color)

  // 柔和的脈動動畫
  useFrame(({ clock }) => {
    if (beaconRef.current) {
      const pulse = Math.sin(clock.getElapsedTime() * 1.2) * 0.1 + 0.9
      const targetOpacity = isHovered ? 0.25 : 0.15
      const currentOpacity = targetOpacity * pulse

      if (beaconRef.current.material && 'opacity' in beaconRef.current.material) {
        beaconRef.current.material.opacity = currentOpacity
      }
    }
  })

  return (
    <group position={position}>
      {/* 簡單光柱 - 只保留主光柱 */}
      <mesh ref={beaconRef} position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.2, 0.5, height, 12, 1, true]} />
        <meshBasicMaterial
          color={threeColor}
          transparent
          opacity={0.15}
          depthWrite={false}
        />
      </mesh>

      {/* Hover 時的柔和光暈 */}
      {isHovered && (
        <pointLight
          position={[0, 2, 0]}
          color={threeColor}
          intensity={0.8}
          distance={12}
        />
      )}
    </group>
  )
}
