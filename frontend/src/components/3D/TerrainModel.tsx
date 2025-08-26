import { useGLTF } from '@react-three/drei'
import { useRef } from 'react'
import * as THREE from 'three'

interface TerrainModelProps {
  position?: [number, number, number]
  scale?: number
}

export const TerrainModel = ({ position = [0, 0, 0], scale = 1 }: TerrainModelProps) => {
  const groupRef = useRef<THREE.Group>(null)
  
  // 載入GLTF模型
  const { scene } = useGLTF('/terrain_low_poly/scene.gltf')
  
  return (
    <group ref={groupRef} position={position} scale={scale}>
      <primitive object={scene} />
    </group>
  )
}

// 預載模型
useGLTF.preload('/terrain_low_poly/scene.gltf')