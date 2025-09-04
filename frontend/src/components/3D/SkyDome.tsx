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
          
          // 簡化為只有白天和夜晚兩種狀態
          float hourNormalized = mixFactor * 24.0; // 0-24小時
          vec3 color;
          
          // 白天 (6-18點)
          if (hourNormalized >= 6.0 && hourNormalized < 18.0) {
            color = vec3(0.53, 0.81, 0.92); // 天空藍色 #87CEEB
            
            // 晴天時添加太陽光暈效果
            if (weatherDarkness < 0.1) { // 只在晴天時顯示
              float sunGlow = pow(sunInfluence, 8.0) * 0.3;
              color += vec3(1.0, 0.95, 0.8) * sunGlow; // 溫暖的太陽光色
            }
          }
          // 夜晚 (18-6點)
          else {
            color = vec3(0.53, 0.81, 0.92); // 夜晚保持天藍色 #87CEEB
            color *= 0.3; // 降低亮度以區分夜晚
            
            // 月光效果（當太陽在地平線下時）
            if (sunPosition.y < 0.0) {
              vec3 moonDir = normalize(vec3(-sunPosition.x, abs(sunPosition.y), -sunPosition.z));
              float moonInfluence = max(0.0, dot(worldPos, moonDir));
              float moonGlow = pow(moonInfluence, 15.0) * 0.3;
              color += vec3(0.8, 0.8, 1.0) * moonGlow;
            }
          }
          
          // 移除高度漸變效果，保持天空藍色統一
          
          // 移除大氣散射效果，保持純淨的天空藍色
          
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
      let weatherDarkness = 0.0
      if (weather === 'storm') weatherDarkness = 1.0
      else if (weather === 'drizzle') weatherDarkness = 0.2
      else if (weather === 'clear') weatherDarkness = 0.0
      
      skyRef.current.material.uniforms.weatherDarkness.value = weatherDarkness
    }
  })
  
  return (
    <mesh ref={skyRef} geometry={skyGeometry} material={skyMaterial} />
  )
}

