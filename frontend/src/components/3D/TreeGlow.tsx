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
          console.log(`🎯 設置樹燈系統: ${child.name}`)

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
                material.emissive = new THREE.Color(0x6fa8f5) // 藍白色發光
              }
              material.emissiveIntensity = 0
            }
          })

          if (child.parent) {
            // 1. 樹幹主光源 - 照明功能
            const trunkLight = new THREE.PointLight(0x87ceeb, 0, 15, 1.5)
            trunkLight.position.copy(child.position)
            trunkLight.position.y += 3
            child.parent.add(trunkLight)

            // 2. 樹冠氛圍光 - 夢幻效果
            const canopyLight = new THREE.PointLight(0x6fa8f5, 0, 12, 2)
            canopyLight.position.copy(child.position)
            canopyLight.position.y += 8
            child.parent.add(canopyLight)

            // 3. 地面聚光燈 - 路徑指引
            const groundLight = new THREE.SpotLight(0xb0e0e6, 0, 20, Math.PI / 6, 0.3)
            groundLight.position.copy(child.position)
            groundLight.position.y += 15
            groundLight.target.position.set(child.position.x, 0, child.position.z)
            child.parent.add(groundLight)
            child.parent.add(groundLight.target)

            // 4. 垂直光柱效果
            const lightColumnGeometry = new THREE.CylinderGeometry(0.8, 0.5, 12, 8)
            const lightColumnMaterial = new THREE.MeshBasicMaterial({
              color: 0x6fa8f5,
              transparent: true,
              opacity: 0,
              side: THREE.DoubleSide
            })
            const lightColumnMesh = new THREE.Mesh(lightColumnGeometry, lightColumnMaterial)
            lightColumnMesh.position.copy(child.position)
            lightColumnMesh.position.y += 6
            child.parent.add(lightColumnMesh)

            // 5. 地面光圈
            const groundCircleGeometry = new THREE.RingGeometry(3, 5, 16)
            const groundCircleMaterial = new THREE.MeshBasicMaterial({
              color: 0x87ceeb,
              transparent: true,
              opacity: 0,
              side: THREE.DoubleSide
            })
            const groundCircle = new THREE.Mesh(groundCircleGeometry, groundCircleMaterial)
            groundCircle.position.copy(child.position)
            groundCircle.position.y = 0.1
            groundCircle.rotation.x = -Math.PI / 2
            child.parent.add(groundCircle)

            // 保存完整的燈光系統
            treeLightSystems.current.push({
              trunkLight,
              canopyLight,
              groundLight,
              lightColumn: lightColumnGeometry,
              lightColumnMesh,
              groundCircle
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
        // 深夜最亮
        lightIntensity = 1.2 + Math.sin(time * 0.3) * 0.2     // 主照明燈
        canopyIntensity = 0.8 + Math.sin(time * 0.4) * 0.1    // 樹冠氛圍
        groundIntensity = 1.5 + Math.sin(time * 0.2) * 0.3    // 地面聚光
        emissiveIntensity = 0.4 + Math.sin(time * 0.5) * 0.1  // 材質發光
        visualEffectsOpacity = 0.3 + Math.sin(time * 0.6) * 0.1 // 光柱和光圈
      } else {
        // 黃昏和黎明較暗
        const factor = normalizedHour >= 19 ? 
          (normalizedHour - 19) / 2 : // 19-21點漸亮
          (6 - normalizedHour) / 2    // 4-6點漸暗
        lightIntensity = factor * 0.8
        canopyIntensity = factor * 0.5
        groundIntensity = factor * 1.0
        emissiveIntensity = factor * 0.3
        visualEffectsOpacity = factor * 0.2
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

      // 4. 光柱效果
      if (system.lightColumnMesh.material instanceof THREE.MeshBasicMaterial) {
        system.lightColumnMesh.material.opacity = visualEffectsOpacity * flickerFast * 0.4
      }

      // 5. 地面光圈
      if (system.groundCircle.material instanceof THREE.MeshBasicMaterial) {
        system.groundCircle.material.opacity = visualEffectsOpacity * flickerSlow * 0.6
      }
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
      })
    }
  }, [])

  return null
}