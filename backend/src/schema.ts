import { gql } from 'graphql-tag'
import { categoryTypeDefs } from './schema/categorySchema'

const baseTypeDefs = gql`
  scalar DateTime
  scalar JSON

  # ============ Core Types ============

  enum UserRole {
    USER
    ADMIN
  }

  type User {
    id: ID!
    username: String!
    email: String!
    role: UserRole!
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

  # ============ Category System ============
  # 已遷移到 Island-based 分類系統（見 categorySchema.ts）

  # ============ Memory System ============

  enum ContentType {
    TEXT
    IMAGE
    DOCUMENT
    LINK
    MIXED
  }

  type Memory {
    id: ID!
    userId: ID!
    islandId: ID!    # Island ID for island-based memories

    # Content
    rawContent: String!
    summary: String
    contentType: ContentType!

    # Multimodal Content
    fileUrls: [String!]!
    fileNames: [String!]!
    fileTypes: [String!]!
    links: [String!]!
    linkTitles: [String!]!

    # AI Processing
    keyPoints: [String!]!
    aiSentiment: String
    aiAnalysis: String
    rawData: String

    # SubAgent Deep Analysis (新增)
    detailedSummary: String   # SubAgent 的詳細摘要（2-3句話）
    importanceScore: Int      # 1-10 重要性評分
    actionableAdvice: String  # 行動建議

    # Social Growth Record (社交島專用格式)
    socialContext: String     # [情境] 簡述當下發生什麼
    userReaction: String      # [使用者反應] 情緒或行為反應
    aiFeedback: String        # [AI 回饋] 建議或安撫
    socialSkillTags: [String!]!  # [社交能力標籤] #表達情緒 #傾聽 #自我覺察等
    progressChange: Int       # [進度變化] +1/0/-1

    # Classification
    tags: [String!]!

    # Metadata
    title: String
    emoji: String

    # Relations
    relatedMemoryIds: [ID!]!
    relatedMemories: [Memory!]!

    # Distribution Info
    distributionId: ID
    relevanceScore: Float
    distribution: KnowledgeDistribution

    # Status
    isArchived: Boolean!
    isPinned: Boolean!

    # Timestamps
    createdAt: DateTime!
    updatedAt: DateTime!
    archivedAt: DateTime

    # Relations
    user: User!
    island: Island!
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

  type ChatSession {
    id: ID!
    userId: ID!
    islandId: ID!

    # Session Info
    title: String!

    # Metadata
    messageCount: Int!
    totalTokens: Int!

    # Status
    isArchived: Boolean!
    isPinned: Boolean!

    # Timestamps
    createdAt: DateTime!
    updatedAt: DateTime!
    lastMessageAt: DateTime!
    archivedAt: DateTime

    # Relations
    user: User!
    island: Island!
    messages: [ChatMessage!]!
  }

  type ChatMessage {
    id: ID!
    userId: ID!
    islandId: ID!
    sessionId: ID!

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
    island: Island!
    session: ChatSession!
    memory: Memory
  }

  # ============ Tag System ============

  type Tag {
    id: ID!
    name: String!
    nameChinese: String
    usageCount: Int!
    color: String
    createdAt: DateTime!
    lastUsed: DateTime!
  }

  # ============ Knowledge Distribution System ============

  type KnowledgeDistribution {
    id: ID!
    userId: ID!

    # Original Content
    rawContent: String!
    contentType: ContentType!

    # Multimodal Content
    fileUrls: [String!]!
    fileNames: [String!]!
    fileTypes: [String!]!
    links: [String!]!
    linkTitles: [String!]!

    # Chief Agent Analysis
    chiefAnalysis: String!
    chiefSummary: String!
    identifiedTopics: [String!]!
    suggestedTags: [String!]!

    # Distribution Results
    distributedTo: [ID!]!        # Island IDs
    storedBy: [ID!]!             # Island IDs that chose to store

    # Processing Info
    processingTime: Float
    tokenCount: Int

    # Timestamp
    createdAt: DateTime!

    # Relations
    agentDecisions: [AgentDecision!]!
    memories: [Memory!]!
  }

  type AgentDecision {
    id: ID!
    distributionId: ID!
    targetIslandId: ID
    island: Island  # Target island (resolved from targetIslandId)

    # Decision
    relevanceScore: Float!       # 0-1
    shouldStore: Boolean!
    reasoning: String!
    confidence: Float!           # 0-1

    # Classification (if stored)
    suggestedTags: [String!]!
    keyInsights: [String!]!

    # Processing Info
    processingTime: Float

    # Timestamp
    createdAt: DateTime!

    # Relations
    distribution: KnowledgeDistribution!
  }

  # ============ Analytics ============

  type TororoResponsePayload {
    response: String!
    success: Boolean!
  }

  type DailySummary {
    id: ID!
    userId: ID!
    date: DateTime!

    # Statistics
    memoriesCreated: Int!
    chatsCount: Int!
    mostUsedIsland: String
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
    islandId: ID!
    islandName: String!
    islandEmoji: String!
    count: Int!
    percentage: Float!
  }

  type TagUsage {
    tag: String!
    count: Int!
  }

  # ============ Response Types ============

  type UploadKnowledgeResponse {
    distribution: KnowledgeDistribution  # 可為 null（不值得記錄時）
    tororoResponse: TororoQuickResponse!  # 白噗噗的即時回應
    agentDecisions: [AgentDecision!]!
    memoriesCreated: [Memory!]!
    processingTime: Float!
    backgroundProcessing: Boolean!  # 標記是否正在後台處理
  }

  type TororoQuickResponse {
    warmMessage: String!     # 白噗噗的溫暖回應訊息
    islandName: String       # 島嶼名稱（中文）
    islandEmoji: String      # 島嶼 emoji
    quickSummary: String!    # 一句話摘要
    confidence: Float!       # 信心分數
    reasoning: String!       # 分類理由
  }

  type CreateMemoryResponse {
    memory: Memory!
    chat: ChatMessage!
    suggestedTags: [String!]!
    relatedMemories: [Memory!]!
  }

  type ClassificationResult {
    suggestedIslandId: ID
    suggestedIslandName: String
    suggestedIslandEmoji: String
    confidence: Float!
    reason: String!
    alternativeIslandIds: [ID!]!
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

  input FileInput {
    url: String!
    name: String!
    type: String!
    size: Int
  }

  input LinkInput {
    url: String!
    title: String
  }

  input UploadKnowledgeInput {
    content: String!
    files: [FileInput!]
    links: [LinkInput!]
    contentType: ContentType
  }

  input CreateMemoryInput {
    islandId: ID!
    content: String!
    contextType: ChatContextType = MEMORY_CREATION
  }

  input CreateMemoryDirectInput {
    title: String
    content: String!
    tags: [String!]
    islandId: ID
    emoji: String
  }

  input UpdateMemoryInput {
    title: String
    rawContent: String
    emoji: String
    islandId: ID
    tags: [String!]
    fileUrls: [String!]
    fileNames: [String!]
    fileTypes: [String!]
    links: [String!]
    linkTitles: [String!]
    isPinned: Boolean
    isArchived: Boolean
  }

  input MemoryFilterInput {
    islandId: ID
    tags: [String!]
    search: String
    isPinned: Boolean
    isArchived: Boolean
    startDate: DateTime
    endDate: DateTime
  }

  input CreateChatSessionInput {
    islandId: ID!
    title: String
  }

  input UpdateChatSessionInput {
    title: String
    isPinned: Boolean
    isArchived: Boolean
  }

  # ============ Task Queue History ============

  type TaskHistory {
    id: ID!
    userId: ID!
    taskId: String!
    distributionId: ID
    status: String!
    priority: String!
    message: String!
    processingTime: Int
    memoriesCreated: Int!
    categoriesInfo: [CategoryInfo!]!
    errorMessage: String
    startedAt: DateTime!
    completedAt: DateTime!
    createdAt: DateTime!
  }

  type CategoryInfo {
    memoryId: ID!
    categoryName: String!
    categoryEmoji: String!
    islandName: String
  }

  # ============ RAG System Types (小黑知識庫) ============

  type HijikiChatResponse {
    answer: String!
    sources: [MemorySource!]!
    conversationHistory: [ConversationMessage!]!
  }

  type MemorySource {
    memoryId: ID!
    title: String!
    relevance: Float!
  }

  type ConversationMessage {
    role: String!
    content: String!
    timestamp: DateTime!
  }

  type SemanticSearchResponse {
    results: [SemanticSearchResult!]!
    totalCount: Int!
  }

  type SemanticSearchResult {
    memoryId: ID!
    title: String!
    content: String!
    tags: [String!]!
    similarity: Float!
  }

  type KnowledgeAnalyticsResponse {
    total: Int!
    byCategory: JSON!
    byMonth: [MonthlyData!]!
    averageImportance: Float!
    topTags: [TagCount!]!
    recentGrowth: GrowthData!
  }

  type MonthlyData {
    month: String!
    count: Int!
  }

  type TagCount {
    tag: String!
    count: Int!
  }

  type GrowthData {
    thisWeek: Int!
    lastWeek: Int!
    growthRate: Float!
  }

  type HijikiSessionInfo {
    id: ID!
    sessionId: String!
    title: String!
    mode: String!
    totalQueries: Int!
    lastActiveAt: DateTime!
    isActive: Boolean!
  }

  type BatchEmbeddingResponse {
    success: Boolean!
    count: Int!
    message: String!
  }

  # ============ Cat Agent System (Tororo & Hijiki) ============

  type TororoResponse {
    success: Boolean!
    memory: TororoMemoryInfo
    greeting: String!
    suggestion: String!
    encouragement: String!
    flower: FlowerInfo
    error: String
  }

  type TororoMemoryInfo {
    id: ID!
    title: String!
    emoji: String!
    category: String!
    importance: Int!
    summary: String!
  }

  type FlowerInfo {
    id: ID!
    type: String!
    size: Float!
    position: Position3D!
  }

  type Position3D {
    x: Float!
    y: Float!
    z: Float!
  }

  type HijikiSearchResponse {
    success: Boolean!
    summary: String!
    results: [HijikiSearchResult!]!
    resultCount: Int!
    insights: [String!]
    suggestions: [String!]
    error: String
  }

  type HijikiSearchResult {
    id: ID!
    title: String!
    emoji: String!
    category: String!
    importance: Int!
    date: String!
    summary: String!
    tags: [String!]!
  }

  type HijikiStatisticsResponse {
    success: Boolean!
    summary: String!
    statistics: StatisticsData!
    insights: [String!]!
    suggestions: [String!]!
  }

  type StatisticsData {
    total: Int!
    change: String!
    distribution: JSON!
    averageImportance: Float!
    topTags: [String!]!
  }

  input TororoFileInput {
    url: String!
    name: String!
    type: String!
  }

  input TororoLinkInput {
    url: String!
    title: String
  }

  input HijikiFilterInput {
    islandIds: [ID!]
    tags: [String!]
    dateRange: DateRangeInput
  }

  input DateRangeInput {
    start: DateTime!
    end: DateTime!
  }

  # ============ Queries ============

  type Query {
    # ===== User Queries =====
    me: User

    # ===== Memory Queries =====
    memories(filter: MemoryFilterInput, limit: Int = 50, offset: Int = 0): [Memory!]!
    memory(id: ID!): Memory
    searchMemories(query: String!, limit: Int = 20): [Memory!]!
    relatedMemories(memoryId: ID!, limit: Int = 5): [Memory!]!
    pinnedMemories: [Memory!]!

    # ===== Knowledge Distribution Queries =====
    knowledgeDistributions(limit: Int = 20, offset: Int = 0): [KnowledgeDistribution!]!
    knowledgeDistribution(id: ID!): KnowledgeDistribution
    agentDecisions(distributionId: ID!): [AgentDecision!]!

    # ===== Chat Queries =====
    chatSessions(islandId: ID, includeArchived: Boolean = false, limit: Int = 50): [ChatSession!]!
    chatSession(id: ID!): ChatSession
    chatHistory(islandId: ID, limit: Int = 50): [ChatMessage!]!
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

    # ===== Cat Agent Queries (Hijiki) =====
    searchMemoriesWithHijiki(query: String!, type: String, filters: HijikiFilterInput): HijikiSearchResponse!
    getStatisticsWithHijiki(period: String = "month"): HijikiStatisticsResponse!

    # ===== RAG Queries (小黑知識庫) =====
    chatWithHijiki(sessionId: String!, query: String!, maxContext: Int): HijikiChatResponse!
    semanticSearch(query: String!, limit: Int, minSimilarity: Float): SemanticSearchResponse!
    getKnowledgeAnalytics(period: String): KnowledgeAnalyticsResponse!
    getHijikiSessions: [HijikiSessionInfo!]!

    # ===== Task History Queries =====
    taskHistories(limit: Int = 50, offset: Int = 0): [TaskHistory!]!
    taskHistory(id: ID!): TaskHistory

    # ===== Admin Queries (管理員專用) =====
    adminGetAllUsers(limit: Int = 100, offset: Int = 0): AdminUsersResponse!
    adminGetUserById(userId: ID!): AdminUserDetail!
    adminGetUserStats(userId: ID!): AdminUserStats!
    adminGetSystemStats: AdminSystemStats!
  }

  # ============ Admin Types (管理員專用類型) ============

  type AdminUsersResponse {
    users: [AdminUserSummary!]!
    total: Int!
    hasMore: Boolean!
  }

  type AdminUserSummary {
    id: ID!
    username: String!
    email: String!
    role: UserRole!
    displayName: String
    isActive: Boolean!
    lastLogin: DateTime
    createdAt: DateTime!
    memoriesCount: Int!
    islandsCount: Int!
  }

  type AdminUserDetail {
    user: User!
    memoriesCount: Int!
    islandsCount: Int!
    chatSessionsCount: Int!
    totalChatsCount: Int!
    activeIslands: [Island!]!
    recentMemories: [Memory!]!
    accountAge: Int!
  }

  type AdminUserStats {
    userId: ID!
    username: String!
    memoriesByIsland: [IslandMemoryCount!]!
    memoriesOverTime: [DateCount!]!
    topTags: [TagCount!]!
    activityScore: Float!
    averageMemoryImportance: Float!
  }

  type IslandMemoryCount {
    islandId: ID!
    islandName: String!
    islandEmoji: String!
    count: Int!
  }

  type DateCount {
    date: String!
    count: Int!
  }

  type AdminSystemStats {
    totalUsers: Int!
    totalMemories: Int!
    totalIslands: Int!
    totalChatSessions: Int!
    activeUsersToday: Int!
    activeUsersThisWeek: Int!
    activeUsersThisMonth: Int!
    memoriesCreatedToday: Int!
    memoriesCreatedThisWeek: Int!
    memoriesCreatedThisMonth: Int!
    averageMemoriesPerUser: Float!
    averageIslandsPerUser: Float!
  }

  # ============ Mutations ============

  type Mutation {
    # ===== Auth Mutations =====
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    logout: Boolean!

    # ===== Knowledge Distribution Mutations =====
    uploadKnowledge(input: UploadKnowledgeInput!): UploadKnowledgeResponse!

    # ===== Memory Mutations =====
    createMemory(input: CreateMemoryInput!): CreateMemoryResponse!
    createMemoryDirect(input: CreateMemoryDirectInput!): Memory!
    updateMemory(id: ID!, input: UpdateMemoryInput!): Memory!
    deleteMemory(id: ID!): Boolean!
    archiveMemory(id: ID!): Memory!
    unarchiveMemory(id: ID!): Memory!
    pinMemory(id: ID!): Memory!
    unpinMemory(id: ID!): Memory!
    linkMemories(memoryId: ID!, relatedIds: [ID!]!): Memory!

    # ===== Chat Mutations =====
    createChatSession(input: CreateChatSessionInput!): ChatSession!
    updateChatSession(id: ID!, input: UpdateChatSessionInput!): ChatSession!
    deleteChatSession(id: ID!): Boolean!
    archiveChatSession(id: ID!): ChatSession!
    unarchiveChatSession(id: ID!): ChatSession!

    # ===== Chief Agent Special Mutations =====
    classifyAndCreate(content: String!): CreateMemoryResponse!
    generateDailySummary(date: DateTime!): DailySummary!

    # ===== Tororo (白噗噗) AI Mutations =====
    generateTororoResponse(prompt: String!): TororoResponsePayload!

    # ===== Settings Mutations =====
    updateUserSettings(theme: String, language: String, defaultView: String): UserSettings!

    # ===== Cat Agent Mutations (Tororo) =====
    createMemoryWithTororo(content: String!, files: [TororoFileInput!], links: [TororoLinkInput!]): TororoResponse!

    # ===== RAG Mutations (小黑知識庫) =====
    generateEmbeddings(limit: Int): BatchEmbeddingResponse!
    clearHijikiSession(sessionId: String!): Boolean!
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

// Export merged schema
export const typeDefs = [baseTypeDefs, categoryTypeDefs]