// 真實片狀塊狀雲朵系統 - 只在白天晴天顯示
export const ClearSkyWhiteClouds = () => {
  const cloudsGroupRef = useRef<THREE.Group>(null)
  const { weather, timeOfDay, hour } = useTimeStore()
  
  // 創建動森風格的可愛雲朵集群（360度環繞分布，覆蓋整個藍天）
  const cloudClusters = useMemo(() => {
    const clusters: Array<any> = []
    // 計算當前太陽方位角（與 SkyDome 相同邏輯）
    const normalizedHour = (hour ?? 12) % 24
    const sunAngle = (normalizedHour / 24) * Math.PI * 2 - Math.PI / 2
    const sunHeight = Math.sin((normalizedHour - 6) / 12 * Math.PI) * 80
    const sunX = Math.cos(sunAngle) * 200
    const sunZ = Math.sin(sunAngle) * 80
    const sunAzimuth = Math.atan2(sunZ, sunX) // -pi..pi
    // 避免太陽附近的雲：方位±20°，且雲高度偏高時更嚴格
    const excludeAzimuth = (20 / 180) * Math.PI
    // 三個半徑環（近/中/遠），以極座標均勻分布角度，完整覆蓋 360 度
    const rings = [
      // 內環：補藍天中間的空白（高度高、數量適中）
      { radius: 160, y: 92, count: 10, width: 60, height: 12, depth: 22, speed: 0.24 },
      { radius: 220, y: 70, count: 16, width: 70, height: 14, depth: 24, speed: 0.22 },
      { radius: 280, y: 85, count: 18, width: 80, height: 16, depth: 26, speed: 0.18 },
      { radius: 340, y: 100, count: 20, width: 90, height: 18, depth: 28, speed: 0.14 }
    ]
    const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)) // 約 2.39996，均勻分佈角度
    rings.forEach((ring, ringIndex) => {
      for (let i = 0; i < ring.count; i++) {
        // 使用黃金角序列讓角度分佈更均勻，再加極小抖動避免完全規則
        const theta = (i * GOLDEN_ANGLE + ringIndex * 0.7) % (Math.PI * 2)
        const jitterTheta = theta + (Math.random() - 0.5) * (Math.PI / ring.count) * 0.2
        const r = ring.radius + (Math.random() - 0.5) * 10
        const centerX = Math.cos(jitterTheta) * r
        const centerZ = Math.sin(jitterTheta) * r
        // 擴大垂直隨機範圍，避免只形成地平線一條帶
        const centerY = 65 + Math.random() * 45
        // 避開太陽方位：量測角度差
        const clusterAzimuth = Math.atan2(centerZ, centerX)
        let delta = clusterAzimuth - sunAzimuth
        // 正規化到 -pi..pi
        delta = ((delta + Math.PI) % (Math.PI * 2)) - Math.PI
        // 高度越高容忍角度越小
        const heightFactor = Math.min(1, Math.max(0, (centerY - 70) / 40)) // 0~1
        const dynamicExclude = excludeAzimuth * (0.6 + 0.6 * heightFactor)
        if (Math.abs(delta) < dynamicExclude) {
          continue
        }
        const cluster = {
          id: ringIndex * 100 + i,
          centerX,
          centerY,
          centerZ,
          width: ring.width,
          height: ring.height,
          depth: ring.depth,
          speed: ring.speed,
          chunks: [] as any[]
        }
        const numChunks = 16 + Math.floor(Math.random() * 8)
        for (let c = 0; c < numChunks; c++) {
          cluster.chunks.push({
            offsetX: (Math.random() - 0.5) * cluster.width,
            offsetY: (Math.random() - 0.3) * cluster.height * 0.7,
            offsetZ: (Math.random() - 0.5) * cluster.depth,
            scaleX: 0.85 + Math.random() * 1.1,
            scaleY: 0.65 + Math.random() * 0.8,
            scaleZ: 1.0,
            rotationX: 0,
            rotationY: Math.random() * Math.PI * 2,
            rotationZ: 0,
            opacity: 0.12 + Math.random() * 0.18,
            type: 'fluffy'
          })
        }
        clusters.push(cluster)
      }
    })
    // 額外的高空零散雲團，用於填補空白（數量少、尺寸小）
    const scatterCount = 14
    for (let s = 0; s < scatterCount; s++) {
      const theta = Math.random() * Math.PI * 2
      // 也避開太陽附近
      let delta = theta - sunAzimuth
      delta = ((delta + Math.PI) % (Math.PI * 2)) - Math.PI
      if (Math.abs(delta) < excludeAzimuth * 0.8) {
        continue
      }
      const r = 200 + Math.random() * 180
      const centerX = Math.cos(theta) * r
      const centerZ = Math.sin(theta) * r
      const centerY = 90 + Math.random() * 30
      const cluster = {
        id: 9000 + s,
        centerX,
        centerY,
        centerZ,
        width: 60,
        height: 14,
        depth: 20,
        speed: 0.18,
        chunks: [] as any[]
      }
      const numChunks = 8 + Math.floor(Math.random() * 4)
      for (let c = 0; c < numChunks; c++) {
        cluster.chunks.push({
          offsetX: (Math.random() - 0.5) * cluster.width,
          offsetY: (Math.random() - 0.3) * cluster.height * 0.7,
          offsetZ: (Math.random() - 0.5) * cluster.depth,
          scaleX: 0.6 + Math.random() * 0.7,
          scaleY: 0.5 + Math.random() * 0.6,
          scaleZ: 1.0,
          rotationX: 0,
          rotationY: Math.random() * Math.PI * 2,
          rotationZ: 0,
          opacity: 0.12 + Math.random() * 0.18,
          type: 'fluffy'
        })
      }
      clusters.push(cluster)
    }
    return clusters
  }, [])
  
  // 生成一次性的動森風雲紋理（圓形泡泡拼接 + 扁平陰影）
  const acCloudTexture = useMemo(() => {
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, size, size)
    // 雲主體 - 動森風：圓潤泡泡、略扁、下緣較平
    const puffs = [
      { x: 0.28, y: 0.58, r: 0.22 },
      { x: 0.45, y: 0.53, r: 0.27 },
      { x: 0.64, y: 0.58, r: 0.23 },
      { x: 0.37, y: 0.66, r: 0.18 },
      { x: 0.55, y: 0.68, r: 0.16 },
      { x: 0.74, y: 0.64, r: 0.14 }
    ]
    puffs.forEach(p => {
      const g = ctx.createRadialGradient(p.x * size, p.y * size, 0, p.x * size, p.y * size, p.r * size)
      g.addColorStop(0, 'rgba(255,255,255,1)')
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(p.x * size, p.y * size, p.r * size, 0, Math.PI * 2)
      ctx.fill()
    })
    // 不做陰影，保持純白雲
    ctx.globalAlpha = 1
    const tex = new THREE.CanvasTexture(canvas)
    tex.anisotropy = 8
    tex.needsUpdate = true
    return tex
  }, [])
  
  // Sprite 材質（透明、柔邊，不寫入深度便於疊加）
  const spriteBaseMaterial = useMemo(() => {
    return new THREE.SpriteMaterial({
      map: acCloudTexture,
      transparent: true,
      depthWrite: false,
      color: new THREE.Color('#FFFFFF')
    })
  }, [acCloudTexture])
  // 不使用陰影材質（保持純白）
  
  // 移除動森風格雲朵飄動動畫 - 雲朵保持靜止
  // useFrame 已被移除，雲朵不再有移動動畫
  
  // 白天晴天的藍天白雲效果
  const shouldShow = timeOfDay === 'day' && weather === 'clear'
  if (!shouldShow) {
    return null
  }
  
  return (
    <group ref={cloudsGroupRef}>
      {cloudClusters.map((cluster) => (
        <group
          key={cluster.id}
          position={[cluster.centerX, cluster.centerY, cluster.centerZ]}
        >
          {cluster.chunks.map((chunk, chunkIndex) => {
            const baseScale = Math.max(chunk.scaleX, chunk.scaleY, chunk.scaleZ)
            const mat = spriteBaseMaterial.clone()
            // 純白柔邊
            mat.opacity = 0.7 + Math.random() * 0.12
            return (
              <sprite
                key={chunkIndex}
                material={mat}
                position={[chunk.offsetX, chunk.offsetY, chunk.offsetZ]}
                scale={[15.5 * chunk.scaleX, 9.0 * chunk.scaleY, 1]}
                rotation={[0, chunk.rotationY, 0]}
                userData={{ 
                  originalX: chunk.offsetX, 
                  originalY: chunk.offsetY,
                  baseScale: baseScale,
                  baseScaleX: 16 * chunk.scaleX,
                  baseScaleY: 10 * chunk.scaleY
                }}
              />
            )
          })}
        </group>
      ))}
    </group>
  )
}