import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Ground } from './3D/Ground'
import { NPCCharacter } from './3D/NPCCharacter'
import { MemoryFlower } from './3D/MemoryFlower'
import { Buildings } from './3D/Buildings'
import { Player } from './3D/Player'
import { ParticleEffects, Fireflies } from './3D/ParticleEffectsFixed'
import { useGameStore } from '@/stores/gameStore'
import * as THREE from 'three'

export const Scene = () => {
  const { npcs, memoryFlowers, weather, timeOfDay, season } = useGameStore()
  const lightRef = useRef<THREE.DirectionalLight>(null)

  // 動態調整光線基於時間
  useFrame(() => {
    if (lightRef.current) {
      const intensity = Math.max(0.3, Math.sin((timeOfDay / 24) * Math.PI * 2) * 0.7 + 0.5)
      lightRef.current.intensity = intensity
      
      // 根據時間調整光線顏色
      const color = new THREE.Color()
      if (timeOfDay < 6 || timeOfDay > 20) {
        // 夜晚 - 藍色調
        color.setHSL(0.6, 0.3, 0.4)
      } else if (timeOfDay < 8 || timeOfDay > 18) {
        // 黃昏/黎明 - 橙色調
        color.setHSL(0.1, 0.7, 0.6)
      } else {
        // 白天 - 自然光
        color.setHSL(0.15, 0.1, 1)
      }
      lightRef.current.color = color
    }
  })

  // 根據天氣調整霧效果 - Animal Crossing 風格的遠景霧化
  const fogColor = weather === 'rainy' ? '#B0C4DE' : weather === 'cloudy' ? '#D3D3D3' : '#E6F3FF'

  return (
    <>
      <fog attach="fog" args={[fogColor, 60, 100]} />
      
      <directionalLight 
        ref={lightRef}
        position={[10, 20, 5]} 
        intensity={1}
        castShadow
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-camera-near={0.1}
        shadow-camera-far={100}
      />
      
      {/* 地面 */}
      <Ground />
      
      {/* 玩家角色 */}
      <Player position={[0, 0.5, 0]} />
      
      {/* 建築物 */}
      <Buildings />
      
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
      
      {/* 記憶花朵 */}
      {memoryFlowers.map((flower) => (
        <MemoryFlower
          key={flower.id}
          flower={flower}
          position={flower.position}
        />
      ))}
      
      {/* 粒子效果 - 使用修復版本 */}
      <ParticleEffects weather={weather} season={season} />
      
      {/* 夜晚的螢火蟲 - 使用修復版本 */}
      {(timeOfDay < 6 || timeOfDay > 20) && <Fireflies />}
    </>
  )
}