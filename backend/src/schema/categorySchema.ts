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
    memoryCount: Int!

    # 狀態
    isActive: Boolean!

    # Timestamps
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # 分類統計
  type CustomCategoryStats {
    islandsCount: Int!
    totalMemories: Int!
  }

  # AI 生成的提示詞建議（島嶼）
  type IslandPromptSuggestion {
    description: String!
    keywords: [String!]!
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

  # ============ Extend existing types ============

  extend type Query {
    # 島嶼查詢
    islands: [Island!]!
    island(id: ID!): Island

    # 統計
    categoryStats: CustomCategoryStats!

    # AI 提示詞生成
    generateIslandPrompt(nameChinese: String!, emoji: String, userHint: String): IslandPromptSuggestion!
  }

  extend type Mutation {
    # 初始化分類系統（首次使用）
    initializeCategories: CustomCategoryStats!

    # 島嶼管理
    createIsland(input: CreateIslandInput!): Island!
    updateIsland(id: ID!, input: UpdateIslandInput!): Island!
    deleteIsland(id: ID!): Boolean!
    reorderIslands(islandIds: [ID!]!): Boolean!
  }
`
