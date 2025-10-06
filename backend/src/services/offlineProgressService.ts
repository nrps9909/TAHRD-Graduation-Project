import { PrismaClient, OfflineProgress } from '@prisma/client';
import { EventEmitter } from 'events';
import SoulBondService from './soulBondService';

const prisma = new PrismaClient();

interface OfflineEvent {
  type: string;
  content: string;
  emotionChange: number;
  npcId: string;
}

interface ReunionDialogue {
  npcId: string;
  npcName: string;
  message: string;
  emotion: string;
  bondImpact: number;
}

export class OfflineProgressService extends EventEmitter {
  private static instance: OfflineProgressService;

  private eventTemplates = {
    miss_you: [
      { content: '{npcName}想起了你們上次的對話，露出了微笑', emotionChange: 0.1 },
      { content: '{npcName}看著窗外，希望你一切都好', emotionChange: 0.15 },
      { content: '{npcName}在日記中寫下了對你的思念', emotionChange: 0.2 },
      { content: '{npcName}夢見了你，醒來時有些失落', emotionChange: 0.25 }
    ],
    worry_about: [
      { content: '{npcName}擔心你是否遇到了困難', emotionChange: -0.1 },
      { content: '{npcName}向其他人打聽你的消息', emotionChange: -0.05 },
      { content: '{npcName}在想是不是自己說錯了什麼話', emotionChange: -0.15 }
    ],
    remember_moment: [
      { content: '{npcName}回憶起你們一起度過的美好時光', emotionChange: 0.2 },
      { content: '{npcName}翻看著與你相關的回憶', emotionChange: 0.15 },
      { content: '{npcName}對朋友提起了你的趣事', emotionChange: 0.1 }
    ],
    daily_life: [
      { content: '{npcName}繼續著日常生活，偶爾會想起你', emotionChange: 0 },
      { content: '{npcName}遇到了一些有趣的事，想要與你分享', emotionChange: 0.05 },
      { content: '{npcName}在創作中加入了與你有關的元素', emotionChange: 0.1 }
    ]
  };

  private reunionTemplates = {
    short_absence: [
      '終於回來了！我還在想你去哪了呢',
      '歡迎回來！有好多事想跟你分享',
      '你回來啦！正好，我有些話想對你說'
    ],
    medium_absence: [
      '好久不見！我真的很想你',
      '你終於回來了！我一直在等你',
      '太好了，你沒事！我有點擔心你'
    ],
    long_absence: [
      '真的是你嗎？我以為你不會回來了...',
      '天啊，你回來了！我有太多話想對你說',
      '我...我沒想到還能再見到你'
    ]
  };

  private npcPersonalities = new Map([
    ['npc-1', { missRate: 0.8, worryRate: 0.3, dreamRate: 0.6 }],
    ['npc-2', { missRate: 0.6, worryRate: 0.5, dreamRate: 0.4 }],
    ['npc-3', { missRate: 0.7, worryRate: 0.6, dreamRate: 0.5 }]
  ]);

  private constructor() {
    super();
  }

  public static getInstance(): OfflineProgressService {
    if (!OfflineProgressService.instance) {
      OfflineProgressService.instance = new OfflineProgressService();
    }
    return OfflineProgressService.instance;
  }

  async generateOfflineEvents(
    userId: string,
    offlineDurationHours: number
  ): Promise<OfflineProgress[]> {
    const relationships = await prisma.relationship.findMany({
      where: { userId },
      include: { npc: true }
    });

    const events: OfflineProgress[] = [];

    for (const relationship of relationships) {
      const personality = this.npcPersonalities.get(relationship.npcId) || {
        missRate: 0.5,
        worryRate: 0.3,
        dreamRate: 0.4
      };

      const eventCount = this.calculateEventCount(
        offlineDurationHours,
        relationship.bondLevel
      );

      for (let i = 0; i < eventCount; i++) {
        const eventType = this.selectEventType(
          offlineDurationHours,
          relationship.bondLevel,
          personality
        );

        const template = this.getRandomTemplate(eventType);
        const content = template.content.replace('{npcName}', relationship.npc.name);

        const event = await prisma.offlineProgress.create({
          data: {
            userId,
            npcId: relationship.npcId,
            eventType,
            content,
            emotionChange: template.emotionChange * (1 + relationship.bondLevel * 0.1),
            occurredAt: new Date(Date.now() - Math.random() * offlineDurationHours * 3600000),
            wasViewed: false
          }
        });

        events.push(event);

        if (template.emotionChange !== 0) {
          await this.updateRelationshipFromOffline(
            relationship.id,
            template.emotionChange
          );
        }
      }
    }

    this.emit('offlineEventsGenerated', {
      userId,
      eventCount: events.length,
      duration: offlineDurationHours
    });

    return events;
  }

  private calculateEventCount(offlineHours: number, bondLevel: number): number {
    if (offlineHours < 1) return 0;
    if (offlineHours < 6) return Math.min(1, Math.floor(bondLevel / 3));
    if (offlineHours < 24) return Math.min(3, 1 + Math.floor(bondLevel / 2));
    if (offlineHours < 72) return Math.min(5, 2 + Math.floor(bondLevel / 2));
    return Math.min(10, 3 + bondLevel);
  }

  private selectEventType(
    offlineHours: number,
    bondLevel: number,
    personality: any
  ): string {
    const random = Math.random();

    if (offlineHours > 48 && bondLevel >= 5) {
      if (random < personality.worryRate) return 'worry_about';
    }

    if (bondLevel >= 7 && random < personality.dreamRate) {
      return 'miss_you';
    }

    if (bondLevel >= 4 && random < 0.4) {
      return 'remember_moment';
    }

    return 'daily_life';
  }

