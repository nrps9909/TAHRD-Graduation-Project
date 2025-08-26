import { useRef, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Text, Html, Billboard, RoundedBox } from '@react-three/drei'
import { useGameStore } from '@/stores/gameStore'
import { collisionSystem } from '@/utils/collision'
import { getTerrainHeight, getTerrainRotation, getTerrainSlope, isValidGroundPosition, isPathClear } from './TerrainModel'
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
  const bubbleRef = useRef<THREE.Group>(null)
  const nameRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  const [clicked, setClicked] = useState(false)
  const [currentPosition, setCurrentPosition] = useState(new THREE.Vector3(...position))
  const [targetPosition, setTargetPosition] = useState(new THREE.Vector3(...position))
  const [isNon3DPosition] = useState(Math.abs(position[0]) > 40 || Math.abs(position[2]) > 40)
  
  // 初始化時處理位置設定
  useEffect(() => {
    console.log(`NPC ${npc.name} 接收到的位置:`, position, `是否非3D:`, isNon3DPosition)
    
    if (isNon3DPosition) {
      // 非3D位置：直接使用設定的位置，不進行地形調整
      const adjustedPosition = new THREE.Vector3(position[0], position[1], position[2])
      setCurrentPosition(adjustedPosition)
      setTargetPosition(adjustedPosition)
      updateNpcPosition(npc.id, [adjustedPosition.x, adjustedPosition.y, adjustedPosition.z])
      console.log(`NPC ${npc.name} 設定為非3D位置:`, adjustedPosition.toArray())
    } else {
      // 3D模型內位置：調整到地形高度
      const terrainHeight = getTerrainHeight(position[0], position[2])
      const adjustedPosition = new THREE.Vector3(position[0], terrainHeight + 1.0, position[2])
      setCurrentPosition(adjustedPosition)
      setTargetPosition(adjustedPosition)
      updateNpcPosition(npc.id, [adjustedPosition.x, adjustedPosition.y, adjustedPosition.z])
      console.log(`NPC ${npc.name} 調整到地形高度:`, adjustedPosition.toArray())
    }
  }, [])
  const [walkSpeed] = useState(2.5) // 提高移動速度，讓NPCs更活躍
  const [nextMoveTime, setNextMoveTime] = useState(Date.now() + 3000 + Math.random() * 5000) // 等待3-8秒即可開始移動
  const [facingDirection, setFacingDirection] = useState(0)
  const { setSelectedNpc, startConversation, selectedNpc, updateNpcPosition } = useGameStore()
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
      let attempts = 0
      let validTarget = null
      
      // 30%機率進行長距離探索，70%機率進行短距離移動
      const isLongExploration = Math.random() < 0.3
      
      // 嘗試找到一個有效的目標位置
      while (attempts < 20 && !validTarget) {
        let newX, newZ
        
        if (isLongExploration) {
          // 長距離探索：擴大範圍讓NPCs更自由
          newX = -20 + Math.random() * 40 // -20 到 20 的探索範圍
          newZ = -20 + Math.random() * 40
        } else {
          // 短距離移動：在當前位置附近
          const angle = Math.random() * Math.PI * 2
          const distance = 3 + Math.random() * 8 // 3-11 單位的移動距離
          newX = currentPosition.x + Math.cos(angle) * distance
          newZ = currentPosition.z + Math.sin(angle) * distance
        }
        
        // 確保在地形範圍內
        const clampedX = Math.max(-45, Math.min(45, newX))
        const clampedZ = Math.max(-45, Math.min(45, newZ))
        
        // 檢查是否為有效的地面位置（不是雲朵）
        if (!isValidGroundPosition(clampedX, clampedZ)) {
          attempts++
          continue
        }
        
        // 檢查從當前位置到目標位置的路徑是否安全（不會穿越山脈）
        if (!isPathClear(currentPosition.x, currentPosition.z, clampedX, clampedZ)) {
          attempts++
          continue
        }
        
        // 獲取該位置的地形高度
        const terrainHeight = getTerrainHeight(clampedX, clampedZ)
        const testPosition = new THREE.Vector3(clampedX, terrainHeight + 1.0, clampedZ)
        
        // 檢查位置是否有效（碰撞檢測）
        const isValid = collisionSystem.isValidPosition(testPosition, 0.3)
        if (isValid) {
          validTarget = testPosition
        } else {
          console.log(`NPC ${npc.name} 位置 (${clampedX.toFixed(1)}, ${clampedZ.toFixed(1)}) 被碰撞物體阻擋`)
        }
        
        attempts++
      }
      
      // 如果找到有效位置就設為目標，否則保持當前位置
      if (validTarget) {
        setTargetPosition(validTarget)
        console.log(`NPC ${npc.name} ${isLongExploration ? '長距離探索' : '短距離移動'}到 (${validTarget.x.toFixed(1)}, ${validTarget.z.toFixed(1)})`)
      }
      
      // 根據移動類型調整下次移動時間（縮短間隔讓NPCs更活躍）
      const nextInterval = isLongExploration 
        ? 10000 + Math.random() * 15000 // 長距離探索後休息：10-25秒
        : 4000 + Math.random() * 6000   // 短距離移動：4-10秒
      
      setNextMoveTime(Date.now() + nextInterval)
    }
  }

  // 定期更新目標位置
  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() > nextMoveTime && !isInConversation && !isNon3DPosition) {
        setNewTarget()
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [nextMoveTime, isInConversation, currentPosition])

  // 動畫和移動
  useFrame((state, delta) => {
    if (meshRef.current) {
      // 移動到目標位置（只有3D位置內的NPCs才移動）
      if (!isInConversation && !isNon3DPosition) {
        const direction = new THREE.Vector3().subVectors(targetPosition, currentPosition)
        const distance = direction.length()
        
        if (distance > 0.1) {
          direction.normalize()
          const moveDistance = Math.min(walkSpeed * delta, distance)
          const newPosition = currentPosition.clone().add(direction.clone().multiplyScalar(moveDistance))
          
          // 使用碰撞系統檢查新位置是否有效
          const validPosition = collisionSystem.getClosestValidPosition(
            currentPosition,
            newPosition,
            0.3 // NPC半徑稍小
          )
          
          // 更新當前位置
          setCurrentPosition(validPosition.clone())
          
          // 獲取地形高度並更新mesh位置
          const terrainHeight = getTerrainHeight(validPosition.x, validPosition.z)
          meshRef.current.position.x = validPosition.x
          meshRef.current.position.z = validPosition.z
          // Y軸會在下面的浮動動畫中設定
          
          // 更新 store 中的位置（每隔一段時間更新，避免過於頻繁）
          if (Math.random() < 0.1) { // 10% 機率更新，約每秒10次
            const storeHeight = terrainHeight + 1.0 // 與實際顯示高度保持一致
            updateNpcPosition(npc.id, [validPosition.x, storeHeight, validPosition.z])
          }
          
          // 面向移動方向
          if (!hovered && validPosition.distanceTo(currentPosition) > 0.01) {
            const actualDirection = new THREE.Vector3().subVectors(validPosition, currentPosition).normalize()
            meshRef.current.rotation.y = Math.atan2(actualDirection.x, actualDirection.z)
          }
        }
      }
      
      // 輕微的浮動動畫 - 基於實際地形高度並適應地形傾斜
      const currentX = meshRef.current.position.x
      const currentZ = meshRef.current.position.z
      const terrainHeight = getTerrainHeight(currentX, currentZ)
      const terrainRotation = getTerrainRotation(currentX, currentZ)
      const terrainSlope = getTerrainSlope(currentX, currentZ)
      
      // NPC角色的高度調整：確保整個角色都在地形上方
      const characterCenterHeight = 1.0 // 角色中心點高度
      meshRef.current.position.y = terrainHeight + characterCenterHeight + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.05
      
      // 根據地形傾斜調整NPC旋轉（比玩家更輕微的傾斜）
      const maxTiltAngle = Math.PI / 6 // 30度最大傾斜，比玩家寬鬆一些
      if (terrainSlope < maxTiltAngle && !hovered && selectedNpc !== npc.id) {
        // 只有在不被選中或懸停時才適應地形
        const lerpFactor = 0.03 // 很慢的適應速度，保持自然
        meshRef.current.rotation.x = THREE.MathUtils.lerp(
          meshRef.current.rotation.x, 
          terrainRotation.x * 0.2, // 更輕微的傾斜
          lerpFactor
        )
        meshRef.current.rotation.z = THREE.MathUtils.lerp(
          meshRef.current.rotation.z, 
          terrainRotation.z * 0.2,
          lerpFactor
        )
      }
      
      // 如果被選中或懸停，面向攝影機
      if (hovered || selectedNpc === npc.id) {
        const lookAtPos = new THREE.Vector3(camera.position.x, meshRef.current.position.y, camera.position.z)
        meshRef.current.lookAt(lookAtPos)
      }
    }
    
    // 對話泡泡的可愛動畫
    if (bubbleRef.current && isInConversation) {
      // 輕微的縮放脈動
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.05
      bubbleRef.current.scale.setScalar(scale)
      
      // 輕微的旋轉搖擺
      bubbleRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 2) * 0.02
    }
    
    // 名字標籤的可愛動畫
    if (nameRef.current) {
      // 懸浮效果
      nameRef.current.position.y = (isInConversation && conversationContent ? 7.5 * size : 3.5 * size) 
        + Math.sin(state.clock.elapsedTime * 2.5) * 0.1
      
      // 選中時的脈動效果
      if (isSelected) {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.1
        nameRef.current.scale.setScalar(scale)
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
      position={[currentPosition.x, currentPosition.y, currentPosition.z]}
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
      
      {/* 3D對話泡泡 - 使用Billboard永遠朝向玩家 */}
      {isInConversation && conversationContent && (
        <Billboard
          ref={bubbleRef}
          follow={true}
          lockX={false}
          lockY={false}
          lockZ={false}
          position={[0, 4.5 * size, 0]}
        >
          {/* 3D對話框背景 */}
          <RoundedBox
            args={[5, 2.5, 0.3]}
            radius={0.25}
            smoothness={4}
          >
            <meshPhysicalMaterial
              color="#FFE4E1"
              emissive="#FFB6C1"
              emissiveIntensity={0.2}
              roughness={0.3}
              metalness={0.1}
              clearcoat={1}
              clearcoatRoughness={0}
              transmission={0.1}
              thickness={0.5}
            />
          </RoundedBox>
          
          {/* 3D對話框邊框 */}
          <RoundedBox
            args={[5.2, 2.7, 0.25]}
            radius={0.3}
            smoothness={4}
            position={[0, 0, -0.05]}
          >
            <meshPhysicalMaterial
              color="#87CEEB"
              emissive="#4A90E2"
              emissiveIntensity={0.3}
              roughness={0.2}
              metalness={0.2}
            />
          </RoundedBox>
          
          {/* 對話文字 */}
          <Text
            position={[0, 0, 0.2]}
            fontSize={0.35}
            maxWidth={4.5}
            lineHeight={1.4}
            letterSpacing={0.02}
            textAlign="center"
            font="/fonts/font.TTC"
            anchorX="center"
            anchorY="middle"
            color="#2C3E50"
            outlineWidth={0.02}
            outlineColor="#FFFFFF"
            onSync={(self) => {
              // 如果字體加載失敗，使用備用樣式
              if (!self.geometry) {
                console.warn('Custom font not found, using default')
              }
            }}
          >
            {conversationContent}
          </Text>
          
          {/* 可愛的裝飾 - 星星 */}
          <mesh position={[-2.3, 1, 0.2]}>
            <coneGeometry args={[0.15, 0.3, 5]} />
            <meshPhysicalMaterial
              color="#FFD700"
              emissive="#FFA500"
              emissiveIntensity={0.5}
              roughness={0.2}
              metalness={0.8}
            />
          </mesh>
          
          <mesh position={[2.3, 1, 0.2]}>
            <coneGeometry args={[0.15, 0.3, 5]} />
            <meshPhysicalMaterial
              color="#FFD700"
              emissive="#FFA500"
              emissiveIntensity={0.5}
              roughness={0.2}
              metalness={0.8}
            />
          </mesh>
          
          {/* 對話框尾巴（3D三角形） */}
          <mesh position={[0, -1.5, 0]} rotation={[0, 0, Math.PI]}>
            <coneGeometry args={[0.4, 0.8, 3]} />
            <meshPhysicalMaterial
              color="#FFE4E1"
              emissive="#FFB6C1"
              emissiveIntensity={0.2}
              roughness={0.3}
              metalness={0.1}
            />
          </mesh>
        </Billboard>
      )}
      
      {/* 3D名字標籤 - 使用Billboard永遠朝向玩家 */}
      <Billboard
        ref={nameRef}
        follow={true}
        lockX={false}
        lockY={false}
        lockZ={false}
        position={[0, isInConversation && conversationContent ? 7.5 * size : 3.5 * size, 0]}
      >
        {/* 名字背景板 */}
        <RoundedBox
          args={[2, 0.8, 0.2]}
          radius={0.15}
          smoothness={4}
        >
          <meshPhysicalMaterial
            color={isSelected ? "#FFB6C1" : "#E6E6FA"}
            emissive={isSelected ? "#FF69B4" : "#9370DB"}
            emissiveIntensity={0.3}
            roughness={0.2}
            metalness={0.1}
            clearcoat={1}
            clearcoatRoughness={0}
            transmission={0.2}
            thickness={0.3}
          />
        </RoundedBox>
        
        {/* 3D名字文字 */}
        <Text
          position={[0, 0, 0.15]}
          fontSize={0.4}
          font="/fonts/font.TTC"
          anchorX="center"
          anchorY="middle"
          color={isSelected ? "#FFFFFF" : "#4B0082"}
          outlineWidth={0.03}
          outlineColor={isSelected ? "#FF1493" : "#FFFFFF"}
          onSync={(self) => {
            // 如果字體加載失敗，使用備用樣式
            if (!self.geometry) {
              console.warn('Custom font not found for name, using default')
            }
          }}
        >
          {npc.name}
        </Text>
        
        {/* 可愛的愛心裝飾 */}
        {isSelected && (
          <>
            <mesh position={[-0.9, 0, 0.15]} scale={0.15}>
              <sphereGeometry args={[1, 16, 16]} />
              <meshPhysicalMaterial
                color="#FF69B4"
                emissive="#FF1493"
                emissiveIntensity={0.5}
                roughness={0.2}
                metalness={0.3}
              />
            </mesh>
            <mesh position={[0.9, 0, 0.15]} scale={0.15}>
              <sphereGeometry args={[1, 16, 16]} />
              <meshPhysicalMaterial
                color="#FF69B4"
                emissive="#FF1493"
                emissiveIntensity={0.5}
                roughness={0.2}
                metalness={0.3}
              />
            </mesh>
          </>
        )}
      </Billboard>
      
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