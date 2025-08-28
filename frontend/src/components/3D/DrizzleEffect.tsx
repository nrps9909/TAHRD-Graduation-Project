import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTimeStore } from '@/stores/timeStore'

// 細雨效果組件 - 比大雨更細緻輕柔
export const DrizzleRain = ({ intensity = 1 }: { intensity?: number }) => {
  const drizzleRef = useRef<THREE.Group>(null)
  
  const drizzleDrops = useMemo(() => {
    const drops = []
    // 提高雨滴密度 - 山雷時極大幅增加雨滴數量
    const dropCount = intensity >= 4 ? 20000 : intensity > 2 ? 15000 : 6500 // 山雷時暴增到20000個雨滴！
    
    for (let i = 0; i < dropCount; i++) {
      // 創建雨滴線條 - 長度會根據強度調整
      const geometry = new THREE.BufferGeometry()
      const dropLength = intensity >= 4 ? -2.8 : intensity > 2 ? -0.8 : -2.5 // 山雷時雨滴更長，表現急促感
      const positions = new Float32Array([
        0, 0, 0,        // 起點
        0, dropLength, 0 // 終點 - 山雨時雨滴更長
      ])
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      
      // 雨滴材質 - 山雷使用純淨藍灰色，避免紅色成分
      const rainColor = intensity >= 4 ? 0x8BC4E0 : intensity > 2 ? 0x9BBDD8 : 0x87CEEB // 山雷用純淨藍灰色
      const rainOpacity = intensity >= 4 ? 1.0 : intensity > 2 ? 0.7 : 0.8 // 山雷時完全不透明
      const material = new THREE.LineBasicMaterial({
        color: rainColor,
        transparent: true,
        opacity: rainOpacity,
        linewidth: intensity >= 4 ? 5 : intensity > 2 ? 2 : 4, // 山雷時線寬增加到5，更粗的雨線
        fog: false, // 不受霧效影響
        toneMapped: false // 不受色調映射影響，保持原始顏色
      })
      
      const line = new THREE.Line(geometry, material)
      
      // 設置初始位置 - 覆蓋整個小島範圍
      line.position.set(
        (Math.random() - 0.5) * 2000, // 擴展到整個小島範圍
        Math.random() * 200 + 100,    // 更高的起始高度
        (Math.random() - 0.5) * 2000  // Z軸也擴展到2000
      )
      
      // 儲存速度資料 - 山雷時速度極快極急促
      const fallSpeed = intensity >= 4 ? -Math.random() * 4.0 - 3.5 : intensity > 2 ? -Math.random() * 2.5 - 2.0 : -Math.random() * 0.8 - 0.6 // 山雷時下降速度3.5-7.5
      const horizontalSpeed = intensity >= 4 ? Math.random() * 0.8 - 0.4 : intensity > 2 ? Math.random() * 0.25 - 0.125 : Math.random() * 0.1 - 0.05 // 山雷時橫向擺動更劇烈
      line.userData = {
        velocity: {
          x: horizontalSpeed, // 山雨時橫向漂移更大
          y: fallSpeed,  // 山雨時下降更快
          z: horizontalSpeed * 0.8
        },
        originalOpacity: rainOpacity
      }
      
      drops.push(line)
    }
    
    return drops
  }, [intensity])
  
  useFrame((state) => {
    if (!drizzleRef.current) return
    
    const time = state.clock.elapsedTime
    
    // 更新每個細雨滴的位置
    drizzleRef.current.children.forEach((drop, index) => {
      const line = drop as THREE.Line
      const velocity = line.userData.velocity
      
      // 更新位置 - 山雷時移動極快
      const speedMultiplier = intensity >= 4 ? 3.5 : intensity > 2 ? 2.0 : 1.2 // 山雷時速度倍數3.5
      line.position.x += velocity.x * intensity * speedMultiplier
      line.position.y += velocity.y * intensity * speedMultiplier
      line.position.z += velocity.z * intensity * speedMultiplier
      
      // 飄散效果 - 山雷時極劇烈
      const driftIntensity = intensity >= 4 ? 0.12 : intensity > 2 ? 0.05 : 0.008 // 山雷時飄散強度0.12
      const driftSpeed = intensity >= 4 ? 5.0 : intensity > 2 ? 2.5 : 0.5 // 山雷時飄散速度5.0
      line.position.x += Math.sin(time * driftSpeed + index * 0.02) * driftIntensity
      line.position.z += Math.cos(time * driftSpeed * 0.8 + index * 0.02) * (driftIntensity * 0.75)
      
      // 重置到頂部
      if (line.position.y < -5) {
        line.position.y = 200 + Math.random() * 100
        line.position.x = (Math.random() - 0.5) * 2000
        line.position.z = (Math.random() - 0.5) * 2000
      }
      
      // 邊界檢查
      if (Math.abs(line.position.x) > 1000) {
        line.position.x = (Math.random() - 0.5) * 2000
      }
      if (Math.abs(line.position.z) > 1000) {
        line.position.z = (Math.random() - 0.5) * 2000
      }
      
      // 根據強度調整透明度
      if (line.material instanceof THREE.LineBasicMaterial) {
        line.material.opacity = line.userData.originalOpacity
      }
    })
  })
  
  if (intensity === 0) return null
  
  return (
    <group ref={drizzleRef}>
      {drizzleDrops.map((drop, index) => (
        <primitive key={index} object={drop} />
      ))}
    </group>
  )
}

