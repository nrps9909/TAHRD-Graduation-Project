import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTimeStore } from '@/stores/timeStore'

// 日出日落光暈效果
export const SunGlow = () => {
  const glowRef = useRef<THREE.Mesh>(null)
  const { hour, timeOfDay } = useTimeStore()
  
  // 創建光暈材質
  const glowMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        opacity: { value: 0 },
        sunColor: { value: new THREE.Color('#FF6347') },
        glowIntensity: { value: 1.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float opacity;
        uniform vec3 sunColor;
        uniform float glowIntensity;
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          // 創建放射狀光暈
          vec2 center = vec2(0.5, 0.2); // 太陽在地平線上的位置
          float dist = distance(vUv, center);
          
          // 光暈效果
          float glow = exp(-dist * 3.0) * glowIntensity;
          
          // 動態閃爍效果
          float flicker = sin(time * 2.0) * 0.1 + 0.9;
          glow *= flicker;
          
          // 創建光線射向天空的效果
          float angle = atan(vUv.y - center.y, vUv.x - center.x);
          float rays = sin(angle * 12.0) * 0.3 + 0.7;
          rays *= smoothstep(0.0, 0.3, dist) * (1.0 - smoothstep(0.3, 0.8, dist));
          
          vec3 color = sunColor * (glow + rays * 0.5);
          
          gl_FragColor = vec4(color, opacity * (glow + rays * 0.3));
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  }, [])
  
  useFrame((state) => {
    if (glowRef.current && glowRef.current.material instanceof THREE.ShaderMaterial) {
      // 更新時間
      glowRef.current.material.uniforms.time.value = state.clock.elapsedTime
      
      // 根據時間段調整光暈效果
      let opacity = 0
      let glowColor = new THREE.Color('#FF6347')
      let intensity = 1.0
      
      // 日出效果 (5-8點)
      if (hour >= 5 && hour <= 8) {
        opacity = Math.sin((hour - 5) / 3 * Math.PI) * 0.8
        glowColor = new THREE.Color('#FF8C69') // 橙紅色
        intensity = 1.2
      }
      // 日落效果 (17-20點)
      else if (hour >= 17 && hour <= 20) {
        opacity = Math.sin((hour - 17) / 3 * Math.PI) * 0.9
        glowColor = new THREE.Color('#DC143C') // 深紅色
        intensity = 1.5
      }
      
      glowRef.current.material.uniforms.opacity.value = opacity
      glowRef.current.material.uniforms.sunColor.value = glowColor
      glowRef.current.material.uniforms.glowIntensity.value = intensity
    }
  })
  
  return (
    <mesh ref={glowRef} position={[0, 25, -200]} rotation={[0, 0, 0]}>
      <planeGeometry args={[300, 150]} />
      <primitive object={glowMaterial} />
    </mesh>
  )
}

// 地平線漸變效果
export const HorizonGradient = () => {
  const gradientRef = useRef<THREE.Mesh>(null)
  const { hour } = useTimeStore()
  
  const gradientMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color('#87CEEB') },
        bottomColor: { value: new THREE.Color('#FF6347') },
        opacity: { value: 0 },
        gradientHeight: { value: 0.3 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float opacity;
        uniform float gradientHeight;
        varying vec2 vUv;
        
        void main() {
          float gradient = smoothstep(0.0, gradientHeight, vUv.y);
          vec3 color = mix(bottomColor, topColor, gradient);
          gl_FragColor = vec4(color, opacity * (1.0 - vUv.y));
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide
    })
  }, [])
  
  useFrame(() => {
    if (gradientRef.current && gradientRef.current.material instanceof THREE.ShaderMaterial) {
      let opacity = 0
      let topColor = new THREE.Color('#87CEEB')
      let bottomColor = new THREE.Color('#FF6347')
      
      // 日出漸變 (5-8點)
      if (hour >= 5 && hour <= 8) {
        opacity = Math.sin((hour - 5) / 3 * Math.PI) * 0.6
        topColor = new THREE.Color('#FFB347') // 淡橙色
        bottomColor = new THREE.Color('#FF4500') // 橙紅色
      }
      // 日落漸變 (17-20點)  
      else if (hour >= 17 && hour <= 20) {
        opacity = Math.sin((hour - 17) / 3 * Math.PI) * 0.7
        topColor = new THREE.Color('#FF69B4') // 熱粉色
        bottomColor = new THREE.Color('#8B0000') // 深紅色
      }
      
      gradientRef.current.material.uniforms.opacity.value = opacity
      gradientRef.current.material.uniforms.topColor.value = topColor
      gradientRef.current.material.uniforms.bottomColor.value = bottomColor
    }
  })
  
  return (
    <mesh ref={gradientRef} position={[0, 30, 0]}>
      <sphereGeometry args={[400, 32, 16]} />
      <primitive object={gradientMaterial} />
    </mesh>
  )
}

// 雲朵染色效果
export const ColoredClouds = () => {
  const cloudsRef = useRef<THREE.Group>(null)
  const { hour } = useTimeStore()
  
  // 創建幾朵雲用於染色效果
  const cloudPositions = [
    [-100, 80, -150],
    [120, 70, -180],
    [-80, 90, -120],
    [60, 85, -200]
  ]
  
  useFrame((state) => {
    if (cloudsRef.current) {
      const time = state.clock.elapsedTime
      
      // 整體雲層平移效果
      cloudsRef.current.position.x = Math.sin(time * 0.08) * 30
      cloudsRef.current.position.z = Math.cos(time * 0.06) * 25
      
      // 個別雲朵的飄動
      cloudsRef.current.children.forEach((cloud, index) => {
        if (cloud instanceof THREE.Mesh) {
          const offset = index * 0.5
          const originalPos = cloudPositions[index]
          
          // 添加飄動效果
          cloud.position.x = originalPos[0] + Math.sin(time * 0.03 + offset) * 8
          cloud.position.z = originalPos[2] + Math.cos(time * 0.04 + offset) * 6
          cloud.position.y = originalPos[1] + Math.sin(time * 0.02 + offset) * 2
        }
      })
      
      let cloudColor = new THREE.Color('#ffffff')
      let opacity = 0.3
      
      // 日出時雲朵染色
      if (hour >= 5 && hour <= 8) {
        cloudColor = new THREE.Color('#FFB347') // 金橙色
        opacity = 0.6
      }
      // 日落時雲朵染色
      else if (hour >= 17 && hour <= 20) {
        cloudColor = new THREE.Color('#FF69B4') // 粉紅色
        opacity = 0.7
      }
      
      // 更新所有雲朵顏色
      cloudsRef.current.children.forEach((cloud) => {
        if (cloud instanceof THREE.Mesh && cloud.material instanceof THREE.MeshLambertMaterial) {
          cloud.material.color = cloudColor
          cloud.material.opacity = opacity
        }
      })
    }
  })
  
  return (
    <group ref={cloudsRef}>
      {cloudPositions.map((position, index) => (
        <mesh key={index} position={position as [number, number, number]}>
          <sphereGeometry args={[8, 8, 6]} />
          <meshLambertMaterial color="#ffffff" transparent opacity={0.3} />
        </mesh>
      ))}
    </group>
  )
}

// 主日出日落效果組件
export const SunriseEffect = () => {
  return (
    <group>
      {/* 太陽光暈 */}
      <SunGlow />
      
      {/* 地平線漸變 */}
      <HorizonGradient />
      
      {/* 染色雲朵 */}
      <ColoredClouds />
    </group>
  )
}