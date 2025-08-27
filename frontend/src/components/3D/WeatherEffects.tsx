import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTimeStore, WEATHER_SETTINGS } from '@/stores/timeStore'

// 雨滴效果
export const RainEffect = ({ intensity = 1 }: { intensity?: number }) => {
  const rainRef = useRef<THREE.Points>(null)
  
  const rainGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(3000 * 3) // 減少到3000個雨滴
    const velocities = new Float32Array(3000 * 3)
    
    for (let i = 0; i < 3000; i++) {
      const i3 = i * 3
      positions[i3] = (Math.random() - 0.5) * 200 // x
      positions[i3 + 1] = Math.random() * 100 + 50 // y
      positions[i3 + 2] = (Math.random() - 0.5) * 200 // z
      
      velocities[i3] = Math.random() * 0.1 - 0.05 // 微小的x速度（風吹效果）
      velocities[i3 + 1] = -Math.random() * 0.3 - 0.2 // 放慢y速度（向下）
      velocities[i3 + 2] = Math.random() * 0.05 - 0.025 // 微小的z速度
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3))
    
    return geometry
  }, [])
  
  const rainMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      color: 0xB0C4DE, // 更柔和的藍色
      size: 0.15, // 大幅減小雨滴大小
      transparent: true,
      opacity: 0.7 * intensity
    })
  }, [intensity])
  
  useFrame(() => {
    if (!rainRef.current) return
    
    const positions = rainRef.current.geometry.attributes.position.array as Float32Array
    const velocities = rainRef.current.geometry.attributes.velocity.array as Float32Array
    
    for (let i = 0; i < positions.length; i += 3) {
      // 更新所有軸的位置
      positions[i] += velocities[i] * intensity * 0.5 // x軸移動（風效果）
      positions[i + 1] += velocities[i + 1] * intensity * 0.3 // 更慢的y軸下降
      positions[i + 2] += velocities[i + 2] * intensity * 0.5 // z軸移動
      
      // 重置到頂部
      if (positions[i + 1] < -10) {
        positions[i + 1] = 100 + Math.random() * 20 // 隨機高度
        positions[i] = (Math.random() - 0.5) * 200
        positions[i + 2] = (Math.random() - 0.5) * 200
      }
      
      // 邊界檢查
      if (Math.abs(positions[i]) > 100) {
        positions[i] = (Math.random() - 0.5) * 200
      }
      if (Math.abs(positions[i + 2]) > 100) {
        positions[i + 2] = (Math.random() - 0.5) * 200
      }
    }
    
    rainRef.current.geometry.attributes.position.needsUpdate = true
  })
  
  if (intensity === 0) return null
  
  return (
    <points ref={rainRef} geometry={rainGeometry} material={rainMaterial} />
  )
}

// 雪花效果
export const SnowEffect = ({ intensity = 1 }: { intensity?: number }) => {
  const snowRef = useRef<THREE.Points>(null)
  
  const snowGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(1500 * 3) // 減少到1500個雪花
    const velocities = new Float32Array(1500 * 3)
    const sizes = new Float32Array(1500) // 添加大小屬性
    
    for (let i = 0; i < 1500; i++) {
      const i3 = i * 3
      positions[i3] = (Math.random() - 0.5) * 200
      positions[i3 + 1] = Math.random() * 100 + 50
      positions[i3 + 2] = (Math.random() - 0.5) * 200
      
      velocities[i3] = (Math.random() - 0.5) * 0.05 // 大幅減小x速度
      velocities[i3 + 1] = -Math.random() * 0.08 - 0.02 // 更緩慢的下降
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.05 // 大幅減小z速度
      
      sizes[i] = Math.random() * 0.3 + 0.1 // 隨機雪花大小 0.1-0.4
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    
    return geometry
  }, [])
  
  const snowMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      color: 0xFFFFFF,
      size: 0.4, // 大幅減小基礎大小
      transparent: true,
      opacity: 0.8 * intensity,
      sizeAttenuation: true // 啟用距離衰減
    })
  }, [intensity])
  
  useFrame((state) => {
    if (!snowRef.current) return
    
    const positions = snowRef.current.geometry.attributes.position.array as Float32Array
    const velocities = snowRef.current.geometry.attributes.velocity.array as Float32Array
    
    for (let i = 0; i < positions.length; i += 3) {
      // 更慢的移動速度
      positions[i] += velocities[i] * intensity * 0.2 // 大幅減慢x軸
      positions[i + 1] += velocities[i + 1] * intensity * 0.15 // 大幅減慢下降
      positions[i + 2] += velocities[i + 2] * intensity * 0.2 // 大幅減慢z軸
      
      // 更輕柔的飄散效果
      const time = state.clock.elapsedTime
      positions[i] += Math.sin(time * 0.3 + i * 0.01) * 0.003 // 減小飄散幅度
      positions[i + 2] += Math.cos(time * 0.2 + i * 0.01) * 0.003
      
      // 重置到頂部
      if (positions[i + 1] < -10) {
        positions[i + 1] = 100 + Math.random() * 30 // 更大的高度範圍
        positions[i] = (Math.random() - 0.5) * 200
        positions[i + 2] = (Math.random() - 0.5) * 200
      }
      
      // 邊界檢查
      if (Math.abs(positions[i]) > 100) {
        positions[i] = (Math.random() - 0.5) * 200
      }
      if (Math.abs(positions[i + 2]) > 100) {
        positions[i + 2] = (Math.random() - 0.5) * 200
      }
    }
    
    snowRef.current.geometry.attributes.position.needsUpdate = true
  })
  
  if (intensity === 0) return null
  
  return (
    <points ref={snowRef} geometry={snowGeometry} material={snowMaterial} />
  )
}

