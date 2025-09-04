import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTimeStore } from '@/stores/timeStore'

// 山脈周圍的厚重雲霧層
export const MountainCloudLayer = () => {
  const cloudLayerRef = useRef<THREE.Points>(null)
  const { weather, timeOfDay, hour } = useTimeStore()
  
  const cloudGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const cloudCount = 200 // 大量雲霧粒子
    const positions = new Float32Array(cloudCount * 3)
    const scales = new Float32Array(cloudCount)
    const velocities = new Float32Array(cloudCount * 3)
    const heights = new Float32Array(cloudCount)
    const densities = new Float32Array(cloudCount)
    const distances = new Float32Array(cloudCount) // 距離中心的距離
    
    for (let i = 0; i < cloudCount; i++) {
      const i3 = i * 3
      
      // 圍繞山脈中上部分布，只覆蓋山腰部分
      const angle = Math.random() * Math.PI * 2
      const distance = 60 + Math.random() * 40 // 距離中心60-100米，更貼近山體
      const height = Math.random() * 25 + 15   // 15-40米高度，只在山腰部分
      
      positions[i3] = Math.cos(angle) * distance + (Math.random() - 0.5) * 40
      positions[i3 + 1] = height
      positions[i3 + 2] = Math.sin(angle) * distance + (Math.random() - 0.5) * 40
      
      scales[i] = Math.random() * 2 + 1.5      // 1.5-3.5倍大小，縮小雲團
      heights[i] = height
      densities[i] = Math.random() * 0.3 + 0.2 // 0.2-0.5低密度，更淡
      distances[i] = distance
      
      // 移除雲層移動效果 - 雲朵保持靜止
      velocities[i3] = 0     // X方向無移動
      velocities[i3 + 1] = 0 // Y方向無移動
      velocities[i3 + 2] = 0 // Z方向無移動
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1))
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3))
    geometry.setAttribute('initialHeight', new THREE.BufferAttribute(heights, 1))
    geometry.setAttribute('density', new THREE.BufferAttribute(densities, 1))
    geometry.setAttribute('distance', new THREE.BufferAttribute(distances, 1))
    
    return geometry
  }, [])
  
  const cloudMaterial = useMemo(() => {
    // 創建厚重的雲霧紋理
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const context = canvas.getContext('2d')!
    
    context.clearRect(0, 0, 512, 512)
    
    const centerX = 256
    const centerY = 256
    
    // 創建多層厚重雲霧
    context.globalCompositeOperation = 'source-over'
    
    // 主要雲層 - 厚重不透明
    for (let i = 0; i < 12; i++) {
      const offsetX = (Math.random() - 0.5) * 300
      const offsetY = (Math.random() - 0.5) * 200
      const width = 120 + Math.random() * 180
      const height = 80 + Math.random() * 120
      const opacity = 0.2 + Math.random() * 0.3 // 改為較透明
      
      context.save()
      context.translate(centerX + offsetX, centerY + offsetY)
      context.rotate((Math.random() - 0.5) * Math.PI)
      
      const gradient = context.createRadialGradient(0, 0, 0, 0, 0, width / 2)
      gradient.addColorStop(0, `rgba(250, 250, 250, ${opacity})`)     // 中心白色
      gradient.addColorStop(0.2, `rgba(240, 245, 250, ${opacity * 0.9})`) // 內層
      gradient.addColorStop(0.5, `rgba(220, 230, 240, ${opacity * 0.7})`) // 中層
      gradient.addColorStop(0.8, `rgba(200, 210, 220, ${opacity * 0.4})`) // 外層
      gradient.addColorStop(1, 'rgba(200, 210, 220, 0)')              // 邊緣
      
      context.fillStyle = gradient
      context.beginPath()
      context.ellipse(0, 0, width / 2, height / 2, 0, 0, Math.PI * 2)
      context.fill()
      context.restore()
    }
    
    // 添加細密雲絲
    context.globalCompositeOperation = 'screen'
    for (let i = 0; i < 30; i++) {
      const offsetX = (Math.random() - 0.5) * 400
      const offsetY = (Math.random() - 0.5) * 300
      const width = 80 + Math.random() * 120
      const height = 10 + Math.random() * 20
      const opacity = 0.2 + Math.random() * 0.3
      
      context.save()
      context.translate(centerX + offsetX, centerY + offsetY)
      context.rotate((Math.random() - 0.5) * Math.PI)
      
      const gradient = context.createLinearGradient(-width/2, 0, width/2, 0)
      gradient.addColorStop(0, 'rgba(240, 248, 255, 0)')
      gradient.addColorStop(0.2, `rgba(240, 248, 255, ${opacity})`)
      gradient.addColorStop(0.8, `rgba(240, 248, 255, ${opacity})`)
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
        weatherIntensity: { value: 1 },
        timeOfDayFactor: { value: 1 },
        fogColor: { value: new THREE.Color('#E8F4F8') }
      },
      vertexShader: `
        attribute float scale;
        attribute vec3 velocity;
        attribute float initialHeight;
        attribute float density;
        attribute float distance;
        varying float vOpacity;
        varying vec2 vUv;
        varying float vDistance;
        varying float vHeight;
        uniform float time;
        uniform float weatherIntensity;
        uniform float timeOfDayFactor;
        
        void main() {
          vUv = uv;
          vDistance = distance;
          
          vec3 pos = position;
          vHeight = pos.y; // 傳遞世界高度到fragment shader
          
          // 淡淡雲霧
          vOpacity = density * weatherIntensity * timeOfDayFactor * 0.3;
          
          // 移除環繞移動和高度浮動效果 - 雲朵保持靜止
          // pos不再變動，雲朵保持固定位置
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          
          // 適中的雲霧團
          float size = scale * weatherIntensity * 80.0;
          gl_PointSize = size * (1000.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D map;
        uniform float opacity;
        uniform vec3 fogColor;
        varying float vOpacity;
        varying float vDistance;
        varying float vHeight;
        
        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          
          if (dist > 0.5) discard;
          
          vec4 texColor = texture2D(map, gl_PointCoord);
          
          // 厚重雲霧顏色 - 偏冷白灰色
          vec3 cloudColor = mix(fogColor, vec3(0.95, 0.97, 1.0), 0.7);
          
          // 距離衰減效果 - 調整為新的距離範圍
          float distanceFade = 1.0 - smoothstep(60.0, 100.0, vDistance);
          
          // 高度衰減效果 - 在35-45米高度之間衰減，留出山峰頂部可見
          float heightFade = 1.0 - smoothstep(35.0, 45.0, vHeight);
          
          // 邊緣柔化
          float edgeFade = 1.0 - smoothstep(0.1, 0.5, dist);
          
          // 淡淡雲霧的最終透明度
          float finalOpacity = texColor.a * vOpacity * opacity * edgeFade * distanceFade * heightFade * 0.4;
          
          gl_FragColor = vec4(cloudColor, finalOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    })
  }, [])
  
  useFrame((state) => {
    if (cloudLayerRef.current) {
      const time = state.clock.elapsedTime
      const material = cloudLayerRef.current.material as THREE.ShaderMaterial
      const positions = cloudLayerRef.current.geometry.attributes.position.array as Float32Array
      const velocities = cloudLayerRef.current.geometry.attributes.velocity.array as Float32Array
      const initialHeights = cloudLayerRef.current.geometry.attributes.initialHeight.array as Float32Array
      const distances = cloudLayerRef.current.geometry.attributes.distance.array as Float32Array
      
      // 移除shader時間更新 - 保持雲朵靜止
      // material.uniforms.time.value = time
      
      // 根據天氣調整雲霧強度 - 整體調淡
      let weatherIntensity = 0.4 // 基礎強度降低
      if (weather === 'fog' || weather === 'mist') weatherIntensity = 0.8 // 霧天較濃但不過度
      else if (weather === 'cloudy') weatherIntensity = 0.6              // 多雲適中
      else if (weather === 'rain') weatherIntensity = 0.5                // 山雨時有雲霧
      else if (weather === 'drizzle') weatherIntensity = 0.0             // 細雨不要雲霧
      else if (weather === 'clear') weatherIntensity = 0.0               // 晴天完全沒有雲霧
      else if (weather === 'windy') weatherIntensity = 0.2               // 大風時幾乎消失
      else if (weather === 'storm') weatherIntensity = 0.0               // 山雷時不顯示雲層
      
      // 根據時間調整可見度
      const normalizedHour = hour % 24
      let timeOfDayFactor = 0.8
      if (normalizedHour >= 6 && normalizedHour < 18) {
        // 白天雲霧較明顯
        timeOfDayFactor = 1.0
      } else if (normalizedHour >= 18 && normalizedHour < 20) {
        // 傍晚雲霧
        timeOfDayFactor = 0.9
      } else {
        // 夜晚雲霧較淡但依然存在
        timeOfDayFactor = 0.6
      }
      
      material.uniforms.weatherIntensity.value = weatherIntensity
      material.uniforms.timeOfDayFactor.value = timeOfDayFactor
      
      // 根據時間調整雲霧顏色
      let fogColor = new THREE.Color('#E8F4F8') // 冷白色
      if (timeOfDay === 'night') {
        fogColor = new THREE.Color('#D0D8E0') // 夜晚偏藍灰
      }
      material.uniforms.fogColor.value = fogColor
      
      // 移除雲霧環繞運動 - 雲朵保持靜止
      // 不再更新位置，雲朵保持固定
    }
  })
  
  // 暫時移除所有山脈雲層效果
  return null
}