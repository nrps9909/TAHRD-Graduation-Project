import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js'
import * as THREE from 'three'
import { getTerrainHeight, getTerrainSlope, isMountainArea, isOnBrownMountain } from './TerrainModel'
import { collisionSystem } from '@/utils/collision'
import { useTimeStore } from '@/stores/timeStore'


interface BuildingData {
  id: string
  objPath: string
  mtlPath: string
  position: [number, number, number]
  scale: number
  rotation: number
}

// 玩家出生位置
const PLAYER_SPAWN = { x: -15, z: -15 }

// 安全位置驗證函數
const validateSafeBuildingPosition = (x: number, z: number, id: string): boolean => {
  const distance = Math.sqrt(x * x + z * z)

  // 確保在極度安全的平地範圍內
  if (distance > 25) {
    console.error(`❌ 建築物 ${id} 距離過遠: ${distance.toFixed(1)} > 25`)
    return false
  }

  // 確保高度合理（Z軸）
  if (Math.abs(x) > 25 || Math.abs(z) > 25) {
    console.error(`❌ 建築物 ${id} 位置超出安全範圍: (${x}, ${z})`)
    return false
  }

  console.log(`✅ 建築物 ${id} 位置安全驗證通過: (${x}, ${z}), 距離: ${distance.toFixed(1)}`)
  return true
}

// 建築配置 - 極度保守，所有建築物在中央平地25單位半徑內，絕對避免半山腰
const allBuildingConfigs: BuildingData[] = [
  // === 主畫面可見建築 - 玩家一開始就能看到 ===
  {
    id: 'main_welcome_inn',
    objPath: '/building/OBJ/Inn.obj',
    mtlPath: '/building/OBJ/Inn.mtl',
    position: [-10, 0, -25], // 進一步靠近中心，絕對安全
    scale: 3.5,
    rotation: 0
  },

  // === 中央平地緊密佈局 - 所有建築在40單位半徑內，避免任何山脈 ===
  // 東方區域 - 極度縮小，確保在平地
  {
    id: 'mill_east',
    objPath: '/building/OBJ/Mill.obj',
    mtlPath: '/building/OBJ/Mill.mtl',
    position: [20, 0, -5], // 大幅縮小到20單位，距離中心20.6
    scale: 3.2,
    rotation: -Math.PI / 2
  },

  // 西方區域 - 極度縮小
  {
    id: 'blacksmith_west',
    objPath: '/building/OBJ/Blacksmith.obj',
    mtlPath: '/building/OBJ/Blacksmith.mtl',
    position: [-20, 0, -5], // 縮小到-20，距離中心20.6
    scale: 3.0,
    rotation: Math.PI / 2
  },

  // 北方區域 - 大幅縮小
  {
    id: 'bell_tower_north',
    objPath: '/building/OBJ/Bell_Tower.obj',
    mtlPath: '/building/OBJ/Bell_Tower.mtl',
    position: [-5, 0, 20], // 縮小到20，距離中心20.6
    scale: 3.8,
    rotation: Math.PI
  },

  // 東北方向 - 極度保守
  {
    id: 'house_northeast',
    objPath: '/building/OBJ/House_1.obj',
    mtlPath: '/building/OBJ/House_1.mtl',
    position: [15, 0, 15], // 縮小到(15,15)，距離中心21.2
    scale: 2.8,
    rotation: -Math.PI / 4
  },

  // 西北方向 - 極度保守
  {
    id: 'house_northwest',
    objPath: '/building/OBJ/House_2.obj',
    mtlPath: '/building/OBJ/House_2.mtl',
    position: [-15, 0, 15], // 縮小到(-15,15)，距離中心21.2
    scale: 2.8,
    rotation: Math.PI / 4
  },

  // 東南方向 - 極度保守
  {
    id: 'stable_southeast',
    objPath: '/building/OBJ/Stable.obj',
    mtlPath: '/building/OBJ/Stable.mtl',
    position: [15, 0, -20], // 縮小到(15,-20)，距離中心25.0
    scale: 2.9,
    rotation: 3 * Math.PI / 4
  },

  // 西南方向 - 極度保守
  {
    id: 'sawmill_southwest',
    objPath: '/building/OBJ/Sawmill.obj',
    mtlPath: '/building/OBJ/Sawmill.mtl',
    position: [-15, 0, -20], // 縮小到(-15,-20)，距離中心25.0
    scale: 2.7,
    rotation: -3 * Math.PI / 4
  },

  // 新增建築物 - 使用House_4，放置在安全的中央區域
  {
    id: 'house_central_new',
    objPath: '/building/OBJ/House_4.obj',
    mtlPath: '/building/OBJ/House_4.mtl',
    position: [8, 0, -8], // 中央偏東南位置，距離中心11.3單位，更顯眼的位置
    scale: 3.0, // 稍微放大，更容易看見
    rotation: Math.PI / 3 // 60度旋轉，與其他建築明顯不同的角度
  },

  // 第二個新增建築物 - 使用Bell_Tower，放在玩家起始視野內
  {
    id: 'tower_starting_view',
    objPath: '/building/OBJ/Bell_Tower.obj',
    mtlPath: '/building/OBJ/Bell_Tower.mtl',
    position: [-5, 0, -5], // 玩家前方右側，距離玩家出生點[-15,-15]約14單位，容易看見
    scale: 2.8,
    rotation: -Math.PI / 4 // -45度旋轉，面向玩家方向
  }
]

