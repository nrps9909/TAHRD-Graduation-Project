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
    subcategoryCount
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

export const SUBCATEGORY_FRAGMENT = gql`
  fragment SubcategoryFields on Subcategory {
    id
    userId
    islandId
    position
    name
    nameChinese
    emoji
    color
    description
    systemPrompt
    personality
    chatStyle
    keywords
    memoryCount
    chatCount
    isActive
    createdAt
    updatedAt
  }
`

// ============ Queries ============

export const GET_ISLANDS = gql`
  ${ISLAND_FRAGMENT}
  ${SUBCATEGORY_FRAGMENT}
  query GetIslands {
    islands {
      ...IslandFields
      subcategories {
        ...SubcategoryFields
      }
    }
  }
`

export const GET_ISLAND = gql`
  ${ISLAND_FRAGMENT}
  ${SUBCATEGORY_FRAGMENT}
  query GetIsland($id: ID!) {
    island(id: $id) {
      ...IslandFields
      subcategories {
        ...SubcategoryFields
      }
    }
  }
`

export const GET_SUBCATEGORIES = gql`
  ${SUBCATEGORY_FRAGMENT}
  query GetSubcategories($islandId: ID) {
    subcategories(islandId: $islandId) {
      ...SubcategoryFields
      island {
        id
        nameChinese
        emoji
        color
      }
    }
  }
`

export const GET_SUBCATEGORY = gql`
  ${SUBCATEGORY_FRAGMENT}
  query GetSubcategory($id: ID!) {
    subcategory(id: $id) {
      ...SubcategoryFields
      island {
        id
        nameChinese
        emoji
        color
      }
    }
  }
`

export const GET_CATEGORY_STATS = gql`
  query GetCategoryStats {
    categoryStats {
      islandsCount
      subcategoriesCount
      totalMemories
    }
  }
`

// ============ Mutations ============

export const INITIALIZE_CATEGORIES = gql`
  mutation InitializeCategories {
    initializeCategories {
      islandsCount
      subcategoriesCount
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

export const CREATE_SUBCATEGORY = gql`
  ${SUBCATEGORY_FRAGMENT}
  mutation CreateSubcategory($input: CreateSubcategoryInput!) {
    createSubcategory(input: $input) {
      ...SubcategoryFields
    }
  }
`

export const UPDATE_SUBCATEGORY = gql`
  ${SUBCATEGORY_FRAGMENT}
  mutation UpdateSubcategory($id: ID!, $input: UpdateSubcategoryInput!) {
    updateSubcategory(id: $id, input: $input) {
      ...SubcategoryFields
    }
  }
`

export const DELETE_SUBCATEGORY = gql`
  mutation DeleteSubcategory($id: ID!) {
    deleteSubcategory(id: $id)
  }
`

export const REORDER_SUBCATEGORIES = gql`
  mutation ReorderSubcategories($subcategoryIds: [ID!]!) {
    reorderSubcategories(subcategoryIds: $subcategoryIds)
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
  subcategoryCount: number
  memoryCount: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  subcategories?: Subcategory[]

  // 3D 配置（可選）
  customShapeData?: string | null
  islandHeight?: number | null
  islandBevel?: number | null
}

export interface Subcategory {
  id: string
  userId: string
  islandId: string
  position: number
  name: string | null
  nameChinese: string
  emoji: string
  color: string
  description?: string
  systemPrompt: string
  personality: string
  chatStyle: string
  keywords: string[]
  memoryCount: number
  chatCount: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  island?: {
    id: string
    nameChinese: string
    emoji: string
    color: string
  }
}

export interface CategoryStats {
  islandsCount: number
  subcategoriesCount: number
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

export interface CreateSubcategoryInput {
  islandId: string
  name?: string | null
  nameChinese: string
  emoji?: string
  color?: string
  description?: string
  keywords?: string[]
  systemPrompt: string
  personality: string
  chatStyle: string
}

export interface UpdateSubcategoryInput {
  islandId?: string
  name?: string
  nameChinese?: string
  emoji?: string
  color?: string
  description?: string
  keywords?: string[]
  systemPrompt?: string
  personality?: string
  chatStyle?: string
  position?: number
  isActive?: boolean
}
