import { useGLTF } from '@react-three/drei'
import { useRef, useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { collisionSystem } from '@/utils/collision'
import { TreeGlow } from './TreeGlow'

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


interface TerrainModelProps {
  position?: [number, number, number]
  scale?: number
}

export const TerrainModel = ({ position = [0, 0, 0], scale = 1 }: TerrainModelProps) => {
  const groupRef = useRef<THREE.Group>(null)
  const [terrainScene, setTerrainScene] = useState<THREE.Group | null>(null)
  
  // 載入GLTF模型
  const { scene } = useGLTF('/terrain_low_poly/scene.gltf')
  
  // 精確移除白雲物件，完全保留樹木
  useEffect(() => {
    console.log('🔍 開始精確移除白雲物件...')
    const cloudsToRemove: THREE.Object3D[] = []
    
    scene.traverse((child) => {
      const name = child.name.toLowerCase()
      const position = new THREE.Vector3()
      child.getWorldPosition(position)
      
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
    
    console.log('🏞️ 初始化地形和物件檢測...')
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
          
          // 如果是樹幹，向下延伸縮放
          if (isTrunk) {
            // 保存原始縮放
            const originalScale = child.scale.clone()
            
            // Y軸向下延伸1.5倍，保持X和Z軸不變
            child.scale.set(originalScale.x, originalScale.y * 1.5, originalScale.z)
            
            // 向下移動位置以保持樹幹頂部位置不變
            const originalPosition = child.position.clone()
            child.position.set(
              originalPosition.x, 
              originalPosition.y - (originalScale.y * 0.25), // 向下移動25%的原始高度
              originalPosition.z
            )
            
            console.log(`樹幹mesh延伸: "${child.name}", 原始縮放:`, originalScale.toArray(), '新縮放:', child.scale.toArray())
            console.log(`位置調整: 原始:`, originalPosition.toArray(), '新位置:', child.position.toArray())
          }
          
          treeMeshes.current.push(child)
          const position = new THREE.Vector3()
          child.getWorldPosition(position)
          console.log('找到樹木mesh:', child.name, '位置:', position.toArray())
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
              console.log('找到棕色山體mesh:', child.name, '材質:', material.name)
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
          console.log('找到地形mesh:', child.name)
          return
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
          const position = new THREE.Vector3()
          child.getWorldPosition(position)
          if (position.y > 10) { // 高於10單位的可能是雲朵
            return
          }
          
          terrainMesh = child
          console.log('使用mesh作為地形:', child.name, '位置Y:', position.y)
        }
      })
    }
    
    return () => {
      // 清理時重置
      terrainMesh = null
      brownMountainMeshes = []
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
          
          const maxHeightDiff = Math.max(...validHeights.map(h => Math.abs(h - centerHeight)))
          
          // 移除所有地形和邊界碰撞檢測
        }
      }
    }, 1000) // 等待1秒讓地形完全載入
    
    // 使用真實的樹木網格位置來添加碰撞檢測
    treeMeshes.current.forEach((treeMesh, index) => {
      const position = new THREE.Vector3()
      treeMesh.getWorldPosition(position)
      
      // 計算樹木的邊界盒來確定合適的碰撞半徑，極度減小讓移動如平地般順暢
      const box = new THREE.Box3().setFromObject(treeMesh)
      const size = box.getSize(new THREE.Vector3())
      const radius = 0 // 移除樹木碰撞半徑
      
      colliders.push({
        position: new THREE.Vector3(position.x, 0, position.z), // Y設為0用於2D碰撞檢測
        radius: 0, // 移除碰撞半徑
        id: `real_tree_${index}`
      })
      
      console.log(`真實樹木碰撞器 ${index}: 位置(${position.x.toFixed(1)}, ${position.z.toFixed(1)}), 半徑: ${Math.max(radius, 0.8).toFixed(1)}`)
    })
    
    // 如果沒有找到真實樹木，使用備用預設位置，也減小半徑
    if (treeMeshes.current.length === 0) {
      console.warn('未找到真實樹木網格，使用預設樹木位置')
      const fallbackTreePositions = [
        { x: 15, z: 12, radius: 0 }, // 移除碰撞半徑
        { x: -18, z: 25, radius: 0 },
        { x: 28, z: -15, radius: 0 },
        { x: -25, z: -18, radius: 0 },
        { x: 35, z: 20, radius: 0 },
        { x: -30, z: 35, radius: 0 },
      ]
      
      fallbackTreePositions.forEach((tree, index) => {
        colliders.push({
          position: new THREE.Vector3(tree.x, 0, tree.z),
          radius: tree.radius,
          id: `fallback_tree_${index}`
        })
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
        const position = new THREE.Vector3()
        treeMesh.getWorldPosition(position)
        
        // 計算樹木的邊界盒來確定合適的碰撞半徑（極度縮小如平地般通過）
        const box = new THREE.Box3().setFromObject(treeMesh)
        const size = box.getSize(new THREE.Vector3())
        const radius = 0 // 移除碰撞半徑
        const finalRadius = 0 // 移除所有碰撞半徑限制
        
        console.log(`註冊真實樹木碰撞器 ${index}: 位置(${position.x.toFixed(1)}, ${position.z.toFixed(1)}), 計算半徑: ${radius.toFixed(1)}, 最終半徑: ${finalRadius}`)
        
        collisionSystem.addCollisionObject({
          position: new THREE.Vector3(position.x, 0, position.z), // Y設為0用於2D碰撞檢測
          radius: finalRadius,
          type: 'tree',
          id: `real_tree_${index}`
        })
      })
      
      console.log(`已註冊 ${treeMeshes.current.length} 個真實樹木碰撞器`)
    }, 1500) // 等待1.5秒讓樹木網格完全載入
    
    return () => clearTimeout(timer)
  }, [scene]) // 依賴scene載入

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
      const objType = collider.id.startsWith('mountain_barrier_') ? 'mountain' : 'rock'
      collisionSystem.addCollisionObject({
        position: collider.position,
        radius: collider.radius,
        type: objType,
        id: collider.id
      })
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

  return (
    <group ref={groupRef} position={position}>
      {/* 讓XZ軸10倍擴展，Y軸5倍擴展以保持比例協調 */}
      <group scale={[10, 5, 10]}>
        <primitive object={cleanedScene} />
      </group>
      
      {/* 樹幹發光效果 */}
      <TreeGlow terrainScene={terrainScene} />
      
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
export const hasTerrainObstacle = (fromX: number, fromZ: number, toX: number, toZ: number): boolean => {
  // 移除所有地形障礙檢測，允許自由通行
  return false
}

// 檢查某個位置是否在真正的地面上 - 移除崎嶇路面限制，允許自由行走
export const isValidGroundPosition = (x: number, z: number): boolean => {
  // 移除所有崎嶇路面限制，允許在任何地形上自由行走
  return true
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
export const isMountainArea = (x: number, z: number): boolean => {
  // 移除所有山脈區域檢測，允許在任何地形自由行走
  return false
}

// 檢查兩點之間是否可以安全通行 - 移除所有路徑限制，適應XZ軸10倍擴展，Y軸5倍擴展
export const isPathClear = (fromX: number, fromZ: number, toX: number, toZ: number): boolean => {
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