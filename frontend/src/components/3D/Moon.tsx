import React, { useRef, useMemo, Suspense } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useTimeStore } from '@/stores/timeStore'
import { markWalkable } from '@/game/physics/layers'

// 真實月球3D模型組件
const MoonModel = ({ position, onLoad }: { position: [number, number, number], onLoad: (ref: THREE.Group) => void }) => {
  const moonGroupRef = useRef<THREE.Group>(null)
  const [modelLoaded, setModelLoaded] = React.useState(false)
  
  // 載入GLTF月球模型
  const { scene, error } = useGLTF('/moon_2/scene.gltf')
  
  React.useEffect(() => {
    if (moonGroupRef.current && onLoad) {
      onLoad(moonGroupRef.current)
    }
  }, [onLoad])
  
  // 如果載入失敗，顯示錯誤並使用更真實的月球替代
  if (error) {
    console.warn('月球GLTF模型載入失敗，使用高品質月球替代:', error)
    return (
      <group ref={moonGroupRef} position={position}>
        {/* 主要月球球體 - 恢復原本的材質 */}
        <mesh castShadow={false} receiveShadow={false}>
          <sphereGeometry args={[12, 64, 64]} />
          <meshStandardMaterial
            color="#E6E6FA"                    // 淡紫白色
            emissive="#B0C4DE"                 // 淺藍灰發光
            emissiveIntensity={0.3}            // 適度發光強度
            roughness={0.8}                    // 適度粗糙度
            metalness={0.0}                    // 完全非金屬
            bumpScale={0.03}                   // 輕微凹凸效果
          />
        </mesh>
        
        {/* 簡化的月球表面細節 */}
        {Array.from({ length: 8 }).map((_, i) => {
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
                color="#D0D0D0"
                transparent
                opacity={0.6}
                roughness={0.9}
                emissive="#000000"
              />
            </mesh>
          )
        })}
        
        
      </group>
    )
  }
  
  // 設置GLTF月球模型屬性
  React.useEffect(() => {
    if (scene && !modelLoaded) {
      console.log('🌙 新月球3D模型載入成功！')

      // 縮放新月球模型 - 調整為適合的大小
      scene.scale.setScalar(15) // 增大模型以匹配原來的月球大小

      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = false
          child.receiveShadow = false
          // 確保月球不是可行走層
          markWalkable(child, false)
          
          // 優化新月球材質
          if (child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material]
            materials.forEach(material => {
              if (material instanceof THREE.MeshStandardMaterial) {
                // 保持原有紋理但調整發光效果
                material.emissive = new THREE.Color('#B0C4DE') // 淺藍灰發光
                material.emissiveIntensity = 0.25 // 適度發光強度
                // 保持原有的roughness和metalness
                material.needsUpdate = true
                
                console.log('🌙 月球材質已更新:', material.name)
              } else if (material instanceof THREE.MeshLambertMaterial) {
                // 轉換為StandardMaterial獲得更好效果
                const newMaterial = new THREE.MeshStandardMaterial({
                  map: material.map, // 保留原有紋理
                  emissive: '#B0C4DE',
                  emissiveIntensity: 0.25,
                  roughness: 0.8,
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
  const directionalLightRef = useRef<THREE.DirectionalLight>(null)
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
  

  // 設置方向光目標和陰影相機
  React.useEffect(() => {
    if (directionalLightRef.current) {
      directionalLightRef.current.target.position.set(0, 0, 0)
      directionalLightRef.current.target.updateMatrixWorld()
      
      // 確保陰影相機設置正確
      const light = directionalLightRef.current
      if (light.shadow) {
        console.log('🌙 設置月亮陰影相機參數')
        light.shadow.camera.left = -600
        light.shadow.camera.right = 600
        light.shadow.camera.top = 600
        light.shadow.camera.bottom = -600
        light.shadow.camera.near = 1
        light.shadow.camera.far = 500
        light.shadow.bias = 0.003
        light.shadow.normalBias = 0.05
        light.shadow.mapSize.setScalar(2048)
        light.shadow.camera.updateProjectionMatrix()
        console.log('✅ 月亮陰影相機設置完成')
      }
    }
  }, [])

  // 月亮動畫：簡單的自轉和擺動
  useFrame((state) => {
    if (moonGroupRef.current && timeOfDay === 'night') {
      const time = state.clock.elapsedTime
      
      // 月球在夜晚時輕微搖擺
      moonGroupRef.current.position.y = moonPosition[1] + Math.sin(time * 0.5) * 0.5
      moonGroupRef.current.position.x = moonPosition[0] + Math.cos(time * 0.3) * 0.3
      moonGroupRef.current.position.z = moonPosition[2]
      
      // 月亮閃爍效果
      moonGroupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          child.material.emissiveIntensity = 0.3 + Math.sin(time * 2) * 0.05
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
          
          

          {/* 主要月光 - 方向光投射陰影 */}
          <directionalLight
            ref={directionalLightRef}
            position={[moonPosition[0], moonPosition[1], moonPosition[2]]}
            color="#E6F3FF"
            intensity={1.2}
            castShadow
            shadow-mapSize={2048}
            shadow-camera-far={800}
            shadow-camera-left={-600}
            shadow-camera-right={600}
            shadow-camera-top={600}
            shadow-camera-bottom={-600}
            shadow-camera-near={0.5}
            shadow-bias={0.003}
            shadow-normalBias={0.05}
          />
          
          {/* 月光環境光 */}
          <pointLight
            position={moonPosition}
            color="#D0E8FF"
            intensity={0.6}
            distance={400}
            decay={1.8}
            castShadow={false}
          />

          {/* 月光光斑投影到地面 - 計算投影位置 */}
          <mesh
            position={[
              -moonPosition[0] * 0.3, // 根據月亮位置計算光斑投影
              1,
              -moonPosition[2] * 0.3
            ]}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow={false}
            castShadow={false}
          >
            <planeGeometry args={[80, 80]} />
            <meshBasicMaterial
              color="#B8D4FF"
              transparent
              opacity={0.2}
              blending={2}
              depthWrite={false}
            />
          </mesh>

          {/* 更集中的月光光斑 - 跟隨月亮投影 */}
          <mesh
            position={[
              -moonPosition[0] * 0.2,
              1.1,
              -moonPosition[2] * 0.2
            ]}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow={false}
            castShadow={false}
          >
            <planeGeometry args={[40, 40]} />
            <meshBasicMaterial
              color="#E6F3FF"
              transparent
              opacity={0.15}
              blending={2}
              depthWrite={false}
            />
          </mesh>
          
        </group>
      )}
    </Suspense>
  )
}

// 預載入月球模型
useGLTF.preload('/moon_2/scene.gltf')