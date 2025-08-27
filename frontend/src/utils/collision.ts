import * as THREE from 'three'

// 定義碰撞物體類型
export interface CollisionObject {
  position: THREE.Vector3
  radius: number
  type: 'building' | 'tree' | 'rock' | 'npc' | 'fence' | 'water' | 'mountain'
  id: string
}

// 碰撞系統類
export class CollisionSystem {
  private collisionObjects: CollisionObject[] = []
  private worldBounds = { radius: 104 } // 島嶼邊界 - 10倍擴展 (52 * 2)

  // 添加碰撞物體
  addCollisionObject(object: CollisionObject) {
    this.collisionObjects.push(object)
  }

  // 移除碰撞物體
  removeCollisionObject(id: string) {
    this.collisionObjects = this.collisionObjects.filter(obj => obj.id !== id)
  }

  // 檢查位置是否有效（移除碰撞半徑限制）
  isValidPosition(position: THREE.Vector3, playerRadius: number = 0.5): boolean {
    // 檢查是否在島嶼邊界內
    const distanceFromCenter = Math.sqrt(position.x * position.x + position.z * position.z)
    if (distanceFromCenter > this.worldBounds.radius) {
      return false
    }

    // 移除所有碰撞半徑檢測 - 允許自由穿越所有物體
    return true
  }

  // 獲取最近的有效位置（移除碰撞限制，直接返回目標位置）
  getClosestValidPosition(
    currentPosition: THREE.Vector3,
    targetPosition: THREE.Vector3,
    playerRadius: number = 0.5
  ): THREE.Vector3 {
    // 移除所有碰撞檢測，直接返回目標位置
    return targetPosition.clone()
  }

  // 清除所有碰撞物體
  clear() {
    this.collisionObjects = []
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
}

// 創建全局碰撞系統實例
export const collisionSystem = new CollisionSystem()