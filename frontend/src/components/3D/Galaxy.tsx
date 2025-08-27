import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTimeStore } from '@/stores/timeStore'

// 銀河系背景
export const Galaxy = () => {
  const galaxyRef = useRef<THREE.Points>(null)
  const { timeOfDay, hour } = useTimeStore()
  
  // 創建銀河系幾何體
  const { geometry, material } = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(8000 * 3) // 8000個星點
    const colors = new Float32Array(8000 * 3)
    const sizes = new Float32Array(8000)
    
    for (let i = 0; i < 8000; i++) {
      const i3 = i * 3
      
      // 創建螺旋銀河結構
      const radius = Math.random() * 400 + 100
      const angle = Math.random() * Math.PI * 4 // 螺旋臂
      const height = (Math.random() - 0.5) * 20
      
      // 螺旋銀河形狀
      positions[i3] = Math.cos(angle) * radius + (Math.random() - 0.5) * 50
      positions[i3 + 1] = height + 200 + Math.random() * 100 // 在天空高處
      positions[i3 + 2] = Math.sin(angle) * radius + (Math.random() - 0.5) * 50
      
      // 星星顏色 - 不同類型的恆星
      const starType = Math.random()
      if (starType < 0.3) {
        // 藍白色恆星
        colors[i3] = 0.8 + Math.random() * 0.2     // R
        colors[i3 + 1] = 0.9 + Math.random() * 0.1 // G
        colors[i3 + 2] = 1.0                       // B
      } else if (starType < 0.6) {
        // 黃白色恆星 (像太陽)
        colors[i3] = 1.0                           // R
        colors[i3 + 1] = 0.9 + Math.random() * 0.1 // G
        colors[i3 + 2] = 0.7 + Math.random() * 0.2 // B
      } else {
        // 紅色恆星
        colors[i3] = 1.0                           // R
        colors[i3 + 1] = 0.5 + Math.random() * 0.3 // G
        colors[i3 + 2] = 0.3 + Math.random() * 0.2 // B
      }
      
      // 星星大小 - 大幅減小
      sizes[i] = Math.random() * 0.8 + 0.2
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    
    const material = new THREE.ShaderMaterial({
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
          
          // 更微妙的閃爍效果
          float twinkle = sin(time * 1.0 + position.x * 0.005 + position.z * 0.005) * 0.3 + 0.7;
          gl_PointSize = size * (1.0 + twinkle * 0.2); // 減小基礎大小和閃爍幅度
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        uniform float opacity;
        
        void main() {
          // 創建圓形星點
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          if (dist > 0.5) discard;
          
          // 軟邊效果
          float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
          alpha *= opacity;
          
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      vertexColors: true
    })
    
    return { geometry, material }
  }, [])
  
  useFrame((state) => {
    if (galaxyRef.current && galaxyRef.current.material instanceof THREE.ShaderMaterial) {
      // 更新時間
      galaxyRef.current.material.uniforms.time.value = state.clock.elapsedTime
      
      // 根據時間調整銀河系可見度 - 更透明
      let opacity = 0
      if (hour >= 22 || hour <= 4) {
        opacity = 0.4 // 深夜時適中透明度（大幅降低）
      } else if (hour >= 20 || hour <= 6) {
        opacity = 0.2 // 傍晚/清晨時更透明
      }
      
      galaxyRef.current.material.uniforms.opacity.value = opacity
      
      // 緩慢旋轉銀河系
      galaxyRef.current.rotation.y += 0.0001
      galaxyRef.current.rotation.z += 0.00005
    }
  })
  
  return (
    <points ref={galaxyRef} geometry={geometry} material={material} />
  )
}

// 流星效果
export const ShootingStars = () => {
  const meteorRef = useRef<THREE.Group>(null)
  const meteors = useMemo(() => {
    const meteorArray = []
    for (let i = 0; i < 3; i++) {
      meteorArray.push({
        id: i,
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 400,
          200 + Math.random() * 100,
          (Math.random() - 0.5) * 400
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          -Math.random() * 1 - 0.5,
          (Math.random() - 0.5) * 2
        ),
        life: Math.random() * 100 + 50
      })
    }
    return meteorArray
  }, [])
  
  useFrame(() => {
    if (meteorRef.current) {
      meteors.forEach((meteor, index) => {
        const meteorMesh = meteorRef.current!.children[index] as THREE.Mesh
        if (meteorMesh) {
          // 更新流星位置
          meteor.position.add(meteor.velocity)
          meteorMesh.position.copy(meteor.position)
          
          // 重置流星
          meteor.life -= 1
          if (meteor.life <= 0) {
            meteor.position.set(
              (Math.random() - 0.5) * 400,
              200 + Math.random() * 100,
              (Math.random() - 0.5) * 400
            )
            meteor.life = Math.random() * 200 + 100
          }
        }
      })
    }
  })
  
  return (
    <group ref={meteorRef}>
      {meteors.map((meteor) => (
        <mesh key={meteor.id} position={meteor.position.toArray()}>
          <sphereGeometry args={[0.5, 4, 4]} />
          <meshBasicMaterial 
            color="#ffffff" 
            transparent 
            opacity={0.8}
            emissive="#ffffff"
            emissiveIntensity={0.5}
          />
          {/* 流星尾跡 */}
          <mesh position={[0, 0, -2]}>
            <coneGeometry args={[0.2, 4, 3]} />
            <meshBasicMaterial 
              color="#ffffff" 
              transparent 
              opacity={0.3}
            />
          </mesh>
        </mesh>
      ))}
    </group>
  )
}