// 地面水花效果 - 細雨打在地面產生的小水花（使用Sprite避免正方形）
export const RainSplash = ({ intensity = 1 }: { intensity?: number }) => {
  const splashRef = useRef<THREE.Group>(null)
  
  const splashSprites = useMemo(() => {
    const sprites = []
    // 山雨時水花數量大幅增加
    const splashCount = intensity >= 4 ? 1200 : intensity > 2 ? 2000 : 400 // 山雨時五倍水花
    
    // 創建圓形水滴紋理
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const context = canvas.getContext('2d')!
    
    context.clearRect(0, 0, 32, 32)
    
    // 創建更亮的圓形水滴漸變
    const centerX = 16
    const centerY = 16
    const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, 16)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')     // 中心純白，更亮
    gradient.addColorStop(0.3, 'rgba(220, 240, 255, 0.9)') // 內圈亮藍白
    gradient.addColorStop(0.7, 'rgba(180, 220, 240, 0.6)') // 中間藍色，更不透明
    gradient.addColorStop(1, 'rgba(180, 220, 240, 0)')     // 邊緣透明
    
    context.fillStyle = gradient
    context.beginPath()
    context.arc(centerX, centerY, 16, 0, Math.PI * 2)
    context.fill()
    
    const texture = new THREE.CanvasTexture(canvas)
    
    for (let i = 0; i < splashCount; i++) {
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.8, // 提高透明度讓水花更明顯
        color: 0xFFFFFF, // 改為純白色，更亮
        blending: THREE.AdditiveBlending
      })
      
      const sprite = new THREE.Sprite(material)
      // 山雷時水花最大
      const baseSize = intensity >= 4 ? Math.random() * 1.2 + 0.8 : intensity > 2 ? Math.random() * 0.8 + 0.6 : Math.random() * 0.5 + 0.4
      sprite.scale.set(baseSize, baseSize, baseSize)
      
      // 初始位置 - 在地面附近
      sprite.position.set(
        (Math.random() - 0.5) * 2000,   // x - 擴展到整個小島範圍
        0.5 + Math.random() * 2,        // y: 地面上方 0.5-2.5米
        (Math.random() - 0.5) * 2000    // z - 擴展到整個小島範圍
      )
      
      // 儲存運動數據
      sprite.userData = {
        velocity: {
          x: (Math.random() - 0.5) * (intensity >= 4 ? 0.18 : intensity > 2 ? 0.12 : 0.08),     // 山雷時散開最多
          y: Math.random() * (intensity >= 4 ? 0.25 : intensity > 2 ? 0.18 : 0.12) + 0.04,      // 山雷時飛濺最高
          z: (Math.random() - 0.5) * (intensity >= 4 ? 0.18 : intensity > 2 ? 0.12 : 0.08)      // 山雷時散開最多
        },
        lifetime: Math.random() * 2.0 + 1.0,   // 1.0-3.0秒生命週期，更長久
        age: Math.random() * (Math.random() * 2.0 + 1.0), // 隨機初始年齡
        originalOpacity: intensity >= 4 ? 1.0 : intensity > 2 ? 1.0 : 0.9, // 山雷時完全不透明
        baseSize: baseSize
      }
      
      sprites.push(sprite)
    }
    
    return sprites
  }, [])
  
  useFrame((state) => {
    if (!splashRef.current) return
    
    const deltaTime = state.clock.getDelta()
    const time = state.clock.elapsedTime
    
    // 更新每個水花Sprite
    splashRef.current.children.forEach((sprite, index) => {
      const spriteObj = sprite as THREE.Sprite
      const velocity = spriteObj.userData.velocity
      const originalOpacity = spriteObj.userData.originalOpacity
      const baseSize = spriteObj.userData.baseSize
      
      // 更新年齡
      spriteObj.userData.age += deltaTime
      
      // 如果超過生命週期，重新生成
      if (spriteObj.userData.age > spriteObj.userData.lifetime) {
        // 重新定位到地面
        spriteObj.position.set(
          (Math.random() - 0.5) * 2000,
          0.5,
          (Math.random() - 0.5) * 2000
        )
        
        // 重新設定速度
        velocity.x = (Math.random() - 0.5) * 0.08
        velocity.y = Math.random() * 0.12 + 0.04
        velocity.z = (Math.random() - 0.5) * 0.08
        
        spriteObj.userData.age = 0
        spriteObj.userData.lifetime = Math.random() * 2.0 + 1.0
      } else {
        // 更新位置 - 山雨時水花運動更激烈
        const motionMultiplier = intensity > 2 ? 20 : 10
        spriteObj.position.x += velocity.x * intensity * deltaTime * motionMultiplier
        spriteObj.position.y += velocity.y * intensity * deltaTime * motionMultiplier
        spriteObj.position.z += velocity.z * intensity * deltaTime * motionMultiplier
        
        // 重力效果 - 稍微減弱讓水花飛得更高
        velocity.y -= 0.10 * deltaTime // 減弱重力讓水花更明顯
        
        // 輕微的風效影響
        spriteObj.position.x += Math.sin(time * 0.2 + index * 0.1) * 0.003
        
        // 防止掉到地面以下
        if (spriteObj.position.y < 0.2) {
          spriteObj.position.y = 0.2
          velocity.y = 0
        }
        
        // 根據生命週期調整透明度和大小效果
        const ageRatio = spriteObj.userData.age / spriteObj.userData.lifetime
        const fadeOpacity = Math.sin(ageRatio * Math.PI) // 0到1再到0的淡入淡出
        
        if (spriteObj.material instanceof THREE.SpriteMaterial) {
          spriteObj.material.opacity = originalOpacity * fadeOpacity * intensity
        }
        
        // 水花擴散效果 - 剛產生時小，然後快速擴大
        let sizeMultiplier = 1.0
        
        if (ageRatio < 0.2) {
          // 前20%時間快速擴大
          sizeMultiplier = 0.3 + (ageRatio / 0.2) * 0.7 // 從0.3擴大到1.0
        } else {
          // 後80%時間保持穩定，輕微變化
          sizeMultiplier = 1.0 + Math.sin(time * 2 + index * 0.3) * 0.15
        }
        
        spriteObj.scale.setScalar(baseSize * sizeMultiplier)
      }
    })
  })
  
  if (intensity === 0) return null
  
  return (
    <group ref={splashRef}>
      {splashSprites.map((sprite, index) => (
        <primitive key={index} object={sprite} />
      ))}
    </group>
  )
}

