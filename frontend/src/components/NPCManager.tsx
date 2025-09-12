import React, { useEffect } from 'react'
import * as THREE from 'three'
import { NPCCharacter } from './3D/NPCCharacter'
import { useGameStore } from '@/stores/gameStore'
import { snapToNearestGround } from '@/game/physics/grounding'

const DEFAULT_NPCS = [
  { id: 'npc-1', name: '陸培修', pos: new THREE.Vector3(5, 1, 8), color: '#ff6b6b' },
  { id: 'npc-2', name: '劉宇岑', pos: new THREE.Vector3(-8, 1, 5), color: '#4ecdc4' },
  { id: 'npc-3', name: '陳庭安', pos: new THREE.Vector3(3, 1, -6), color: '#45b7d1' },
]

export function NPCManager() {
  const { npcs } = useGameStore()
  
  // Use backend NPCs if available, otherwise use defaults
  const npcList = React.useMemo(() => {
    if (npcs && npcs.length > 0) {
      return npcs.slice(0, 3).map((n, i) => ({
        id: n.id,
        name: n.name,
        position: n.position || DEFAULT_NPCS[i].pos.toArray(),
        color: DEFAULT_NPCS[i].color
      }))
    }
    return DEFAULT_NPCS.map(n => ({
      id: n.id,
      name: n.name,
      position: n.pos.toArray() as [number, number, number],
      color: n.color
    }))
  }, [npcs])
  
  // Initial snap to ground for all NPCs
  useEffect(() => {
    const timer = setTimeout(() => {
      DEFAULT_NPCS.forEach(npc => {
        snapToNearestGround(npc.pos, 3, 0.25)
      })
    }, 1500)
    
    return () => clearTimeout(timer)
  }, [])
  
  return (
    <>
      {npcList.map(npc => (
        <NPCCharacter
          key={npc.id}
          npc={{
            id: npc.id,
            name: npc.name,
            position: npc.position,
            color: npc.color
          }}
        />
      ))}
    </>
  )
}