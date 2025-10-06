import { PrismaClient, Relationship, EmotionalResonance } from '@prisma/client';
import { EventEmitter } from 'events';

const prisma = new PrismaClient();

export interface BondLevelConfig {
  level: number;
  requiredExp: number;
  title: string;
  description: string;
  unlocks: string[];
}

export interface BondEventData {
  userId: string;
  npcId: string;
  previousLevel: number;
  newLevel: number;
  specialTitle?: string;
  unlockedSecrets?: string[];
}

export class SoulBondService extends EventEmitter {
  private static instance: SoulBondService;

  private bondLevelConfigs: BondLevelConfig[] = [
    { level: 0, requiredExp: 0, title: "陌生人", description: "剛認識的關係", unlocks: [] },
    { level: 1, requiredExp: 100, title: "相識", description: "開始了解對方", unlocks: ["基本對話"] },
    { level: 2, requiredExp: 300, title: "熟人", description: "有了初步認識", unlocks: ["日常閒聊"] },
    { level: 3, requiredExp: 600, title: "朋友", description: "建立友誼", unlocks: ["個人喜好話題"] },
    { level: 4, requiredExp: 1000, title: "好友", description: "深厚的友誼", unlocks: ["過去故事", "NPC日記片段"] },
    { level: 5, requiredExp: 1500, title: "知己", description: "心靈相通", unlocks: ["內心感受", "私密話題"] },
    { level: 6, requiredExp: 2200, title: "摯友", description: "無話不談", unlocks: ["童年回憶", "夢想話題"] },
    { level: 7, requiredExp: 3000, title: "靈魂伴侶", description: "心靈契合", unlocks: ["深層恐懼", "隱藏情感"] },
    { level: 8, requiredExp: 4000, title: "生命之光", description: "彼此照亮", unlocks: ["核心秘密提示"] },
    { level: 9, requiredExp: 5200, title: "永恆羈絆", description: "永不分離", unlocks: ["完整過去", "特殊互動"] },
    { level: 10, requiredExp: 6500, title: "命運共同體", description: "生命交織", unlocks: ["核心創傷", "終極秘密"] }
  ];

  private specialTitles: Map<string, string[]> = new Map([
    ['npc-1', ['陸培修的繆斯', '藝術知音', '創作夥伴', '靈感源泉']],
    ['npc-2', ['劉宇岑的陽光', '活力夥伴', '冒險同伴', '歡笑源泉']],
    ['npc-3', ['陳庭安的守護者', '溫柔港灣', '心靈避風港', '靜謐時光']]
  ]);

  private constructor() {
    super();
  }

  public static getInstance(): SoulBondService {
    if (!SoulBondService.instance) {
      SoulBondService.instance = new SoulBondService();
    }
    return SoulBondService.instance;
  }

  async addBondExperience(
    userId: string,
    npcId: string,
    expAmount: number,
    reason: string
  ): Promise<Relationship> {
    const relationship = await prisma.relationship.findUnique({
      where: {
        userId_npcId: {
          userId,
          npcId
        }
      }
    });

    if (!relationship) {
      throw new Error('Relationship not found');
    }

    const previousLevel = relationship.bondLevel;
    const newExp = relationship.bondExp + expAmount;
    const { level: newLevel, overflow } = this.calculateBondLevel(newExp);

    const updates: any = {
      bondExp: overflow,
      bondLevel: newLevel,
      totalInteractions: relationship.totalInteractions + 1,
      lastInteraction: new Date()
    };

    if (newLevel > previousLevel) {
      const levelConfig = this.bondLevelConfigs[newLevel];
      const milestone = {
        level: newLevel,
        title: levelConfig.title,
        unlockedAt: new Date().toISOString(),
        reason
      };

      const milestones = (relationship.bondMilestones as any[]) || [];
      milestones.push(milestone);
      updates.bondMilestones = milestones;

      if (newLevel >= 4) {
        const titles = this.specialTitles.get(npcId) || [];
        const titleIndex = Math.min(Math.floor((newLevel - 4) / 2), titles.length - 1);
        if (titleIndex >= 0 && titles[titleIndex]) {
          updates.specialTitle = titles[titleIndex];
        }
      }

      const unlockedSecrets = (relationship.secretsUnlocked as string[]) || [];
      unlockedSecrets.push(...levelConfig.unlocks);
      updates.secretsUnlocked = unlockedSecrets;

      this.emit('bondLevelUp', {
        userId,
        npcId,
        previousLevel,
        newLevel,
        specialTitle: updates.specialTitle,
        unlockedSecrets: levelConfig.unlocks
      } as BondEventData);
    }

    return prisma.relationship.update({
      where: {
        userId_npcId: {
          userId,
          npcId
        }
      },
      data: updates
    });
  }

