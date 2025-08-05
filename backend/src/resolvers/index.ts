import { userResolvers } from './userResolvers'
import { npcResolvers } from './npcResolvers'
import { conversationResolvers } from './conversationResolvers'
import { scalarResolvers } from './scalarResolvers'

export const resolvers = {
  ...scalarResolvers,
  
  Query: {
    ...userResolvers.Query,
    ...npcResolvers.Query,
    ...conversationResolvers.Query,
  },
  
  Mutation: {
    ...userResolvers.Mutation,
    ...conversationResolvers.Mutation,
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
}