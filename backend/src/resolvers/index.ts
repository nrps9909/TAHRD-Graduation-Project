import { userResolvers } from './userResolvers'
import { npcResolvers } from './npcResolvers'
import { conversationResolvers } from './conversationResolvers'
import { scalarResolvers } from './scalarResolvers'
import { multiAgentResolvers } from './multiAgentResolvers'

export const resolvers = {
  ...scalarResolvers,

  Query: {
    ...userResolvers.Query,
    ...npcResolvers.Query,
    ...conversationResolvers.Query,
    ...multiAgentResolvers.Query,
  },

  Mutation: {
    ...userResolvers.Mutation,
    ...conversationResolvers.Mutation,
    ...multiAgentResolvers.Mutation,
  },

  Subscription: {
    ...conversationResolvers.Subscription,
  },

  // Type resolvers
  User: userResolvers.User,
  NPC: npcResolvers.NPC,
  Conversation: conversationResolvers.Conversation,
  Relationship: conversationResolvers.Relationship,
  MemoryFlower: conversationResolvers.MemoryFlower,
  MemoryEntry: multiAgentResolvers.MemoryEntry,
  ChatMessage: multiAgentResolvers.ChatMessage,
}