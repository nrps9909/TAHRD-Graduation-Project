import { useState, useEffect } from 'react'
import { useGameStore } from '@/stores/gameStore'

interface InteractionButtonProps {
  npcId: string
  npcName: string
  distance: number
  onInteract: () => void
}

export const InteractionButton = ({ 
  npcId, 
  npcName, 
  distance, 
  onInteract 
}: InteractionButtonProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const maxInteractionDistance = 5 // 最大交互距離

  useEffect(() => {
    // 當玩家接近NPC時顯示按鈕
    setIsVisible(distance <= maxInteractionDistance)
  }, [distance, maxInteractionDistance])

  if (!isVisible) return null

  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40">
      <button
        onClick={onInteract}
        className="bg-healing-warm hover:bg-healing-bright text-white font-bold text-lg px-8 py-4 rounded-full shadow-lg active:scale-95 transition-all duration-200 min-w-32 touch-manipulation"
        style={{
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        💬 與 {npcName} 對話
      </button>
      
      {/* 提示文字 */}
      <div className="text-center mt-2 text-white text-sm drop-shadow-lg">
        點擊開始對話
      </div>
    </div>
  )
}

// 全局交互管理器組件
export const MobileInteractionManager = () => {
  const { playerPosition, npcs, startConversation } = useGameStore()
  const [nearbyNpc, setNearbyNpc] = useState<{id: string, name: string, distance: number} | null>(null)

  useEffect(() => {
    // 計算與所有NPC的距離
    let closestNpc: {id: string, name: string, distance: number} | null = null
    let minDistance = Infinity

    npcs.forEach(npc => {
      const dx = playerPosition[0] - npc.position[0]
      const dz = playerPosition[2] - npc.position[2]
      const distance = Math.sqrt(dx * dx + dz * dz)

      if (distance < minDistance && distance <= 5) {
        closestNpc = {
          id: npc.id,
          name: npc.name,
          distance
        }
        minDistance = distance
      }
    })

    setNearbyNpc(closestNpc)
  }, [playerPosition, npcs])

  const handleInteract = () => {
    if (nearbyNpc) {
      startConversation(nearbyNpc.id)
    }
  }

  if (!nearbyNpc) return null

  return (
    <InteractionButton
      npcId={nearbyNpc.id}
      npcName={nearbyNpc.name}
      distance={nearbyNpc.distance}
      onInteract={handleInteract}
    />
  )
}