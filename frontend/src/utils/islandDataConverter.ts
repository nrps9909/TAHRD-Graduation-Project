/**
 * 將 GraphQL 的 Island 和 Memory 數據轉換為 3D 場景所需的格式
 * 新架構：Island 從資料庫載入，包含 Subcategories 和 Memories
 */

import { Island as GraphQLIsland } from '../graphql/category'
import { Memory as GraphQLMemory } from '../types/memory'
import { Island, Memory as IslandMemory, Subcategory, IslandCategory } from '../types/island'

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
    summary: graphQLMemory.summary,
    subcategoryId: graphQLMemory.subcategoryId,
    subcategory: graphQLMemory.subcategory as Subcategory | undefined
  }
}

/**
 * 將 GraphQL Island 轉換為前端 Island 格式（用於 3D 場景）
 */
export function convertGraphQLIslandToIsland(
  graphQLIsland: GraphQLIsland,
  allMemories: GraphQLMemory[]
): Island {
  // 過濾出屬於這個島嶼的所有記憶
  // 記憶屬於某個島嶼 = 記憶的 subcategoryId 屬於這個島嶼的任一 subcategory
  const subcategoryIds = (graphQLIsland.subcategories || []).map(sub => sub.id)
  const islandMemories = allMemories
    .filter(memory => memory.subcategoryId && subcategoryIds.includes(memory.subcategoryId))
    .map(convertGraphQLMemoryToIslandMemory)

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
    subcategoryCount: graphQLIsland.subcategoryCount,
    memoryCount: islandMemories.length, // 使用實際的記憶數量
    isActive: graphQLIsland.isActive,
    createdAt: graphQLIsland.createdAt,
    updatedAt: graphQLIsland.updatedAt,
    subcategories: graphQLIsland.subcategories as Subcategory[] | undefined,
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
