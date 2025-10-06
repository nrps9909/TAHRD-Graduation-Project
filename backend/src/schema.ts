import { gql } from 'graphql-tag'

export const typeDefs = gql`
  scalar DateTime
  scalar JSON

  # ============ Core Types ============

  type User {
    id: ID!
    username: String!
    email: String!
    displayName: String
    avatarUrl: String
    isActive: Boolean!
    lastLogin: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!

    # Relations
    memories: [Memory!]!
    chatMessages: [ChatMessage!]!
    settings: UserSettings
  }

  type UserSettings {
    id: ID!
    theme: String!
    language: String!
    defaultView: String!
    emailNotifications: Boolean!
    dataRetentionDays: Int!
    updatedAt: DateTime!
  }

  # ============ Assistant System ============

  enum AssistantType {
    CHIEF       # 總管（智能分配 + 全局摘要）
    LEARNING    # 學習筆記
    INSPIRATION # 靈感創意
    WORK        # 工作事務
    SOCIAL      # 人際關係
    LIFE        # 生活記錄
    GOALS       # 目標規劃
    RESOURCES   # 資源收藏
  }

  type Assistant {
    id: ID!
    type: AssistantType!
    name: String!
    nameChinese: String!
    emoji: String!
    color: String!

    # AI Configuration
    systemPrompt: String!
    personality: String!
    chatStyle: String!

    # 3D Position (for Island View)
    position: Location!

    # Statistics
    totalMemories: Int!
    totalChats: Int!

    # Status
    isActive: Boolean!

    # Timestamps
    createdAt: DateTime!
    updatedAt: DateTime!

    # Relations
    memories: [Memory!]!
    chatMessages: [ChatMessage!]!
  }

  type Location {
    x: Float!
    y: Float!
    z: Float!
  }

  # ============ Memory System ============

  type Memory {
    id: ID!
    userId: ID!
    assistantId: ID!

    # Content
    rawContent: String!
    summary: String

    # AI Processing
    keyPoints: [String!]!
    aiSentiment: String
    aiImportance: Int!

    # Classification
    category: AssistantType!
    tags: [String!]!

    # Metadata
    title: String
    emoji: String

    # Relations
    relatedMemoryIds: [ID!]!
    relatedMemories: [Memory!]!

    # Status
    isArchived: Boolean!
    isPinned: Boolean!

    # Timestamps
    createdAt: DateTime!
    updatedAt: DateTime!
    archivedAt: DateTime

    # Relations
    user: User!
    assistant: Assistant!
    chatMessages: [ChatMessage!]!
  }

  # ============ Chat System ============

  enum ChatContextType {
    MEMORY_CREATION  # 創建新記憶
    MEMORY_QUERY     # 查詢記憶
    GENERAL_CHAT     # 一般對話
    SUMMARY_REQUEST  # 請求摘要（Chief Agent）
    CLASSIFICATION   # 分類請求（Chief Agent）
  }

  type ChatMessage {
    id: ID!
    userId: ID!
    assistantId: ID!

    # Content
    userMessage: String!
    assistantResponse: String!

    # Context
    memoryId: ID
    contextType: ChatContextType!

    # Metadata
    tokenCount: Int
    processingTime: Float

    # Timestamps
    createdAt: DateTime!

    # Relations
    user: User!
    assistant: Assistant!
    memory: Memory
  }

  # ============ Tag System ============

  type Tag {
    id: ID!
    name: String!
    nameChinese: String
    usageCount: Int!
    color: String
    category: AssistantType
    createdAt: DateTime!
    lastUsed: DateTime!
  }

  # ============ Analytics ============

  type DailySummary {
    id: ID!
    userId: ID!
    date: DateTime!

    # Statistics
    memoriesCreated: Int!
    chatsCount: Int!
    mostUsedAssistant: String
    topTags: [String!]!

    # AI Summary
    daySummary: String
    mood: String
    highlights: [String!]!

    # Timestamps
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type WeeklySummary {
    startDate: DateTime!
    endDate: DateTime!
    totalMemories: Int!
    totalChats: Int!
    categoryBreakdown: [CategoryStats!]!
    topTags: [TagUsage!]!
    aiSummary: String!
  }

  type CategoryStats {
    category: AssistantType!
    count: Int!
    percentage: Float!
  }

  type TagUsage {
    tag: String!
    count: Int!
  }

  # ============ Response Types ============

  type CreateMemoryResponse {
    memory: Memory!
    chat: ChatMessage!
    suggestedTags: [String!]!
    relatedMemories: [Memory!]!
  }

  type ClassificationResult {
    suggestedCategory: AssistantType!
    confidence: Float!
    reason: String!
    alternativeCategories: [AssistantType!]!
  }

  type ChiefSummaryResponse {
    weeklyStats: WeeklySummary!
    crossDomainInsights: [Insight!]!
    suggestions: [String!]!
  }

  type Insight {
    title: String!
    description: String!
    relatedMemories: [Memory!]!
    actionable: Boolean!
  }

  # ============ Inputs ============

  input RegisterInput {
    username: String!
    email: String!
    password: String!
    displayName: String
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input CreateMemoryInput {
    assistantId: ID!
    content: String!
    contextType: ChatContextType = MEMORY_CREATION
  }

  input UpdateMemoryInput {
    title: String
    tags: [String!]
    isPinned: Boolean
    isArchived: Boolean
  }

  input MemoryFilterInput {
    assistantId: ID
    category: AssistantType
    tags: [String!]
    search: String
    isPinned: Boolean
    isArchived: Boolean
    startDate: DateTime
    endDate: DateTime
  }

  input ChatWithAssistantInput {
    assistantId: ID!
    message: String!
    contextType: ChatContextType = GENERAL_CHAT
    memoryId: ID
  }

  # ============ Queries ============

  type Query {
    # ===== User Queries =====
    me: User

    # ===== Assistant Queries =====
    assistants: [Assistant!]!
    assistant(id: ID!): Assistant
    assistantByType(type: AssistantType!): Assistant
    chiefAssistant: Assistant

    # ===== Memory Queries =====
    memories(filter: MemoryFilterInput, limit: Int = 50, offset: Int = 0): [Memory!]!
    memory(id: ID!): Memory
    searchMemories(query: String!, limit: Int = 20): [Memory!]!
    relatedMemories(memoryId: ID!, limit: Int = 5): [Memory!]!
    pinnedMemories: [Memory!]!

    # ===== Chat Queries =====
    chatHistory(assistantId: ID, limit: Int = 50): [ChatMessage!]!
    chatMessage(id: ID!): ChatMessage

    # ===== Tag Queries =====
    tags(limit: Int = 100): [Tag!]!
    tagCloud: [TagUsage!]!

    # ===== Analytics Queries =====
    dailySummary(date: DateTime!): DailySummary
    weeklySummary(startDate: DateTime!): WeeklySummary
    monthlyStats: JSON

    # ===== Chief Agent Special Queries =====
    chiefSummary(days: Int = 7): ChiefSummaryResponse!
    classifyContent(content: String!): ClassificationResult!
  }

  # ============ Mutations ============

  type Mutation {
    # ===== Auth Mutations =====
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    logout: Boolean!

    # ===== Memory Mutations =====
    createMemory(input: CreateMemoryInput!): CreateMemoryResponse!
    updateMemory(id: ID!, input: UpdateMemoryInput!): Memory!
    deleteMemory(id: ID!): Boolean!
    archiveMemory(id: ID!): Memory!
    unarchiveMemory(id: ID!): Memory!
    pinMemory(id: ID!): Memory!
    unpinMemory(id: ID!): Memory!
    linkMemories(memoryId: ID!, relatedIds: [ID!]!): Memory!

    # ===== Chat Mutations =====
    chatWithAssistant(input: ChatWithAssistantInput!): ChatMessage!

    # ===== Chief Agent Special Mutations =====
    classifyAndCreate(content: String!): CreateMemoryResponse!
    generateDailySummary(date: DateTime!): DailySummary!

    # ===== Settings Mutations =====
    updateUserSettings(theme: String, language: String, defaultView: String): UserSettings!
  }

  # ============ Subscriptions ============

  type Subscription {
    # Real-time memory updates
    memoryCreated(userId: ID!): Memory!
    memoryUpdated(userId: ID!): Memory!

    # Real-time chat updates
    chatMessageReceived(userId: ID!): ChatMessage!

    # Daily summary generated
    dailySummaryGenerated(userId: ID!): DailySummary!
  }

  # ============ Auth Payload ============

  type AuthPayload {
    token: String!
    user: User!
  }

  # ============ Legacy Types (保留以支援資料遷移) ============

  enum Category {
    GOSSIP
    FUTURE_IDEAS
    DAILY_LIFE
    STUDY
    FRIENDS
    RELATIONSHIPS
    OTHER
  }

  type MemoryEntry {
    id: ID!
    rawContent: String!
    summary: String!
    keyPoints: [String!]!
    tags: [String!]!
    category: Category!
    processedBy: String!
    importance: Int!
    sentiment: String
    createdAt: DateTime!
  }

  type AIAgent {
    id: ID!
    name: String!
    emoji: String!
    color: String!
    personality: String!
    category: Category
    messageCount: Int!
    memoryCount: Int!
  }
`
