import React, { useRef, useMemo, Suspense } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useTimeStore } from '@/stores/timeStore'

// 真實月球3D模型組件
const MoonModel = ({ position, onLoad }: { position: [number, number, number], onLoad: (ref: THREE.Group) => void }) => {
  const moonGroupRef = useRef<THREE.Group>(null)
  const [modelLoaded, setModelLoaded] = React.useState(false)
  
  // 載入GLTF月球模型
  const { scene, error } = useGLTF('/models/moon/moon.gltf')
  
  React.useEffect(() => {
    if (moonGroupRef.current && onLoad) {
      onLoad(moonGroupRef.current)
    }
  }, [onLoad])
  
  // 如果載入失敗，顯示錯誤並使用fallback
  if (error) {
    console.warn('月球GLTF模型載入失敗，使用高品質幾何體替代:', error)
    return (
      <group ref={moonGroupRef} position={position}>
        <mesh castShadow={false} receiveShadow={false}>
          <sphereGeometry args={[12, 128, 128]} />
          <meshStandardMaterial
            color="#E8E8E8"
            emissive="#C0C8D0"
            emissiveIntensity={0.4}
            roughness={0.8}
            metalness={0.0}
          />
        </mesh>
      </group>
    )
  }
  
  // 設置GLTF月球模型屬性
  React.useEffect(() => {
    if (scene && !modelLoaded) {
      console.log('🌙 月球3D模型載入成功！')
      
      // 適當縮放月球
      scene.scale.setScalar(1.2) // 調整大小
      
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = false
          child.receiveShadow = false
          
          // 優化月球材質
          if (child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material]
            materials.forEach(material => {
              if (material instanceof THREE.MeshStandardMaterial) {
                // 真實月球顏色和質感
                material.color = new THREE.Color('#F0F0F0') // 稍微更亮的月球色
                material.emissive = new THREE.Color('#C8D0E0') // 真實月光發光
                material.emissiveIntensity = 0.3
                material.roughness = 0.9 // 月球表面粗糙
                material.metalness = 0.0
                material.needsUpdate = true
              } else if (material instanceof THREE.MeshLambertMaterial) {
                // 轉換為StandardMaterial獲得更好效果
                const newMaterial = new THREE.MeshStandardMaterial({
                  color: '#F0F0F0',
                  emissive: '#C8D0E0',
                  emissiveIntensity: 0.3,
                  roughness: 0.9,
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
    <group ref={moonGroupRef} position={position}>
      <primitive object={scene.clone()} />
    </group>
  )
}

export const Moon = () => {
  const moonGroupRef = useRef<THREE.Group>(null)
  const { timeOfDay, hour, minute } = useTimeStore()
  
  // 計算月亮隨時間的位置
  const calculateMoonPosition = React.useCallback((currentHour: number, currentMinute: number): [number, number, number] => {
    // 將時間轉換為精確的小時數（包含分鐘）
    const preciseHour = currentHour + currentMinute / 60
    
    // 夜晚時間範圍 18:00-6:00 (跨越午夜)
    let nightProgress = 0
    
    if (preciseHour >= 18) {
      // 18:00-24:00 的部分
      nightProgress = (preciseHour - 18) / 12 // 18點開始，12小時夜晚
    } else if (preciseHour <= 6) {
      // 0:00-6:00 的部分  
      nightProgress = (preciseHour + 6) / 12 // 繼續前一晚的進度
    } else {
      // 白天時間，不應該顯示月亮，但以防萬一
      nightProgress = 0
    }
    
    // 月亮軌道參數
    const orbitRadius = 300 // 軌道半徑
    const orbitHeight = 180 // 軌道高度基準
    const orbitDepth = 100   // 軌道深度變化
    
    // 月亮沿弧形軌道移動 (從東到西)
    const angle = nightProgress * Math.PI // 0 到 π 的弧度
    
    // 計算位置
    const x = orbitRadius * Math.cos(angle) // 東(-) -> 西(+)
    const y = orbitHeight + orbitRadius * Math.sin(angle) * 0.6 // 弧形高度
    const z = -orbitDepth + orbitDepth * 0.5 * Math.sin(angle) // 深度變化
    
    return [x, y, z]
  }, [])
  
  // 獲取當前月亮位置
  const moonPosition = calculateMoonPosition(hour, minute)
  
  // 調試：輸出月亮軌道資訊 (可移除)
  React.useEffect(() => {
    if (timeOfDay === 'night') {
      const preciseHour = hour + minute / 60
      let nightProgress = 0
      
      if (preciseHour >= 18) {
        nightProgress = (preciseHour - 18) / 12
      } else if (preciseHour <= 6) {
        nightProgress = (preciseHour + 6) / 12
      }
      
      console.log(`🌙 月亮位置 - 時間: ${hour}:${minute.toString().padStart(2, '0')}, 軌道進度: ${(nightProgress * 100).toFixed(1)}%, 位置: [${moonPosition.map(p => p.toFixed(1)).join(', ')}]`)
    }
  }, [hour, minute, moonPosition, timeOfDay])
  
  // 月亮動畫：自轉和細微擾動
  useFrame((state) => {
    if (moonGroupRef.current && timeOfDay === 'night') {
      const time = state.clock.elapsedTime
      
      // 緩慢的月球自轉 - 真實效果
      moonGroupRef.current.rotation.y = time * 0.02
      
      // 極細微的位置擾動 - 模擬大氣擾動
      const [baseX, baseY, baseZ] = moonPosition
      moonGroupRef.current.position.x = baseX + Math.cos(time * 0.15) * 0.3
      moonGroupRef.current.position.y = baseY + Math.sin(time * 0.2) * 0.5
      moonGroupRef.current.position.z = baseZ + Math.sin(time * 0.1) * 0.2
      
      // 更新子組件的發光效果
      moonGroupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          const glowIntensity = 0.4 + Math.sin(time * 0.3) * 0.1
          child.material.emissiveIntensity = glowIntensity
        }
      })
    }
  })
  
  const handleMoonModelLoad = React.useCallback((ref: THREE.Group) => {
    moonGroupRef.current = ref
  }, [])
  
  // 只在夜晚顯示月亮 - 使用條件渲染而不是早期返回
  const isNight = timeOfDay === 'night'
  
  return (
    <Suspense fallback={null}>
      {isNight && (
        <group>
          {/* 真實3D月球模型 */}
          <MoonModel 
            position={moonPosition} 
            onLoad={handleMoonModelLoad}
          />
          
          {/* 跟隨月亮的光照系統 */}
          <pointLight
            position={moonPosition}
            color="#C8D0E0" // 真實月光顏色
            intensity={0.8}
            distance={500}
            decay={1.2}
            castShadow={false}
          />
          
          {/* 額外的環境月光 - 稍微偏移以增加深度感 */}
          <pointLight
            position={[moonPosition[0] + 20, moonPosition[1] - 10, moonPosition[2] + 15]}
            color="#B0C0D0"
            intensity={0.4}
            distance={400}
            decay={1.5}
            castShadow={false}
          />
          
          {/* 跟隨月亮移動的星點 */}
          {Array.from({ length: 6 }).map((_, i) => {
            const angle = (i / 6) * Math.PI * 2 + Math.PI / 6
            const radius = 45 + Math.sin(i * 2) * 10
            const x = moonPosition[0] + Math.cos(angle) * radius
            const y = moonPosition[1] + Math.sin(angle * 0.3) * 8
            const z = moonPosition[2] + Math.sin(angle) * radius * 0.8
            
            return (
              <mesh
                key={i}
                position={[x, y, z]}
                castShadow={false}
                receiveShadow={false}
              >
                <sphereGeometry args={[0.8, 8, 8]} />
                <meshBasicMaterial
                  color="#F5F5F5"
                  transparent
                  opacity={0.7 + Math.sin(i) * 0.2}
                />
              </mesh>
            )
          })}
        </group>
      )}
    </Suspense>
  )
}

// 預載入月球模型
useGLTF.preload('/models/moon/moon.gltf')