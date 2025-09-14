import { useEffect } from 'react'
import { NPCManager } from './NPCManager'
import { Player } from './3D/Player'
import { TerrainModel, validateCharacterPositions } from './3D/TerrainModel'
import { EnvironmentLighting } from './3D/EnvironmentLighting'
import { WeatherEffects } from './3D/WeatherEffects'
import { WindEffect } from './3D/WindEffect'
import { DrizzleEffect } from './3D/DrizzleEffect'
import { StormDustEffect } from './3D/StormDustEffect'
import { MountainStormEffect } from './3D/MountainStormEffect'
import { SkyDome, ClearSkyWhiteClouds } from './3D/SkyDome'
import { SnowEffect, SnowAccumulation } from './3D/SnowEffect'
import { CuteCloudySky } from './3D/CuteCloudySky'
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
import { ContactShadows } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { bindScene } from '@/game/physics/slopeController'

export const Scene = () => {
  const { npcs, playerPosition } = useGameStore()
  const { timeOfDay, tick } = useTimeStore()
  const { scene } = useThree()

  // 綁定場景到坡度控制器
  useEffect(() => {
    bindScene(scene)
    console.log('🏞️ 已綁定場景到坡度控制器')
  }, [scene])

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

  // 立即檢查並清除早晨的雪天氣
  useEffect(() => {
    const checkAndClearMorningSnow = () => {
      const { hour, minute, weather, forceStopSnowInMorning, setWeather } = useTimeStore.getState()
      const isMorning = hour >= 4 && hour < 9
      const isSnowing = weather === 'snow'
      
      if (isMorning && isSnowing) {
        console.log(`🚫 Scene監控：發現早晨時間 (${hour}:${minute.toString().padStart(2, '0')}) 有下雪，立即強制清除！`)
        // 使用兩種方式確保清除
        forceStopSnowInMorning()
        // 再次確保設為晴天
        setWeather('clear')
      }
    }
    
    // 立即檢查一次
    checkAndClearMorningSnow()
    
    // 每200ms檢查一次，更積極地清除早晨下雪
    const interval = setInterval(checkAndClearMorningSnow, 200)
    
    return () => clearInterval(interval)
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
      {/* 環境光照 */}
      <ambientLight intensity={0.5} />
      
      {/* 動態天空穹頂系統 */}
      <SkyDome />
      
      {/* 晴天藍天白雲效果 */}
      <ClearSkyWhiteClouds />
      
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
      
      {/* 可愛的雪花效果 */}
      <SnowEffect />
      
      {/* 地面積雪效果 */}
      <SnowAccumulation />
      
      {/* 海洋環境 */}
      <Ocean />
      
      {/* GLTF地形模型 */}
      <TerrainModel position={[0, 0, 0]} scale={1} />

      {/* Contact Shadows for better foot-ground contact */}
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.5}
        scale={260}
        blur={2.6}
        far={45}
        frames={1}
      />

      {/* 邊界牆壁 */}
      <BoundaryWall />
      
      {/* 移除測試立方體 - 樹木陰影系統現已完整 */}
      
      {/* 簡單的陰影接收平面 - 移除以防止覆蓋地形 */}
      
      {/* 簡化的測試光源 - 固定位置 */}
      <directionalLight
        position={[20, 30, 10]}
        target-position={[0, 0, 0]}
        color="#ffffff"
        intensity={2.5}
        castShadow
        shadow-mapSize={2048}
        shadow-camera-far={100}
        shadow-camera-left={-600}
        shadow-camera-right={600}
        shadow-camera-top={600}
        shadow-camera-bottom={-600}
        shadow-camera-near={1}
        shadow-bias={0.003}
        shadow-normalBias={0.05}
      />
      
      {/* 玩家角色 */}
      <Player position={playerPosition} />
      
      {/* NPCs managed by NPCManager */}
      <NPCManager />
    </>
  )
}