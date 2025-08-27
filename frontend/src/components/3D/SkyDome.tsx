import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTimeStore, TIME_SETTINGS } from '@/stores/timeStore'

// 天空穹頂組件
export const SkyDome = () => {
  const skyRef = useRef<THREE.Mesh>(null)
  const { timeOfDay, hour } = useTimeStore()
  
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
        mixFactor: { value: 0.5 }
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
        varying vec3 vWorldPosition;
        
        void main() {
          // 計算高度影響（天空漸變）
          float height = normalize(vWorldPosition).y;
          
          // 根據時間混合顏色
          vec3 color;
          
          // 日出日落時的橙紅色
          if (mixFactor > 0.7 && mixFactor < 0.9) {
            color = mix(sunsetColor, dayColor, (mixFactor - 0.7) * 5.0);
          }
          // 黃昏時的紅色
          else if (mixFactor > 0.1 && mixFactor < 0.3) {
            color = mix(nightColor, sunsetColor, (mixFactor - 0.1) * 5.0);
          }
          // 白天
          else if (mixFactor > 0.5) {
            color = dayColor;
          }
          // 夜晚
          else {
            color = nightColor;
          }
          
          // 高度漸變效果
          color = mix(color * 0.7, color, height);
          
          // 添加微妙的雲層效果
          float clouds = sin(vWorldPosition.x * 0.01 + time * 0.1) * 
                        cos(vWorldPosition.z * 0.01 + time * 0.05) * 0.1 + 0.9;
          
          gl_FragColor = vec4(color * clouds, 1.0);
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
      
      // 使用動態的天空顏色插值
      const normalizedHour = hour % 24
      let dayColor = '#87CEEB'    // 預設天藍色
      let nightColor = '#191970'  // 預設深藍夜空
      let sunsetColor = '#FF6347' // 預設日落色
      
      // 根據時間動態計算顏色
      if (normalizedHour >= 5 && normalizedHour < 8) {
        // 黎明時段：橙色到藍色
        const factor = (normalizedHour - 5) / 3
        const dawn = new THREE.Color('#FF8C69')
        const day = new THREE.Color('#87CEEB')
        dayColor = '#' + dawn.lerp(day, factor).getHexString()
        sunsetColor = '#FFA500'
      } else if (normalizedHour >= 8 && normalizedHour < 17) {
        // 白天：藍天
        dayColor = '#87CEEB'
        sunsetColor = '#87CEEB'
      } else if (normalizedHour >= 17 && normalizedHour < 20) {
        // 黃昏時段：藍色到紅色
        const factor = (normalizedHour - 17) / 3
        const day = new THREE.Color('#87CEEB')
        const sunset = new THREE.Color('#DC143C')
        dayColor = '#' + day.lerp(sunset, factor).getHexString()
        sunsetColor = '#FF4500'
      } else if (normalizedHour >= 20 || normalizedHour < 2) {
        // 入夜：紅色到深藍
        const factor = normalizedHour >= 20 ? (normalizedHour - 20) / 6 : (normalizedHour + 4) / 6
        const sunset = new THREE.Color('#DC143C')
        const night = new THREE.Color('#191970')
        dayColor = '#' + sunset.lerp(night, factor).getHexString()
        nightColor = '#191970'
      } else {
        // 深夜到黎明：深藍到橙色
        const factor = (normalizedHour - 2) / 3
        const night = new THREE.Color('#191970')
        const dawn = new THREE.Color('#FF8C69')
        dayColor = '#' + night.lerp(dawn, factor).getHexString()
        nightColor = '#191970'
      }
      
      // 更新shader顏色
      skyRef.current.material.uniforms.dayColor.value.setStyle(dayColor)
      skyRef.current.material.uniforms.nightColor.value.setStyle(nightColor)
      skyRef.current.material.uniforms.sunsetColor.value.setStyle(sunsetColor)
      
      // 平滑的混合因子
      const mixFactor = (normalizedHour % 24) / 24
      skyRef.current.material.uniforms.mixFactor.value = mixFactor
      
      // 更新太陽位置 - 更自然的軌跡
      const sunAngle = (normalizedHour / 24) * Math.PI * 2 - Math.PI / 2
      const sunHeight = Math.max(0, Math.sin(sunAngle / 2)) * 100
      const sunPos = new THREE.Vector3(
        Math.cos(sunAngle) * 150,
        sunHeight,
        -50
      )
      skyRef.current.material.uniforms.sunPosition.value = sunPos
    }
  })
  
  return (
    <mesh ref={skyRef} geometry={skyGeometry} material={skyMaterial} />
  )
}

// 動態雲層系統
export const DynamicClouds = () => {
  const cloudsRef = useRef<THREE.Points>(null)
  const { weather, timeOfDay } = useTimeStore()
  
  const cloudGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(500 * 3) // 500個雲點
    const scales = new Float32Array(500)
    
    for (let i = 0; i < 500; i++) {
      const i3 = i * 3
      
      // 在天空中隨機分布雲點
      const radius = 200 + Math.random() * 200
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI * 0.3 + Math.PI * 0.2 // 限制在天空上方
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i3 + 1] = radius * Math.cos(phi) + 50
      positions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
      
      scales[i] = Math.random() * 0.5 + 0.5
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1))
    
    return geometry
  }, [])
  
  const cloudMaterial = useMemo(() => {
    // 創建雲朵紋理
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const context = canvas.getContext('2d')!
    
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)')
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    
    context.fillStyle = gradient
    context.fillRect(0, 0, 64, 64)
    
    const texture = new THREE.CanvasTexture(canvas)
    
    return new THREE.PointsMaterial({
      map: texture,
      transparent: true,
      opacity: 0.3, // 降低基礎透明度
      size: 12, // 減小雲點大小
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  }, [])
  
  useFrame((state) => {
    if (cloudsRef.current) {
      // 增加雲朵平移效果
      const time = state.clock.elapsedTime
      
      // 緩慢的整體旋轉
      cloudsRef.current.rotation.y += 0.0003
      
      // 增加 X 和 Z 軸的平移飄動
      cloudsRef.current.position.x = Math.sin(time * 0.05) * 20
      cloudsRef.current.position.z = Math.cos(time * 0.03) * 15
      
      // 個別雲朵點的動態移動
      const positions = cloudsRef.current.geometry.attributes.position.array as Float32Array
      for (let i = 0; i < positions.length; i += 3) {
        // 為每個雲點添加個別的飄動效果
        const offsetX = Math.sin(time * 0.02 + i * 0.01) * 2
        const offsetZ = Math.cos(time * 0.015 + i * 0.01) * 1.5
        
        positions[i] += offsetX * 0.01     // X軸微調
        positions[i + 2] += offsetZ * 0.01 // Z軸微調
      }
      cloudsRef.current.geometry.attributes.position.needsUpdate = true
      
      // 根據天氣調整雲朵密度 - 整體更透明
      let opacity = 0.15 // 大幅降低基礎透明度
      if (weather === 'rain' || weather === 'storm') opacity = 0.4
      else if (weather === 'fog') opacity = 0.5
      else if (weather === 'clear') opacity = 0.1
      
      // 夜晚時雲朵更加透明
      if (timeOfDay === 'night') opacity *= 0.3
      
      cloudsRef.current.material.opacity = opacity
    }
  })
  
  return (
    <points ref={cloudsRef} geometry={cloudGeometry} material={cloudMaterial} />
  )
}