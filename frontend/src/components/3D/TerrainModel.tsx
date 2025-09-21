import { useGLTF } from '@react-three/drei'
import { useRef, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { collisionSystem } from '@/utils/collision'
import { TreeGlow } from './TreeGlow'
import { TerrainGlow } from './TerrainGlow'
import { useTimeStore } from '@/stores/timeStore'
import { buildWorldBVH } from '@/game/physics/worldBVH'
import { markWalkable, registerWalkable } from '@/game/physics/walkable'
import { registerGroundRoot } from '@/game/ground'

// 全域地形參考，用於高度檢測
let terrainMesh: THREE.Mesh | null = null
let brownMountainMeshes: THREE.Mesh[] = [] // 專門儲存棕色山體mesh
let raycaster: THREE.Raycaster | null = null

// 地形高度檢測功能 - 適應XZ軸5倍擴展，Y軸2.5倍擴展
export const getTerrainHeight = (x: number, z: number): number => {
  if (!terrainMesh || !raycaster) {
    return 5 // 如果地形還未載入，返回安全的預設高度
  }

  // 從上方向下發射射線，調整高度以適應Y軸5倍擴展
  const origin = new THREE.Vector3(x, 500, z) // 從更高處開始（100 * 5）
  const direction = new THREE.Vector3(0, -1, 0) // 向下
  
  raycaster.set(origin, direction)
  
  // 檢測與地形的交點
  const intersects = raycaster.intersectObject(terrainMesh, true)
  
  if (intersects.length > 0) {
    // 過濾掉異常高的交點，調整範圍以適應Y軸5倍擴展
    const validIntersects = intersects.filter(intersect => {
      const y = intersect.point.y
      return y >= -50 && y <= 125 // 調整高度範圍（-10*5 到 25*5）
    })
    
    if (validIntersects.length > 0) {
      // 返回最低的有效交點（真正的地面）
      const lowestPoint = validIntersects.reduce((lowest, current) => 
        current.point.y < lowest.point.y ? current : lowest
      )
      return lowestPoint.point.y
    }
  }
  
  return 5 // 如果沒有有效交點，返回安全的預設高度
}

// 獲取地形法向量（用於計算地形傾斜）- XZ軸10倍擴展，Y軸5倍擴展
export const getTerrainNormal = (x: number, z: number): THREE.Vector3 => {
  if (!terrainMesh || !raycaster) {
    return new THREE.Vector3(0, 1, 0) // 預設向上
  }

  // 從上方向下發射射線，調整高度以適應Y軸2.5倍擴展
  const origin = new THREE.Vector3(x, 250, z)
  const direction = new THREE.Vector3(0, -1, 0)
  
  raycaster.set(origin, direction)
  
  const intersects = raycaster.intersectObject(terrainMesh, true)
  
  if (intersects.length > 0) {
    // 過濾掉異常高的交點並找到最低的有效交點，調整範圍以適應Y軸5倍擴展
    const validIntersects = intersects.filter(intersect => {
      const y = intersect.point.y
      return y >= -50 && y <= 125 && intersect.face // Y軸5倍的高度範圍
    })
    
    if (validIntersects.length > 0) {
      const lowestIntersect = validIntersects.reduce((lowest, current) => 
        current.point.y < lowest.point.y ? current : lowest
      )
      if (lowestIntersect.face) {
        return lowestIntersect.face.normal.clone()
      }
    }
  }
  
  return new THREE.Vector3(0, 1, 0) // 預設向上
}

// 計算地形傾斜角度
export const getTerrainSlope = (x: number, z: number): number => {
  const normal = getTerrainNormal(x, z)
  const upVector = new THREE.Vector3(0, 1, 0)
  return Math.acos(normal.dot(upVector)) // 返回弧度
}

// 獲取地形適應的旋轉角度
export const getTerrainRotation = (x: number, z: number): THREE.Euler => {
  const normal = getTerrainNormal(x, z)
  
  // 創建一個與地形法向量對齊的旋轉
  const quaternion = new THREE.Quaternion()
  quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal)
  
  return new THREE.Euler().setFromQuaternion(quaternion)
}

// 樹木位置和信息接口
export interface TreeInfo {
  mesh: THREE.Mesh
  name: string
  position: THREE.Vector3
  distance: number
  isTrunk: boolean
  isLeaves: boolean
}

// 全域樹木位置數組
let globalTreePositions: TreeInfo[] = []

// 更新全域樹木位置（在場景載入完成後調用）
export const updateGlobalTreePositions = (trees: THREE.Mesh[]) => {
  globalTreePositions = trees.map(tree => {
    const position = tree.position.clone()
    // 考慮地形縮放轉換為世界座標
    position.multiply(new THREE.Vector3(10, 5, 10))
    
    const name = tree.name.toLowerCase()
    const isTrunk = name.includes('trunk') || name.includes('tronco') || 
                   name.includes('bark') || name.includes('木')
    const isLeaves = name.includes('leaves') || name.includes('leaf') ||
                    name.includes('hoja') || name.includes('foliage')
    
    return {
      mesh: tree,
      name: tree.name,
      position: position.clone(),
      distance: 0, // 將在查詢時計算
      isTrunk,
      isLeaves
    }
  })
  
  console.log(`🌳 已更新全域樹木位置數據，共 ${globalTreePositions.length} 個樹木物件`)
}

// 獲取玩家附近的樹木
export const getNearbyTrees = (playerX: number, playerZ: number, maxDistance: number = 20): TreeInfo[] => {
  if (globalTreePositions.length === 0) {
    console.warn('⚠️ 樹木位置數據尚未初始化，請確保場景已完全載入')
    return []
  }
  
  
  // 計算所有樹木與玩家的距離並篩選
  const nearbyTrees = globalTreePositions
    .map(tree => ({
      ...tree,
      distance: Math.sqrt(
        Math.pow(tree.position.x - playerX, 2) + 
        Math.pow(tree.position.z - playerZ, 2)
      )
    }))
    .filter(tree => tree.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance) // 按距離排序
  
  console.log(`🎯 玩家位置 (${playerX.toFixed(1)}, ${playerZ.toFixed(1)}) 附近 ${maxDistance} 單位內找到 ${nearbyTrees.length} 個樹木:`)
  nearbyTrees.forEach((tree, index) => {
    const type = tree.isTrunk ? '🌲樹幹' : tree.isLeaves ? '🍃樹葉' : '🌳樹木'
    console.log(`  ${index + 1}. ${type} "${tree.name}" - 距離: ${tree.distance.toFixed(1)} - 位置: (${tree.position.x.toFixed(1)}, ${tree.position.z.toFixed(1)})`)
  })
  
  return nearbyTrees
}

// 獲取最近的樹木
export const getClosestTree = (playerX: number, playerZ: number): TreeInfo | null => {
  const nearbyTrees = getNearbyTrees(playerX, playerZ, 100) // 搜索範圍100單位
  return nearbyTrees.length > 0 ? nearbyTrees[0] : null
}

