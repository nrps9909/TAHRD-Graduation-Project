/**
 * LoadingCat - 貓咪模型載入時的佔位符
 * 顯示可愛的載入動畫
 */

import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import * as THREE from 'three'

interface LoadingCatProps {
  position?: [number, number, number]
}

export function LoadingCat({ position = [0, 0, 0] }: LoadingCatProps) {
  const meshRef = useRef<THREE.Group>(null)
  const [rotation, setRotation] = useState(0)

  useFrame((state, delta) => {
    if (meshRef.current) {
      setRotation(r => r + delta * 2)
      meshRef.current.rotation.y = rotation
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1
    }
  })

  return (
    <group ref={meshRef} position={position}>
      {/* 簡單的貓咪輪廓 */}
      <mesh>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial
          color="#FFE5F0"
          transparent
          opacity={0.6}
          emissive="#FFB3D9"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* 載入文字 */}
      <Html position={[0, 1, 0]} center>
        <div
          className="px-4 py-2 rounded-2xl text-white font-bold shadow-lg whitespace-nowrap animate-pulse"
          style={{
            background: 'linear-gradient(135deg, #FFB3D9, #FF8FB3)',
            pointerEvents: 'none',
          }}
        >
          🐱 載入中...
        </div>
      </Html>

      {/* 旋轉光環 */}
      <mesh rotation={[-Math.PI / 2, 0, rotation]}>
        <ringGeometry args={[0.6, 0.8, 32]} />
        <meshStandardMaterial
          color="#FFB3D9"
          transparent
          opacity={0.5}
          emissive="#FFB3D9"
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  )
}
