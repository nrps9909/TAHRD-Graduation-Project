import { PrismaClient } from '@prisma/client';
import SoulBondService from './soulBondService';

const prisma = new PrismaClient();

export interface EmotionVector {
  joy: number;
  sadness: number;
  anger: number;
  fear: number;
  surprise: number;
  love: number;
  trust: number;
  anticipation: number;
}

export interface ResonanceResult {
  syncLevel: number;
  dominantEmotion: string;
  resonanceType: string;
  bonusExp: number;
  specialDialogueUnlocked: boolean;
}

export class EmotionalResonanceService {
  private static instance: EmotionalResonanceService;

  private emotionKeywords: Map<string, string[]> = new Map([
    ['joy', ['開心', '快樂', '愉快', '高興', '欣喜', '歡樂', 'happy', 'joyful']],
    ['sadness', ['難過', '傷心', '悲傷', '失落', '沮喪', 'sad', 'upset']],
    ['anger', ['生氣', '憤怒', '氣憤', '不滿', 'angry', 'mad']],
    ['fear', ['害怕', '恐懼', '擔心', '焦慮', 'afraid', 'scared']],
    ['surprise', ['驚訝', '意外', '震驚', 'surprised', 'shocked']],
    ['love', ['愛', '喜歡', '關心', '在乎', 'love', 'care']],
    ['trust', ['信任', '相信', '依賴', 'trust', 'believe']],
    ['anticipation', ['期待', '期望', '希望', 'hope', 'expect']]
  ]);

  private resonanceThresholds = {
    low: 0.3,
    medium: 0.5,
    high: 0.7,
    perfect: 0.9
  };

  private constructor() {}

  public static getInstance(): EmotionalResonanceService {
    if (!EmotionalResonanceService.instance) {
      EmotionalResonanceService.instance = new EmotionalResonanceService();
    }
    return EmotionalResonanceService.instance;
  }

  async analyzeEmotionalContent(content: string): Promise<EmotionVector> {
    const emotions: EmotionVector = {
      joy: 0,
      sadness: 0,
      anger: 0,
      fear: 0,
      surprise: 0,
      love: 0,
      trust: 0,
      anticipation: 0
    };

    const lowerContent = content.toLowerCase();

    for (const [emotion, keywords] of this.emotionKeywords.entries()) {
      let score = 0;
      for (const keyword of keywords) {
        if (lowerContent.includes(keyword)) {
          score += 1;
        }
      }
      emotions[emotion as keyof EmotionVector] = Math.min(score / keywords.length, 1.0);
    }

    const totalScore = Object.values(emotions).reduce((sum, val) => sum + val, 0);
    if (totalScore > 0) {
      for (const key in emotions) {
        emotions[key as keyof EmotionVector] /= totalScore;
      }
    }

    return emotions;
  }

  async calculateResonance(
    userMessage: string,
    npcResponse: string,
    historicalSync?: number
  ): Promise<ResonanceResult> {
    const userEmotions = await this.analyzeEmotionalContent(userMessage);
    const npcEmotions = await this.analyzeEmotionalContent(npcResponse);

    const syncLevel = this.calculateEmotionalSync(userEmotions, npcEmotions);

    const weightedSync = historicalSync
      ? syncLevel * 0.7 + historicalSync * 0.3
      : syncLevel;

    const dominantUserEmotion = this.getDominantEmotion(userEmotions);
    const dominantNpcEmotion = this.getDominantEmotion(npcEmotions);

    let resonanceType = 'neutral';
    let bonusExp = 0;
    let specialDialogueUnlocked = false;

    if (weightedSync >= this.resonanceThresholds.perfect) {
      resonanceType = 'perfect_harmony';
      bonusExp = 50;
      specialDialogueUnlocked = true;
    } else if (weightedSync >= this.resonanceThresholds.high) {
      resonanceType = 'strong_connection';
      bonusExp = 30;
      specialDialogueUnlocked = Math.random() < 0.5;
    } else if (weightedSync >= this.resonanceThresholds.medium) {
      resonanceType = 'moderate_sync';
      bonusExp = 15;
    } else if (weightedSync >= this.resonanceThresholds.low) {
      resonanceType = 'weak_resonance';
      bonusExp = 5;
    } else {
      resonanceType = 'dissonance';
      bonusExp = 0;
    }

    if (dominantUserEmotion === dominantNpcEmotion) {
      bonusExp *= 1.5;
    }

    return {
      syncLevel: weightedSync,
      dominantEmotion: dominantUserEmotion,
      resonanceType,
      bonusExp: Math.round(bonusExp),
      specialDialogueUnlocked
    };
  }

