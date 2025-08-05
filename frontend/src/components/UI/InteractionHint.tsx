import { useEffect, useState } from 'react'
import { useGameStore } from '@/stores/gameStore'
import * as THREE from 'three'

export const InteractionHint = () => {
  const [showHint, setShowHint] = useState(false)
  const [nearestNPC, setNearestNPC] = useState<string | null>(null)
  const { npcs, playerPosition } = useGameStore()
  
  const interactionDistance = 3 // 與 Player.tsx 中的設定相同
  
  useEffect(() => {
    if (!playerPosition) return
    
    const playerPos = new THREE.Vector3(playerPosition[0], playerPosition[1], playerPosition[2])
    
    // 檢查最近的 NPC
    let nearest = null
    let nearestDist = Infinity
    
    npcs.forEach((npc) => {
      const npcPos = new THREE.Vector3(npc.position[0], npc.position[1], npc.position[2])
      const distance = playerPos.distanceTo(npcPos)
      
      if (distance < interactionDistance && distance < nearestDist) {
        nearestDist = distance
        nearest = npc.name
      }
    })
    
    if (nearest) {
      setNearestNPC(nearest)
      setShowHint(true)
    } else {
      setShowHint(false)
      setNearestNPC(null)
    }
  }, [playerPosition, npcs])
  
  if (!showHint || !nearestNPC) return null
  
  return (
    <div className="fixed bottom-32 left-1/2 transform -translate-x-1/2 z-40 animate-fade-in">
      <div className="bg-black bg-opacity-80 text-white px-6 py-3 rounded-full shadow-lg flex items-center space-x-3">
        <div className="bg-white text-black w-8 h-8 rounded flex items-center justify-center font-bold">
          F
        </div>
        <span className="text-lg">與 {nearestNPC} 對話</span>
      </div>
    </div>
  )
}