// 獲取最近的樹幹（用於交互）
export const getClosestTrunk = (playerX: number, playerZ: number, maxDistance: number = 15): TreeInfo | null => {
  const nearbyTrees = getNearbyTrees(playerX, playerZ, maxDistance)
  const nearbyTrunks = nearbyTrees.filter(tree => tree.isTrunk)
  
  if (nearbyTrunks.length > 0) {
    console.log(`🎯 找到最近的可交互樹幹: "${nearbyTrunks[0].name}" 距離 ${nearbyTrunks[0].distance.toFixed(1)} 單位`)
    return nearbyTrunks[0]
  }
  
  return null
}

// 檢查玩家是否在樹木附近（用於觸發事件）
export const isPlayerNearTree = (playerX: number, playerZ: number, triggerDistance: number = 10): boolean => {
  const closestTree = getClosestTree(playerX, playerZ)
  return closestTree !== null && closestTree.distance <= triggerDistance
}

// 實時監控玩家與樹木的距離（調試用）
export const monitorPlayerTreeProximity = (playerX: number, playerZ: number) => {
  const nearbyTrees = getNearbyTrees(playerX, playerZ, 25)
  const closestTrunk = getClosestTrunk(playerX, playerZ)
  
  console.log(`📍 玩家樹木距離監控 - 位置 (${playerX.toFixed(1)}, ${playerZ.toFixed(1)}):`)
  console.log(`  - 25單位內樹木數量: ${nearbyTrees.length}`)
  console.log(`  - 最近可交互樹幹: ${closestTrunk ? `"${closestTrunk.name}" 距離${closestTrunk.distance.toFixed(1)}` : '無'}`)
  
  if (nearbyTrees.length > 0) {
    console.log(`  - 最近樹木: "${nearbyTrees[0].name}" 距離${nearbyTrees[0].distance.toFixed(1)}`)
  }
}


interface TerrainModelProps {
  position?: [number, number, number]
  scale?: number
}

