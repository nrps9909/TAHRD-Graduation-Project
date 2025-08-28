import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTimeStore } from '@/stores/timeStore'

// 山雨2.0效果組件 - 專為山雷天氣設計的密集重雨
export const MountainRainEffect = () => {
  const { weather } = useTimeStore()
  const rainRef = useRef<THREE.Points>(null)
  
  // 創建山雨2.0 - 密集大雨滴效果
  const mountainRainGeometry = useMemo(() => {
    const particleCount = 8000 // 大量雨滴
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const velocities = new Float32Array(particleCount * 3)
    const sizes = new Float32Array(particleCount)
    const lifetimes = new Float32Array(particleCount)
    const ages = new Float32Array(particleCount)
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3
      
      // 雨滴從高空大範圍降落
      positions[i3] = (Math.random() - 0.5) * 500      // x: -250 到 250
      positions[i3 + 1] = Math.random() * 100 + 50     // y: 50 到 150米高空
      positions[i3 + 2] = (Math.random() - 0.5) * 500  // z: -250 到 250
      
      // 山雨的快速下降和輕微橫向風力
      velocities[i3] = (Math.random() - 0.5) * 2       // 輕微橫向風力
      velocities[i3 + 1] = -Math.random() * 8 - 6       // 6-14 快速下降
      velocities[i3 + 2] = (Math.random() - 0.5) * 1.5 // 輕微側風
      
      sizes[i] = Math.random() * 4 + 3                  // 3-7 大雨滴
      lifetimes[i] = Math.random() * 5 + 3              // 3-8秒生命週期
      ages[i] = Math.random() * lifetimes[i]
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1))
    geometry.setAttribute('age', new THREE.BufferAttribute(ages, 1))
    
    return geometry
  }, [])
  
  // 山雨2.0材質 - 更明顯的大雨滴
  const mountainRainMaterial = useMemo(() => {
    // 創建大雨滴紋理
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const context = canvas.getContext('2d')!
    
    context.clearRect(0, 0, 32, 32)
    
    // 創建拉長的大雨滴形狀
    const gradient = context.createLinearGradient(16, 2, 16, 30)
    gradient.addColorStop(0, 'rgba(173, 216, 230, 1)')    // 明亮淡藍
    gradient.addColorStop(0.5, 'rgba(135, 206, 250, 0.95)') // 天藍色
    gradient.addColorStop(1, 'rgba(135, 206, 250, 0.8)')   // 漸透明
    
    context.fillStyle = gradient
    context.beginPath()
    context.ellipse(16, 16, 6, 18, 0, 0, Math.PI * 2) // 大橢圓形雨滴
    context.fill()
    
    const texture = new THREE.CanvasTexture(canvas)
    
    return new THREE.PointsMaterial({
      map: texture,
      color: 0xADD8E6, // 明亮淡藍色
      transparent: true,
      opacity: 0.9,
      size: 7,         // 大雨滴
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  }, [])
  
  useFrame((state) => {
    const time = state.clock.elapsedTime
    const deltaTime = state.clock.getDelta()
    
    // 只在山雷天氣時顯示（普通雨天不顯示雨滴）
    const isRainActive = weather === 'storm'
    const rainIntensity = weather === 'storm' ? 1.2 : 0.0
    
    if (rainRef.current) {
      rainRef.current.visible = isRainActive
      
      if (!isRainActive) return
      
      const geometry = rainRef.current.geometry
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
          positions[i] = (Math.random() - 0.5) * 500
          positions[i + 1] = Math.random() * 100 + 50
          positions[i + 2] = (Math.random() - 0.5) * 500
          ages[particleIndex] = 0
          
          // 重新設定速度
          velocities[i] = (Math.random() - 0.5) * 2
          velocities[i + 1] = -Math.random() * 8 - 6
          velocities[i + 2] = (Math.random() - 0.5) * 1.5
        } else {
          // 更新位置 - 山雨移動
          positions[i] += velocities[i] * deltaTime * rainIntensity
          positions[i + 1] += velocities[i + 1] * deltaTime * rainIntensity
          positions[i + 2] += velocities[i + 2] * deltaTime * rainIntensity
          
          // 添加輕微風雨擺動
          positions[i] += Math.sin(time * 2 + particleIndex * 0.05) * 0.03
          positions[i + 2] += Math.cos(time * 1.8 + particleIndex * 0.05) * 0.02
          
          // 邊界重置
          if (positions[i + 1] < -5) {
            positions[i + 1] = Math.random() * 100 + 50
            positions[i] = (Math.random() - 0.5) * 500
            positions[i + 2] = (Math.random() - 0.5) * 500
          }
          
          if (Math.abs(positions[i]) > 300 || Math.abs(positions[i + 2]) > 300) {
            positions[i] = (Math.random() - 0.5) * 500
            positions[i + 2] = (Math.random() - 0.5) * 500
            positions[i + 1] = Math.random() * 100 + 50
          }
        }
      }
      
      geometry.attributes.position.needsUpdate = true
      geometry.attributes.age.needsUpdate = true
      
      // 調整材質透明度
      const material = rainRef.current.material as THREE.PointsMaterial
      material.opacity = 0.9 * rainIntensity
    }
  })
  
  return (
    <points
      ref={rainRef}
      geometry={mountainRainGeometry}
      material={mountainRainMaterial}
    />
  )
}