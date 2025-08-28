import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTimeStore, TIME_SETTINGS } from '@/stores/timeStore'

// 天空穹頂組件
export const SkyDome = () => {
  const skyRef = useRef<THREE.Mesh>(null)
  const { timeOfDay, hour, weather } = useTimeStore()
  
  // 創建天空穹頂幾何體
  const skyGeometry = useMemo(() => {
    return new THREE.SphereGeometry(500, 32, 15, 0, Math.PI * 2, 0, Math.PI * 0.6)
  }, [])
  
  // 創建天空材質
  const skyMaterial = useMemo(() => {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        sunPosition: { value: new THREE.Vector3() },
        dayColor: { value: new THREE.Color('#87CEEB') },
        nightColor: { value: new THREE.Color('#000080') },
        sunsetColor: { value: new THREE.Color('#FF6347') },
        mixFactor: { value: 0.5 },
        weatherDarkness: { value: 0.0 }, // 天氣陰暗度
        stormColor: { value: new THREE.Color('#6b6d75') } // 山雷天空顏色 - 濃厚灰色
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 sunPosition;
        uniform vec3 dayColor;
        uniform vec3 nightColor;
        uniform vec3 sunsetColor;
        uniform float mixFactor;
        uniform float weatherDarkness;
        uniform vec3 stormColor;
        varying vec3 vWorldPosition;
        
        void main() {
          // 計算高度影響（天空漸變）
          vec3 worldPos = normalize(vWorldPosition);
          float height = worldPos.y;
          
          // 計算太陽方向的影響
          vec3 sunDir = normalize(sunPosition);
          float sunInfluence = max(0.0, dot(worldPos, sunDir));
          
          // 基於小時的更精確時間計算
          float hourNormalized = mixFactor * 24.0; // 0-24小時
          vec3 color;
          
          // 日出時段 (5-8點)
          if (hourNormalized >= 5.0 && hourNormalized < 8.0) {
            float factor = (hourNormalized - 5.0) / 3.0;
            vec3 dawn = vec3(1.0, 0.6, 0.3); // 橙紅色黎明
            vec3 morning = vec3(0.5, 0.8, 1.0); // 淡藍色早晨
            color = mix(dawn, morning, factor);
            
            // 太陽光暈效果
            float sunGlow = pow(sunInfluence, 8.0) * (1.0 - factor * 0.7);
            color += vec3(1.0, 0.7, 0.4) * sunGlow;
          }
          // 白天 (8-17點)
          else if (hourNormalized >= 8.0 && hourNormalized < 17.0) {
            color = vec3(0.53, 0.81, 0.92); // 天藍色 #87CEEB
            
            // 微妙的太陽光暈
            float sunGlow = pow(sunInfluence, 12.0) * 0.3;
            color += vec3(1.0, 1.0, 0.8) * sunGlow;
          }
          // 日落時段 (17-20點)
          else if (hourNormalized >= 17.0 && hourNormalized < 20.0) {
            float factor = (hourNormalized - 17.0) / 3.0;
            vec3 day = vec3(0.53, 0.81, 0.92);
            vec3 sunset = vec3(1.0, 0.4, 0.2); // 橙紅色日落
            color = mix(day, sunset, factor);
            
            // 強烈的太陽光暈效果
            float sunGlow = pow(sunInfluence, 6.0) * (1.0 - factor * 0.3);
            color += vec3(1.0, 0.5, 0.2) * sunGlow;
          }
          // 黃昏 (20-22點)
          else if (hourNormalized >= 20.0 && hourNormalized < 22.0) {
            float factor = (hourNormalized - 20.0) / 2.0;
            vec3 sunset = vec3(1.0, 0.4, 0.2);
            vec3 dusk = vec3(0.2, 0.1, 0.4); // 紫色黃昏
            color = mix(sunset, dusk, factor);
          }
          // 夜晚 (22-5點)
          else {
            color = vec3(0.1, 0.1, 0.2); // 深藍夜空
            
            // 月光效果（當太陽在地平線下時）
            if (sunPosition.y < 0.0) {
              vec3 moonDir = normalize(vec3(-sunPosition.x, abs(sunPosition.y), -sunPosition.z));
              float moonInfluence = max(0.0, dot(worldPos, moonDir));
              float moonGlow = pow(moonInfluence, 15.0) * 0.2;
              color += vec3(0.8, 0.8, 1.0) * moonGlow;
            }
          }
          
          // 高度漸變效果 - 地平線更暗
          float heightGradient = smoothstep(-0.1, 0.3, height);
          color = mix(color * 0.3, color, heightGradient);
          
          // 大氣散射效果
          float atmosphere = 1.0 - abs(height);
          atmosphere = pow(atmosphere, 2.0);
          vec3 atmosphereColor = vec3(0.8, 0.9, 1.0);
          color = mix(color, atmosphereColor, atmosphere * 0.1);
          
          // 天氣效果 - 山雷時天空變得濃厚陰沉的灰色
          if (weatherDarkness > 0.5) {
            // 山雷天空：濃厚灰色，保持可見度但陰沉
            color = mix(color, stormColor, 0.75); // 75%混入風暴灰色
            color *= 0.45; // 適度降低亮度，保持灰色質感
          }
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.BackSide
    })
    
    return material
  }, [])
  
  useFrame((state) => {
    if (skyRef.current && skyRef.current.material instanceof THREE.ShaderMaterial) {
      // 更新時間
      skyRef.current.material.uniforms.time.value = state.clock.elapsedTime
      
      // 簡化的混合因子計算
      const normalizedHour = hour % 24
      const mixFactor = normalizedHour / 24
      skyRef.current.material.uniforms.mixFactor.value = mixFactor
      
      // 更自然的太陽軌跡 - 東升西落
      const sunAngle = (normalizedHour / 24) * Math.PI * 2 - Math.PI / 2 // -90度開始(東方)
      const sunHeight = Math.sin((normalizedHour - 6) / 12 * Math.PI) * 80 // 6點開始升起，18點落下
      const sunPos = new THREE.Vector3(
        Math.cos(sunAngle) * 200, // 東西方向移動
        Math.max(-20, sunHeight), // 最低-20，防止完全消失
        Math.sin(sunAngle) * 80   // 南北方向的弧形軌跡
      )
      skyRef.current.material.uniforms.sunPosition.value = sunPos
      
      // 根據天氣設定陰暗度
      const weatherDarkness = weather === 'storm' ? 1.0 : 0.0
      skyRef.current.material.uniforms.weatherDarkness.value = weatherDarkness
    }
  })
  
  return (
    <mesh ref={skyRef} geometry={skyGeometry} material={skyMaterial} />
  )
}

