import React, { useRef, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTimeStore } from '@/stores/timeStore'

// 雷電線條組件
export const LightningBolt = React.forwardRef<any, { intensity?: number }>(({ intensity = 1 }, ref) => {
  const lightningRef = useRef<THREE.Group>(null)
  
  const createLightningBolt = useMemo(() => {
    return (startPos: THREE.Vector3, endPos: THREE.Vector3) => {
      const points = [startPos.clone()]
      const steps = 8 + Math.random() * 12 // 8-20 段
      
      for (let i = 1; i < steps; i++) {
        const t = i / steps
        const basePos = startPos.clone().lerp(endPos, t)
        
        // 添加隨機偏移創造鋸齒狀
        const randomOffset = new THREE.Vector3(
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 15
        )
        
        basePos.add(randomOffset)
        points.push(basePos)
      }
      
      points.push(endPos.clone())
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      const material = new THREE.LineBasicMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0.9,
        linewidth: 3
      })
      
      return new THREE.Line(geometry, material)
    }
  }, [])
  
  const triggerLightning = React.useCallback(() => {
    if (!lightningRef.current) return
    
    // 清除舊的雷電
    lightningRef.current.clear()
    
    // 創建主雷電
    const startPos = new THREE.Vector3(
      (Math.random() - 0.5) * 200,
      60 + Math.random() * 40,
      (Math.random() - 0.5) * 200
    )
    
    const endPos = new THREE.Vector3(
      startPos.x + (Math.random() - 0.5) * 100,
      0,
      startPos.z + (Math.random() - 0.5) * 100
    )
    
    const mainBolt = createLightningBolt(startPos, endPos)
    lightningRef.current.add(mainBolt)
    
    // 創建分支雷電
    const branches = 2 + Math.random() * 3
    for (let i = 0; i < branches; i++) {
      const t = 0.3 + Math.random() * 0.4
      const branchStart = startPos.clone().lerp(endPos, t)
      
      const branchEnd = new THREE.Vector3(
        branchStart.x + (Math.random() - 0.5) * 60,
        Math.random() * 20,
        branchStart.z + (Math.random() - 0.5) * 60
      )
      
      const branch = createLightningBolt(branchStart, branchEnd)
      branch.material.opacity = 0.6
      lightningRef.current.add(branch)
    }
    
    // 雷電持續時間
    setTimeout(() => {
      if (lightningRef.current) {
        lightningRef.current.clear()
      }
    }, 100 + Math.random() * 200)
  }, [createLightningBolt])
  
  React.useImperativeHandle(ref, () => ({
    triggerLightning
  }), [triggerLightning])
  
  return <group ref={lightningRef} />
})

