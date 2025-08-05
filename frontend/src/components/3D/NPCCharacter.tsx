import { useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { useGameStore } from '@/stores/gameStore'
import * as THREE from 'three'

interface NPCCharacterProps {
  npc: {
    id: string
    name: string
    personality: string
    currentMood: string
    relationshipLevel: number
  }
  position: [number, number, number]
}

export const NPCCharacter = ({ npc, position }: NPCCharacterProps) => {
  const meshRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  const [clicked, setClicked] = useState(false)
  const { setSelectedNpc, startConversation, selectedNpc } = useGameStore()
  const { camera } = useThree()

  // 根據情緒選擇顏色
  const getMoodColor = (mood: string) => {
    switch (mood) {
      case 'cheerful': return '#FFB6C1'
      case 'calm': return '#87CEEB'
      case 'dreamy': return '#DDA0DD'
      case 'peaceful': return '#98FB98'
      case 'excited': return '#FFD700'
      default: return '#F0F8FF'
    }
  }

  // 根據關係等級調整角色大小
  const getSize = (level: number) => 1 + (level - 1) * 0.1

  // 輕微的浮動動畫
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + position[0]) * 0.1
      
      // 讓角色面向攝影機
      meshRef.current.lookAt(camera.position)
    }
  })

  const handleClick = () => {
    setClicked(!clicked)
    if (selectedNpc === npc.id) {
      setSelectedNpc(null)
    } else {
      startConversation(npc.id)
    }
  }

  const size = getSize(npc.relationshipLevel)
  const isSelected = selectedNpc === npc.id

  return (
    <group
      ref={meshRef}
      position={position}
      onClick={handleClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* 角色主體 - 簡單的圓柱體 + 球體組合 */}
      <group scale={size}>
        {/* 身體 */}
        <mesh position={[0, 1, 0]} castShadow>
          <cylinderGeometry args={[0.3, 0.4, 1.5, 8]} />
          <meshLambertMaterial color={getMoodColor(npc.currentMood)} />
        </mesh>
        
        {/* 頭部 */}
        <mesh position={[0, 2, 0]} castShadow>
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshLambertMaterial color="#FDBCB4" />
        </mesh>
        
        {/* 眼睛 */}
        <mesh position={[-0.15, 2.1, 0.3]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial color="#333" />
        </mesh>
        <mesh position={[0.15, 2.1, 0.3]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial color="#333" />
        </mesh>
        
        {/* 嘴巴 - 根據情緒變化 */}
        <mesh position={[0, 1.9, 0.35]} rotation={[0, 0, npc.currentMood === 'cheerful' ? 0.3 : 0]}>
          <boxGeometry args={[0.1, 0.02, 0.02]} />
          <meshBasicMaterial color="#333" />
        </mesh>
      </group>
      
      {/* 名字標籤 */}
      <Text
        position={[0, 3.5 * size, 0]}
        fontSize={0.3}
        color={isSelected ? "#FF6B6B" : "#333"}
        anchorX="center"
        anchorY="middle"
      >
        {npc.name}
      </Text>
      
      {/* hover 效果 */}
      {hovered && (
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[1, 1, 0.1, 32]} />
          <meshBasicMaterial color="#FFD700" transparent opacity={0.3} />
        </mesh>
      )}
      
      {/* 選中效果 */}
      {isSelected && (
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[1.2, 1.2, 0.05, 32]} />
          <meshBasicMaterial color="#FF6B6B" transparent opacity={0.5} />
        </mesh>
      )}
      
      {/* 關係等級指示器 */}
      <group position={[0, 3 * size, 0]}>
        {Array.from({ length: npc.relationshipLevel }, (_, i) => (
          <mesh key={i} position={[(i - 2) * 0.2, 0.5, 0]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshBasicMaterial color="#FFD700" />
          </mesh>
        ))}
      </group>
    </group>
  )
}