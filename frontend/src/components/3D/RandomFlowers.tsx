import { useRef, useMemo, useEffect } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { getTerrainHeight } from './TerrainModel'

// 單朵花組件
const FlowerInstance = ({ 
  position, 
  rotation, 
  scale,
  flowerMesh 
}: {
  position: [number, number, number]
  rotation: [number, number, number]
  scale: number
  flowerMesh: THREE.Object3D
}) => {
  const meshRef = useRef<THREE.Group>(null)

  return (
    <group 
      ref={meshRef}
      position={position}
      rotation={rotation}
      scale={[scale, scale, scale]}
      castShadow
      receiveShadow
    >
      <primitive object={flowerMesh.clone()} />
    </group>
  )
}

// 隨機花朵系統
export const RandomFlowers = () => {
  const { scene } = useGLTF('/flowers_pack/flower.gltf')
  
  // 提取所有花朵mesh
  const flowerMeshes = useMemo(() => {
    const meshes: THREE.Object3D[] = []
    
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshes.push(child)
      }
    })
    
    console.log(`🌸 找到 ${meshes.length} 個花朵模型`)
    return meshes
  }, [scene])

  // 生成山脈邊緣花朵位置
  const flowerPositions = useMemo(() => {
    if (flowerMeshes.length === 0) return []
    
    const positions: Array<{
      x: number
      z: number
      y: number
      rotation: [number, number, number]
      scale: number
      meshIndex: number
    }> = []

    const flowerCount = 80 // 減少花朵數量，更整齊
    const minDistance = 4 // 增加花朵間距
    const mountainRadius = 60 // 山脈邊緣半徑
    const ringWidth = 15 // 花朵環帶寬度

    console.log('🌺 開始在山脈邊緣生成花朵位置...')

    for (let i = 0; i < flowerCount; i++) {
      let attempts = 0
      let validPosition = false
      
      while (!validPosition && attempts < 50) {
        // 在山脈邊緣環形區域生成位置
        const angle = Math.random() * Math.PI * 2
        const distance = mountainRadius - ringWidth + Math.random() * ringWidth
        const x = Math.cos(angle) * distance
        const z = Math.sin(angle) * distance
        
        // 檢查地形高度
        const terrainHeight = getTerrainHeight(x, z)
        
        // 只在山腳邊緣的平緩地帶放置花朵
        if (terrainHeight > 2 && terrainHeight < 8) {
          // 檢查與其他花朵的距離
          const tooClose = positions.some(pos => {
            const dx = pos.x - x
            const dz = pos.z - z
            return Math.sqrt(dx * dx + dz * dz) < minDistance
          })
          
          if (!tooClose) {
            // 隨機選擇花朵類型
            const meshIndex = Math.floor(Math.random() * flowerMeshes.length)
            
            positions.push({
              x,
              z,
              y: terrainHeight + 0.1, // 稍微浮在地面上
              rotation: [
                (Math.random() - 0.5) * 0.15, // 更小的傾斜角度
                Math.random() * Math.PI * 2,   // 隨機Y軸旋轉
                (Math.random() - 0.5) * 0.15   // 更小的傾斜角度
              ],
              scale: 0.4 + Math.random() * 0.3, // 0.4-0.7倍縮放，更統一
              meshIndex
            })
            
            validPosition = true
          }
        }
        
        attempts++
      }
    }

    console.log(`🌻 在山脈邊緣成功生成 ${positions.length} 個花朵位置`)
    return positions
  }, [flowerMeshes])

  // 延遲渲染，等待地形載入
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('🌷 花朵系統已載入完成')
    }, 2000)
    
    return () => clearTimeout(timer)
  }, [])

  if (flowerMeshes.length === 0 || flowerPositions.length === 0) {
    return null
  }

  return (
    <group>
      {flowerPositions.map((flower, i) => (
        <FlowerInstance
          key={`flower-${i}`}
          position={[flower.x, flower.y, flower.z]}
          rotation={flower.rotation}
          scale={flower.scale}
          flowerMesh={flowerMeshes[flower.meshIndex]}
        />
      ))}
    </group>
  )
}

// 預載入GLTF模型
useGLTF.preload('/flowers_pack/flower.gltf')