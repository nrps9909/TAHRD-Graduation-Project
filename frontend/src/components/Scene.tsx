import { useEffect } from 'react'
import { NPCCharacter } from './3D/NPCCharacter'
import { Player } from './3D/Player'
import { TerrainModel, validateCharacterPositions } from './3D/TerrainModel'
import { EnvironmentLighting } from './3D/EnvironmentLighting'
import { WeatherEffects } from './3D/WeatherEffects'
import { WindEffect } from './3D/WindEffect'
import { DrizzleEffect } from './3D/DrizzleEffect'
import { StormDustEffect } from './3D/StormDustEffect'
import { MountainStormEffect } from './3D/MountainStormEffect'
import { SkyDome } from './3D/SkyDome'
import { NightSky } from './3D/NightSky'
import { Moon } from './3D/Moon'
import { Sun } from './3D/Sun'
import { MountainFog, HighAltitudeMist, DawnMist } from './3D/MountainFog'
import { MountainAtmosphere, MountainReflection, MountainWind } from './3D/MountainAtmosphere'
import { MountainClouds } from './3D/MountainClouds'
import { MagicalFloatingParticles, AmbientLightDust } from './3D/MagicalParticles'
import { Ocean } from './3D/Ocean'
import { BoundaryWall } from './3D/BoundaryWall'
import { preloadAllCharacterModels } from './CharacterSkinSystem'
import { useGameStore } from '@/stores/gameStore'
import { useTimeStore } from '@/stores/timeStore'
import { collisionSystem } from '@/utils/collision'

export const Scene = () => {
  const { npcs, playerPosition } = useGameStore()
  const { timeOfDay, tick } = useTimeStore()
  
  // 預載入所有角色模型
  useEffect(() => {
    preloadAllCharacterModels()
  }, [])
  
  // 啟動時間系統更新
  useEffect(() => {
    const interval = setInterval(() => {
      tick()
    }, 100) // 每100ms更新一次時間
    
    return () => clearInterval(interval)
  }, [tick])

  // 清理所有邊界相關的碰撞物體
  useEffect(() => {
    // 清理所有邊界系統
    collisionSystem.clearByIdPattern('fog_wall')
    collisionSystem.clearByIdPattern('ocean_boundary')
    collisionSystem.clearByIdPattern('world_boundary')
    collisionSystem.clearByIdPattern('coastline_boundary')
    console.log('🧹 已清理所有邊界碰撞物體')
  }, [])
  
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
      {/* 動態天空穹頂系統 */}
      <SkyDome />
      
      {/* 移除多雲效果：山地霧效系統、破曉薄霧、高海拔雲霧、山脈雲層、山地大氣層、山地反射、山地風效 */}
      
      {/* 夜空系統 - 只在夜晚顯示星星 */}
      {timeOfDay === 'night' && <NightSky />}
      
      {/* 動森風格月亮 - 只在夜晚顯示 */}
      <Moon />
      
      {/* 3D太陽 - 只在白天顯示 */}
      <Sun />
      
      {/* 魔法懸浮光粒子 - 溫馨魔幻的發光微塵 */}
      <MagicalFloatingParticles />
      
      {/* 環境光塵粒子 - 細小閃爍的光點 */}
      <AmbientLightDust />
      
      {/* 固定夜晚環境光照系統 */}
      <EnvironmentLighting />
      
      {/* 天氣效果 */}
      <WeatherEffects />
      
      {/* 大風效果 */}
      <WindEffect />
      
      {/* 細雨效果 */}
      <DrizzleEffect />
      
      {/* 山雷風揚塵土效果 */}
      <StormDustEffect />
      
      {/* 山雷雷電效果 */}
      <MountainStormEffect />
      
      
      {/* 海洋環境 */}
      <Ocean />
      
      {/* GLTF地形模型 */}
      <TerrainModel position={[0, 0, 0]} scale={1} />
      
      {/* 邊界牆壁 */}
      <BoundaryWall />
      
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