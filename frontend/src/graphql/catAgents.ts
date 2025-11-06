import { gql } from '@apollo/client'

/**
 * Cat Agent GraphQL Queries and Mutations
 *
 * Tororo (小白) - 知識園丁，負責創建和種植記憶
 * Hijiki (小黑) - 知識管理員，負責搜尋和統計
 */

// ============ Tororo Mutations ============

/**
 * 使用 Tororo 創建記憶
 */
export const CREATE_MEMORY_WITH_TORORO = gql`
  mutation CreateMemoryWithTororo(
    $content: String!
    $files: [TororoFileInput!]
    $links: [TororoLinkInput!]
  ) {
    createMemoryWithTororo(content: $content, files: $files, links: $links) {
      success
      greeting
      suggestion
      encouragement
      memory {
        id
        title
        emoji
        islandName
        islandEmoji
        importance
        summary
      }
      flower {
        id
        type
        size
        position {
          x
          y
          z
        }
      }
      error
    }
  }
`

// ============ Hijiki Queries ============

/**
 * 使用 Hijiki 搜尋記憶
 */
export const SEARCH_MEMORIES_WITH_HIJIKI = gql`
  query SearchMemoriesWithHijiki(
    $query: String!
    $type: String
    $filters: HijikiFilterInput
  ) {
    searchMemoriesWithHijiki(query: $query, type: $type, filters: $filters) {
      success
      summary
      resultCount
      results {
        id
        title
        emoji
        islandName
        islandEmoji
        importance
        date
        summary
        tags
      }
      insights
      suggestions
      error
    }
  }
`

/**
 * 使用 Hijiki 獲取統計資料
 */
export const GET_STATISTICS_WITH_HIJIKI = gql`
  query GetStatisticsWithHijiki($period: String = "month") {
    getStatisticsWithHijiki(period: $period) {
      success
      summary
      statistics {
        total
        change
        distribution
        averageImportance
        topTags
      }
      insights
      suggestions
    }
  }
`

// ============ TypeScript Types ============

export interface TororoFileInput {
  url: string
  name: string
  type: string
}

export interface TororoLinkInput {
  url: string
  title?: string
}

export interface TororoResponse {
  success: boolean
  greeting: string
  suggestion: string
  encouragement: string
  memory?: {
    id: string
    title: string
    emoji: string
    islandName: string
    islandEmoji: string
    importance: number
    summary: string
  }
  flower?: {
    id: string
    type: string
    size: number
    position: {
      x: number
      y: number
      z: number
    }
  }
  error?: string
}

export interface HijikiFilterInput {
  islandIds?: string[]
  tags?: string[]
  dateRange?: {
    start: string
    end: string
  }
}

export interface HijikiSearchResult {
  id: string
  title: string
  emoji: string
  islandName: string
  islandEmoji: string
  importance: number
  date: string
  summary: string
  tags: string[]
}

export interface HijikiSearchResponse {
  success: boolean
  summary: string
  resultCount: number
  results: HijikiSearchResult[]
  insights?: string[]
  suggestions?: string[]
  error?: string
}

export interface StatisticsData {
  total: number
  change: string
  distribution: Record<string, number>
  averageImportance: number
  topTags: string[]
}

export interface HijikiStatisticsResponse {
  success: boolean
  summary: string
  statistics: StatisticsData
  insights: string[]
  suggestions: string[]
}
