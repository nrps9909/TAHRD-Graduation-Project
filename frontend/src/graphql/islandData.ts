/**
 * 島嶼數據查詢 - 獲取所有記憶並按類別分配到島嶼
 */

import { gql } from '@apollo/client'

/**
 * 獲取所有記憶（用於島嶼系統）
 * 不限制助手，獲取用戶的全部記憶
 */
export const GET_ALL_MEMORIES = gql`
  query GetAllMemories {
    memories {
      id
      title
      summary
      rawContent
      category
      tags
      emoji
      createdAt
      islandId
      island {
        id
        nameChinese
        emoji
      }
    }
  }
`

/**
 * 獲取特定類別的記憶
 */
export const GET_MEMORIES_BY_CATEGORY = gql`
  query GetMemoriesByCategory($category: MemoryCategory!) {
    memories(filter: { category: $category }) {
      id
      title
      summary
      category
      tags
      createdAt
    }
  }
`

/**
 * 獲取特定島嶼的所有記憶
 */
export const GET_ISLAND_MEMORIES = gql`
  query GetIslandMemories($islandId: ID!) {
    memories(filter: { islandId: $islandId }) {
      id
      title
      category
      tags
      createdAt
    }
  }
`
