import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTimeStore, WEATHER_SETTINGS } from '@/stores/timeStore'

// 雨滴效果 - 使用線條幾何體創建真實雨滴形狀
export const RainEffect = ({ intensity = 1 }: { intensity?: number }) => {
  const rainRef = useRef<THREE.Group>(null)
  
  const rainDrops = useMemo(() => {
    const drops = []
    const dropCount = 1500 // 減少數量以提高性能
    
    for (let i = 0; i < dropCount; i++) {
      // 創建每個雨滴的線條幾何體
      const geometry = new THREE.BufferGeometry()
      const positions = new Float32Array([
        0, 0, 0,     // 起點
        0, -0.8, 0   // 終點 - 創建向下的線條
      ])
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      
      // 雨滴材質
      const material = new THREE.LineBasicMaterial({
        color: 0xB0C4DE,
        transparent: true,
        opacity: 0.6 * intensity,
        linewidth: 2
      })
      
      const line = new THREE.Line(geometry, material)
      
      // 設置初始位置
      line.position.set(
        (Math.random() - 0.5) * 200, // x
        Math.random() * 100 + 50,    // y
        (Math.random() - 0.5) * 200  // z
      )
      
      // 儲存速度資料
      line.userData = {
        velocity: {
          x: Math.random() * 0.1 - 0.05,
          y: -Math.random() * 0.3 - 0.2,
          z: Math.random() * 0.05 - 0.025
        }
      }
      
      drops.push(line)
    }
    
    return drops
  }, [intensity])
  
  useFrame(() => {
    if (!rainRef.current) return
    
    // 更新每個雨滴線條的位置
    rainRef.current.children.forEach((drop) => {
      const line = drop as THREE.Line
      const velocity = line.userData.velocity
      
      // 更新位置
      line.position.x += velocity.x * intensity * 0.5
      line.position.y += velocity.y * intensity * 0.3
      line.position.z += velocity.z * intensity * 0.5
      
      // 重置到頂部
      if (line.position.y < -10) {
        line.position.y = 100 + Math.random() * 20
        line.position.x = (Math.random() - 0.5) * 200
        line.position.z = (Math.random() - 0.5) * 200
      }
      
      // 邊界檢查
      if (Math.abs(line.position.x) > 100) {
        line.position.x = (Math.random() - 0.5) * 200
      }
      if (Math.abs(line.position.z) > 100) {
        line.position.z = (Math.random() - 0.5) * 200
      }
      
      // 根據強度調整透明度
      if (line.material instanceof THREE.LineBasicMaterial) {
        line.material.opacity = 0.6 * intensity
      }
    })
  })
  
  if (intensity === 0) return null
  
  return (
    <group ref={rainRef}>
      {rainDrops.map((drop, index) => (
        <primitive key={index} object={drop} />
      ))}
    </group>
  )
}

