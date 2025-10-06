// Legacy resolvers - Temporarily disabled due to schema migration
// import { userResolvers } from './userResolvers'
// import { npcResolvers } from './npcResolvers'
// import { conversationResolvers } from './conversationResolvers'
// import { multiAgentResolvers } from './multiAgentResolvers'

import { scalarResolvers } from './scalarResolvers'
import { assistantResolvers } from './assistantResolvers'
import { memoryResolvers } from './memoryResolvers'
import { knowledgeDistributionResolvers } from './knowledgeDistributionResolvers'

export const resolvers = {
  ...scalarResolvers,

  Query: {
    // New Architecture (新知識助手系統)
    ...assistantResolvers.Query,
    ...memoryResolvers.Query,
    ...knowledgeDistributionResolvers.Query,
  },

  Mutation: {
    // New Architecture (新知識助手系統)
    ...assistantResolvers.Mutation,
    ...memoryResolvers.Mutation,
    ...knowledgeDistributionResolvers.Mutation,
  },

  // Type resolvers - New Architecture
  Assistant: assistantResolvers.Assistant,
  Memory: memoryResolvers.Memory,
  ChatMessage: memoryResolvers.ChatMessage,
  KnowledgeDistribution: knowledgeDistributionResolvers.KnowledgeDistribution,
  AgentDecision: knowledgeDistributionResolvers.AgentDecision,
}