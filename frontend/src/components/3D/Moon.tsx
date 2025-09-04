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
  
  // 如果載入失敗，顯示錯誤並使用fallback - 加強月球特徵
  if (error) {
    console.warn('月球GLTF模型載入失敗，使用高品質幾何體替代:', error)
    return (
      <group ref={moonGroupRef} position={position}>
        {/* 主要月球球體 */}
        <mesh castShadow={false} receiveShadow={false}>
          <sphereGeometry args={[12, 64, 64]} />
          <meshStandardMaterial
            color="#E8E8E8"
            emissive="#C0C8D0"
            emissiveIntensity={0.25}
            roughness={0.95}
            metalness={0.0}
            bumpScale={0.03}
          />
        </mesh>
        
        {/* 月球環形山效果 - 增加更多陰影細節 */}
        {Array.from({ length: 18 }).map((_, i) => {
          const theta = Math.random() * Math.PI * 2
          const phi = Math.random() * Math.PI
          const radius = 12.05 + Math.random() * 0.1
          const x = radius * Math.sin(phi) * Math.cos(theta)
          const y = radius * Math.cos(phi)
          const z = radius * Math.sin(phi) * Math.sin(theta)
          
          return (
            <mesh
              key={`crater-${i}`}
              position={[x, y, z]}
              scale={[0.4 + Math.random() * 0.6, 0.08 + Math.random() * 0.15, 0.4 + Math.random() * 0.6]}
              castShadow={false}
              receiveShadow={false}
            >
              <sphereGeometry args={[0.6 + Math.random() * 0.4, 8, 8]} />
              <meshStandardMaterial
                color={`#${Math.floor(160 + Math.random() * 40).toString(16)}${Math.floor(160 + Math.random() * 40).toString(16)}${Math.floor(160 + Math.random() * 40).toString(16)}`}
                transparent
                opacity={0.4 + Math.random() * 0.4}
                roughness={1.0}
                emissive={"#000000"}
              />
            </mesh>
          )
        })}
        
        {/* 添加更深的陰影區域 */}
        {Array.from({ length: 8 }).map((_, i) => {
          const theta = (i / 8) * Math.PI * 2 + Math.PI / 4
          const phi = Math.PI / 3 + Math.random() * Math.PI / 6
          const radius = 12.02
          const x = radius * Math.sin(phi) * Math.cos(theta)
          const y = radius * Math.cos(phi)
          const z = radius * Math.sin(phi) * Math.sin(theta)
          
          return (
            <mesh
              key={`shadow-${i}`}
              position={[x, y, z]}
              scale={[0.8 + Math.random() * 0.4, 0.05, 0.8 + Math.random() * 0.4]}
              castShadow={false}
              receiveShadow={false}
            >
              <sphereGeometry args={[1.2, 12, 12]} />
              <meshStandardMaterial
                color="#808080"
                transparent
                opacity={0.6}
                roughness={1.0}
                emissive={"#000000"}
              />
            </mesh>
          )
        })}
        
        {/* 月球亮面邊緣光暈 */}
        <mesh castShadow={false} receiveShadow={false}>
          <sphereGeometry args={[12.5, 32, 32]} />
          <meshBasicMaterial
            color="#E8F0FF"
            transparent
            opacity={0.15}
            side={THREE.BackSide}
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
                material.color = new THREE.Color('#E0E0E0') // 稍微減低亮度以強化陰影
                material.emissive = new THREE.Color('#B0B8C8') // 減低發光強化陰影對比
                material.emissiveIntensity = 0.2 // 降低發光強度增加陰影對比
                material.roughness = 0.95 // 增加表面粗糙度強化陰影
                material.metalness = 0.0
                material.needsUpdate = true
              } else if (material instanceof THREE.MeshLambertMaterial) {
                // 轉換為StandardMaterial獲得更好效果
                const newMaterial = new THREE.MeshStandardMaterial({
                  color: '#E0E0E0',
                  emissive: '#B0B8C8',
                  emissiveIntensity: 0.2,
                  roughness: 0.95,
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
  
  // 計算月相 (0-1, 0=新月, 0.5=滿月, 1=新月)
  const getMoonPhase = React.useCallback((hour: number, minute: number): number => {
    // 模擬28天月相週期，基於遊戲時間
    const totalMinutes = hour * 60 + minute
    const dayProgress = totalMinutes / (24 * 60) // 0-1的一天進度
    // 假設7天完成一個月相週期（加速版）
    const moonCycle = (dayProgress * 7) % 1
    return moonCycle
  }, [])

  // 獲取當前月亮位置
  const moonPosition = calculateMoonPosition(hour, minute)
  
  // 調試：輸出月亮軌道和月相資訊
  React.useEffect(() => {
    if (timeOfDay === 'night') {
      const preciseHour = hour + minute / 60
      let nightProgress = 0
      
      if (preciseHour >= 18) {
        nightProgress = (preciseHour - 18) / 12
      } else if (preciseHour <= 6) {
        nightProgress = (preciseHour + 6) / 12
      }
      
      const moonPhase = getMoonPhase(hour, minute)
      const phaseNames = ['🌑新月', '🌒殘月', '🌓上弦', '🌔盈凸', '🌕滿月', '🌖虧凸', '🌗下弦', '🌘殘月']
      const phaseIndex = Math.floor(moonPhase * 8) % 8
      const phaseName = phaseNames[phaseIndex]
      
      console.log(`🌙 月亮狀態 - 時間: ${hour}:${minute.toString().padStart(2, '0')}, 軌道: ${(nightProgress * 100).toFixed(1)}%, 月相: ${phaseName} (${(moonPhase * 100).toFixed(1)}%), 位置: [${moonPosition.map(p => p.toFixed(1)).join(', ')}]`)
    }
  }, [hour, minute, moonPosition, timeOfDay, getMoonPhase])

  // 月亮動畫：自轉、擺動和月相效果
  useFrame((state) => {
    if (moonGroupRef.current && timeOfDay === 'night') {
      const time = state.clock.elapsedTime
      const moonPhase = getMoonPhase(hour, minute)
      
      // 非常緩慢的月球自轉 - 模擬真實月球自轉（約27天一周）
      moonGroupRef.current.rotation.y = time * 0.008
      
      // 月球天秤動 - 輕微的前後搖擺（真實月球現象）
      moonGroupRef.current.rotation.z = Math.sin(time * 0.05) * 0.02
      moonGroupRef.current.rotation.x = Math.cos(time * 0.07) * 0.015
      
      // 極細微的軌道擾動 - 模擬月球橢圓軌道
      const [baseX, baseY, baseZ] = moonPosition
      const orbitVariation = Math.sin(time * 0.03) * 2 // 軌道距離微調
      moonGroupRef.current.position.x = baseX + Math.cos(time * 0.12) * 0.8
      moonGroupRef.current.position.y = baseY + Math.sin(time * 0.18) * 0.6
      moonGroupRef.current.position.z = baseZ + orbitVariation
      
      // 月相陰影效果 - 調整發光強度模擬月相
      const phaseIntensity = 0.3 + (Math.sin(moonPhase * Math.PI * 2) * 0.5 + 0.5) * 0.4
      
      // 更新子組件的發光效果
      moonGroupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          const baseGlow = phaseIntensity + Math.sin(time * 0.4) * 0.05
          child.material.emissiveIntensity = Math.max(0.1, baseGlow)
        }
        
        // 月相陰影效果：在某些材質上添加陰影區域
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
          const shadowOpacity = 0.1 + (1 - phaseIntensity) * 0.3
          child.material.opacity = Math.min(1.0, child.material.opacity || 1.0)
        }
      })
      
      // 根據月相調整整體縮放（視覺上的大小變化）
      const scaleVariation = 1.0 + Math.sin(moonPhase * Math.PI) * 0.08
      moonGroupRef.current.scale.setScalar(scaleVariation)
      
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
          
          

          {/* 主要月光 - 強化地面照明 */}
          <pointLight
            position={moonPosition}
            color="#E6F3FF" // 更亮的月光顏色
            intensity={2.0} // 提高強度從0.8到2.0
            distance={600}   // 增加照射距離
            decay={1.0}     // 減少衰減讓光線傳播更遠
            castShadow={false}
          />
          
          {/* 月光地面擴散光 - 多方向照明 */}
          <pointLight
            position={[moonPosition[0], moonPosition[1] - 50, moonPosition[2]]}
            color="#D0E8FF"
            intensity={1.5}
            distance={400}
            decay={1.2}
            castShadow={false}
          />
          
          {/* 額外的環境月光陣列 - 360度覆蓋 */}
          {Array.from({ length: 6 }).map((_, i) => {
            const angle = (i / 6) * Math.PI * 2
            const radius = 60
            const x = moonPosition[0] + Math.cos(angle) * radius
            const z = moonPosition[2] + Math.sin(angle) * radius
            const y = moonPosition[1] - 20
            
            return (
              <pointLight
                key={`moon-ambient-${i}`}
                position={[x, y, z]}
                color="#B8D4FF"
                intensity={0.8}
                distance={300}
                decay={1.3}
                castShadow={false}
              />
            )
          })}
          
          {/* 月光地面反射模擬 */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * Math.PI * 2
            const radius = 80 + (i % 3) * 20
            const x = moonPosition[0] + Math.cos(angle) * radius
            const z = moonPosition[2] + Math.sin(angle) * radius
            const y = 5 + Math.sin(i) * 3 // 接近地面高度
            
            return (
              <pointLight
                key={`moon-ground-${i}`}
                position={[x, y, z]}
                color="#C8E0FF"
                intensity={0.6}
                distance={150}
                decay={1.5}
                castShadow={false}
              />
            )
          })}
          
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