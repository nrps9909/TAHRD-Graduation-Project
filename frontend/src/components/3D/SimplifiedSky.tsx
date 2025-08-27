import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTimeStore } from '@/stores/timeStore'

// 簡單的太陽組件
export const Sun = () => {
  const sunRef = useRef<THREE.Mesh>(null)
  const { timeOfDay } = useTimeStore()
  
  useFrame((state) => {
    if (sunRef.current) {
      // 太陽自轉和閃爍
      const time = state.clock.elapsedTime
      sunRef.current.rotation.z += 0.01
      sunRef.current.material.opacity = timeOfDay === 'day' ? 0.8 + Math.sin(time * 2) * 0.1 : 0
    }
  })

  if (timeOfDay === 'night') return null

  return (
    <mesh ref={sunRef} position={[0, 80, -100]}>
      <sphereGeometry args={[12, 16, 16]} />
      <meshBasicMaterial 
        color="#FFF700" 
        transparent 
        opacity={0.9}
      />
      
      {/* 太陽光暈 */}
      <mesh position={[0, 0, -0.1]}>
        <ringGeometry args={[15, 20, 16]} />
        <meshBasicMaterial 
          color="#FFFF00" 
          transparent 
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
    </mesh>
  )
}

// 移動的白雲
export const MovingClouds = () => {
  const cloudsRef = useRef<THREE.Group>(null)
  const { timeOfDay } = useTimeStore()
  
  const cloudPositions = [
    [-80, 60, -120],
    [120, 70, -150],
    [-60, 80, -100],
    [100, 65, -180],
    [-120, 75, -160],
    [80, 55, -130]
  ]
  
  useFrame((state) => {
    if (cloudsRef.current) {
      const time = state.clock.elapsedTime
      
      // 整體雲層移動
      cloudsRef.current.position.x = Math.sin(time * 0.02) * 20
      cloudsRef.current.position.z = Math.cos(time * 0.015) * 15
      
      // 個別雲朵飄動
      cloudsRef.current.children.forEach((cloud, index) => {
        if (cloud instanceof THREE.Group) {
          const offset = index * 0.3
          const originalPos = cloudPositions[index]
          
          cloud.position.x = originalPos[0] + Math.sin(time * 0.01 + offset) * 10
          cloud.position.z = originalPos[2] + Math.cos(time * 0.008 + offset) * 8
          cloud.position.y = originalPos[1] + Math.sin(time * 0.005 + offset) * 3
        }
      })
    }
  })

  if (timeOfDay === 'night') return null

  return (
    <group ref={cloudsRef}>
      {cloudPositions.map((position, index) => (
        <group key={index} position={position as [number, number, number]}>
          {/* 多個球體組成一朵雲 */}
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[4, 8, 6]} />
            <meshLambertMaterial color="#ffffff" transparent opacity={0.8} />
          </mesh>
          <mesh position={[5, 0, 1]}>
            <sphereGeometry args={[3.5, 8, 6]} />
            <meshLambertMaterial color="#ffffff" transparent opacity={0.8} />
          </mesh>
          <mesh position={[-4, 0, -1]}>
            <sphereGeometry args={[3.8, 8, 6]} />
            <meshLambertMaterial color="#ffffff" transparent opacity={0.8} />
          </mesh>
          <mesh position={[2, 1, -2]}>
            <sphereGeometry args={[3.2, 8, 6]} />
            <meshLambertMaterial color="#ffffff" transparent opacity={0.8} />
          </mesh>
          <mesh position={[-2, 1, 2]}>
            <sphereGeometry args={[3.6, 8, 6]} />
            <meshLambertMaterial color="#ffffff" transparent opacity={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// 夜晚星星系統
export const NightStars = () => {
  const starsRef = useRef<THREE.Points>(null)
  const { timeOfDay } = useTimeStore()
  
  const starsGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(1500 * 3) // 1500顆星星
    const colors = new Float32Array(1500 * 3)
    const sizes = new Float32Array(1500)
    
    for (let i = 0; i < 1500; i++) {
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
      
      sizes[i] = Math.random() * 1.5 + 0.5
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
          float twinkle = sin(time * 2.0 + position.x * 0.01 + position.z * 0.01) * 0.5 + 0.5;
          gl_PointSize = size * (0.5 + twinkle * 0.5);
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
          
          float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
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
      starsRef.current.material.uniforms.opacity.value = timeOfDay === 'night' ? 0.8 : 0
      
      // 緩慢旋轉星空
      starsRef.current.rotation.y += 0.0001
    }
  })

  return (
    <points ref={starsRef} geometry={starsGeometry} material={starsMaterial} />
  )
}

// 流星效果
export const ShootingStars = () => {
  const meteorRef = useRef<THREE.Group>(null)
  const { timeOfDay } = useTimeStore()
  
  const meteors = useMemo(() => {
    const meteorArray = []
    for (let i = 0; i < 2; i++) {
      meteorArray.push({
        id: i,
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 300,
          150 + Math.random() * 80,
          (Math.random() - 0.5) * 300
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 3,
          -Math.random() * 2 - 1,
          (Math.random() - 0.5) * 3
        ),
        life: Math.random() * 150 + 100,
        active: Math.random() < 0.3 // 30%機率活躍
      })
    }
    return meteorArray
  }, [])
  
  useFrame(() => {
    if (meteorRef.current && timeOfDay === 'night') {
      meteors.forEach((meteor, index) => {
        const meteorMesh = meteorRef.current!.children[index] as THREE.Mesh
        if (meteorMesh && meteor.active) {
          // 更新流星位置
          meteor.position.add(meteor.velocity)
          meteorMesh.position.copy(meteor.position)
          meteorMesh.visible = true
          
          // 重置流星
          meteor.life -= 1
          if (meteor.life <= 0) {
            meteor.position.set(
              (Math.random() - 0.5) * 300,
              150 + Math.random() * 80,
              (Math.random() - 0.5) * 300
            )
            meteor.life = Math.random() * 300 + 200
            meteor.active = Math.random() < 0.15 // 15%機率重新活躍
          }
        } else if (meteorMesh) {
          meteorMesh.visible = false
        }
      })
    }
  })
  
  if (timeOfDay === 'day') return null
  
  return (
    <group ref={meteorRef}>
      {meteors.map((meteor) => (
        <mesh key={meteor.id} position={meteor.position.toArray()}>
          <sphereGeometry args={[0.8, 4, 4]} />
          <meshBasicMaterial 
            color="#ffffff" 
            transparent 
            opacity={0.9}
            emissive="#ffffff"
            emissiveIntensity={0.8}
          />
          {/* 流星尾跡 */}
          <mesh position={[0, 0, -3]} rotation={[Math.PI/2, 0, 0]}>
            <coneGeometry args={[0.3, 6, 4]} />
            <meshBasicMaterial 
              color="#ffffff" 
              transparent 
              opacity={0.5}
            />
          </mesh>
        </mesh>
      ))}
    </group>
  )
}

// 月亮組件
export const Moon = () => {
  const moonRef = useRef<THREE.Mesh>(null)
  const { timeOfDay } = useTimeStore()
  
  useFrame((state) => {
    if (moonRef.current) {
      // 月亮輕微搖擺
      const time = state.clock.elapsedTime
      moonRef.current.position.y = 60 + Math.sin(time * 0.3) * 2
      moonRef.current.position.x = Math.cos(time * 0.2) * 3
    }
  })

  if (timeOfDay === 'day') return null

  return (
    <mesh ref={moonRef} position={[50, 60, -80]}>
      <sphereGeometry args={[8, 16, 16]} />
      <meshBasicMaterial 
        color="#E6E6FA" 
        transparent 
        opacity={0.9}
      />
      
      {/* 月光光環 */}
      <mesh position={[0, 0, -0.1]}>
        <ringGeometry args={[10, 15, 16]} />
        <meshBasicMaterial 
          color="#B0C4DE" 
          transparent 
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* 月光光暈 */}
      <mesh position={[0, 0, -0.2]}>
        <ringGeometry args={[16, 25, 16]} />
        <meshBasicMaterial 
          color="#F0F8FF" 
          transparent 
          opacity={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>
    </mesh>
  )
}

// 主要簡化天空組件
export const SimplifiedSky = () => {
  return (
    <group>
      {/* 太陽 */}
      <Sun />
      
      {/* 月亮 */}
      <Moon />
      
      {/* 移動的白雲 */}
      <MovingClouds />
      
      {/* 夜晚星星 */}
      <NightStars />
      
      {/* 流星 */}
      <ShootingStars />
    </group>
  )
}