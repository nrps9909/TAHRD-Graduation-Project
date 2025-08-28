import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTimeStore } from '@/stores/timeStore'

// 山地薄霧組件
export const MountainFog = () => {
  const fogRef = useRef<THREE.Points>(null)
  const { weather, timeOfDay, hour } = useTimeStore()
  
  const fogGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(30 * 3) // 進一步減少數量，保持淡雅
    const scales = new Float32Array(30)
    const velocities = new Float32Array(30 * 3)
    const heights = new Float32Array(30)
    
    for (let i = 0; i < 30; i++) {
      const i3 = i * 3
      
      // 只在山脈高處分布濃霧
      const radius = 80 + Math.random() * 120 
      const theta = Math.random() * Math.PI * 2
      const height = Math.random() * 20 + 30 // 30-50米高度，只在山脈高處
      
      // 分布在山脈周圍的高海拔區域
      positions[i3] = Math.cos(theta) * radius + (Math.random() - 0.5) * 100
      positions[i3 + 1] = height
      positions[i3 + 2] = Math.sin(theta) * radius + (Math.random() - 0.5) * 100
      
      scales[i] = Math.random() * 4 + 2 // 更大的霧塊尺寸 2-6倍
      heights[i] = height // 記錄初始高度
      
      // 緩慢的飄動速度
      velocities[i3] = (Math.random() - 0.5) * 0.01
      velocities[i3 + 1] = Math.random() * 0.002 + 0.001
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.01
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1))
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3))
    geometry.setAttribute('initialHeight', new THREE.BufferAttribute(heights, 1))
    
    return geometry
  }, [])
  
  const fogMaterial = useMemo(() => {
    // 創建不規則霧塊的紋理
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 1024
    const context = canvas.getContext('2d')!
    
    // 清除畫布
    context.clearRect(0, 0, 1024, 1024)
    
    // 創建不規則霧塊效果
    const centerX = 512
    const centerY = 512
    
    // 使用多個不規則形狀組成霧塊
    context.globalCompositeOperation = 'source-over'
    
    // 創建主霧塊 - 有機不規則形狀
    for (let i = 0; i < 6; i++) {
      const offsetX = (Math.random() - 0.5) * 250
      const offsetY = (Math.random() - 0.5) * 250
      const baseSize = 100 + Math.random() * 140
      const opacity = 0.4 + Math.random() * 0.5
      
      // 創建多個重疊的有機形狀
      for (let blob = 0; blob < 3 + Math.floor(Math.random() * 4); blob++) {
        const blobOffsetX = offsetX + (Math.random() - 0.5) * 80
        const blobOffsetY = offsetY + (Math.random() - 0.5) * 80
        const blobSize = baseSize * (0.6 + Math.random() * 0.8)
        const blobOpacity = opacity * (0.3 + Math.random() * 0.7)
        
        const gradient = context.createRadialGradient(
          centerX + blobOffsetX, centerY + blobOffsetY, 0,
          centerX + blobOffsetX, centerY + blobOffsetY, blobSize
        )
        gradient.addColorStop(0, `rgba(255, 255, 255, ${blobOpacity})`)
        gradient.addColorStop(0.2, `rgba(255, 255, 255, ${blobOpacity * 0.8})`)
        gradient.addColorStop(0.5, `rgba(255, 255, 255, ${blobOpacity * 0.4})`)
        gradient.addColorStop(0.8, `rgba(255, 255, 255, ${blobOpacity * 0.1})`)
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
        
        context.fillStyle = gradient
        
        // 使用多次貝塞爾曲線創建有機形狀
        context.beginPath()
        const points = 8 + Math.floor(Math.random() * 8) // 8-16個控制點
        const angles = []
        const radii = []
        
        // 生成不規則的控制點
        for (let p = 0; p < points; p++) {
          angles[p] = (p / points) * Math.PI * 2
          // 使用正弦波和噪聲創建有機的半徑變化
          const noise1 = Math.sin(p * 0.7) * 0.3
          const noise2 = Math.sin(p * 1.3 + 0.5) * 0.2
          const noise3 = Math.sin(p * 2.1 + 1.2) * 0.15
          const randomFactor = 0.5 + Math.random() * 0.8
          radii[p] = blobSize * (0.6 + noise1 + noise2 + noise3 + randomFactor * 0.3)
        }
        
        // 使用平滑的貝塞爾曲線連接點
        for (let p = 0; p < points; p++) {
          const angle = angles[p]
          const radius = radii[p]
          const x = centerX + blobOffsetX + Math.cos(angle) * radius
          const y = centerY + blobOffsetY + Math.sin(angle) * radius
          
          if (p === 0) {
            context.moveTo(x, y)
          } else {
            // 計算控制點以創建平滑曲線
            const prevAngle = angles[p - 1]
            const prevRadius = radii[p - 1]
            const prevX = centerX + blobOffsetX + Math.cos(prevAngle) * prevRadius
            const prevY = centerY + blobOffsetY + Math.sin(prevAngle) * prevRadius
            
            // 創建弧形控制點
            const midAngle = (angle + prevAngle) / 2
            const controlDistance = (radius + prevRadius) / 2 * 0.5
            const cp1x = prevX + Math.cos(midAngle - 0.5) * controlDistance * 0.6
            const cp1y = prevY + Math.sin(midAngle - 0.5) * controlDistance * 0.6
            const cp2x = x + Math.cos(midAngle + 0.5) * controlDistance * 0.6
            const cp2y = y + Math.sin(midAngle + 0.5) * controlDistance * 0.6
            
            context.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y)
          }
        }
        
        // 閉合形狀
        const firstAngle = angles[0]
        const firstRadius = radii[0]
        const firstX = centerX + blobOffsetX + Math.cos(firstAngle) * firstRadius
        const firstY = centerY + blobOffsetY + Math.sin(firstAngle) * firstRadius
        const lastAngle = angles[points - 1]
        const lastRadius = radii[points - 1]
        
        const closingAngle = (firstAngle + lastAngle) / 2
        const closingDistance = (firstRadius + lastRadius) / 2 * 0.5
        const cp1x = centerX + blobOffsetX + Math.cos(closingAngle - 0.5) * closingDistance * 0.6
        const cp1y = centerY + blobOffsetY + Math.sin(closingAngle - 0.5) * closingDistance * 0.6
        const cp2x = firstX + Math.cos(closingAngle + 0.5) * closingDistance * 0.6
        const cp2y = firstY + Math.sin(closingAngle + 0.5) * closingDistance * 0.6
        
        context.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, firstX, firstY)
        context.closePath()
        context.fill()
      }
    }
    
    // 添加細霧邊緣 - 不規則絲狀結構
    context.globalCompositeOperation = 'screen'
    for (let i = 0; i < 12; i++) {
      const offsetX = (Math.random() - 0.5) * 450
      const offsetY = (Math.random() - 0.5) * 450
      const baseSize = 25 + Math.random() * 60
      const opacity = 0.05 + Math.random() * 0.15
      
      // 創建小型有機霧絲
      const points = 5 + Math.floor(Math.random() * 6) // 5-10個點
      context.beginPath()
      
      for (let p = 0; p < points; p++) {
        const angle = Math.random() * Math.PI * 2
        const distance = baseSize * (0.3 + Math.random() * 0.7)
        const x = centerX + offsetX + Math.cos(angle) * distance
        const y = centerY + offsetY + Math.sin(angle) * distance
        
        if (p === 0) {
          context.moveTo(x, y)
        } else {
          // 使用隨機控制點創建有機曲線
          const prevX = centerX + offsetX + Math.cos(Math.random() * Math.PI * 2) * baseSize * 0.5
          const prevY = centerY + offsetY + Math.sin(Math.random() * Math.PI * 2) * baseSize * 0.5
          context.quadraticCurveTo(prevX, prevY, x, y)
        }
      }
      
      // 創建不規則漸變填充
      const gradient = context.createRadialGradient(
        centerX + offsetX, centerY + offsetY, 0,
        centerX + offsetX + Math.random() * 20 - 10, 
        centerY + offsetY + Math.random() * 20 - 10, 
        baseSize * 1.2
      )
      gradient.addColorStop(0, `rgba(240, 248, 255, ${opacity})`)
      gradient.addColorStop(0.6, `rgba(240, 248, 255, ${opacity * 0.3})`)
      gradient.addColorStop(1, 'rgba(240, 248, 255, 0)')
      
      context.fillStyle = gradient
      context.fill()
    }
    
    // 添加額外的細絲狀霧氣
    for (let i = 0; i < 8; i++) {
      const offsetX = (Math.random() - 0.5) * 380
      const offsetY = (Math.random() - 0.5) * 380
      const length = 40 + Math.random() * 100
      const width = 8 + Math.random() * 15
      const opacity = 0.03 + Math.random() * 0.08
      const angle = Math.random() * Math.PI * 2
      
      context.save()
      context.translate(centerX + offsetX, centerY + offsetY)
      context.rotate(angle)
      
      // 創建橢圓形絲狀霧氣
      const gradient = context.createLinearGradient(-length/2, 0, length/2, 0)
      gradient.addColorStop(0, 'rgba(248, 250, 255, 0)')
      gradient.addColorStop(0.2, `rgba(248, 250, 255, ${opacity})`)
      gradient.addColorStop(0.5, `rgba(248, 250, 255, ${opacity * 1.2})`)
      gradient.addColorStop(0.8, `rgba(248, 250, 255, ${opacity})`)
      gradient.addColorStop(1, 'rgba(248, 250, 255, 0)')
      
      context.fillStyle = gradient
      context.beginPath()
      context.ellipse(0, 0, length/2, width/2, 0, 0, Math.PI * 2)
      context.fill()
      context.restore()
    }
    
    const texture = new THREE.CanvasTexture(canvas)
    
    return new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture },
        time: { value: 0 },
        opacity: { value: 1 },
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
        uniform float weatherIntensity;
        uniform float timeOfDayFactor;
        
        void main() {
          vUv = uv;
          
          vec3 pos = position;
          
          // 高山霧氣效果 - 只在高海拔顯示
          float heightFactor = smoothstep(25.0, 35.0, initialHeight); // 25米以上才開始顯示
          vOpacity = heightFactor * weatherIntensity * timeOfDayFactor;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          
          // 霧塊大小 - 淡雅的霧塊
          float size = scale * weatherIntensity * 60.0; // 減小霧塊尺寸
          gl_PointSize = size * (400.0 / -mvPosition.z); // 調整距離縮放
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
          
          // 使用較大的邊界來顯示不規則形狀
          if (dist > 0.5) discard;
          
          vec4 texColor = texture2D(map, gl_PointCoord);
          
          // 山地霧氣顏色 - 清晨偏藍，白天偏白
          vec3 fogColor = vec3(0.9, 0.95, 1.0);
          
          // 基於紋理alpha值的不規則邊緣，不使用圓形遮罩
          // 讓紋理的不規則形狀自然顯示
          float naturalFade = smoothstep(0.0, 0.3, texColor.a);
          
          // 結合紋理的自然不規則形狀
          float finalOpacity = texColor.a * vOpacity * opacity * naturalFade;
          
          gl_FragColor = vec4(fogColor, finalOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    })
  }, [])
  
  useFrame((state) => {
    if (fogRef.current) {
      const time = state.clock.elapsedTime
      const material = fogRef.current.material as THREE.ShaderMaterial
      const positions = fogRef.current.geometry.attributes.position.array as Float32Array
      const velocities = fogRef.current.geometry.attributes.velocity.array as Float32Array
      const initialHeights = fogRef.current.geometry.attributes.initialHeight.array as Float32Array
      
      // 更新shader參數
      material.uniforms.time.value = time
      
      // 根據天氣調整霧塊強度 - 淡雅的霧氣效果
      let weatherIntensity = 0.15 // 大幅降低基礎濃度
      if (weather === 'fog') weatherIntensity = 0.5    // 霧天時適度可見
      else if (weather === 'rain') weatherIntensity = 0.3   // 雨天微霧
      else if (weather === 'clear') weatherIntensity = 0.05  // 晴天幾乎不可見
      else if (weather === 'storm') weatherIntensity = 0.2  // 暴雨前輕霧
      
      // 根據時間調整霧塊的可見度 - 整體保持淡雅
      const normalizedHour = hour % 24
      let timeOfDayFactor = 0.4 // 降低基礎時間因子
      if (normalizedHour >= 5 && normalizedHour < 9) {
        // 早晨輕霧
        timeOfDayFactor = 0.8
      } else if (normalizedHour >= 9 && normalizedHour < 16) {
        // 白天幾乎無霧
        timeOfDayFactor = 0.1
      } else if (normalizedHour >= 16 && normalizedHour < 19) {
        // 傍晚淡霧
        timeOfDayFactor = 0.5
      } else {
        // 夜晚微霧
        timeOfDayFactor = 0.3
      }
      
      material.uniforms.weatherIntensity.value = weatherIntensity
      material.uniforms.timeOfDayFactor.value = timeOfDayFactor
      
      // 霧粒子的飄動動畫
      for (let i = 0; i < positions.length; i += 3) {
        // 緩慢飄動
        positions[i] += velocities[i]
        positions[i + 1] += velocities[i + 1]
        positions[i + 2] += velocities[i + 2]
        
        // 添加正弦波飄動讓霧更自然
        positions[i] += Math.sin(time * 0.1 + i * 0.01) * 0.005
        positions[i + 2] += Math.cos(time * 0.08 + i * 0.01) * 0.005
        
        // 垂直飄動 - 霧氣上升
        const waveY = Math.sin(time * 0.05 + i * 0.005) * 2
        positions[i + 1] = initialHeights[i / 3] + waveY
        
        // 邊界重置 - 保持霧在山脈高度
        if (positions[i + 1] > 60) {
          positions[i + 1] = 35 // 重置到山脈最低霧高度
        }
        if (positions[i + 1] < 25) {
          positions[i + 1] = 30 // 不讓霧降到平地
        }
        
        if (Math.abs(positions[i]) > 120) {
          positions[i] = (Math.random() - 0.5) * 150
        }
        if (Math.abs(positions[i + 2]) > 120) {
          positions[i + 2] = (Math.random() - 0.5) * 150
        }
      }
      
      fogRef.current.geometry.attributes.position.needsUpdate = true
      
      // 整體霧層的輕微旋轉
      fogRef.current.rotation.y += 0.00005
    }
  })
  
  return (
    <points ref={fogRef} geometry={fogGeometry} material={fogMaterial} />
  )
}

