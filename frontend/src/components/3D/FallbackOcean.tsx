/**
 * FallbackOcean - 备用海洋效果
 * 如果 Water 组件加载失败，使用这个简化版本
 */

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function FallbackOcean() {
  const meshRef = useRef<THREE.Mesh>(null)

  // 添加轻微的波浪动画
  useFrame((state) => {
    if (meshRef.current) {
      // 通过材质的偏移创建水波效果
      const material = meshRef.current.material as THREE.MeshStandardMaterial
      if (material.map) {
        material.map.offset.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.01
        material.map.offset.y = Math.cos(state.clock.elapsedTime * 0.15) * 0.01
      }
    }
  })

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -2, 0]}
      receiveShadow
    >
      <planeGeometry args={[1000, 1000, 64, 64]} />
      <meshStandardMaterial
        color="#89CFF0"
        transparent
        opacity={0.8}
        roughness={0.1}
        metalness={0.9}
        envMapIntensity={1.5}
      />
    </mesh>
  )
}
