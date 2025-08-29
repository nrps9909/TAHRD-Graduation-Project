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
  
  
}

// 創建全局碰撞系統實例
export const collisionSystem = new CollisionSystem()