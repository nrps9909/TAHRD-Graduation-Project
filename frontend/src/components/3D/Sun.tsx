import React, { useRef, useMemo, Suspense } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useTimeStore } from '@/stores/timeStore'

// 真實太陽3D模型組件
const SunModel = ({ position, onLoad }: { position: [number, number, number], onLoad: (ref: THREE.Group) => void }) => {
  const sunGroupRef = useRef<THREE.Group>(null)
  const [modelLoaded, setModelLoaded] = React.useState(false)
  
  // 載入GLTF太陽模型
  const { scene, error } = useGLTF('/models/sun/sun.gltf')
  
  React.useEffect(() => {
    if (sunGroupRef.current && onLoad) {
      onLoad(sunGroupRef.current)
    }
  }, [onLoad])
  
  // 如果載入失敗，顯示錯誤並使用fallback
  if (error) {
    console.warn('太陽GLTF模型載入失敗，使用高品質幾何體替代:', error)
    return (
      <group ref={sunGroupRef} position={position}>
        <mesh castShadow={false} receiveShadow={false}>
          <sphereGeometry args={[15, 64, 64]} />
          <meshStandardMaterial
            color="#FFD700"
            emissive="#FFA500"
            emissiveIntensity={0.8}
            roughness={0.1}
            metalness={0.0}
          />
        </mesh>
      </group>
    )
  }
  
  // 設置GLTF太陽模型屬性
  React.useEffect(() => {
    if (scene && !modelLoaded) {
      console.log('☀️ 太陽3D模型載入成功！')
      
      // 適當縮放太陽
      scene.scale.setScalar(2.0) // 調整大小
      
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = false
          child.receiveShadow = false
          
          // 優化太陽材質
          if (child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material]
            materials.forEach(material => {
              if (material instanceof THREE.MeshStandardMaterial) {
                // 真實太陽顏色和質感
                material.color = new THREE.Color('#FFD700') // 金黃色太陽
                material.emissive = new THREE.Color('#FFA500') // 橙色發光
                material.emissiveIntensity = 1.0
                material.roughness = 0.2 // 太陽表面較光滑
                material.metalness = 0.0
                material.needsUpdate = true
              } else if (material instanceof THREE.MeshLambertMaterial) {
                // 轉換為StandardMaterial獲得更好效果
                const newMaterial = new THREE.MeshStandardMaterial({
                  color: '#FFD700',
                  emissive: '#FFA500',
                  emissiveIntensity: 1.0,
                  roughness: 0.2,
                  metalness: 0.0
                })
                child.material = newMaterial
              }
            })
          }
        }
      })
      
      setModelLoaded(true)
    }
  }, [scene, modelLoaded])
  
  if (!scene) return null
  
  return (
    <group ref={sunGroupRef} position={position}>
      <primitive object={scene.clone()} />
    </group>
  )
}

export const Sun = () => {
  const sunGroupRef = useRef<THREE.Group>(null)
  const { timeOfDay, hour, minute } = useTimeStore()
  
  // 計算太陽隨時間的位置（與EnvironmentLighting相同邏輯）
  const calculateSunPosition = React.useCallback((currentHour: number, currentMinute: number): [number, number, number] => {
    const preciseHour = currentHour + currentMinute / 60
    
    let dayProgress = 0
    
    if (preciseHour >= 6 && preciseHour <= 18) {
      dayProgress = (preciseHour - 6) / 12
    } else {
      dayProgress = preciseHour < 6 ? 0 : 1
    }
    
    // 太陽軌道參數
    const orbitRadius = 300
    const orbitHeight = 450
    const orbitDepth = 100
    
    const angle = dayProgress * Math.PI
    
    // 計算位置 - 正午時太陽位於天頂正中央
    const x = 0
    const y = orbitHeight + orbitRadius * Math.sin(angle) * 0.8
    const z = 0
    
    return [x, y, z]
  }, [])
  
  // 獲取當前太陽位置
  const sunPosition = calculateSunPosition(hour, minute)
  
  // 調試：輸出太陽軌道資訊
  React.useEffect(() => {
    if (timeOfDay === 'day') {
      const preciseHour = hour + minute / 60
      let dayProgress = 0
      
      if (preciseHour >= 6 && preciseHour <= 18) {
        dayProgress = (preciseHour - 6) / 12
      }
      
      console.log(`☀️ 太陽3D模型位置 - 時間: ${hour}:${minute.toString().padStart(2, '0')}, 軌道進度: ${(dayProgress * 100).toFixed(1)}%, 位置: [${sunPosition.map(p => p.toFixed(1)).join(', ')}]`)
    }
  }, [hour, minute, sunPosition, timeOfDay])
  
  // 太陽動畫：自轉和光線脈動
  useFrame((state) => {
    if (sunGroupRef.current && timeOfDay === 'day') {
      const time = state.clock.elapsedTime
      
      // 太陽自轉
      sunGroupRef.current.rotation.y = time * 0.1
      
      // 更新位置（跟隨時間）
      const [baseX, baseY, baseZ] = sunPosition
      sunGroupRef.current.position.x = baseX
      sunGroupRef.current.position.y = baseY
      sunGroupRef.current.position.z = baseZ
      
      // 光線脈動效果
      sunGroupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          const glowIntensity = 0.8 + Math.sin(time * 0.5) * 0.2
          child.material.emissiveIntensity = glowIntensity
        } else if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
          const opacity = child.material.opacity
          if (opacity > 0.05) {
            child.material.opacity = opacity * (1 + Math.sin(time * 0.8) * 0.1)
          }
        }
      })
    }
  })
  
  const handleSunModelLoad = React.useCallback((ref: THREE.Group) => {
    sunGroupRef.current = ref
  }, [])
  
  // 只在白天顯示太陽
  const isDay = timeOfDay === 'day'
  
  return (
    <Suspense fallback={null}>
      {isDay && (
        <group>
          {/* 3D太陽模型 */}
          <SunModel 
            position={sunPosition} 
            onLoad={handleSunModelLoad}
          />
          
          {/* 跟隨太陽的光線系統 */}
          <pointLight
            position={sunPosition}
            color="#FFFF00"
            intensity={1.5}
            distance={800}
            decay={1.0}
            castShadow={false}
          />
          
          {/* 額外的溫暖陽光 */}
          <pointLight
            position={[sunPosition[0] + 30, sunPosition[1] - 20, sunPosition[2] + 20]}
            color="#FFA500"
            intensity={0.8}
            distance={600}
            decay={1.2}
            castShadow={false}
          />
          
          {/* 跟隨太陽移動的光粒子 */}
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * Math.PI * 2
            const radius = 35 + Math.sin(i * 3) * 8
            const x = sunPosition[0] + Math.cos(angle) * radius
            const y = sunPosition[1] + Math.sin(angle * 0.4) * 6
            const z = sunPosition[2] + Math.sin(angle) * radius * 0.6
            
            return (
              <mesh
                key={i}
                position={[x, y, z]}
                castShadow={false}
                receiveShadow={false}
              >
                <sphereGeometry args={[1.2, 8, 8]} />
                <meshBasicMaterial
                  color="#FFFF88"
                  transparent
                  opacity={0.6 + Math.sin(i * 2) * 0.3}
                />
              </mesh>
            )
          })}
        </group>
      )}
    </Suspense>
  )
}

// 預載入太陽模型
useGLTF.preload('/models/sun/sun.gltf')