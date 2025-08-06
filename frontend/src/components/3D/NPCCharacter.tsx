import { useRef, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Text, Html } from '@react-three/drei'
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
  conversationContent?: string
  isInConversation?: boolean
}

export const NPCCharacter = ({ npc, position, conversationContent, isInConversation }: NPCCharacterProps) => {
  const meshRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  const [clicked, setClicked] = useState(false)
  const [currentPosition, setCurrentPosition] = useState(new THREE.Vector3(...position))
  const [targetPosition, setTargetPosition] = useState(new THREE.Vector3(...position))
  const [walkSpeed] = useState(0.5) // 移動速度
  const [nextMoveTime, setNextMoveTime] = useState(Date.now() + Math.random() * 10000)
  const [facingDirection, setFacingDirection] = useState(0)
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

  // 設置新的隨機目標位置
  const setNewTarget = () => {
    if (!isInConversation) {
      const angle = Math.random() * Math.PI * 2
      const distance = 3 + Math.random() * 5 // 3-8 單位的移動距離
      const newX = currentPosition.x + Math.cos(angle) * distance
      const newZ = currentPosition.z + Math.sin(angle) * distance
      
      // 限制在地圖範圍內
      const clampedX = Math.max(-40, Math.min(40, newX))
      const clampedZ = Math.max(-40, Math.min(40, newZ))
      
      setTargetPosition(new THREE.Vector3(clampedX, position[1], clampedZ))
      setFacingDirection(angle)
      setNextMoveTime(Date.now() + 15000 + Math.random() * 20000) // 15-35秒後再次移動
    }
  }

  // 定期更新目標位置
  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() > nextMoveTime && !isInConversation) {
        setNewTarget()
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [nextMoveTime, isInConversation, currentPosition])

  // 動畫和移動
  useFrame((state, delta) => {
    if (meshRef.current) {
      // 移動到目標位置
      if (!isInConversation) {
        const direction = new THREE.Vector3().subVectors(targetPosition, currentPosition)
        const distance = direction.length()
        
        if (distance > 0.1) {
          direction.normalize()
          const moveDistance = Math.min(walkSpeed * delta, distance)
          currentPosition.add(direction.multiplyScalar(moveDistance))
          setCurrentPosition(currentPosition.clone())
          
          // 更新位置
          meshRef.current.position.x = currentPosition.x
          meshRef.current.position.z = currentPosition.z
          
          // 面向移動方向
          if (!hovered) {
            meshRef.current.rotation.y = Math.atan2(direction.x, direction.z)
          }
        }
      }
      
      // 輕微的浮動動畫
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.05
      
      // 如果被選中或懸停，面向攝影機
      if (hovered || selectedNpc === npc.id) {
        const lookAtPos = new THREE.Vector3(camera.position.x, meshRef.current.position.y, camera.position.z)
        meshRef.current.lookAt(lookAtPos)
      }
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
      
      {/* 對話泡泡 */}
      {isInConversation && conversationContent && (
        <Html
          position={[0, 3.5 * size, 0]}
          center
          distanceFactor={10}
          style={{
            pointerEvents: 'none',
            userSelect: 'none'
          }}
        >
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '8px 12px',
            borderRadius: '15px',
            border: '2px solid #4A90E2',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            maxWidth: '200px',
            fontSize: '14px',
            color: '#333',
            fontFamily: 'Arial, sans-serif',
            position: 'relative',
            animation: 'float 2s ease-in-out infinite'
          }}>
            <div style={{
              position: 'absolute',
              bottom: '-8px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '0',
              height: '0',
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: '8px solid #4A90E2',
            }} />
            <div style={{
              position: 'absolute',
              bottom: '-6px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '0',
              height: '0',
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid rgba(255, 255, 255, 0.95)',
            }} />
            {conversationContent}
          </div>
        </Html>
      )}
      
      {/* 名字標籤 */}
      <Text
        position={[0, isInConversation && conversationContent ? 4.8 * size : 3.5 * size, 0]}
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