export type AssistantType =
  | 'CHIEF'
  | 'LEARNING'
  | 'INSPIRATION'
  | 'WORK'
  | 'SOCIAL'
  | 'LIFE'
  | 'GOALS'
  | 'RESOURCES'

export interface Position {
  x: number
  y: number
  z: number
}

export interface Assistant {
  id: string
  type: AssistantType
  name: string
  nameChinese: string
  emoji: string
  color: string
  systemPrompt: string
  personality: string
  chatStyle: string
  position: Position
  totalMemories: number
  totalChats: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ClassificationResult {
  suggestedCategory: AssistantType
  confidence: number
  reason: string
  alternativeCategories: AssistantType[]
}

export interface CategoryBreakdown {
  category: string
  count: number
  percentage: number
}

export interface TopTag {
  tag: string
  count: number
}

export interface WeeklyStats {
  startDate: string
  endDate: string
  totalMemories: number
  totalChats: number
  categoryBreakdown: CategoryBreakdown[]
  topTags: TopTag[]
  aiSummary: string
}

export interface RelatedMemoryPreview {
  id: string
  title: string
  emoji: string
}

export interface CrossDomainInsight {
  title: string
  description: string
  relatedMemories: RelatedMemoryPreview[]
  actionable: boolean
}

export interface ChiefSummaryResponse {
  weeklyStats: WeeklyStats
  crossDomainInsights: CrossDomainInsight[]
  suggestions: string[]
}
