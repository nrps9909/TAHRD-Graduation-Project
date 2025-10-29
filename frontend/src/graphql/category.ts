/**
 * Category Management GraphQL Queries and Mutations
 * 分類管理的 GraphQL 操作
 */

import { gql } from '@apollo/client'

// ============ Fragments ============

export const ISLAND_FRAGMENT = gql`
  fragment IslandFields on Island {
    id
    userId
    position
    name
    nameChinese
    emoji
    color
    description
    positionX
    positionY
    positionZ
    memoryCount
    isActive
    createdAt
    updatedAt

    # 3D 配置（可選）
    customShapeData
    islandHeight
    islandBevel
  }
`

// ============ Queries ============

export const GET_ISLANDS = gql`
  ${ISLAND_FRAGMENT}
  query GetIslands {
    islands {
      ...IslandFields
    }
  }
`

export const GET_ISLAND = gql`
  ${ISLAND_FRAGMENT}
  query GetIsland($id: ID!) {
    island(id: $id) {
      ...IslandFields
    }
  }
`

export const GET_CATEGORY_STATS = gql`
  query GetCategoryStats {
    categoryStats {
      islandsCount
      totalMemories
    }
  }
`

// ============ Mutations ============

export const INITIALIZE_CATEGORIES = gql`
  mutation InitializeCategories {
    initializeCategories {
      islandsCount
      totalMemories
    }
  }
`

export const CREATE_ISLAND = gql`
  ${ISLAND_FRAGMENT}
  mutation CreateIsland($input: CreateIslandInput!) {
    createIsland(input: $input) {
      ...IslandFields
    }
  }
`

export const UPDATE_ISLAND = gql`
  ${ISLAND_FRAGMENT}
  mutation UpdateIsland($id: ID!, $input: UpdateIslandInput!) {
    updateIsland(id: $id, input: $input) {
      ...IslandFields
    }
  }
`

export const DELETE_ISLAND = gql`
  mutation DeleteIsland($id: ID!) {
    deleteIsland(id: $id)
  }
`

export const REORDER_ISLANDS = gql`
  mutation ReorderIslands($islandIds: [ID!]!) {
    reorderIslands(islandIds: $islandIds)
  }
`

// ============ AI Prompt Generation ============

export const GENERATE_ISLAND_PROMPT = gql`
  query GenerateIslandPrompt($nameChinese: String!, $emoji: String) {
    generateIslandPrompt(nameChinese: $nameChinese, emoji: $emoji) {
      description
      keywords
    }
  }
`

// ============ TypeScript Types ============

export interface Island {
  id: string
  userId: string
  position: number
  name: string
  nameChinese: string
  emoji: string
  color: string
  description?: string
  positionX: number
  positionY: number
  positionZ: number
  memoryCount: number
  isActive: boolean
  createdAt: string
  updatedAt: string

  // 3D 配置（可選）
  customShapeData?: string | null
  islandHeight?: number | null
  islandBevel?: number | null
}

export interface CategoryStats {
  islandsCount: number
  totalMemories: number
}

export interface CreateIslandInput {
  name: string
  nameChinese: string
  emoji?: string
  color?: string
  description?: string
  positionX?: number
  positionY?: number
  positionZ?: number
}

export interface UpdateIslandInput {
  name?: string
  nameChinese?: string
  emoji?: string
  color?: string
  description?: string
  positionX?: number
  positionY?: number
  positionZ?: number
  position?: number

  // 3D 外觀配置（可選）
  customShapeData?: string | null
  islandHeight?: number | null
  islandBevel?: number | null
}
