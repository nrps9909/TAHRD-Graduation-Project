import { PrismaClient } from '@prisma/client';
import SoulBondService from '../services/soulBondService';
import EmotionalResonanceService from '../services/emotionalResonanceService';
import DailyQuestService from '../services/dailyQuestService';
import TownReputationService from '../services/townReputationService';
import AchievementService from '../services/achievementService';

const prisma = new PrismaClient();

export const soulBondResolvers = {
  Query: {
    getUserBondLevel: async (_: any, { userId, npcId }: { userId: string; npcId: string }) => {
      try {
        const bondInfo = await SoulBondService.getBondLevelInfo(userId, npcId);
        return {
          success: true,
          data: bondInfo
        };
      } catch (error) {
        console.error('Error getting bond level:', error);
        return {
          success: false,
          error: error.message
        };
      }
    },

    getDailyQuests: async (_: any, { userId }: { userId: string }) => {
      try {
        const quests = await DailyQuestService.getActiveQuests(userId);
        return {
          success: true,
          quests
        };
      } catch (error) {
        console.error('Error getting daily quests:', error);
        return {
          success: false,
          error: error.message,
          quests: []
        };
      }
    },

    getUserAchievements: async (_: any, { userId }: { userId: string }) => {
      try {
        const achievements = await AchievementService.getUserAchievements(userId);
        return {
          success: true,
          ...achievements
        };
      } catch (error) {
        console.error('Error getting achievements:', error);
        return {
          success: false,
          error: error.message
        };
      }
    },

    getTownReputation: async (_: any, { userId }: { userId: string }) => {
      try {
        const summary = await TownReputationService.getReputationSummary(userId);
        return {
          success: true,
          data: summary
        };
      } catch (error) {
        console.error('Error getting reputation:', error);
        return {
          success: false,
          error: error.message
        };
      }
    },

    getEmotionalHistory: async (_: any, { relationshipId }: { relationshipId: string }) => {
      try {
        const history = await EmotionalResonanceService.getEmotionalHistory(relationshipId);
        return {
          success: true,
          data: history
        };
      } catch (error) {
        console.error('Error getting emotional history:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }
  },

  Mutation: {
    processConversationWithBond: async (_: any, {
      userId,
      npcId,
      userMessage,
      npcResponse
    }: {
      userId: string;
      npcId: string;
      userMessage: string;
      npcResponse: string;
    }) => {
      try {
        // Process emotional resonance
        const resonanceResult = await EmotionalResonanceService.processConversationResonance(
          userId,
          npcId,
          userMessage,
          npcResponse
        );

        // Calculate experience from interaction
        const expGained = await SoulBondService.calculateExpFromInteraction(
          userId,
          npcId,
          'normal_conversation',
          resonanceResult.resonance.syncLevel
        );

        // Add bond experience
        const updatedRelationship = await SoulBondService.addBondExperience(
          userId,
          npcId,
          expGained,
          'Conversation interaction'
        );

        // Check for achievements
        await AchievementService.checkAchievement(userId, 'first_conversation', {
          npcId,
          resonance: resonanceResult.resonance
        });

        return {
          success: true,
          bondLevel: updatedRelationship.bondLevel,
          bondExp: updatedRelationship.bondExp,
          emotionalSync: updatedRelationship.emotionalSync,
          resonance: resonanceResult.resonance,
          expGained
        };
      } catch (error) {
        console.error('Error processing conversation with bond:', error);
        return {
          success: false,
          error: error.message
        };
      }
    },

    startDailyQuest: async (_: any, { questId, userId }: { questId: string; userId: string }) => {
      try {
        const quest = await DailyQuestService.startQuest(questId, userId);
        return {
          success: true,
          quest
        };
      } catch (error) {
        console.error('Error starting quest:', error);
        return {
          success: false,
          error: error.message
        };
      }
    },

    completeDailyQuest: async (_: any, { questId, userId }: { questId: string; userId: string }) => {
      try {
        const result = await DailyQuestService.completeQuest(questId, userId);

        // Check quest-related achievements
        await AchievementService.checkAllAchievements(userId);

        return {
          success: true,
          quest: result.quest,
          rewards: result.rewards
        };
      } catch (error) {
        console.error('Error completing quest:', error);
        return {
          success: false,
          error: error.message
        };
      }
    },

    createGossip: async (_: any, {
      userId,
      sourceNpcId,
      content,
      sentiment
    }: {
      userId: string;
      sourceNpcId: string;
      content: string;
      sentiment: number;
    }) => {
      try {
        const gossip = await TownReputationService.createGossip(
          userId,
          sourceNpcId,
          content,
          sentiment
        );

        // Check gossip-related achievements
        await AchievementService.checkAchievement(userId, 'gossip_star', {
          gossipCount: await prisma.gossipEntry.count({ where: { userId } })
        });

        return {
          success: true,
          gossip
        };
      } catch (error) {
        console.error('Error creating gossip:', error);
        return {
          success: false,
          error: error.message
        };
      }
    },

    triggerResonanceEvent: async (_: any, {
      userId,
      npcId,
      eventType
    }: {
      userId: string;
      npcId: string;
      eventType: 'perfect_sync' | 'emotional_breakthrough' | 'shared_joy' | 'mutual_comfort';
    }) => {
      try {
        await EmotionalResonanceService.triggerResonanceEvent(userId, npcId, eventType);

        // Check resonance achievements
        await AchievementService.checkAchievement(userId, 'perfect_resonance', { eventType });

        return {
          success: true,
          message: `Resonance event ${eventType} triggered successfully`
        };
      } catch (error) {
        console.error('Error triggering resonance event:', error);
        return {
          success: false,
          error: error.message
        };
      }
    },

    generateDailyQuests: async (_: any, { userId }: { userId: string }) => {
      try {
        const quests = await DailyQuestService.generateDailyQuests(userId);
        return {
          success: true,
          quests
        };
      } catch (error) {
        console.error('Error generating daily quests:', error);
        return {
          success: false,
          error: error.message,
          quests: []
        };
      }
    },

    checkAllAchievements: async (_: any, { userId }: { userId: string }) => {
      try {
        await AchievementService.checkAllAchievements(userId);
        const achievements = await AchievementService.getUserAchievements(userId);

        return {
          success: true,
          unlockedCount: achievements.stats.totalUnlocked
        };
      } catch (error) {
        console.error('Error checking achievements:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }
  },

  Subscription: {
    bondLevelUp: {
      subscribe: () => {
        return SoulBondService.asyncIterator(['bondLevelUp']);
      }
    },

    achievementUnlocked: {
      subscribe: () => {
        return AchievementService.asyncIterator(['achievementUnlocked']);
      }
    },

    questCompleted: {
      subscribe: () => {
        return DailyQuestService.asyncIterator(['questCompleted']);
      }
    },

    reputationChanged: {
      subscribe: () => {
        return TownReputationService.asyncIterator(['reputationLevelUp', 'reputationTypeChanged']);
      }
    }
  }
};