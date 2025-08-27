import { useEffect } from 'react'
import { NPCCharacter } from './3D/NPCCharacter'
import { Player } from './3D/Player'
import { TerrainModel, validateCharacterPositions } from './3D/TerrainModel'
import { EnvironmentLighting } from './3D/EnvironmentLighting'
import { WeatherEffects } from './3D/WeatherEffects'
import { SkyDome } from './3D/SkyDome'
import { NightSky } from './3D/NightSky'
import { useGameStore } from '@/stores/gameStore'

export const Scene = () => {
  const { npcs, playerPosition } = useGameStore()
  
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
      {/* 固定夜晚模式不需要動態天空穹頂 */}
      {/* <SkyDome /> */}
      
      {/* 夜空系統 */}
      <NightSky />
      
      {/* 固定夜晚環境光照系統 */}
      <EnvironmentLighting />
      
      {/* 天氣效果 */}
      <WeatherEffects />
      
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