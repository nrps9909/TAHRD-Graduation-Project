import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface FlowerProps {
  position: [number, number, number]
  variant?: 'rose' | 'tulip' | 'sunflower' | 'daisy'
  scale?: number
  color?: string
}

export const Flower = ({ 
  position, 
  variant = 'rose', 
  scale = 1,
  color
}: FlowerProps) => {
  const flowerRef = useRef<THREE.Group>(null)
  const petalRef = useRef<THREE.Group>(null)

  // 花朵輕微搖動動畫
  useFrame((state) => {
    if (flowerRef.current) {
      flowerRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.05
    }
    if (petalRef.current && variant === 'sunflower') {
      petalRef.current.rotation.y = state.clock.elapsedTime * 0.2
    }
  })

  const getFlowerConfig = () => {
    switch (variant) {
      case 'tulip':
        return {
          petalColor: color || '#FF69B4',
          centerColor: '#FFD700',
          stemColor: '#228B22',
          petalCount: 6,
          petalShape: 'tulip'
        }
      case 'sunflower':
        return {
          petalColor: color || '#FFD700',
          centerColor: '#8B4513',
          stemColor: '#228B22',
          petalCount: 12,
          petalShape: 'long'
        }
      case 'daisy':
        return {
          petalColor: color || '#FFFFFF',
          centerColor: '#FFD700',
          stemColor: '#228B22',
          petalCount: 8,
          petalShape: 'round'
        }
      default: // rose
        return {
          petalColor: color || '#FF1493',
          centerColor: '#FFB6C1',
          stemColor: '#228B22',
          petalCount: 5,
          petalShape: 'rose'
        }
    }
  }

  const config = getFlowerConfig()

  return (
    <group ref={flowerRef} position={position}>
      {/* 莖 */}
      <mesh castShadow position={[0, 0.3 * scale, 0]}>
        <cylinderGeometry args={[0.02 * scale, 0.03 * scale, 0.6 * scale, 6]} />
        <meshLambertMaterial color={config.stemColor} />
      </mesh>

      {/* 葉子 */}
      <mesh castShadow position={[0.1 * scale, 0.2 * scale, 0]}>
        <sphereGeometry args={[0.08 * scale, 6, 4]} />
        <meshLambertMaterial color={config.stemColor} />
      </mesh>
      <mesh castShadow position={[-0.1 * scale, 0.3 * scale, 0]}>
        <sphereGeometry args={[0.06 * scale, 6, 4]} />
        <meshLambertMaterial color={config.stemColor} />
      </mesh>

      {/* 花瓣組 */}
      <group ref={petalRef} position={[0, 0.6 * scale, 0]}>
        {/* 花瓣 */}
        {Array.from({ length: config.petalCount }, (_, i) => {
          const angle = (i / config.petalCount) * Math.PI * 2
          const petalRadius = 0.15 * scale
          
          if (config.petalShape === 'tulip') {
            return (
              <mesh
                key={i}
                castShadow
                position={[
                  Math.cos(angle) * petalRadius * 0.8,
                  0.05 * scale,
                  Math.sin(angle) * petalRadius * 0.8
                ]}
                rotation={[0, -angle, Math.PI / 6]}
              >
                <sphereGeometry args={[0.08 * scale, 8, 6]} />
                <meshLambertMaterial color={config.petalColor} />
              </mesh>
            )
          } else if (config.petalShape === 'long') {
            return (
              <mesh
                key={i}
                castShadow
                position={[
                  Math.cos(angle) * petalRadius,
                  0,
                  Math.sin(angle) * petalRadius
                ]}
                rotation={[0, -angle, 0]}
              >
                <boxGeometry args={[0.15 * scale, 0.02 * scale, 0.05 * scale]} />
                <meshLambertMaterial color={config.petalColor} />
              </mesh>
            )
          } else {
            return (
              <mesh
                key={i}
                castShadow
                position={[
                  Math.cos(angle) * petalRadius,
                  0,
                  Math.sin(angle) * petalRadius
                ]}
              >
                <sphereGeometry args={[0.06 * scale, 8, 8]} />
                <meshLambertMaterial color={config.petalColor} />
              </mesh>
            )
          }
        })}

        {/* 花心 */}
        <mesh castShadow>
          <sphereGeometry args={[0.08 * scale, 8, 8]} />
          <meshLambertMaterial color={config.centerColor} />
        </mesh>
      </group>

      {/* 花影 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <circleGeometry args={[0.2 * scale, 8]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.1} />
      </mesh>
    </group>
  )
}