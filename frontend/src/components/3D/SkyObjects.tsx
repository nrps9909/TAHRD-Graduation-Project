import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTimeStore } from '@/stores/timeStore'

// 太陽組件
export const Sun = ({ position }: { position: [number, number, number] }) => {
  const sunRef = useRef<THREE.Mesh>(null)
  const { timeOfDay } = useTimeStore()
  
  // 太陽材質
  const sunMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: '#FFF700',
      transparent: true,
      opacity: timeOfDay === 'night' ? 0 : 0.9
    })
  }, [timeOfDay])

  useFrame((state) => {
    if (sunRef.current) {
      // 太陽閃爍效果
      const time = state.clock.elapsedTime
      sunRef.current.material.opacity = timeOfDay === 'night' ? 0 : 0.8 + Math.sin(time * 2) * 0.1
      
      // 太陽緩慢自轉
      sunRef.current.rotation.z += 0.01
    }
  })

  if (timeOfDay === 'night') return null

  return (
    <mesh ref={sunRef} position={position}>
      <sphereGeometry args={[8, 16, 16]} />
      <primitive object={sunMaterial} />
      
      {/* 太陽光暈效果 */}
      <mesh position={[0, 0, -0.1]}>
        <ringGeometry args={[10, 15, 16]} />
        <meshBasicMaterial 
          color="#FFFF00" 
          transparent 
          opacity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
    </mesh>
  )
}

// 月亮組件
export const Moon = ({ position }: { position: [number, number, number] }) => {
  const moonRef = useRef<THREE.Mesh>(null)
  const { timeOfDay, hour } = useTimeStore()
  
  // 月亮材質
  const moonMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: '#E6E6FA',
      transparent: true,
      opacity: timeOfDay === 'night' ? 0.9 : 0
    })
  }, [timeOfDay])

  useFrame((state) => {
    if (moonRef.current) {
      // 月亮在夜晚時輕微搖擺
      const time = state.clock.elapsedTime
      if (timeOfDay === 'night') {
        moonRef.current.position.y = position[1] + Math.sin(time * 0.5) * 0.5
        moonRef.current.position.x = position[0] + Math.cos(time * 0.3) * 0.3
      }
    }
  })

  // 根據時間調整月亮可見度
  const getOpacity = () => {
    if (hour >= 20 || hour <= 6) return 0.9  // 夜晚時間
    if (hour >= 18 || hour <= 8) return 0.3  // 黃昏/黎明時微弱可見
    return 0
  }

  return (
    <mesh ref={moonRef} position={position}>
      <sphereGeometry args={[6, 16, 16]} />
      <meshBasicMaterial 
        color="#E6E6FA" 
        transparent 
        opacity={getOpacity()}
      />
      
      {/* 月光光環 */}
      {timeOfDay === 'night' && (
        <mesh position={[0, 0, -0.1]}>
          <ringGeometry args={[8, 12, 16]} />
          <meshBasicMaterial 
            color="#B0C4DE" 
            transparent 
            opacity={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </mesh>
  )
}

// 星星系統
export const Stars = () => {
  const starsRef = useRef<THREE.Points>(null)
  const { timeOfDay, hour } = useTimeStore()
  
  // 創建星星幾何體
  const starsGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(2000 * 3) // 2000顆星星
    const colors = new Float32Array(2000 * 3)
    
    for (let i = 0; i < 2000; i++) {
      const i3 = i * 3
      
      // 在天球上隨機分布星星
      const radius = 400
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i3 + 1] = Math.abs(radius * Math.cos(phi)) // 只在天空上方
      positions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
      
      // 星星顏色：白色到淡藍色
      const colorVariation = Math.random()
      colors[i3] = 0.8 + colorVariation * 0.2     // R
      colors[i3 + 1] = 0.8 + colorVariation * 0.2 // G  
      colors[i3 + 2] = 0.9 + colorVariation * 0.1 // B
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    
    return geometry
  }, [])
  
  // 星星材質
  const starsMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      size: 0.8, // 大幅減小星星尺寸
      transparent: true,
      vertexColors: true,
      opacity: 0,
      sizeAttenuation: true // 啟用距離衰減
    })
  }, [])

  useFrame((state) => {
    if (starsRef.current) {
      // 星星閃爍效果
      const time = state.clock.elapsedTime
      const baseOpacity = getStarsOpacity()
      starsRef.current.material.opacity = baseOpacity + Math.sin(time * 3) * 0.1
      
      // 緩慢旋轉星空
      starsRef.current.rotation.y += 0.0002
    }
  })

  // 根據時間計算星星透明度
  const getStarsOpacity = () => {
    if (hour >= 21 || hour <= 5) return 0.6  // 深夜時適中亮度（降低）
    if (hour >= 19 || hour <= 7) return 0.3  // 黃昏/黎明時更透明
    return 0 // 白天不可見
  }

  return (
    <points ref={starsRef} geometry={starsGeometry} material={starsMaterial} />
  )
}

