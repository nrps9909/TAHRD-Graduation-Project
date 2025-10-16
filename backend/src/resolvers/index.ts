// Legacy resolvers - Temporarily disabled due to schema migration
// import { userResolvers } from './userResolvers'
// import { npcResolvers } from './npcResolvers'
// import { conversationResolvers } from './conversationResolvers'
// import { multiAgentResolvers } from './multiAgentResolvers'

import { scalarResolvers } from './scalarResolvers'
import { authResolvers } from './authResolvers'
import { chatSessionResolvers } from './chatSessionResolvers'
import { assistantResolvers } from './assistantResolvers'
import { memoryResolvers } from './memoryResolvers'
import { knowledgeDistributionResolvers } from './knowledgeDistributionResolvers'
import { catAgentResolvers } from './catAgentResolvers'
import { tororoResolvers } from './tororoResolvers'
import { hijikiRagResolvers } from './hijikiRagResolvers'
import { categoryResolvers } from './categoryResolvers'
import { taskHistoryResolvers } from './taskHistoryResolvers'

export const resolvers = {
  ...scalarResolvers,

  Query: {
    // New Architecture (新知識助手系統)
    ...assistantResolvers.Query,
    ...memoryResolvers.Query,
    ...chatSessionResolvers.Query,
    ...knowledgeDistributionResolvers.Query,
    // Cat Agent System (Tororo & Hijiki)
    ...catAgentResolvers.Query,
    // Hijiki RAG System (小黑知識庫)
    ...hijikiRagResolvers.Query,
    // Category System (自訂分類系統)
    ...categoryResolvers.Query,
    // Task History System (任務歷史記錄)
    ...taskHistoryResolvers.Query,
  },

  Mutation: {
    // Auth System
    ...authResolvers.Mutation,
    // New Architecture (新知識助手系統)
    ...assistantResolvers.Mutation,
    ...memoryResolvers.Mutation,
    ...chatSessionResolvers.Mutation,
    ...knowledgeDistributionResolvers.Mutation,
    // Cat Agent System (Tororo & Hijiki)
    ...catAgentResolvers.Mutation,
    // Tororo AI System (白噗噗 AI 回應)
    ...tororoResolvers.Mutation,
    // Hijiki RAG System (小黑知識庫)
    ...hijikiRagResolvers.Mutation,
    // Category System (自訂分類系統)
    ...categoryResolvers.Mutation,
  },

  // Type resolvers - New Architecture
  Assistant: assistantResolvers.Assistant,
  Memory: memoryResolvers.Memory,
  ChatMessage: memoryResolvers.ChatMessage,
  ChatSession: chatSessionResolvers.ChatSession,
  KnowledgeDistribution: knowledgeDistributionResolvers.KnowledgeDistribution,
  AgentDecision: knowledgeDistributionResolvers.AgentDecision,

  // Type resolvers - Category System
  Island: categoryResolvers.Island,
  Subcategory: categoryResolvers.Subcategory,
}