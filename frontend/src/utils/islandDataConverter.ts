/**
 * 將 GraphQL 的 Island 和 Memory 數據轉換為 3D 場景所需的格式
 * 新架構：Island 從資料庫載入，Memory 通過 category 對應到 Island
 */

import { Island as GraphQLIsland } from '../graphql/category'
import { Memory as GraphQLMemory } from '../types/memory'
import { Island, Memory as IslandMemory, IslandCategory } from '../types/island'

/**
 * 將 GraphQL Memory 轉換為 Island Memory 格式（用於 3D 場景）
 */
export function convertGraphQLMemoryToIslandMemory(graphQLMemory: GraphQLMemory): IslandMemory {
  return {
    id: graphQLMemory.id,
    title: graphQLMemory.title || graphQLMemory.summary || '無標題記憶',
    importance: 5, // 固定為 5，已廢棄此欄位
    category: graphQLMemory.category as IslandCategory,
    content: graphQLMemory.summary || graphQLMemory.rawContent,
    tags: graphQLMemory.tags || [],
    createdAt: new Date(graphQLMemory.createdAt),
    position: [0, 0, 0], // 預設位置，將由使用方設定
    emoji: graphQLMemory.emoji,
    summary: graphQLMemory.summary
  }
}

/**
 * 將 GraphQL Island 轉換為前端 Island 格式（用於 3D 場景）
 */
export function convertGraphQLIslandToIsland(
  graphQLIsland: GraphQLIsland,
  allMemories: GraphQLMemory[]
): Island {
  // 根據島嶼 ID 過濾屬於該島嶼的記憶
  // 優先使用 islandId，如果沒有則退回到舊的 category 匹配邏輯（向後兼容）
  const filteredMemories = allMemories.filter(memory => {
    // 新邏輯：使用 islandId 精確匹配
    if (memory.islandId) {
      return memory.islandId === graphQLIsland.id
    }

    // 舊邏輯：使用 category 匹配（向後兼容沒有 islandId 的舊記憶）
    const islandType = graphQLIsland.name?.replace('_ISLAND', '')
    return memory.category === islandType
  })

  const islandMemories = filteredMemories.map(convertGraphQLMemoryToIslandMemory)

  return {
    id: graphQLIsland.id,
    userId: graphQLIsland.userId,
    position: graphQLIsland.position,
    name: graphQLIsland.name,
    nameChinese: graphQLIsland.nameChinese,
    emoji: graphQLIsland.emoji,
    color: graphQLIsland.color,
    description: graphQLIsland.description || null,
    positionX: graphQLIsland.positionX,
    positionY: graphQLIsland.positionY,
    positionZ: graphQLIsland.positionZ,
    memoryCount: islandMemories.length, // 使用實際的記憶數量
    isActive: graphQLIsland.isActive,
    createdAt: graphQLIsland.createdAt,
    updatedAt: graphQLIsland.updatedAt,
    memories: islandMemories,
    customShapeData: graphQLIsland.customShapeData || null,
    islandHeight: graphQLIsland.islandHeight || null,
    islandBevel: graphQLIsland.islandBevel || null,
    shape: null, // 不再使用，保留以向後兼容
    textureId: null,
    modelUrl: null
  }
}

/**
 * 將多個 GraphQL Islands 轉換為前端 Islands 格式
 */
export function convertGraphQLIslandsToIslands(
  graphQLIslands: GraphQLIsland[],
  allMemories: GraphQLMemory[]
): Island[] {
  return graphQLIslands.map(island =>
    convertGraphQLIslandToIsland(island, allMemories)
  )
}
