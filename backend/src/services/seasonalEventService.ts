import { PrismaClient, SeasonalEvent } from '@prisma/client';
import { EventEmitter } from 'events';
import SoulBondService from './soulBondService';
import TownReputationService from './townReputationService';

const prisma = new PrismaClient();

interface EventActivity {
  id: string;
  name: string;
  description: string;
  requirements: any;
  rewards: any;
  participantCount?: number;
}

interface HeartFestivalData {
  userId: string;
  npcConfessions: Array<{
    npcId: string;
    npcName: string;
    confession: string;
    bondLevel: number;
  }>;
  townOpinion: string;
  specialReward?: any;
}

export class SeasonalEventService extends EventEmitter {
  private static instance: SeasonalEventService;

  private eventDefinitions = {
    heart_festival: {
      name: '心語祭',
      description: '年度盛會，所有NPC會公開分享對玩家的真實想法',
      duration: 7, // days
      activities: [
        {
          id: 'confession_ceremony',
          name: '告白儀式',
          description: 'NPC們輪流分享對你的感受',
          requirements: { minBondLevel: 3 },
          rewards: { bondExp: 100, specialItem: 'confession_letter' }
        },
        {
          id: 'memory_dance',
          name: '記憶之舞',
          description: '與NPC共舞，重溫美好回憶',
          requirements: { minBondLevel: 5 },
          rewards: { bondExp: 150, emotionalSync: 0.2 }
        },
        {
          id: 'wish_tree',
          name: '許願樹',
          description: '在許願樹下許下共同的願望',
          requirements: { minBondLevel: 2 },
          rewards: { influencePoints: 50 }
        }
      ]
    },
    memory_garden: {
      name: '記憶花園',
      description: '漫步在3D記憶花園中，回顧與NPC的珍貴時刻',
      duration: 5,
      activities: [
        {
          id: 'flower_planting',
          name: '種植記憶之花',
          description: '將珍貴的回憶化為永恆的花朵',
          requirements: { memoryFlowers: 10 },
          rewards: { bondExp: 80, specialItem: 'eternal_flower' }
        },
        {
          id: 'memory_exhibition',
          name: '回憶展覽',
          description: '展示你與NPC的美好時刻',
          requirements: { conversationCount: 50 },
          rewards: { influencePoints: 100 }
        },
        {
          id: 'time_capsule',
          name: '時光膠囊',
          description: '封存現在的感受給未來',
          requirements: { bondLevel: 4 },
          rewards: { specialItem: 'time_capsule', bondExp: 120 }
        }
      ]
    },
    bond_trial: {
      name: '羈絆試煉',
      description: '考驗你是否真正了解NPC的深度挑戰',
      duration: 3,
      activities: [
        {
          id: 'empathy_test',
          name: '共情測試',
          description: '預測NPC在特定情況下的反應',
          requirements: { bondLevel: 6, emotionalSync: 0.7 },
          rewards: { bondExp: 200, specialTitle: '心靈讀者' }
        },
        {
          id: 'memory_quiz',
          name: '記憶問答',
          description: '回答關於NPC的詳細問題',
          requirements: { bondLevel: 5 },
          rewards: { bondExp: 150, influencePoints: 80 }
        },
        {
          id: 'soul_resonance',
          name: '靈魂共振',
          description: '達到完美的情緒同步',
          requirements: { bondLevel: 8, emotionalSync: 0.9 },
          rewards: { bondExp: 300, specialTitle: '靈魂伴侶' }
        }
      ]
    },
    spring_bloom: {
      name: '春日綻放',
      description: '慶祝新生與成長的春季活動',
      duration: 4,
      activities: [
        {
          id: 'cherry_blossom_viewing',
          name: '櫻花觀賞',
          description: '與NPC一起欣賞櫻花',
          requirements: { season: 'spring' },
          rewards: { bondExp: 60, emotionalSync: 0.1 }
        },
        {
          id: 'picnic_party',
          name: '野餐派對',
          description: '準備美食與NPC共享',
          requirements: { bondLevel: 2 },
          rewards: { bondExp: 40, influencePoints: 30 }
        }
      ]
    },
    summer_festival: {
      name: '夏日祭典',
      description: '充滿歡樂與活力的夏季慶典',
      duration: 5,
      activities: [
        {
          id: 'fireworks_watching',
          name: '煙火大會',
          description: '與NPC一起觀賞絢麗煙火',
          requirements: { bondLevel: 3 },
          rewards: { bondExp: 70, specialItem: 'firework_photo' }
        },
        {
          id: 'beach_activities',
          name: '海灘活動',
          description: '享受夏日的海灘時光',
          requirements: { season: 'summer' },
          rewards: { bondExp: 50, influencePoints: 40 }
        }
      ]
    },
    autumn_harvest: {
      name: '秋收感恩',
      description: '感謝與收穫的秋季活動',
      duration: 4,
      activities: [
        {
          id: 'harvest_ceremony',
          name: '豐收儀式',
          description: '一起慶祝豐收的喜悅',
          requirements: { questsCompleted: 10 },
          rewards: { bondExp: 90, influencePoints: 60 }
        },
        {
          id: 'gratitude_letters',
          name: '感謝信',
          description: '交換感謝的信件',
          requirements: { bondLevel: 4 },
          rewards: { bondExp: 100, specialItem: 'gratitude_letter' }
        }
      ]
    },
    winter_lights: {
      name: '冬日燈光',
      description: '溫暖人心的冬季活動',
      duration: 6,
      activities: [
        {
          id: 'light_festival',
          name: '燈光節',
          description: '點亮冬日的溫暖燈光',
          requirements: { season: 'winter' },
          rewards: { bondExp: 80, emotionalSync: 0.15 }
        },
        {
          id: 'gift_exchange',
          name: '禮物交換',
          description: '準備特別的禮物',
          requirements: { bondLevel: 3 },
          rewards: { bondExp: 110, specialItem: 'special_gift' }
        }
      ]
    }
  };