// 雲朵組件
export const SkyCloud = ({ 
  position, 
  scale = 1, 
  opacity = 0.8 
}: { 
  position: [number, number, number], 
  scale?: number,
  opacity?: number 
}) => {
  const cloudRef = useRef<THREE.Group>(null)
  
  useFrame((state) => {
    if (cloudRef.current) {
      const time = state.clock.elapsedTime
      // 雲朵緩慢飄動
      cloudRef.current.position.x = position[0] + Math.sin(time * 0.1) * 2
      cloudRef.current.position.z = position[2] + Math.cos(time * 0.15) * 1.5
    }
  })

  return (
    <group ref={cloudRef} position={position} scale={scale}>
      {/* 多個球體組成雲朵 */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[3, 8, 6]} />
        <meshLambertMaterial color="#ffffff" transparent opacity={opacity} />
      </mesh>
      <mesh position={[4, 0, 1]}>
        <sphereGeometry args={[2.5, 8, 6]} />
        <meshLambertMaterial color="#ffffff" transparent opacity={opacity} />
      </mesh>
      <mesh position={[-3, 0, -1]}>
        <sphereGeometry args={[2.8, 8, 6]} />
        <meshLambertMaterial color="#ffffff" transparent opacity={opacity} />
      </mesh>
      <mesh position={[2, 1, -2]}>
        <sphereGeometry args={[2.2, 8, 6]} />
        <meshLambertMaterial color="#ffffff" transparent opacity={opacity} />
      </mesh>
      <mesh position={[-1, 1, 2]}>
        <sphereGeometry args={[2.6, 8, 6]} />
        <meshLambertMaterial color="#ffffff" transparent opacity={opacity} />
      </mesh>
    </group>
  )
}

// 主天空物件組件
export const SkyObjects = () => {
  const { timeOfDay, hour } = useTimeStore()
  
  // 根據時間計算太陽和月亮位置
  const getSunPosition = (): [number, number, number] => {
    const angle = (hour / 24) * Math.PI * 2 - Math.PI / 2 // 從東方升起
    const radius = 200
    return [
      Math.cos(angle) * radius,
      Math.sin(angle) * radius + 50,
      -50
    ]
  }
  
  const getMoonPosition = (): [number, number, number] => {
    const angle = ((hour + 12) % 24 / 24) * Math.PI * 2 - Math.PI / 2 // 與太陽相對
    const radius = 180
    return [
      Math.cos(angle) * radius,
      Math.sin(angle) * radius + 60,
      30
    ]
  }

  return (
    <group>
      {/* 星星 */}
      <Stars />
      
      {/* 太陽 */}
      <Sun position={getSunPosition()} />
      
      {/* 月亮 */}
      <Moon position={getMoonPosition()} />
      
      {/* 白天的雲朵 */}
      {(timeOfDay !== 'night') && (
        <>
          <SkyCloud position={[80, 120, -100]} scale={1.2} opacity={0.7} />
          <SkyCloud position={[-120, 100, 80]} scale={1.0} opacity={0.6} />
          <SkyCloud position={[150, 110, 50]} scale={0.8} opacity={0.8} />
          <SkyCloud position={[-80, 130, -60]} scale={1.1} opacity={0.5} />
          <SkyCloud position={[60, 140, 120]} scale={0.9} opacity={0.7} />
        </>
      )}
      
      {/* 夜晚的薄雲 - 更透明 */}
      {timeOfDay === 'night' && (
        <>
          <SkyCloud position={[100, 80, -80]} scale={1.5} opacity={0.1} />
          <SkyCloud position={[-100, 90, 100]} scale={1.3} opacity={0.08} />
        </>
      )}
    </group>
  )
}