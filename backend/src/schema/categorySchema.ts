import { gql } from 'graphql-tag'

export const categoryTypeDefs = gql`
  # ============ Custom Category System ============

  # Island - 代表大類別（島嶼）
  type Island {
    id: ID!
    userId: ID!
    position: Int!

    # 自訂資訊
    name: String!
    nameChinese: String!
    emoji: String!
    color: String!
    description: String

    # 3D 位置
    positionX: Float!
    positionY: Float!
    positionZ: Float!

    # 3D 外觀配置（可選）
    modelUrl: String
    textureId: String
    shape: String
    customShapeData: String
    islandHeight: Float
    islandBevel: Float

    # 統計
    subcategoryCount: Int!
    memoryCount: Int!

    # 狀態
    isActive: Boolean!

    # Timestamps
    createdAt: DateTime!
    updatedAt: DateTime!

    # Relations
    subcategories: [Subcategory!]!
  }

  # Subcategory - 代表小類別（SubAgent）
  type Subcategory {
    id: ID!
    userId: ID!
    islandId: ID!
    position: Int!

    # 自訂資訊
    name: String
    nameChinese: String!
    emoji: String!
    color: String!
    description: String

    # AI 設定（動態提示詞）
    systemPrompt: String!
    personality: String!
    chatStyle: String!

    # 關鍵字
    keywords: [String!]!

    # 統計
    memoryCount: Int!
    chatCount: Int!

    # 狀態
    isActive: Boolean!

    # Timestamps
    createdAt: DateTime!
    updatedAt: DateTime!

    # Relations
    island: Island!
    memories: [Memory!]!
  }

  # 分類統計
  type CustomCategoryStats {
    islandsCount: Int!
    subcategoriesCount: Int!
    totalMemories: Int!
  }

  # AI 生成的提示詞建議（島嶼）
  type IslandPromptSuggestion {
    description: String!
    keywords: [String!]!
  }

  # AI 生成的提示詞建議（小類別）
  type SubcategoryPromptSuggestion {
    description: String!
    keywords: [String!]!
    systemPrompt: String!
    personality: String!
    chatStyle: String!
  }

  # ============ Inputs ============

  input CreateIslandInput {
    name: String!
    nameChinese: String!
    emoji: String
    color: String
    description: String
    positionX: Float
    positionY: Float
    positionZ: Float
  }

  input UpdateIslandInput {
    name: String
    nameChinese: String
    emoji: String
    color: String
    description: String
    positionX: Float
    positionY: Float
    positionZ: Float
    position: Int

    # 3D 外觀配置（可選）
    customShapeData: String
    islandHeight: Float
    islandBevel: Float
  }

  input CreateSubcategoryInput {
    islandId: ID!
    name: String
    nameChinese: String!
    emoji: String
    color: String
    description: String
    keywords: [String!]
    systemPrompt: String!
    personality: String!
    chatStyle: String!
  }

  input UpdateSubcategoryInput {
    islandId: ID
    name: String
    nameChinese: String
    emoji: String
    color: String
    description: String
    keywords: [String!]
    systemPrompt: String
    personality: String
    chatStyle: String
    position: Int
    isActive: Boolean
  }

  # ============ Extend existing types ============

  extend type Query {
    # 島嶼查詢
    islands: [Island!]!
    island(id: ID!): Island

    # 小類別查詢
    subcategories(islandId: ID): [Subcategory!]!
    subcategory(id: ID!): Subcategory

    # 統計
    categoryStats: CustomCategoryStats!

    # AI 提示詞生成
    generateIslandPrompt(nameChinese: String!, emoji: String): IslandPromptSuggestion!
    generateSubcategoryPrompt(nameChinese: String!, emoji: String, islandName: String): SubcategoryPromptSuggestion!
  }

  extend type Mutation {
    # 初始化分類系統（首次使用）
    initializeCategories: CustomCategoryStats!

    # 島嶼管理
    createIsland(input: CreateIslandInput!): Island!
    updateIsland(id: ID!, input: UpdateIslandInput!): Island!
    deleteIsland(id: ID!): Boolean!
    reorderIslands(islandIds: [ID!]!): Boolean!

    # 小類別管理
    createSubcategory(input: CreateSubcategoryInput!): Subcategory!
    updateSubcategory(id: ID!, input: UpdateSubcategoryInput!): Subcategory!
    deleteSubcategory(id: ID!): Boolean!
    reorderSubcategories(subcategoryIds: [ID!]!): Boolean!
  }
`
