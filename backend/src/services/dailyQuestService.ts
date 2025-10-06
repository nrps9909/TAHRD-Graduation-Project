import { PrismaClient, DailyQuest, QuestType, QuestStatus } from '@prisma/client';
import SoulBondService from './soulBondService';
import { EventEmitter } from 'events';

const prisma = new PrismaClient();

interface QuestTemplate {
  type: QuestType;
  titleTemplate: string;
  descriptionTemplate: string;
  baseReward: {
    bondExp: number;
    influencePoints?: number;
    specialItem?: string;
  };
  difficulty: 'easy' | 'medium' | 'hard';
  npcSpecific: boolean;
}

export class DailyQuestService extends EventEmitter {
  private static instance: DailyQuestService;

  private questTemplates: QuestTemplate[] = [
    {
      type: 'emotional_support',
      titleTemplate: '幫助{npcName}找回笑容',
      descriptionTemplate: '{npcName}今天似乎有些低落，去陪伴並安慰他們吧',
      baseReward: { bondExp: 50, influencePoints: 10 },
      difficulty: 'medium',
      npcSpecific: true
    },
    {
      type: 'creative_help',
      titleTemplate: '成為{npcName}的創作夥伴',
      descriptionTemplate: '協助{npcName}完成今天的創作項目',
      baseReward: { bondExp: 40, specialItem: 'creativity_token' },
      difficulty: 'medium',
      npcSpecific: true
    },
    {
      type: 'social_bridge',
      titleTemplate: '搭建友誼的橋樑',
      descriptionTemplate: '幫助兩位NPC解決誤會，重歸於好',
      baseReward: { bondExp: 60, influencePoints: 20 },
      difficulty: 'hard',
      npcSpecific: false
    },
    {
      type: 'personal_growth',
      titleTemplate: '陪{npcName}度過挑戰',
      descriptionTemplate: '{npcName}正面臨一個個人挑戰，給予支持和鼓勵',
      baseReward: { bondExp: 55, influencePoints: 15 },
      difficulty: 'hard',
      npcSpecific: true
    },
    {
      type: 'town_event',
      titleTemplate: '參與小鎮活動',
      descriptionTemplate: '今天小鎮有特別活動，去參與並認識更多朋友',
      baseReward: { bondExp: 30, influencePoints: 25 },
      difficulty: 'easy',
      npcSpecific: false
    }
  ];

  private npcNames: Map<string, string> = new Map([
    ['npc-1', '陸培修'],
    ['npc-2', '劉宇岑'],
    ['npc-3', '陳庭安']
  ]);

  private constructor() {
    super();
  }

  public static getInstance(): DailyQuestService {
    if (!DailyQuestService.instance) {
      DailyQuestService.instance = new DailyQuestService();
    }
    return DailyQuestService.instance;
  }

  async generateDailyQuests(userId: string): Promise<DailyQuest[]> {
    const existingQuests = await prisma.dailyQuest.findMany({
      where: {
        userId,
        deadline: {
          gte: new Date()
        },
        status: {
          in: ['pending', 'in_progress']
        }
      }
    });

    if (existingQuests.length >= 3) {
      return existingQuests;
    }

    const relationships = await prisma.relationship.findMany({
      where: { userId },
      orderBy: { lastInteraction: 'asc' },
      take: 3
    });

    const newQuests: DailyQuest[] = [];
    const usedTypes = new Set(existingQuests.map(q => q.questType));
    const questsToGenerate = 3 - existingQuests.length;

    for (let i = 0; i < questsToGenerate; i++) {
      const availableTemplates = this.questTemplates.filter(
        t => !usedTypes.has(t.type)
      );

      if (availableTemplates.length === 0) break;

      const template = availableTemplates[Math.floor(Math.random() * availableTemplates.length)];
      usedTypes.add(template.type);

      const npcId = template.npcSpecific && relationships[i]
        ? relationships[i].npcId
        : null;

      const npcName = npcId ? this.npcNames.get(npcId) || 'NPC' : '';

      const title = template.titleTemplate.replace('{npcName}', npcName);
      const description = template.descriptionTemplate.replace('{npcName}', npcName);

      const difficultyMultiplier = {
        easy: 1,
        medium: 1.5,
        hard: 2
      }[template.difficulty];

      const reward = {
        ...template.baseReward,
        bondExp: Math.round(template.baseReward.bondExp * difficultyMultiplier)
      };

      const deadline = new Date();
      deadline.setHours(23, 59, 59, 999);

      const quest = await prisma.dailyQuest.create({
        data: {
          userId,
          npcId,
          title,
          description,
          questType: template.type,
          status: 'pending',
          reward: JSON.stringify(reward),
          deadline,
          createdAt: new Date()
        }
      });

      newQuests.push(quest);
    }

    this.emit('questsGenerated', {
      userId,
      questCount: newQuests.length
    });

    return [...existingQuests, ...newQuests];
  }

  async startQuest(questId: string, userId: string): Promise<DailyQuest> {
    const quest = await prisma.dailyQuest.findFirst({
      where: {
        id: questId,
        userId,
        status: 'pending'
      }
    });

    if (!quest) {
      throw new Error('Quest not found or already started');
    }

    const updatedQuest = await prisma.dailyQuest.update({
      where: { id: questId },
      data: { status: 'in_progress' }
    });

    this.emit('questStarted', {
      userId,
      questId,
      questType: quest.questType
    });

    return updatedQuest;
  }

