import { useEffect, useState, useCallback } from 'react'
import { useGameStore } from '@/stores/gameStore'
import * as THREE from 'three'

export const InteractionHint = () => {
  const { npcs, playerPosition } = useGameStore()
  const [nearbyNPC, setNearbyNPC] = useState<any>(null)
  const interactionDistance = 5
  
  // 檢查附近的 NPC
  const checkNearbyNPC = useCallback(() => {
    const playerPos = new THREE.Vector3(playerPosition[0], playerPosition[1], playerPosition[2])
    
    let nearest = null
    let nearestDistance = Infinity
    
    npcs.forEach((npc) => {
      const npcPos = new THREE.Vector3(npc.position[0], npc.position[1], npc.position[2])
      const distance = playerPos.distanceTo(npcPos)
      
      if (distance < interactionDistance && distance < nearestDistance) {
        nearestDistance = distance
        nearest = npc
      }
    })
    
    setNearbyNPC(nearest)
  }, [npcs, playerPosition])
  
  useEffect(() => {
    const interval = setInterval(checkNearbyNPC, 100) // 每100ms檢查一次
    return () => clearInterval(interval)
  }, [checkNearbyNPC])
  
  if (!nearbyNPC) return null
  
  return (
    <div className="fixed bottom-32 left-1/2 transform -translate-x-1/2 z-50
                    bg-white/95 px-6 py-3 rounded-full shadow-lg
                    border-2 border-blue-400 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="bg-blue-500 text-white px-3 py-1 rounded font-bold">
          F
        </div>
        <span className="text-gray-800 font-medium">
          與 {nearbyNPC.name} 對話
        </span>
      </div>
    </div>
  )
}