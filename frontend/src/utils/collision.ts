import * as THREE from 'three'

// 定義碰撞物體類型
export interface CollisionObject {
  position: THREE.Vector3
  radius: number
  type: 'building' | 'tree' | 'rock' | 'npc' | 'fence' | 'water' | 'mountain'
  id: string
  userData?: any
}

// 碰撞系統類
export class CollisionSystem {
  private collisionObjects: CollisionObject[] = [] 

  // 添加碰撞物體
  addCollisionObject(object: CollisionObject) {
    this.collisionObjects.push(object)
  }

  // 移除碰撞物體
  removeCollisionObject(id: string) {
    this.collisionObjects = this.collisionObjects.filter(obj => obj.id !== id)
  }

  // 檢查位置是否有效（僅檢查碰撞物體，不使用固定邊界）
  isValidPosition(position: THREE.Vector3, playerRadius: number = 0.5): boolean {
    // 檢查所有碰撞物體
    for (const obj of this.collisionObjects) {
      const distance = position.distanceTo(obj.position)
      
      if (distance < (obj.radius + playerRadius)) {
        // 跳過水域類型，不阻擋
        if (obj.type === 'water') {
          continue
        }
        // 需要阻擋的類型（移除 fence 和 boundary，無邊界限制）
        if (obj.type === 'building' || obj.type === 'tree' || obj.type === 'rock' || 
            obj.type === 'npc' || obj.type === 'mountain') {
          console.log(`玩家被${obj.type}阻擋! 位置: (${position.x.toFixed(1)}, ${position.z.toFixed(1)}), 碰撞點: (${obj.position.x.toFixed(1)}, ${obj.position.z.toFixed(1)}), 距離: ${distance.toFixed(1)}, 阻擋半徑: ${(obj.radius + playerRadius).toFixed(1)}`)
          return false
        }
      }
    }

    return true
  }

  // 獲取最近的有效位置
  getClosestValidPosition(
    currentPosition: THREE.Vector3,
    targetPosition: THREE.Vector3,
    playerRadius: number = 0.5
  ): THREE.Vector3 {
    // 如果目標位置有效，直接返回
    if (this.isValidPosition(targetPosition, playerRadius)) {
      return targetPosition.clone()
    }

    // 如果目標位置無效，嘗試找到最近的有效位置
    const direction = targetPosition.clone().sub(currentPosition).normalize()
    let testPosition = currentPosition.clone()
    const step = 0.5 // 每次測試的步長

    // 沿著移動方向逐步測試，直到找到邊界
    for (let distance = 0; distance < currentPosition.distanceTo(targetPosition); distance += step) {
      const nextTestPosition = currentPosition.clone().add(direction.clone().multiplyScalar(distance + step))
      
      if (!this.isValidPosition(nextTestPosition, playerRadius)) {
        break
      }
      
      testPosition = nextTestPosition.clone()
    }

    return testPosition
  }

  // 清除所有碰撞物體
  clear() {
    this.collisionObjects = []
  }

  // 清理特定類型的碰撞物體
  clearByIdPattern(pattern: string) {
    const before = this.collisionObjects.length
    this.collisionObjects = this.collisionObjects.filter(obj => !obj.id.includes(pattern))
    const after = this.collisionObjects.length
    console.log(`清理了 ${before - after} 個包含 "${pattern}" 的碰撞物體`)
    return before - after
  }

  // 獲取所有碰撞物體（用於調試）
  getCollisionObjects() {
    return [...this.collisionObjects]
  }
  
  // 調試方法：顯示註冊的樹木數量
  getTreeCount() {
    return this.collisionObjects.filter(obj => obj.type === 'tree').length
  }
  
  // 調試方法：顯示所有樹木位置
  getTreePositions() {
    return this.collisionObjects
      .filter(obj => obj.type === 'tree')
      .map(tree => ({ id: tree.id, position: tree.position, radius: tree.radius }))
  }
  
  // 調試方法：顯示水域邊界數量
  getWaterCount() {
    return this.collisionObjects.filter(obj => obj.id.includes('ocean_boundary')).length
  }
  
  // 調試方法：顯示所有水域位置
  getWaterPositions() {
    return this.collisionObjects
      .filter(obj => obj.id.includes('ocean_boundary'))
      .map(water => ({ id: water.id, position: water.position, radius: water.radius }))
  }
  
  // 調試方法：顯示山脈碰撞器數量
  getMountainCount() {
    return this.collisionObjects.filter(obj => obj.type === 'mountain').length
  }
  
  // 調試方法：顯示所有山脈位置
  getMountainPositions() {
    return this.collisionObjects
      .filter(obj => obj.type === 'mountain')
      .map(mountain => ({ id: mountain.id, position: mountain.position, radius: mountain.radius }))
  }
  
