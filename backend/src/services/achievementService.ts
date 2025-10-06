import { PrismaClient, Achievement, AchievementCategory, AchievementRarity } from '@prisma/client';
import { EventEmitter } from 'events';
import SoulBondService from './soulBondService';

const prisma = new PrismaClient();

interface AchievementDefinition {
  type: string;
  title: string;
  description: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  requirements: any;
  rewards?: {
    bondExp?: number;
    influencePoints?: number;
    specialTitle?: string;
  };
}

export class AchievementService extends EventEmitter {
  private static instance: AchievementService;

  private achievements: AchievementDefinition[] = [
    // Bond Building Achievements
    {
      type: 'first_tears',
      title: '第一次讓NPC落淚',
      description: '你的話語深深觸動了NPC的心靈',
      category: 'bond_building',
      rarity: 'uncommon',
      requirements: { emotionalImpact: 'tears' },
      rewards: { bondExp: 50 }
    },
    {
      type: 'soul_mate',
      title: '靈魂伴侶',
      description: '與NPC達到最高羈絆等級',
      category: 'bond_building',
      rarity: 'legendary',
      requirements: { bondLevel: 10 },
      rewards: { bondExp: 200, specialTitle: '命運共同體' }
    },
    {
      type: 'triple_bond',
      title: '三重羈絆',
      description: '與三個NPC的羈絆等級都達到5級以上',
      category: 'bond_building',
      rarity: 'epic',
      requirements: { multipleBonds: { count: 3, minLevel: 5 } },
      rewards: { influencePoints: 100 }
    },

    // Emotional Healer Achievements
    {
      type: 'healer_heart',
      title: '治癒之心',
      description: '成功治癒一個NPC的心靈創傷',
      category: 'emotional_healer',
      rarity: 'rare',
      requirements: { healingComplete: true },
      rewards: { bondExp: 100, specialTitle: '心靈治癒師' }
    },
    {
      type: 'perfect_resonance',
      title: '完美共鳴',
      description: '達到完美的情緒同步',
      category: 'emotional_healer',
      rarity: 'epic',
      requirements: { emotionalSync: 1.0 },
      rewards: { bondExp: 80 }
    },
    {
      type: 'emotion_master',
      title: '情緒大師',
      description: '體驗所有類型的情緒共鳴',
      category: 'emotional_healer',
      rarity: 'rare',
      requirements: { allEmotions: true },
      rewards: { influencePoints: 50 }
    },

    // Town Hero Achievements
    {
      type: 'town_favorite',
      title: '小鎮最受歡迎的人',
      description: '達到最高的小鎮聲望',
      category: 'town_hero',
      rarity: 'legendary',
      requirements: { reputationLevel: 7 },
      rewards: { influencePoints: 200, specialTitle: '小鎮傳奇' }
    },
    {
      type: 'gossip_star',
      title: '話題人物',
      description: '成為小鎮八卦的中心',
      category: 'town_hero',
      rarity: 'uncommon',
      requirements: { gossipCount: 10 },
      rewards: { influencePoints: 30 }
    },
    {
      type: 'event_organizer',
      title: '活動組織者',
      description: '成功組織一次小鎮活動',
      category: 'town_hero',
      rarity: 'rare',
      requirements: { townEvent: true },
      rewards: { influencePoints: 75 }
    },

    // Collector Achievements
    {
      type: 'memory_collector',
      title: '記憶收集者',
      description: '收集100朵記憶之花',
      category: 'collector',
      rarity: 'epic',
      requirements: { memoryFlowers: 100 },
      rewards: { bondExp: 150 }
    },
    {
      type: 'secret_keeper',
      title: '秘密守護者',
      description: '解鎖所有NPC的核心秘密',
      category: 'collector',
      rarity: 'legendary',
      requirements: { allSecrets: true },
      rewards: { specialTitle: '全知者' }
    },
    {
      type: 'letter_collector',
      title: '書信收藏家',
      description: '收到50封來自NPC的信件',
      category: 'collector',
      rarity: 'rare',
      requirements: { letters: 50 },
      rewards: { bondExp: 60 }
    },

    // Explorer Achievements
    {
      type: 'dream_walker',
      title: '夢境行者',
      description: '進入NPC的夢境世界',
      category: 'explorer',
      rarity: 'epic',
      requirements: { dreamAccess: true },
      rewards: { bondExp: 100, specialTitle: '夢境探索者' }
    },
    {
      type: 'hidden_path',
      title: '隱藏路徑',
      description: '發現所有隱藏的對話選項',
      category: 'explorer',
      rarity: 'rare',
      requirements: { hiddenDialogues: 20 },
      rewards: { bondExp: 70 }
    },
    {
      type: 'time_traveler',
      title: '時光旅人',
      description: '了解所有NPC的完整過去',
      category: 'explorer',
      rarity: 'legendary',
      requirements: { allPasts: true },
      rewards: { influencePoints: 150, specialTitle: '歷史見證者' }
    }
  ];

