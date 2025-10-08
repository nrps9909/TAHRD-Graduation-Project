/**
 * IslandBeacon - 島嶼識別光柱
 * 從島嶼中心向天空射出的彩色光柱，用於標識不同知識庫
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
  height = 15,
  isHovered = false
}: IslandBeaconProps) {
  const beaconRef = useRef<Mesh>(null)
  const glowRef = useRef<Mesh>(null)
  const threeColor = new Color(color)

  // 脈動動畫
  useFrame(({ clock }) => {
    if (beaconRef.current) {
      const pulse = Math.sin(clock.getElapsedTime() * 1.5) * 0.15 + 0.85
      const targetOpacity = isHovered ? 0.6 : 0.35
      const currentOpacity = targetOpacity * pulse

      if (beaconRef.current.material && 'opacity' in beaconRef.current.material) {
        beaconRef.current.material.opacity = currentOpacity
      }
    }

    // 外圈光暈旋轉
    if (glowRef.current) {
      glowRef.current.rotation.y += 0.01
      if (glowRef.current.material && 'opacity' in glowRef.current.material) {
        const pulse = Math.sin(clock.getElapsedTime() * 2) * 0.1 + 0.2
        glowRef.current.material.opacity = isHovered ? pulse * 1.5 : pulse
      }
    }
  })

  return (
    <group position={position}>
      {/* 主光柱 */}
      <mesh ref={beaconRef} position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.3, 0.8, height, 16, 1, true]} />
        <meshBasicMaterial
          color={threeColor}
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </mesh>

      {/* 底部光暈 */}
      <mesh ref={glowRef} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <ringGeometry args={[0.8, 3, 32]} />
        <meshBasicMaterial
          color={threeColor}
          transparent
          opacity={0.2}
          depthWrite={false}
        />
      </mesh>

      {/* 頂部光點 */}
      <mesh position={[0, height, 0]}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshBasicMaterial
          color={threeColor}
          transparent
          opacity={isHovered ? 0.9 : 0.6}
        />
      </mesh>

      {/* Hover 時的額外特效 */}
      {isHovered && (
        <>
          {/* 內層光柱（更亮） */}
          <mesh position={[0, height / 2, 0]}>
            <cylinderGeometry args={[0.15, 0.4, height, 16, 1, true]} />
            <meshBasicMaterial
              color={threeColor}
              transparent
              opacity={0.8}
              depthWrite={false}
            />
          </mesh>

          {/* 底部強光 */}
          <pointLight
            position={[0, 0, 0]}
            color={threeColor}
            intensity={2}
            distance={10}
          />

          {/* 頂部強光 */}
          <pointLight
            position={[0, height, 0]}
            color={threeColor}
            intensity={1.5}
            distance={8}
          />
        </>
      )}
    </group>
  )
}
