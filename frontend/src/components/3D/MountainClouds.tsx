import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTimeStore } from '@/stores/timeStore'

// 山脈雲層移動特效
export const MountainClouds = () => {
  const cloudsRef = useRef<THREE.Points>(null)
  const { weather, timeOfDay, hour } = useTimeStore()
  
  const cloudsGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(40 * 3) // 40個稀薄雲層
    const scales = new Float32Array(40)
    const velocities = new Float32Array(40 * 3)
    const heights = new Float32Array(40)
    
    for (let i = 0; i < 40; i++) {
      const i3 = i * 3
      
      // 在山脈中高海拔區域分布雲層
      const radius = 120 + Math.random() * 100
      const theta = Math.random() * Math.PI * 2
      const height = Math.random() * 25 + 35 // 35-60米高度
      
      positions[i3] = Math.cos(theta) * radius + (Math.random() - 0.5) * 150
      positions[i3 + 1] = height
      positions[i3 + 2] = Math.sin(theta) * radius + (Math.random() - 0.5) * 150
      
      scales[i] = Math.random() * 2 + 1.5 // 1.5-3.5倍大小
      heights[i] = height
      
      // 移除雲層移動效果 - 雲朵保持靜止
      velocities[i3] = 0     // X方向無移動
      velocities[i3 + 1] = 0 // Y方向無移動
      velocities[i3 + 2] = 0 // Z方向無移動
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1))
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3))
    geometry.setAttribute('initialHeight', new THREE.BufferAttribute(heights, 1))
    
    return geometry
  }, [])
  
  const cloudsMaterial = useMemo(() => {
    // 創建稀薄雲層紋理
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 1024
    const context = canvas.getContext('2d')!
    
    context.clearRect(0, 0, 1024, 1024)
    
    const centerX = 512
    const centerY = 512
    
    // 創建拉伸的雲層形狀 - 模擬風吹效果
    context.globalCompositeOperation = 'source-over'
    
    // 主雲層 - 橢圓形拉伸
    for (let i = 0; i < 5; i++) {
      const offsetX = (Math.random() - 0.5) * 300
      const offsetY = (Math.random() - 0.5) * 150
      const width = 200 + Math.random() * 200
      const height = 80 + Math.random() * 60
      const opacity = 0.3 + Math.random() * 0.4
      
      context.save()
      context.translate(centerX + offsetX, centerY + offsetY)
      context.rotate((Math.random() - 0.5) * 0.5)
      
      const gradient = context.createRadialGradient(0, 0, 0, 0, 0, width / 2)
      gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`)
      gradient.addColorStop(0.4, `rgba(255, 255, 255, ${opacity * 0.6})`)
      gradient.addColorStop(0.8, `rgba(255, 255, 255, ${opacity * 0.2})`)
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
      
      context.fillStyle = gradient
      context.beginPath()
      context.ellipse(0, 0, width / 2, height / 2, 0, 0, Math.PI * 2)
      context.fill()
      context.restore()
    }
    
    // 添加細絲狀雲層邊緣
    context.globalCompositeOperation = 'screen'
    for (let i = 0; i < 12; i++) {
      const offsetX = (Math.random() - 0.5) * 400
      const offsetY = (Math.random() - 0.5) * 200
      const width = 150 + Math.random() * 100
      const height = 20 + Math.random() * 30
      const opacity = 0.05 + Math.random() * 0.1
      
      context.save()
      context.translate(centerX + offsetX, centerY + offsetY)
      context.rotate((Math.random() - 0.5) * Math.PI / 3)
      
      const gradient = context.createLinearGradient(-width/2, 0, width/2, 0)
      gradient.addColorStop(0, 'rgba(240, 248, 255, 0)')
      gradient.addColorStop(0.3, `rgba(240, 248, 255, ${opacity})`)
      gradient.addColorStop(0.7, `rgba(240, 248, 255, ${opacity})`)
      gradient.addColorStop(1, 'rgba(240, 248, 255, 0)')
      
      context.fillStyle = gradient
      context.fillRect(-width/2, -height/2, width, height)
      context.restore()
    }
    
    const texture = new THREE.CanvasTexture(canvas)
    
    return new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture },
        time: { value: 0 },
        opacity: { value: 1 },
        windDirection: { value: new THREE.Vector2(1, 0) },
        weatherIntensity: { value: 1 },
        timeOfDayFactor: { value: 1 }
      },
      vertexShader: `
        attribute float scale;
        attribute vec3 velocity;
        attribute float initialHeight;
        varying float vOpacity;
        varying vec2 vUv;
        uniform float time;
        uniform vec2 windDirection;
        uniform float weatherIntensity;
        uniform float timeOfDayFactor;
        
        void main() {
          vUv = uv;
          
          vec3 pos = position;
          
          // 雲層高度透明度 - 中高海拔最明顯
          float heightFactor = smoothstep(30.0, 40.0, initialHeight) * 
                              (1.0 - smoothstep(55.0, 65.0, initialHeight));
          vOpacity = heightFactor * weatherIntensity * timeOfDayFactor;
          
          // 移除風向影響雲層形狀拉伸
          // pos.x += sin(time * 0.04 + position.z * 0.005) * windDirection.x * 1.0;
          // pos.z += cos(time * 0.03 + position.x * 0.005) * windDirection.y * 0.8;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          
          // 雲層大小 - 較大但稀薄
          float size = scale * weatherIntensity * 70.0;
          gl_PointSize = size * (600.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D map;
        uniform float opacity;
        varying float vOpacity;
        
        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          
          if (dist > 0.5) discard;
          
          vec4 texColor = texture2D(map, gl_PointCoord);
          
          // 稀薄雲層顏色 - 接近天空色
          vec3 cloudColor = vec3(0.95, 0.97, 1.0);
          
          // 邊緣柔化效果
          float edgeFade = 1.0 - smoothstep(0.3, 0.5, dist);
          
          // 最終透明度 - 非常稀薄
          float finalOpacity = texColor.a * vOpacity * opacity * edgeFade * 0.3;
          
          gl_FragColor = vec4(cloudColor, finalOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    })
  }, [])
  
  useFrame((state) => {
    if (cloudsRef.current) {
      const time = state.clock.elapsedTime
      const material = cloudsRef.current.material as THREE.ShaderMaterial
      const positions = cloudsRef.current.geometry.attributes.position.array as Float32Array
      const velocities = cloudsRef.current.geometry.attributes.velocity.array as Float32Array
      const initialHeights = cloudsRef.current.geometry.attributes.initialHeight.array as Float32Array
      
      // 移除shader時間更新 - 保持雲朵靜止
      // material.uniforms.time.value = time
      
      // 根據天氣調整雲層強度 - 多雲時顯著增強
      let weatherIntensity = 0.4
      if (weather === 'clear') weatherIntensity = 0.3      // 晴天也有適量雲層
      else if (weather === 'cloudy') weatherIntensity = 1.2 // 多雲時雲層很明顯
      else if (weather === 'fog') weatherIntensity = 0.2   // 霧天時雲層較淡
      else if (weather === 'rain') weatherIntensity = 0.8  // 雨天雲層較厚
      else if (weather === 'drizzle') weatherIntensity = 0.0 // 細雨天不要雲層
      else if (weather === 'storm') weatherIntensity = 0.0  // 山雷時完全不顯示
      
      // 根據時間調整雲層可見度
      const normalizedHour = hour % 24
      let timeOfDayFactor = 0.5
      if (normalizedHour >= 8 && normalizedHour < 17) {
        // 白天雲層較明顯
        timeOfDayFactor = 0.8
      } else if (normalizedHour >= 17 && normalizedHour < 19) {
        // 傍晚雲層
        timeOfDayFactor = 0.6
      } else {
        // 夜晚雲層很淡
        timeOfDayFactor = 0.2
      }
      
      material.uniforms.weatherIntensity.value = weatherIntensity
      material.uniforms.timeOfDayFactor.value = timeOfDayFactor
      
      // 移除風向變化 - 保持固定風向
      // const windX = Math.sin(time * 0.02) * 0.5 + 0.5
      // const windY = Math.cos(time * 0.015) * 0.3
      material.uniforms.windDirection.value.set(1.0, 0.0) // 固定風向
      
      // 移除雲層移動動畫 - 雲朵保持靜止
      // 不再更新位置，雲朵保持固定
    }
  })
  
  // 暫時移除所有山脈雲效果
  return null
}