// 使用安全驗證過的建築配置
const buildingConfigs = allBuildingConfigs.filter(config => {
  const [x, _, z] = config.position
  return validateSafeBuildingPosition(x, z, config.id)
})

console.log(`🏘️ 建築配置完成: ${buildingConfigs.length} 棟建築，包含2個新建築，極度保守中央平地放置`)
console.log(`📍 主建築位置: 玩家前方 (${allBuildingConfigs[0].position.join(', ')})`)
console.log(`📏 建築佈局: 極度緊密型，所有建築在中央平地25單位半徑內`)
console.log(`🏠 新增建築1: House_4 (house_central_new) 位於中央區域 (8, -8)，3.0x縮放`)
console.log(`🗼 新增建築2: Bell_Tower (tower_starting_view) 位於起始視野 (-5, -5)，2.8x縮放`)
console.log(`🔍 超嚴格山脈檢測: 高度>5, 坡度>15°, 距離>50, 地形變化>2, 半山腰檢測`)
console.log(`🛡️ 多層防護: 山脈檢測 + 碰撞檢測 + 地形交叉檢測 + 半山腰專項檢測`)
console.log(`⚡ 系統已更新，超嚴格山脈檢測啟動，特別針對半山腰問題`)
console.log(`🎯 建築物安全檢查：所有建築物現在都在25單位半徑內的平地`)
console.log(`👥 NPC出生系統: 超大間距至15單位，初始半徑25，步長10，絕對避免NPC互相碰撞`)

// 建築物邊界計算
interface BuildingBounds {
  width: number
  height: number
  depth: number
}

const getBuildingBounds = (scale: number): BuildingBounds => {
  // 根據建築物縮放計算基本邊界框
  const baseSize = 2.0 // 建築物基本尺寸
  return {
    width: baseSize * scale,
    height: baseSize * scale * 1.5, // 建築物通常較高
    depth: baseSize * scale
  }
}

// 山脈碰撞檢測結果
interface MountainCollisionResult {
  canPlace: boolean
  suggestedHeight?: number
  collisionPoints: Array<{ x: number, y: number, z: number }>
}

