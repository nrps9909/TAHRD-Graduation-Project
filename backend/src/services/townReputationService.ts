import { PrismaClient, TownReputation, GossipEntry } from '@prisma/client';
import { EventEmitter } from 'events';

const prisma = new PrismaClient();

interface GossipSpreadResult {
  affectedNpcs: string[];
  sentimentChange: number;
  reputationImpact: number;
}

interface ReputationLevel {
  level: number;
  title: string;
  minPoints: number;
  perks: string[];
}

export class TownReputationService extends EventEmitter {
  private static instance: TownReputationService;

  private reputationLevels: ReputationLevel[] = [
    { level: 0, title: '新來者', minPoints: 0, perks: [] },
    { level: 1, title: '熟面孔', minPoints: 100, perks: ['基本信任'] },
    { level: 2, title: '小鎮居民', minPoints: 300, perks: ['NPC主動打招呼'] },
    { level: 3, title: '受歡迎的人', minPoints: 600, perks: ['特殊對話選項'] },
    { level: 4, title: '小鎮之友', minPoints: 1000, perks: ['NPC分享秘密'] },
    { level: 5, title: '心靈治癒者', minPoints: 1500, perks: ['影響NPC決定'] },
    { level: 6, title: '靈魂導師', minPoints: 2200, perks: ['改變NPC性格'] },
    { level: 7, title: '小鎮傳奇', minPoints: 3000, perks: ['全鎮級事件觸發'] }
  ];

  private reputationTypes = {
    healer: { multiplier: 1.5, description: '善於治癒他人心靈' },
    listener: { multiplier: 1.3, description: '耐心傾聽的好朋友' },
    helper: { multiplier: 1.2, description: '樂於助人的夥伴' },
    troublemaker: { multiplier: 0.7, description: '總是惹麻煩' },
    mysterious: { multiplier: 1.0, description: '神秘的存在' },
    leader: { multiplier: 1.4, description: '天生的領導者' }
  };

  private gossipSpreadRates = {
    positive: { baseRate: 0.8, decay: 0.9 },
    negative: { baseRate: 0.6, decay: 0.85 },
    neutral: { baseRate: 0.5, decay: 0.7 }
  };

  private constructor() {
    super();
  }

  public static getInstance(): TownReputationService {
    if (!TownReputationService.instance) {
      TownReputationService.instance = new TownReputationService();
    }
    return TownReputationService.instance;
  }

  async initializeReputation(userId: string): Promise<TownReputation> {
    const existing = await prisma.townReputation.findUnique({
      where: { userId }
    });

    if (existing) {
      return existing;
    }

    return prisma.townReputation.create({
      data: {
        userId,
        reputationType: 'newcomer',
        reputationLevel: 0,
        influencePoints: 0,
        positiveActions: 0,
        negativeActions: 0
      }
    });
  }

  async updateReputation(
    userId: string,
    action: 'positive' | 'negative',
    points: number,
    reason: string
  ): Promise<TownReputation> {
    const reputation = await prisma.townReputation.findUnique({
      where: { userId }
    });

    if (!reputation) {
      throw new Error('Reputation not found');
    }

    const typeMultiplier = this.reputationTypes[reputation.reputationType as keyof typeof this.reputationTypes]?.multiplier || 1.0;
    const adjustedPoints = Math.round(points * typeMultiplier);

    const updates: any = {
      influencePoints: reputation.influencePoints + (action === 'positive' ? adjustedPoints : -adjustedPoints),
      lastUpdated: new Date()
    };

    if (action === 'positive') {
      updates.positiveActions = reputation.positiveActions + 1;
    } else {
      updates.negativeActions = reputation.negativeActions + 1;
    }

    const newLevel = this.calculateReputationLevel(updates.influencePoints);
    if (newLevel !== reputation.reputationLevel) {
      updates.reputationLevel = newLevel;

      this.emit('reputationLevelUp', {
        userId,
        oldLevel: reputation.reputationLevel,
        newLevel,
        title: this.reputationLevels[newLevel].title
      });
    }

    const newType = this.determineReputationType(
      updates.positiveActions,
      updates.negativeActions
    );
    if (newType !== reputation.reputationType) {
      updates.reputationType = newType;

      this.emit('reputationTypeChanged', {
        userId,
        oldType: reputation.reputationType,
        newType
      });
    }

    return prisma.townReputation.update({
      where: { userId },
      data: updates
    });
  }

