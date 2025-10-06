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
  summary?: string
  title: string
  emoji: string
  category: MemoryCategory
  tags: string[]
  keyPoints?: string[]
  aiSentiment?: string
  aiImportance: number
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
  category?: MemoryCategory
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
