import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTimeStore } from '@/stores/timeStore'

// 魔法懸浮光粒子組件
export const MagicalFloatingParticles = () => {
  const particlesRef = useRef<THREE.Points>(null)
  const { timeOfDay, hour, weather } = useTimeStore()
  
  const particleGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(80 * 3) // 80個魔法光粒子 (減少60%)
    const velocities = new Float32Array(80 * 3)
    const scales = new Float32Array(80)
    const glowIntensities = new Float32Array(80) // 發光強度
    const flickerPhases = new Float32Array(80) // 閃爍相位
    const depths = new Float32Array(80) // 深度層次
    
    for (let i = 0; i < 80; i++) {
      const i3 = i * 3
      
      // 在整個場景空間中分布，但集中在中低空
      const radius = Math.random() * 120 + 20
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI * 0.7 // 主要在上半空間
      
      positions[i3] = Math.sin(phi) * Math.cos(theta) * radius
      positions[i3 + 1] = Math.random() * 40 + 10 // 10-50米高度，避免貼地
      positions[i3 + 2] = Math.sin(phi) * Math.sin(theta) * radius
      
      // 非常緩慢優雅的飄動
      velocities[i3] = (Math.random() - 0.5) * 0.008     // X方向微風
      velocities[i3 + 1] = Math.random() * 0.003 + 0.001 // 輕微上升
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.008 // Z方向微風
      
      scales[i] = Math.random() * 0.8 + 0.4 // 0.4-1.2倍大小
      glowIntensities[i] = Math.random() * 0.6 + 0.4 // 0.4-1.0發光強度
      flickerPhases[i] = Math.random() * Math.PI * 2 // 隨機閃爍相位
      depths[i] = Math.random() // 深度層次用於視差效果
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3))
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1))
    geometry.setAttribute('glowIntensity', new THREE.BufferAttribute(glowIntensities, 1))
    geometry.setAttribute('flickerPhase', new THREE.BufferAttribute(flickerPhases, 1))
    geometry.setAttribute('depth', new THREE.BufferAttribute(depths, 1))
    
    return geometry
  }, [])
  
  const particleMaterial = useMemo(() => {
    // 創建發光光粒子紋理
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const context = canvas.getContext('2d')!
    
    context.clearRect(0, 0, 512, 512)
    
    const centerX = 256
    const centerY = 256
    
    // 創建多層光暈效果
    // 核心光點
    const coreGradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, 60)
    coreGradient.addColorStop(0, 'rgba(255, 248, 220, 1.0)')    // 溫暖的核心
    coreGradient.addColorStop(0.3, 'rgba(255, 245, 200, 0.9)')
    coreGradient.addColorStop(0.6, 'rgba(255, 240, 180, 0.6)')
    coreGradient.addColorStop(0.8, 'rgba(255, 235, 160, 0.3)')
    coreGradient.addColorStop(1, 'rgba(255, 230, 140, 0)')
    
    context.fillStyle = coreGradient
    context.beginPath()
    context.arc(centerX, centerY, 60, 0, Math.PI * 2)
    context.fill()
    
    // 中層光暈
    const midGradient = context.createRadialGradient(centerX, centerY, 60, centerX, centerY, 150)
    midGradient.addColorStop(0, 'rgba(255, 240, 200, 0.4)')
    midGradient.addColorStop(0.4, 'rgba(255, 235, 180, 0.25)')
    midGradient.addColorStop(0.7, 'rgba(255, 230, 160, 0.15)')
    midGradient.addColorStop(0.9, 'rgba(255, 225, 140, 0.08)')
    midGradient.addColorStop(1, 'rgba(255, 220, 120, 0)')
    
    context.globalCompositeOperation = 'screen'
    context.fillStyle = midGradient
    context.beginPath()
    context.arc(centerX, centerY, 150, 0, Math.PI * 2)
    context.fill()
    
    // 外層柔和光暈
    const outerGradient = context.createRadialGradient(centerX, centerY, 150, centerX, centerY, 256)
    outerGradient.addColorStop(0, 'rgba(255, 235, 200, 0.15)')
    outerGradient.addColorStop(0.3, 'rgba(255, 230, 180, 0.08)')
    outerGradient.addColorStop(0.6, 'rgba(255, 225, 160, 0.04)')
    outerGradient.addColorStop(0.8, 'rgba(255, 220, 140, 0.02)')
    outerGradient.addColorStop(1, 'rgba(255, 215, 120, 0)')
    
    context.fillStyle = outerGradient
    context.beginPath()
    context.arc(centerX, centerY, 256, 0, Math.PI * 2)
    context.fill()
    
    const texture = new THREE.CanvasTexture(canvas)
    
    return new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture },
        time: { value: 0 },
        globalOpacity: { value: 1 },
        ambientBrightness: { value: 1 }
      },
      vertexShader: `
        attribute float scale;
        attribute vec3 velocity;
        attribute float glowIntensity;
        attribute float flickerPhase;
        attribute float depth;
        varying float vGlowIntensity;
        varying float vFlicker;
        varying float vDepth;
        uniform float time;
        uniform float ambientBrightness;
        
        void main() {
          vGlowIntensity = glowIntensity;
          vDepth = depth;
          
          vec3 pos = position;
          
          // 輕柔的飄動 - 模擬微風中的光塵
          pos.x += sin(time * 0.3 + flickerPhase) * 0.8 * depth;
          pos.y += cos(time * 0.2 + flickerPhase * 1.5) * 0.5;
          pos.z += sin(time * 0.25 + flickerPhase * 0.8) * 0.6 * depth;
          
          // 輕微的上下浮動 - 如羽毛般輕盈
          pos.y += sin(time * 0.4 + flickerPhase * 2.0) * 1.2;
          
          // 溫柔的閃爍效果
          float flicker = 0.7 + sin(time * 1.5 + flickerPhase) * 0.2 + 
                         sin(time * 2.3 + flickerPhase * 1.7) * 0.1;
          vFlicker = flicker * ambientBrightness;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          
          // 光粒子大小 - 根據深度和發光強度調整
          float size = scale * glowIntensity * vFlicker * 25.0;
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D map;
        uniform float globalOpacity;
        varying float vGlowIntensity;
        varying float vFlicker;
        varying float vDepth;
        
        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          
          // 柔和的圓形遮罩
          if (dist > 0.5) discard;
          
          vec4 texColor = texture2D(map, gl_PointCoord);
          
          // 魔法光粒子顏色 - 溫暖的金白色帶微光
          vec3 baseColor = vec3(1.0, 0.95, 0.85); // 溫暖白色
          vec3 glowColor = vec3(1.0, 0.9, 0.7);   // 金色光暈
          
          // 根據距離中心的位置混合顏色
          vec3 finalColor = mix(glowColor, baseColor, dist * 2.0);
          
          // 深度層次效果 - 遠處的粒子稍微暗淡
          float depthFade = 0.7 + vDepth * 0.3;
          
          // 邊緣超柔和漸變
          float edgeFade = 1.0 - smoothstep(0.2, 0.5, dist);
          edgeFade = pow(edgeFade, 0.8); // 柔和邊緣
          
          // 組合所有效果 - 進一步降低整體透明度
          float finalOpacity = texColor.a * vGlowIntensity * vFlicker * 
                              edgeFade * depthFade * globalOpacity * 0.3;
          
          gl_FragColor = vec4(finalColor, finalOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending // 發光混合模式
    })
  }, [])
  
  useFrame((state) => {
    if (particlesRef.current) {
      const time = state.clock.elapsedTime
      const material = particlesRef.current.material as THREE.ShaderMaterial
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array
      const velocities = particlesRef.current.geometry.attributes.velocity.array as Float32Array
      
      // 更新shader參數
      material.uniforms.time.value = time
      
      // 根據天氣和時間調整環境光影響
      const normalizedHour = hour % 24
      let ambientBrightness = 1.0
      let globalOpacity = 0.8
      
      // 山雨時完全隱藏魔法粒子，其他下雨天氣只在白天隱藏
      if (weather === 'rain' || ((weather === 'drizzle' || weather === 'storm') && timeOfDay === 'day')) {
        ambientBrightness = 0.0
        globalOpacity = 0.0
      } else if (timeOfDay === 'day') {
        // 白天 - 光粒子較淡但依然可見
        if (normalizedHour >= 6 && normalizedHour < 18) {
          ambientBrightness = 0.6
          globalOpacity = 0.4
        }
      } else {
        // 夜晚 - 光粒子更明亮、更魔幻
        ambientBrightness = 1.3
        globalOpacity = 1.0
      }
      
      material.uniforms.ambientBrightness.value = ambientBrightness
      material.uniforms.globalOpacity.value = globalOpacity
      
      // 光粒子的優雅飄動
      for (let i = 0; i < positions.length; i += 3) {
        // 基礎移動
        positions[i] += velocities[i]
        positions[i + 1] += velocities[i + 1]
        positions[i + 2] += velocities[i + 2]
        
        // 額外的優雅擺動 - 像在溫柔的微風中飄舞
        const particleIndex = i / 3
        positions[i] += Math.sin(time * 0.15 + particleIndex * 0.1) * 0.01
        positions[i + 2] += Math.cos(time * 0.12 + particleIndex * 0.08) * 0.01
        
        // 輕微的螺旋上升
        const spiralRadius = 2.0
        positions[i] += Math.cos(time * 0.08 + particleIndex * 0.2) * spiralRadius * 0.01
        positions[i + 2] += Math.sin(time * 0.08 + particleIndex * 0.2) * spiralRadius * 0.01
        
        // 邊界重置 - 保持粒子在場景範圍內，避免太低
        if (positions[i + 1] > 50) {
          positions[i + 1] = 8 + Math.random() * 15
          positions[i] = (Math.random() - 0.5) * 200
          positions[i + 2] = (Math.random() - 0.5) * 200
        }
        
        if (Math.abs(positions[i]) > 120) {
          positions[i] = (Math.random() - 0.5) * 240
        }
        if (Math.abs(positions[i + 2]) > 120) {
          positions[i + 2] = (Math.random() - 0.5) * 240
        }
        
        // 防止粒子沉到地面以下 - 提高最低高度避免貼地
        if (positions[i + 1] < 8) {
          positions[i + 1] = 8 + Math.random() * 10
        }
      }
      
      particlesRef.current.geometry.attributes.position.needsUpdate = true
    }
  })
  
  return (
    <points ref={particlesRef} geometry={particleGeometry} material={particleMaterial} />
  )
}

// 環境光塵粒子 - 更細小、更多數量的光點
export const AmbientLightDust = () => {
  const dustRef = useRef<THREE.Points>(null)
  const { timeOfDay, weather } = useTimeStore()
  
  const dustGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(150 * 3) // 150個細小光塵 (減少62%)
    const velocities = new Float32Array(150 * 3)
    const scales = new Float32Array(150)
    const twinklePhases = new Float32Array(150)
    
    for (let i = 0; i < 150; i++) {
      const i3 = i * 3
      
      // 更廣泛的分布，避免貼地
      positions[i3] = (Math.random() - 0.5) * 300
      positions[i3 + 1] = Math.random() * 50 + 8 // 8-58米高度，避免貼地
      positions[i3 + 2] = (Math.random() - 0.5) * 300
      
      // 極其緩慢的飄動
      velocities[i3] = (Math.random() - 0.5) * 0.003
      velocities[i3 + 1] = Math.random() * 0.001 + 0.0005
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.003
      
      scales[i] = Math.random() * 0.3 + 0.1 // 0.1-0.4倍，非常小
      twinklePhases[i] = Math.random() * Math.PI * 2
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3))
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1))
    geometry.setAttribute('twinklePhase', new THREE.BufferAttribute(twinklePhases, 1))
    
    return geometry
  }, [])
  
  const dustMaterial = useMemo(() => {
    // 簡單的光點紋理
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const context = canvas.getContext('2d')!
    
    context.clearRect(0, 0, 128, 128)
    
    const centerX = 64
    const centerY = 64
    
    const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, 64)
    gradient.addColorStop(0, 'rgba(255, 250, 240, 1.0)')
    gradient.addColorStop(0.4, 'rgba(255, 245, 220, 0.8)')
    gradient.addColorStop(0.7, 'rgba(255, 240, 200, 0.4)')
    gradient.addColorStop(0.9, 'rgba(255, 235, 180, 0.1)')
    gradient.addColorStop(1, 'rgba(255, 230, 160, 0)')
    
    context.fillStyle = gradient
    context.beginPath()
    context.arc(centerX, centerY, 64, 0, Math.PI * 2)
    context.fill()
    
    const texture = new THREE.CanvasTexture(canvas)
    
    return new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture },
        time: { value: 0 },
        opacity: { value: 0.3 }
      },
      vertexShader: `
        attribute float scale;
        attribute float twinklePhase;
        varying float vTwinkle;
        uniform float time;
        
        void main() {
          // 輕微閃爍
          vTwinkle = 0.8 + sin(time * 2.0 + twinklePhase) * 0.2;
          
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = scale * 15.0 * vTwinkle * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D map;
        uniform float opacity;
        varying float vTwinkle;
        
        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          
          if (dist > 0.5) discard;
          
          vec4 texColor = texture2D(map, gl_PointCoord);
          
          vec3 dustColor = vec3(1.0, 0.98, 0.9);
          float edgeFade = 1.0 - smoothstep(0.3, 0.5, dist);
          float finalOpacity = texColor.a * opacity * vTwinkle * edgeFade;
          
          gl_FragColor = vec4(dustColor, finalOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  }, [])
  
  useFrame((state) => {
    if (dustRef.current) {
      const time = state.clock.elapsedTime
      const material = dustRef.current.material as THREE.ShaderMaterial
      const positions = dustRef.current.geometry.attributes.position.array as Float32Array
      const velocities = dustRef.current.geometry.attributes.velocity.array as Float32Array
      
      material.uniforms.time.value = time
      
      // 山雨時完全隱藏光塵粒子，其他下雨天氣只在白天隱藏
      let opacity = 0.0
      if (weather === 'rain' || ((weather === 'drizzle' || weather === 'storm') && timeOfDay === 'day')) {
        opacity = 0.0
      } else {
        opacity = timeOfDay === 'day' ? 0.08 : 0.18
      }
      material.uniforms.opacity.value = opacity
      
      // 極其緩慢的飄動
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] += velocities[i]
        positions[i + 1] += velocities[i + 1]
        positions[i + 2] += velocities[i + 2]
        
        // 邊界重置，避免太低
        if (positions[i + 1] > 65) {
          positions[i + 1] = 8 + Math.random() * 12
          positions[i] = (Math.random() - 0.5) * 300
          positions[i + 2] = (Math.random() - 0.5) * 300
        }
        
        if (Math.abs(positions[i]) > 150) {
          positions[i] = (Math.random() - 0.5) * 300
        }
        if (Math.abs(positions[i + 2]) > 150) {
          positions[i + 2] = (Math.random() - 0.5) * 300
        }
      }
      
      dustRef.current.geometry.attributes.position.needsUpdate = true
    }
  })
  
  return (
    <points ref={dustRef} geometry={dustGeometry} material={dustMaterial} />
  )
}