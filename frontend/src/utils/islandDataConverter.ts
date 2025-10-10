/**
 * 將 GraphQL 的 Memory 數據轉換為 Island 格式
 * 新架構：根據記憶的 category 分配到對應的島嶼
 */

import { Island, Memory as IslandMemory, IslandCategory, DEFAULT_ISLANDS } from '../types/island'
import { Memory as DBMemory } from '../types/memory'

/**
 * 將資料庫的 Memory 轉換為 Island Memory 格式
 */
export function convertDBMemoryToIslandMemory(dbMemory: DBMemory): IslandMemory {
  return {
    id: dbMemory.id,
    title: dbMemory.title,
    importance: dbMemory.isPinned ? 8 : 5, // 釘選的記憶視為重要，其他使用預設值
    category: dbMemory.category as IslandCategory,
    content: dbMemory.summary || dbMemory.rawContent,
    tags: dbMemory.tags,
    createdAt: new Date(dbMemory.createdAt)
  }
}

/**
 * 計算區域分布（根據記憶的 category）
 */
export function calculateRegionDistribution(memories: IslandMemory[]) {
  const distribution = {
    learning: 0,
    inspiration: 0,
    work: 0,
    social: 0,
    life: 0,
    goals: 0,
    resources: 0,
    misc: 0
  }

  memories.forEach(memory => {
    const category = memory.category.toLowerCase() as keyof typeof distribution
    if (category in distribution) {
      distribution[category]++
    }
  })

  return distribution
}

/**
 * 將所有記憶分配到對應的島嶼
 * @param islands 島嶼配置（包含 categories 字段）
 * @param allMemories 所有記憶
 * @returns 填充了記憶的島嶼列表
 */
export function assignMemoriesToIslands(
  islands: Island[],
  allMemories: DBMemory[]
): Island[] {
  // 轉換所有記憶
  const convertedMemories = allMemories.map(convertDBMemoryToIslandMemory)

  // 為每個島嶼分配記憶
  return islands.map(island => {
    // 根據島嶼的 categories 過濾記憶
    const islandMemories = convertedMemories.filter(memory =>
      island.categories.includes(memory.category)
    )

    // 去重：確保每個記憶 ID 只出現一次
    const uniqueMemories = Array.from(
      new Map(islandMemories.map(m => [m.id, m])).values()
    )

    return {
      ...island,
      memories: uniqueMemories,
      memoryCount: uniqueMemories.length,
      regionDistribution: calculateRegionDistribution(uniqueMemories),
      updatedAt: new Date()
    }
  })
}

/**
 * 載入用戶的島嶼配置（從 localStorage 或使用預設配置）
 */
export function loadUserIslands(): Island[] {
  try {
    const saved = localStorage.getItem('user-islands')
    if (saved) {
      const parsed = JSON.parse(saved)
      // 轉換日期字符串為 Date 對象
      return parsed.map((island: any) => ({
        ...island,
        createdAt: new Date(island.createdAt),
        updatedAt: new Date(island.updatedAt)
      }))
    }
  } catch (error) {
    console.error('Failed to load user islands:', error)
  }

  // 返回預設配置
  return DEFAULT_ISLANDS
}

/**
 * 保存用戶的島嶼配置到 localStorage
 */
export function saveUserIslands(islands: Island[]) {
  try {
    localStorage.setItem('user-islands', JSON.stringify(islands))
  } catch (error) {
    console.error('Failed to save user islands:', error)
  }
}
