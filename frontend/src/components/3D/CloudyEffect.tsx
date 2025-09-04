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
    // 大幅增加雲朵數量，讓整片藍天都佈滿雲朵
    let cloudCount = 800 // 基礎雲量大幅增加
    if (weather === 'cloudy') {
      cloudCount = timeOfDay === 'day' ? 1500 : 800 // 多雲天大量雲朵
    } else if (weather === 'clear') {
      cloudCount = timeOfDay === 'day' ? 1200 : 400 // 晴天也要有大量雲朵，夜晚適量
    } else if (weather === 'drizzle') {
      cloudCount = timeOfDay === 'day' ? 1000 : 600 // 細雨天更多雲
    }
    
    const positions = new Float32Array(cloudCount * 3)
    const scales = new Float32Array(cloudCount)
    const velocities = new Float32Array(cloudCount * 3)
    const heights = new Float32Array(cloudCount)
    const densities = new Float32Array(cloudCount)
    
    // 大幅增加雲團數量和分布範圍，覆蓋整片天空
    const cloudClusters = []
    const clusterCount = Math.floor(cloudCount / 12) // 每12個雲朵形成一個雲團，增加密度
    
    for (let c = 0; c < clusterCount; c++) {
      const clusterRadius = 250 + Math.random() * 400 // 大幅擴大分布範圍
      const clusterTheta = Math.random() * Math.PI * 2
      const clusterHeight = 30 + Math.random() * 60 // 增加高度變化
      
      cloudClusters.push({
        centerX: Math.cos(clusterTheta) * clusterRadius,
        centerY: clusterHeight,
        centerZ: Math.sin(clusterTheta) * clusterRadius,
        spread: 60 + Math.random() * 50 // 增加雲團內部分散範圍
      })
    }
    
    // 添加更多雲層以填滿天空
    for (let layer = 0; layer < 3; layer++) {
      const layerRadius = 100 + layer * 150
      const layerClusterCount = Math.floor(clusterCount / 3)
      
      for (let c = 0; c < layerClusterCount; c++) {
        const clusterTheta = (c / layerClusterCount) * Math.PI * 2 + layer * 0.5
        const clusterHeight = 25 + layer * 25 + Math.random() * 30
        
        cloudClusters.push({
          centerX: Math.cos(clusterTheta) * layerRadius,
          centerY: clusterHeight,
          centerZ: Math.sin(clusterTheta) * layerRadius,
          spread: 45 + Math.random() * 35
        })
      }
    }
    
    for (let i = 0; i < cloudCount; i++) {
      const i3 = i * 3
      
      // 選擇所屬雲團
      const clusterIndex = Math.floor(i / 12) % cloudClusters.length
      const cluster = cloudClusters[clusterIndex]
      
      // 平地環境的雲朵分布
      const cloudType = Math.random()
      let height, density, scale
      
      if (timeOfDay === 'day') {
        // 白天：多層次雲朵，覆蓋整個天空
        if (cloudType < 0.3) {
          // 高積雲 - 高空大片雲朵
          height = 80 + Math.random() * 40 // 80-120米高度
          density = 0.8 + Math.random() * 0.2 // 增加高積雲密度
          scale = 12 + Math.random() * 18
        } else if (cloudType < 0.6) {
          // 層雲 - 中空連續雲層
          height = 50 + Math.random() * 30 // 50-80米高度
          density = 0.85 + Math.random() * 0.15 // 增加層雲密度
          scale = 10 + Math.random() * 15
        } else {
          // 層積雲 - 低空塊狀雲
          height = 30 + Math.random() * 25 // 30-55米高度
          density = 0.9 + Math.random() * 0.1 // 增加層積雲密度
          scale = 7 + Math.random() * 12
        }
      } else {
        // 夜晚：較稀疏的雲朵，用於遮蔽星星
        height = 60 + Math.random() * 50 // 60-110米高度
        density = 0.6 + Math.random() * 0.3 // 增加夜晚雲朵密度
        scale = 15 + Math.random() * 20 // 適中的雲塊大小
      }
      
      // 在雲團中心周圍分布
      const localTheta = Math.random() * Math.PI * 2
      const localRadius = Math.random() * cluster.spread
      const heightVariation = (Math.random() - 0.5) * 20
      
      // 雲團內的雲朵分布
      const x = cluster.centerX + Math.cos(localTheta) * localRadius
      const y = cluster.centerY + height + heightVariation
      const z = cluster.centerZ + Math.sin(localTheta) * localRadius
      
      positions[i3] = x
      positions[i3 + 1] = y
      positions[i3 + 2] = z
      
      scales[i] = scale
      densities[i] = density
      
      // 移除雲層移動效果 - 雲朵保持靜止
      velocities[i3] = 0
      velocities[i3 + 1] = 0
      velocities[i3 + 2] = 0
      
      heights[i] = positions[i3 + 1]
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1))
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3))
    geometry.setAttribute('initialHeight', new THREE.BufferAttribute(heights, 1))
    geometry.setAttribute('density', new THREE.BufferAttribute(densities, 1))
    
    return geometry
  }, [weather, timeOfDay])
  
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
    
    // 主雲層 - 更厚實的形狀，增加層數
    for (let i = 0; i < 12; i++) {
      const offsetX = (Math.random() - 0.5) * 400
      const offsetY = (Math.random() - 0.5) * 200
      const width = 120 + Math.random() * 200 // 稍微縮小但增加數量
      const height = 50 + Math.random() * 70
      const opacity = 0.5 + Math.random() * 0.4 // 更不透明
      
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
    
    // 添加雲層邊緣絲狀結構 - 增加細節
    context.globalCompositeOperation = 'source-over'
    for (let i = 0; i < 30; i++) {
      const offsetX = (Math.random() - 0.5) * 500
      const offsetY = (Math.random() - 0.5) * 300
      const width = 80 + Math.random() * 120
      const height = 12 + Math.random() * 20
      const opacity = 0.15 + Math.random() * 0.25 // 增加邊緣結構不透明度
      
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
        isRain: { value: isRain ? 1.0 : 0.0 },
        isNight: { value: timeOfDay === 'night' ? 1.0 : 0.0 }
      },
      vertexShader: `
        attribute float scale;
        attribute vec3 velocity;
        attribute float initialHeight;
        attribute float density;
        varying float vOpacity;
        varying vec2 vUv;
        varying float vDensity;
        uniform float time;
        uniform vec2 windDirection;
        uniform float weatherIntensity;
        uniform float timeOfDayFactor;
        uniform float isNight;
        
        void main() {
          vUv = uv;
          vDensity = density;
          
          vec3 pos = position;
          
          // 雲層密度影響透明度
          vOpacity = density * weatherIntensity * timeOfDayFactor;
          
          // 移除風向影響雲層飄動
          // pos.x += sin(time * 0.03 + position.z * 0.003) * windDirection.x * 1.5;
          // pos.z += cos(time * 0.02 + position.x * 0.003) * windDirection.y * 1.0;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          
          // 平地環境雲層大小調整 - 減小個體大小但增加密度
          float baseSize = isNight > 0.5 ? 120.0 : 80.0; // 調整基礎大小
          float size = scale * weatherIntensity * baseSize;
          gl_PointSize = size * (800.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D map;
        uniform float opacity;
        uniform float isRain;
        uniform float isNight;
        varying float vOpacity;
        varying float vDensity;
        
        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          
          if (dist > 0.5) discard;
          
          vec4 texColor = texture2D(map, gl_PointCoord);
          
          // 根據時間選擇雲層顏色和效果
          vec3 cloudColor;
          float baseOpacity;
          
          if (isNight > 0.5) {
            // 夜晚雲朵：深色，用於遮蔽星星
            float centerDistance = distance(gl_PointCoord, vec2(0.5));
            vec3 darkCore = vec3(0.15, 0.18, 0.22);    // 深藍灰核心
            vec3 midTone = vec3(0.25, 0.30, 0.35);     // 中層藍灰
            vec3 lightEdge = vec3(0.40, 0.45, 0.50);   // 邊緣較亮
            
            if (centerDistance < 0.3) {
              cloudColor = darkCore;
              baseOpacity = 0.9; // 核心不透明，完全遮蔽星星
            } else if (centerDistance < 0.45) {
              float t = (centerDistance - 0.3) / 0.15;
              cloudColor = mix(darkCore, midTone, t);
              baseOpacity = 0.7; // 中層半透明
            } else {
              float t = (centerDistance - 0.45) / 0.05;
              cloudColor = mix(midTone, lightEdge, clamp(t, 0.0, 1.0));
              baseOpacity = 0.4; // 邊緣較透明
            }
          } else {
            // 白天雲朵：亮白色，更加明顯
            if (isRain > 0.5) {
              // 雨雲
              float centerDistance = distance(gl_PointCoord, vec2(0.5));
              vec3 coreColor = vec3(0.5, 0.55, 0.6);
              vec3 edgeColor = vec3(0.8, 0.85, 0.9);
              cloudColor = mix(coreColor, edgeColor, centerDistance * 2.0);
              baseOpacity = 0.8;
            } else {
              // 普通白天雲朵
              cloudColor = vec3(0.95, 0.97, 1.0); // 純白雲朵
              baseOpacity = 0.8;
            }
          }
          
          // 邊緣處理
          float edgeFade = 1.0 - smoothstep(0.2, 0.5, dist);
          
          // 夜晚雲朵需要更高密度來遮蔽星星
          float densityMultiplier = isNight > 0.5 ? (vDensity * 1.8) : (vDensity * 1.2); // 增加整體密度
          
          float finalOpacity = texColor.a * vOpacity * opacity * edgeFade * baseOpacity * densityMultiplier;
          
          gl_FragColor = vec4(cloudColor, finalOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    })
  }, [weather, timeOfDay])
  
  useFrame((state) => {
    if (cloudsRef.current) {
      const time = state.clock.elapsedTime
      const material = cloudsRef.current.material as THREE.ShaderMaterial
      const positions = cloudsRef.current.geometry.attributes.position.array as Float32Array
      const velocities = cloudsRef.current.geometry.attributes.velocity.array as Float32Array
      const initialHeights = cloudsRef.current.geometry.attributes.initialHeight.array as Float32Array
      
      // 更新shader參數 - 移除時間更新
      // material.uniforms.time.value = time // 不再更新時間，保持靜止
      material.uniforms.isNight.value = timeOfDay === 'night' ? 1.0 : 0.0
      
      // 根據天氣和時間調整雲層強度 - 調整晴天至40%覆蓋率
      let weatherIntensity = 0.2
      if (weather === 'cloudy') {
        weatherIntensity = timeOfDay === 'day' ? 1.0 : 0.8 // 白天多雲明顯，夜晚適中
      } else if (weather === 'clear') {
        weatherIntensity = timeOfDay === 'day' ? 0.4 : 0 // 晴天增加至40%雲覆蓋率，夜晚無雲
      } else if (weather === 'drizzle') {
        weatherIntensity = timeOfDay === 'day' ? 0.8 : 0.6 // 細雨天雲層適中
      }
      
      // 時間因子調整
      let timeOfDayFactor = timeOfDay === 'day' ? 1.0 : 0.7 // 夜晚稍微減弱但仍可見
      
      material.uniforms.weatherIntensity.value = weatherIntensity
      material.uniforms.timeOfDayFactor.value = timeOfDayFactor
      
      // 移除風向變化 - 保持固定風向
      // const windX = Math.sin(time * 0.03) * 0.6 + 0.4
      // const windY = Math.cos(time * 0.02) * 0.4
      material.uniforms.windDirection.value.set(1.0, 0.0) // 固定風向
      
      // 移除雲層移動動畫 - 雲朵保持靜止
      // 不再更新位置，雲朵保持固定
    }
  })
  
  // 暫時移除所有雲朵效果
  const shouldShow = false // 不顯示任何雲朵
  
  if (!shouldShow) return null
  
  return (
    <points ref={cloudsRef} geometry={cloudsGeometry} material={cloudsMaterial} />
  )
}