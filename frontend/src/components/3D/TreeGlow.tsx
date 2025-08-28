import React, { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTimeStore } from '@/stores/timeStore'

interface TreeGlowProps {
  terrainScene: THREE.Group | null
}

interface TreeLightSystem {
  trunkLight: THREE.PointLight          // 樹幹主光源
  canopyLight: THREE.PointLight         // 樹冠氛圍光
  groundLight: THREE.SpotLight          // 地面聚光燈
  lightColumn: THREE.CylinderGeometry   // 光柱幾何體
  lightColumnMesh: THREE.Mesh          // 光柱網格
  groundCircle: THREE.Mesh             // 地面光圈
  ledLights: THREE.Points[]            // LED燈帶陣列
  mountainLeds: THREE.Points[]         // 山脈LED燈陣列
}

export const TreeGlow = ({ terrainScene }: TreeGlowProps) => {
  const { timeOfDay, hour } = useTimeStore()
  const treeLightSystems = useRef<TreeLightSystem[]>([])
  const treeMaterialsRef = useRef<{ 
    material: THREE.Material, 
    originalEmissive?: THREE.Color,
    originalEmissiveIntensity?: number 
  }[]>([])

  useEffect(() => {
    if (!terrainScene) return

    // 清理舊的燈光系統
    treeLightSystems.current.forEach(system => {
      if (system.trunkLight.parent) system.trunkLight.parent.remove(system.trunkLight)
      if (system.canopyLight.parent) system.canopyLight.parent.remove(system.canopyLight)
      if (system.groundLight.parent) system.groundLight.parent.remove(system.groundLight)
      if (system.lightColumnMesh.parent) system.lightColumnMesh.parent.remove(system.lightColumnMesh)
      if (system.groundCircle.parent) system.groundCircle.parent.remove(system.groundCircle)
    })

    treeLightSystems.current = []
    treeMaterialsRef.current = []

    console.log('🌳 開始設置綜合樹燈系統...')

    terrainScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const name = child.name.toLowerCase()
        const position = new THREE.Vector3()
        child.getWorldPosition(position)

        // 識別樹幹相關物件
        const isTrunk = name.includes('trunk') || 
                       name.includes('tronco') || 
                       name.includes('wood') ||
                       name.includes('bark') ||
                       name.includes('stem') ||
                       (name.includes('arbol') && !name.includes('leaf'))

        if (isTrunk) {
          console.log(`🏮 設置樹燈路燈系統: ${child.name}`)

          // 處理樹幹材質發光
          const materials = Array.isArray(child.material) ? child.material : [child.material]
          materials.forEach((material) => {
            if (material instanceof THREE.MeshStandardMaterial || 
                material instanceof THREE.MeshLambertMaterial) {
              
              treeMaterialsRef.current.push({
                material,
                originalEmissive: material.emissive?.clone(),
                originalEmissiveIntensity: material.emissiveIntensity
              })

              if (material.emissive) {
                material.emissive = new THREE.Color(0x221100) // 溫暖的橙色發光
              }
              material.emissiveIntensity = 0
            }
          })

          if (child.parent) {
            // 1. 樹幹溫暖光源 - 路燈基座效果
            const trunkLight = new THREE.PointLight(0xFFD700, 0, 12, 1.8)
            trunkLight.position.copy(child.position)
            trunkLight.position.y += 2.5
            child.parent.add(trunkLight)

            // 2. 樹冠路燈光 - 主要照明效果（溫暖的黃白光）
            const canopyLight = new THREE.PointLight(0xFFF8DC, 0, 18, 1.2)
            canopyLight.position.copy(child.position)
            canopyLight.position.y += 8
            child.parent.add(canopyLight)

            // 3. 地面暖光聚光燈 - 路燈照地效果
            const groundLight = new THREE.SpotLight(0xFFE4B5, 0, 25, Math.PI / 5, 0.2)
            groundLight.position.copy(child.position)
            groundLight.position.y += 12
            groundLight.target.position.set(child.position.x, 0, child.position.z)
            child.parent.add(groundLight)
            child.parent.add(groundLight.target)

            // 4. 垂直暖光柱效果 - 路燈光束
            const lightColumnGeometry = new THREE.CylinderGeometry(1.0, 0.4, 15, 12)
            const lightColumnMaterial = new THREE.MeshBasicMaterial({
              color: 0xFFE4B5, // 溫暖的米色光
              transparent: true,
              opacity: 0,
              side: THREE.DoubleSide,
              blending: THREE.AdditiveBlending
            })
            const lightColumnMesh = new THREE.Mesh(lightColumnGeometry, lightColumnMaterial)
            lightColumnMesh.position.copy(child.position)
            lightColumnMesh.position.y += 7.5
            child.parent.add(lightColumnMesh)

            // 5. 地面暖光圈 - 路燈照射範圍
            const groundCircleGeometry = new THREE.RingGeometry(4, 7, 24)
            const groundCircleMaterial = new THREE.MeshBasicMaterial({
              color: 0xFFF8DC, // 溫暖的象牙白
              transparent: true,
              opacity: 0,
              side: THREE.DoubleSide,
              blending: THREE.AdditiveBlending
            })
            const groundCircle = new THREE.Mesh(groundCircleGeometry, groundCircleMaterial)
            groundCircle.position.copy(child.position)
            groundCircle.position.y = 0.05
            groundCircle.rotation.x = -Math.PI / 2
            child.parent.add(groundCircle)

            // 6. 樹幹LED燈帶效果
            const ledLights: THREE.Points[] = []
            
            // 創建螺旋LED燈帶
            const trunkHeight = 10
            const ledCount = 60
            const spiralTurns = 3
            
            const ledGeometry = new THREE.BufferGeometry()
            const ledPositions = new Float32Array(ledCount * 3)
            const ledColors = new Float32Array(ledCount * 3)
            const ledSizes = new Float32Array(ledCount)
            
            for (let i = 0; i < ledCount; i++) {
              const t = i / (ledCount - 1)
              const angle = t * Math.PI * 2 * spiralTurns
              const height = t * trunkHeight
              const radius = 0.8 + Math.sin(t * Math.PI * 4) * 0.2
              
              ledPositions[i * 3] = Math.cos(angle) * radius
              ledPositions[i * 3 + 1] = height - trunkHeight * 0.5
              ledPositions[i * 3 + 2] = Math.sin(angle) * radius
              
              // 彩色LED：暖色調為主
              const hue = (t * 0.3 + Math.sin(i * 0.5) * 0.1) % 1
              const color = new THREE.Color().setHSL(hue * 0.2 + 0.05, 0.8, 0.7) // 暖色範圍
              ledColors[i * 3] = color.r
              ledColors[i * 3 + 1] = color.g
              ledColors[i * 3 + 2] = color.b
              
              ledSizes[i] = 8 + Math.random() * 4
            }
            
            ledGeometry.setAttribute('position', new THREE.BufferAttribute(ledPositions, 3))
            ledGeometry.setAttribute('color', new THREE.BufferAttribute(ledColors, 3))
            ledGeometry.setAttribute('size', new THREE.BufferAttribute(ledSizes, 1))
            
            // LED點光源材質 - 創建圓形發光紋理
            const createLEDTexture = () => {
              const canvas = document.createElement('canvas')
              canvas.width = 64
              canvas.height = 64
              const context = canvas.getContext('2d')!
              
              const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32)
              gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
              gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)')
              gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.4)')
              gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
              
              context.fillStyle = gradient
              context.fillRect(0, 0, 64, 64)
              
              return new THREE.CanvasTexture(canvas)
            }
            
            const ledTexture = createLEDTexture()
            const ledMaterial = new THREE.PointsMaterial({
              map: ledTexture,
              vertexColors: true,
              transparent: true,
              opacity: 0,
              size: 8,
              sizeAttenuation: true,
              blending: THREE.AdditiveBlending,
              depthWrite: false
            })
            
            const ledPoints = new THREE.Points(ledGeometry, ledMaterial)
            ledPoints.position.copy(child.position)
            ledPoints.position.y += 2
            child.parent.add(ledPoints)
            ledLights.push(ledPoints)

            // 7. 山脈裝飾LED燈
            const mountainLeds: THREE.Points[] = []
            
            // 在山脈輪廓線上添加LED燈
            const mountainLedGeometry = new THREE.BufferGeometry()
            const mountainLedCount = 30
            const mountainLedPositions = new Float32Array(mountainLedCount * 3)
            const mountainLedColors = new Float32Array(mountainLedCount * 3)
            
            for (let i = 0; i < mountainLedCount; i++) {
              const angle = (i / mountainLedCount) * Math.PI * 2
              const distance = 80 + Math.random() * 40
              const height = 20 + Math.random() * 25
              
              mountainLedPositions[i * 3] = Math.cos(angle) * distance + child.position.x
              mountainLedPositions[i * 3 + 1] = height
              mountainLedPositions[i * 3 + 2] = Math.sin(angle) * distance + child.position.z
              
              // 冷色調LED（藍、紫、青）
              const coldHue = 0.5 + Math.random() * 0.3 // 藍到紫的範圍
              const coldColor = new THREE.Color().setHSL(coldHue, 0.7, 0.6)
              mountainLedColors[i * 3] = coldColor.r
              mountainLedColors[i * 3 + 1] = coldColor.g
              mountainLedColors[i * 3 + 2] = coldColor.b
            }
            
            mountainLedGeometry.setAttribute('position', new THREE.BufferAttribute(mountainLedPositions, 3))
            mountainLedGeometry.setAttribute('color', new THREE.BufferAttribute(mountainLedColors, 3))
            
            const mountainLedMaterial = new THREE.PointsMaterial({
              map: ledTexture,
              vertexColors: true,
              transparent: true,
              opacity: 0,
              size: 6,
              sizeAttenuation: true,
              blending: THREE.AdditiveBlending,
              depthWrite: false
            })
            
            const mountainLedPoints = new THREE.Points(mountainLedGeometry, mountainLedMaterial)
            child.parent.add(mountainLedPoints)
            mountainLeds.push(mountainLedPoints)

            // 保存完整的燈光系統
            treeLightSystems.current.push({
              trunkLight,
              canopyLight,
              groundLight,
              lightColumn: lightColumnGeometry,
              lightColumnMesh,
              groundCircle,
              ledLights,
              mountainLeds
            })
          }
        }
      }
    })

    console.log(`🏮 共創建 ${treeLightSystems.current.length} 個樹燈系統`)

  }, [terrainScene])

  useFrame((state) => {
    const normalizedHour = hour % 24
    const time = state.clock.elapsedTime

    // 計算夜晚發光強度
    let lightIntensity = 0
    let canopyIntensity = 0
    let groundIntensity = 0
    let emissiveIntensity = 0
    let visualEffectsOpacity = 0

    if (normalizedHour >= 19 || normalizedHour <= 6) {
      // 夜晚時段 (19:00-6:00)
      if (normalizedHour >= 21 || normalizedHour <= 4) {
        // 深夜最亮 - 路燈效果
        lightIntensity = 2.0 + Math.sin(time * 0.3) * 0.3     // 樹幹溫暖光源
        canopyIntensity = 3.5 + Math.sin(time * 0.4) * 0.5    // 樹冠路燈光（主要照明）
        groundIntensity = 2.8 + Math.sin(time * 0.2) * 0.4    // 地面聚光燈
        emissiveIntensity = 0.6 + Math.sin(time * 0.5) * 0.15 // 材質發光
        visualEffectsOpacity = 0.4 + Math.sin(time * 0.6) * 0.12 // 光柱和光圈
      } else {
        // 黃昏和黎明漸變 - 路燈開啟效果
        const factor = normalizedHour >= 19 ? 
          (normalizedHour - 19) / 2 : // 19-21點漸亮
          (6 - normalizedHour) / 2    // 4-6點漸暗
        lightIntensity = factor * 1.5
        canopyIntensity = factor * 2.5
        groundIntensity = factor * 2.0
        emissiveIntensity = factor * 0.45
        visualEffectsOpacity = factor * 0.3
      }
    }

    // 更新完整的樹燈系統
    treeLightSystems.current.forEach((system, index) => {
      const phase = index * 0.3 // 每棵樹不同相位
      const flickerSlow = Math.sin(time * 0.5 + phase) * 0.1 + 0.9
      const flickerFast = Math.sin(time * 1.2 + phase) * 0.05 + 0.95

      // 1. 樹幹主光源
      system.trunkLight.intensity = lightIntensity * flickerSlow

      // 2. 樹冠氛圍光
      system.canopyLight.intensity = canopyIntensity * flickerFast

      // 3. 地面聚光燈
      system.groundLight.intensity = groundIntensity * flickerSlow

      // 4. 光柱效果 - 路燈光束
      if (system.lightColumnMesh.material instanceof THREE.MeshBasicMaterial) {
        system.lightColumnMesh.material.opacity = visualEffectsOpacity * flickerFast * 0.2
      }

      // 5. 地面光圈 - 路燈照射區域
      if (system.groundCircle.material instanceof THREE.MeshBasicMaterial) {
        system.groundCircle.material.opacity = visualEffectsOpacity * flickerSlow * 0.15
      }

      // 6. 樹幹LED燈帶動畫
      system.ledLights.forEach((ledPoints) => {
        if (ledPoints.material instanceof THREE.PointsMaterial) {
          // LED流水燈效果 - 螺旋流動
          const waveSpeed = time * 2.0 + index * 0.5
          const baseOpacity = lightIntensity > 0 ? 0.8 : 0
          ledPoints.material.opacity = baseOpacity * (0.8 + Math.sin(waveSpeed) * 0.2)
          
          // 更新LED顏色動畫
          const colors = ledPoints.geometry.attributes.color.array as Float32Array
          for (let i = 0; i < colors.length; i += 3) {
            const ledIndex = i / 3
            const wavePhase = waveSpeed + ledIndex * 0.3
            const brightness = 0.7 + Math.sin(wavePhase) * 0.3
            
            // 暖色LED動態亮度
            colors[i] *= brightness     // R
            colors[i + 1] *= brightness // G  
            colors[i + 2] *= brightness // B
          }
          ledPoints.geometry.attributes.color.needsUpdate = true
        }
      })

      // 7. 山脈LED燈閃爍動畫
      system.mountainLeds.forEach((mountainLed) => {
        if (mountainLed.material instanceof THREE.PointsMaterial) {
          // 隨機閃爍效果
          const blinkSpeed = time * 1.5 + index * 0.8
          const blinkOpacity = lightIntensity > 0 ? 
            (Math.sin(blinkSpeed) * 0.3 + 0.7) * (Math.random() > 0.95 ? 0.2 : 1.0) : 0
          mountainLed.material.opacity = blinkOpacity * 0.6
          
          // 冷色調呼吸燈效果
          const colors = mountainLed.geometry.attributes.color.array as Float32Array
          for (let i = 0; i < colors.length; i += 3) {
            const ledIndex = i / 3
            const breathe = Math.sin(time * 0.8 + ledIndex * 0.2) * 0.4 + 0.6
            
            // 冷色LED呼吸效果
            colors[i] *= breathe     // R
            colors[i + 1] *= breathe // G
            colors[i + 2] *= breathe // B
          }
          mountainLed.geometry.attributes.color.needsUpdate = true
        }
      })
    })

    // 更新材質發光
    treeMaterialsRef.current.forEach((materialRef, index) => {
      if (materialRef.material instanceof THREE.MeshStandardMaterial || 
          materialRef.material instanceof THREE.MeshLambertMaterial) {
        const phase = (time + index * 0.4) * 0.7
        const flicker = Math.sin(phase) * 0.08 + 0.92
        materialRef.material.emissiveIntensity = emissiveIntensity * flicker
      }
    })
  })

  // 清理函數
  useEffect(() => {
    return () => {
      // 恢復原始材質
      treeMaterialsRef.current.forEach((materialRef) => {
        if (materialRef.originalEmissive && materialRef.material) {
          if (materialRef.material instanceof THREE.MeshStandardMaterial || 
              materialRef.material instanceof THREE.MeshLambertMaterial) {
            materialRef.material.emissive = materialRef.originalEmissive
            materialRef.material.emissiveIntensity = materialRef.originalEmissiveIntensity || 0
          }
        }
      })

      // 清理完整的燈光系統
      treeLightSystems.current.forEach(system => {
        if (system.trunkLight.parent) system.trunkLight.parent.remove(system.trunkLight)
        if (system.canopyLight.parent) system.canopyLight.parent.remove(system.canopyLight)
        if (system.groundLight.parent) system.groundLight.parent.remove(system.groundLight)
        if (system.lightColumnMesh.parent) system.lightColumnMesh.parent.remove(system.lightColumnMesh)
        if (system.groundCircle.parent) system.groundCircle.parent.remove(system.groundCircle)
        
        // 清理LED燈
        system.ledLights.forEach(led => {
          if (led.parent) led.parent.remove(led)
        })
        system.mountainLeds.forEach(led => {
          if (led.parent) led.parent.remove(led)
        })
      })
    }
  }, [])

  return null
}