// 稀薄白雲系統
export const ThinWhiteClouds = () => {
  const cloudsRef = useRef<THREE.Points>(null)
  const { weather, timeOfDay } = useTimeStore()
  
  const cloudGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(300 * 3) // 減少到300個雲點，更稀薄
    const scales = new Float32Array(300)
    const opacities = new Float32Array(300)
    
    for (let i = 0; i < 300; i++) {
      const i3 = i * 3
      
      // 在天空中更稀疏分布
      const radius = 150 + Math.random() * 250
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI * 0.25 + Math.PI * 0.25 // 限制在更高的天空
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i3 + 1] = radius * Math.cos(phi) + 60 // 提高雲的高度
      positions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
      
      scales[i] = Math.random() * 0.8 + 0.3 // 更多樣的大小
      opacities[i] = Math.random() * 0.3 + 0.1 // 隨機透明度
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1))
    geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1))
    
    return geometry
  }, [])
  
  const cloudMaterial = useMemo(() => {
    // 創建更柔和的雲朵紋理
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const context = canvas.getContext('2d')!
    
    // 多層漸變效果，模擬真實雲朵
    const gradient1 = context.createRadialGradient(64, 64, 0, 64, 64, 40)
    gradient1.addColorStop(0, 'rgba(255, 255, 255, 0.8)')
    gradient1.addColorStop(0.4, 'rgba(255, 255, 255, 0.4)')
    gradient1.addColorStop(1, 'rgba(255, 255, 255, 0)')
    
    context.fillStyle = gradient1
    context.fillRect(0, 0, 128, 128)
    
    // 添加第二層更大的漸變
    const gradient2 = context.createRadialGradient(64, 64, 20, 64, 64, 64)
    gradient2.addColorStop(0, 'rgba(255, 255, 255, 0.2)')
    gradient2.addColorStop(0.6, 'rgba(255, 255, 255, 0.1)')
    gradient2.addColorStop(1, 'rgba(255, 255, 255, 0)')
    
    context.globalCompositeOperation = 'screen'
    context.fillStyle = gradient2
    context.fillRect(0, 0, 128, 128)
    
    const texture = new THREE.CanvasTexture(canvas)
    
    return new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture },
        time: { value: 0 },
        opacity: { value: 1 },
        timeOfDay: { value: 1 } // 1 = day, 0 = night
      },
      vertexShader: `
        attribute float scale;
        attribute float opacity;
        varying float vOpacity;
        varying vec2 vUv;
        uniform float time;
        
        void main() {
          vOpacity = opacity;
          vUv = uv;
          
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          
          // 輕微的飄動效果
          float drift = sin(time * 0.1 + position.x * 0.001) * 0.5;
          mvPosition.x += drift;
          
          gl_PointSize = scale * 25.0 * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D map;
        uniform float opacity;
        uniform float timeOfDay;
        varying float vOpacity;
        
        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          if (dist > 0.5) discard;
          
          vec4 texColor = texture2D(map, gl_PointCoord);
          
          // 白天雲朵更明顯，夜晚幾乎透明
          float dayNightOpacity = timeOfDay * 0.6 + 0.1;
          float finalOpacity = texColor.a * vOpacity * opacity * dayNightOpacity;
          
          // 白雲顏色 - 白天純白，夜晚略帶藍色
          vec3 cloudColor = mix(vec3(0.8, 0.9, 1.0), vec3(1.0), timeOfDay);
          
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
      
      // 更新shader uniforms
      material.uniforms.time.value = time
      
      // 根據時間設定日夜狀態
      const dayNightValue = timeOfDay === 'day' ? 1.0 : 0.0
      material.uniforms.timeOfDay.value = dayNightValue
      
      // 非常緩慢的整體旋轉模擬風的效果
      cloudsRef.current.rotation.y += 0.0001
      
      // 輕微的整體飄移
      cloudsRef.current.position.x = Math.sin(time * 0.02) * 5
      cloudsRef.current.position.z = Math.cos(time * 0.015) * 3
      
      // 根據天氣調整雲朵透明度
      let opacity = 0.8 // 基礎透明度
      if (weather === 'rain') opacity = 1.2
      else if (weather === 'storm') opacity = 0.0  // 山雷時不顯示稀薄白雲
      else if (weather === 'fog') opacity = 1.5
      else if (weather === 'clear') opacity = 0.6
      
      material.uniforms.opacity.value = opacity
    }
  })
  
  return (
    <points ref={cloudsRef} geometry={cloudGeometry} material={cloudMaterial} />
  )
}