  private constructor() {
    super();
    this.setupEventListeners();
  }

  public static getInstance(): AchievementService {
    if (!AchievementService.instance) {
      AchievementService.instance = new AchievementService();
    }
    return AchievementService.instance;
  }

  private setupEventListeners(): void {
    SoulBondService.on('bondLevelUp', async (data) => {
      await this.checkBondAchievements(data.userId, data.npcId, data.newLevel);
    });

    SoulBondService.on('highEmotionalSync', async (data) => {
      await this.checkEmotionalAchievements(data.relationshipId);
    });
  }

  async checkAchievement(
    userId: string,
    achievementType: string,
    context: any
  ): Promise<Achievement | null> {
    const existing = await prisma.achievement.findUnique({
      where: {
        userId_achievementType: {
          userId,
          achievementType
        }
      }
    });

    if (existing?.isUnlocked) {
      return existing;
    }

    const definition = this.achievements.find(a => a.type === achievementType);
    if (!definition) {
      return null;
    }

    const isComplete = await this.evaluateRequirements(userId, definition.requirements, context);

    if (isComplete) {
      return this.unlockAchievement(userId, definition);
    }

    if (existing) {
      const progress = await this.calculateProgress(userId, definition.requirements, context);
      return prisma.achievement.update({
        where: { id: existing.id },
        data: { progress }
      });
    }

    return null;
  }

  private async evaluateRequirements(
    userId: string,
    requirements: any,
    context: any
  ): Promise<boolean> {
    if (requirements.bondLevel !== undefined) {
      const relationships = await prisma.relationship.findMany({
        where: { userId }
      });
      return relationships.some(r => r.bondLevel >= requirements.bondLevel);
    }

    if (requirements.multipleBonds) {
      const relationships = await prisma.relationship.findMany({
        where: {
          userId,
          bondLevel: { gte: requirements.multipleBonds.minLevel }
        }
      });
      return relationships.length >= requirements.multipleBonds.count;
    }

    if (requirements.emotionalSync !== undefined) {
      const relationships = await prisma.relationship.findMany({
        where: { userId }
      });
      return relationships.some(r => r.emotionalSync >= requirements.emotionalSync);
    }

    if (requirements.reputationLevel !== undefined) {
      const reputation = await prisma.townReputation.findUnique({
        where: { userId }
      });
      return reputation ? reputation.reputationLevel >= requirements.reputationLevel : false;
    }

    if (requirements.gossipCount !== undefined) {
      const gossipCount = await prisma.gossipEntry.count({
        where: { userId }
      });
      return gossipCount >= requirements.gossipCount;
    }

    if (requirements.memoryFlowers !== undefined) {
      const flowerCount = await prisma.memoryFlower.count({
        where: { userId }
      });
      return flowerCount >= requirements.memoryFlowers;
    }

    if (requirements.letters !== undefined) {
      const letterCount = await prisma.letter.count({
        where: {
          recipientId: userId,
          recipientType: 'user'
        }
      });
      return letterCount >= requirements.letters;
    }

    if (requirements.emotionalImpact) {
      return context?.emotionalImpact === requirements.emotionalImpact;
    }

    if (requirements.allSecrets) {
      const relationships = await prisma.relationship.findMany({
        where: { userId }
      });
      return relationships.every(r => {
        const secrets = r.secretsUnlocked as string[];
        return secrets && secrets.includes('核心秘密');
      });
    }

    return false;
  }

  private async calculateProgress(
    userId: string,
    requirements: any,
    context: any
  ): Promise<number> {
    if (requirements.bondLevel !== undefined) {
      const relationships = await prisma.relationship.findMany({
        where: { userId }
      });
      const maxLevel = Math.max(...relationships.map(r => r.bondLevel));
      return maxLevel / requirements.bondLevel;
    }

    if (requirements.memoryFlowers !== undefined) {
      const count = await prisma.memoryFlower.count({
        where: { userId }
      });
      return Math.min(1.0, count / requirements.memoryFlowers);
    }

    if (requirements.letters !== undefined) {
      const count = await prisma.letter.count({
        where: {
          recipientId: userId,
          recipientType: 'user'
        }
      });
      return Math.min(1.0, count / requirements.letters);
    }

    return 0;
  }