// 地面水波漣漪效果 - 水花落地時產生的同心圓波紋
export const WaterRipples = ({ intensity = 1 }: { intensity?: number }) => {
  const ripplesRef = useRef<THREE.Group>(null)
  
  const rippleSprites = useMemo(() => {
    const sprites = []
    // 山雨時漣漪數量大幅增加
    const rippleCount = intensity >= 4 ? 360 : intensity > 2 ? 600 : 120 // 山雨時五倍漣漪
    
    // 創建同心圓漣漪紋理
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const context = canvas.getContext('2d')!
    
    context.clearRect(0, 0, 64, 64)
    
    const centerX = 32
    const centerY = 32
    
    // 繪製同心圓
    context.strokeStyle = 'rgba(200, 230, 255, 0.8)'
    context.lineWidth = 2
    
    for (let ring = 1; ring <= 4; ring++) {
      const radius = ring * 8
      context.globalAlpha = 1.0 - (ring * 0.2)
      context.beginPath()
      context.arc(centerX, centerY, radius, 0, Math.PI * 2)
      context.stroke()
    }
    
    const texture = new THREE.CanvasTexture(canvas)
    
    for (let i = 0; i < rippleCount; i++) {
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.6,
        color: 0xE0F0FF,
        blending: THREE.NormalBlending, // 使用Normal blending讓漣漪更自然
        depthWrite: false
      })
      
      const sprite = new THREE.Sprite(material)
      const initialSize = 0.1 // 很小的初始大小
      sprite.scale.set(initialSize, initialSize, initialSize)
      
      // 初始位置 - 在地面
      sprite.position.set(
        (Math.random() - 0.5) * 2000,
        0.05, // 貼近地面
        (Math.random() - 0.5) * 2000
      )
      
      sprite.userData = {
        maxSize: Math.random() * 3 + 2, // 最大擴散到2-5米
        growthRate: Math.random() * 2 + 1, // 擴散速度
        lifetime: Math.random() * 3 + 2, // 2-5秒生命週期
        age: Math.random() * 5, // 隨機初始年齡
        originalOpacity: 0.6
      }
      
      sprites.push(sprite)
    }
    
    return sprites
  }, [])
  
  useFrame((state) => {
    if (!ripplesRef.current) return
    
    const deltaTime = state.clock.getDelta()
    
    ripplesRef.current.children.forEach((sprite, index) => {
      const spriteObj = sprite as THREE.Sprite
      const maxSize = spriteObj.userData.maxSize
      const growthRate = spriteObj.userData.growthRate
      const originalOpacity = spriteObj.userData.originalOpacity
      
      // 更新年齡
      spriteObj.userData.age += deltaTime
      
      // 如果超過生命週期，重新生成
      if (spriteObj.userData.age > spriteObj.userData.lifetime) {
        spriteObj.position.set(
          (Math.random() - 0.5) * 2000,
          0.05,
          (Math.random() - 0.5) * 2000
        )
        spriteObj.scale.setScalar(0.1)
        spriteObj.userData.age = 0
        spriteObj.userData.lifetime = Math.random() * 3 + 2
      } else {
        // 漣漪擴散
        const ageRatio = spriteObj.userData.age / spriteObj.userData.lifetime
        const currentSize = maxSize * ageRatio * growthRate
        spriteObj.scale.setScalar(currentSize)
        
        // 透明度隨時間衰減
        const fadeOpacity = Math.max(0, 1 - ageRatio)
        if (spriteObj.material instanceof THREE.SpriteMaterial) {
          spriteObj.material.opacity = originalOpacity * fadeOpacity * intensity
        }
      }
    })
  })
  
  if (intensity === 0) return null
  
  return (
    <group ref={ripplesRef}>
      {rippleSprites.map((sprite, index) => (
        <primitive key={index} object={sprite} />
      ))}
    </group>
  )
}