// 真實暴雨雲層效果
export const StormClouds = ({ intensity = 1 }: { intensity?: number }) => {
  const cloudsRef = useRef<THREE.Points>(null)
  
  const cloudGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(1200 * 3) // 進一步增加到1200個雲粒子，讓山雷更壯觀
    const velocities = new Float32Array(1200 * 3)
    const sizes = new Float32Array(1200)
    const opacities = new Float32Array(1200)
    const turbulence = new Float32Array(1200)
    const heights = new Float32Array(1200)
    
    for (let i = 0; i < 1200; i++) {
      const i3 = i * 3
      
      // 創建多個巨大雲團中心，讓山雷更壯觀
      const clusterCenters = [
        { x: 0, z: 0, weight: 0.4 },      // 主雲團中心
        { x: -60, z: 30, weight: 0.25 },  // 次雲團1
        { x: 40, z: -20, weight: 0.2 },   // 次雲團2
        { x: 20, z: 60, weight: 0.15 }    // 次雲團3
      ]
      
      // 根據權重選擇雲團中心
      const rand = Math.random()
      let selectedCluster = clusterCenters[0] // 默認主雲團
      let cumulativeWeight = 0
      
      for (const cluster of clusterCenters) {
        cumulativeWeight += cluster.weight
        if (rand <= cumulativeWeight) {
          selectedCluster = cluster
          break
        }
      }
      
      const mainCluster = { x: selectedCluster.x, z: selectedCluster.z }
      
      // 使用四層分布創造更壯觀的雲團結構
      const layerType = Math.random()
      let radius, yOffset, density
      
      if (layerType < 0.3) {
        // 超密核心層 (30% 粒子) - 最濃密的雲核
        radius = Math.random() * 80 + 30 // 30-110米
        yOffset = 58 + (Math.random() - 0.5) * 15 // 50.5-65.5米
        density = 0.9 + Math.random() * 0.1 // 極高密度
      } else if (layerType < 0.6) {
        // 主體雲層 (30% 粒子)
        radius = Math.random() * 130 + 50 // 50-180米
        yOffset = 55 + (Math.random() - 0.5) * 22 // 44-66米
        density = 0.7 + Math.random() * 0.2
      } else if (layerType < 0.85) {
        // 中層擴散 (25% 粒子)  
        radius = Math.random() * 180 + 90 // 90-270米
        yOffset = 50 + (Math.random() - 0.5) * 35 // 32.5-67.5米
        density = 0.5 + Math.random() * 0.3
      } else {
        // 外圍雲霧 (15% 粒子) - 營造廣闊感
        radius = Math.random() * 220 + 120 // 120-340米
        yOffset = 45 + (Math.random() - 0.5) * 45 // 22.5-67.5米
        density = 0.2 + Math.random() * 0.4
      }
      
      // 使用柏林噪聲創造自然雲團邊緣
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI * 0.8 + 0.1 // 避免完全垂直
      
      // 添加噪聲使邊緣不規則
      const noiseScale = 0.02
      const noise = Math.sin(theta * 3) * Math.cos(phi * 2) * 0.3 + 
                   Math.sin(theta * 7) * Math.cos(phi * 5) * 0.1
      const adjustedRadius = radius * (1 + noise)
      
      const x = Math.sin(phi) * Math.cos(theta) * adjustedRadius * 1.2 // X軸拉伸
      const y = Math.cos(phi) * adjustedRadius * 0.3 + yOffset        // Y軸壓縮但不過度
      const z = Math.sin(phi) * Math.sin(theta) * adjustedRadius * 0.9 // Z軸稍微壓縮
      
      positions[i3] = mainCluster.x + x
      positions[i3 + 1] = Math.max(25, Math.min(85, y))
      positions[i3 + 2] = mainCluster.z + z
      
      // 儲存密度信息
      opacities[i] = density * (0.5 + Math.random() * 0.4)
      
      // 減少風力影響，保持雲塊形狀
      const windStrength = 0.05 + Math.random() * 0.1 // 大幅降低風力
      velocities[i3] = (Math.random() - 0.5) * windStrength
      velocities[i3 + 1] = (Math.random() - 0.5) * windStrength * 0.5
      velocities[i3 + 2] = (Math.random() - 0.5) * windStrength
      
      // 根據距離中心的遠近調整大小 - 中心大，邊緣小
      const distanceFromCenter = Math.sqrt(x*x + z*z) / 200
      const sizeFactor = Math.max(0.3, 1.2 - distanceFromCenter) // 中心1.2，邊緣0.3
      
      const baseSizes = [35, 50, 70, 90, 110, 130]
      const sizeIndex = Math.floor(Math.random() * baseSizes.length)  
      const baseSize = baseSizes[sizeIndex] * sizeFactor
      sizes[i] = baseSize + Math.random() * (baseSize * 0.2)
      
      // 降低湍流因子，讓雲團更穩定
      turbulence[i] = 0.3 + Math.random() * 0.4
      heights[i] = positions[i3 + 1]
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1))
    geometry.setAttribute('turbulence', new THREE.BufferAttribute(turbulence, 1))
    geometry.setAttribute('height', new THREE.BufferAttribute(heights, 1))
    
    return geometry
  }, [])
  
  const cloudMaterial = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const context = canvas.getContext('2d')!
    
    // 創建不規則雲朵紋理
    context.clearRect(0, 0, 512, 512)
    
    // 使用多層噪聲創造真實雲朵效果
    const createCloudNoise = (ctx: CanvasRenderingContext2D, scale: number, opacity: number) => {
      const imageData = ctx.createImageData(512, 512)
      const data = imageData.data
      
      for (let x = 0; x < 512; x++) {
        for (let y = 0; y < 512; y++) {
          const i = (y * 512 + x) * 4
          
          // 多層柏林噪聲模擬
          const noise1 = Math.sin(x * 0.01 * scale) * Math.cos(y * 0.01 * scale)
          const noise2 = Math.sin(x * 0.02 * scale) * Math.cos(y * 0.02 * scale) * 0.5
          const noise3 = Math.sin(x * 0.04 * scale) * Math.cos(y * 0.04 * scale) * 0.25
          
          const combined = (noise1 + noise2 + noise3) * 0.5 + 0.5
          
          // 距離中心的衰減
          const centerX = 256, centerY = 256
          const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2) / 256
          const falloff = Math.max(0, 1 - distance * distance)
          
          const value = combined * falloff * opacity
          
          // 暗雲色調
          const gray = Math.floor(value * 80 + 20) // 20-100 灰階
          data[i] = gray     // R
          data[i + 1] = gray // G  
          data[i + 2] = gray + 10 // B 稍微偏藍
          data[i + 3] = Math.floor(value * 255) // Alpha
        }
      }
      
      ctx.putImageData(imageData, 0, 0)
    }
    
    // 創建多層雲朵效果
    createCloudNoise(context, 1.0, 1.0)
    
    // 添加第二層細節
    context.globalCompositeOperation = 'multiply'
    createCloudNoise(context, 1.5, 0.7)
    
    // 添加邊緣模糊效果
    context.globalCompositeOperation = 'source-atop'
    const centerGradient = context.createRadialGradient(256, 256, 0, 256, 256, 256)
    centerGradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
    centerGradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.8)')
    centerGradient.addColorStop(0.9, 'rgba(255, 255, 255, 0.3)')
    centerGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    
    context.fillStyle = centerGradient
    context.fillRect(0, 0, 512, 512)
    
    const texture = new THREE.CanvasTexture(canvas)
    
    return new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture },
        time: { value: 0 },
        opacity: { value: 0.8 }
      },
      vertexShader: `
        attribute float turbulence;
        attribute float height;
        varying vec2 vUv;
        varying float vTurbulence;
        varying float vHeight;
        uniform float time;
        
        void main() {
          vUv = uv;
          vTurbulence = turbulence;
          vHeight = height;
          
          vec3 pos = position;
          
          // 高度相關的擺動
          float altitudeSwing = (height - 35.0) / 65.0;
          pos.x += sin(time * 0.3 + position.z * 0.01) * turbulence * altitudeSwing;
          pos.z += cos(time * 0.25 + position.x * 0.01) * turbulence * altitudeSwing;
          
          // 垂直湍流
          pos.y += sin(time * 0.4 + position.x * 0.02 + position.z * 0.02) * 2.0;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = 100.0 * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D map;
        uniform float opacity;
        varying float vTurbulence;
        varying float vHeight;
        
        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          
          if (dist > 0.5) discard;
          
          vec4 texColor = texture2D(map, gl_PointCoord);
          
          // 更自然的雲團漸變色彩
          float heightFactor = (vHeight - 25.0) / 60.0;
          
          // 創造更豐富的雲團色彩
          vec3 darkCloudColor = vec3(0.15, 0.15, 0.2);   // 深灰藍
          vec3 midCloudColor = vec3(0.35, 0.35, 0.4);    // 中灰
          vec3 lightCloudColor = vec3(0.55, 0.55, 0.6);  // 亮灰
          
          vec3 cloudColor;
          if (heightFactor < 0.5) {
            cloudColor = mix(darkCloudColor, midCloudColor, heightFactor * 2.0);
          } else {
            cloudColor = mix(midCloudColor, lightCloudColor, (heightFactor - 0.5) * 2.0);
          }
          
          // 距離中心的亮度變化 - 中心較暗，邊緣較亮
          vec2 center = gl_PointCoord - 0.5;
          float centerDist = length(center);
          float centerBrightness = 0.8 + centerDist * 0.4;
          cloudColor *= centerBrightness;
          
          // 柔和的透明度
          float edgeFade = 1.0 - smoothstep(0.3, 0.5, centerDist);
          float finalOpacity = texColor.a * opacity * edgeFade * (0.6 + vTurbulence * 0.2);
          
          gl_FragColor = vec4(cloudColor, finalOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    })
  }, [])
  
  useFrame((state) => {
    if (!cloudsRef.current) return
    
    const time = state.clock.elapsedTime
    const material = cloudsRef.current.material as THREE.ShaderMaterial
    const positions = cloudsRef.current.geometry.attributes.position.array as Float32Array
    const velocities = cloudsRef.current.geometry.attributes.velocity.array as Float32Array
    const turbulence = cloudsRef.current.geometry.attributes.turbulence.array as Float32Array
    const heights = cloudsRef.current.geometry.attributes.height.array as Float32Array
    
    // 更新shader時間
    material.uniforms.time.value = time
    
    for (let i = 0; i < positions.length; i += 3) {
      const particleIndex = i / 3
      const turbulenceFactor = turbulence[particleIndex]
      const height = heights[particleIndex]
      
      // 極輕微的基礎移動，保持塊狀
      positions[i] += velocities[i] * intensity * 0.3
      positions[i + 1] += velocities[i + 1] * intensity * 0.2
      positions[i + 2] += velocities[i + 2] * intensity * 0.3
      
      // 減少湍流效果，保持密集塊狀
      const minimalTurbulence = turbulenceFactor * 0.1
      const turbulentX = Math.sin(time * 0.05 + particleIndex * 0.1) * minimalTurbulence
      const turbulentZ = Math.cos(time * 0.04 + particleIndex * 0.1) * minimalTurbulence
      const verticalTurbulence = Math.sin(time * 0.03 + particleIndex * 0.05) * minimalTurbulence * 0.5
      
      positions[i] += turbulentX
      positions[i + 1] += verticalTurbulence  
      positions[i + 2] += turbulentZ
      
      // 輕柔的向心聚集力
      const mainCluster = { x: 0, z: 0 } // 單一中心雲團
      const toClusterX = (mainCluster.x - positions[i]) * 0.001 // 更輕微的向心力
      const toClusterZ = (mainCluster.z - positions[i + 2]) * 0.001
      const toClusterY = (55 - positions[i + 1]) * 0.0005 // 向55米高度聚集
      
      positions[i] += toClusterX
      positions[i + 1] += toClusterY
      positions[i + 2] += toClusterZ
      
      // 自然邊界 - 讓邊緣粒子自然消散重生
      const distanceFromCenter = Math.sqrt(
        positions[i] ** 2 + positions[i + 2] ** 2
      )
      
      if (distanceFromCenter > 250) {
        // 在邊緣重新生成，模擬雲團自然邊界
        const newTheta = Math.random() * Math.PI * 2
        const newPhi = Math.random() * Math.PI * 0.8 + 0.1
        const newRadius = Math.random() * 120 + 40
        
        // 添加噪聲
        const noise = Math.sin(newTheta * 3) * Math.cos(newPhi * 2) * 0.3
        const adjustedRadius = newRadius * (1 + noise)
        
        positions[i] = Math.sin(newPhi) * Math.cos(newTheta) * adjustedRadius * 1.2
        positions[i + 2] = Math.sin(newPhi) * Math.sin(newTheta) * adjustedRadius * 0.9
        positions[i + 1] = Math.cos(newPhi) * adjustedRadius * 0.3 + 55
      }
      
      // 高度自然限制
      if (positions[i + 1] < 25 || positions[i + 1] > 85) {
        positions[i + 1] = 45 + (Math.random() - 0.5) * 30 // 30-60米
        heights[particleIndex] = positions[i + 1]
      }
    }
    
    cloudsRef.current.geometry.attributes.position.needsUpdate = true
    cloudsRef.current.geometry.attributes.height.needsUpdate = true
  })
  
  return <points ref={cloudsRef} geometry={cloudGeometry} material={cloudMaterial} />
}

// 山雷雷電效果組件 - 完整的雷暴效果
export const MountainStormEffect = () => {
  const { weather } = useTimeStore()
  const lightningRef = useRef<THREE.PointLight>(null)
  const ambientLightRef = useRef<THREE.AmbientLight>(null)
  const lightningBoltRef = useRef<any>(null)
  
  const [lightningActive, setLightningActive] = useState(false)
  
  // 雷電聲效模擬（通過光照變化）
  const triggerLightning = () => {
    if (lightningActive) return
    
    setLightningActive(true)
    
    // 雷電持續時間：200-500ms
    const duration = 200 + Math.random() * 300
    
    setTimeout(() => {
      setLightningActive(false)
    }, duration)
    
    // 可能的後續閃電（雙重或三重閃電）
    if (Math.random() < 0.4) { // 40%機率
      setTimeout(() => {
        if (Math.random() < 0.6) {
          triggerLightning()
        }
      }, duration + 300 + Math.random() * 800)
    }
  }
  
  useFrame((state) => {
    // 只在山雷天氣時顯示雷電
    const isStormActive = weather === 'storm'
    
    if (!isStormActive) return
    
    // 雷電效果
    if (lightningRef.current && ambientLightRef.current) {
      // 隨機觸發雷電 - 山雷較為頻繁
      if (Math.random() < 0.006) { // 0.6% 機率每幀
        triggerLightning()
      }
      
      if (lightningActive) {
        // 主雷電光源
        const flashIntensity = 12 + Math.random() * 18 // 12-30 更強烈閃光
        lightningRef.current.intensity = flashIntensity
        lightningRef.current.color.setHSL(0.55, 0.4, 1) // 更藍的雷電
        
        // 設置雷電位置（在雲層中）
        lightningRef.current.position.x = (Math.random() - 0.5) * 400
        lightningRef.current.position.y = 70 + Math.random() * 50
        lightningRef.current.position.z = (Math.random() - 0.5) * 400
        
        // 環境光增強（雷電照亮整個場景）
        ambientLightRef.current.intensity = 0.4 + Math.random() * 0.6
        ambientLightRef.current.color.setHSL(0.55, 0.3, 1)
        
        // 閃爍效果
        if (Math.random() < 0.4) {
          lightningRef.current.intensity *= 0.2
          ambientLightRef.current.intensity *= 0.3
        }
      } else {
        // 恢復正常
        lightningRef.current.intensity = 0
        ambientLightRef.current.intensity = 0
      }
    }
  })
  
  const isStormActive = weather === 'storm'
  
  return (
    <>
      {isStormActive && (
        <>
          {/* 暴雨雲層 */}
          <StormClouds intensity={1.5} />
          
          {/* 雷電主光源 - 只保留光照效果 */}
          <pointLight
            ref={lightningRef}
            color="#E6F3FF"
            intensity={0}
            position={[0, 80, 0]}
            distance={800}
            decay={1.5}
          />
          
          {/* 雷電環境光 */}
          <ambientLight
            ref={ambientLightRef}
            color="#E6F3FF"
            intensity={0}
          />
        </>
      )}
    </>
  )
}