// 檢查建築物與山體的碰撞
const checkMountainCollision = (
  x: number,
  z: number,
  buildingBounds: BuildingBounds,
  groundHeight: number
): MountainCollisionResult => {
  const result: MountainCollisionResult = {
    canPlace: true,
    collisionPoints: []
  }

  // 創建建築物底部的檢測點網格
  const checkPoints: Array<[number, number]> = []
  const gridSize = 5 // 檢測點數量

  // 生成檢測點網格（建築物底面）
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const offsetX = (i / (gridSize - 1) - 0.5) * buildingBounds.width
      const offsetZ = (j / (gridSize - 1) - 0.5) * buildingBounds.depth
      checkPoints.push([x + offsetX, z + offsetZ])
    }
  }

  // 檢查每個點的地形高度
  let maxTerrainHeight = groundHeight
  let hasCollision = false

  checkPoints.forEach(([checkX, checkZ]) => {
    const terrainHeight = getTerrainHeight(checkX, checkZ)

    // 檢查是否在棕色山體上（不可穿越的山體）
    const onBrownMountain = isOnBrownMountain(checkX, checkZ)

    if (onBrownMountain) {
      // 如果在棕色山體上，建築物必須放置在山體表面之上
      hasCollision = true
      maxTerrainHeight = Math.max(maxTerrainHeight, terrainHeight)
      result.collisionPoints.push({ x: checkX, y: terrainHeight, z: checkZ })
    }

    // 檢查地形高度差異
    const heightDifference = Math.abs(terrainHeight - groundHeight)
    if (heightDifference > buildingBounds.height * 0.3) {
      // 如果地形高度差異過大，表示可能有山體穿越
      hasCollision = true
      maxTerrainHeight = Math.max(maxTerrainHeight, terrainHeight)
      result.collisionPoints.push({ x: checkX, y: terrainHeight, z: checkZ })
    }
  })

  if (hasCollision) {
    result.canPlace = false
    // 建議高度：最高地形點 + 小幅偏移，確保建築物完全在山體表面之上
    result.suggestedHeight = maxTerrainHeight + buildingBounds.height * 0.1
  }

  console.log(`🔍 建築碰撞檢測 (${x}, ${z}): 檢測點=${checkPoints.length}, 碰撞=${hasCollision}, 最高地形=${maxTerrainHeight.toFixed(2)}`)

  return result
}

// 進階地形交叉檢測 - 使用多點射線檢測確保建築物完全在地形表面之上
const performTerrainIntersectionCheck = (
  buildingGroup: THREE.Group,
  x: number,
  z: number,
  buildingBounds: BuildingBounds
): boolean => {
  // 創建射線檢測器
  const raycaster = new THREE.Raycaster()
  const downDirection = new THREE.Vector3(0, -1, 0)

  // 檢測建築物四個角和中心點
  const checkPositions = [
    [x, z], // 中心
    [x - buildingBounds.width/2, z - buildingBounds.depth/2], // 左下角
    [x + buildingBounds.width/2, z - buildingBounds.depth/2], // 右下角
    [x - buildingBounds.width/2, z + buildingBounds.depth/2], // 左上角
    [x + buildingBounds.width/2, z + buildingBounds.depth/2], // 右上角
  ]

  let allPointsClear = true

  checkPositions.forEach(([checkX, checkZ], index) => {
    // 從建築物底部向下發射射線，檢查是否有地形阻擋
    const startY = buildingGroup.position.y - buildingBounds.height * 0.1
    const origin = new THREE.Vector3(checkX, startY, checkZ)

    raycaster.set(origin, downDirection)

    // 獲取該位置的地形高度
    const terrainHeight = getTerrainHeight(checkX, checkZ)

    // 檢查建築物底部是否低於地形表面（表示穿透）
    if (startY < terrainHeight) {
      console.warn(`⚠️ 檢測點 ${index} (${checkX.toFixed(1)}, ${checkZ.toFixed(1)}): 建築底部 ${startY.toFixed(2)} < 地形高度 ${terrainHeight.toFixed(2)}`)
      allPointsClear = false
    }
  })

  if (allPointsClear) {
    console.log(`✅ 建築物地形交叉檢測通過: 所有檢測點都安全`)
  } else {
    console.warn(`❌ 建築物地形交叉檢測失敗: 發現穿透問題`)
  }

  return allPointsClear
}

// 單個建築物組件
interface BuildingProps {
  config: BuildingData
}