// 細細雨滴效果組件 - 點粒子系統
export const DrizzleDroplets = ({ intensity = 1 }: { intensity?: number }) => {
  const dropletsRef = useRef<THREE.Points>(null)
  
  const dropletsGeometry = useMemo(() => {
    const particleCount = 4000 // 4000個細小雨滴粒子
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const velocities = new Float32Array(particleCount * 3)
    const sizes = new Float32Array(particleCount)
    const lifetimes = new Float32Array(particleCount)
    const ages = new Float32Array(particleCount)
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3
      
      // 細雨滴從空中隨機分布
      positions[i3] = (Math.random() - 0.5) * 400      // x: -200 到 200
      positions[i3 + 1] = Math.random() * 80 + 30     // y: 30 到 110米高空
      positions[i3 + 2] = (Math.random() - 0.5) * 400  // z: -200 到 200
      
      // 細雨的輕柔下降速度
      velocities[i3] = (Math.random() - 0.5) * 0.5       // 輕微橫向漂移
      velocities[i3 + 1] = -Math.random() * 2 - 1        // 1-3 溫和下降
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.3   // 輕微側風
      
      sizes[i] = Math.random() * 1.5 + 1.0                // 1-2.5 細小雨滴
      lifetimes[i] = Math.random() * 4 + 2               // 2-6秒生命週期
      ages[i] = Math.random() * lifetimes[i]
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1))
    geometry.setAttribute('age', new THREE.BufferAttribute(ages, 1))
    
    return geometry
  }, [])
  
  const dropletsMaterial = useMemo(() => {
    // 創建細小圓形雨滴紋理
    const canvas = document.createElement('canvas')
    canvas.width = 16
    canvas.height = 16
    const context = canvas.getContext('2d')!
    
    context.clearRect(0, 0, 16, 16)
    
    // 創建細小雨滴的漸變
    const gradient = context.createRadialGradient(8, 8, 0, 8, 8, 8)
    gradient.addColorStop(0, 'rgba(200, 230, 255, 1)')    // 明亮的中心
    gradient.addColorStop(0.6, 'rgba(170, 210, 240, 0.8)') // 中間藍色
    gradient.addColorStop(1, 'rgba(170, 210, 240, 0)')     // 邊緣透明
    
    context.fillStyle = gradient
    context.beginPath()
    context.arc(8, 8, 8, 0, Math.PI * 2)
    context.fill()
    
    const texture = new THREE.CanvasTexture(canvas)
    
    return new THREE.PointsMaterial({
      map: texture,
      color: 0xC8E6FF, // 淡藍色
      transparent: true,
      opacity: 0.8,     // 高透明度讓雨滴明顯
      size: 3,          // 適中大小
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  }, [])
  
  useFrame((state) => {
    if (!dropletsRef.current) return
    
    const deltaTime = state.clock.getDelta()
    const time = state.clock.elapsedTime
    
    const geometry = dropletsRef.current.geometry
    const positions = geometry.attributes.position.array as Float32Array
    const velocities = geometry.attributes.velocity.array as Float32Array
    const ages = geometry.attributes.age.array as Float32Array
    const lifetimes = geometry.attributes.lifetime.array as Float32Array
    
    for (let i = 0; i < positions.length; i += 3) {
      const particleIndex = i / 3
      
      // 更新年齡
      ages[particleIndex] += deltaTime
      
      // 重新生成超過生命週期的雨滴
      if (ages[particleIndex] > lifetimes[particleIndex]) {
        positions[i] = (Math.random() - 0.5) * 400
        positions[i + 1] = Math.random() * 80 + 30
        positions[i + 2] = (Math.random() - 0.5) * 400
        ages[particleIndex] = 0
        
        // 重新設定速度
        velocities[i] = (Math.random() - 0.5) * 0.5
        velocities[i + 1] = -Math.random() * 2 - 1
        velocities[i + 2] = (Math.random() - 0.5) * 0.3
      } else {
        // 更新位置 - 細雨緩慢移動
        positions[i] += velocities[i] * deltaTime * intensity
        positions[i + 1] += velocities[i + 1] * deltaTime * intensity
        positions[i + 2] += velocities[i + 2] * deltaTime * intensity
        
        // 添加輕微細雨飄散
        positions[i] += Math.sin(time * 0.5 + particleIndex * 0.02) * 0.01
        positions[i + 2] += Math.cos(time * 0.4 + particleIndex * 0.02) * 0.008
        
        // 邊界重置
        if (positions[i + 1] < -2) {
          positions[i + 1] = Math.random() * 80 + 30
          positions[i] = (Math.random() - 0.5) * 400
          positions[i + 2] = (Math.random() - 0.5) * 400
        }
        
        if (Math.abs(positions[i]) > 220 || Math.abs(positions[i + 2]) > 220) {
          positions[i] = (Math.random() - 0.5) * 400
          positions[i + 2] = (Math.random() - 0.5) * 400
          positions[i + 1] = Math.random() * 80 + 30
        }
      }
    }
    
    geometry.attributes.position.needsUpdate = true
    geometry.attributes.age.needsUpdate = true
    
    // 調整材質透明度
    const material = dropletsRef.current.material as THREE.PointsMaterial
    material.opacity = 0.8 * intensity
  })
  
  if (intensity === 0) return null
  
  return (
    <points
      ref={dropletsRef}
      geometry={dropletsGeometry}
      material={dropletsMaterial}
    />
  )
}

// 主細雨和山雨效果組件
export const DrizzleEffect = () => {
  const { weather } = useTimeStore()
  
  // 同時支援細雨、山雨和山雷天氣
  const isDrizzle = weather === 'drizzle'
  const isRain = weather === 'rain'
  const isStorm = weather === 'storm'
  const showEffect = isDrizzle || isRain || isStorm
  
  // 根據天氣類型設定強度：細雨1.0，山雨2.5，山雷4.5（更急促）
  const intensity = isDrizzle ? 1.0 : isRain ? 2.5 : isStorm ? 4.5 : 0.0
  
  if (!showEffect) return null
  
  return (
    <group>
      {/* 細雨粒子 */}
      <DrizzleRain intensity={intensity} />
      
      {/* 只在細雨時顯示地面水花和漣漪，山雨時不顯示 */}
      {isDrizzle && (
        <>
          {/* 地面水花 */}
          <RainSplash intensity={intensity} />
          
          {/* 水波漣漪 */}
          <WaterRipples intensity={intensity * 0.8} />
        </>
      )}
    </group>
  )
}