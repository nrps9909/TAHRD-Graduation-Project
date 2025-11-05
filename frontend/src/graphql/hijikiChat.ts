/**
 * Hijiki Chat GraphQL Queries and Mutations
 * 黑噗噗知識查詢聊天功能
 */

import { gql } from '@apollo/client'

/**
 * 與黑噗噗對話 - RAG 知識查詢
 */
export const CHAT_WITH_HIJIKI = gql`
  query ChatWithHijiki($sessionId: String!, $query: String!, $maxContext: Int) {
    chatWithHijiki(sessionId: $sessionId, query: $query, maxContext: $maxContext) {
      answer
      sources {
        memoryId
        title
        relevance
      }
      conversationHistory {
        role
        content
        timestamp
      }
    }
  }
`

/**
 * 語義搜索 - 基於向量相似度搜尋記憶
 */
export const SEMANTIC_SEARCH = gql`
  query SemanticSearch($query: String!, $limit: Int, $minSimilarity: Float) {
    semanticSearch(query: $query, limit: $limit, minSimilarity: $minSimilarity) {
      results {
        memoryId
        title
        content
        tags
        similarity
      }
      totalCount
    }
  }
`

/**
 * 獲取知識庫統計和分析
 */
export const GET_KNOWLEDGE_ANALYTICS = gql`
  query GetKnowledgeAnalytics($period: String) {
    getKnowledgeAnalytics(period: $period) {
      total
      byCategory
      byMonth {
        month
        count
      }
      averageImportance
      topTags {
        tag
        count
      }
      recentGrowth {
        thisWeek
        lastWeek
        growthRate
      }
    }
  }
`

/**
 * 獲取用戶的所有對話會話
 */
export const GET_HIJIKI_SESSIONS = gql`
  query GetHijikiSessions {
    getHijikiSessions {
      id
      sessionId
      title
      mode
      totalQueries
      lastActiveAt
      isActive
    }
  }
`

/**
 * 獲取特定對話會話的詳細資訊（包含訊息）
 */
export const GET_HIJIKI_SESSION = gql`
  query GetHijikiSession($sessionId: String!) {
    getHijikiSession(sessionId: $sessionId) {
      id
      sessionId
      title
      mode
      messages {
        role
        content
        timestamp
      }
      totalQueries
      lastActiveAt
      isActive
    }
  }
`

/**
 * 批量生成向量嵌入
 */
export const GENERATE_EMBEDDINGS = gql`
  mutation GenerateEmbeddings($limit: Int) {
    generateEmbeddings(limit: $limit) {
      success
      count
      message
    }
  }
`

/**
 * 清空對話會話
 */
export const CLEAR_HIJIKI_SESSION = gql`
  mutation ClearHijikiSession($sessionId: String!) {
    clearHijikiSession(sessionId: $sessionId)
  }
`

// TypeScript 類型定義
export interface HijikiChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface MemorySource {
  memoryId: string
  title: string
  relevance: number
}

export interface HijikiChatResponse {
  answer: string
  sources: MemorySource[]
  conversationHistory: HijikiChatMessage[]
}

export interface SemanticSearchResult {
  memoryId: string
  title: string
  content: string
  tags: string[]
  similarity: number
}

export interface KnowledgeAnalytics {
  total: number
  byCategory: Record<string, number>
  byMonth: Array<{ month: string; count: number }>
  averageImportance: number
  topTags: Array<{ tag: string; count: number }>
  recentGrowth: {
    thisWeek: number
    lastWeek: number
    growthRate: number
  }
}

export interface HijikiSession {
  id: string
  sessionId: string
  title: string
  mode: string
  totalQueries: number
  lastActiveAt: string
  isActive: boolean
}