  async createGossip(
    userId: string,
    sourceNpcId: string,
    content: string,
    sentiment: number
  ): Promise<GossipEntry> {
    const reputation = await prisma.townReputation.findUnique({
      where: { userId }
    });

    if (!reputation) {
      throw new Error('Reputation not found');
    }

    const allNpcs = await prisma.nPC.findMany({
      select: { id: true }
    });

    const spreadProbability = sentiment > 0 ?
      this.gossipSpreadRates.positive.baseRate :
      sentiment < 0 ?
      this.gossipSpreadRates.negative.baseRate :
      this.gossipSpreadRates.neutral.baseRate;

    const targetNpcIds = allNpcs
      .filter(npc => npc.id !== sourceNpcId && Math.random() < spreadProbability)
      .map(npc => npc.id);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const gossip = await prisma.gossipEntry.create({
      data: {
        sourceNpcId,
        targetNpcIds,
        userId,
        reputationId: reputation.id,
        content,
        sentiment,
        spreadCount: targetNpcIds.length,
        isActive: true,
        createdAt: new Date(),
        expiresAt
      }
    });

    this.emit('gossipCreated', {
      userId,
      sourceNpcId,
      affectedNpcs: targetNpcIds.length,
      sentiment
    });

    const reputationImpact = Math.round(sentiment * 10 * targetNpcIds.length);
    if (Math.abs(reputationImpact) > 0) {
      await this.updateReputation(
        userId,
        sentiment > 0 ? 'positive' : 'negative',
        Math.abs(reputationImpact),
        `Gossip from ${sourceNpcId}`
      );
    }

    return gossip;
  }

  async spreadGossip(gossipId: string): Promise<GossipSpreadResult> {
    const gossip = await prisma.gossipEntry.findUnique({
      where: { id: gossipId },
      include: { sourceNpc: true }
    });

    if (!gossip || !gossip.isActive) {
      throw new Error('Gossip not found or inactive');
    }

    const currentTargets = gossip.targetNpcIds as string[];

    const allNpcs = await prisma.nPC.findMany({
      select: { id: true }
    });

    const availableNpcs = allNpcs.filter(
      npc => !currentTargets.includes(npc.id) && npc.id !== gossip.sourceNpcId
    );

    const spreadRate = gossip.sentiment > 0 ?
      this.gossipSpreadRates.positive.decay :
      gossip.sentiment < 0 ?
      this.gossipSpreadRates.negative.decay :
      this.gossipSpreadRates.neutral.decay;

    const newTargets = availableNpcs
      .filter(() => Math.random() < spreadRate * Math.pow(0.9, gossip.spreadCount))
      .map(npc => npc.id);

    if (newTargets.length > 0) {
      const updatedTargets = [...currentTargets, ...newTargets];

      await prisma.gossipEntry.update({
        where: { id: gossipId },
        data: {
          targetNpcIds: updatedTargets,
          spreadCount: gossip.spreadCount + 1
        }
      });
    }

    const sentimentDecay = gossip.sentiment * 0.9;
    const reputationImpact = Math.round(sentimentDecay * newTargets.length * 5);

    return {
      affectedNpcs: newTargets,
      sentimentChange: sentimentDecay - gossip.sentiment,
      reputationImpact
    };
  }