  private calculateEmotionalSync(emotions1: EmotionVector, emotions2: EmotionVector): number {
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (const key in emotions1) {
      const val1 = emotions1[key as keyof EmotionVector];
      const val2 = emotions2[key as keyof EmotionVector];

      dotProduct += val1 * val2;
      magnitude1 += val1 * val1;
      magnitude2 += val2 * val2;
    }

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2));
  }

  private getDominantEmotion(emotions: EmotionVector): string {
    let maxEmotion = 'neutral';
    let maxValue = 0;

    for (const [emotion, value] of Object.entries(emotions)) {
      if (value > maxValue) {
        maxValue = value;
        maxEmotion = emotion;
      }
    }

    return maxEmotion;
  }

  async processConversationResonance(
    userId: string,
    npcId: string,
    userMessage: string,
    npcResponse: string
  ): Promise<{
    resonance: ResonanceResult;
    relationship: any;
  }> {
    const relationship = await prisma.relationship.findUnique({
      where: {
        userId_npcId: { userId, npcId }
      }
    });

    if (!relationship) {
      throw new Error('Relationship not found');
    }

    const resonance = await this.calculateResonance(
      userMessage,
      npcResponse,
      relationship.emotionalSync
    );

    await prisma.emotionalResonance.create({
      data: {
        relationshipId: relationship.id,
        emotionType: resonance.dominantEmotion,
        resonanceLevel: resonance.syncLevel,
        description: `${resonance.resonanceType} during conversation`
      }
    });

    const updatedRelationship = await SoulBondService.updateEmotionalSync(
      relationship.id,
      resonance.dominantEmotion,
      resonance.syncLevel,
      resonance.resonanceType
    );

    if (resonance.bonusExp > 0) {
      await SoulBondService.addBondExperience(
        userId,
        npcId,
        resonance.bonusExp,
        `Emotional resonance bonus: ${resonance.resonanceType}`
      );
    }

    return {
      resonance,
      relationship: updatedRelationship
    };
  }

  async getEmotionalHistory(
    relationshipId: string,
    limit: number = 10
  ): Promise<{
    averageSync: number;
    emotionDistribution: Record<string, number>;
    trend: 'improving' | 'stable' | 'declining';
  }> {
    const resonances = await prisma.emotionalResonance.findMany({
      where: { relationshipId },
      orderBy: { timestamp: 'desc' },
      take: limit
    });

    if (resonances.length === 0) {
      return {
        averageSync: 0,
        emotionDistribution: {},
        trend: 'stable'
      };
    }

    const avgSync = resonances.reduce((sum, r) => sum + r.resonanceLevel, 0) / resonances.length;

    const emotionCounts: Record<string, number> = {};
    resonances.forEach(r => {
      emotionCounts[r.emotionType] = (emotionCounts[r.emotionType] || 0) + 1;
    });

    const total = resonances.length;
    const emotionDistribution: Record<string, number> = {};
    for (const [emotion, count] of Object.entries(emotionCounts)) {
      emotionDistribution[emotion] = count / total;
    }

    const recentAvg = resonances.slice(0, Math.floor(limit / 2))
      .reduce((sum, r) => sum + r.resonanceLevel, 0) / Math.floor(limit / 2);
    const olderAvg = resonances.slice(Math.floor(limit / 2))
      .reduce((sum, r) => sum + r.resonanceLevel, 0) / (resonances.length - Math.floor(limit / 2));

    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (recentAvg > olderAvg + 0.1) {
      trend = 'improving';
    } else if (recentAvg < olderAvg - 0.1) {
      trend = 'declining';
    }

    return {
      averageSync: avgSync,
      emotionDistribution,
      trend
    };
  }

  async triggerResonanceEvent(
    userId: string,
    npcId: string,
    eventType: 'perfect_sync' | 'emotional_breakthrough' | 'shared_joy' | 'mutual_comfort'
  ): Promise<void> {
    const eventRewards = {
      'perfect_sync': { exp: 100, title: '心靈共振者' },
      'emotional_breakthrough': { exp: 80, title: '情感突破者' },
      'shared_joy': { exp: 60, title: '歡樂分享者' },
      'mutual_comfort': { exp: 70, title: '相互慰藉者' }
    };

    const reward = eventRewards[eventType];

    await SoulBondService.addBondExperience(
      userId,
      npcId,
      reward.exp,
      `Special resonance event: ${eventType}`
    );

    const relationship = await prisma.relationship.findUnique({
      where: {
        userId_npcId: { userId, npcId }
      }
    });

    if (relationship && !relationship.specialTitle) {
      await prisma.relationship.update({
        where: { id: relationship.id },
        data: { specialTitle: reward.title }
      });
    }
  }
}

export default EmotionalResonanceService.getInstance();