// 破曉薄霧組件 - 模擬真實山谷晨霧
export const DawnMist = () => {
  const mistRef = useRef<THREE.Points>(null)
  const { weather, hour } = useTimeStore()
  
  const mistGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(120 * 3) // 增加粒子數量以獲得更柔和效果
    const scales = new Float32Array(120)
    const velocities = new Float32Array(120 * 3)
    const densities = new Float32Array(120) // 密度變化
    const layers = new Float32Array(120) // 層次感
    
    for (let i = 0; i < 120; i++) {
      const i3 = i * 3
      
      // 在低海拔山谷和緩坡分布薄霧
      const radius = 60 + Math.random() * 100
      const theta = Math.random() * Math.PI * 2
      // 破曉薄霧主要在低海拔5-25米
      const height = Math.random() * 15 + 5 + Math.sin(theta * 2) * 3 // 高度有起伏
      
      positions[i3] = Math.cos(theta) * radius + (Math.random() - 0.5) * 120
      positions[i3 + 1] = height
      positions[i3 + 2] = Math.sin(theta) * radius + (Math.random() - 0.5) * 120
      
      scales[i] = Math.random() * 6 + 3 // 3-9倍大小，更大更柔和
      densities[i] = Math.random() * 0.8 + 0.2 // 密度變化
      layers[i] = Math.random() * 3 // 分層效果
      
      // 非常緩慢的飄動 - 破曉時風力微弱
      velocities[i3] = (Math.random() - 0.5) * 0.005
      velocities[i3 + 1] = Math.random() * 0.001 + 0.0005 // 輕微上升
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.005
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1))
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3))
    geometry.setAttribute('density', new THREE.BufferAttribute(densities, 1))
    geometry.setAttribute('layer', new THREE.BufferAttribute(layers, 1))
    
    return geometry
  }, [])
  
  const mistMaterial = useMemo(() => {
    // 創建超柔和的薄霧紋理 - 使用Perlin噪聲效果
    const canvas = document.createElement('canvas')
    canvas.width = 2048 // 更高解析度
    canvas.height = 2048
    const context = canvas.getContext('2d')!
    
    context.clearRect(0, 0, 2048, 2048)
    
    const centerX = 1024
    const centerY = 1024
    
    // 創建多層次漸變霧氣效果
    for (let layer = 0; layer < 8; layer++) {
      const layerRadius = 300 + layer * 150
      const layerOpacity = 0.15 - layer * 0.015
      
      // 每一層使用不同的偏移創造自然的不規則性
      for (let cloud = 0; cloud < 15; cloud++) {
        const offsetX = (Math.random() - 0.5) * 800
        const offsetY = (Math.random() - 0.5) * 800
        const cloudRadius = layerRadius * (0.6 + Math.random() * 0.8)
        const cloudOpacity = layerOpacity * (0.5 + Math.random() * 0.5)
        
        // 創建非常柔和的徑向漸變
        const gradient = context.createRadialGradient(
          centerX + offsetX, centerY + offsetY, 0,
          centerX + offsetX, centerY + offsetY, cloudRadius
        )
        
        // 使用多個色階創造超柔和邊緣
        gradient.addColorStop(0, `rgba(248, 252, 255, ${cloudOpacity})`)
        gradient.addColorStop(0.1, `rgba(246, 250, 255, ${cloudOpacity * 0.9})`)
        gradient.addColorStop(0.3, `rgba(244, 248, 255, ${cloudOpacity * 0.7})`)
        gradient.addColorStop(0.5, `rgba(242, 246, 255, ${cloudOpacity * 0.5})`)
        gradient.addColorStop(0.7, `rgba(240, 244, 255, ${cloudOpacity * 0.3})`)
        gradient.addColorStop(0.85, `rgba(238, 242, 255, ${cloudOpacity * 0.15})`)
        gradient.addColorStop(0.95, `rgba(236, 240, 255, ${cloudOpacity * 0.05})`)
        gradient.addColorStop(1, 'rgba(234, 238, 255, 0)')
        
        context.globalCompositeOperation = 'screen'
        context.fillStyle = gradient
        context.beginPath()
        context.arc(centerX + offsetX, centerY + offsetY, cloudRadius, 0, Math.PI * 2)
        context.fill()
      }
    }
    
    // 添加細微的噪聲紋理模擬真實霧氣
    const imageData = context.getImageData(0, 0, 2048, 2048)
    const data = imageData.data
    
    for (let i = 0; i < data.length; i += 4) {
      // 添加微量噪聲但保持柔和
      const noise = (Math.random() - 0.5) * 0.1
      data[i] = Math.min(255, Math.max(0, data[i] + noise * 10))     // R
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise * 10)) // G  
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise * 8))  // B
    }
    
    context.putImageData(imageData, 0, 0)
    const texture = new THREE.CanvasTexture(canvas)
    
    return new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture },
        time: { value: 0 },
        opacity: { value: 1 },
        mistIntensity: { value: 1 },
        layerEffect: { value: 1 }
      },
      vertexShader: `
        attribute float scale;
        attribute vec3 velocity;
        attribute float density;
        attribute float layer;
        varying float vOpacity;
        varying float vDensity;
        varying vec2 vUv;
        uniform float time;
        uniform float mistIntensity;
        uniform float layerEffect;
        
        void main() {
          vUv = uv;
          vDensity = density;
          
          vec3 pos = position;
          
          // 破曉薄霧的高度分布 - 越低越濃
          float heightFactor = 1.0 - smoothstep(5.0, 25.0, position.y);
          
          // 分層效果 - 不同層次有不同的透明度
          float layerOpacity = mix(0.8, 0.3, layer / 3.0);
          vOpacity = heightFactor * layerOpacity * mistIntensity * density;
          
          // 非常輕微的飄動
          pos.x += sin(time * 0.02 + position.z * 0.001) * 0.5;
          pos.z += cos(time * 0.015 + position.x * 0.001) * 0.3;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          
          // 大尺寸柔和霧塊
          float size = scale * mistIntensity * layerEffect * 80.0;
          gl_PointSize = size * (500.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D map;
        uniform float opacity;
        varying float vOpacity;
        varying float vDensity;
        
        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          
          // 非常柔和的圓形遮罩 - 邊緣完全模糊
          if (dist > 0.5) discard;
          
          vec4 texColor = texture2D(map, gl_PointCoord);
          
          // 破曉薄霧顏色 - 帶有一絲晨曦的藍白色
          vec3 mistColor = vec3(0.94, 0.97, 1.0);
          
          // 超柔和的邊緣漸變
          float edgeFade = 1.0 - smoothstep(0.1, 0.5, dist);
          edgeFade = pow(edgeFade, 1.5); // 更柔和的衰減
          
          // 最終透明度 - 非常淡
          float finalOpacity = texColor.a * vOpacity * opacity * edgeFade * vDensity * 0.15;
          
          gl_FragColor = vec4(mistColor, finalOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    })
  }, [])
  
  useFrame((state) => {
    if (mistRef.current) {
      const time = state.clock.elapsedTime
      const material = mistRef.current.material as THREE.ShaderMaterial
      const positions = mistRef.current.geometry.attributes.position.array as Float32Array
      const velocities = mistRef.current.geometry.attributes.velocity.array as Float32Array
      
      // 更新shader參數
      material.uniforms.time.value = time
      
      // 只在破曉時分(4-8點)和薄霧天氣顯示
      const normalizedHour = hour % 24
      let intensity = 0
      
      if ((weather === 'mist' || weather === 'fog') && normalizedHour >= 4 && normalizedHour < 8) {
        // 破曉薄霧高峰期
        const dawnProgress = (normalizedHour - 4) / 4 // 0-1
        intensity = Math.sin(dawnProgress * Math.PI) * 0.8 // 鐘形曲線
      } else if (weather === 'mist' && normalizedHour >= 2 && normalizedHour < 10) {
        // 薄霧天氣的延長顯示
        intensity = 0.3
      }
      
      material.uniforms.mistIntensity.value = intensity
      material.uniforms.layerEffect.value = 0.8 + Math.sin(time * 0.05) * 0.2
      
      // 薄霧粒子的緩慢飄動
      if (intensity > 0) {
        for (let i = 0; i < positions.length; i += 3) {
          positions[i] += velocities[i] * 0.5
          positions[i + 1] += velocities[i + 1] * 0.3
          positions[i + 2] += velocities[i + 2] * 0.5
          
          // 添加微風擾動
          positions[i] += Math.sin(time * 0.01 + i * 0.001) * 0.002
          positions[i + 2] += Math.cos(time * 0.008 + i * 0.001) * 0.002
          
          // 邊界重置
          if (Math.abs(positions[i]) > 150) {
            positions[i] = (Math.random() - 0.5) * 180
          }
          if (Math.abs(positions[i + 2]) > 150) {
            positions[i + 2] = (Math.random() - 0.5) * 180
          }
          if (positions[i + 1] > 30) {
            positions[i + 1] = 5 + Math.random() * 15
          }
          if (positions[i + 1] < 3) {
            positions[i + 1] = 5
          }
        }
        
        mistRef.current.geometry.attributes.position.needsUpdate = true
      }
    }
  })
  
  return (
    <points ref={mistRef} geometry={mistGeometry} material={mistMaterial} />
  )
}

// 高海拔雲霧組件 - 模擬山峰雲霧
export const HighAltitudeMist = () => {
  const mistRef = useRef<THREE.Points>(null)
  const { weather, hour } = useTimeStore()
  
  const mistGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(50 * 3) // 進一步減少到50個
    const scales = new Float32Array(50)
    
    for (let i = 0; i < 50; i++) {
      const i3 = i * 3
      
      // 在最高的山峰周圍生成飄動濃霧
      const radius = 100 + Math.random() * 80 
      const theta = Math.random() * Math.PI * 2
      const height = Math.random() * 25 + 45 // 45-70米高度，最高山峰
      
      positions[i3] = Math.cos(theta) * radius
      positions[i3 + 1] = height
      positions[i3 + 2] = Math.sin(theta) * radius
      
      scales[i] = Math.random() * 1.5 + 1.0
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1))
    
    return geometry
  }, [])
  
  const mistMaterial = useMemo(() => {
    // 創建高海拔雲霧紋理
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const context = canvas.getContext('2d')!
    
    context.clearRect(0, 0, 256, 256)
    
    // 創建柔和的圓形雲霧
    const centerX = 128
    const centerY = 128
    
    const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, 128)
    gradient.addColorStop(0, 'rgba(248, 248, 255, 1.0)')
    gradient.addColorStop(0.4, 'rgba(248, 248, 255, 0.6)')
    gradient.addColorStop(0.8, 'rgba(248, 248, 255, 0.2)')
    gradient.addColorStop(1, 'rgba(248, 248, 255, 0)')
    
    context.fillStyle = gradient
    context.beginPath()
    context.arc(centerX, centerY, 128, 0, Math.PI * 2)
    context.fill()
    
    const texture = new THREE.CanvasTexture(canvas)
    
    return new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture },
        opacity: { value: 0.2 }
      },
      vertexShader: `
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = 30.0 * (300.0 / -mvPosition.z);
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
          
          gl_FragColor = vec4(vec3(0.97, 0.97, 1.0), finalOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  }, [])
  
  useFrame((state) => {
    if (mistRef.current) {
      const time = state.clock.elapsedTime
      
      // 根據天氣和時間調整高山雲霧 - 非常淡的霧效
      let opacity = 0.08 // 大幅降低基礎透明度
      if (weather === 'fog') opacity = 0.15 // 霧天時稍微明顯
      else if (weather === 'clear') opacity = 0.03 // 晴天時幾乎不可見
      else if (weather === 'storm') opacity = 0.12 // 暴風雨時輕微可見
      
      // 早晨和傍晚雲霧稍微明顯
      const normalizedHour = hour % 24
      if ((normalizedHour >= 6 && normalizedHour < 10) || (normalizedHour >= 17 && normalizedHour < 20)) {
        opacity *= 1.2 // 降低增強倍數
      }
      
      (mistRef.current.material as THREE.ShaderMaterial).uniforms.opacity.value = opacity
      
      // 緩慢旋轉
      mistRef.current.rotation.y += 0.0001
      mistRef.current.rotation.x = Math.sin(time * 0.02) * 0.02
    }
  })
  
  return (
    <points ref={mistRef} geometry={mistGeometry} material={mistMaterial} />
  )
}

