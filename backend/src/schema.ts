import { gql } from 'graphql-tag'

export const typeDefs = gql`
  scalar DateTime
  scalar JSON

  type User {
    id: ID!
    username: String!
    email: String!
    createdAt: DateTime!
    lastLogin: DateTime
    isActive: Boolean!
    relationships: [Relationship!]!
    conversations: [Conversation!]!
    memoryFlowers: [MemoryFlower!]!
    diaryEntries: [DiaryEntry!]!
    worldState: WorldState
  }

  type NPC {
    id: ID!
    name: String!
    personality: String!
    backgroundStory: String
    appearanceConfig: JSON
    currentMood: String!
    location: Location!
    relationships: [Relationship!]!
    conversations: [Conversation!]!
    wishes: [Wish!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Location {
    x: Float!
    y: Float!
    z: Float!
  }

  type Conversation {
    id: ID!
    user: User!
    npc: NPC!
    content: String!
    speakerType: SpeakerType!
    emotionTag: String
    timestamp: DateTime!
    contextEmbedding: [Float!]
  }

  enum SpeakerType {
    USER
    NPC
  }

  type Relationship {
    id: ID!
    user: User!
    npc: NPC!
    relationshipLevel: Int!
    trustLevel: Float!
    affectionLevel: Float!
    lastInteraction: DateTime!
    totalInteractions: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type MemoryFlower {
    id: ID!
    user: User!
    npc: NPC!
    conversation: Conversation!
    flowerType: String!
    emotionColor: String!
    position: Location!
    growthStage: Int!
    createdAt: DateTime!
  }

  type Wish {
    id: ID!
    npc: NPC!
    title: String!
    description: String!
    wishType: WishType!
    isFulfilled: Boolean!
    fulfillmentMethod: String
    priority: Int!
    createdAt: DateTime!
    fulfilledAt: DateTime
    userProgress: [UserWishProgress!]!
  }

  enum WishType {
    COMPANION
    RECONCILIATION
    GROWTH
    DREAM
  }

  type UserWishProgress {
    id: ID!
    user: User!
    wish: Wish!
    progress: Float!
    notes: String
    lastUpdated: DateTime!
  }

  type Letter {
    id: ID!
    senderType: SpeakerType!
    senderId: ID!
    recipientType: SpeakerType!
    recipientId: ID!
    subject: String
    content: String!
    isRead: Boolean!
    sentAt: DateTime!
    readAt: DateTime
  }

  type DiaryEntry {
    id: ID!
    user: User!
    title: String
    content: String!
    mood: String
    isPrivate: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type WorldState {
    id: ID!
    user: User!
    weather: String!
    timeOfDay: Int!
    season: String!
    specialEvents: JSON!
    lastUpdated: DateTime!
  }

  type AIResponse {
    content: String!
    emotionTag: String
    suggectedActions: [String!]
    memoryFlowerData: MemoryFlowerData
    relationshipImpact: RelationshipImpact
  }

  type MemoryFlowerData {
    flowerType: String!
    emotionColor: String!
    position: Location!
  }

  type RelationshipImpact {
    trustChange: Float
    affectionChange: Float
    levelChange: Int
  }

  # Inputs
  input RegisterInput {
    username: String!
    email: String!
    password: String!
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input ConversationInput {
    npcId: ID!
    content: String!
  }

  input LocationInput {
    x: Float!
    y: Float!
    z: Float!
  }

  input DiaryEntryInput {
    title: String
    content: String!
    mood: String
    isPrivate: Boolean = true
  }

  input UpdateWorldStateInput {
    weather: String
    timeOfDay: Int
    season: String
    specialEvents: JSON
  }

  # Query
  type Query {
    # User queries
    me: User
    
    # NPC queries
    npcs: [NPC!]!
    npc(id: ID!): NPC
    
    # Conversation queries
    conversations(npcId: ID, limit: Int = 50): [Conversation!]!
    conversation(id: ID!): Conversation
    
    # Relationship queries
    relationships: [Relationship!]!
    relationship(npcId: ID!): Relationship
    
    # Memory flower queries
    memoryFlowers: [MemoryFlower!]!
    
    # Wish queries
    wishes: [Wish!]!
    npcWishes(npcId: ID!): [Wish!]!
    
    # Letter queries
    letters(unreadOnly: Boolean = false): [Letter!]!
    
    # Diary queries
    diaryEntries: [DiaryEntry!]!

    # World state
    worldState: WorldState

    # Multi-Agent queries
    agents: [AIAgent!]!
    agent(id: ID!): AIAgent
    memories(category: Category, limit: Int = 50): [MemoryEntry!]!
    memory(id: ID!): MemoryEntry
    searchMemories(query: String!): [MemoryEntry!]!
    chatHistory(agentId: ID, limit: Int = 20): [ChatMessage!]!
  }

  # Multi-Agent System Types
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
    chatHistory: [ChatMessage!]!
  }

  type ChatMessage {
    id: ID!
    agentId: String!
    message: String!
    response: String!
    createdAt: DateTime!
    memory: MemoryEntry
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

  type SubmitResponse {
    routing: RoutingResult!
    processing: ProcessingResult!
  }

  type RoutingResult {
    category: Category!
    greeting: String!
    reason: String!
    confidence: Float!
  }

  type ProcessingResult {
    agent: AIAgent!
    memory: MemoryEntry!
    response: String!
  }

  # Mutations
  type Mutation {
    # Auth mutations
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    logout: Boolean!

    # Conversation mutations
    sendMessage(input: ConversationInput!): AIResponse!

    # Multi-Agent mutations
    submitMemory(content: String!): SubmitResponse!
    chatWithAgent(agentId: ID!, message: String!): ChatMessage!

    # Diary mutations
    createDiaryEntry(input: DiaryEntryInput!): DiaryEntry!
    updateDiaryEntry(id: ID!, input: DiaryEntryInput!): DiaryEntry!
    deleteDiaryEntry(id: ID!): Boolean!

    # Letter mutations
    markLetterAsRead(id: ID!): Letter!

    # World state mutations
    updateWorldState(input: UpdateWorldStateInput!): WorldState!

    # Wish mutations
    updateWishProgress(wishId: ID!, progress: Float!, notes: String): UserWishProgress!
  }

  # Subscriptions
  type Subscription {
    # Real-time conversation updates
    conversationAdded(npcId: ID!): Conversation!
    
    # NPC mood changes
    npcMoodChanged: NPC!
    
    # New letters
    letterReceived: Letter!
    
    # Memory flower growth
    memoryFlowerGrown: MemoryFlower!
    
    # World state changes
    worldStateChanged: WorldState!
  }

  type AuthPayload {
    token: String!
    user: User!
  }
`