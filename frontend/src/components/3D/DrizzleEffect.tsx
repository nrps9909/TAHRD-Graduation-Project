import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTimeStore } from '@/stores/timeStore'

// 細雨效果組件 - 比大雨更細緻輕柔
export const DrizzleRain = ({ intensity = 1 }: { intensity?: number }) => {
  const drizzleRef = useRef<THREE.Group>(null)
  const { timeOfDay, hour } = useTimeStore()
  
  const drizzleDrops = useMemo(() => {
    const drops = []
    // 提高雨滴密度 - 山雷時極大幅增加雨滴數量
    // 大幅增加雨滴數量讓雨效更明顯
    const baseDrop = intensity >= 4 ? 20000 : intensity > 2 ? 15000 : 6500
    const dropCount = (timeOfDay === 'day') ? baseDrop * 2.5 : baseDrop // 白天增加150%雨滴數量，雨量更大
    
    for (let i = 0; i < dropCount; i++) {
      // 創建動森風格的雨滴圓柱體 - 可愛且明顯
      const dropLength = Math.abs(intensity >= 4 ? -2.8 : intensity > 2 ? -0.8 : -2.5)
      
      // 白天雨滴更粗更明顯
      let radius: number
      if (timeOfDay === 'day' && hour >= 6 && hour < 12) {
        radius = 0.03 // 早上較粗，更明顯
      } else if (timeOfDay === 'day') {
        radius = 0.035 // 下午更粗，最明顯
      } else {
        radius = 0.02  // 夜晚稍細
      }
      
      const geometry = new THREE.CylinderGeometry(radius, radius * 0.8, dropLength, 6) // 6邊形，稍微錐形，更像真實雨滴
      
      // 根據時間動態調整雨滴顏色 - 早上用美麗的漸變色，夜晚用亮色
      let rainColor: number
      let rainOpacity: number
      let emissive: number = 0x000000 // 發光色
      let emissiveIntensity: number = 0
      
      if (intensity >= 4) {
        // 山雷時使用純淨藍灰色
        rainColor = 0x8BC4E0
        rainOpacity = 1.0
      } else if (intensity > 2) {
        rainColor = 0x9BBDD8
        rainOpacity = 0.7
      } else {
        // 細雨時根據時間調整顏色和發光效果 - 動森風格
        if (timeOfDay === 'day') {
          // 白天（6-18點）：使用動森風格的明亮清晰顏色
          if (hour >= 6 && hour < 12) {
            // 早上：使用白色線條
            rainColor = 0xFFFFFF  // 純白色
            rainOpacity = 1.0     // 完全不透明，最大可見度
            emissive = 0x000000   // 無發光
            emissiveIntensity = 0 // 無發光效果
          } else {
            // 下午：稍微溫暖的白藍色調，也增強可見度
            rainColor = 0x00BFFF  // 深天空藍，更明顯的對比
            rainOpacity = 0.95    // 高透明度
            emissive = 0x87CEEB   // 天空藍發光
            emissiveIntensity = 0.15 // 增強發光
          }
        } else {
          // 夜晚（18-6點）：增強藍光效果
          rainColor = 0xCCE7FF  // 明亮的藍白色
          rainOpacity = 0.95
          emissive = 0x4FC3F7   // 強烈的藍色發光
          emissiveIntensity = 0.35 // 大幅增強夜晚發光效果
        }
      }
      
      // 白天使用更好的材質來增加可見度
      let material: THREE.Material
      
      if (timeOfDay === 'day') {
        // 白天使用帶陰影的材質，增加立體感和可見度
        material = new THREE.MeshLambertMaterial({
          color: rainColor,
          transparent: true,
          opacity: rainOpacity,
          emissive: emissive,
          emissiveIntensity: emissiveIntensity,
          fog: false,
          toneMapped: false
        })
      } else {
        // 夜晚使用增強發光材質
        material = new THREE.MeshBasicMaterial({
          color: rainColor,
          transparent: true,
          opacity: rainOpacity,
          fog: false,
          toneMapped: false,
          // 增強夜晚藍光效果的附加屬性
          blending: THREE.AdditiveBlending, // 使用加法混合增強發光效果
          depthWrite: false // 防止深度衝突
        })
        // 在創建後設置emissive屬性
        if (material.emissive) {
          material.emissive.setHex(emissive)
        }
        if ('emissiveIntensity' in material) {
          (material as any).emissiveIntensity = emissiveIntensity
        }
      }
      
      const mesh = new THREE.Mesh(geometry, material)
      
      // 設置初始位置 - 覆蓋整個小島範圍
      mesh.position.set(
        (Math.random() - 0.5) * 2000, // 擴展到整個小島範圍
        Math.random() * 200 + 100,    // 更高的起始高度
        (Math.random() - 0.5) * 2000  // Z軸也擴展到2000
      )
      
      // 隨機旋轉讓雨滴角度更自然 - 限制在 ±15 度內
      const maxTilt = Math.PI / 12 // 15 度轉弧度
      mesh.rotation.x = Math.random() * maxTilt * 2 - maxTilt // ±15 度範圍
      mesh.rotation.z = Math.random() * maxTilt * 2 - maxTilt // ±15 度範圍
      
      // 儲存速度資料和美麗效果參數
      const fallSpeed = intensity >= 4 ? -Math.random() * 4.0 - 3.5 : intensity > 2 ? -Math.random() * 2.5 - 2.0 : -Math.random() * 0.8 - 0.6
      const horizontalSpeed = intensity >= 4 ? Math.random() * 0.8 - 0.4 : intensity > 2 ? Math.random() * 0.25 - 0.125 : Math.random() * 0.1 - 0.05
      mesh.userData = {
        velocity: {
          x: horizontalSpeed,
          y: fallSpeed,
          z: horizontalSpeed * 0.8
        },
        originalOpacity: rainOpacity,
        originalEmissive: emissive,
        originalEmissiveIntensity: emissiveIntensity,
        shimmerPhase: Math.random() * Math.PI * 2, // 閃爍相位
        shimmerSpeed: 0.5 + Math.random() * 1.0     // 閃爍速度
      }
      
      drops.push(mesh)
    }
    
    return drops
  }, [intensity])
  
  useFrame((state) => {
    if (!drizzleRef.current) return
    
    const time = state.clock.elapsedTime
    
    // 更新每個細雨滴的位置和美麗效果
    drizzleRef.current.children.forEach((drop, index) => {
      const mesh = drop as THREE.Mesh
      const velocity = mesh.userData.velocity
      
      // 更新位置 - 山雷時移動極快
      const speedMultiplier = intensity >= 4 ? 3.5 : intensity > 2 ? 2.0 : 1.2
      mesh.position.x += velocity.x * intensity * speedMultiplier
      mesh.position.y += velocity.y * intensity * speedMultiplier
      mesh.position.z += velocity.z * intensity * speedMultiplier
      
      // 優美的飄散效果
      const driftIntensity = intensity >= 4 ? 0.12 : intensity > 2 ? 0.05 : 0.008
      const driftSpeed = intensity >= 4 ? 5.0 : intensity > 2 ? 2.5 : 0.5
      mesh.position.x += Math.sin(time * driftSpeed + index * 0.02) * driftIntensity
      mesh.position.z += Math.cos(time * driftSpeed * 0.8 + index * 0.02) * (driftIntensity * 0.75)
      
      // 輕微旋轉讓雨滴更生動，但限制在 ±15 度內
      mesh.rotation.x += 0.002 * intensity
      mesh.rotation.z += 0.001 * intensity
      
      // 確保旋轉角度不超過 ±15 度
      const maxTiltLimit = Math.PI / 12 // 15 度轉弧度
      mesh.rotation.x = Math.max(-maxTiltLimit, Math.min(maxTiltLimit, mesh.rotation.x))
      mesh.rotation.z = Math.max(-maxTiltLimit, Math.min(maxTiltLimit, mesh.rotation.z))
      
      // 重置到頂部
      if (mesh.position.y < -5) {
        mesh.position.y = 200 + Math.random() * 100
        mesh.position.x = (Math.random() - 0.5) * 2000
        mesh.position.z = (Math.random() - 0.5) * 2000
        // 重置旋轉 - 限制在 ±15 度內
        const maxTiltReset = Math.PI / 12 // 15 度轉弧度
        mesh.rotation.x = Math.random() * maxTiltReset * 2 - maxTiltReset // ±15 度範圍
        mesh.rotation.z = Math.random() * maxTiltReset * 2 - maxTiltReset // ±15 度範圍
      }
      
      // 邊界檢查
      if (Math.abs(mesh.position.x) > 1000) {
        mesh.position.x = (Math.random() - 0.5) * 2000
      }
      if (Math.abs(mesh.position.z) > 1000) {
        mesh.position.z = (Math.random() - 0.5) * 2000
      }
      
      // 美麗的閃爍發光效果
      if (mesh.material instanceof THREE.MeshBasicMaterial || mesh.material instanceof THREE.MeshLambertMaterial) {
        const shimmerPhase = mesh.userData.shimmerPhase
        const shimmerSpeed = mesh.userData.shimmerSpeed
        const shimmerValue = Math.sin(time * shimmerSpeed + shimmerPhase) * 0.5 + 0.5
        
        // 動態調整透明度和發光強度
        mesh.material.opacity = mesh.userData.originalOpacity * (0.8 + shimmerValue * 0.2)
        
        // 增強夜晚藍光脈動效果
        if (timeOfDay === 'day' && hour >= 6 && hour < 12) {
          // 早上：無特殊效果，保持原始簡潔
          if (mesh.material instanceof THREE.MeshLambertMaterial) {
            mesh.material.emissiveIntensity = mesh.userData.originalEmissiveIntensity
          }
        } else if (timeOfDay === 'night') {
          // 夜晚：強化藍光脈動效果
          const nightGlowPulse = Math.sin(time * 1.5 + shimmerPhase) * 0.5 + 0.5
          if (mesh.material instanceof THREE.MeshBasicMaterial) {
            // 基礎材質使用發光顏色和透明度變化來模擬脈動
            const glowIntensity = 0.4 + nightGlowPulse * 0.5
            if (mesh.material.emissive) {
              mesh.material.emissive.setHex(0x4FC3F7)
              mesh.material.emissive.multiplyScalar(glowIntensity)
            }
            mesh.material.opacity = mesh.userData.originalOpacity * (0.8 + nightGlowPulse * 0.3)
          } else if (mesh.material instanceof THREE.MeshLambertMaterial) {
            mesh.material.emissiveIntensity = mesh.userData.originalEmissiveIntensity * (0.7 + nightGlowPulse * 0.6)
          }
        } else {
          if (mesh.material instanceof THREE.MeshLambertMaterial) {
            mesh.material.emissiveIntensity = mesh.userData.originalEmissiveIntensity * (0.8 + shimmerValue * 0.2)
          }
        }
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
  const { timeOfDay } = useTimeStore()
  
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
    
    // 創建水滴漸變 - 夜晚時使用藍光效果
    const centerX = 16
    const centerY = 16
    const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, 16)
    
    if (timeOfDay === 'night') {
      // 夜晚藍光水花效果
      gradient.addColorStop(0, 'rgba(79, 195, 247, 1)')     // 中心強烈藍光
      gradient.addColorStop(0.3, 'rgba(100, 210, 255, 0.9)') // 內圈亮藍
      gradient.addColorStop(0.7, 'rgba(140, 230, 255, 0.6)') // 中間淡藍，更發光
      gradient.addColorStop(1, 'rgba(140, 230, 255, 0)')     // 邊緣透明藍光
    } else {
      // 白天效果
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')     // 中心純白，更亮
      gradient.addColorStop(0.3, 'rgba(220, 240, 255, 0.9)') // 內圈亮藍白
      gradient.addColorStop(0.7, 'rgba(180, 220, 240, 0.6)') // 中間藍色，更不透明
      gradient.addColorStop(1, 'rgba(180, 220, 240, 0)')     // 邊緣透明
    }
    
    context.fillStyle = gradient
    context.beginPath()
    context.arc(centerX, centerY, 16, 0, Math.PI * 2)
    context.fill()
    
    const texture = new THREE.CanvasTexture(canvas)
    
    for (let i = 0; i < splashCount; i++) {
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: timeOfDay === 'night' ? 0.9 : 0.8, // 夜晚時增加透明度
        color: timeOfDay === 'night' ? 0x4FC3F7 : 0xFFFFFF, // 夜晚時使用藍色調
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
  }, [timeOfDay])
  
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
  const { timeOfDay } = useTimeStore()
  
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
    
    // 繪製同心圓 - 夜晚時使用藍光效果
    if (timeOfDay === 'night') {
      context.strokeStyle = 'rgba(79, 195, 247, 0.9)' // 夜晚藍光漣漪
    } else {
      context.strokeStyle = 'rgba(200, 230, 255, 0.8)' // 白天效果
    }
    context.lineWidth = 2
    
    for (let ring = 1; ring <= 4; ring++) {
      const radius = ring * 8
      context.globalAlpha = timeOfDay === 'night' ? 1.2 - (ring * 0.25) : 1.0 - (ring * 0.2)
      context.beginPath()
      context.arc(centerX, centerY, radius, 0, Math.PI * 2)
      context.stroke()
    }
    
    const texture = new THREE.CanvasTexture(canvas)
    
    for (let i = 0; i < rippleCount; i++) {
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: timeOfDay === 'night' ? 0.8 : 0.6, // 夜晚時增加透明度
        color: timeOfDay === 'night' ? 0x4FC3F7 : 0xE0F0FF, // 夜晚時使用藍色調
        blending: timeOfDay === 'night' ? THREE.AdditiveBlending : THREE.NormalBlending, // 夜晚使用加法混合增強發光
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
  }, [timeOfDay])
  
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
  const { timeOfDay, hour } = useTimeStore()
  
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
    
    // 根據時間動態創建雨滴漸變顏色
    let centerColor: string
    let middleColor: string
    let particleColor: number
    
    if (timeOfDay === 'day') {
      if (hour >= 6 && hour < 12) {
        // 早上：使用深色雨滴，在明亮背景下更明顯
        centerColor = 'rgba(70, 130, 180, 1)'     // 深鋼藍色中心
        middleColor = 'rgba(95, 158, 160, 0.8)'   // 深軍艦灰藍
        particleColor = 0x4682B4  // 鋼藍色
      } else {
        // 下午：中等深度
        centerColor = 'rgba(95, 158, 160, 1)'     // 軍艦灰藍中心
        middleColor = 'rgba(135, 206, 235, 0.8)'  // 天空藍
        particleColor = 0x5F9EA0  // 軍艦灰藍
      }
    } else {
      // 夜晚：增強藍光效果
      centerColor = 'rgba(79, 195, 247, 1)'      // 強烈藍光中心
      middleColor = 'rgba(100, 210, 255, 0.9)'   // 亮藍發光
      particleColor = 0x4FC3F7  // 強烈藍色發光
    }
    
    // 創建細小雨滴的漸變
    const gradient = context.createRadialGradient(8, 8, 0, 8, 8, 8)
    gradient.addColorStop(0, centerColor)    // 動態中心色
    gradient.addColorStop(0.6, middleColor)  // 動態中間色
    gradient.addColorStop(1, 'rgba(170, 210, 240, 0)')     // 邊緣透明
    
    context.fillStyle = gradient
    context.beginPath()
    context.arc(8, 8, 8, 0, Math.PI * 2)
    context.fill()
    
    const texture = new THREE.CanvasTexture(canvas)
    
    return new THREE.PointsMaterial({
      map: texture,
      color: particleColor, // 動態顏色
      transparent: true,
      opacity: timeOfDay === 'night' ? 0.95 : timeOfDay === 'day' ? 0.9 : 0.8, // 夜晚最不透明，增強發光效果
      size: timeOfDay === 'night' ? 4 : timeOfDay === 'day' ? 3.5 : 3, // 夜晚稍大增強可見性
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  }, [timeOfDay, hour])
  
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

// 主細雨效果組件
export const DrizzleEffect = () => {
  const { weather } = useTimeStore()
  
  // 只支援細雨天氣
  const isDrizzle = weather === 'drizzle'
  const intensity = isDrizzle ? 1.0 : 0.0
  
  if (!isDrizzle) return null
  
  return (
    <group>
      {/* 細雨線條 */}
      <DrizzleRain intensity={intensity} />
    </group>
  )
}