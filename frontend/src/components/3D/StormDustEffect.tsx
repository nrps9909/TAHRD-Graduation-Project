import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTimeStore } from '@/stores/timeStore'

// 山雷風揚塵土效果組件 - 已移除
export const StormDustEffect = () => {
  return null
  
  // 創建大量風塵雲效果
  const dustCloudsGeometry = useMemo(() => {
    const particleCount = 4500 // 進一步增加塵土粒子（從3500增加到4500）
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const velocities = new Float32Array(particleCount * 3)
    const scales = new Float32Array(particleCount)
    const lifetimes = new Float32Array(particleCount)
    const ages = new Float32Array(particleCount)
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3
      
      // 調整為跟大風一樣的分布範圍
      positions[i3] = (Math.random() - 0.5) * 200      // x: -100 到 100（跟大風一樣）
      positions[i3 + 1] = Math.random() * 5 + 1        // y: 1-6米（跟大風一樣）
      positions[i3 + 2] = (Math.random() - 0.5) * 200  // z: -100 到 100（跟大風一樣）
      
      // 調整為跟大風一樣的風力參數
      velocities[i3] = 1.5 + Math.random() * 2.5        // 1.5-4 橫向速度（跟大風一樣）
      velocities[i3 + 1] = Math.random() * 0.5 + 0.2    // 0.2-0.7 向上速度（跟大風一樣）
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.8  // 前後飄動（跟大風一樣）
      
      scales[i] = Math.random() * 1.5 + 0.3             // 0.3-1.8 粒子大小（跟大風一樣）
      lifetimes[i] = Math.random() * 6 + 3              // 3-9秒（跟大風一樣）
      ages[i] = Math.random() * lifetimes[i]            // 隨機初始年齡
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3))
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1))
    geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1))
    geometry.setAttribute('age', new THREE.BufferAttribute(ages, 1))
    
    return geometry
  }, [])
  
  // 創建飛行碎屑效果（樹葉、小枝等）
  const flyingDebrisGeometry = useMemo(() => {
    const debrisCount = 1500 // 再次增加碎屑数量（從1000增加到1500）
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(debrisCount * 3)
    const velocities = new Float32Array(debrisCount * 3)
    const rotations = new Float32Array(debrisCount * 3)
    const sizes = new Float32Array(debrisCount)
    
    for (let i = 0; i < debrisCount; i++) {
      const i3 = i * 3
      
      // 碎屑從各處飛起
      positions[i3] = (Math.random() - 0.5) * 300
      positions[i3 + 1] = Math.random() * 25 + 2        // 2-27米高度
      positions[i3 + 2] = (Math.random() - 0.5) * 300
      
      // 調整為較溫和的飛行軌跡（但仍比大風稍強）
      velocities[i3] = (Math.random() - 0.5) * 6         // -3 到 3
      velocities[i3 + 1] = Math.random() * 2 - 0.5       // -0.5 到 1.5
      velocities[i3 + 2] = (Math.random() - 0.5) * 6     // -3 到 3
      
      // 旋轉速度
      rotations[i3] = (Math.random() - 0.5) * 0.2       // x軸旋轉
      rotations[i3 + 1] = (Math.random() - 0.5) * 0.3   // y軸旋轉
      rotations[i3 + 2] = (Math.random() - 0.5) * 0.2   // z軸旋轉
      
      sizes[i] = Math.random() * 1.5 + 0.3              // 0.3-1.8 的碎屑大小（跟大風相似）
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3))
    geometry.setAttribute('rotation', new THREE.BufferAttribute(rotations, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    
    return geometry
  }, [])
  
  // 塵土雲材質
  const dustCloudsMaterial = useMemo(() => {
    // 創建不規則塵土紋理
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const context = canvas.getContext('2d')!
    
    context.clearRect(0, 0, 128, 128)
    
    // 創建多層次的塵土雲紋理
    for (let layer = 0; layer < 5; layer++) {
      const centerX = 64 + (Math.random() - 0.5) * 40
      const centerY = 64 + (Math.random() - 0.5) * 40
      const radius = 30 + Math.random() * 30
      const opacity = 0.15 + Math.random() * 0.1
      
      const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
      gradient.addColorStop(0, `rgba(139, 116, 87, ${opacity})`)    // 暗土色中心
      gradient.addColorStop(0.3, `rgba(160, 130, 100, ${opacity * 0.8})`) // 中間土色
      gradient.addColorStop(0.7, `rgba(180, 150, 120, ${opacity * 0.4})`) // 外圍淡土色
      gradient.addColorStop(1, 'rgba(180, 150, 120, 0)')                  // 邊緣透明
      
      context.fillStyle = gradient
      context.beginPath()
      context.arc(centerX, centerY, radius, 0, Math.PI * 2)
      context.fill()
    }
    
    const texture = new THREE.CanvasTexture(canvas)
    
    return new THREE.PointsMaterial({
      map: texture,
      color: 0xE6D3B7, // 調整為跟大風一樣的淡土色
      transparent: true,
      opacity: 0.6,    // 跟大風一樣的透明度
      size: 0.8,       // 跟大風一樣的大小
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  }, [])
  
  // 碎屑材質
  const flyingDebrisMaterial = useMemo(() => {
    // 創建碎屑紋理
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const context = canvas.getContext('2d')!
    
    // 創建不規則形狀
    context.fillStyle = 'rgba(101, 67, 33, 0.8)' // 深棕色
    context.beginPath()
    context.moveTo(8, 4)
    context.lineTo(24, 8)
    context.lineTo(28, 20)
    context.lineTo(16, 28)
    context.lineTo(4, 24)
    context.lineTo(2, 12)
    context.closePath()
    context.fill()
    
    const texture = new THREE.CanvasTexture(canvas)
    
    return new THREE.PointsMaterial({
      map: texture,
      color: 0x8B4513, // 棕色
      transparent: true,
      opacity: 0.7,    // 提高可見度
      size: 1.5,       // 進一步降低碎屑粒子大小（從2降低到1.5）
      sizeAttenuation: true,
      depthWrite: false
    })
  }, [])
  
  useFrame((state) => {
    const time = state.clock.elapsedTime
    const deltaTime = state.clock.getDelta()
    
    // 只在山雷天氣時顯示
    const isStormActive = weather === 'storm'
    const stormIntensity = isStormActive ? 1.0 : 0.0
    
    if (dustCloudsRef.current) {
      dustCloudsRef.current.visible = isStormActive
      
      if (isStormActive) {
        const geometry = dustCloudsRef.current.geometry
        const positions = geometry.attributes.position.array as Float32Array
        const velocities = geometry.attributes.velocity.array as Float32Array
        const ages = geometry.attributes.age.array as Float32Array
        const lifetimes = geometry.attributes.lifetime.array as Float32Array
        
        // 更新材質透明度
        const material = dustCloudsRef.current.material as THREE.PointsMaterial
        material.opacity = 0.8 * stormIntensity
        
        for (let i = 0; i < positions.length; i += 3) {
          const particleIndex = i / 3
          
          // 更新年齡
          ages[particleIndex] += deltaTime
          
          // 如果超過生命週期，重新生成（跟大風一樣）
          if (ages[particleIndex] > lifetimes[particleIndex]) {
            positions[i] = (Math.random() - 0.5) * 200
            positions[i + 1] = Math.random() * 5 + 1
            positions[i + 2] = (Math.random() - 0.5) * 200
            ages[particleIndex] = 0
          } else {
            // 調整為跟大風一樣的移動速度
            positions[i] += velocities[i] * deltaTime * stormIntensity
            positions[i + 1] += velocities[i + 1] * deltaTime * stormIntensity
            positions[i + 2] += velocities[i + 2] * deltaTime * stormIntensity
            
            // 添加跟大風一樣的湍流效果
            positions[i] += Math.sin(time * 3 + particleIndex * 0.1) * 0.02
            positions[i + 1] += Math.cos(time * 2 + particleIndex * 0.1) * 0.01
            
            // 調整邊界重置為跟大風一樣
            if (positions[i] > 150 || positions[i] < -150) {
              positions[i] = (Math.random() - 0.5) * 200
            }
            if (positions[i + 2] > 100 || positions[i + 2] < -100) {
              positions[i + 2] = (Math.random() - 0.5) * 200
            }
            if (positions[i + 1] > 60) {
              positions[i + 1] = Math.random() * 5 + 1
            }
          }
        }
        
        geometry.attributes.position.needsUpdate = true
        geometry.attributes.age.needsUpdate = true
      }
    }
    
    if (flyingDebrisRef.current) {
      flyingDebrisRef.current.visible = isStormActive
      
      if (isStormActive) {
        const geometry = flyingDebrisRef.current.geometry
        const positions = geometry.attributes.position.array as Float32Array
        const velocities = geometry.attributes.velocity.array as Float32Array
        const rotations = geometry.attributes.rotation.array as Float32Array
        
        // 更新材質透明度
        const material = flyingDebrisRef.current.material as THREE.PointsMaterial
        material.opacity = 0.7 * stormIntensity
        
        for (let i = 0; i < positions.length; i += 3) {
          const particleIndex = i / 3
          
          // 調整為較溫和的飛行（類似大風但稍強）
          positions[i] += velocities[i] * deltaTime * stormIntensity * 1.5
          positions[i + 1] += velocities[i + 1] * deltaTime * stormIntensity * 1.2
          positions[i + 2] += velocities[i + 2] * deltaTime * stormIntensity * 1.5
          
          // 重力影響
          velocities[i + 1] -= 1.0 * deltaTime
          
          // 調整為跟大風相似的湍流
          const turbulence = Math.sin(time * 3 + particleIndex * 0.2) * 0.08
          positions[i] += turbulence
          positions[i + 2] += Math.cos(time * 2.5 + particleIndex * 0.2) * 0.06
          
          // 邊界重置調整為合理範圍
          if (positions[i + 1] < -2 || 
              Math.abs(positions[i]) > 150 || 
              Math.abs(positions[i + 2]) > 150) {
            positions[i] = (Math.random() - 0.5) * 200
            positions[i + 1] = Math.random() * 15 + 2
            positions[i + 2] = (Math.random() - 0.5) * 200
            
            velocities[i] = (Math.random() - 0.5) * 6
            velocities[i + 1] = Math.random() * 2 - 0.5
            velocities[i + 2] = (Math.random() - 0.5) * 6
          }
        }
        
        geometry.attributes.position.needsUpdate = true
        geometry.attributes.velocity.needsUpdate = true
      }
    }
  })
  
  return (
    <group>
      {/* 風揚塵土雲 */}
      <points
        ref={dustCloudsRef}
        geometry={dustCloudsGeometry}
        material={dustCloudsMaterial}
      />
      
      {/* 飛行碎屑 */}
      <points
        ref={flyingDebrisRef}
        geometry={flyingDebrisGeometry}
        material={flyingDebrisMaterial}
      />
    </group>
  )
}