export type MemoryCategory =
  | 'LEARNING'
  | 'INSPIRATION'
  | 'WORK'
  | 'SOCIAL'
  | 'LIFE'
  | 'GOALS'
  | 'RESOURCES'

export interface Memory {
  id: string
  rawContent: string
  summary?: string  // Chief 的簡要摘要
  title: string
  emoji: string
  category: MemoryCategory  // 類別
  tags: string[]  // Hashtags
  keyPoints?: string[]  // 重點分析
  aiSentiment?: string
  aiAnalysis?: string  // SubAgent 的評估說明
  rawData?: string  // 原始對話記錄
  // SubAgent 深度分析結果（新增）
  detailedSummary?: string  // SubAgent 的詳細摘要（2-3句話）
  importanceScore?: number  // 1-10 重要性評分
  actionableAdvice?: string  // 行動建議
  // 社交成長紀錄專用字段（針對人際關係分類）
  socialContext?: string  // [情境] 簡述當下發生什麼
  userReaction?: string  // [使用者反應] 情緒或行為反應
  aiFeedback?: string  // [AI 回饋] 建議或安撫
  socialSkillTags?: string[]  // [社交能力標籤]
  progressChange?: number  // [進度變化] +1/0/-1
  isPinned: boolean
  isArchived: boolean
  createdAt: string
  updatedAt: string
  assistant?: {
    id: string
    name: string
    nameChinese: string
    emoji: string
    color: string
  }
  relatedMemories?: RelatedMemoryPreview[]
  chatMessages?: ChatMessage[]
}

export interface RelatedMemoryPreview {
  id: string
  title: string
  emoji: string
  category: MemoryCategory
  summary?: string
}

export type ContextType =
  | 'MEMORY_CREATION'
  | 'MEMORY_QUERY'
  | 'GENERAL_CHAT'
  | 'SUMMARY_REQUEST'

export interface ChatMessage {
  id: string
  userMessage: string
  assistantResponse: string
  contextType: ContextType
  createdAt: string
  assistant?: {
    id: string
    name: string
    nameChinese: string
    emoji: string
  }
  memory?: {
    id: string
    title: string
    emoji: string
  }
}

export interface MemoryFilterInput {
  category?: MemoryCategory
  tags?: string[]
  assistantId?: string
  isPinned?: boolean
  isArchived?: boolean
  startDate?: string
  endDate?: string
  searchQuery?: string
}

export interface CreateMemoryInput {
  rawContent: string
  assistantId?: string
}

export interface UpdateMemoryInput {
  rawContent?: string
  summary?: string
  title?: string
  emoji?: string
  category?: MemoryCategory  // 主分類
  tags?: string[]
  keyPoints?: string[]
  isPinned?: boolean
  isArchived?: boolean
}

export interface CreateMemoryResponse {
  memory: Memory
  chat?: ChatMessage
  suggestedTags: string[]
  relatedMemories: RelatedMemoryPreview[]
}

export interface ChatWithAssistantInput {
  assistantId: string
  message: string
  memoryId?: string
  contextType?: ContextType
}