  private constructor() {
    super();
    this.scheduleEventChecks();
  }

  public static getInstance(): SeasonalEventService {
    if (!SeasonalEventService.instance) {
      SeasonalEventService.instance = new SeasonalEventService();
    }
    return SeasonalEventService.instance;
  }

  private scheduleEventChecks(): void {
    // Check for events every hour
    setInterval(() => {
      this.checkAndActivateEvents();
    }, 60 * 60 * 1000);
  }

  async createSeasonalEvent(
    eventType: string,
    startDate?: Date,
    customRewards?: any
  ): Promise<SeasonalEvent> {
    const definition = this.eventDefinitions[eventType as keyof typeof this.eventDefinitions];
    if (!definition) {
      throw new Error(`Unknown event type: ${eventType}`);
    }

    const start = startDate || new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + definition.duration);

    const rewards = customRewards || definition.activities.map(a => a.rewards);

    const event = await prisma.seasonalEvent.create({
      data: {
        eventName: definition.name,
        eventType,
        description: definition.description,
        startDate: start,
        endDate: end,
        isActive: true,
        rewards: JSON.stringify(rewards),
        participants: JSON.stringify([])
      }
    });

    this.emit('eventCreated', {
      eventType,
      eventName: definition.name,
      duration: definition.duration
    });

