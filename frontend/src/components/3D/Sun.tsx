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
  const directionalLightRef = useRef<THREE.DirectionalLight>(null)
  const { timeOfDay, hour, minute, weather } = useTimeStore()
  
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
  
  // 設置方向光目標和陰影相機
  React.useEffect(() => {
    if (directionalLightRef.current) {
      directionalLightRef.current.target.position.set(0, 0, 0)
      directionalLightRef.current.target.updateMatrixWorld()
      
      // 確保陰影相機設置正確
      const light = directionalLightRef.current
      if (light.shadow) {
        console.log('🌞 設置太陽陰影相機參數')
        light.shadow.camera.left = -600
        light.shadow.camera.right = 600
        light.shadow.camera.top = 600
        light.shadow.camera.bottom = -600
        light.shadow.camera.near = 1
        light.shadow.camera.far = 500
        light.shadow.bias = 0.003
        light.shadow.normalBias = 0.05
        light.shadow.mapSize.setScalar(4096)
        light.shadow.camera.updateProjectionMatrix()
        console.log('✅ 太陽陰影相機設置完成')
      }
    }
  }, [])

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
  const shouldShowSun = timeOfDay === 'day'
  
  return (
    <Suspense fallback={null}>
      {shouldShowSun && (
        <group>
          {/* 3D太陽模型 */}
          <SunModel 
            position={sunPosition} 
            onLoad={handleSunModelLoad}
          />
          
          {/* 主要太陽光線 - 方向光投射陰影 */}
          <directionalLight
            ref={directionalLightRef}
            position={sunPosition}
            color="#FFFFFF"
            intensity={3.0}
            castShadow
            shadow-mapSize={4096}
            shadow-camera-far={1000}
            shadow-camera-left={-600}
            shadow-camera-right={600}
            shadow-camera-top={600}
            shadow-camera-bottom={-600}
            shadow-camera-near={1}
            shadow-bias={0.003}
            shadow-normalBias={0.05}
          />
          
          {/* 跟隨太陽的補助光線 */}
          <pointLight
            position={sunPosition}
            color="#FFFF00"
            intensity={0.8}
            distance={600}
            decay={1.2}
            castShadow={false}
          />
          
          {/* 額外的溫暖陽光 */}
          <pointLight
            position={[sunPosition[0] + 30, sunPosition[1] - 20, sunPosition[2] + 20]}
            color="#FFA500"
            intensity={0.6}
            distance={400}
            decay={1.5}
            castShadow={false}
          />
          
          {/* 太陽雪邊緣暖光勾勒系統 - 只在下雪時啟用 */}
          {weather === 'snow' && (
            <>
              {/* 主要邊緣光 - 來自太陽方向 */}
              <directionalLight
                position={[sunPosition[0] + 50, sunPosition[1] + 20, sunPosition[2] + 30]}
                target-position={[0, 0, 0]}
                color="#FFDB99" // 溫暖的金白色邊緣光
                intensity={1.2}
                castShadow={false}
              />
              
              {/* 側向邊緣光 - 增強立體感 */}
              <directionalLight
                position={[-sunPosition[0] * 0.5, sunPosition[1] * 0.8, sunPosition[2] + 80]}
                target-position={[0, 0, 0]}
                color="#FFE4B3" // 淡黃色側光
                intensity={0.8}
                castShadow={false}
              />
              
              {/* 背光邊緣效果 */}
              <directionalLight
                position={[-sunPosition[0], sunPosition[1] * 0.6, -sunPosition[2] * 0.7]}
                target-position={[0, 0, 0]}
                color="#FFF8DC" // 米白色背光
                intensity={0.6}
                castShadow={false}
              />
              
              {/* 溫暖補光點陣 - 創造柔和邊緣光暈 */}
              {Array.from({ length: 4 }).map((_, i) => {
                const angle = (i / 4) * Math.PI * 2
                const radius = 120
                const height = sunPosition[1] * 0.7
                const x = Math.cos(angle) * radius
                const z = Math.sin(angle) * radius
                
                return (
                  <pointLight
                    key={`rim-${i}`}
                    position={[x, height, z]}
                    color="#FFEAA7" // 溫潤的暖光色
                    intensity={0.4}
                    distance={200}
                    decay={2}
                    castShadow={false}
                  />
                )
              })}
            </>
          )}
          
          {/* 太陽光斑投影到地面 - 計算投影位置 */}
          <mesh
            position={[
              -sunPosition[0] * 0.3, // 根據太陽位置計算光斑投影
              1,
              -sunPosition[2] * 0.3
            ]}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow={false}
            castShadow={false}
          >
            <planeGeometry args={[100, 100]} />
            <meshBasicMaterial
              color="#FFFF88"
              transparent
              opacity={0.4}
              blending={2}
              depthWrite={false}
            />
          </mesh>

          {/* 更集中的太陽光斑 - 跟隨太陽投影 */}
          <mesh
            position={[
              -sunPosition[0] * 0.2,
              1.1,
              -sunPosition[2] * 0.2
            ]}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow={false}
            castShadow={false}
          >
            <planeGeometry args={[50, 50]} />
            <meshBasicMaterial
              color="#FFDD44"
              transparent
              opacity={0.3}
              blending={2}
              depthWrite={false}
            />
          </mesh>

          {/* 跟隨太陽移動的光粒子 */}
          {Array.from({ length: 6 }).map((_, i) => {
            const angle = (i / 6) * Math.PI * 2
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
                  opacity={0.4 + Math.sin(i * 2) * 0.2}
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