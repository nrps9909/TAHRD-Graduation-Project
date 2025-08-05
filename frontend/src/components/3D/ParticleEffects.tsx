import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface ParticleEffectsProps {
  weather: string
  season: string
}

export const ParticleEffects = ({ weather, season }: ParticleEffectsProps) => {
  const meshRef = useRef<THREE.Points>(null)
  const initialized = useRef(false)
  const geometryRef = useRef<THREE.BufferGeometry | null>(null)
  
  // 創建極簡的粒子系統
  const particleSystem = useMemo(() => {
    try {
      // 大幅減少粒子數量
      const count = weather === 'rainy' ? 50 : season === 'spring' ? 30 : 20
      const positions = new Float32Array(count * 3)
      
      // 初始化位置
      for (let i = 0; i < count; i++) {
        const i3 = i * 3
        positions[i3] = (Math.random() - 0.5) * 40
        positions[i3 + 1] = Math.random() * 15
        positions[i3 + 2] = (Math.random() - 0.5) * 40
      }
      
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      
      // 強制計算邊界球以確保幾何體正確初始化
      geometry.computeBoundingSphere()
      
      const material = new THREE.PointsMaterial({
        size: 0.5,
        sizeAttenuation: true,
        color: weather === 'rainy' ? 0x87CEEB : 0xFFFFFF,
        transparent: true,
        opacity: 0.6,
      })
      
      // 保存幾何體引用
      geometryRef.current = geometry
      
      return { geometry, material, count }
    } catch (error) {
      console.error('Error creating particle system:', error)
      return null
    }
  }, [weather, season])
  
  // 清理資源
  useEffect(() => {
    return () => {
      if (geometryRef.current) {
        geometryRef.current.dispose()
        geometryRef.current = null
      }
      if (meshRef.current) {
        if (meshRef.current.geometry && meshRef.current.geometry !== geometryRef.current) {
          meshRef.current.geometry.dispose()
        }
        if (meshRef.current.material) {
          (meshRef.current.material as THREE.Material).dispose()
        }
      }
      initialized.current = false
    }
  }, [weather, season])
  
  // 極簡動畫
  useFrame((state, delta) => {
    if (!meshRef.current || !particleSystem) return
    
    const mesh = meshRef.current
    const geometry = mesh.geometry
    
    // 基本檢查
    if (!geometry || !geometry.attributes || !geometry.attributes.position) return
    
    const positionAttribute = geometry.attributes.position
    
    // 確保 attribute 有效
    if (!positionAttribute || !positionAttribute.array) return
    
    // 獲取位置數組並檢查
    const positions = positionAttribute.array as Float32Array
    const itemSize = positionAttribute.itemSize || 3
    const count = positionAttribute.count || 0
    
    // 確保數組存在且有效
    if (!positions || positions.length === 0 || count === 0) return
    
    // 初始化檢查
    if (!initialized.current) {
      initialized.current = true
      return
    }
    
    try {
      // 安全的動畫更新 - 使用 count 而不是 positions.length
      for (let i = 0; i < count; i++) {
        const index = i * itemSize
        
        // 邊界檢查
        if (index + 2 >= positions.length) break
        
        if (weather === 'rainy') {
          positions[index + 1] -= delta * 5 // 雨滴下落
          if (positions[index + 1] < 0) {
            positions[index + 1] = 15
          }
        } else {
          positions[index + 1] += Math.sin(state.clock.elapsedTime + i) * delta * 0.2
          if (positions[index + 1] > 15) positions[index + 1] = 0
          if (positions[index + 1] < 0) positions[index + 1] = 15
        }
      }
      
      // 安全更新
      positionAttribute.needsUpdate = true
      
    } catch (error) {
      console.error('Error in particle animation:', error)
      initialized.current = false
    }
  })
  
  if (!particleSystem) return null
  
  return (
    <points
      key={`particles-${weather}-${season}`}
      ref={meshRef}
      geometry={particleSystem.geometry}
      material={particleSystem.material}
      frustumCulled={false}
      onUpdate={(self) => {
        // 確保幾何體已正確附加
        if (self.geometry && !initialized.current) {
          initialized.current = true
        }
      }}
    />
  )
}

// 簡化的螢火蟲效果
export const Fireflies = () => {
  const groupRef = useRef<THREE.Group>(null)
  
  // 創建少量螢火蟲
  const fireflies = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => ({
      id: i,
      position: [
        (Math.random() - 0.5) * 30,
        2 + Math.random() * 5,
        (Math.random() - 0.5) * 30
      ] as [number, number, number],
      phase: Math.random() * Math.PI * 2,
    }))
  }, [])
  
  useFrame((state) => {
    if (!groupRef.current) return
    
    fireflies.forEach((firefly, i) => {
      const child = groupRef.current?.children[i]
      if (child) {
        const time = state.clock.elapsedTime + firefly.phase
        child.position.x = firefly.position[0] + Math.sin(time * 0.5) * 2
        child.position.y = firefly.position[1] + Math.sin(time * 0.8) * 1
        child.position.z = firefly.position[2] + Math.cos(time * 0.5) * 2
      }
    })
  })
  
  return (
    <group ref={groupRef}>
      {fireflies.map((firefly) => (
        <mesh key={firefly.id} position={firefly.position}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial color="#FFFF00" transparent opacity={0.8} />
        </mesh>
      ))}
    </group>
  )
}