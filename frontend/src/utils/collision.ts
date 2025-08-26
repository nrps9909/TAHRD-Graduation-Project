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
  private worldBounds = { radius: 52 } // 島嶼邊界

  // 添加碰撞物體
  addCollisionObject(object: CollisionObject) {
    this.collisionObjects.push(object)
  }

  // 移除碰撞物體
  removeCollisionObject(id: string) {
    this.collisionObjects = this.collisionObjects.filter(obj => obj.id !== id)
  }

  // 檢查位置是否有效（包括碰撞檢測和邊界檢測）
  isValidPosition(position: THREE.Vector3, playerRadius: number = 0.5): boolean {
    // 檢查是否在島嶼邊界內
    const distanceFromCenter = Math.sqrt(position.x * position.x + position.z * position.z)
    if (distanceFromCenter > this.worldBounds.radius) {
      return false
    }

    // 檢查與其他物體的碰撞
    for (const obj of this.collisionObjects) {
      const distance = position.distanceTo(obj.position)
      const minDistance = playerRadius + obj.radius
      
      if (distance < minDistance) {
        return false
      }
    }

    return true
  }

  // 獲取最近的有效位置（用於推開玩家）
  getClosestValidPosition(
    currentPosition: THREE.Vector3,
    targetPosition: THREE.Vector3,
    playerRadius: number = 0.5
  ): THREE.Vector3 {
    // 如果目標位置有效，直接返回
    if (this.isValidPosition(targetPosition, playerRadius)) {
      return targetPosition.clone()
    }

    // 計算從當前位置到目標位置的方向
    const direction = new THREE.Vector3()
      .subVectors(targetPosition, currentPosition)
      .normalize()

    // 二分搜尋找到最遠的有效位置
    let low = 0
    let high = currentPosition.distanceTo(targetPosition)
    let bestDistance = 0

    while (high - low > 0.01) {
      const mid = (low + high) / 2
      const testPosition = currentPosition.clone()
        .add(direction.clone().multiplyScalar(mid))

      if (this.isValidPosition(testPosition, playerRadius)) {
        bestDistance = mid
        low = mid
      } else {
        high = mid
      }
    }

    // 返回最遠的有效位置
    return currentPosition.clone()
      .add(direction.multiplyScalar(bestDistance))
  }

  // 清除所有碰撞物體
  clear() {
    this.collisionObjects = []
  }

  // 獲取所有碰撞物體（用於調試）
  getCollisionObjects() {
    return [...this.collisionObjects]
  }
}

// 創建全局碰撞系統實例
export const collisionSystem = new CollisionSystem()