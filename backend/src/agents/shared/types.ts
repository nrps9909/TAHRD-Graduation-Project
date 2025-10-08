/**
 * 雙貓系統 - 共用類型定義
 */

import { AssistantType } from '@prisma/client'

// ============ 貓咪類型 ============

export enum CatAgent {
  TORORO = 'tororo',  // 創作者 - 負責上傳知識
  HIJIKI = 'hijiki'   // 管理員 - 負責查閱知識
}

export interface CatProfile {
  id: CatAgent
  name: string
  nameChinese: string
  nameJapanese: string
  color: string
  emoji: string
  role: string
  description: string
}

// ============ 島嶼分區 ============

export interface IslandRegion {
  id: AssistantType
  name: string
  emoji: string
  color: string
  description: string
  flowerType: string
  environment: string
  position: {
    x: number
    y: number
    z: number
  }
}

// ============ 記憶花 ============

export interface MemoryFlower {
  id: string
  memoryId: string
  type: string        // 花朵種類（根據分類）
  size: number        // 根據重要度（0.6 - 2.0）
  opacity: number     // 根據最近訪問時間（0.3 - 1.0）
  glowIntensity: number  // 根據是否釘選（0 - 1）
  swaySpeed: number   // 微風搖擺速度
  bloomStage: number  // 綻放階段（0 - 1）
  isPinned: boolean
  isNew: boolean      // 3天內的新花
  relatedCount: number  // 關聯記憶數量
  position: {
    x: number
    y: number
    z: number
  }
}

// ============ Tororo 相關類型 ============

export interface TororoCreateInput {
  userId: string
  content: string
  contentType?: 'text' | 'image' | 'document' | 'link' | 'mixed'
  fileUrls?: string[]
  fileNames?: string[]
  fileTypes?: string[]
  links?: string[]
  linkTitles?: string[]
}

export interface TororoAnalysisResult {
  greeting: string
  analysis: {
    category: AssistantType
    importance: number  // 1-10
    tags: string[]
    title: string
    emoji: string
    summary: string
    keyPoints: string[]
    sentiment: 'positive' | 'neutral' | 'negative'
  }
  suggestion: string
  relatedHint?: string
  encouragement: string
}

export interface TororoCreateResponse {
  success: boolean
  memory?: {
    id: string
    title: string
    emoji: string
    category: AssistantType
    flower: MemoryFlower
  }
  message: string
  error?: string
}

// ============ Hijiki 相關類型 ============

export enum HijikiQueryType {
  KEYWORD_SEARCH = 'keyword_search',
  TIME_RANGE = 'time_range',
  CATEGORY = 'category',
  STATISTICS = 'statistics',
  TREND_ANALYSIS = 'trend_analysis',
  RELATED = 'related'
}

export interface HijikiQueryInput {
  userId: string
  type: HijikiQueryType
  query: string
  filters?: {
    categories?: AssistantType[]
    tags?: string[]
    dateRange?: {
      start: Date
      end: Date
    }
    importance?: {
      min: number
      max: number
    }
    isPinned?: boolean
  }
  sortBy?: 'time' | 'importance' | 'relevance'
  limit?: number
}

export interface HijikiSearchResult {
  id: string
  title: string
  emoji: string
  category: AssistantType
  importance: number
  date: string
  summary: string
  relevance?: number  // 0-1, 只在關鍵字搜尋時有
  tags: string[]
}

export interface HijikiSearchResponse {
  status: 'success' | 'empty' | 'error'
  query: {
    type: HijikiQueryType
    keywords?: string[]
    filters?: any
  }
  summary: string
  results: HijikiSearchResult[]
  resultCount: number
  insights?: string[]
  suggestions?: string[]
  message?: string
}

export interface HijikiStatisticsResponse {
  status: 'success'
  query: {
    type: 'statistics'
    period: 'day' | 'week' | 'month' | 'year'
    year: number
    month?: number
  }
  summary: string
  statistics: {
    total: number
    change: string  // "+15%", "-5%", "new"
    distribution: Record<string, { count: number; percentage: number }>
    mostActiveDay?: string
    averageImportance: number
    topTags: string[]
  }
  insights: string[]
  suggestions: string[]
}

export interface HijikiTrendResponse {
  status: 'success'
  query: {
    type: 'trend_analysis'
    period: string
  }
  summary: string
  trends: {
    hotTopics: Array<{
      topic: string
      count: number
      change: string
    }>
    growingTopics: string[]
    decliningTopics: string[]
  }
  insights: string[]
  suggestions: string[]
}

// ============ 對話系統 ============

export enum ChatMode {
  CREATE = 'create',    // Tororo 模式
  SEARCH = 'search',    // Hijiki 模式
  GENERAL = 'general'   // 一般對話
}

export interface ChatMessage {
  id: string
  catAgent: CatAgent
  mode: ChatMode
  userMessage: string
  catResponse: string
  metadata?: any
  timestamp: Date
}

export interface ChatSessionOptions {
  userId: string
  catAgent: CatAgent
  mode: ChatMode
  context?: {
    memoryId?: string
    previousMessages?: ChatMessage[]
  }
}

// ============ API 響應類型 ============

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    timestamp: Date
    processingTime: number
    catAgent: CatAgent
  }
}

// ============ 配置類型 ============

export interface CatAgentConfig {
  geminiApiKey: string
  model: string
  temperature: number
  maxTokens: number
  timeout: number
}

export interface IslandConfig {
  regions: IslandRegion[]
  flowerTypes: Record<AssistantType, {
    name: string
    model: string  // 3D 模型路徑
    baseSize: number
    baseColor: string
  }>
}
