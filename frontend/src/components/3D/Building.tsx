import React, { useRef, useEffect, useState, useMemo } from 'react'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js'
import * as THREE from 'three'
import { getTerrainHeight } from './TerrainModel'
import { collisionSystem } from '@/utils/collision'

interface BuildingProps {
  objUrl: string
  mtlUrl?: string
  position: [number, number, number]
  rotationY?: number
  scale?: number
  baseOffset?: number   // 基座微抬，預設 0.04
  id?: string
}

// 創建後備材質函數 - 依名稱給適當顏色
function makeFallbackMaterial(name = '') {
  const n = name.toLowerCase()
  let color = '#d8d1be' // 預設牆面色 - 溫暖的奶茶色

  if (n.includes('roof') || n.includes('chimney') || n.includes('tile')) {
    color = '#4a4745' // 屋頂/煙囪 - 深灰色
  } else if (n.includes('wood') || n.includes('timber') || n.includes('beam') || n.includes('door')) {
    color = '#6b4b2a' // 木材/樑柱 - 溫暖棕色
  } else if (n.includes('window') || n.includes('glass')) {
    color = '#87ceeb' // 窗戶 - 天空藍
  } else if (n.includes('stone') || n.includes('brick')) {
    color = '#a0836d' // 石材/磚塊 - 土色
  }

  return new THREE.MeshToonMaterial({
    color,
    dithering: true,
    shadowSide: THREE.DoubleSide
  })
}

export default function Building({
  objUrl,
  mtlUrl,
  position,
  rotationY = 0,
  scale = 1.5,
  baseOffset = 0.04,
  id = 'building'
}: BuildingProps) {
  const ref = useRef<THREE.Group>(null!)
  const [loadedObject, setLoadedObject] = useState<THREE.Object3D | null>(null)

  // 載入OBJ模型
  useEffect(() => {
    const objLoader = new OBJLoader()

    // 如果有MTL材質文件，先載入材質
    if (mtlUrl) {
      const mtlLoader = new MTLLoader()
      mtlLoader.load(mtlUrl, (materials) => {
        materials.preload()
        objLoader.setMaterials(materials)

        objLoader.load(objUrl, (object) => {
          setLoadedObject(object)
          console.log(`🏠 明亮建築 ${id} 已載入 (含材質)`)
        }, undefined, (error) => {
          console.error(`❌ 載入建築 ${id} 失敗:`, error)
        })
      }, undefined, (error) => {
        console.warn(`⚠️ 載入材質失敗，使用預設材質:`, error)
        // 材質載入失敗時仍然嘗試載入OBJ
        objLoader.load(objUrl, (object) => {
          setLoadedObject(object)
          console.log(`🏠 明亮建築 ${id} 已載入 (預設材質)`)
        })
      })
    } else {
      // 直接載入OBJ
      objLoader.load(objUrl, (object) => {
        setLoadedObject(object)
        console.log(`🏠 明亮建築 ${id} 已載入`)
      }, undefined, (error) => {
        console.error(`❌ 載入建築 ${id} 失敗:`, error)
      })
    }
  }, [objUrl, mtlUrl, id])

  // 處理載入的模型 - 修復材質問題
  const processedScene = useMemo(() => {
    if (!loadedObject) return null

    const clonedScene = loadedObject.clone(true)

    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true
        child.receiveShadow = true

        // 1) 永遠關閉 wireframe - 這是黑色線條的根源！
        if (child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material]

          materials.forEach((material, index) => {
            // 強制關閉wireframe
            if ('wireframe' in material) {
              material.wireframe = false
            }

            // 2) 檢查是否需要後備材質（避免純白方塊）
            const noMap = !material || (!material.map && !material.color)
            const invalidStd = material && material.isMeshStandardMaterial &&
                              material.map == null && material.normalMap == null

            if (noMap || invalidStd || (material.color && material.color.getHex() === 0xffffff)) {
              // 使用智能後備材質
              const fallbackMat = makeFallbackMaterial(child.name)

              if (Array.isArray(child.material)) {
                child.material[index] = fallbackMat
              } else {
                child.material = fallbackMat
              }

              console.log(`🎨 為 ${child.name} 應用後備材質: ${fallbackMat.color.getHexString()}`)
            } else {
              // 3) 調整現有材質避免黑面
              if (material.isMeshStandardMaterial) {
                material.metalness = Math.min(0.1, material.metalness ?? 0)
                material.roughness = Math.max(0.7, material.roughness ?? 0.7)
                material.shadowSide = THREE.DoubleSide
                material.needsUpdate = true
              } else if (material.isMeshLambertMaterial) {
                // Lambert轉Toon避免光照問題
                const toonMat = new THREE.MeshToonMaterial({
                  map: material.map,
                  color: material.color,
                  transparent: material.transparent,
                  opacity: material.opacity,
                  shadowSide: THREE.DoubleSide
                })

                if (Array.isArray(child.material)) {
                  child.material[index] = toonMat
                } else {
                  child.material = toonMat
                }
              }
            }
          })
        }
      }
    })

    return clonedScene
  }, [loadedObject])

  // 設置位置和渲染
  useEffect(() => {
    const g = ref.current
    if (!g || !processedScene) return

    // 清空之前的內容
    g.clear()

    // 添加處理過的建築物
    g.add(processedScene)

    // XZ 由外部決定，Y 以地面貼齊
    const [x, , z] = position
    const gh = getTerrainHeight(x, z)
    const y = (gh ?? 0) + baseOffset

    g.position.set(x, y, z)
    g.rotation.set(0, rotationY, 0)
    g.scale.setScalar(scale)

    console.log(`🏠 明亮建築 ${id} 已放置: 位置 (${x}, ${y.toFixed(2)}, ${z}), 縮放 ${scale}x`)

  }, [processedScene, position, rotationY, scale, baseOffset, id])

  // 碰撞檢測
  useEffect(() => {
    const g = ref.current
    if (!g || !loadedObject) return

    const [x, , z] = position
    const gh = getTerrainHeight(x, z)
    const y = (gh ?? 0) + baseOffset

    // 計算碰撞盒
    const box = new THREE.Box3().setFromObject(g)
    const size = box.getSize(new THREE.Vector3())
    const radius = Math.max(size.x, size.z) / 2

    // 註冊到碰撞系統
    collisionSystem.addCollisionObject({
      position: new THREE.Vector3(x, y, z),
      radius: radius * 1.2, // 稍微擴大碰撞半徑
      type: 'building',
      id: `bright_building_${id}`,
      userData: {
        buildingName: id,
        buildingType: 'bright_building',
        buildingScale: scale
      }
    })

    console.log(`🚫 明亮建築 ${id} 碰撞檢測已設置: 半徑 ${(radius * 1.2).toFixed(1)}`)

    return () => {
      collisionSystem.removeCollisionObject(`bright_building_${id}`)
    }
  }, [loadedObject, position, scale, baseOffset, id])

  return (
    <group ref={ref} name={`BrightBuilding_${id}`}>
      {/* 載入的OBJ模型已經通過useEffect添加到group中 */}
    </group>
  )
}