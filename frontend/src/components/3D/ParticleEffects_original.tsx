import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface ParticleEffectsProps {
  weather: string
  season: string
}

export const ParticleEffects = ({ weather, season }: ParticleEffectsProps) => {
  const particlesRef = useRef<THREE.Points>(null)
  const isInitialized = useRef(false)
  
  // 創建粒子幾何和材質
  const particles = useMemo(() => {
    try {
      const count = Math.min(weather === 'rainy' ? 300 : season === 'spring' ? 150 : 80, 500) // 限制粒子數量
      const positions = new Float32Array(count * 3)
      const colors = new Float32Array(count * 3)
      const sizes = new Float32Array(count)
      
      for (let i = 0; i < count; i++) {
        const i3 = i * 3
        
        // 位置 - 在整個場景範圍內隨機分布
        positions[i3] = (Math.random() - 0.5) * 80 // 減少範圍
        positions[i3 + 1] = Math.random() * 25
        positions[i3 + 2] = (Math.random() - 0.5) * 80
        
        // 顏色
        if (weather === 'rainy') {
          // 雨滴 - 藍色
          colors[i3] = 0.5
          colors[i3 + 1] = 0.7
          colors[i3 + 2] = 1
        } else if (season === 'spring') {
          // 櫻花花瓣 - 粉色
          colors[i3] = 1
          colors[i3 + 1] = 0.7 + Math.random() * 0.3
          colors[i3 + 2] = 0.8 + Math.random() * 0.2
        } else if (season === 'autumn') {
          // 落葉 - 橙黃色
          const hue = Math.random() * 0.2
          colors[i3] = 1
          colors[i3 + 1] = 0.5 + hue
          colors[i3 + 2] = 0.1
        } else {
          // 默認 - 光點
          colors[i3] = 1
          colors[i3 + 1] = 1
          colors[i3 + 2] = 0.8
        }
        
        // 大小
        sizes[i] = weather === 'rainy' ? 0.1 : 0.2 + Math.random() * 0.2
      }
      
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
      
      const material = new THREE.PointsMaterial({
        size: 0.3,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: weather === 'rainy' ? 0.6 : 0.7,
        blending: THREE.AdditiveBlending
      })
      
      return { geometry, material, count }
    } catch (error) {
      console.error('Error creating particles:', error)
      return null
    }
  }, [weather, season])
  
  // 清理函數
  useEffect(() => {
    return () => {
      if (particlesRef.current?.geometry) {
        particlesRef.current.geometry.dispose()
      }
      if (particlesRef.current?.material) {
        if (Array.isArray(particlesRef.current.material)) {
          particlesRef.current.material.forEach(material => material.dispose())
        } else {
          particlesRef.current.material.dispose()
        }
      }
      isInitialized.current = false
    }
  }, [weather, season])
  
  // 動畫 - 加強檢查
  useFrame((state, delta) => {
    // 多重安全檢查
    if (!particlesRef.current || !particles) return
    
    const mesh = particlesRef.current
    if (!mesh.geometry || !mesh.geometry.attributes) return
    
    const positionAttribute = mesh.geometry.attributes.position
    if (!positionAttribute || !positionAttribute.array || positionAttribute.array.length === 0) return
    
    // 確保初始化完成
    if (!isInitialized.current) {
      isInitialized.current = true
      return
    }
    
    try {
      const positions = positionAttribute.array as Float32Array
      const maxPositions = positions.length
      
      for (let i = 0; i < maxPositions && i < particles.count * 3; i += 3) {
        if (weather === 'rainy') {
          // 雨滴快速下落
          positions[i + 1] -= delta * 15
          
          // 風的影響
          positions[i] += Math.sin(state.clock.elapsedTime + i) * delta * 0.3
          
          // 重置位置
          if (positions[i + 1] < 0) {
            positions[i] = (Math.random() - 0.5) * 80
            positions[i + 1] = 25
            positions[i + 2] = (Math.random() - 0.5) * 80
          }
        } else if (season === 'spring' || season === 'autumn') {
          // 花瓣/落葉緩慢飄落
          positions[i + 1] -= delta * 1.5
          
          // 螺旋下落效果
          const time = state.clock.elapsedTime
          positions[i] += Math.sin(time + i) * delta * 1.5
          positions[i + 2] += Math.cos(time + i) * delta * 1.5
          
          // 重置位置
          if (positions[i + 1] < 0) {
            positions[i] = (Math.random() - 0.5) * 80
            positions[i + 1] = 15 + Math.random() * 10
            positions[i + 2] = (Math.random() - 0.5) * 80
          }
        } else {
          // 漂浮的光點
          positions[i + 1] += Math.sin(state.clock.elapsedTime + i) * delta * 0.3
          
          // 保持在一定高度範圍內
          if (positions[i + 1] > 15) positions[i + 1] = 5
          if (positions[i + 1] < 5) positions[i + 1] = 15
        }
      }
      
      // 安全更新
      if (positionAttribute && isInitialized.current) {
        positionAttribute.needsUpdate = true
      }
      
      // 旋轉整個粒子系統
      if (season !== 'winter' && weather !== 'rainy' && mesh) {
        mesh.rotation.y += delta * 0.03
      }
    } catch (error) {
      console.error('Error in particle animation:', error)
      // 發生錯誤時停止動畫
      isInitialized.current = false
    }
  })
  
  if (!particles) return null
  
  return <points key={`${weather}-${season}`} ref={particlesRef} {...particles} />
}

// 螢火蟲效果
export const Fireflies = () => {
  const firefliesRef = useRef<THREE.Group>(null)
  const lightRefs = useRef<THREE.PointLight[]>([])
  
  const fireflies = useMemo(() => {
    return Array.from({ length: 15 }, (_, i) => ({
      id: i,
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 80,
        2 + Math.random() * 8,
        (Math.random() - 0.5) * 80
      ),
      phase: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 0.5
    }))
  }, [])
  
  useFrame((state) => {
    if (!firefliesRef.current || firefliesRef.current.children.length === 0) return
    
    fireflies.forEach((firefly, i) => {
      const time = state.clock.elapsedTime * firefly.speed + firefly.phase
      
      // 8字形飛行路徑
      const x = firefly.position.x + Math.sin(time) * 5
      const y = firefly.position.y + Math.sin(time * 2) * 2
      const z = firefly.position.z + Math.cos(time) * 5
      
      const meshIndex = i * 2
      if (firefliesRef.current && meshIndex < firefliesRef.current.children.length) {
        const mesh = firefliesRef.current.children[meshIndex] as THREE.Mesh
        const light = lightRefs.current[i]
        
        // 閃爍效果
        const brightness = 0.5 + Math.sin(time * 3) * 0.5
        
        if (mesh && mesh.material) {
          mesh.position.set(x, y, z)
          ;(mesh.material as THREE.MeshBasicMaterial).opacity = brightness
        }
        
        if (light) {
          light.position.set(x, y, z)
          light.intensity = brightness * 2
        }
      }
    })
  })
  
  return (
    <group ref={firefliesRef}>
      {fireflies.map((firefly, i) => (
        <group key={firefly.id}>
          <mesh position={firefly.position.toArray()}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshBasicMaterial 
              color="#FFFF00" 
              transparent 
              opacity={0.8} 
            />
          </mesh>
          <pointLight
            ref={(el) => { if (el) lightRefs.current[i] = el }}
            position={firefly.position.toArray()}
            color="#FFFF00"
            intensity={2}
            distance={5}
            decay={2}
          />
        </group>
      ))}
    </group>
  )
}