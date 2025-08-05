import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface ParticleEffectsProps {
  weather: string
  season: string
}

export const ParticleEffects = ({ weather, season }: ParticleEffectsProps) => {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  
  // 創建粒子數據
  const particles = useMemo(() => {
    const count = weather === 'rainy' ? 50 : season === 'spring' ? 30 : 20
    
    return Array.from({ length: count }, () => ({
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 40,
        Math.random() * 15,
        (Math.random() - 0.5) * 40
      ),
      velocity: new THREE.Vector3(0, -Math.random() * 2 - 3, 0),
      phase: Math.random() * Math.PI * 2
    }))
  }, [weather, season])
  
  // 動畫
  useFrame((state, delta) => {
    if (!meshRef.current) return
    
    particles.forEach((particle, i) => {
      if (weather === 'rainy') {
        // 雨滴下落
        particle.position.y -= delta * 5
        if (particle.position.y < 0) {
          particle.position.y = 15
          particle.position.x = (Math.random() - 0.5) * 40
          particle.position.z = (Math.random() - 0.5) * 40
        }
      } else {
        // 飄動效果
        particle.position.y += Math.sin(state.clock.elapsedTime + particle.phase) * delta * 0.2
        particle.position.x += Math.sin(state.clock.elapsedTime * 0.5 + particle.phase) * delta * 0.1
        
        if (particle.position.y > 15) particle.position.y = 0
        if (particle.position.y < 0) particle.position.y = 15
      }
      
      // 更新實例矩陣
      dummy.position.copy(particle.position)
      dummy.updateMatrix()
      meshRef.current!.setMatrixAt(i, dummy.matrix)
    })
    
    meshRef.current.instanceMatrix.needsUpdate = true
  })
  
  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, particles.length]}
      frustumCulled={false}
    >
      <sphereGeometry args={[0.1, 4, 4]} />
      <meshBasicMaterial 
        color={weather === 'rainy' ? '#87CEEB' : '#FFFFFF'}
        transparent
        opacity={0.6}
      />
    </instancedMesh>
  )
}

// 簡化的螢火蟲效果
export const Fireflies = () => {
  const groupRef = useRef<THREE.Group>(null)
  
  // 創建少量螢火蟲
  const fireflies = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => ({
      id: i,
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 30,
        2 + Math.random() * 5,
        (Math.random() - 0.5) * 30
      ),
      phase: Math.random() * Math.PI * 2,
    }))
  }, [])
  
  useFrame((state) => {
    if (!groupRef.current) return
    
    fireflies.forEach((firefly, i) => {
      const child = groupRef.current?.children[i]
      if (child) {
        const time = state.clock.elapsedTime + firefly.phase
        child.position.x = firefly.position.x + Math.sin(time * 0.5) * 2
        child.position.y = firefly.position.y + Math.sin(time * 0.8) * 1
        child.position.z = firefly.position.z + Math.cos(time * 0.5) * 2
        
        // 閃爍效果
        const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial
        material.opacity = 0.5 + Math.sin(time * 3) * 0.3
      }
    })
  })
  
  return (
    <group ref={groupRef}>
      {fireflies.map((firefly) => (
        <mesh key={firefly.id} position={firefly.position.clone()}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial color="#FFFF00" transparent opacity={0.8} />
        </mesh>
      ))}
    </group>
  )
}