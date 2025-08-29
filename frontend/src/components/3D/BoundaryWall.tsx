import { useRef, useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { collisionSystem } from '@/utils/collision'

// 邊界牆配置
const BOUNDARY_WALL_CONFIG = {
  // 牆壁位置和尺寸
  xPositions: [250, -230],  // x軸位置（正負250）
  zPositions: [250, -280],  // z軸位置（正負250）
  wallLength: 1000,         // 牆壁長度（覆蓋整個場景）
  wallHeight: 15,           // 牆壁高度
  wallThickness: 2,         // 牆壁厚度
  
  // 外觀設置
  wallColor: '#8B7355',     // 牆壁顏色（石牆色調）
  topColor: '#A0895A',      // 頂部顏色（稍亮）
  
  // 碰撞檢測 - 加強防穿透
  collisionRadius: 5.0,     // 增大碰撞半徑確保完全阻擋
  collisionPoints: 200,     // 大幅增加碰撞點數量（每5單位一個點）
  wallBuffer: 3.0,          // 牆壁緩衝區，額外的安全距離
} as const

// 邊界牆組件
export const BoundaryWall = () => {
  const wallRef = useRef<THREE.Group>(null)

  // 創建牆壁幾何體和材質
  const { wallGeometry, wallMaterial } = useMemo(() => {
    const config = BOUNDARY_WALL_CONFIG
    
    // 主牆體幾何體
    const geometry = new THREE.BoxGeometry(
      config.wallThickness,
      config.wallHeight,
      config.wallLength
    )
    
    // 主牆體材質 - 完全透明無色
    const material = new THREE.MeshLambertMaterial({
      transparent: true,
      opacity: 0.0,  // 完全透明
      visible: false  // 完全不可見
    })
    
    // 頂部材質（稍微不同的顏色）
    const topMat = new THREE.MeshLambertMaterial({
      color: config.topColor
    })
    
    return {
      wallGeometry: geometry,
      wallMaterial: material
    }
  }, [])

  // 設置碰撞檢測
  useEffect(() => {
    const config = BOUNDARY_WALL_CONFIG
    console.log(`🧱 創建完整邊界牆系統`)
    console.log(`   - X軸位置: ${config.xPositions.join(', ')}`)
    console.log(`   - Z軸位置: ${config.zPositions.join(', ')}`)
    console.log(`👻 透明牆壁：不可見但完全不可穿透`)
    
    const collisionObjects = []
    
    // X軸牆壁 - 為每面牆創建密集的碰撞點防穿透系統
    config.xPositions.forEach((xPos, wallIndex) => {
      // 主要碰撞點 - 沿著牆壁長度創建密集碰撞點
      for (let i = 0; i < config.collisionPoints; i++) {
        const zPosition = -config.wallLength / 2 + (i / (config.collisionPoints - 1)) * config.wallLength
        const collisionId = `boundary_wall_x_${wallIndex}_${i}`
        
        const collisionObject = {
          position: new THREE.Vector3(xPos, config.wallHeight / 2, zPosition),
          radius: config.collisionRadius,
          type: 'mountain' as const, // 使用 mountain 類型阻擋通行
          id: collisionId,
          userData: {
            isBoundaryWall: true,
            wallPosition: `x_axis_${xPos > 0 ? 'positive' : 'negative'}`,
            wallIndex: wallIndex,
            segmentIndex: i,
            isPrimaryCollision: true
          }
        }
        
        collisionObjects.push(collisionObject)
        collisionSystem.addCollisionObject(collisionObject)
      }
      
      // 額外的緩衝區碰撞點 - 在牆壁前方創建額外保護
      for (let i = 0; i < config.collisionPoints; i++) {
        const zPosition = -config.wallLength / 2 + (i / (config.collisionPoints - 1)) * config.wallLength
        const bufferXPos = xPos + (xPos > 0 ? -config.wallBuffer : config.wallBuffer)
        const bufferId = `boundary_buffer_x_${wallIndex}_${i}`
        
        const bufferObject = {
          position: new THREE.Vector3(bufferXPos, config.wallHeight / 2, zPosition),
          radius: config.collisionRadius,
          type: 'mountain' as const,
          id: bufferId,
          userData: {
            isBoundaryWall: true,
            wallPosition: `x_axis_${xPos > 0 ? 'positive' : 'negative'}_buffer`,
            wallIndex: wallIndex,
            segmentIndex: i,
            isBufferCollision: true
          }
        }
        
        collisionObjects.push(bufferObject)
        collisionSystem.addCollisionObject(bufferObject)
      }
    })
    
    // Z軸牆壁 - 為每面牆創建密集的碰撞點防穿透系統
    config.zPositions.forEach((zPos, wallIndex) => {
      // 主要碰撞點 - 沿著牆壁長度創建密集碰撞點
      for (let i = 0; i < config.collisionPoints; i++) {
        const xPosition = -config.wallLength / 2 + (i / (config.collisionPoints - 1)) * config.wallLength
        const collisionId = `boundary_wall_z_${wallIndex}_${i}`
        
        const collisionObject = {
          position: new THREE.Vector3(xPosition, config.wallHeight / 2, zPos),
          radius: config.collisionRadius,
          type: 'mountain' as const, // 使用 mountain 類型阻擋通行
          id: collisionId,
          userData: {
            isBoundaryWall: true,
            wallPosition: `z_axis_${zPos > 0 ? 'positive' : 'negative'}`,
            wallIndex: wallIndex,
            segmentIndex: i,
            isPrimaryCollision: true
          }
        }
        
        collisionObjects.push(collisionObject)
        collisionSystem.addCollisionObject(collisionObject)
      }
      
      // 額外的緩衝區碰撞點 - 在牆壁前方創建額外保護
      for (let i = 0; i < config.collisionPoints; i++) {
        const xPosition = -config.wallLength / 2 + (i / (config.collisionPoints - 1)) * config.wallLength
        const bufferZPos = zPos + (zPos > 0 ? -config.wallBuffer : config.wallBuffer)
        const bufferId = `boundary_buffer_z_${wallIndex}_${i}`
        
        const bufferObject = {
          position: new THREE.Vector3(xPosition, config.wallHeight / 2, bufferZPos),
          radius: config.collisionRadius,
          type: 'mountain' as const,
          id: bufferId,
          userData: {
            isBoundaryWall: true,
            wallPosition: `z_axis_${zPos > 0 ? 'positive' : 'negative'}_buffer`,
            wallIndex: wallIndex,
            segmentIndex: i,
            isBufferCollision: true
          }
        }
        
        collisionObjects.push(bufferObject)
        collisionSystem.addCollisionObject(bufferObject)
      }
    })
    
    console.log(`🧱 完整邊界石牆系統設置完成！`)
    console.log(`📊 總計: ${collisionObjects.length} 個碰撞點`)
    console.log(`   - X軸牆壁: ${config.xPositions.length} 面牆 × ${config.collisionPoints * 2} 點 = ${config.xPositions.length * config.collisionPoints * 2} 個`)
    console.log(`   - Z軸牆壁: ${config.zPositions.length} 面牆 × ${config.collisionPoints * 2} 點 = ${config.zPositions.length * config.collisionPoints * 2} 個`)
    console.log(`📏 石牆規格: 長度 ${config.wallLength}, 高度 ${config.wallHeight}, 厚度 ${config.wallThickness}`)
    console.log(`🛡️ 碰撞半徑: ${config.collisionRadius} 單位, 緩衝區: ${config.wallBuffer} 單位`)
    console.log(`⚠️  完全防穿透 - 不可見但絕對有效的四面牆保護系統`)
    console.log(`👻 玩家體驗：隱形矩形邊界，完全不可穿透`)
    
    // 清理函數 - 清理所有碰撞點
    return () => {
      // 清理X軸牆壁
      config.xPositions.forEach((_, wallIndex) => {
        for (let i = 0; i < config.collisionPoints; i++) {
          collisionSystem.removeCollisionObject(`boundary_wall_x_${wallIndex}_${i}`)
          collisionSystem.removeCollisionObject(`boundary_buffer_x_${wallIndex}_${i}`)
        }
      })
      // 清理Z軸牆壁
      config.zPositions.forEach((_, wallIndex) => {
        for (let i = 0; i < config.collisionPoints; i++) {
          collisionSystem.removeCollisionObject(`boundary_wall_z_${wallIndex}_${i}`)
          collisionSystem.removeCollisionObject(`boundary_buffer_z_${wallIndex}_${i}`)
        }
      })
      console.log('🧹 已清理完整邊界石牆碰撞物體（X軸+Z軸，包含緩衝區）')
    }
  }, [])

  return (
    <group ref={wallRef}>
      {/* X軸牆壁 - 為每個X位置創建完全實心的石牆 */}
      {BOUNDARY_WALL_CONFIG.xPositions.map((xPos, wallIndex) => (
        <group key={`solid_wall_x_${wallIndex}`}>
          {/* 完全實心的主牆體 */}
          <mesh 
            position={[
              xPos, 
              BOUNDARY_WALL_CONFIG.wallHeight / 2, 
              0
            ]}
            visible={false}
          >
            <boxGeometry args={[
              BOUNDARY_WALL_CONFIG.wallThickness,
              BOUNDARY_WALL_CONFIG.wallHeight,
              BOUNDARY_WALL_CONFIG.wallLength
            ]} />
            <primitive object={wallMaterial} />
          </mesh>
        </group>
      ))}

      {/* Z軸牆壁 - 為每個Z位置創建完全實心的石牆 */}
      {BOUNDARY_WALL_CONFIG.zPositions.map((zPos, wallIndex) => (
        <group key={`solid_wall_z_${wallIndex}`}>
          {/* 完全實心的主牆體 */}
          <mesh 
            position={[
              0, 
              BOUNDARY_WALL_CONFIG.wallHeight / 2, 
              zPos
            ]}
            visible={false}
          >
            <boxGeometry args={[
              BOUNDARY_WALL_CONFIG.wallLength,
              BOUNDARY_WALL_CONFIG.wallHeight,
              BOUNDARY_WALL_CONFIG.wallThickness
            ]} />
            <primitive object={wallMaterial} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// 獲取邊界牆信息的工具函數
export const getBoundaryWallInfo = () => {
  return {
    xWallPositions: BOUNDARY_WALL_CONFIG.xPositions.map(x => ({ x, y: 0, z: 0 })),
    zWallPositions: BOUNDARY_WALL_CONFIG.zPositions.map(z => ({ x: 0, y: 0, z })),
    dimensions: {
      length: BOUNDARY_WALL_CONFIG.wallLength,
      height: BOUNDARY_WALL_CONFIG.wallHeight,
      thickness: BOUNDARY_WALL_CONFIG.wallThickness
    },
    bounds: {
      minX: -BOUNDARY_WALL_CONFIG.wallLength / 2,
      maxX: BOUNDARY_WALL_CONFIG.wallLength / 2,
      minZ: -BOUNDARY_WALL_CONFIG.wallLength / 2,
      maxZ: BOUNDARY_WALL_CONFIG.wallLength / 2,
      xPositions: BOUNDARY_WALL_CONFIG.xPositions,
      zPositions: BOUNDARY_WALL_CONFIG.zPositions
    }
  }
}

// 檢查位置是否會被牆壁阻擋的工具函數
export const isBlockedByWall = (x: number, z: number): boolean => {
  const config = BOUNDARY_WALL_CONFIG
  
  // 檢查X軸牆壁
  for (const xPos of config.xPositions) {
    if (Math.abs(x - xPos) <= config.collisionRadius) {
      // 檢查是否在牆壁的Z範圍內
      const minZ = -config.wallLength / 2
      const maxZ = config.wallLength / 2
      if (z >= minZ && z <= maxZ) {
        return true
      }
    }
  }
  
  // 檢查Z軸牆壁
  for (const zPos of config.zPositions) {
    if (Math.abs(z - zPos) <= config.collisionRadius) {
      // 檢查是否在牆壁的X範圍內
      const minX = -config.wallLength / 2
      const maxX = config.wallLength / 2
      if (x >= minX && x <= maxX) {
        return true
      }
    }
  }
  
  return false
}