  async updateEmotionalSync(
    relationshipId: string,
    emotionType: string,
    resonanceLevel: number,
    description?: string
  ): Promise<{ relationship: Relationship; resonance: EmotionalResonance }> {
    const resonance = await prisma.emotionalResonance.create({
      data: {
        relationshipId,
        emotionType,
        resonanceLevel,
        description,
        timestamp: new Date()
      }
    });

    const recentResonances = await prisma.emotionalResonance.findMany({
      where: {
        relationshipId,
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 10
    });

    const avgSync = recentResonances.reduce((sum, r) => sum + r.resonanceLevel, 0) / recentResonances.length;

    const relationship = await prisma.relationship.update({
      where: { id: relationshipId },
      data: { emotionalSync: Math.min(1.0, avgSync) }
    });

    if (avgSync >= 0.8) {
      this.emit('highEmotionalSync', {
        relationshipId,
        syncLevel: avgSync,
        emotionType
      });
    }

    return { relationship, resonance };
  }

  private calculateBondLevel(totalExp: number): { level: number; overflow: number } {
    let level = 0;
    let remainingExp = totalExp;

    for (const config of this.bondLevelConfigs) {
      if (remainingExp >= config.requiredExp) {
        level = config.level;
      } else {
        break;
      }
    }

    if (level === 10) {
      return { level: 10, overflow: 0 };
    }

    const currentLevelExp = this.bondLevelConfigs[level].requiredExp;
    const nextLevelExp = this.bondLevelConfigs[level + 1]?.requiredExp || currentLevelExp;
    const overflow = totalExp - currentLevelExp;

    return { level, overflow: Math.max(0, overflow) };
  }

  async calculateExpFromInteraction(
    userId: string,
    npcId: string,
    interactionType: string,
    emotionIntensity: number
  ): Promise<number> {
    const baseExpMap: Record<string, number> = {
      'normal_conversation': 10,
      'deep_conversation': 25,
      'emotional_support': 40,
      'shared_activity': 30,
      'gift_giving': 35,
      'conflict_resolution': 50,
      'secret_sharing': 60
    };

    const baseExp = baseExpMap[interactionType] || 10;
    const emotionMultiplier = 1 + (emotionIntensity * 0.5);

    const relationship = await prisma.relationship.findUnique({
      where: {
        userId_npcId: { userId, npcId }
      }
    });

    const syncBonus = relationship ? 1 + (relationship.emotionalSync * 0.3) : 1;

    return Math.round(baseExp * emotionMultiplier * syncBonus);
  }

  async getBondLevelInfo(userId: string, npcId: string): Promise<{
    currentLevel: BondLevelConfig;
    nextLevel: BondLevelConfig | null;
    progressPercentage: number;
    unlockedContent: string[];
    specialTitle: string | null;
  }> {
    const relationship = await prisma.relationship.findUnique({
      where: {
        userId_npcId: { userId, npcId }
      }
    });

    if (!relationship) {
      throw new Error('Relationship not found');
    }

    const currentLevel = this.bondLevelConfigs[relationship.bondLevel];
    const nextLevel = this.bondLevelConfigs[relationship.bondLevel + 1] || null;

    let progressPercentage = 0;
    if (nextLevel) {
      const currentLevelExp = currentLevel.requiredExp;
      const nextLevelExp = nextLevel.requiredExp;
      const expNeeded = nextLevelExp - currentLevelExp;
      progressPercentage = (relationship.bondExp / expNeeded) * 100;
    }

    return {
      currentLevel,
      nextLevel,
      progressPercentage,
      unlockedContent: (relationship.secretsUnlocked as string[]) || [],
      specialTitle: relationship.specialTitle
    };
  }

  async checkBondMilestones(userId: string, npcId: string): Promise<string[]> {
    const relationship = await prisma.relationship.findUnique({
      where: {
        userId_npcId: { userId, npcId }
      }
    });

    if (!relationship) {
      return [];
    }

    const achievements: string[] = [];

    if (relationship.bondLevel >= 10) {
      achievements.push('ultimate_bond');
    }
    if (relationship.emotionalSync >= 0.9) {
      achievements.push('perfect_sync');
    }
    if (relationship.totalInteractions >= 100) {
      achievements.push('centurion');
    }
    if (relationship.specialTitle) {
      achievements.push('titled_friend');
    }

    return achievements;
  }
}

export default SoulBondService.getInstance();