// 霧氣效果
export const FogEffect = ({ intensity = 1 }: { intensity?: number }) => {
  const fogRef = useRef<THREE.Points>(null)
  
  const fogGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(500 * 3) // 500個霧粒子
    const velocities = new Float32Array(500 * 3)
    const sizes = new Float32Array(500)
    
    for (let i = 0; i < 500; i++) {
      const i3 = i * 3
      positions[i3] = (Math.random() - 0.5) * 150     // x
      positions[i3 + 1] = Math.random() * 20 + 2      // y (低空)
      positions[i3 + 2] = (Math.random() - 0.5) * 150 // z
      
      velocities[i3] = (Math.random() - 0.5) * 0.03
      velocities[i3 + 1] = Math.random() * 0.01 + 0.005
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.03
      
      sizes[i] = Math.random() * 0.8 + 0.3
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    
    return geometry
  }, [])
  
  const fogMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      color: 0xCCCCCC, // 灰白色
      size: 1.5,
      transparent: true,
      opacity: 0,
      sizeAttenuation: true
    })
  }, [])
  
  useFrame((state) => {
    if (!fogRef.current) return
    
    const time = state.clock.elapsedTime
    const positions = fogRef.current.geometry.attributes.position.array as Float32Array
    const velocities = fogRef.current.geometry.attributes.velocity.array as Float32Array
    
    // 設置霧氣透明度
    fogRef.current.material.opacity = intensity * 0.4
    
    if (intensity > 0) {
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] += velocities[i] * intensity * 0.3
        positions[i + 1] += velocities[i + 1] * intensity * 0.2
        positions[i + 2] += velocities[i + 2] * intensity * 0.3
        
        // 緩慢飄動
        positions[i] += Math.sin(time * 0.05 + i * 0.01) * 0.02
        positions[i + 2] += Math.cos(time * 0.04 + i * 0.01) * 0.02
        
        // 重置邊界
        if (positions[i + 1] > 25) {
          positions[i + 1] = 2
          positions[i] = (Math.random() - 0.5) * 150
          positions[i + 2] = (Math.random() - 0.5) * 150
        }
        
        if (Math.abs(positions[i]) > 75) {
          positions[i] = (Math.random() - 0.5) * 150
        }
        if (Math.abs(positions[i + 2]) > 75) {
          positions[i + 2] = (Math.random() - 0.5) * 150
        }
      }
      
      fogRef.current.geometry.attributes.position.needsUpdate = true
    }
  })
  
  if (intensity === 0) return null
  
  return (
    <points ref={fogRef} geometry={fogGeometry} material={fogMaterial} />
  )
}

// 暴風雨閃電效果
export const StormEffect = ({ intensity = 1 }: { intensity?: number }) => {
  const lightningRef = useRef<THREE.PointLight>(null)
  const [lightningActive, setLightningActive] = React.useState(false)
  
  useFrame((state) => {
    if (lightningRef.current && intensity > 0) {
      const time = state.clock.elapsedTime
      
      // 隨機閃電效果
      if (Math.random() < 0.005 * intensity) { // 0.5% 機率每幀
        setLightningActive(true)
        setTimeout(() => setLightningActive(false), 100 + Math.random() * 200)
      }
      
      if (lightningActive) {
        lightningRef.current.intensity = 5 + Math.random() * 3
        lightningRef.current.position.x = (Math.random() - 0.5) * 200
        lightningRef.current.position.z = (Math.random() - 0.5) * 200
      } else {
        lightningRef.current.intensity = 0
      }
    }
  })
  
  if (intensity === 0) return null
  
  return (
    <pointLight
      ref={lightningRef}
      color="#FFFFFF"
      intensity={0}
      position={[0, 100, 0]}
      distance={300}
    />
  )
}

// 主天氣效果組件 - 固定夜晚模式不顯示粒子效果
export const WeatherEffects = () => {
  // 固定夜晚模式，不顯示任何天氣粒子效果以保持清潔的夜空
  return null
}