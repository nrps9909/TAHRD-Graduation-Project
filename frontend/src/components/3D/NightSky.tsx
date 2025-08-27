import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTimeStore } from '@/stores/timeStore'

// 夜晚星星系統
export const NightStars = () => {
  const starsRef = useRef<THREE.Points>(null)
  const { timeOfDay } = useTimeStore()
  
  const starsGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(800 * 3) // 800顆星星
    const colors = new Float32Array(800 * 3)
    const sizes = new Float32Array(800)
    
    for (let i = 0; i < 800; i++) {
      const i3 = i * 3
      
      // 在天球上隨機分布
      const radius = 300
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i3 + 1] = Math.abs(radius * Math.cos(phi)) + 20 // 只在天空上方
      positions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
      
      // 星星顏色：白色到淡藍色
      const colorVariation = Math.random()
      colors[i3] = 0.8 + colorVariation * 0.2
      colors[i3 + 1] = 0.8 + colorVariation * 0.2  
      colors[i3 + 2] = 0.9 + colorVariation * 0.1
      
      sizes[i] = Math.random() * 1.2 + 0.3
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    
    return geometry
  }, [])
  
  const starsMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        opacity: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        uniform float time;
        
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          
          // 閃爍效果
          float twinkle = sin(time * 1.5 + position.x * 0.01 + position.z * 0.01) * 0.5 + 0.5;
          gl_PointSize = size * (0.8 + twinkle * 0.4);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        uniform float opacity;
        
        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          if (dist > 0.5) discard;
          
          float alpha = 1.0 - smoothstep(0.2, 0.5, dist);
          alpha *= opacity;
          
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      vertexColors: true
    })
  }, [])
  
  useFrame((state) => {
    if (starsRef.current && starsRef.current.material instanceof THREE.ShaderMaterial) {
      starsRef.current.material.uniforms.time.value = state.clock.elapsedTime
      starsRef.current.material.uniforms.opacity.value = timeOfDay === 'night' ? 0.9 : 0
      
      // 緩慢旋轉星空
      starsRef.current.rotation.y += 0.0002
    }
  })

  return (
    <points ref={starsRef} geometry={starsGeometry} material={starsMaterial} />
  )
}

// 夜晚空氣粒子
export const NightAirParticles = () => {
  const particlesRef = useRef<THREE.Points>(null)
  const { timeOfDay } = useTimeStore()
  
  const particlesGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(200 * 3) // 200個細小粒子
    const velocities = new Float32Array(200 * 3)
    const sizes = new Float32Array(200)
    
    for (let i = 0; i < 200; i++) {
      const i3 = i * 3
      
      // 在場景周圍隨機分布
      positions[i3] = (Math.random() - 0.5) * 100     // x
      positions[i3 + 1] = Math.random() * 30 + 5      // y
      positions[i3 + 2] = (Math.random() - 0.5) * 100 // z
      
      // 非常緩慢的飄動速度
      velocities[i3] = (Math.random() - 0.5) * 0.02
      velocities[i3 + 1] = Math.random() * 0.01 + 0.005
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.02
      
      sizes[i] = Math.random() * 0.3 + 0.1 // 非常細小
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    
    return geometry
  }, [])
  
  const particlesMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      color: 0xF0F8FF, // 淡藍白色
      size: 0.2,
      transparent: true,
      opacity: 0,
      sizeAttenuation: true
    })
  }, [])
  
  useFrame((state) => {
    if (!particlesRef.current) return
    
    const time = state.clock.elapsedTime
    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array
    const velocities = particlesRef.current.geometry.attributes.velocity.array as Float32Array
    
    // 只在夜晚顯示
    particlesRef.current.material.opacity = timeOfDay === 'night' ? 0.3 : 0
    
    if (timeOfDay === 'night') {
      for (let i = 0; i < positions.length; i += 3) {
        // 緩慢飄動
        positions[i] += velocities[i]
        positions[i + 1] += velocities[i + 1]
        positions[i + 2] += velocities[i + 2]
        
        // 添加輕微的正弦波飄動
        positions[i] += Math.sin(time * 0.1 + i * 0.01) * 0.01
        positions[i + 2] += Math.cos(time * 0.08 + i * 0.01) * 0.01
        
        // 邊界重置
        if (positions[i + 1] > 35) {
          positions[i + 1] = 5
          positions[i] = (Math.random() - 0.5) * 100
          positions[i + 2] = (Math.random() - 0.5) * 100
        }
        
        if (Math.abs(positions[i]) > 50) {
          positions[i] = (Math.random() - 0.5) * 100
        }
        if (Math.abs(positions[i + 2]) > 50) {
          positions[i + 2] = (Math.random() - 0.5) * 100
        }
      }
      
      particlesRef.current.geometry.attributes.position.needsUpdate = true
    }
  })

  return (
    <points ref={particlesRef} geometry={particlesGeometry} material={particlesMaterial} />
  )
}

// 天頂月亮
export const Moon = () => {
  const moonRef = useRef<THREE.Mesh>(null)
  const { timeOfDay } = useTimeStore()
  
  useFrame((state) => {
    if (moonRef.current) {
      // 月亮非常輕微的搖擺
      const time = state.clock.elapsedTime
      moonRef.current.position.y = 100 + Math.sin(time * 0.2) * 1
      moonRef.current.position.x = Math.cos(time * 0.15) * 2
    }
  })

  if (timeOfDay === 'day') return null

  return (
    <mesh ref={moonRef} position={[0, 100, 0]}>
      <sphereGeometry args={[6, 16, 16]} />
      <meshBasicMaterial 
        color="#E6E6FA" 
        transparent 
        opacity={0.9}
      />
      
      {/* 月光光環 */}
      <mesh position={[0, 0, -0.1]}>
        <ringGeometry args={[8, 12, 16]} />
        <meshBasicMaterial 
          color="#B0C4DE" 
          transparent 
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* 外層光暈 */}
      <mesh position={[0, 0, -0.2]}>
        <ringGeometry args={[13, 18, 16]} />
        <meshBasicMaterial 
          color="#F0F8FF" 
          transparent 
          opacity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
    </mesh>
  )
}

// 夜空主組件
export const NightSky = () => {
  return (
    <group>
      {/* 星星 */}
      <NightStars />
      
      {/* 移除空氣粒子以避免方形粒子效果 */}
      {/* <NightAirParticles /> */}
    </group>
  )
}