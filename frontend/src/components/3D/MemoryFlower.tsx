import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'

interface MemoryFlowerProps {
  flower: {
    id: string
    flowerType: string
    emotionColor: string
    growthStage: number
    createdAt: Date
    npc?: { name: string }
    conversation?: { content: string }
  }
  position: [number, number, number]
}

export const MemoryFlower = ({ flower, position }: MemoryFlowerProps) => {
  const groupRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)

  // 花朵輕柔的搖擺動畫
  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime
      groupRef.current.rotation.y = Math.sin(time * 0.5 + position[0]) * 0.1
      groupRef.current.position.y = position[1] + Math.sin(time * 0.8 + position[2]) * 0.05
    }
  })

  const getFlowerColor = (emotionColor: string) => {
    switch (emotionColor) {
      case 'warm_pink': return '#FFB6C1'
      case 'gentle_blue': return '#87CEEB'
      case 'soft_yellow': return '#FFFFE0'
      case 'nature_green': return '#98FB98'
      case 'sunset_orange': return '#FFA07A'
      case 'dreamy_purple': return '#DDA0DD'
      default: return '#FFFFFF'
    }
  }

  const getFlowerGeometry = (flowerType: string, growthStage: number) => {
    const scale = 0.5 + (growthStage - 1) * 0.1
    
    switch (flowerType) {
      case 'cherry_blossom':
        return { geometry: 'sphere', args: [0.3 * scale, 8, 8], petalCount: 5 }
      case 'sunflower':
        return { geometry: 'cylinder', args: [0.4 * scale, 0.4 * scale, 0.1], petalCount: 12 }
      case 'rose':
        return { geometry: 'sphere', args: [0.25 * scale, 6, 6], petalCount: 8 }
      case 'tulip':
        return { geometry: 'sphere', args: [0.2 * scale, 6, 6], petalCount: 6 }
      case 'lavender':
        return { geometry: 'cylinder', args: [0.1 * scale, 0.1 * scale, 0.8 * scale], petalCount: 4 }
      default:
        return { geometry: 'sphere', args: [0.3 * scale, 8, 8], petalCount: 6 }
    }
  }

  const flowerConfig = getFlowerGeometry(flower.flowerType, flower.growthStage)
  const flowerColor = getFlowerColor(flower.emotionColor)

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={() => {
        // 播放花朵點擊音效的邏輯可以在這裡添加
        console.log('Memory flower clicked:', flower.id)
      }}
    >
      {/* 花莖 */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.03, 1]} />
        <meshLambertMaterial color="#228B22" />
      </mesh>

      {/* 葉子 */}
      <mesh position={[-0.1, 0.3, 0]} rotation={[0, 0, Math.PI / 6]} castShadow>
        <boxGeometry args={[0.2, 0.05, 0.1]} />
        <meshLambertMaterial color="#32CD32" />
      </mesh>
      <mesh position={[0.1, 0.6, 0]} rotation={[0, 0, -Math.PI / 6]} castShadow>
        <boxGeometry args={[0.15, 0.04, 0.08]} />
        <meshLambertMaterial color="#32CD32" />
      </mesh>

      {/* 花朵主體 */}
      <group position={[0, 1, 0]}>
        {/* 花心 */}
        <mesh castShadow>
          {flowerConfig.geometry === 'sphere' ? (
            <sphereGeometry args={flowerConfig.args as [number, number, number]} />
          ) : (
            <cylinderGeometry args={flowerConfig.args as [number, number, number]} />
          )}
          <meshLambertMaterial color={flowerColor} />
        </mesh>

        {/* 花瓣 */}
        {Array.from({ length: flowerConfig.petalCount }, (_, i) => {
          const angle = (i / flowerConfig.petalCount) * Math.PI * 2
          const x = Math.cos(angle) * 0.3
          const z = Math.sin(angle) * 0.3
          
          return (
            <mesh
              key={i}
              position={[x, 0, z]}
              rotation={[0, angle, Math.PI / 6]}
              castShadow
            >
              <boxGeometry args={[0.1, 0.02, 0.2]} />
              <meshLambertMaterial color={flowerColor} transparent opacity={0.8} />
            </mesh>
          )
        })}

        {/* 花粉效果（高級階段才有） */}
        {flower.growthStage >= 3 && (
          <group>
            {Array.from({ length: 8 }, (_, i) => (
              <mesh
                key={i}
                position={[
                  (Math.random() - 0.5) * 0.8,
                  0.1 + Math.random() * 0.2,
                  (Math.random() - 0.5) * 0.8,
                ]}
              >
                <sphereGeometry args={[0.02, 4, 4]} />
                <meshBasicMaterial color="#FFD700" transparent opacity={0.6} />
              </mesh>
            ))}
          </group>
        )}
      </group>

      {/* 光環效果（當 hover 時） */}
      {hovered && (
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.8, 1.2, 32]} />
          <meshBasicMaterial 
            color={flowerColor} 
            transparent 
            opacity={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* 花朵信息標籤（hover 時顯示） */}
      {hovered && (
        <group position={[0, 2, 0]}>
          <mesh>
            <planeGeometry args={[3, 1]} />
            <meshBasicMaterial 
              color="#FFFFFF" 
              transparent 
              opacity={0.9}
              side={THREE.DoubleSide}
            />
          </mesh>
          <Text
            position={[0, 0.2, 0.01]}
            fontSize={0.2}
            color="#333333"
            anchorX="center"
            anchorY="middle"
            maxWidth={2.8}
          >
            {`與${flower.npc?.name || 'NPC'}的回憶`}
          </Text>
          <Text
            position={[0, -0.1, 0.01]}
            fontSize={0.12}
            color="#666666"
            anchorX="center"
            anchorY="middle"
            maxWidth={2.8}
          >
            {new Date(flower.createdAt).toLocaleDateString()}
          </Text>
        </group>
      )}

      {/* 成長階段指示器 */}
      <group position={[0, 1.5, 0]}>
        {Array.from({ length: flower.growthStage }, (_, i) => (
          <mesh
            key={i}
            position={[(i - 2) * 0.1, 0, 0]}
          >
            <sphereGeometry args={[0.03, 6, 6]} />
            <meshBasicMaterial color="#FFD700" />
          </mesh>
        ))}
      </group>
    </group>
  )
}