  private async unlockAchievement(
    userId: string,
    definition: AchievementDefinition
  ): Promise<Achievement> {
    const achievement = await prisma.achievement.upsert({
      where: {
        userId_achievementType: {
          userId,
          achievementType: definition.type
        }
      },
      update: {
        isUnlocked: true,
        unlockedAt: new Date(),
        progress: 1.0
      },
      create: {
        userId,
        achievementType: definition.type,
        title: definition.title,
        description: definition.description,
        category: definition.category,
        rarity: definition.rarity,
        progress: 1.0,
        isUnlocked: true,
        unlockedAt: new Date(),
        metadata: definition.rewards || {}
      }
    });

    this.emit('achievementUnlocked', {
      userId,
      achievement: definition,
      rewards: definition.rewards
    });

    if (definition.rewards) {
      await this.grantRewards(userId, definition.rewards);
    }

    return achievement;
  }

  private async grantRewards(userId: string, rewards: any): Promise<void> {
    if (rewards.influencePoints) {
      const reputation = await prisma.townReputation.findUnique({
        where: { userId }
      });

      if (reputation) {
        await prisma.townReputation.update({
          where: { userId },
          data: {
            influencePoints: reputation.influencePoints + rewards.influencePoints
          }
        });
      }
    }

    if (rewards.specialTitle) {
      const relationships = await prisma.relationship.findMany({
        where: { userId }
      });

      for (const relationship of relationships) {
        if (!relationship.specialTitle) {
          await prisma.relationship.update({
            where: { id: relationship.id },
            data: { specialTitle: rewards.specialTitle }
          });
          break;
        }
      }
    }
  }

  private async checkBondAchievements(
    userId: string,
    npcId: string,
    bondLevel: number
  ): Promise<void> {
    if (bondLevel === 10) {
      await this.checkAchievement(userId, 'soul_mate', { bondLevel });
    }

    const relationships = await prisma.relationship.findMany({
      where: {
        userId,
        bondLevel: { gte: 5 }
      }
    });

    if (relationships.length >= 3) {
      await this.checkAchievement(userId, 'triple_bond', { relationships });
    }
  }

  private async checkEmotionalAchievements(relationshipId: string): Promise<void> {
    const relationship = await prisma.relationship.findUnique({
      where: { id: relationshipId }
    });

    if (relationship && relationship.emotionalSync >= 1.0) {
      await this.checkAchievement(
        relationship.userId,
        'perfect_resonance',
        { emotionalSync: relationship.emotionalSync }
      );
    }
  }

  async getUserAchievements(userId: string): Promise<{
    unlocked: Achievement[];
    inProgress: Achievement[];
    locked: AchievementDefinition[];
    stats: {
      totalUnlocked: number;
      byCategory: Record<string, number>;
      byRarity: Record<string, number>;
    };
  }> {
    const allAchievements = await prisma.achievement.findMany({
      where: { userId },
      orderBy: [
        { isUnlocked: 'desc' },
        { progress: 'desc' }
      ]
    });

    const unlocked = allAchievements.filter(a => a.isUnlocked);
    const inProgress = allAchievements.filter(a => !a.isUnlocked && a.progress > 0);

    const unlockedTypes = new Set(allAchievements.map(a => a.achievementType));
    const locked = this.achievements.filter(def => !unlockedTypes.has(def.type));

    const byCategory: Record<string, number> = {};
    const byRarity: Record<string, number> = {};

    unlocked.forEach(achievement => {
      byCategory[achievement.category] = (byCategory[achievement.category] || 0) + 1;
      byRarity[achievement.rarity] = (byRarity[achievement.rarity] || 0) + 1;
    });

    return {
      unlocked,
      inProgress,
      locked,
      stats: {
        totalUnlocked: unlocked.length,
        byCategory,
        byRarity
      }
    };
  }

  async checkAllAchievements(userId: string): Promise<void> {
    for (const definition of this.achievements) {
      await this.checkAchievement(userId, definition.type, {});
    }
  }
}

export default AchievementService.getInstance();