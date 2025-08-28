import React, { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTimeStore } from '@/stores/timeStore'

interface TerrainGlowProps {
  terrainScene: THREE.Group | null
}

interface TerrainGlowData {
  terrainMesh: THREE.Mesh
  originalMaterials: THREE.Material[]
  glowMaterials: THREE.Material[]
}

export const TerrainGlow = ({ terrainScene }: TerrainGlowProps) => {
  const { timeOfDay, hour } = useTimeStore()
  const terrainGlowData = useRef<TerrainGlowData[]>([])

  useEffect(() => {
    if (!terrainScene) return

    // 清理旧的发光数据
    terrainGlowData.current.forEach(data => {
      // 恢复原始材质
      data.terrainMesh.material = data.originalMaterials.length === 1 ? 
        data.originalMaterials[0] : data.originalMaterials
    })
    terrainGlowData.current = []

    console.log('🏔️ 开始设置地形夜晚发光系统...')

    // 遍历场景寻找地形mesh
    terrainScene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        const name = child.name.toLowerCase()
        
        // 识别地形相关物件（排除树木）
        const isTerrainMesh = (
          name.includes('terrain') || 
          name.includes('ground') || 
          name.includes('terreno') ||
          name.includes('mountain') ||
          name.includes('hill') ||
          name.includes('montaña') ||
          name.includes('montana') ||
          // 通过材质名称识别地形
          (child.material && (() => {
            const materials = Array.isArray(child.material) ? child.material : [child.material]
            return materials.some(mat => {
              if (!('name' in mat) || !mat.name) return false
              const matName = mat.name.toLowerCase()
              return (matName.includes('ground') || 
                     matName.includes('terrain') ||
                     matName.includes('mountain') ||
                     matName.includes('rock') ||
                     matName.includes('stone') ||
                     matName.includes('dirt') ||
                     matName.includes('earth')) &&
                     // 确保不是树木材质
                     !matName.includes('wood') &&
                     !matName.includes('leaf') &&
                     !matName.includes('bark') &&
                     !matName.includes('trunk')
            })
          })())
        ) && 
        // 排除树木相关mesh
        !name.includes('tree') &&
        !name.includes('arbol') &&
        !name.includes('trunk') &&
        !name.includes('leaf') &&
        !name.includes('wood') &&
        // 排除明显的装饰物
        !name.includes('cloud') &&
        !name.includes('sky') &&
        !name.includes('water')

        if (isTerrainMesh) {
          console.log(`🏔️ 设置地形发光: ${child.name}`)

          // 保存原始材质
          const originalMaterials = Array.isArray(child.material) ? 
            child.material.map(mat => mat.clone()) : [child.material.clone()]

          // 创建发光材质
          const createGlowMaterials = (originalMats: THREE.Material[]): THREE.Material[] => {
            return originalMats.map(baseMat => {
              let glowMaterial: THREE.Material

              if (baseMat instanceof THREE.MeshStandardMaterial) {
                glowMaterial = baseMat.clone()
                // 月光般的柔和蓝白发光
                glowMaterial.emissive = new THREE.Color(0x4a6fa5) // 柔和的蓝色
                glowMaterial.emissiveIntensity = 0
                
                // 保持原有的漫反射特性
                glowMaterial.roughness = Math.max(baseMat.roughness, 0.8)
                glowMaterial.metalness = Math.min(baseMat.metalness, 0.1)
              } else if (baseMat instanceof THREE.MeshLambertMaterial) {
                glowMaterial = new THREE.MeshLambertMaterial({
                  color: baseMat.color,
                  map: baseMat.map,
                  emissive: new THREE.Color(0x4a6fa5),
                  emissiveIntensity: 0
                })
              } else {
                // 其他材质类型，创建基础发光材质
                glowMaterial = new THREE.MeshStandardMaterial({
                  color: 0x8ba3c7,
                  emissive: new THREE.Color(0x4a6fa5),
                  emissiveIntensity: 0,
                  roughness: 0.9,
                  metalness: 0.0
                })
              }

              return glowMaterial
            })
          }

          const glowMaterials = createGlowMaterials(originalMaterials)

          // 保存地形发光数据
          const terrainData: TerrainGlowData = {
            terrainMesh: child,
            originalMaterials,
            glowMaterials
          }

          terrainGlowData.current.push(terrainData)
        }
      }
    })

    console.log(`🏔️ 共设置 ${terrainGlowData.current.length} 个地形发光效果`)

  }, [terrainScene])

  // 动画循环
  useFrame((state) => {
    const normalizedHour = hour % 24
    const time = state.clock.elapsedTime

    // 计算夜晚发光强度
    let glowIntensity = 0
    
    if (normalizedHour >= 18 || normalizedHour <= 7) {
      // 夜晚时段 (18:00-7:00)
      if (normalizedHour >= 20 || normalizedHour <= 5) {
        // 深夜时段 - 最强发光
        glowIntensity = 0.3 + Math.sin(time * 0.2) * 0.05 // 轻微呼吸效果
      } else {
        // 黄昏和黎明 - 渐变
        const factor = normalizedHour >= 18 ? 
          Math.min((normalizedHour - 18) / 2, 1) : // 18-20点渐亮
          Math.max((7 - normalizedHour) / 2, 0)    // 5-7点渐暗
        
        glowIntensity = factor * 0.25
      }
    }

    // 更新每个地形的发光效果
    terrainGlowData.current.forEach((terrainData, index) => {
      if (!terrainData.terrainMesh || !terrainData.glowMaterials) return

      // 个性化动画相位
      const phase = index * 0.5
      const breathe = Math.sin(time * 0.3 + phase) * 0.1 + 0.9
      const sparkle = Math.sin(time * 0.8 + phase) * 0.05 + 0.95

      // 最终发光强度
      const finalIntensity = glowIntensity * breathe * sparkle

      if (finalIntensity > 0) {
        // 切换到发光材质
        terrainData.terrainMesh.material = terrainData.glowMaterials.length === 1 ? 
          terrainData.glowMaterials[0] : terrainData.glowMaterials

        // 更新材质发光强度
        terrainData.glowMaterials.forEach(mat => {
          if ('emissiveIntensity' in mat) {
            (mat as any).emissiveIntensity = finalIntensity
            
            // 动态调整发光颜色 - 从蓝色到淡紫色
            if ('emissive' in mat) {
              const hue = 0.6 + Math.sin(time * 0.1 + phase) * 0.1 // 蓝色到紫色
              const newEmissive = new THREE.Color()
              newEmissive.setHSL(hue, 0.7, 0.6)
              ;(mat as any).emissive = newEmissive
            }
            
            mat.needsUpdate = true
          }
        })
      } else {
        // 切换回原始材质
        terrainData.terrainMesh.material = terrainData.originalMaterials.length === 1 ? 
          terrainData.originalMaterials[0] : terrainData.originalMaterials
      }
    })
  })

  // 清理函数
  useEffect(() => {
    return () => {
      terrainGlowData.current.forEach(data => {
        // 恢复原始材质
        if (data.terrainMesh && data.originalMaterials) {
          data.terrainMesh.material = data.originalMaterials.length === 1 ? 
            data.originalMaterials[0] : data.originalMaterials
        }
      })
      terrainGlowData.current = []
    }
  }, [])

  return null
}