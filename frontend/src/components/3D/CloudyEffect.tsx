import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTimeStore } from '@/stores/timeStore'

// 多雲天氣效果 - 中低空雲層
export const CloudyEffect = () => {
  const cloudsRef = useRef<THREE.Points>(null)
  const { weather, timeOfDay, hour } = useTimeStore()
  
  const cloudsGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const cloudCount = weather === 'rain' ? 300 : 100 // 山雨時使用更多雲粒子
    const positions = new Float32Array(cloudCount * 3)
    const scales = new Float32Array(cloudCount)
    const velocities = new Float32Array(cloudCount * 3)
    const heights = new Float32Array(cloudCount)
    const densities = new Float32Array(cloudCount)
    
    for (let i = 0; i < cloudCount; i++) {
      const i3 = i * 3
      
      if (weather === 'rain') {
        // 山雨時使用類似山雷的積雨雲結構
        const layerType = Math.random()
        let radius, yOffset, density
        
        if (layerType < 0.4) {
          // 核心雲層 (40% 粒子) - 最密集
          radius = Math.random() * 60 + 25 // 25-85米
          yOffset = 45 + (Math.random() - 0.5) * 12 // 39-51米
          density = 0.9 + Math.random() * 0.1 // 高密度
        } else if (layerType < 0.7) {
          // 中層雲團 (30% 粒子) - 中等密度
          radius = Math.random() * 90 + 50 // 50-140米
          yOffset = 42 + (Math.random() - 0.5) * 18 // 33-51米
          density = 0.6 + Math.random() * 0.3
        } else {
          // 外圍雲霧 (30% 粒子) - 輕柔邊緣
          radius = Math.random() * 130 + 80 // 80-210米
          yOffset = 38 + (Math.random() - 0.5) * 25 // 25.5-50.5米
          density = 0.3 + Math.random() * 0.4
        }
        
        // 創造更美觀的雲團形狀
        const theta = Math.random() * Math.PI * 2
        const phi = Math.random() * Math.PI * 0.7 + 0.15
        
        // 多層次噪聲創造更自然的雲邊緣
        const noise1 = Math.sin(theta * 4) * Math.cos(phi * 3) * 0.15
        const noise2 = Math.sin(theta * 8) * Math.cos(phi * 6) * 0.08
        const noise3 = Math.sin(theta * 16) * Math.cos(phi * 12) * 0.04
        const combinedNoise = noise1 + noise2 + noise3
        const adjustedRadius = radius * (1 + combinedNoise)
        
        // 創造更立體的雲團形狀
        const x = Math.sin(phi) * Math.cos(theta) * adjustedRadius * 1.1
        const y = Math.cos(phi) * adjustedRadius * 0.3 + yOffset
        const z = Math.sin(phi) * Math.sin(theta) * adjustedRadius * 0.85
        
        positions[i3] = x
        positions[i3 + 1] = Math.max(20, Math.min(70, y))
        positions[i3 + 2] = z
        
        densities[i] = density * (0.5 + Math.random() * 0.3)
        
        // 更小的風力，保持積雨雲形狀
        const windStrength = 0.03 + Math.random() * 0.08
        velocities[i3] = (Math.random() - 0.5) * windStrength
        velocities[i3 + 1] = (Math.random() - 0.5) * windStrength * 0.3
        velocities[i3 + 2] = (Math.random() - 0.5) * windStrength
        
        // 根據距離中心和密度調整大小，創造更美的漸變
        const distanceFromCenter = Math.sqrt(x*x + z*z) / 160
        const heightFactor = (y - 30) / 40 // 高度因子
        const sizeFactor = Math.max(0.3, (1.2 - distanceFromCenter) * (0.8 + heightFactor * 0.4))
        
        // 不同層次的雲有不同大小
        let baseSize
        if (layerType < 0.4) {
          baseSize = 25 + Math.random() * 20 // 核心層較大
        } else if (layerType < 0.7) {
          baseSize = 18 + Math.random() * 15 // 中層適中
        } else {
          baseSize = 12 + Math.random() * 12 // 外層較小
        }
        
        scales[i] = baseSize * sizeFactor * density
        
      } else {
        // 普通多雲天氣的雲層
        const radius = 100 + Math.random() * 120
        const theta = Math.random() * Math.PI * 2
        const height = Math.random() * 20 + 15 // 15-35米高度
        
        positions[i3] = Math.cos(theta) * radius + (Math.random() - 0.5) * 180
        positions[i3 + 1] = height
        positions[i3 + 2] = Math.sin(theta) * radius + (Math.random() - 0.5) * 180
        
        scales[i] = Math.random() * 3 + 2 // 2-5倍大小
        densities[i] = Math.random() * 0.8 + 0.4
        
        // 雲層移動速度 - 慢速飄動
        velocities[i3] = (Math.random() - 0.5) * 0.02
        velocities[i3 + 1] = (Math.random() - 0.5) * 0.003
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.015
      }
      
      heights[i] = positions[i3 + 1]
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1))
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3))
    geometry.setAttribute('initialHeight', new THREE.BufferAttribute(heights, 1))
    geometry.setAttribute('density', new THREE.BufferAttribute(densities, 1))
    
    return geometry
  }, [weather])
  
  const cloudsMaterial = useMemo(() => {
    // 創建更厚實的雲層紋理
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 1024
    const context = canvas.getContext('2d')!
    
    const isRain = weather === 'rain'
    
    context.clearRect(0, 0, 1024, 1024)
    
    const centerX = 512
    const centerY = 512
    
    // 創建多層雲層效果
    context.globalCompositeOperation = 'source-over'
    
    // 主雲層 - 更厚實的形狀
    for (let i = 0; i < 8; i++) {
      const offsetX = (Math.random() - 0.5) * 400
      const offsetY = (Math.random() - 0.5) * 200
      const width = 150 + Math.random() * 250
      const height = 60 + Math.random() * 80
      const opacity = 0.4 + Math.random() * 0.5 // 更不透明
      
      context.save()
      context.translate(centerX + offsetX, centerY + offsetY)
      context.rotate((Math.random() - 0.5) * 0.8)
      
      const gradient = context.createRadialGradient(0, 0, 0, 0, 0, width / 2)
      
      if (isRain) {
        // 山雨積雨雲 - 更豐富的層次感
        gradient.addColorStop(0, `rgba(75, 85, 95, ${opacity})`)           // 深灰核心
        gradient.addColorStop(0.2, `rgba(95, 105, 115, ${opacity * 0.9})`) // 內層
        gradient.addColorStop(0.5, `rgba(125, 135, 145, ${opacity * 0.7})`) // 中層
        gradient.addColorStop(0.8, `rgba(155, 165, 175, ${opacity * 0.3})`) // 外層
        gradient.addColorStop(1, 'rgba(180, 190, 200, 0)')                 // 邊緣透明
      } else {
        // 普通多雲 - 較亮的顏色
        gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`)
        gradient.addColorStop(0.3, `rgba(240, 245, 250, ${opacity * 0.8})`)
        gradient.addColorStop(0.7, `rgba(220, 230, 240, ${opacity * 0.4})`)
        gradient.addColorStop(1, 'rgba(220, 230, 240, 0)')
      }
      
      context.fillStyle = gradient
      context.beginPath()
      context.ellipse(0, 0, width / 2, height / 2, 0, 0, Math.PI * 2)
      context.fill()
      context.restore()
    }
    
    // 添加雲層邊緣絲狀結構
    context.globalCompositeOperation = 'source-over'
    for (let i = 0; i < 20; i++) {
      const offsetX = (Math.random() - 0.5) * 500
      const offsetY = (Math.random() - 0.5) * 300
      const width = 100 + Math.random() * 150
      const height = 15 + Math.random() * 25
      const opacity = 0.1 + Math.random() * 0.3
      
      context.save()
      context.translate(centerX + offsetX, centerY + offsetY)
      context.rotate((Math.random() - 0.5) * Math.PI / 2)
      
      const gradient = context.createLinearGradient(-width/2, 0, width/2, 0)
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0)')
      gradient.addColorStop(0.2, `rgba(245, 250, 255, ${opacity})`)
      gradient.addColorStop(0.8, `rgba(245, 250, 255, ${opacity})`)
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
      
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
        timeOfDayFactor: { value: 1 },
        isRain: { value: isRain ? 1.0 : 0.0 }
      },
      vertexShader: `
        attribute float scale;
        attribute vec3 velocity;
        attribute float initialHeight;
        attribute float density;
        varying float vOpacity;
        varying vec2 vUv;
        uniform float time;
        uniform vec2 windDirection;
        uniform float weatherIntensity;
        uniform float timeOfDayFactor;
        
        void main() {
          vUv = uv;
          
          vec3 pos = position;
          
          // 雲層密度影響透明度
          vOpacity = density * weatherIntensity * timeOfDayFactor;
          
          // 風向影響雲層飄動
          pos.x += sin(time * 0.08 + position.z * 0.008) * windDirection.x * 3.0;
          pos.z += cos(time * 0.06 + position.x * 0.008) * windDirection.y * 2.0;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          
          // 雲層大小 - 更大更明顯
          float size = scale * weatherIntensity * 120.0;
          gl_PointSize = size * (800.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D map;
        uniform float opacity;
        uniform float isRain;
        varying float vOpacity;
        
        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          
          if (dist > 0.5) discard;
          
          vec4 texColor = texture2D(map, gl_PointCoord);
          
          // 根據天氣和距離中心選擇雲層顏色
          vec3 cloudColor;
          if (isRain > 0.5) {
            // 山雨積雨雲 - 根據距離中心創造美麗的漸變
            float centerDistance = distance(gl_PointCoord, vec2(0.5));
            vec3 coreColor = vec3(0.35, 0.4, 0.45);    // 深灰核心
            vec3 midColor = vec3(0.55, 0.6, 0.65);     // 中層灰藍
            vec3 edgeColor = vec3(0.75, 0.8, 0.85);    // 邊緣淺灰
            
            // 創造從中心到邊緣的美麗漸變
            if (centerDistance < 0.2) {
              cloudColor = coreColor;
            } else if (centerDistance < 0.4) {
              float t = (centerDistance - 0.2) / 0.2;
              cloudColor = mix(coreColor, midColor, t);
            } else {
              float t = (centerDistance - 0.4) / 0.1;
              cloudColor = mix(midColor, edgeColor, clamp(t, 0.0, 1.0));
            }
          } else {
            // 普通多雲 - 灰白色
            cloudColor = vec3(0.92, 0.94, 0.96);
          }
          
          // 更細緻的邊緣處理
          float edgeFade = 1.0 - smoothstep(0.15, 0.5, dist);
          
          // 為山雨添加更精緻的透明度處理
          float baseOpacity;
          if (isRain > 0.5) {
            // 根據雲層密度和高度創造美麗的透明度變化
            float densityFactor = vOpacity;
            float heightFactor = clamp((vOpacity - 0.3) / 0.7, 0.0, 1.0);
            baseOpacity = 0.75 + densityFactor * 0.25; // 0.75-1.0 範圍
          } else {
            baseOpacity = 0.7;
          }
          
          float finalOpacity = texColor.a * vOpacity * opacity * edgeFade * baseOpacity;
          
          gl_FragColor = vec4(cloudColor, finalOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    })
  }, [weather])
  
  useFrame((state) => {
    if (cloudsRef.current) {
      const time = state.clock.elapsedTime
      const material = cloudsRef.current.material as THREE.ShaderMaterial
      const positions = cloudsRef.current.geometry.attributes.position.array as Float32Array
      const velocities = cloudsRef.current.geometry.attributes.velocity.array as Float32Array
      const initialHeights = cloudsRef.current.geometry.attributes.initialHeight.array as Float32Array
      
      // 更新shader參數
      material.uniforms.time.value = time
      
      // 根據天氣調整雲層強度
      let weatherIntensity = 0.2
      if (weather === 'cloudy') weatherIntensity = 1.0    // 多雲時最明顯
      else if (weather === 'clear') weatherIntensity = 0.3 // 晴天時有些雲
      else if (weather === 'rain') weatherIntensity = 0.8  // 雨天雲層厚
      else if (weather === 'drizzle') weatherIntensity = 0.7 // 細雨雲層
      else if (weather === 'storm') weatherIntensity = 0.6 // 暴風雨前的雲
      else if (weather === 'fog') weatherIntensity = 0.1  // 霧天雲層淡
      
      // 根據時間調整雲層可見度
      const normalizedHour = hour % 24
      let timeOfDayFactor = 0.6
      if (normalizedHour >= 8 && normalizedHour < 17) {
        // 白天雲層最明顯
        timeOfDayFactor = 1.0
      } else if (normalizedHour >= 17 && normalizedHour < 19) {
        // 傍晚雲層
        timeOfDayFactor = 0.8
      } else {
        // 夜晚雲層較淡
        timeOfDayFactor = 0.4
      }
      
      material.uniforms.weatherIntensity.value = weatherIntensity
      material.uniforms.timeOfDayFactor.value = timeOfDayFactor
      
      // 風向變化
      const windX = Math.sin(time * 0.03) * 0.6 + 0.4
      const windY = Math.cos(time * 0.02) * 0.4
      material.uniforms.windDirection.value.set(windX, windY)
      
      // 雲層移動動畫
      for (let i = 0; i < positions.length; i += 3) {
        // 持續移動
        positions[i] += velocities[i]
        positions[i + 1] += velocities[i + 1]
        positions[i + 2] += velocities[i + 2]
        
        // 風的擾動
        positions[i] += Math.sin(time * 0.04 + i * 0.02) * 0.03
        positions[i + 2] += Math.cos(time * 0.03 + i * 0.02) * 0.02
        
        // 高度輕微浮動
        const waveY = Math.sin(time * 0.05 + i * 0.01) * 2.0
        positions[i + 1] = initialHeights[i / 3] + waveY
        
        // 邊界重置
        if (positions[i] > 250) {
          positions[i] = -250
        } else if (positions[i] < -250) {
          positions[i] = 250
        }
        
        if (positions[i + 2] > 250) {
          positions[i + 2] = -250
        } else if (positions[i + 2] < -250) {
          positions[i + 2] = 250
        }
        
        // 高度限制
        if (positions[i + 1] > 45) {
          positions[i + 1] = 25
        }
        if (positions[i + 1] < 5) {
          positions[i + 1] = 15
        }
      }
      
      cloudsRef.current.geometry.attributes.position.needsUpdate = true
    }
  })
  
  // 只在多雲相關天氣時顯示
  const shouldShow = weather === 'cloudy' || weather === 'rain'
                    // 細雨和晴天完全沒有雲層
  
  if (!shouldShow) return null
  
  return (
    <points ref={cloudsRef} geometry={cloudsGeometry} material={cloudsMaterial} />
  )
}