    return event;
  }

  async participateInEvent(
    eventId: string,
    userId: string,
    activityId: string
  ): Promise<{
    success: boolean;
    rewards?: any;
    message: string;
  }> {
    const event = await prisma.seasonalEvent.findUnique({
      where: { id: eventId }
    });

    if (!event || !event.isActive) {
      return {
        success: false,
        message: 'Event not found or not active'
      };
    }

    const definition = this.eventDefinitions[event.eventType as keyof typeof this.eventDefinitions];
    const activity = definition.activities.find(a => a.id === activityId);

    if (!activity) {
      return {
        success: false,
        message: 'Activity not found'
      };
    }

    // Check requirements
    const meetsRequirements = await this.checkActivityRequirements(userId, activity.requirements);
    if (!meetsRequirements) {
      return {
        success: false,
        message: 'Requirements not met'
      };
    }

    // Grant rewards
    await this.grantActivityRewards(userId, activity.rewards);

    // Update participants
    const participants = JSON.parse(event.participants as string) as string[];
    if (!participants.includes(userId)) {
      participants.push(userId);
      await prisma.seasonalEvent.update({
        where: { id: eventId },
        data: {
          participants: JSON.stringify(participants)
        }
      });
    }

    this.emit('eventParticipation', {
      userId,
      eventId,
      activityId,
      rewards: activity.rewards
    });

    return {
      success: true,
      rewards: activity.rewards,
      message: `Successfully completed ${activity.name}!`
    };
  }

  private async checkActivityRequirements(userId: string, requirements: any): Promise<boolean> {
    if (!requirements) return true;

    if (requirements.bondLevel) {
      const relationships = await prisma.relationship.findMany({
        where: {
          userId,
          bondLevel: { gte: requirements.bondLevel }
        }
      });
      if (relationships.length === 0) return false;
    }

    if (requirements.emotionalSync) {
      const relationships = await prisma.relationship.findMany({
        where: {
          userId,
          emotionalSync: { gte: requirements.emotionalSync }
        }
      });
      if (relationships.length === 0) return false;
    }

    if (requirements.memoryFlowers) {
      const flowerCount = await prisma.memoryFlower.count({
        where: { userId }
      });
      if (flowerCount < requirements.memoryFlowers) return false;
    }

    if (requirements.questsCompleted) {
      const completedQuests = await prisma.dailyQuest.count({
        where: {
          userId,
          status: 'completed'
        }
      });
      if (completedQuests < requirements.questsCompleted) return false;
    }

    return true;
  }

  private async grantActivityRewards(userId: string, rewards: any): Promise<void> {
    if (rewards.bondExp) {
      const relationships = await prisma.relationship.findMany({
        where: { userId },
        orderBy: { lastInteraction: 'desc' },
        take: 1
      });

      if (relationships.length > 0) {
        await SoulBondService.addBondExperience(
          userId,
          relationships[0].npcId,
          rewards.bondExp,
          'Seasonal event participation'
        );
      }
    }

    if (rewards.influencePoints) {
      await TownReputationService.updateReputation(
        userId,
        'positive',
        rewards.influencePoints,
        'Seasonal event participation'
      );
    }

    if (rewards.emotionalSync) {
      const relationships = await prisma.relationship.findMany({
        where: { userId }
      });

      for (const relationship of relationships) {
        const newSync = Math.min(1.0, relationship.emotionalSync + rewards.emotionalSync);
        await prisma.relationship.update({
          where: { id: relationship.id },
          data: { emotionalSync: newSync }
        });
      }
    }
  }

  async generateHeartFestival(userId: string): Promise<HeartFestivalData> {
    const relationships = await prisma.relationship.findMany({
      where: {
        userId,
        bondLevel: { gte: 3 }
      },
      include: { npc: true },
      orderBy: { bondLevel: 'desc' }
    });

    const confessions = relationships.map(rel => ({
      npcId: rel.npcId,
      npcName: rel.npc.name,
      confession: this.generateConfession(rel.bondLevel, rel.emotionalSync),
      bondLevel: rel.bondLevel
    }));

    const reputation = await TownReputationService.getReputationSummary(userId);
    const townOpinion = this.generateTownOpinion(reputation.townSentiment);

    const specialReward = relationships.some(r => r.bondLevel >= 8) ?
      { title: '眾人之愛', item: 'heart_crystal' } : undefined;

    return {
      userId,
      npcConfessions: confessions,
      townOpinion,
      specialReward
    };
  }

  private generateConfession(bondLevel: number, emotionalSync: number): string {
    const confessionTemplates = {
      low: [
        '你是個不錯的朋友，很高興認識你',
        '和你在一起的時光很愉快',
        '謝謝你一直以來的陪伴'
      ],
      medium: [
        '你對我來說真的很特別',
        '有你在身邊，我感到很幸福',
        '我們的友誼是我最珍貴的寶物'
      ],
      high: [
        '你改變了我的生命，謝謝你的存在',
        '你是我的靈魂伴侶，無可取代',
        '沒有你，我的世界將失去色彩'
      ]
    };

    const level = bondLevel >= 8 ? 'high' : bondLevel >= 5 ? 'medium' : 'low';
    const templates = confessionTemplates[level];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  private generateTownOpinion(sentiment: number): string {
    if (sentiment >= 0.7) {
      return '整個小鎮都愛著你，你是大家的驕傲！';
    } else if (sentiment >= 0.3) {
      return '你在小鎮很受歡迎，大家都喜歡你';
    } else if (sentiment >= 0) {
      return '小鎮對你的看法各不相同，但大多是正面的';
    } else {
      return '你需要更努力地與小鎮居民建立關係';
    }
  }

  async checkAndActivateEvents(): Promise<void> {
    const now = new Date();

    // Deactivate expired events
    await prisma.seasonalEvent.updateMany({
      where: {
        endDate: { lt: now },
        isActive: true
      },
      data: { isActive: false }
    });

    // Check for scheduled events to activate
    const upcomingEvents = await prisma.seasonalEvent.findMany({
      where: {
        startDate: { lte: now },
        endDate: { gte: now },
        isActive: false
      }
    });

    for (const event of upcomingEvents) {
      await prisma.seasonalEvent.update({
        where: { id: event.id },
        data: { isActive: true }
      });

      this.emit('eventActivated', {
        eventId: event.id,
        eventName: event.eventName,
        eventType: event.eventType
      });
    }
  }

  async getActiveEvents(): Promise<SeasonalEvent[]> {
    return prisma.seasonalEvent.findMany({
      where: {
        isActive: true,
        endDate: { gte: new Date() }
      },
      orderBy: { startDate: 'asc' }
    });
  }

  async getEventHistory(limit: number = 10): Promise<SeasonalEvent[]> {
    return prisma.seasonalEvent.findMany({
      where: { isActive: false },
      orderBy: { endDate: 'desc' },
      take: limit
    });
  }
}

export default SeasonalEventService.getInstance();