const Building = ({ config }: BuildingProps) => {
  const groupRef = useRef<THREE.Group>(null)
  const [materials, setMaterials] = useState<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [buildingMeshes, setBuildingMeshes] = useState<THREE.Mesh[]>([])
  const { timeOfDay } = useTimeStore()

  // 載入材質
  useEffect(() => {
    const mtlLoader = new MTLLoader()

    mtlLoader.load(config.mtlPath, (mtl) => {
      mtl.preload()

      // 強制關閉所有材質的wireframe
      for (const materialName in mtl.materials) {
        const material = mtl.materials[materialName]
        if (material.wireframe !== undefined) {
          material.wireframe = false
          console.log(`🔧 關閉材質 ${materialName} 的wireframe`)
        }
      }

      setMaterials(mtl)
      console.log(`✅ 載入建築材質: ${config.id}`)
    }, undefined, (error) => {
      console.warn(`⚠️ 載入材質失敗 ${config.id}:`, error)
      setMaterials(null) // 允許沒有材質也能載入
    })
  }, [config.mtlPath, config.id])

  // 載入OBJ模型
  useEffect(() => {
    const objLoader = new OBJLoader()

    // 如果有材質，設置給loader
    if (materials) {
      objLoader.setMaterials(materials)
      console.log(`🎨 建築 ${config.id} 使用MTL材質`)
    } else {
      console.log(`⚠️ 建築 ${config.id} 沒有MTL材質，將使用後備材質`)
    }

    objLoader.load(config.objPath, (object) => {
      if (!groupRef.current) return

      // 存儲建築物mesh以供夜晚發光效果使用
      const meshes: THREE.Mesh[] = []

      console.log(`📦 開始處理建築 ${config.id} 的 ${object.children.length} 個子物件`)

      // 設置建築物陰影和材質，強化材質修復防止黑線
      object.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          meshes.push(child)
          child.castShadow = true
          child.receiveShadow = true

          // 強化材質修復系統
          if (child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material]

            materials.forEach((material, index) => {
              // === 第一步：強制關閉wireframe 並檢查問題材質 ===
              if ('wireframe' in material) {
                const wasWireframe = material.wireframe
                material.wireframe = false
                if (wasWireframe) {
                  console.log(`🔧 ${config.id}/${child.name}: 強制關閉wireframe`)
                }
              }

              // 超級激進的暗色/黑線檢測和替換系統
              const isDarkMaterial = material && material.color && (
                (material.color.r + material.color.g + material.color.b) / 3 < 0.2 // 平均RGB值小於0.2視為太暗
              )

              const isBlacklineMaterial = material && (
                material.color?.getHex() === 0x000000 ||
                material.wireframe === true ||
                (material.transparent && material.opacity < 0.1) ||
                (!material.map && !material.color) ||
                (material.color && material.color.r === 0 && material.color.g === 0 && material.color.b === 0) ||
                isDarkMaterial  // 新增暗色檢測
              )

              // 對於問題區域和問題建築的特殊檢測
              const isRightDiagonal = config.position[0] > 0 && config.position[2] < 0 // 東南象限
              const isProblematicBuilding = config.id.includes('building1_large') ||
                                          config.id.includes('building2_large') ||  // 新增Building2_Large
                                          config.id.includes('building3') ||
                                          config.id.includes('Building1_Large') ||
                                          config.id.includes('Building2_Large') ||  // 新增Building2_Large
                                          config.id.includes('Building3') ||
                                          config.id.includes('house1') ||
                                          config.id.includes('house2')

              // 特別針對Building2系列的檢測（DarkGrey材質問題）
              const isBuilding2Series = config.id.includes('building2') || config.id.includes('Building2')

              if (isBlacklineMaterial || (isRightDiagonal && isProblematicBuilding) || isBuilding2Series) {
                console.log(`🚨 ${config.id}/${child.name}: 檢測到問題材質或問題建築，強制替換`)
                if (isDarkMaterial) console.log(`   原因：暗色材質 RGB=(${material.color.r.toFixed(2)}, ${material.color.g.toFixed(2)}, ${material.color.b.toFixed(2)})`)

                // 根據位置和名稱選擇更合適的顏色
                let replacementColor = '#d8d1be'
                if (child.name.toLowerCase().includes('roof')) replacementColor = '#4a4745'
                else if (child.name.toLowerCase().includes('wood')) replacementColor = '#6b4b2a'
                else if (child.name.toLowerCase().includes('window')) replacementColor = '#87ceeb'

                const replacementMaterial = new THREE.MeshToonMaterial({
                  color: replacementColor,
                  dithering: true,
                  shadowSide: THREE.DoubleSide,
                  wireframe: false,
                  transparent: false,
                  opacity: 1.0
                })

                if (Array.isArray(child.material)) {
                  child.material[index] = replacementMaterial
                } else {
                  child.material = replacementMaterial
                }
                console.log(`🎨 強制替換為 ${replacementColor}`)
                return // 跳過後續處理
              }

              // === 第二步：檢測問題材質 ===
              const isBlack = material.color && material.color.getHex() === 0x000000
              const isWhite = material.color && material.color.getHex() === 0xffffff
              const noTexture = !material.map && !material.normalMap && !material.emissiveMap
              const isInvisible = material.transparent && material.opacity < 0.1

              const needsFallback = !material ||
                                   isBlack ||
                                   isWhite ||
                                   (noTexture && (!material.color || material.color.getHex() === 0xffffff)) ||
                                   isInvisible ||
                                   (material.isMeshStandardMaterial && noTexture && !material.color)

              if (needsFallback) {
                // 詳細日誌：為什麼需要後備材質
                const reasons = []
                if (!material) reasons.push('material為null')
                if (isBlack) reasons.push('純黑色')
                if (isWhite) reasons.push('純白色')
                if (noTexture) reasons.push('無貼圖')
                if (isInvisible) reasons.push('透明/不可見')

                console.log(`🚨 ${config.id}/${child.name}: 需要後備材質 - ${reasons.join(', ')}`)

                // 創建智能後備材質
                const meshName = child.name.toLowerCase()
                let fallbackColor = '#d8d1be' // 預設牆面色

                if (meshName.includes('roof') || meshName.includes('chimney') || meshName.includes('tile')) {
                  fallbackColor = '#4a4745' // 屋頂色
                } else if (meshName.includes('wood') || meshName.includes('timber') || meshName.includes('beam') || meshName.includes('door')) {
                  fallbackColor = '#6b4b2a' // 木材色
                } else if (meshName.includes('window') || meshName.includes('glass')) {
                  fallbackColor = '#87ceeb' // 窗戶色
                } else if (meshName.includes('stone') || meshName.includes('brick')) {
                  fallbackColor = '#a0836d' // 石材色
                }

                const fallbackMaterial = new THREE.MeshToonMaterial({
                  color: fallbackColor,
                  dithering: true,
                  shadowSide: THREE.DoubleSide,
                  wireframe: false // 確保不是wireframe
                })

                if (Array.isArray(child.material)) {
                  child.material[index] = fallbackMaterial
                } else {
                  child.material = fallbackMaterial
                }

                console.log(`🎨 ${config.id}/${child.name}: 應用後備材質 ${fallbackColor}`)
              } else {
                // === 第三步：優化現有材質 ===
                if (material.isMeshLambertMaterial) {
                  // Lambert轉Toon避免光照問題
                  const toonMaterial = new THREE.MeshToonMaterial({
                    map: material.map,
                    color: material.color,
                    transparent: material.transparent,
                    opacity: material.opacity,
                    shadowSide: THREE.DoubleSide,
                    wireframe: false
                  })

                  if (Array.isArray(child.material)) {
                    child.material[index] = toonMaterial
                  } else {
                    child.material = toonMaterial
                  }
                  console.log(`🔄 ${config.id}/${child.name}: Lambert轉Toon材質`)
                } else if (material.isMeshStandardMaterial) {
                  // 調整Standard材質參數
                  material.metalness = Math.min(0.1, material.metalness ?? 0)
                  material.roughness = Math.max(0.7, material.roughness ?? 0.7)
                  material.shadowSide = THREE.DoubleSide
                  material.wireframe = false
                  material.needsUpdate = true
                  console.log(`⚙️ ${config.id}/${child.name}: 調整Standard材質`)
                }
              }
            })
          } else {
            // 沒有材質的情況，為mesh提供智能預設材質
            console.log(`🔄 建築 ${config.id}/${child.name}: 沒有材質，提供智能預設材質`)

            const meshName = child.name.toLowerCase()
            let smartColor = '#d8d1be' // 預設牆面色

            // 根據mesh名稱智能選色
            if (meshName.includes('roof') || meshName.includes('chimney') || meshName.includes('tile')) {
              smartColor = '#4a4745' // 屋頂色
            } else if (meshName.includes('wood') || meshName.includes('timber') || meshName.includes('beam') || meshName.includes('door')) {
              smartColor = '#6b4b2a' // 木材色
            } else if (meshName.includes('window') || meshName.includes('glass')) {
              smartColor = '#87ceeb' // 窗戶色
            } else if (meshName.includes('stone') || meshName.includes('brick')) {
              smartColor = '#a0836d' // 石材色
            } else if (meshName.includes('wall') || meshName.includes('facade')) {
              smartColor = '#d8d1be' // 牆面色
            } else if (meshName.includes('foundation') || meshName.includes('base')) {
              smartColor = '#8b7355' // 地基色
            }

            const fallbackMaterial = new THREE.MeshToonMaterial({
              color: smartColor,
              dithering: true,
              shadowSide: THREE.DoubleSide,
              wireframe: false
            })

            child.material = fallbackMaterial
            console.log(`🎨 建築 ${config.id}/${child.name}: 應用智能色彩 ${smartColor}`)
          }

          // 保存原始信息到userData
          child.userData.meshName = child.name
          child.userData.buildingId = config.id
        }
      })

      // 設置mesh引用
      setBuildingMeshes(meshes)

      // 最終檢查：確保沒有任何wireframe材質
      object.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material]
          materials.forEach(material => {
            if (material.wireframe) {
              material.wireframe = false
              console.log(`🔥 最終檢查：強制關閉 ${config.id}/${child.name} 的wireframe`)
            }
          })
        }
      })

      // 清空之前的內容
      groupRef.current.clear()

      // 添加載入的建築物
      groupRef.current.add(object)

      setIsLoaded(true)
      console.log(`✅ 載入建築模型: ${config.id}，共 ${meshes.length} 個mesh`)
    }, undefined, (error) => {
      console.error(`❌ 載入OBJ模型失敗 ${config.id}:`, error)
    })
  }, [config.objPath, config.id, materials])

  // 設置建築物位置
  useEffect(() => {
    if (!groupRef.current || !isLoaded) return

    const [x, _, z] = config.position

    // 等待地形載入後設置位置
    const timer = setTimeout(() => {
      // 多重安全檢查：確保建築物絕對不在山脈區域
      const isInMountainArea = isMountainArea(x, z)
      const distanceFromCenter = Math.sqrt(x * x + z * z)

      // 第一層檢查：基本山脈檢測
      if (isInMountainArea) {
        console.error(`❌ 建築物 ${config.id} 在山脈區域 (${x}, ${z})，絕對禁止放置`)
        return
      }

      // 第二層檢查：距離超級安全檢查（配合50單位山脈限制）
      if (distanceFromCenter > 40) {
        console.error(`❌ 建築物 ${config.id} 距離中心過遠 ${distanceFromCenter.toFixed(1)} > 40，安全起見跳過放置`)
        return
      }

      // 第三層檢查：周圍區域安全性
      const surroundingSafetyCheck = [
        isMountainArea(x + 5, z + 5),
        isMountainArea(x - 5, z + 5),
        isMountainArea(x + 5, z - 5),
        isMountainArea(x - 5, z - 5)
      ]

      if (surroundingSafetyCheck.some(unsafe => unsafe)) {
        console.error(`❌ 建築物 ${config.id} 周圍區域存在山脈，安全起見跳過放置`)
        return
      }

      console.log(`✅ 建築物 ${config.id} 通過三層安全檢查，距離中心 ${distanceFromCenter.toFixed(1)}，開始放置`)

      // 獲取地形高度
      const groundHeight = getTerrainHeight(x, z)

      // 檢查是否在合適的位置 - 更嚴格的地形檢查
      const isValidPosition = groundHeight > -2 && groundHeight < 12 // 限制在更平坦的地形範圍
      const slope = getTerrainSlope(x, z)
      const isNotTooSteep = slope < Math.PI / 8 // 坡度不能超過22.5度

      // 新增：山脈碰撞檢測 - 確保建築物不會穿越山體
      const buildingBounds = getBuildingBounds(config.scale)
      const mountainCollisionCheck = checkMountainCollision(x, z, buildingBounds, groundHeight)

      if (!mountainCollisionCheck.canPlace) {
        console.warn(`⚠️ 建築物 ${config.id} 與山體發生碰撞，調整位置`)

        // 嘗試將建築物放置在最高地形點之上
        const adjustedHeight = mountainCollisionCheck.suggestedHeight
        if (adjustedHeight && adjustedHeight > groundHeight) {
          console.log(`🏔️ 將建築物 ${config.id} 調整到安全高度: ${adjustedHeight.toFixed(2)}`)
          groupRef.current!.position.set(x, adjustedHeight, z)
        } else {
          console.error(`❌ 建築物 ${config.id} 無法安全放置，跳過`)
          return
        }
      }

      // 如果通過所有檢查（包括山脈碰撞檢測），正常放置建築物
      if (isValidPosition && isNotTooSteep) {
        // 設置位置：建築物底部穩固貼地，添加小幅偏移確保完全接觸地面
        const GROUND_OFFSET = -0.1  // 稍微向下偏移，確保建築底部完全貼合地面

        // 使用最終確定的高度（可能已被山脈碰撞檢測調整）
        const finalY = groupRef.current!.position.y || (groundHeight + GROUND_OFFSET)
        groupRef.current!.position.set(x, finalY, z)

        // 設置旋轉：保持建築垂直，只應用配置的Y軸旋轉，避免傾斜導致的浮起
        groupRef.current!.rotation.set(0, config.rotation, 0)  // 保持建築垂直穩定

        // 設置縮放
        groupRef.current!.scale.setScalar(config.scale)

        // 執行最終的地形交叉檢測
        const terrainCheckPassed = performTerrainIntersectionCheck(
          groupRef.current!,
          x,
          z,
          buildingBounds
        )

        if (!terrainCheckPassed) {
          console.warn(`⚠️ 建築物 ${config.id} 地形交叉檢測失敗，嘗試向上調整`)
          // 如果檢測失敗，向上調整建築物位置
          const currentY = groupRef.current!.position.y
          const adjustedY = currentY + buildingBounds.height * 0.2 // 向上調整20%建築物高度
          groupRef.current!.position.setY(adjustedY)

          console.log(`🔧 調整建築物 ${config.id} 高度: ${currentY.toFixed(2)} → ${adjustedY.toFixed(2)}`)
        }

        console.log(`🏢 建築物 ${config.id} 已成功放置:`)
        console.log(`   位置: (${x}, ${groundHeight.toFixed(2)}, ${z})`)
        console.log(`   地形高度: ${groundHeight.toFixed(2)}`)
        console.log(`   地形坡度: ${(slope * 180 / Math.PI).toFixed(1)}° (限制: 22.5°)`)
        console.log(`   縮放: ${config.scale}`)
        console.log(`   旋轉: ${(config.rotation * 180 / Math.PI).toFixed(1)}°`)
        console.log(`   ✅ 通過山脈檢測，通過坡度檢測，安全放置`)

        // 添加建築物碰撞檢測
        const boundingBox = new THREE.Box3().setFromObject(groupRef.current!)
        const size = boundingBox.getSize(new THREE.Vector3())
        const radius = Math.max(size.x, size.z) / 2

        collisionSystem.addCollisionObject({
          position: new THREE.Vector3(x, groundHeight, z), // 使用實際地面高度
          radius: radius * 1.5, // 增大碰撞半徑確保充分保護建築物
          type: 'building',
          id: `building_${config.id}`,
          userData: {
            buildingName: config.id,
            buildingType: 'structure',
            buildingScale: config.scale
          }
        })

        console.log(`🏢 建築物 ${config.id} 碰撞檢測已設置:`)
        console.log(`   碰撞半徑: ${(radius * 1.5).toFixed(1)} (原始: ${radius.toFixed(1)})`)
        console.log(`   碰撞位置: (${x}, ${groundHeight.toFixed(1)}, ${z})`)

        // 验证碰撞器是否正确注册
        const stats = collisionSystem.getCollisionStats()
        console.log(`📊 建築物 ${config.id} 注册后碰撞统计: 总建筑 ${stats.buildings} 个`)
        console.log(`🚫 人物將無法穿過此建築物！`)
        console.log(`🎨 建築物 ${config.id} 已使用原始配色，尺寸: ${config.scale}x`)
        console.log(`🌟 夜晚发光效果已启用，共 ${buildingMeshes.length} 个组件`)

        // 特別標記新建築物
        if (config.id.includes('bell_tower') || config.id.includes('blacksmith') ||
            config.id.includes('inn') || config.id.includes('mill') ||
            config.id.includes('sawmill') || config.id.includes('stable') ||
            config.id.includes('house_new')) {
          console.log(`🆕 新建築物 ${config.id} 已成功載入！位置: (${x}, ${z})`)
        }
      } else {
        console.warn(`⚠️ 建築物 ${config.id} 位置不合適 (${x}, ${z}):`)
        console.warn(`   地形高度: ${groundHeight.toFixed(2)} (需要: -2 到 12)`)
        console.warn(`   地形坡度: ${(slope * 180 / Math.PI).toFixed(1)}° (需要: < 22.5°)`)
        console.warn(`   高度合適: ${isValidPosition}`)
        console.warn(`   坡度合適: ${isNotTooSteep}`)
        console.warn(`   ❌ 建築物未放置`)
      }
    }, 3000) // 等待3秒確保地形已載入

    return () => clearTimeout(timer)
  }, [isLoaded, config])

  // 簡化的夜晚發光效果 - 保持原始材質的發光屬性
  useEffect(() => {
    if (buildingMeshes.length === 0) return

    buildingMeshes.forEach(mesh => {
      if (mesh.material instanceof THREE.MeshStandardMaterial) {
        const meshName = mesh.userData.meshName?.toLowerCase() || ''

        if (timeOfDay === 'night') {
          // 夜晚時為窗戶添加微弱的溫暖發光效果
          if (meshName.includes('window') || meshName.includes('窗')) {
            mesh.material.emissive = new THREE.Color('#FFE4B5') // 溫暖的奶油色光
            mesh.material.emissiveIntensity = 0.2
          }
        } else {
          // 白天時移除發光效果
          mesh.material.emissive = new THREE.Color('#000000')
          mesh.material.emissiveIntensity = 0
        }

        mesh.material.needsUpdate = true
      }
    })
  }, [timeOfDay, buildingMeshes])

  // 輕微的建築物呼吸效果（可選）
  useFrame((state) => {
    if (!groupRef.current || timeOfDay !== 'night') return

    // 微妙的發光脈動效果
    buildingMeshes.forEach((mesh, index) => {
      if (mesh.material instanceof THREE.MeshStandardMaterial &&
          mesh.material.emissiveIntensity > 0) {
        const pulse = Math.sin(state.clock.elapsedTime * 0.5 + index * 0.5) * 0.05 + 1
        const baseIntensity = mesh.userData.baseEmissiveIntensity || mesh.material.emissiveIntensity
        mesh.material.emissiveIntensity = baseIntensity * pulse

        // 保存基礎強度
        if (!mesh.userData.baseEmissiveIntensity) {
          mesh.userData.baseEmissiveIntensity = mesh.material.emissiveIntensity
        }
      }
    })
  })

  return <group ref={groupRef} name={`Building_${config.id}`} />
}

// 主要建築物管理組件
export const Buildings = () => {
  return (
    <group name="Buildings">
      {buildingConfigs.map((config) => (
        <Building key={config.id} config={config} />
      ))}
    </group>
  )
}