import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { NPCCharacter } from './3D/NPCCharacter'
import { Player } from './3D/Player'
import { TerrainModel, validateCharacterPositions } from './3D/TerrainModel'
import { useGameStore } from '@/stores/gameStore'
import * as THREE from 'three'

export const Scene = () => {
  const { npcs, playerPosition } = useGameStore()
  const lightRef = useRef<THREE.DirectionalLight>(null)
  
  // 驗證角色位置安全性（開發模式）
  useEffect(() => {
    const timer = setTimeout(() => {
      if (npcs.length > 0) {
        const allPositions = [
          playerPosition,
          ...npcs.map(npc => npc.position)
        ]
        validateCharacterPositions(allPositions)
      }
    }, 3000) // 等待3秒讓地形完全載入並讓NPCs同步位置
    
    return () => clearTimeout(timer)
  }, [npcs, playerPosition])

  return (
    <>
      {/* 基本光源 */}
      <ambientLight intensity={0.5} />
      <directionalLight 
        ref={lightRef}
        position={[10, 20, 5]} 
        intensity={1}
        castShadow
      />
      
      {/* GLTF地形模型 */}
      <TerrainModel position={[0, 0, 0]} scale={1} />
      
      {/* 玩家角色 */}
      <Player position={playerPosition} />
      
      {/* NPCs */}
      {npcs.map((npc) => (
        <NPCCharacter
          key={npc.id}
          npc={npc}
          position={npc.position}
          conversationContent={npc.conversationContent}
          isInConversation={npc.isInConversation}
        />
      ))}
    </>
  )
}