  async completeQuest(
    questId: string,
    userId: string,
    completionData?: any
  ): Promise<{
    quest: DailyQuest;
    rewards: any;
  }> {
    const quest = await prisma.dailyQuest.findFirst({
      where: {
        id: questId,
        userId,
        status: 'in_progress'
      }
    });

    if (!quest) {
      throw new Error('Quest not found or not in progress');
    }

    const reward = JSON.parse(quest.reward as string);

    const updatedQuest = await prisma.dailyQuest.update({
      where: { id: questId },
      data: {
        status: 'completed',
        completedAt: new Date()
      }
    });

    if (reward.bondExp && quest.npcId) {
      await SoulBondService.addBondExperience(
        userId,
        quest.npcId,
        reward.bondExp,
        `Completed daily quest: ${quest.title}`
      );
    }

    if (reward.influencePoints) {
      const reputation = await prisma.townReputation.findUnique({
        where: { userId }
      });

      if (reputation) {
        await prisma.townReputation.update({
          where: { userId },
          data: {
            influencePoints: reputation.influencePoints + reward.influencePoints,
            positiveActions: reputation.positiveActions + 1
          }
        });
      }
    }

    this.emit('questCompleted', {
      userId,
      questId,
      questType: quest.questType,
      rewards: reward
    });

    await this.checkQuestAchievements(userId);

    return {
      quest: updatedQuest,
      rewards: reward
    };
  }

  async failExpiredQuests(): Promise<number> {
    const expiredQuests = await prisma.dailyQuest.updateMany({
      where: {
        deadline: {
          lt: new Date()
        },
        status: {
          in: ['pending', 'in_progress']
        }
      },
      data: {
        status: 'failed'
      }
    });

    if (expiredQuests.count > 0) {
      this.emit('questsFailed', {
        count: expiredQuests.count
      });
    }

    return expiredQuests.count;
  }

  async getActiveQuests(userId: string): Promise<DailyQuest[]> {
    return prisma.dailyQuest.findMany({
      where: {
        userId,
        status: {
          in: ['pending', 'in_progress']
        },
        deadline: {
          gte: new Date()
        }
      },
      include: {
        npc: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async getQuestHistory(
    userId: string,
    limit: number = 10
  ): Promise<{
    quests: DailyQuest[];
    stats: {
      completed: number;
      failed: number;
      completionRate: number;
    };
  }> {
    const quests = await prisma.dailyQuest.findMany({
      where: {
        userId,
        status: {
          in: ['completed', 'failed']
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });

    const completed = quests.filter(q => q.status === 'completed').length;
    const failed = quests.filter(q => q.status === 'failed').length;
    const total = completed + failed;

    return {
      quests,
      stats: {
        completed,
        failed,
        completionRate: total > 0 ? completed / total : 0
      }
    };
  }

  private async checkQuestAchievements(userId: string): Promise<void> {
    const completedCount = await prisma.dailyQuest.count({
      where: {
        userId,
        status: 'completed'
      }
    });

    const achievementThresholds = [
      { count: 1, type: 'first_quest', title: '初心者' },
      { count: 10, type: 'quest_veteran', title: '任務老手' },
      { count: 50, type: 'quest_master', title: '任務大師' },
      { count: 100, type: 'quest_legend', title: '傳奇冒險者' }
    ];

    for (const threshold of achievementThresholds) {
      if (completedCount >= threshold.count) {
        const existingAchievement = await prisma.achievement.findUnique({
          where: {
            userId_achievementType: {
              userId,
              achievementType: threshold.type
            }
          }
        });

        if (!existingAchievement) {
          await prisma.achievement.create({
            data: {
              userId,
              achievementType: threshold.type,
              title: threshold.title,
              description: `完成了 ${threshold.count} 個每日任務`,
              category: 'collector',
              rarity: threshold.count >= 100 ? 'legendary' :
                     threshold.count >= 50 ? 'epic' :
                     threshold.count >= 10 ? 'rare' : 'common',
              progress: 1.0,
              isUnlocked: true,
              unlockedAt: new Date()
            }
          });

          this.emit('achievementUnlocked', {
            userId,
            achievementType: threshold.type,
            title: threshold.title
          });
        }
      }
    }
  }

  async generateSpecialQuest(
    userId: string,
    npcId: string,
    occasion: 'bond_milestone' | 'seasonal_event' | 'npc_birthday'
  ): Promise<DailyQuest> {
    const specialQuests = {
      'bond_milestone': {
        title: `與${this.npcNames.get(npcId)}的特別時刻`,
        description: '你們的關係達到了新的里程碑，完成這個特別任務來慶祝',
        reward: { bondExp: 100, specialItem: 'milestone_token' }
      },
      'seasonal_event': {
        title: '季節限定任務',
        description: '參與季節活動，與NPC一起創造美好回憶',
        reward: { bondExp: 80, influencePoints: 30, specialItem: 'seasonal_badge' }
      },
      'npc_birthday': {
        title: `${this.npcNames.get(npcId)}的生日`,
        description: '今天是特別的日子，為NPC準備一個驚喜',
        reward: { bondExp: 120, specialItem: 'birthday_gift' }
      }
    };

    const questData = specialQuests[occasion];
    const deadline = new Date();
    deadline.setHours(23, 59, 59, 999);

    return prisma.dailyQuest.create({
      data: {
        userId,
        npcId,
        title: questData.title,
        description: questData.description,
        questType: 'town_event',
        status: 'pending',
        reward: JSON.stringify(questData.reward),
        deadline
      }
    });
  }
}

export default DailyQuestService.getInstance();