// 雪花效果 - 使用六角星形幾何體創建真實雪花形狀
export const SnowEffect = ({ intensity = 1 }: { intensity?: number }) => {
  const snowRef = useRef<THREE.Group>(null)
  
  // 創建六角星形雪花幾何體
  const createSnowflakeGeometry = (size: number) => {
    const geometry = new THREE.BufferGeometry()
    const positions = []
    
    // 創建六角星形 - 6條主要射線 + 6條副射線
    const mainRays = 6
    const angleStep = (Math.PI * 2) / mainRays
    
    for (let i = 0; i < mainRays; i++) {
      const angle = i * angleStep
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      
      // 主射線
      positions.push(0, 0, 0)  // 中心
      positions.push(cos * size, sin * size, 0)  // 端點
      
      // 副射線（較短）
      const subRayLength = size * 0.6
      positions.push(cos * subRayLength * 0.5, sin * subRayLength * 0.5, 0)
      positions.push(
        cos * subRayLength * 0.5 + Math.cos(angle + Math.PI/3) * subRayLength * 0.3,
        sin * subRayLength * 0.5 + Math.sin(angle + Math.PI/3) * subRayLength * 0.3,
        0
      )
      
      positions.push(cos * subRayLength * 0.5, sin * subRayLength * 0.5, 0)
      positions.push(
        cos * subRayLength * 0.5 + Math.cos(angle - Math.PI/3) * subRayLength * 0.3,
        sin * subRayLength * 0.5 + Math.sin(angle - Math.PI/3) * subRayLength * 0.3,
        0
      )
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return geometry
  }
  
  const snowflakes = useMemo(() => {
    const flakes = []
    const flakeCount = 800 // 減少數量以提高性能
    
    for (let i = 0; i < flakeCount; i++) {
      const size = Math.random() * 0.3 + 0.1 // 0.1-0.4
      const geometry = createSnowflakeGeometry(size)
      
      // 雪花材質
      const material = new THREE.LineBasicMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0.8 * intensity,
        linewidth: 1
      })
      
      const snowflake = new THREE.LineSegments(geometry, material)
      
      // 設置初始位置
      snowflake.position.set(
        (Math.random() - 0.5) * 200, // x
        Math.random() * 100 + 50,    // y
        (Math.random() - 0.5) * 200  // z
      )
      
      // 隨機旋轉
      snowflake.rotation.z = Math.random() * Math.PI * 2
      
      // 儲存速度和旋轉速度
      snowflake.userData = {
        velocity: {
          x: (Math.random() - 0.5) * 0.05,
          y: -Math.random() * 0.08 - 0.02,
          z: (Math.random() - 0.5) * 0.05
        },
        rotationSpeed: (Math.random() - 0.5) * 0.02
      }
      
      flakes.push(snowflake)
    }
    
    return flakes
  }, [intensity])
  
  useFrame((state) => {
    if (!snowRef.current) return
    
    const time = state.clock.elapsedTime
    
    // 更新每個雪花的位置和旋轉
    snowRef.current.children.forEach((flake, index) => {
      const snowflake = flake as THREE.LineSegments
      const velocity = snowflake.userData.velocity
      const rotationSpeed = snowflake.userData.rotationSpeed
      
      // 更新位置
      snowflake.position.x += velocity.x * intensity * 0.2
      snowflake.position.y += velocity.y * intensity * 0.15
      snowflake.position.z += velocity.z * intensity * 0.2
      
      // 輕柔的飄散效果
      snowflake.position.x += Math.sin(time * 0.3 + index * 0.01) * 0.003
      snowflake.position.z += Math.cos(time * 0.2 + index * 0.01) * 0.003
      
      // 旋轉效果
      snowflake.rotation.z += rotationSpeed * intensity
      
      // 重置到頂部
      if (snowflake.position.y < -10) {
        snowflake.position.y = 100 + Math.random() * 30
        snowflake.position.x = (Math.random() - 0.5) * 200
        snowflake.position.z = (Math.random() - 0.5) * 200
      }
      
      // 邊界檢查
      if (Math.abs(snowflake.position.x) > 100) {
        snowflake.position.x = (Math.random() - 0.5) * 200
      }
      if (Math.abs(snowflake.position.z) > 100) {
        snowflake.position.z = (Math.random() - 0.5) * 200
      }
      
      // 根據強度調整透明度
      if (snowflake.material instanceof THREE.LineBasicMaterial) {
        snowflake.material.opacity = 0.8 * intensity
      }
    })
  })
  
  if (intensity === 0) return null
  
  return (
    <group ref={snowRef}>
      {snowflakes.map((flake, index) => (
        <primitive key={index} object={flake} />
      ))}
    </group>
  )
}