  private getRandomTemplate(eventType: string): any {
    const templates = this.eventTemplates[eventType as keyof typeof this.eventTemplates] || this.eventTemplates.daily_life;
    return templates[Math.floor(Math.random() * templates.length)];
  }

  private async updateRelationshipFromOffline(
    relationshipId: string,
    emotionChange: number
  ): Promise<void> {
    const relationship = await prisma.relationship.findUnique({
      where: { id: relationshipId }
    });

    if (!relationship) return;

    const newAffection = Math.max(
      0,
      Math.min(1, relationship.affectionLevel + emotionChange)
    );

    await prisma.relationship.update({
      where: { id: relationshipId },
      data: { affectionLevel: newAffection }
    });
  }

  async generateReunionDialogues(
    userId: string,
    offlineDurationHours: number
  ): Promise<ReunionDialogue[]> {
    const relationships = await prisma.relationship.findMany({
      where: {
        userId,
        bondLevel: { gte: 3 }
      },
      include: { npc: true },
      orderBy: { bondLevel: 'desc' },
      take: 3
    });

    const dialogues: ReunionDialogue[] = [];

    for (const relationship of relationships) {
      const absenceType = this.getAbsenceType(offlineDurationHours);
      const templates = this.reunionTemplates[absenceType];
      const message = templates[Math.floor(Math.random() * templates.length)];

      const emotion = offlineDurationHours > 72 ? 'emotional' :
                      offlineDurationHours > 24 ? 'happy' : 'cheerful';

      const bondImpact = Math.min(
        50,
        Math.floor(offlineDurationHours / 24) * 10 * (1 + relationship.bondLevel * 0.1)
      );

      dialogues.push({
        npcId: relationship.npcId,
        npcName: relationship.npc.name,
        message,
        emotion,
        bondImpact
      });

      await SoulBondService.addBondExperience(
        userId,
        relationship.npcId,
        bondImpact,
        'Reunion after absence'
      );
    }

    return dialogues;
  }

  private getAbsenceType(offlineHours: number): string {
    if (offlineHours < 24) return 'short_absence';
    if (offlineHours < 72) return 'medium_absence';
    return 'long_absence';
  }

  async getUnviewedEvents(userId: string): Promise<OfflineProgress[]> {
    return prisma.offlineProgress.findMany({
      where: {
        userId,
        wasViewed: false
      },
      include: {
        npc: true
      },
      orderBy: {
        occurredAt: 'desc'
      }
    });
  }

  async markEventsAsViewed(userId: string): Promise<void> {
    await prisma.offlineProgress.updateMany({
      where: {
        userId,
        wasViewed: false
      },
      data: {
        wasViewed: true
      }
    });
  }

  async processPlayerReturn(userId: string): Promise<{
    offlineEvents: OfflineProgress[];
    reunionDialogues: ReunionDialogue[];
    summary: string;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !user.lastLogin) {
      return {
        offlineEvents: [],
        reunionDialogues: [],
        summary: 'Welcome back!'
      };
    }

    const offlineDuration = Date.now() - user.lastLogin.getTime();
    const offlineHours = offlineDuration / (1000 * 60 * 60);

    const offlineEvents = await this.generateOfflineEvents(userId, offlineHours);
    const reunionDialogues = await this.generateReunionDialogues(userId, offlineHours);

    const summary = this.generateReturnSummary(offlineEvents, offlineHours);

    await prisma.user.update({
      where: { id: userId },
      data: { lastLogin: new Date() }
    });

    this.emit('playerReturned', {
      userId,
      offlineHours,
      eventCount: offlineEvents.length
    });

    return {
      offlineEvents,
      reunionDialogues,
      summary
    };
  }

  private generateReturnSummary(events: OfflineProgress[], offlineHours: number): string {
    if (offlineHours < 1) {
      return '歡迎回來！小鎮一切如常。';
    }

    const missEvents = events.filter(e => e.eventType === 'miss_you').length;
    const worryEvents = events.filter(e => e.eventType === 'worry_about').length;

    if (worryEvents > 2) {
      return `你離開的這段時間，有${worryEvents}位朋友在擔心你...`;
    }

    if (missEvents > 3) {
      return `離開的${Math.floor(offlineHours)}小時裡，大家都很想念你！`;
    }

    if (events.length > 0) {
      return `你不在的時候，小鎮發生了${events.length}件與你有關的事...`;
    }

    return '歡迎回到心語小鎮！';
  }

  async simulateNPCDreams(userId: string, npcId: string): Promise<{
    dreamContent: string;
    emotionalImpact: number;
    bondBonus: number;
  }> {
    const relationship = await prisma.relationship.findUnique({
      where: {
        userId_npcId: { userId, npcId }
      }
    });

    if (!relationship || relationship.bondLevel < 7) {
      return {
        dreamContent: '',
        emotionalImpact: 0,
        bondBonus: 0
      };
    }

    const dreamScenarios = [
      {
        content: 'NPC夢見了你們第一次見面的場景，醒來時充滿懷念',
        emotionalImpact: 0.3,
        bondBonus: 15
      },
      {
        content: 'NPC夢見你遇到困難，醒來後決定要更加支持你',
        emotionalImpact: 0.4,
        bondBonus: 20
      },
      {
        content: 'NPC夢見了一個關於你們未來的美好場景',
        emotionalImpact: 0.5,
        bondBonus: 25
      }
    ];

    const dream = dreamScenarios[Math.floor(Math.random() * dreamScenarios.length)];

    await prisma.offlineProgress.create({
      data: {
        userId,
        npcId,
        eventType: 'dream',
        content: dream.content,
        emotionChange: dream.emotionalImpact,
        occurredAt: new Date(),
        wasViewed: false
      }
    });

    return dream;
  }
}

export default OfflineProgressService.getInstance();