  // 調試方法：顯示所有碰撞器統計
  getCollisionStats() {
    const stats = {
      total: this.collisionObjects.length,
      trees: this.getTreeCount(),
      mountains: this.getMountainCount(),
      rocks: this.collisionObjects.filter(obj => obj.type === 'rock').length,
      buildings: this.collisionObjects.filter(obj => obj.type === 'building').length,
      npcs: this.collisionObjects.filter(obj => obj.type === 'npc').length,
      water: this.getWaterCount()
    }
    
    console.log('🏔️ 碰撞系統統計:')
    console.log(`  總計: ${stats.total} 個碰撞器`)
    console.log(`  樹木: ${stats.trees} 個`)
    console.log(`  山脈: ${stats.mountains} 個`)
    console.log(`  岩石: ${stats.rocks} 個`)
    console.log(`  建築: ${stats.buildings} 個`)
    console.log(`  NPC: ${stats.npcs} 個`)
    console.log(`  水域: ${stats.water} 個`)
    
    return stats
  }
  
  // 专用于雪花的地形碰撞检测
  checkSnowflakeCollision(position: THREE.Vector3, snowflakeRadius: number = 0.5): {
    hasCollision: boolean
    collisionType?: string
    surfaceHeight?: number
  } {
    // 检查所有固体碰撞物体（不包括水域）
    for (const obj of this.collisionObjects) {
      if (obj.type === 'water') continue
      
      const horizontalDistance = Math.sqrt(
        (position.x - obj.position.x) ** 2 + 
        (position.z - obj.position.z) ** 2
      )
      
      // 如果雪花在碰撞物体的水平范围内
      if (horizontalDistance < (obj.radius + snowflakeRadius)) {
        // 检查垂直位置
        const objTop = obj.position.y + (obj.radius * 0.5) // 物体顶部高度
        const objBottom = obj.position.y - (obj.radius * 0.5) // 物体底部高度
        
        // 如果雪花位置低于或接近物体顶部
        if (position.y <= objTop + snowflakeRadius) {
          return {
            hasCollision: true,
            collisionType: obj.type,
            surfaceHeight: objTop
          }
        }
      }
    }
    
    return { hasCollision: false }
  }
  
  // 获取指定位置的地面高度（考虑所有地形）
  getGroundHeight(position: THREE.Vector3): number {
    let maxHeight = -5 // 默认地面高度
    
    for (const obj of this.collisionObjects) {
      if (obj.type === 'water') continue
      
      const horizontalDistance = Math.sqrt(
        (position.x - obj.position.x) ** 2 + 
        (position.z - obj.position.z) ** 2
      )
      
      // 如果在物体范围内，更新最高地面高度
      if (horizontalDistance < obj.radius) {
        const surfaceHeight = obj.position.y + (obj.radius * 0.5)
        maxHeight = Math.max(maxHeight, surfaceHeight)
      }
    }
    
    return maxHeight
  }
  
  // 检查雪花距离物体表面的垂直高度差（专用于特效触发）
  checkSnowflakeHeightAboveSurface(position: THREE.Vector3, heightTrigger: number = 5): {
    shouldTrigger: boolean
    surfaceType?: string
    heightDifference?: number
    surfaceHeight?: number
  } {
    let bestMatch: {
      object: CollisionObject
      surfaceHeight: number
      heightDiff: number
    } | null = null
    
    for (const obj of this.collisionObjects) {
      // 检查水平距离是否在物体范围内
      const horizontalDistance = Math.sqrt(
        (position.x - obj.position.x) ** 2 + 
        (position.z - obj.position.z) ** 2
      )
      
      // 只有当雪花在物体的水平投影范围内才检查垂直距离
      if (horizontalDistance <= obj.radius) {
        // 计算物体表面高度
        let surfaceHeight: number
        if (obj.type === 'water') {
          // 水面高度
          surfaceHeight = obj.position.y
        } else {
          // 固体物体的顶部表面
          surfaceHeight = obj.position.y + (obj.radius * 0.5)
        }
        
        // 计算垂直高度差（雪花必须在表面上方）
        const heightDiff = position.y - surfaceHeight
        
        // 只有当雪花在表面上方且高度差在触发范围内时才考虑
        if (heightDiff > 0 && heightDiff <= heightTrigger) {
          // 选择最接近的表面（高度差最小的）
          if (!bestMatch || heightDiff < bestMatch.heightDiff) {
            bestMatch = {
              object: obj,
              surfaceHeight: surfaceHeight,
              heightDiff: heightDiff
            }
          }
        }
      }
    }
    
    return {
      shouldTrigger: bestMatch !== null,
      surfaceType: bestMatch?.object.type,
      heightDifference: bestMatch?.heightDiff,
      surfaceHeight: bestMatch?.surfaceHeight
    }
  }
  
}

// 創建全局碰撞系統實例
export const collisionSystem = new CollisionSystem()