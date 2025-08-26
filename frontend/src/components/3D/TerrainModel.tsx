import { useGLTF } from '@react-three/drei'
import { useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { collisionSystem } from '@/utils/collision'

// 全域地形參考，用於高度檢測
let terrainMesh: THREE.Mesh | null = null
let brownMountainMeshes: THREE.Mesh[] = [] // 專門儲存棕色山體mesh
let raycaster: THREE.Raycaster | null = null

// 地形高度檢測功能
export const getTerrainHeight = (x: number, z: number): number => {
  if (!terrainMesh || !raycaster) {
    return 0 // 如果地形還未載入，返回預設高度
  }

  // 從上方向下發射射線
  const origin = new THREE.Vector3(x, 100, z) // 從高處開始
  const direction = new THREE.Vector3(0, -1, 0) // 向下
  
  raycaster.set(origin, direction)
  
  // 檢測與地形的交點
  const intersects = raycaster.intersectObject(terrainMesh, true)
  
  if (intersects.length > 0) {
    // 過濾掉異常高的交點（可能是雲朵或其他空中物件）
    const validIntersects = intersects.filter(intersect => {
      const y = intersect.point.y
      return y >= -10 && y <= 25 // 合理的地形高度範圍
    })
    
    if (validIntersects.length > 0) {
      // 返回最低的有效交點（真正的地面）
      const lowestPoint = validIntersects.reduce((lowest, current) => 
        current.point.y < lowest.point.y ? current : lowest
      )
      return lowestPoint.point.y
    }
  }
  
  return 0 // 如果沒有有效交點，返回預設高度
}

// 獲取地形法向量（用於計算地形傾斜）
export const getTerrainNormal = (x: number, z: number): THREE.Vector3 => {
  if (!terrainMesh || !raycaster) {
    return new THREE.Vector3(0, 1, 0) // 預設向上
  }

  // 從上方向下發射射線
  const origin = new THREE.Vector3(x, 100, z)
  const direction = new THREE.Vector3(0, -1, 0)
  
  raycaster.set(origin, direction)
  
  const intersects = raycaster.intersectObject(terrainMesh, true)
  
  if (intersects.length > 0) {
    // 過濾掉異常高的交點並找到最低的有效交點
    const validIntersects = intersects.filter(intersect => {
      const y = intersect.point.y
      return y >= -10 && y <= 25 && intersect.face // 必須有face數據
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
  
  // 載入GLTF模型
  const { scene } = useGLTF('/terrain_low_poly/scene.gltf')
  
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
    
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const name = child.name.toLowerCase()
        
        // 檢查是否為樹木
        if (name.includes('arbol') || name.includes('tree') || 
            (child.material && Array.isArray(child.material) ? 
             child.material.some(mat => mat.name?.toLowerCase().includes('leaves') || mat.name?.toLowerCase().includes('leaf')) :
             child.material && 'name' in child.material && (child.material.name?.toLowerCase().includes('leaves') || child.material.name?.toLowerCase().includes('leaf')))) {
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
            
            // 識別棕色山體材質
            if (materialName.includes('brown') || 
                materialName.includes('montaña') || 
                materialName.includes('montana') ||
                materialName.includes('mountain')) {
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
          
          // 排除雲朵和其他空中物件
          if (name.includes('clouds') || 
              name.includes('cloud') || 
              name.includes('sky') ||
              name.includes('arbol') || // 樹木
              name.includes('tree') ||
              name.includes('icosphere')) { // 可能是雲朵的球體
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
  
  // 創建地形碰撞箱
  const terrainColliders = useMemo(() => {
    const colliders: Array<{position: THREE.Vector3, radius: number, id: string}> = []
    
    // 創建基於實際地形高度的智能碰撞檢測
    const terrainSize = 80
    const gridSize = 12 // 適中的密度平衡性能和精確度
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
          
          // 山脈禁越規則：創建更強的山脈碰撞邊界
          if (maxHeightDiff > 2 || centerHeight > 8 || isMountainArea(x, z)) {
            colliders.push({
              position: new THREE.Vector3(x, centerHeight, z),
              radius: step * 0.6, // 增大碰撞半徑，創建更強的屏障
              id: `mountain_barrier_${x}_${z}`
            })
          }
          
          // 地圖邊界碰撞
          const isEdge = Math.abs(x) > terrainSize/2 - step || Math.abs(z) > terrainSize/2 - step
          if (isEdge) {
            colliders.push({
              position: new THREE.Vector3(x, centerHeight, z),
              radius: step * 0.4,
              id: `boundary_${x}_${z}`
            })
          }
        }
      }
    }, 1000) // 等待1秒讓地形完全載入
    
    // 使用真實的樹木網格位置來添加碰撞檢測
    treeMeshes.current.forEach((treeMesh, index) => {
      const position = new THREE.Vector3()
      treeMesh.getWorldPosition(position)
      
      // 計算樹木的邊界盒來確定合適的碰撞半徑
      const box = new THREE.Box3().setFromObject(treeMesh)
      const size = box.getSize(new THREE.Vector3())
      const radius = Math.max(size.x, size.z) * 0.6 // 使用XZ平面較大的尺寸作為半徑，稍微放寬
      
      colliders.push({
        position: new THREE.Vector3(position.x, 0, position.z), // Y設為0用於2D碰撞檢測
        radius: Math.max(radius, 1.5), // 至少1.5單位半徑
        id: `real_tree_${index}`
      })
      
      console.log(`真實樹木碰撞器 ${index}: 位置(${position.x.toFixed(1)}, ${position.z.toFixed(1)}), 半徑: ${Math.max(radius, 1.5).toFixed(1)}`)
    })
    
    // 如果沒有找到真實樹木，使用備用預設位置
    if (treeMeshes.current.length === 0) {
      console.warn('未找到真實樹木網格，使用預設樹木位置')
      const fallbackTreePositions = [
        { x: 15, z: 12, radius: 2.0 },
        { x: -18, z: 25, radius: 2.0 },
        { x: 28, z: -15, radius: 2.0 },
        { x: -25, z: -18, radius: 2.0 },
        { x: 35, z: 20, radius: 2.0 },
        { x: -30, z: 35, radius: 2.0 },
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
        
        // 計算樹木的邊界盒來確定合適的碰撞半徑（縮小以便通過）
        const box = new THREE.Box3().setFromObject(treeMesh)
        const size = box.getSize(new THREE.Vector3())
        const radius = Math.max(size.x, size.z) * 0.4 // 使用XZ平面較大尺寸的0.4倍，更容易通過
        const finalRadius = Math.max(radius, 1.2) // 最小1.2單位半徑，允許角色更容易通過
        
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
  
  return (
    <group ref={groupRef} position={position} scale={scale}>
      <primitive object={scene} />
      
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

// 檢查路徑上是否有山脈障礙（增強版山脈禁越規則）
export const hasTerrainObstacle = (fromX: number, fromZ: number, toX: number, toZ: number): boolean => {
  const steps = 20 // 增加檢查點數到20個，更精確
  const fromHeight = getTerrainHeight(fromX, fromZ)
  const toHeight = getTerrainHeight(toX, toZ)
  
  // 嚴格規則：絕對高度檢查
  const MOUNTAIN_HEIGHT_THRESHOLD = 8 // 高於8單位視為山脈
  const OBSTACLE_HEIGHT_DIFF = 2 // 高度差2單位以上視為障礙
  
  for (let i = 1; i < steps; i++) {
    const t = i / steps
    const checkX = fromX + (toX - fromX) * t
    const checkZ = fromZ + (toZ - fromZ) * t
    const checkHeight = getTerrainHeight(checkX, checkZ)
    
    // 規則1：絕對禁止穿越高山區域
    if (checkHeight > MOUNTAIN_HEIGHT_THRESHOLD) {
      return true
    }
    
    // 規則2：相對高度差檢查 - 比起點終點高太多
    const maxStartEndHeight = Math.max(fromHeight, toHeight)
    if (checkHeight > maxStartEndHeight + OBSTACLE_HEIGHT_DIFF) {
      return true
    }
    
    // 規則3：檢查前後點的高度變化，避免穿越陡峭山壁
    if (i > 1 && i < steps - 1) {
      const prevT = (i - 1) / steps
      const nextT = (i + 1) / steps
      const prevX = fromX + (toX - fromX) * prevT
      const prevZ = fromZ + (toZ - fromZ) * prevT
      const nextX = fromX + (toX - fromX) * nextT
      const nextZ = fromZ + (toZ - fromZ) * nextT
      
      const prevHeight = getTerrainHeight(prevX, prevZ)
      const nextHeight = getTerrainHeight(nextX, nextZ)
      
      // 如果高度急劇變化，可能是山壁或懸崖
      const heightChange = Math.abs(checkHeight - prevHeight) + Math.abs(nextHeight - checkHeight)
      if (heightChange > 4) { // 總高度變化超過4單位視為不可通行
        return true
      }
    }
  }
  
  return false
}

// 檢查某個位置是否在真正的地面上（不是雲朵）並且可達（山脈禁越規則）
export const isValidGroundPosition = (x: number, z: number): boolean => {
  // 絕對禁止規則：禁止在棕色山體材質上
  if (isOnBrownMountain(x, z)) {
    return false
  }
  
  const height = getTerrainHeight(x, z)
  
  // 嚴格山脈禁越規則：降低可接受高度上限
  const MOUNTAIN_EXCLUSION_HEIGHT = 8 // 高於8單位絕對禁止
  const SAFE_HEIGHT_MAX = 6 // 安全高度上限降至6單位
  
  // 基本高度檢查 - 更嚴格的山脈禁入
  if (height < -2 || height > SAFE_HEIGHT_MAX) {
    return false
  }
  
  // 絕對禁止進入高山區域
  if (height > MOUNTAIN_EXCLUSION_HEIGHT) {
    return false
  }
  
  // 檢查周圍高度的一致性，雲朵通常會有突然的高度變化
  const checkRadius = 2
  const samplePoints = [
    { x: x + checkRadius, z: z },
    { x: x - checkRadius, z: z },
    { x: x, z: z + checkRadius },
    { x: x, z: z - checkRadius },
    { x: x + checkRadius, z: z + checkRadius },
    { x: x - checkRadius, z: z - checkRadius }
  ]
  
  let validSamples = 0
  let totalHeightDiff = 0
  let maxHeightDiff = 0
  
  for (const point of samplePoints) {
    const sampleHeight = getTerrainHeight(point.x, point.z)
    const heightDiff = Math.abs(height - sampleHeight)
    
    if (heightDiff < 4) { // 4單位以內的高度差視為正常地形
      validSamples++
    }
    totalHeightDiff += heightDiff
    maxHeightDiff = Math.max(maxHeightDiff, heightDiff)
  }
  
  // 如果高度差異太大，可能是山脈或懸崖邊緣
  if (maxHeightDiff > 8) {
    return false
  }
  
  // 如果大部分周圍點的高度都相似，則認為是有效地面
  const avgHeightDiff = totalHeightDiff / samplePoints.length
  return validSamples >= 4 && avgHeightDiff < 2.5
}

// 檢測位置是否在棕色山體材質上
export const isOnBrownMountain = (x: number, z: number): boolean => {
  if (!raycaster || brownMountainMeshes.length === 0) {
    return false
  }

  // 從上方向下發射射線檢測棕色山體
  const origin = new THREE.Vector3(x, 100, z)
  const direction = new THREE.Vector3(0, -1, 0)
  raycaster.set(origin, direction)

  // 檢測與棕色山體的交點
  for (const brownMesh of brownMountainMeshes) {
    const intersects = raycaster.intersectObject(brownMesh, true)
    
    if (intersects.length > 0) {
      // 檢查是否有有效的交點（合理的高度範圍）
      const validIntersects = intersects.filter(intersect => {
        const y = intersect.point.y
        return y >= -10 && y <= 50 // 棕色山體可能比較高
      })
      
      if (validIntersects.length > 0) {
        return true // 確認在棕色山體上
      }
    }
  }
  
  return false
}

// 檢測是否為山脈區域（新增嚴格山脈檢測）
export const isMountainArea = (x: number, z: number): boolean => {
  // 優先檢查：如果位置在棕色山體材質上，直接視為山脈區域
  if (isOnBrownMountain(x, z)) {
    return true
  }
  
  const height = getTerrainHeight(x, z)
  const MOUNTAIN_THRESHOLD = 8
  
  // 直接高度判斷
  if (height > MOUNTAIN_THRESHOLD) {
    return true
  }
  
  // 檢查周圍區域是否為高山地形
  const checkRadius = 3
  const mountainCheckPoints = [
    { x: x + checkRadius, z: z },
    { x: x - checkRadius, z: z },
    { x: x, z: z + checkRadius },
    { x: x, z: z - checkRadius },
    { x: x + checkRadius, z: z + checkRadius },
    { x: x - checkRadius, z: z - checkRadius },
    { x: x + checkRadius, z: z - checkRadius },
    { x: x - checkRadius, z: z + checkRadius }
  ]
  
  let mountainPointCount = 0
  for (const point of mountainCheckPoints) {
    // 檢查是否在棕色山體上
    if (isOnBrownMountain(point.x, point.z)) {
      mountainPointCount++
      continue
    }
    
    // 檢查高度
    const checkHeight = getTerrainHeight(point.x, point.z)
    if (checkHeight > MOUNTAIN_THRESHOLD) {
      mountainPointCount++
    }
  }
  
  // 如果周圍50%以上的點都是山脈高度，則認為此區域為山脈
  return mountainPointCount >= mountainCheckPoints.length * 0.5
}

// 檢查兩點之間是否可以安全通行（不會穿越山脈）- 增強版山脈禁越
export const isPathClear = (fromX: number, fromZ: number, toX: number, toZ: number): boolean => {
  // 規則1：檢查起點和終點是否都是有效地面
  if (!isValidGroundPosition(fromX, fromZ) || !isValidGroundPosition(toX, toZ)) {
    return false
  }
  
  // 規則2：絕對禁止起點或終點在山脈區域
  if (isMountainArea(fromX, fromZ) || isMountainArea(toX, toZ)) {
    return false
  }
  
  // 規則3：檢查路徑上是否有山脈障礙
  if (hasTerrainObstacle(fromX, fromZ, toX, toZ)) {
    return false
  }
  
  // 規則4：額外檢查路徑中點是否經過山脈區域
  const steps = 15
  for (let i = 1; i < steps; i++) {
    const t = i / steps
    const checkX = fromX + (toX - fromX) * t
    const checkZ = fromZ + (toZ - fromZ) * t
    
    if (isMountainArea(checkX, checkZ)) {
      return false
    }
  }
  
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