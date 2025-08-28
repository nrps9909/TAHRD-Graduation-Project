import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTimeStore } from '@/stores/timeStore'

// 大風效果組件
export const WindEffect = () => {
  const { weather } = useTimeStore()
  const windParticlesRef = useRef<THREE.Points>(null)
  
  // 創建風線條效果 - 表現風的方向和強度
  const windLines = useMemo(() => {
    const lines = []
    const lineCount = 120 // 增加風線條數量讓效果更明顯
    
    for (let i = 0; i < lineCount; i++) {
      const geometry = new THREE.BufferGeometry()
      const positions = new Float32Array([
        0, 0, 0,        // 起點
        3, 0, 0.5       // 終點 - 創建傾斜的風線
      ])
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      
      const material = new THREE.LineBasicMaterial({
        color: 0xE0F6FF,
        transparent: true,
        opacity: 0.3,
        linewidth: 1
      })
      
      const line = new THREE.Line(geometry, material)
      
      // 設置初始位置 - 分布在較大範圍
      line.position.set(
        (Math.random() - 0.5) * 300,    // x: -150 到 150
        Math.random() * 80 + 10,        // y: 10 到 90
        (Math.random() - 0.5) * 300     // z: -150 到 150
      )
      
      // 隨機旋轉角度
      line.rotation.y = Math.random() * Math.PI * 2
      line.rotation.z = (Math.random() - 0.5) * 0.3
      
      // 儲存速度和生命週期
      line.userData = {
        velocity: {
          x: 8 + Math.random() * 12,      // 8-20 更快的橫向速度
          y: (Math.random() - 0.5) * 0.8, // 更強的上下擺動
          z: (Math.random() - 0.5) * 3    // 更強的前後擺動
        },
        lifetime: Math.random() * 2 + 1,  // 1-3秒更短生命週期，讓更新更頻繁
        age: 0,
        initialOpacity: 0.4 + Math.random() * 0.4
      }
      
      lines.push(line)
    }
    
    return lines
  }, [])
  
  // 創建風塵粒子效果 - 被吹起的塵土和細小顆粒
  const windParticles = useMemo(() => {
    const particleCount = 400 // 增加塵土粒子數量
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const velocities = new Float32Array(particleCount * 3)
    const lifetimes = new Float32Array(particleCount)
    const sizes = new Float32Array(particleCount)
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3
      
      // 初始位置
      positions[i3] = (Math.random() - 0.5) * 200
      positions[i3 + 1] = Math.random() * 5 + 1        // 低空 1-6米
      positions[i3 + 2] = (Math.random() - 0.5) * 200
      
      // 速度
      velocities[i3] = 1.5 + Math.random() * 2.5       // 1.5-4 橫向速度
      velocities[i3 + 1] = Math.random() * 0.5 + 0.2   // 0.2-0.7 向上速度
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.8 // 前後飄動
      
      lifetimes[i] = Math.random() * 6 + 3              // 3-9秒，更持久
      sizes[i] = Math.random() * 1.5 + 0.3             // 0.3-1.8 更細小的粒子
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3))
    geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    
    return geometry
  }, [])
  
  const windParticleMaterial = useMemo(() => {
    // 創建細緻的塵土紋理
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const context = canvas.getContext('2d')!
    
    context.clearRect(0, 0, 32, 32)
    
    // 創建不規則的塵土顆粒
    const centerX = 16
    const centerY = 16
    
    // 主要顆粒
    const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, 12)
    gradient.addColorStop(0, 'rgba(245, 235, 220, 0.9)')   // 中心土黃色
    gradient.addColorStop(0.4, 'rgba(210, 180, 140, 0.7)') // 中間棕色
    gradient.addColorStop(0.8, 'rgba(160, 130, 100, 0.3)') // 外圍深棕
    gradient.addColorStop(1, 'rgba(160, 130, 100, 0)')     // 邊緣透明
    
    context.fillStyle = gradient
    context.beginPath()
    context.arc(centerX, centerY, 12, 0, Math.PI * 2)
    context.fill()
    
    // 添加細小顆粒細節
    for (let i = 0; i < 8; i++) {
      const offsetX = (Math.random() - 0.5) * 20
      const offsetY = (Math.random() - 0.5) * 20
      const radius = Math.random() * 2 + 1
      
      context.fillStyle = `rgba(200, 170, 130, ${Math.random() * 0.5 + 0.2})`
      context.beginPath()
      context.arc(centerX + offsetX, centerY + offsetY, radius, 0, Math.PI * 2)
      context.fill()
    }
    
    const texture = new THREE.CanvasTexture(canvas)
    
    return new THREE.PointsMaterial({
      map: texture,
      color: 0xE6D3B7, // 淡土色
      transparent: true,
      opacity: 0.6, // 提高可見度
      size: 0.8,     // 稍大一點
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  }, [])
  
  useFrame((state) => {
    const time = state.clock.elapsedTime
    const deltaTime = state.clock.getDelta()
    
    // 只在大風天氣時顯示塵土粒子效果，山雷不顯示
    const windIntensity = weather === 'windy' ? 1.5 : 0.0
    
    // 移除調試輸出
    
    // 重新啟用塵土粒子效果
    if (windParticlesRef.current) {
      windParticlesRef.current.visible = windIntensity > 0
      
      if (windIntensity > 0) {
        const geometry = windParticlesRef.current.geometry
        const positions = geometry.attributes.position.array as Float32Array
        const velocities = geometry.attributes.velocity.array as Float32Array
        const lifetimes = geometry.attributes.lifetime.array as Float32Array
        
        for (let i = 0; i < positions.length; i += 3) {
          // 更新位置
          positions[i] += velocities[i] * deltaTime * windIntensity
          positions[i + 1] += velocities[i + 1] * deltaTime * windIntensity
          positions[i + 2] += velocities[i + 2] * deltaTime * windIntensity
          
          // 添加湍流效果
          const particleIndex = i / 3
          positions[i] += Math.sin(time * 3 + particleIndex * 0.1) * 0.02
          positions[i + 1] += Math.cos(time * 2 + particleIndex * 0.1) * 0.01
          
          // 重置超出範圍的粒子
          if (positions[i] > 150 || positions[i + 1] > 60) {
            positions[i] = -100 + Math.random() * 50
            positions[i + 1] = Math.random() * 5 + 1
            positions[i + 2] = (Math.random() - 0.5) * 200
          }
          
          if (positions[i] < -150) {
            positions[i] = 100 + Math.random() * 50
            positions[i + 1] = Math.random() * 5 + 1
            positions[i + 2] = (Math.random() - 0.5) * 200
          }
        }
        
        geometry.attributes.position.needsUpdate = true
        
        // 調整材質透明度
        const material = windParticlesRef.current.material as THREE.PointsMaterial
        material.opacity = 0.4 * windIntensity
      }
    }
  })
  
  return (
    <group>
      {/* 風塵粒子效果 */}
      <points
        ref={windParticlesRef}
        geometry={windParticles}
        material={windParticleMaterial}
      />
    </group>
  )
}