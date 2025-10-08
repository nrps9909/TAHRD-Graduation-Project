/**
 * 樹的位置分布算法
 * 用於在島嶼上生成不重疊的樹位置
 */

export interface TreePosition {
  x: number
  z: number
  y: number // 高度（通常由地形決定）
}

/**
 * 在島嶼上生成不重疊的樹位置
 * @param count 樹的數量
 * @param islandRadius 島嶼半徑
 * @param minDistance 樹之間的最小距離
 * @param seed 隨機種子（用於可重現的隨機性）
 * @returns 樹的位置數組
 */
export function generateTreePositions(
  count: number,
  islandRadius: number = 15,
  minDistance: number = 1.5,
  seed: number = 0
): TreePosition[] {
  const positions: TreePosition[] = []

  // 使用種子生成偽隨機數
  let currentSeed = seed
  const random = () => {
    const x = Math.sin(currentSeed) * 10000
    currentSeed += 1
    return x - Math.floor(x)
  }

  // 最大嘗試次數（避免無限循環）
  const maxAttempts = count * 50

  for (let i = 0; i < count && positions.length < count; i++) {
    let attempts = 0
    let validPosition = false
    let newPos: TreePosition = { x: 0, z: 0, y: 1.5 }

    while (!validPosition && attempts < maxAttempts) {
      // 使用極坐標生成位置，更均勻地分布
      const angle = random() * Math.PI * 2
      const distance = Math.sqrt(random()) * islandRadius * 0.85 // 0.85 讓樹不會太靠近邊緣

      newPos = {
        x: Math.cos(angle) * distance,
        z: Math.sin(angle) * distance,
        y: 1.5 // 暫時固定高度，實際使用時會根據地形調整
      }

      // 檢查是否與現有樹太近
      validPosition = true
      for (const existingPos of positions) {
        const dx = newPos.x - existingPos.x
        const dz = newPos.z - existingPos.z
        const dist = Math.sqrt(dx * dx + dz * dz)

        if (dist < minDistance) {
          validPosition = false
          break
        }
      }

      attempts++
    }

    if (validPosition) {
      positions.push(newPos)
    }
  }

  return positions
}

/**
 * 根據記憶 ID 生成確定性的位置
 * 這樣相同的記憶ID總是會生成相同的位置
 * @param memoryId 記憶 ID
 * @param islandId 島嶼 ID
 * @param islandRadius 島嶼半徑
 */
export function getPositionForMemory(
  memoryId: string,
  islandId: string,
  islandRadius: number = 15
): TreePosition {
  // 將字符串轉換為數字種子
  const seed = hashString(memoryId + islandId)

  const random = (() => {
    let s = seed
    return () => {
      const x = Math.sin(s) * 10000
      s += 1
      return x - Math.floor(x)
    }
  })()

  const angle = random() * Math.PI * 2
  const distance = Math.sqrt(random()) * islandRadius * 0.85

  return {
    x: Math.cos(angle) * distance,
    z: Math.sin(angle) * distance,
    y: 1.5
  }
}

/**
 * 簡單的字符串哈希函數
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // 轉換為32位整數
  }
  return Math.abs(hash)
}