  async getActiveGossip(userId: string): Promise<GossipEntry[]> {
    return prisma.gossipEntry.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: {
          gte: new Date()
        }
      },
      include: {
        sourceNpc: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async expireOldGossip(): Promise<number> {
    const expired = await prisma.gossipEntry.updateMany({
      where: {
        OR: [
          {
            expiresAt: {
              lt: new Date()
            }
          },
          {
            spreadCount: {
              gte: 5
            }
          }
        ],
        isActive: true
      },
      data: {
        isActive: false
      }
    });

    if (expired.count > 0) {
      this.emit('gossipExpired', {
        count: expired.count
      });
    }

    return expired.count;
  }

  private calculateReputationLevel(influencePoints: number): number {
    let level = 0;
    for (const repLevel of this.reputationLevels) {
      if (influencePoints >= repLevel.minPoints) {
        level = repLevel.level;
      } else {
        break;
      }
    }
    return level;
  }

  private determineReputationType(positiveActions: number, negativeActions: number): string {
    const total = positiveActions + negativeActions;
    if (total === 0) return 'newcomer';

    const positiveRatio = positiveActions / total;

    if (positiveRatio >= 0.9) return 'healer';
    if (positiveRatio >= 0.75) return 'listener';
    if (positiveRatio >= 0.6) return 'helper';
    if (positiveRatio >= 0.4) return 'mysterious';
    if (positiveRatio >= 0.25) return 'leader';
    return 'troublemaker';
  }

  async calculateNpcInitialAttitude(
    npcId: string,
    userId: string
  ): Promise<{
    baseAttitude: number;
    gossipModifier: number;
    finalAttitude: number;
  }> {
    const gossipAboutUser = await prisma.gossipEntry.findMany({
      where: {
        userId,
        isActive: true,
        targetNpcIds: {
          array_contains: npcId
        }
      }
    });

    let gossipModifier = 0;
    for (const gossip of gossipAboutUser) {
      const ageInDays = Math.floor(
        (new Date().getTime() - gossip.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      const decayFactor = Math.pow(0.9, ageInDays);
      gossipModifier += gossip.sentiment * decayFactor * 10;
    }

    const reputation = await prisma.townReputation.findUnique({
      where: { userId }
    });

    const baseAttitude = reputation ?
      50 + (reputation.reputationLevel * 5) :
      50;

    const finalAttitude = Math.max(0, Math.min(100, baseAttitude + gossipModifier));

    return {
      baseAttitude,
      gossipModifier,
      finalAttitude
    };
  }

  async triggerTownEvent(
    userId: string,
    eventType: 'festival' | 'crisis' | 'celebration'
  ): Promise<void> {
    const reputation = await prisma.townReputation.findUnique({
      where: { userId }
    });

    if (!reputation || reputation.reputationLevel < 6) {
      throw new Error('Insufficient reputation level for town events');
    }

    const eventImpact = {
      festival: { points: 100, sentiment: 0.8 },
      crisis: { points: -50, sentiment: -0.3 },
      celebration: { points: 150, sentiment: 1.0 }
    };

    const impact = eventImpact[eventType];

    const allNpcs = await prisma.nPC.findMany();

    for (const npc of allNpcs) {
      await this.createGossip(
        userId,
        npc.id,
        `${eventType} event triggered by user`,
        impact.sentiment
      );
    }

    await this.updateReputation(
      userId,
      impact.points > 0 ? 'positive' : 'negative',
      Math.abs(impact.points),
      `Town event: ${eventType}`
    );

    this.emit('townEventTriggered', {
      userId,
      eventType,
      impact: impact.points
    });
  }

  async getReputationSummary(userId: string): Promise<{
    reputation: TownReputation | null;
    currentLevel: ReputationLevel;
    nextLevel: ReputationLevel | null;
    progressPercentage: number;
    activeGossipCount: number;
    townSentiment: number;
  }> {
    const reputation = await prisma.townReputation.findUnique({
      where: { userId }
    });

    if (!reputation) {
      return {
        reputation: null,
        currentLevel: this.reputationLevels[0],
        nextLevel: this.reputationLevels[1],
        progressPercentage: 0,
        activeGossipCount: 0,
        townSentiment: 0
      };
    }

    const currentLevel = this.reputationLevels[reputation.reputationLevel];
    const nextLevel = this.reputationLevels[reputation.reputationLevel + 1] || null;

    let progressPercentage = 0;
    if (nextLevel) {
      const currentMin = currentLevel.minPoints;
      const nextMin = nextLevel.minPoints;
      const progress = reputation.influencePoints - currentMin;
      const needed = nextMin - currentMin;
      progressPercentage = (progress / needed) * 100;
    }

    const activeGossip = await this.getActiveGossip(userId);
    const townSentiment = activeGossip.reduce((sum, g) => sum + g.sentiment, 0) / (activeGossip.length || 1);

    return {
      reputation,
      currentLevel,
      nextLevel,
      progressPercentage,
      activeGossipCount: activeGossip.length,
      townSentiment
    };
  }
}

export default TownReputationService.getInstance();