export const TerrainModel = ({ position = [0, 0, 0] }: TerrainModelProps) => {
  const groupRef = useRef<THREE.Group>(null)
  const terrainRootRef = useRef<THREE.Group>(null!)
  const [terrainScene, setTerrainScene] = useState<THREE.Group | null>(null)
  const { timeOfDay } = useTimeStore()

  // 載入GLTF模型
  const { scene } = useGLTF('/terrain_low_poly/scene.gltf')

  // 確保場景 matrix 更新
  useEffect(() => {
    scene.updateMatrixWorld(true);
  }, [scene])
  
  // 精確移除白雲物件，完全保留樹木，並設置陰影接收
  useEffect(() => {
    console.log('🔍 開始精確移除白雲物件並設置月光陰影接收...')
    const cloudsToRemove: THREE.Object3D[] = []
    
    scene.traverse((child) => {
      const name = child.name.toLowerCase()
      const position = child.position.clone()
      // 考慮地形縮放轉換座標
      position.multiply(new THREE.Vector3(10, 5, 10))
      
      // 更保守地識別白雲物件，避免誤刪樹葉
      // 只移除非常明確是雲朵的物件
      const isCloudObject = (
        // 只有非常明確的雲朵命名才刪除
        (name === 'clouds' || name === 'cloud' || name.includes('雲')) &&
        // 並且位置要在高空
        position.y > 15 &&
        // 檢查材質是否明確為雲朵材質
        (child instanceof THREE.Mesh && child.material && (() => {
          const materials = Array.isArray(child.material) ? child.material : [child.material]
          return materials.some(mat => {
            if ('name' in mat && mat.name) {
              const matName = mat.name.toLowerCase()
              // 只有明確包含雲朵關鍵字的材質才認為是雲朵
              return matName.includes('cloud') || matName.includes('sky')
            }
            return false
          })
        })()) ||
        // 或者是非常高空（50以上）的球體
        (position.y > 50 && (name.includes('icosphere') || name.includes('sphere')))
      )
      
      // 確保不是樹木相關物件 - 加強樹葉保護
      const isTreeRelated = name.includes('arbol') || 
                           name.includes('tree') || 
                           name.includes('樹') ||
                           name.includes('trunk') || 
                           name.includes('tronco') ||
                           name.includes('wood') ||
                           name.includes('madera') ||
                           name.includes('leaf') ||
                           name.includes('leaves') ||
                           name.includes('hoja') ||
                           name.includes('foliage') ||
                           name.includes('branch') ||
                           name.includes('bark') ||
                           // 檢查材質名稱是否包含樹木相關關鍵字
                           (child instanceof THREE.Mesh && child.material && (() => {
                             const materials = Array.isArray(child.material) ? child.material : [child.material]
                             return materials.some(mat => {
                               if ('name' in mat && mat.name) {
                                 const matName = mat.name.toLowerCase()
                                 return matName.includes('leaf') || 
                                        matName.includes('leaves') ||
                                        matName.includes('tree') ||
                                        matName.includes('wood') ||
                                        matName.includes('bark') ||
                                        matName.includes('trunk') ||
                                        matName.includes('foliage') ||
                                        matName.includes('arbol') ||
                                        matName.includes('madera')
                               }
                               return false
                             })
                           })())
      
      if (isCloudObject && !isTreeRelated) {
        console.log(`🎯 找到白雲物件: "${child.name}", 位置Y: ${position.y.toFixed(2)}`)
        cloudsToRemove.push(child)
      } else {
        // 特別記錄樹木相關物件
        if (isTreeRelated) {
          console.log(`🌳 保留樹木物件: "${child.name}", Y位置: ${position.y.toFixed(2)}`)
        } else {
          console.log(`✅ 保留物件: "${child.name}", Y位置: ${position.y.toFixed(2)}`)
        }
      }
    })
    
    // 移除識別出的雲朵物件
    cloudsToRemove.forEach(cloudObj => {
      console.log(`🗑️ 移除白雲: "${cloudObj.name}"`)
      
      if (cloudObj.parent) {
        cloudObj.parent.remove(cloudObj)
      }
      
      // 清理資源
      if (cloudObj instanceof THREE.Mesh) {
        if (cloudObj.geometry) {
          cloudObj.geometry.dispose()
        }
        if (cloudObj.material) {
          if (Array.isArray(cloudObj.material)) {
            cloudObj.material.forEach(mat => mat.dispose())
          } else {
            cloudObj.material.dispose()
          }
        }
      }
    })
    
    console.log(`✨ 白雲移除完成！共移除了 ${cloudsToRemove.length} 個白雲物件`)
    console.log(`🌳 所有樹木已完整保留`)
  }, [scene])
  
  // 全局變數儲存樹木網格
  const treeMeshes = useRef<THREE.Mesh[]>([])

  // 初始化射線檢測器和地形參考
  useEffect(() => {
    if (!raycaster) {
      raycaster = new THREE.Raycaster()
    }

    // 尋找地形mesh、棕色山體mesh和樹木mesh
    brownMountainMeshes = [] // 重置棕色山體陣列
    treeMeshes.current = [] // 重置樹木陣列
    const collisionMeshes: THREE.Mesh[] = [] // 收集所有需要碰撞檢測的mesh

    console.log('🏞️ 初始化地形和物件檢測...')
    console.log('🔍 掃描場景中的所有樹木位置...')
    
    scene.traverse((child) => {
      const name = child.name.toLowerCase()
      
      if (child instanceof THREE.Mesh) {
        
        // 檢查是否為樹木（包括樹幹和樹葉）
        if (name.includes('arbol') || name.includes('tree') || name.includes('樹') ||
            name.includes('trunk') || name.includes('tronco') || name.includes('木') || name.includes('bark') ||
            (child.material && Array.isArray(child.material) ? 
             child.material.some(mat => {
               const matName = mat.name?.toLowerCase() || ''
               return matName.includes('leaves') || matName.includes('leaf') ||
                      matName.includes('wood') || matName.includes('trunk') ||
                      matName.includes('bark') || matName.includes('madera')
             }) :
             child.material && 'name' in child.material && (() => {
               const matName = child.material.name?.toLowerCase() || ''
               return matName.includes('leaves') || matName.includes('leaf') ||
                      matName.includes('wood') || matName.includes('trunk') ||
                      matName.includes('bark') || matName.includes('madera')
             })())) {
          
          // 檢查樹木位置，如果在指定座標附近則刪除
          const localPosition = child.position.clone()
          
          // 轉換為實際座標（考慮10倍XZ縮放）
          const actualX = localPosition.x * 10
          const actualZ = localPosition.z * 10
          
          // 檢查是否在要刪除的座標附近（允許一定的誤差範圍）
          const deleteTargets = [
            { x: -200.5, z: -133, tolerance: 5.0 },     // 原始刪除目標
            { x: -212.4, z: -136.1, tolerance: 40.0 }   // 3D場景邊界附近40單位範圍的樹木
          ]
          
          for (const target of deleteTargets) {
            const distanceX = Math.abs(actualX - target.x)
            const distanceZ = Math.abs(actualZ - target.z)
            
            if (distanceX <= target.tolerance && distanceZ <= target.tolerance) {
              console.log(`🗑️ 刪除指定位置的樹木: "${child.name}"`)
              console.log(`  目標位置: (${target.x}, ${target.z})`)
              console.log(`  實際位置: (${actualX.toFixed(2)}, ${actualZ.toFixed(2)})`)
              console.log(`  距離差: X=${distanceX.toFixed(2)}, Z=${distanceZ.toFixed(2)}`)
              
              // 從父物件中移除這個樹木
              if (child.parent) {
                child.parent.remove(child)
              }
              
              // 清理資源
              if (child.geometry) {
                child.geometry.dispose()
              }
              if (child.material) {
                if (Array.isArray(child.material)) {
                  child.material.forEach(mat => mat.dispose())
                } else {
                  child.material.dispose()
                }
              }
              
              console.log(`✅ 樹木已成功刪除`)
              return // 跳過後續處理
            }
          }
          
          // 檢查是否為樹幹mesh（棕色部分）
          const isTrunk = name.includes('trunk') || name.includes('tronco') || 
                         name.includes('bark') || name.includes('木') ||
                         (child.material && (() => {
                           const materials = Array.isArray(child.material) ? child.material : [child.material]
                           return materials.some(mat => {
                             const matName = mat.name?.toLowerCase() || ''
                             return matName.includes('trunk') || matName.includes('bark') || 
                                    matName.includes('wood') || matName.includes('madera')
                           })
                         })())
          
          // 如果是樹幹，向下延伸並完全穿透整個地形模型
          if (isTrunk) {
            // 保存原始縮放和位置
            const originalScale = child.scale.clone()
            const originalPosition = child.position.clone()
            
            // 延遲處理，確保地形mesh已經初始化
            setTimeout(() => {
              // 使用樹幹的本地位置，避免受相機或父物件變換影響
              // 考慮地形的10倍XZ縮放，將本地位置轉換為地形座標系
              const localPosition = child.position.clone()
              const terrainX = localPosition.x * 10 // 地形XZ軸10倍縮放
              const terrainZ = localPosition.z * 10
              
              // 獲取該位置的實際地面高度
              const groundHeight = getTerrainHeight(terrainX, terrainZ)
              
              // 計算地形的邊界框以確定完全穿透所需的高度
              let terrainBounds = { min: -50, max: 125 } // 預設範圍
              if (terrainMesh) {
                const box = new THREE.Box3().setFromObject(terrainMesh)
                terrainBounds.min = box.min.y
                terrainBounds.max = box.max.y
              }
              
              // 計算穿透整個地形所需的總高度（從地形頂部到底部，再加上額外延伸）
              const terrainHeight = terrainBounds.max - terrainBounds.min
              const extraExtension = 50 // 額外向下延伸50單位確保完全穿透
              const totalRequiredHeight = terrainHeight + extraExtension
              
              // 計算所需的縮放倍數來達到完全穿透
              const extensionFactor = Math.max(10.0, totalRequiredHeight / originalScale.y)
              child.scale.set(originalScale.x, originalScale.y * extensionFactor, originalScale.z)
              
              // 計算樹幹延伸後的總高度
              const extendedHeight = originalScale.y * extensionFactor
              
              // 設置樹幹位置：讓樹幹扎根到地底，但地面部分保持可見
              // 樹幹應該向下延伸到地底，但地面以上保持原始高度
              const visibleAboveGround = originalScale.y // 地面以上保持原始高度
              const undergroundDepth = extendedHeight - visibleAboveGround // 地下部分深度
              
              // 樹幹中心位置：地面高度 + 可見部分的一半 - 地下部分的一半
              const treeCenterY = groundHeight + (visibleAboveGround / 2) - (undergroundDepth / 2)
              
              child.position.set(
                originalPosition.x, 
                treeCenterY,
                originalPosition.z
              )
              
              console.log(`樹幹錨定地面並穿透地形: "${child.name}"`)
              console.log(`  世界位置 (${terrainX.toFixed(1)}, ${terrainZ.toFixed(1)})`)
              console.log(`  地面高度: ${groundHeight.toFixed(2)}`)
              console.log(`  地形邊界: Y ${terrainBounds.min.toFixed(2)} 到 ${terrainBounds.max.toFixed(2)}`)
              console.log(`  地形總高度: ${terrainHeight.toFixed(2)}`)
              console.log(`  延伸倍數: ${extensionFactor.toFixed(2)}x`)
              console.log(`  延伸後總高度: ${extendedHeight.toFixed(2)}`)
              console.log(`  地面以上高度: ${visibleAboveGround.toFixed(2)}`)
              console.log(`  地下深度: ${undergroundDepth.toFixed(2)}`)
              console.log(`  樹中心Y位置: ${treeCenterY.toFixed(2)} (扎根地底)`)
              console.log(`  樹頂Y位置: ${(treeCenterY + extendedHeight/2).toFixed(2)}`)
              console.log(`  樹底Y位置: ${(treeCenterY - extendedHeight/2).toFixed(2)} (地底)`)
              console.log(`  原始位置:`, originalPosition.toArray())
              console.log(`  最終位置:`, child.position.toArray())
            }, 1000) // 等待1秒確保地形初始化完成
          }
          
          // 儲存原始材質資訊用於發光效果
          child.userData.originalMaterials = Array.isArray(child.material) 
            ? child.material.map(mat => ({ ...mat })) 
            : { ...child.material }
          
          treeMeshes.current.push(child)
          const position = child.position.clone()
          // 轉換為世界座標用於顯示
          const worldPos = position.clone().multiply(new THREE.Vector3(10, 5, 10))
          console.log(`🌳 找到樹木mesh: "${child.name}", 本地位置: (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}), 世界位置: (${worldPos.x.toFixed(2)}, ${worldPos.y.toFixed(2)}, ${worldPos.z.toFixed(2)})`)
        }
        
        // 檢查材質是否為棕色山體材質
        if (child.material) {
          const material = Array.isArray(child.material) ? child.material[0] : child.material
          if (material && 'name' in material) {
            const materialName = material.name?.toLowerCase() || ''
            
            // 識別棕色山體材質 - 但排除樹木相關材質
            const isTreeMaterial = materialName.includes('wood') || 
                                 materialName.includes('trunk') || 
                                 materialName.includes('bark') || 
                                 materialName.includes('madera') ||
                                 materialName.includes('leaves') || 
                                 materialName.includes('leaf')
            
            if (!isTreeMaterial && (materialName.includes('brown') || 
                materialName.includes('montaña') || 
                materialName.includes('montana') ||
                materialName.includes('mountain'))) {
              brownMountainMeshes.push(child)
              // 標記為不可行走區域
              child.userData.noWalk = true
              child.name = child.name || `mountain_${brownMountainMeshes.length}`
              console.log('找到棕色山體mesh:', child.name, '材質:', material.name, '已標記為不可行走')
            }
            
            // 記錄所有材質以供調試（減少輸出）
            if (materialName.includes('leaves') || materialName.includes('tree') || materialName.includes('arbol')) {
              console.log('發現樹木材質:', material.name, 'mesh:', child.name)
            }
          }
        }

        // 優先尋找明確的地形名稱作為主要地形
        if (name.includes('ground') ||
            name.includes('terreno') ||
            name.includes('terrain')) {
          terrainMesh = child
          collisionMeshes.push(child) // 加入碰撞mesh列表
          console.log('找到地形mesh:', child.name)
          return
        }

        // 收集所有可能的地形和山體mesh用於碰撞檢測
        if (!name.includes('cloud') && !name.includes('sky') &&
            !name.includes('tree') && !name.includes('arbol') &&
            !name.includes('leaf') && !name.includes('trunk')) {
          // 檢查位置，過濾掉高空物體
          const worldY = child.position.y * 5
          if (worldY <= 10) {
            collisionMeshes.push(child)
          }
        }
      }
    })
    
    // 如果沒找到特定名稱的地形，使用符合條件的mesh（排除雲朵和空中物件）
    if (!terrainMesh) {
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh && !terrainMesh) {
          const name = child.name.toLowerCase()

          // 排除雲朵和其他空中物件 - 更全面的檢查
          if (name.includes('clouds') ||
              name.includes('cloud') ||
              name.includes('sky') ||
              name.includes('arbol') || // 樹木
              name.includes('tree') ||
              name.includes('icosphere') || // 可能是雲朵的球體
              name.includes('sphere')) { // 球體通常是雲朵
            return
          }

          // 檢查物件的Y位置，雲朵通常在較高位置
          const position = child.position.clone()
          // 考慮地形5倍Y縮放
          const worldY = position.y * 5
          if (worldY > 10) { // 高於10單位的可能是雲朵
            return
          }

          terrainMesh = child
          collisionMeshes.push(child) // 加入碰撞mesh列表
          console.log('使用mesh作為地形:', child.name, '位置Y:', position.y)
        }
      })
    }

    // 將棕色山體mesh也加入碰撞檢測
    brownMountainMeshes.forEach(mesh => {
      if (!collisionMeshes.includes(mesh)) {
        collisionMeshes.push(mesh)
      }
    })

    // 延遲建立BVH世界碰撞網格，確保場景變換已更新
    setTimeout(() => {
      if (collisionMeshes.length > 0) {
        // 強制更新所有 mesh 的 world matrix
        collisionMeshes.forEach(mesh => {
          mesh.updateMatrixWorld(true);
        });

        console.log(`🔨 建立BVH世界碰撞網格，包含 ${collisionMeshes.length} 個mesh`)
        const worldMesh = buildWorldBVH(collisionMeshes)
        if (worldMesh) {
          console.log('✅ BVH世界碰撞網格建立成功')
          // 加入場景用於調試（不可見）
          scene.add(worldMesh)
        } else {
          console.error('❌ BVH世界碰撞網格建立失敗')
        }
      } else {
        console.warn('⚠️ 沒有找到可用於碰撞檢測的mesh')
      }
    }, 100)  // 短暫延遲確保場景變換完成
    
    // 設置所有地形和物體接收太陽和月亮陰影
    console.log('🌞🌙 設置地形接收陰影...')
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // 所有地形mesh都接收陰影
        child.receiveShadow = true
        
        // 預設不投射陰影，只有特定物體才投射
        child.castShadow = false
        
        // 確保材質支持陰影 - 轉換為StandardMaterial
        if (child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material]
          materials.forEach((material, index) => {
            if (material instanceof THREE.MeshLambertMaterial) {
              console.log(`🔄 轉換Lambert材質為Standard材質: ${material.name || 'unnamed'}`)
              const standardMaterial = new THREE.MeshStandardMaterial({
                map: material.map,
                color: material.color,
                emissive: material.emissive,
                emissiveIntensity: material.emissiveIntensity,
                transparent: material.transparent,
                opacity: material.opacity,
                side: material.side,
                // 確保陰影顯示正確
                shadowSide: THREE.DoubleSide,
                depthWrite: true,
                depthTest: true
              })
              
              if (Array.isArray(child.material)) {
                child.material[index] = standardMaterial
              } else {
                child.material = standardMaterial
              }
              
              // 清理舊材質
              material.dispose()
            } else if (material instanceof THREE.MeshStandardMaterial) {
              // 如果已經是Standard材質，確保陰影設置正確
              material.shadowSide = THREE.DoubleSide
              material.depthWrite = true
              material.depthTest = true
            }
          })
        }
        
        // 樹木也需要接收和投射陰影
        const name = child.name.toLowerCase()
        const isTreeRelated = name.includes('tree') || name.includes('arbol') || 
                             name.includes('trunk') || name.includes('tronco') ||
                             name.includes('leaf') || name.includes('leaves') ||
                             name.includes('wood') || name.includes('bark') ||
                             name.includes('madera') || name.includes('hoja') ||
                             // 檢查材質名稱
                             (child.material && (() => {
                               const materials = Array.isArray(child.material) ? child.material : [child.material]
                               return materials.some(mat => {
                                 if ('name' in mat && mat.name) {
                                   const matName = mat.name.toLowerCase()
                                   return matName.includes('leaf') || matName.includes('leaves') ||
                                          matName.includes('tree') || matName.includes('wood') ||
                                          matName.includes('bark') || matName.includes('trunk') ||
                                          matName.includes('arbol') || matName.includes('madera')
                                 }
                                 return false
                               })
                             })())
        
        if (isTreeRelated) {
          // 樹木只投射陰影，不接收陰影（避免樹木身上有陰影）
          child.castShadow = true
          child.receiveShadow = false
          // 樹木不是可行走層
          markWalkable(child, false);

          // 將樹木加入全域數組
          if (!treeMeshes.current.includes(child)) {
            treeMeshes.current.push(child)
          }

          console.log(`🌳 樹木陰影設置: ${child.name} (castShadow: ${child.castShadow}, receiveShadow: ${child.receiveShadow}) - 位置: (${child.position.x.toFixed(1)}, ${child.position.z.toFixed(1)})`)
        } else {
          // 地形部分只接收陰影，不投射
          child.castShadow = false
          console.log(`🏔️ 地形陰影設置: ${child.name}`)
        }
      }
    })
    console.log('✅ 陰影設置完成')
    console.log(`📊 樹木陰影統計: 總計 ${treeMeshes.current.length} 棵樹設置了陰影投射`)
    
    // 檢查邊界區域的樹木
    const boundaryTrees = treeMeshes.current.filter(tree => {
      const x = tree.position.x
      const z = tree.position.z
      return Math.abs(x) > 200 || Math.abs(z) > 200 // 距離中心200單位以上
    })
    console.log(`🏔️ 邊界區域樹木: ${boundaryTrees.length} 棵樹靠近牆壁邊界`)
    boundaryTrees.forEach((tree, i) => {
      console.log(`  ${i+1}. ${tree.name} - 位置: (${tree.position.x.toFixed(1)}, ${tree.position.z.toFixed(1)})`)
    })
    
    // 在所有樹木載入完成後更新全域樹木位置
    const timer = setTimeout(() => {
      if (treeMeshes.current.length > 0) {
        updateGlobalTreePositions(treeMeshes.current)
        
        // 檢查玩家被困位置附近的樹木
        console.log('🔍 檢查玩家被困位置附近的樹木：')
        console.log('位置1: (-211.6, -142.6)')
        monitorPlayerTreeProximity(-211.6, -142.6)
        console.log('位置2: (-212.4, -136.1)')
        monitorPlayerTreeProximity(-212.4, -136.1)
      }
    }, 1500) // 等待1.5秒確保所有樹木處理完成
    
    return () => {
      // 清理時重置
      terrainMesh = null
      brownMountainMeshes = []
      clearTimeout(timer)
    }
  }, [scene])
  
  // 創建地形碰撞箱 - 適應10倍擴展的地形
  const terrainColliders = useMemo(() => {
    const colliders: Array<{position: THREE.Vector3, radius: number, id: string}> = []
    
    // 創建基於實際地形高度的智能碰撞檢測，極度降低密度如平地般行走
    const terrainSize = 800 // 10倍擴展：80 * 10 = 800
    const gridSize = 6 // 極度降低密度，讓任何地形都如平地般通過
    const step = terrainSize / gridSize
    
    // 延遲創建碰撞，等待地形載入
    setTimeout(() => {
      for (let x = -terrainSize/2; x <= terrainSize/2; x += step) {
        for (let z = -terrainSize/2; z <= terrainSize/2; z += step) {
          const centerHeight = getTerrainHeight(x, z)
          
          // 跳過異常高度（可能是雲朵）
          if (centerHeight < -5 || centerHeight > 25) continue
          
          // 檢查周圍的高度差異
          const surroundingHeights = [
            getTerrainHeight(x + step, z),
            getTerrainHeight(x - step, z),
            getTerrainHeight(x, z + step),
            getTerrainHeight(x, z - step)
          ]
          
          const validHeights = surroundingHeights.filter(h => h > -5 && h < 25)
          if (validHeights.length === 0) continue
          
          
          // 檢查地形高度差異，如果過於陡峭則加入山脈碰撞器
          const heightDifference = Math.max(...validHeights) - Math.min(...validHeights)
          const avgHeight = validHeights.reduce((sum, h) => sum + h, 0) / validHeights.length
          
          // 如果高度差異大於某個閾值，認為是山脈或陡坡
          if (heightDifference > 8 || avgHeight > 15) {
            colliders.push({
              position: new THREE.Vector3(x, 0, z),
              radius: step * 0.4, // 碰撞半徑為網格大小的40%
              id: `mountain_terrain_${x}_${z}`
            })
            console.log(`山脈碰撞器: 位置(${x.toFixed(1)}, ${z.toFixed(1)}), 高度差: ${heightDifference.toFixed(2)}, 平均高度: ${avgHeight.toFixed(2)}, 半徑: ${(step * 0.4).toFixed(1)}`)
          }
          
          // 檢查棕色山體材質區域
          if (isOnBrownMountain(x, z)) {
            colliders.push({
              position: new THREE.Vector3(x, 0, z),
              radius: step * 0.3, // 棕色山體碰撞半徑稍小
              id: `brown_mountain_${x}_${z}`
            })
            console.log(`棕色山體碰撞器: 位置(${x.toFixed(1)}, ${z.toFixed(1)}), 半徑: ${(step * 0.3).toFixed(1)}`)
          }
        }
      }
    }, 1000) // 等待1秒讓地形完全載入
    
    // 為棕色山體mesh添加碰撞檢測
    setTimeout(() => {
      brownMountainMeshes.forEach((mountainMesh, index) => {
        // 計算mesh的邊界框
        const boundingBox = new THREE.Box3().setFromObject(mountainMesh)
        const center = boundingBox.getCenter(new THREE.Vector3())
        const size = boundingBox.getSize(new THREE.Vector3())
        
        // 轉換為世界座標
        center.multiply(new THREE.Vector3(10, 5, 10))
        
        // 根據mesh大小設置碰撞半徑
        const radius = Math.max(size.x, size.z) * 5 // 考慮10倍XZ縮放，取較大的XZ尺寸的一半
        
        colliders.push({
          position: new THREE.Vector3(center.x, 0, center.z),
          radius: radius,
          id: `brown_mountain_mesh_${index}`
        })
        
        console.log(`棕色山體網格碰撞器 ${index}: "${mountainMesh.name}" 位置(${center.x.toFixed(1)}, ${center.z.toFixed(1)}), 半徑: ${radius.toFixed(1)}, 大小: (${size.x.toFixed(1)}, ${size.z.toFixed(1)})`)
      })
    }, 1200) // 等待1.2秒確保山體mesh已識別
    
    // 使用真實的樹木網格位置來添加碰撞檢測
    treeMeshes.current.forEach((treeMesh, index) => {
      const position = treeMesh.position.clone()
      // 轉換為世界座標
      position.multiply(new THREE.Vector3(10, 5, 10))
      
      // 根據樹木類型設置合適的碰撞半徑
      const name = treeMesh.name.toLowerCase()
      const isTrunk = name.includes('trunk') || name.includes('tronco') || 
                     name.includes('bark') || name.includes('木') ||
                     (treeMesh.material && (() => {
                       const materials = Array.isArray(treeMesh.material) ? treeMesh.material : [treeMesh.material]
                       return materials.some(mat => {
                         const matName = mat.name?.toLowerCase() || ''
                         return matName.includes('trunk') || matName.includes('bark') || 
                                matName.includes('wood') || matName.includes('madera')
                       })
                     })())
      
      // 設置碰撞半徑：樹幹較小，樹葉較大
      let radius = 2.5 // 預設樹葉半徑
      if (isTrunk) {
        radius = 1.5 // 樹幹半徑較小，允許更接近
      }
      
      colliders.push({
        position: new THREE.Vector3(position.x, 0, position.z), // Y設為0用於2D碰撞檢測
        radius: radius,
        id: `real_tree_${index}`
      })
      
      console.log(`真實樹木碰撞器 ${index}: "${treeMesh.name}" 位置(${position.x.toFixed(1)}, ${position.z.toFixed(1)}), 類型: ${isTrunk ? '樹幹' : '樹葉'}, 半徑: ${radius}`)
    })
    
    // 如果沒有找到真實樹木，使用備用預設位置，設置合適的碰撞半徑
    if (treeMeshes.current.length === 0) {
      console.warn('未找到真實樹木網格，使用預設樹木位置')
      const fallbackTreePositions = [
        { x: 15, z: 12, radius: 2.0 }, // 恢復碰撞半徑
        { x: -18, z: 25, radius: 2.5 },
        { x: 28, z: -15, radius: 2.0 },
        { x: -25, z: -18, radius: 2.5 },
        { x: 35, z: 20, radius: 2.0 },
        { x: -30, z: 35, radius: 2.5 },
      ]
      
      fallbackTreePositions.forEach((tree, index) => {
        colliders.push({
          position: new THREE.Vector3(tree.x, 0, tree.z),
          radius: tree.radius,
          id: `fallback_tree_${index}`
        })
        console.log(`備用樹木碰撞器 ${index}: 位置(${tree.x}, ${tree.z}), 半徑: ${tree.radius}`)
      })
    }
    
    return colliders
  }, [scene]) // 依賴scene變化來重新計算碰撞器
  
  // 註冊真實樹木碰撞物體到碰撞系統
  useEffect(() => {
    if (treeMeshes.current.length === 0) return
    
    const timer = setTimeout(() => {
      // 清除舊的樹木碰撞物體
      const oldTreeColliders = collisionSystem.getCollisionObjects()
        .filter(obj => obj.id.startsWith('tree_') || obj.id.startsWith('real_tree_') || obj.id.startsWith('fallback_tree_'))
      
      oldTreeColliders.forEach(obj => {
        collisionSystem.removeCollisionObject(obj.id)
      })
      
      // 添加真實樹木碰撞物體
      treeMeshes.current.forEach((treeMesh, index) => {
        const position = treeMesh.position.clone()
        // 轉換為世界座標
        position.multiply(new THREE.Vector3(10, 5, 10))
        
        // 根據樹木類型設置合適的碰撞半徑
        const name = treeMesh.name.toLowerCase()
        const isTrunk = name.includes('trunk') || name.includes('tronco') || 
                       name.includes('bark') || name.includes('木') ||
                       (treeMesh.material && (() => {
                         const materials = Array.isArray(treeMesh.material) ? treeMesh.material : [treeMesh.material]
                         return materials.some(mat => {
                           const matName = mat.name?.toLowerCase() || ''
                           return matName.includes('trunk') || matName.includes('bark') || 
                                  matName.includes('wood') || matName.includes('madera')
                         })
                       })())
        
        // 設置碰撞半徑：樹幹較小，樹葉較大
        let radius = 2.5 // 預設樹葉半徑
        if (isTrunk) {
          radius = 1.5 // 樹幹半徑較小，允許更接近
        }
        
        console.log(`註冊真實樹木碰撞器 ${index}: "${treeMesh.name}" 位置(${position.x.toFixed(1)}, ${position.z.toFixed(1)}), 類型: ${isTrunk ? '樹幹' : '樹葉'}, 半徑: ${radius}`)
        
        collisionSystem.addCollisionObject({
          position: new THREE.Vector3(position.x, 0, position.z), // Y設為0用於2D碰撞檢測
          radius: radius,
          type: 'tree',
          id: `real_tree_${index}`,
          userData: { 
            treeName: treeMesh.name,
            isTrunk: isTrunk,
            originalMesh: treeMesh
          }
        })
      })
      
      console.log(`已註冊 ${treeMeshes.current.length} 個真實樹木碰撞器`)
      
      // 顯示完整的碰撞系統統計
      setTimeout(() => {
        collisionSystem.getCollisionStats()
      }, 500) // 再等待0.5秒顯示統計
    }, 1500) // 等待1.5秒讓樹木網格完全載入
    
    return () => clearTimeout(timer)
  }, [scene]) // 依賴scene載入
  
  // 處理樹木夜間發光效果
  useEffect(() => {
    if (treeMeshes.current.length === 0) return
    
    console.log(`🌙 ${timeOfDay === 'night' ? '啟用' : '關閉'}樹木夜間發光效果`)
    
    treeMeshes.current.forEach(treeMesh => {
      if (treeMesh.material) {
        const materials = Array.isArray(treeMesh.material) ? treeMesh.material : [treeMesh.material]
        
        materials.forEach(material => {
          if (!material.name) return
          
          // 檢查材質是否支持發光屬性
          if (!(material instanceof THREE.MeshStandardMaterial || 
                material instanceof THREE.MeshLambertMaterial ||
                material instanceof THREE.MeshPhongMaterial)) {
            return
          }
          
          // 移除夜晚树叶和树干发光效果
          material.emissive = new THREE.Color(0x000000) // 黑色 = 不發光
          if ('emissiveIntensity' in material) {
            (material as THREE.MeshStandardMaterial).emissiveIntensity = 0
          }
          
          // 標記材質需要更新
          material.needsUpdate = true
        })
      }
    })
  }, [timeOfDay]) // 監聽日夜變化

  // 天氣效果：樹木晃動和雪天氛圍
  useFrame((state) => {
    if (treeMeshes.current.length === 0) return
    
    const { weather, timeOfDay } = useTimeStore.getState()
    const time = state.clock.elapsedTime
    
    
    // 大風和山雷天氣時都有搖晃效果
    if (weather === 'windy' || weather === 'storm') {
      // 處理所有樹木mesh（包括樹葉和樹幹）
      treeMeshes.current.forEach((treeMesh, index) => {
        if (!treeMesh.userData.originalRotation) {
          // 儲存原始旋轉值
          treeMesh.userData.originalRotation = treeMesh.rotation.clone()
        }
        
        const originalRotation = treeMesh.userData.originalRotation
        const name = treeMesh.name.toLowerCase()
        
        // 判斷是否為樹幹
        const isTrunk = name.includes('trunk') || name.includes('tronco') || 
                       name.includes('bark') || name.includes('木') ||
                       (treeMesh.material && (() => {
                         const materials = Array.isArray(treeMesh.material) ? treeMesh.material : [treeMesh.material]
                         return materials.some(mat => {
                           const matName = mat.name?.toLowerCase() || ''
                           return matName.includes('trunk') || matName.includes('bark') || 
                                  matName.includes('wood') || matName.includes('madera')
                         })
                       })())
        
        let swayAmount, swaySpeed
        
        if (isTrunk) {
          // 樹幹搖晃：較小幅度，較慢速度，更穩重
          swayAmount = 0.002 // 樹幹搖晃幅度降低
          swaySpeed = 0.15 + index * 0.015 // 搖晃速度保持
        } else {
          // 樹葉搖晃：保持原有設定
          swayAmount = 0.004 // 樹葉搖晃幅度降低
          swaySpeed = 0.25 + index * 0.025 // 樹葉搖晃速度保持
        }
        
        // 左右搖晃 (Z軸) - 根據類型調整
        const sway = Math.sin(time * swaySpeed + index) * swayAmount
        
        // 樹幹還可以有輕微的前後搖晃 (X軸)
        if (isTrunk) {
          const swayX = Math.sin(time * swaySpeed * 0.4 + index * 0.75) * swayAmount * 0.3
          treeMesh.rotation.x = originalRotation.x + swayX
        }
        
        // 應用Z軸搖晃
        treeMesh.rotation.z = originalRotation.z + sway
      })
    } else {
      // 非大風天氣時，恢復原始姿態
      treeMeshes.current.forEach((treeMesh) => {
        if (treeMesh.userData.originalRotation) {
          // 平滑過渡回原始姿態
          treeMesh.rotation.x = THREE.MathUtils.lerp(treeMesh.rotation.x, treeMesh.userData.originalRotation.x, 0.025)
          treeMesh.rotation.z = THREE.MathUtils.lerp(treeMesh.rotation.z, treeMesh.userData.originalRotation.z, 0.025)
        }
      })
    }
  })

  // 註冊其他碰撞物體到碰撞系統
  useEffect(() => {
    // 清除舊的地形碰撞物體（不包括樹木）
    const oldTerrainColliders = collisionSystem.getCollisionObjects()
      .filter(obj => obj.id.startsWith('terrain_') || obj.id.startsWith('mountain_barrier_'))
    
    oldTerrainColliders.forEach(obj => {
      collisionSystem.removeCollisionObject(obj.id)
    })
    
    // 添加地形碰撞物體（不包括樹木）
    const nonTreeColliders = terrainColliders.filter(c => !c.id.includes('tree'))
    nonTreeColliders.forEach(collider => {
      let objType: 'mountain' | 'rock' = 'rock'
      
      // 判斷碰撞物體類型
      if (collider.id.includes('mountain') || collider.id.includes('brown_mountain')) {
        objType = 'mountain'
      }
      
      collisionSystem.addCollisionObject({
        position: collider.position,
        radius: collider.radius,
        type: objType,
        id: collider.id
      })
      
      console.log(`註冊地形碰撞器: ${collider.id}, 類型: ${objType}, 位置: (${collider.position.x.toFixed(1)}, ${collider.position.z.toFixed(1)}), 半徑: ${collider.radius.toFixed(1)}`)
    })
    
    return () => {
      // 清理碰撞物體
      nonTreeColliders.forEach(collider => {
        collisionSystem.removeCollisionObject(collider.id)
      })
    }
  }, [terrainColliders])
  
  // 直接使用原始場景，雲朵已被移除
  const cleanedScene = scene

  // 設置地形場景供TreeGlow使用
  useEffect(() => {
    if (cleanedScene && groupRef.current) {
      setTerrainScene(groupRef.current)
    }
  }, [cleanedScene])

  // Register ground root early using useLayoutEffect
  useLayoutEffect(() => {
    if (terrainRootRef.current) {
      registerGroundRoot(terrainRootRef.current)
    }
  }, [])

  return (
    <group ref={groupRef} position={position}>
      {/* 讓XZ軸10倍擴展，Y軸5倍擴展以保持比例協調 */}
      <group ref={terrainRootRef} name="TerrainRoot">
        <group scale={[10, 5, 10]} name="TerrainGround">
          <primitive object={cleanedScene} />
        </group>
      </group>
      
      {/* 樹幹發光效果 */}
      <TreeGlow terrainScene={terrainScene} />
      
      {/* 地形夜晚发光效果 - A方案：材质发光 + C方案：边缘发光 */}
      <TerrainGlow terrainScene={terrainScene} />
      
      {/* 陰影接收平面 - 確保陰影顯示在地面上 */}
      <mesh
        position={[0, 0.5, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        castShadow={false}
      >
        <planeGeometry args={[800, 800]} />
        <meshStandardMaterial
          transparent
          opacity={0}
          shadowSide={2}
        />
      </mesh>
      
      {/* 調試用：顯示碰撞區域（可選） */}
      {/* {terrainColliders.map(collider => (
        <mesh key={collider.id} position={collider.position}>
          <sphereGeometry args={[collider.radius, 8, 8]} />
          <meshBasicMaterial color="red" transparent opacity={0.2} />
        </mesh>
      ))} */}
    </group>
  )
}

// 檢查路徑上是否有山脈障礙 - 移除所有障礙檢測，適應XZ軸10倍擴展，Y軸5倍擴展
export const hasTerrainObstacle = (_fromX: number, _fromZ: number, _toX: number, _toZ: number): boolean => {
  // 移除所有地形障礙檢測，允許自由通行
  return false
}

// 檢查某個位置是否在真正的地面上 - 移除崎嶇路面限制，允許自由行走
export const isValidGroundPosition = (_x: number, _z: number): boolean => {
  // 移除所有崎嶇路面限制，允許在任何地形上自由行走
  return true
}

// 檢查位置是否在路面上（模擬道路系統）
export const isOnRoadSurface = (x: number, z: number): boolean => {
  // 定義幾條主要道路路徑（適應10倍擴展的地形）
  const roads = [
    // 主要十字路口 - 中央區域
    { centerX: 0, centerZ: 0, width: 12, length: 12, type: 'intersection' },
    
    // 東西向主幹道
    { centerX: 0, centerZ: 0, width: 60, length: 8, type: 'horizontal' },
    
    // 南北向主幹道  
    { centerX: 0, centerZ: 0, width: 8, length: 60, type: 'vertical' },
    
    // 分支道路 - 東北區域
    { centerX: 15, centerZ: -15, width: 30, length: 6, type: 'horizontal' },
    { centerX: 15, centerZ: -15, width: 6, length: 20, type: 'vertical' },
    
    // 分支道路 - 西南區域
    { centerX: -15, centerZ: 15, width: 25, length: 6, type: 'horizontal' },
    { centerX: -15, centerZ: 15, width: 6, length: 25, type: 'vertical' },
    
    // 環形道路 - 連接各區域
    { centerX: 20, centerZ: 0, width: 6, length: 25, type: 'vertical' },
    { centerX: -20, centerZ: 0, width: 6, length: 25, type: 'vertical' },
    { centerX: 0, centerZ: 20, width: 25, length: 6, type: 'horizontal' },
    { centerX: 0, centerZ: -20, width: 25, length: 6, type: 'horizontal' },
  ]
  
  // 檢查是否在任何道路範圍內
  for (const road of roads) {
    const deltaX = Math.abs(x - road.centerX)
    const deltaZ = Math.abs(z - road.centerZ)
    
    if (road.type === 'horizontal') {
      // 東西向道路：寬度檢查Z軸，長度檢查X軸
      if (deltaZ <= road.length / 2 && deltaX <= road.width / 2) {
        return true
      }
    } else if (road.type === 'vertical') {
      // 南北向道路：寬度檢查X軸，長度檢查Z軸
      if (deltaX <= road.length / 2 && deltaZ <= road.width / 2) {
        return true
      }
    } else if (road.type === 'intersection') {
      // 十字路口：檢查是否在方形範圍內
      if (deltaX <= road.width / 2 && deltaZ <= road.length / 2) {
        return true
      }
    }
  }
  
  return false
}

// 獲取最近的道路點（用於路徑規劃）
export const getNearestRoadPoint = (x: number, z: number): [number, number] => {
  const roadPoints = [
    // 主要十字路口附近的連接點
    [0, 0], [6, 0], [-6, 0], [0, 6], [0, -6],
    
    // 東西向主幹道上的點
    [15, 0], [30, 0], [-15, 0], [-30, 0],
    
    // 南北向主幹道上的點
    [0, 15], [0, 30], [0, -15], [0, -30],
    
    // 分支道路連接點
    [15, -15], [15, -25], [25, -15],
    [-15, 15], [-15, 25], [-25, 15],
    
    // 環形道路連接點
    [20, 10], [20, -10], [-20, 10], [-20, -10],
    [10, 20], [-10, 20], [10, -20], [-10, -20],
  ]
  
  let nearestPoint: [number, number] = [0, 0]
  let minDistance = Infinity
  
  for (const point of roadPoints) {
    const distance = Math.sqrt((x - point[0]) ** 2 + (z - point[1]) ** 2)
    if (distance < minDistance) {
      minDistance = distance
      nearestPoint = [point[0], point[1]]
    }
  }
  
  return nearestPoint
}

// 檢測位置是否在棕色山體材質上 - XZ軸5倍擴展，Y軸2.5倍擴展
export const isOnBrownMountain = (x: number, z: number): boolean => {
  if (!raycaster || brownMountainMeshes.length === 0) {
    return false
  }

  // 從上方向下發射射線檢測棕色山體，調整高度以適應Y軸2.5倍擴展
  const origin = new THREE.Vector3(x, 250, z)
  const direction = new THREE.Vector3(0, -1, 0)
  raycaster.set(origin, direction)

  // 檢測與棕色山體的交點
  for (const brownMesh of brownMountainMeshes) {
    const intersects = raycaster.intersectObject(brownMesh, true)
    
    if (intersects.length > 0) {
      // 檢查是否有有效的交點（合理的高度範圍），調整以適應Y軸2.5倍擴展
      const validIntersects = intersects.filter(intersect => {
        const y = intersect.point.y
        return y >= -25 && y <= 125 // 棕色山體高度範圍（-10*2.5 到 50*2.5）
      })
      
      if (validIntersects.length > 0) {
        return true // 確認在棕色山體上
      }
    }
  }
  
  return false
}

// 檢測是否為山脈區域 - 移除山脈檢測限制，適應XZ軸10倍擴展，Y軸5倍擴展
export const isMountainArea = (_x: number, _z: number): boolean => {
  // 移除所有山脈區域檢測，允許在任何地形自由行走
  return false
}

// 檢查兩點之間是否可以安全通行 - 移除所有路徑限制，適應XZ軸10倍擴展，Y軸5倍擴展
export const isPathClear = (_fromX: number, _fromZ: number, _toX: number, _toZ: number): boolean => {
  // 移除所有路徑檢查限制，允許自由通行
  return true
}

// 驗證角色位置是否安全（開發調試用）
export const validateCharacterPositions = (positions: Array<[number, number, number]>) => {
  console.log('=== 角色位置安全性檢查 ===')
  positions.forEach((pos, index) => {
    const [x, z] = pos
    const isBrown = isOnBrownMountain(x, z)
    const isValid = isValidGroundPosition(x, z) 
    const height = getTerrainHeight(x, z)
    
    console.log(`角色${index + 1} 位置 [${x}, ${z}]:`)
    console.log(`  - 在棕色山體上: ${isBrown}`)
    console.log(`  - 有效地面位置: ${isValid}`)
    console.log(`  - 地形高度: ${height.toFixed(2)}`)
    console.log(`  - 狀態: ${!isBrown && isValid ? '✅ 安全' : '❌ 危險'}`)
  })
  console.log('=========================')
}

// 調試中央區域地形情況
export const debugCentralAreaTerrain = () => {
  console.log('=== 中央區域地形調試 ===')
  const centralPoints = [
    [0, 0], [5, 5], [10, 10], [8, 5], [3, 0],
    [-5, -5], [-10, -10], [5, -5], [-5, 5]
  ]
  
  centralPoints.forEach(([x, z]) => {
    const height = getTerrainHeight(x, z)
    const isBrown = isOnBrownMountain(x, z)
    const isValid = isValidGroundPosition(x, z)
    const slope = getTerrainSlope(x, z)
    
    console.log(`中央點 [${x}, ${z}]:`)
    console.log(`  - 高度: ${height.toFixed(2)}`)
    console.log(`  - 棕色山體: ${isBrown}`)
    console.log(`  - 有效位置: ${isValid}`)
    console.log(`  - 地形傾斜: ${slope.toFixed(3)} 弧度 (${(slope * 180 / Math.PI).toFixed(1)}°)`)
    
    if (slope > Math.PI / 6) {
      console.warn(`  ⚠️ 地形傾斜過陡: ${(slope * 180 / Math.PI).toFixed(1)}°`)
    }
    if (isBrown) {
      console.warn(`  ⚠️ 檢測到棕色山體材質`)
    }
  })
  console.log('=== 中央區域調試完成 ===')
}

// 預載模型
useGLTF.preload('/terrain_low_poly/scene.gltf')