// 霧氣效果 - 使用柔和圓形精靈創建真實霧氣形狀
export const FogEffect = ({ intensity = 1 }: { intensity?: number }) => {
  const fogRef = useRef<THREE.Group>(null)
  
  // 創建圓形霧氣貼圖
  const createFogTexture = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const context = canvas.getContext('2d')
    
    if (context) {
      // 創建徑向漸變
      const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32)
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)')
      gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.4)')
      gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.1)')
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
      
      context.fillStyle = gradient
      context.fillRect(0, 0, 64, 64)
    }
    
    return new THREE.CanvasTexture(canvas)
  }
  
  const fogParticles = useMemo(() => {
    const particles = []
    const particleCount = 300 // 減少數量以提高性能
    const texture = createFogTexture()
    
    for (let i = 0; i < particleCount; i++) {
      // 使用精靈創建圓形霧氣粒子
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: intensity * 0.4,
        color: 0xCCCCCC,
        blending: THREE.AdditiveBlending // 讓霧氣可以相互混合
      })
      
      const sprite = new THREE.Sprite(material)
      const size = Math.random() * 8 + 3 // 3-11的隨機大小
      sprite.scale.set(size, size, size)
      
      // 設置初始位置（低空）
      sprite.position.set(
        (Math.random() - 0.5) * 150,     // x
        Math.random() * 20 + 2,          // y (低空)
        (Math.random() - 0.5) * 150      // z
      )
      
      // 儲存速度資料
      sprite.userData = {
        velocity: {
          x: (Math.random() - 0.5) * 0.03,
          y: Math.random() * 0.01 + 0.005,
          z: (Math.random() - 0.5) * 0.03
        },
        originalOpacity: material.opacity,
        baseSize: size
      }
      
      particles.push(sprite)
    }
    
    return particles
  }, [intensity])
  
  useFrame((state) => {
    if (!fogRef.current) return
    
    const time = state.clock.elapsedTime
    
    // 更新每個霧氣粒子
    fogRef.current.children.forEach((particle, index) => {
      const sprite = particle as THREE.Sprite
      const velocity = sprite.userData.velocity
      const originalOpacity = sprite.userData.originalOpacity
      
      // 更新位置
      sprite.position.x += velocity.x * intensity * 0.3
      sprite.position.y += velocity.y * intensity * 0.2
      sprite.position.z += velocity.z * intensity * 0.3
      
      // 緩慢飄動效果
      sprite.position.x += Math.sin(time * 0.05 + index * 0.01) * 0.02
      sprite.position.z += Math.cos(time * 0.04 + index * 0.01) * 0.02
      
      // 根據高度調整透明度（越高越淡）
      const heightFactor = Math.max(0, 1 - sprite.position.y / 20)
      if (sprite.material instanceof THREE.SpriteMaterial) {
        sprite.material.opacity = intensity * 0.4 * heightFactor
      }
      
      // 輕微的大小變化（呼吸效果）
      const sizeMultiplier = 1 + Math.sin(time * 0.1 + index * 0.05) * 0.1
      const baseSize = sprite.userData.baseSize
      sprite.scale.setScalar(baseSize * sizeMultiplier)
      
      // 重置邊界
      if (sprite.position.y > 25) {
        sprite.position.y = 2
        sprite.position.x = (Math.random() - 0.5) * 150
        sprite.position.z = (Math.random() - 0.5) * 150
      }
      
      if (Math.abs(sprite.position.x) > 75) {
        sprite.position.x = (Math.random() - 0.5) * 150
      }
      if (Math.abs(sprite.position.z) > 75) {
        sprite.position.z = (Math.random() - 0.5) * 150
      }
    })
  })
  
  if (intensity === 0) return null
  
  return (
    <group ref={fogRef}>
      {fogParticles.map((particle, index) => (
        <primitive key={index} object={particle} />
      ))}
    </group>
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

// 主天氣效果組件 - 選擇性啟用特定天氣效果
export const WeatherEffects = () => {
  // 完全關閉舊的天氣粒子效果，使用新的DrizzleEffect
  return null
}