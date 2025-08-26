import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { NPCCharacter } from './3D/NPCCharacter'
import { Player } from './3D/Player'
import { TerrainModel } from './3D/TerrainModel'
import { useGameStore } from '@/stores/gameStore'
import * as THREE from 'three'

export const Scene = () => {
  const { npcs } = useGameStore()
  const lightRef = useRef<THREE.DirectionalLight>(null)

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
      <Player position={[0, 0.5, 0]} />
      
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