import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTimeStore } from '@/stores/timeStore'

// 山地大氣層效果
export const MountainAtmosphere = () => {
  const atmosphereRef = useRef<THREE.Mesh>(null)
  const { hour, weather, timeOfDay } = useTimeStore()
  
  const atmosphereGeometry = useMemo(() => {
    return new THREE.SphereGeometry(400, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.7)
  }, [])
  
  const atmosphereMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        hour: { value: 6 },
        altitude: { value: 1.0 }, // 山地海拔因子
        weatherFactor: { value: 1.0 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying float vElevation;
        
        void main() {
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          vElevation = position.y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float hour;
        uniform float altitude;
        uniform float weatherFactor;
        varying vec3 vWorldPosition;
        varying float vElevation;
        
        // 山地大氣散射計算
        vec3 getMountainAtmosphere(float h, float elevation) {
          vec3 color;
          float normalizedHour = mod(h, 24.0);
          
          // 高海拔大氣稀薄效果
          float altitudeEffect = mix(1.0, 0.6, altitude);
          float heightGradient = smoothstep(0.0, 1.0, elevation);
          
          // 山地特有的色彩變化
          if (normalizedHour >= 5.0 && normalizedHour < 7.0) {
            // 山地黎明 - 高海拔先亮
            float factor = (normalizedHour - 5.0) / 2.0;
            vec3 mountainDawn = vec3(0.8, 0.5, 0.7); // 山地紫調黎明
            vec3 earlyMorning = vec3(1.0, 0.7, 0.4);
            color = mix(mountainDawn, earlyMorning, factor);
            color *= altitudeEffect;
          }
          else if (normalizedHour >= 7.0 && normalizedHour < 9.0) {
            // 陽光翻山 - 金輝效果
            float factor = (normalizedHour - 7.0) / 2.0;
            vec3 goldPeak = vec3(1.0, 0.8, 0.3);
            vec3 clearMountain = vec3(0.7, 0.9, 1.0);
            color = mix(goldPeak, clearMountain, factor);
          }
          else if (normalizedHour >= 9.0 && normalizedHour < 16.0) {
            // 山地白天 - 清澈藍天
            color = vec3(0.4, 0.7, 1.0) * altitudeEffect;
          }
          else if (normalizedHour >= 16.0 && normalizedHour < 18.0) {
            // 山影時刻
            float factor = (normalizedHour - 16.0) / 2.0;
            vec3 afternoon = vec3(0.4, 0.7, 1.0);
            vec3 mountainShadow = vec3(0.6, 0.4, 0.8);
            color = mix(afternoon, mountainShadow, factor);
          }
          else if (normalizedHour >= 18.0 && normalizedHour < 20.0) {
            // 山後晚霞
            float factor = (normalizedHour - 18.0) / 2.0;
            vec3 alpenglow = vec3(1.0, 0.4, 0.6); // 阿爾卑斯輝光
            vec3 dusk = vec3(0.4, 0.2, 0.6);
            color = mix(alpenglow, dusk, factor);
          }
          else {
            // 山地夜晚 - 高海拔星空
            color = vec3(0.1, 0.15, 0.3) * altitudeEffect;
          }
          
          // 高度漸變 - 模擬大氣層次
          color = mix(color * 0.3, color, heightGradient);
          
          return color;
        }
        
        void main() {
          vec3 atmosColor = getMountainAtmosphere(hour, vElevation);
          
          // 天氣影響
          if (weatherFactor > 1.5) {
            // 風暴天氣
            atmosColor = mix(atmosColor, vec3(0.3, 0.3, 0.4), 0.6);
          } else if (weatherFactor < 0.5) {
            // 晴朗天氣
            atmosColor *= 1.2;
          }
          
          // 大氣透明度基於高度
          float opacity = smoothstep(0.2, 0.8, vElevation) * 0.15;
          
          gl_FragColor = vec4(atmosColor, opacity);
        }
      `,
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false
    })
  }, [])
  
  useFrame((state) => {
    if (atmosphereRef.current && atmosphereRef.current.material instanceof THREE.ShaderMaterial) {
      const normalizedHour = hour % 24
      
      atmosphereRef.current.material.uniforms.time.value = state.clock.elapsedTime
      atmosphereRef.current.material.uniforms.hour.value = normalizedHour
      
      // 根據天氣調整大氣效果
      let weatherFactor = 1.0
      if (weather === 'storm') weatherFactor = 2.0
      else if (weather === 'rain') weatherFactor = 1.5
      else if (weather === 'fog') weatherFactor = 1.3
      else if (weather === 'clear') weatherFactor = 0.8
      
      atmosphereRef.current.material.uniforms.weatherFactor.value = weatherFactor
      
      // 輕微旋轉模擬大氣流動
      atmosphereRef.current.rotation.y += 0.00002
    }
  })
  
  return (
    <mesh ref={atmosphereRef} geometry={atmosphereGeometry} material={atmosphereMaterial} />
  )
}

// 山峰反照效果
export const MountainReflection = () => {
  const reflectionRef = useRef<THREE.Mesh>(null)
  const { hour, timeOfDay, weather } = useTimeStore()
  
  const reflectionGeometry = useMemo(() => {
    // 創建地面反射平面
    return new THREE.PlaneGeometry(500, 500, 1, 1)
  }, [])
  
  const reflectionMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        hour: { value: 6 },
        sunIntensity: { value: 1.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        
        void main() {
          vUv = uv;
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float hour;
        uniform float sunIntensity;
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        
        void main() {
          vec2 center = vUv - 0.5;
          float dist = length(center);
          
          // 山地反射光暈
          float glow = 1.0 - smoothstep(0.1, 0.5, dist);
          glow *= sunIntensity;
          
          // 基於時間的顏色變化
          float normalizedHour = mod(hour, 24.0);
          vec3 reflectionColor;
          
          if (normalizedHour >= 6.0 && normalizedHour < 18.0) {
            // 白天山地反射
            reflectionColor = vec3(0.9, 0.95, 1.0);
          } else {
            // 夜晚山地反射
            reflectionColor = vec3(0.3, 0.4, 0.6);
          }
          
          float opacity = glow * 0.1;
          gl_FragColor = vec4(reflectionColor, opacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  }, [])
  
  useFrame((state) => {
    if (reflectionRef.current && reflectionRef.current.material instanceof THREE.ShaderMaterial) {
      const normalizedHour = hour % 24
      
      // 在山雷時隱藏地面反射平面
      reflectionRef.current.visible = weather !== 'storm'
      
      reflectionRef.current.material.uniforms.time.value = state.clock.elapsedTime
      reflectionRef.current.material.uniforms.hour.value = normalizedHour
      
      // 白天有更強的反射效果
      const sunIntensity = timeOfDay === 'day' ? 1.0 : 0.2
      reflectionRef.current.material.uniforms.sunIntensity.value = sunIntensity
    }
  })
  
  return (
    <mesh 
      ref={reflectionRef} 
      geometry={reflectionGeometry} 
      material={reflectionMaterial}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.1, 0]}
    />
  )
}

// 山地風效粒子
export const MountainWind = () => {
  const windRef = useRef<THREE.Points>(null)
  const { weather, hour } = useTimeStore()
  
  const windGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(100 * 3) // 大幅減少風粒子數量
    const velocities = new Float32Array(100 * 3)
    const sizes = new Float32Array(100)
    
    for (let i = 0; i < 100; i++) {
      const i3 = i * 3
      
      // 在空中隨機分布風粒子
      positions[i3] = (Math.random() - 0.5) * 200
      positions[i3 + 1] = Math.random() * 50 + 10
      positions[i3 + 2] = (Math.random() - 0.5) * 200
      
      // 風的方向性 - 山地多變風向
      velocities[i3] = (Math.random() - 0.5) * 0.1
      velocities[i3 + 1] = Math.random() * 0.02 - 0.01
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.1
      
      sizes[i] = Math.random() * 0.5 + 0.1
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    
    return geometry
  }, [])
  
  const windMaterial = useMemo(() => {
    // 創建圓形風粒子紋理
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const context = canvas.getContext('2d')!
    
    context.clearRect(0, 0, 64, 64)
    
    // 創建柔和的圓形漸變
    const centerX = 32
    const centerY = 32
    
    const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, 32)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)')
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    
    context.fillStyle = gradient
    context.beginPath()
    context.arc(centerX, centerY, 32, 0, Math.PI * 2)
    context.fill()
    
    const texture = new THREE.CanvasTexture(canvas)
    
    return new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture },
        opacity: { value: 0.02 } // 進一步降低透明度
      },
      vertexShader: `
        attribute float size;
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * 20.0 * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D map;
        uniform float opacity;
        
        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          
          // 圓形裁剪
          if (dist > 0.5) discard;
          
          vec4 texColor = texture2D(map, gl_PointCoord);
          
          // 圓形漸變
          float circleFade = 1.0 - smoothstep(0.2, 0.5, dist);
          
          float finalOpacity = texColor.a * opacity * circleFade;
          
          gl_FragColor = vec4(vec3(1.0), finalOpacity);
        }
      `,
      transparent: true,
      depthWrite: false
    })
  }, [])
  
  useFrame((state) => {
    if (windRef.current) {
      const time = state.clock.elapsedTime
      const positions = windRef.current.geometry.attributes.position.array as Float32Array
      const velocities = windRef.current.geometry.attributes.velocity.array as Float32Array
      
      // 根據天氣調整風強度
      let windStrength = 1.0
      if (weather === 'windy') windStrength = 4.0        // 大風天氣時顯著增強
      else if (weather === 'storm') windStrength = 5.0   // 山雷時風力更強
      else if (weather === 'clear') windStrength = 0.0   // 晴天完全沒有風效粒子
      else if (weather === 'fog') windStrength = 0.3
      
      // 根據時間調整風的可見度 - 大風天氣時增強可見度
      const normalizedHour = hour % 24
      let visibility = 0.01 // 基礎可見度
      if (weather === 'clear') {
        visibility = 0.0 // 晴天完全不可見
      } else if (weather === 'windy') {
        visibility = 0.08 // 大風天氣時顯著提升可見度
      } else if (weather === 'storm') {
        visibility = 0.15 // 山雷天氣時最高可見度，比大風更明顯
      } else if (normalizedHour >= 6 && normalizedHour < 18) {
        visibility = 0.005 // 白天風粒子較不可見
      }
      
      (windRef.current.material as THREE.ShaderMaterial).uniforms.opacity.value = visibility * windStrength
      
      // 風粒子動畫
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] += velocities[i] * windStrength
        positions[i + 1] += velocities[i + 1] * windStrength
        positions[i + 2] += velocities[i + 2] * windStrength
        
        // 邊界重置
        if (Math.abs(positions[i]) > 100) {
          positions[i] = (Math.random() - 0.5) * 200
        }
        if (positions[i + 1] > 60 || positions[i + 1] < 5) {
          positions[i + 1] = Math.random() * 50 + 10
        }
        if (Math.abs(positions[i + 2]) > 100) {
          positions[i + 2] = (Math.random() - 0.5) * 200
        }
      }
      
      windRef.current.geometry.attributes.position.needsUpdate = true
    }
  })
  
  return null // MountainWind 白色圓點已移除
}