import { logger } from '../utils/logger'
import { geminiTracker } from '../utils/geminiTracker'
import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'
import SoulBondService from './soulBondService'
import EmotionalResonanceService from './emotionalResonanceService'
import TownReputationService from './townReputationService'
import AchievementService from './achievementService'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface NPCPersonality {
  id: string
  name: string
  personality: string
  backgroundStory?: string
  currentMood: string
}

interface SoulBondContext {
  bondLevel: number
  bondExp: number
  emotionalSync: number
  specialTitle?: string
  unlockedSecrets: string[]
  recentResonances: Array<{
    emotionType: string
    resonanceLevel: number
    timestamp: Date
  }>
}

interface ConversationContext {
  recentMessages: Array<{
    speaker: 'user' | 'npc'
    content: string
    timestamp: Date
  }>
  relationshipLevel: number
  trustLevel: number
  affectionLevel: number
  userDiaryEntries?: string[]
  soulBond?: SoulBondContext
  townReputation?: {
    level: number
    type: string
    gossipSentiment: number
  }
}

interface AIResponse {
  content: string
  emotionTag: string
  suggestedActions: string[]
  memoryFlowerData?: {
    flowerType: string
    emotionColor: string
  }
  relationshipImpact: {
    trustChange: number
    affectionChange: number
    levelChange: number
  }
  moodChange?: string
  bondImpact?: {
    expGained: number
    resonanceLevel: number
    specialDialogueUnlocked: boolean
  }
}

export class GeminiMCPWithSoulBondService {
  private mcpUrl: string
  private sessionId: string

  constructor() {
    this.mcpUrl = process.env.MCP_SERVICE_URL || 'http://localhost:8765'
    this.sessionId = uuidv4()
    this.initialize()
  }

  private async initialize() {
    try {
      const response = await axios.get(`${this.mcpUrl}/status`)
      logger.info('🚀 MCP Soul Bond 服務連接成功:', response.data)
    } catch (error) {
      logger.error('MCP 服務連接失敗:', error)
      logger.warn('降級到備用模式')
    }
  }

  async generateNPCResponse(
    npcPersonality: NPCPersonality,
    userMessage: string,
    context: ConversationContext,
    userId: string
  ): Promise<AIResponse> {
    const trackingId = geminiTracker.startTracking(
      npcPersonality.id,
      npcPersonality.name,
      userMessage,
      this.sessionId
    )

    // 獲取羈絆資訊
    const bondInfo = await this.getBondContext(userId, npcPersonality.id)
    context.soulBond = bondInfo

    // 獲取小鎮聲望資訊
    const reputationInfo = await this.getReputationContext(userId, npcPersonality.id)
    context.townReputation = reputationInfo

    // 根據羈絆等級調整系統提示
    const bondPrompt = this.generateBondPrompt(bondInfo)
    const reputationPrompt = this.generateReputationPrompt(reputationInfo)

    geminiTracker.recordContext({
      mood: npcPersonality.currentMood,
      relationshipLevel: context.relationshipLevel,
      bondLevel: bondInfo.bondLevel,
      emotionalSync: bondInfo.emotionalSync,
      townReputation: reputationInfo.type
    })

    const startTime = Date.now()

    try {
      // 調用增強版 MCP 服務
      const response = await axios.post(`${this.mcpUrl}/generate`, {
        npc_id: npcPersonality.id,
        message: userMessage,
        context: {
          mood: npcPersonality.currentMood,
          relationship_level: context.relationshipLevel,
          trust_level: context.trustLevel,
          affection_level: context.affectionLevel,
          // 新增羈絆系統上下文
          bond_level: bondInfo.bondLevel,
          emotional_sync: bondInfo.emotionalSync,
          unlocked_secrets: bondInfo.unlockedSecrets,
          special_title: bondInfo.specialTitle,
          town_reputation: reputationInfo.type,
          gossip_sentiment: reputationInfo.gossipSentiment,
          // 系統提示增強
          system_prompts: {
            bond_prompt: bondPrompt,
            reputation_prompt: reputationPrompt
          }
        },
        session_id: this.sessionId
      })

      const aiResponse = response.data.response

      // 處理情緒共鳴
      const resonanceResult = await EmotionalResonanceService.processConversationResonance(
        userId,
        npcPersonality.id,
        userMessage,
        aiResponse.content
      )

      // 計算羈絆經驗
      const expGained = await SoulBondService.calculateExpFromInteraction(
        userId,
        npcPersonality.id,
        this.determineInteractionType(userMessage, aiResponse.content),
        resonanceResult.resonance.syncLevel
      )

      // 增加羈絆經驗
      await SoulBondService.addBondExperience(
        userId,
        npcPersonality.id,
        expGained,
        `Conversation: ${userMessage.substring(0, 50)}...`
      )

      // 檢查成就
      await this.checkConversationAchievements(
        userId,
        npcPersonality.id,
        resonanceResult.resonance
      )

      // 處理八卦傳播（如果對話內容值得傳播）
      if (this.shouldCreateGossip(resonanceResult.resonance.syncLevel, bondInfo.bondLevel)) {
        await TownReputationService.createGossip(
          userId,
          npcPersonality.id,
          this.generateGossipContent(userMessage, aiResponse.content, bondInfo.bondLevel),
          resonanceResult.resonance.syncLevel
        )
      }

      const responseTime = Date.now() - startTime
      geminiTracker.recordResponse(aiResponse.content, responseTime)

      // 返回增強的回應
      return {
        ...aiResponse,
        bondImpact: {
          expGained,
          resonanceLevel: resonanceResult.resonance.syncLevel,
          specialDialogueUnlocked: resonanceResult.resonance.specialDialogueUnlocked
        }
      }

    } catch (error: any) {
      geminiTracker.recordError(error.message || 'Unknown error')
      logger.error('MCP Soul Bond 服務錯誤:', error)
      throw error
    } finally {
      geminiTracker.endTracking()
    }
  }

  private async getBondContext(userId: string, npcId: string): Promise<SoulBondContext> {
    const relationship = await prisma.relationship.findUnique({
      where: {
        userId_npcId: { userId, npcId }
      }
    })

    if (!relationship) {
      // 初始化關係
      const newRelationship = await prisma.relationship.create({
        data: {
          userId,
          npcId,
          relationshipLevel: 1,
          trustLevel: 0,
          affectionLevel: 0,
          bondLevel: 0,
          bondExp: 0,
          emotionalSync: 0,
          secretsUnlocked: [],
          bondMilestones: []
        }
      })
      return {
        bondLevel: 0,
        bondExp: 0,
        emotionalSync: 0,
        unlockedSecrets: [],
        recentResonances: []
      }
    }

    const recentResonances = await prisma.emotionalResonance.findMany({
      where: { relationshipId: relationship.id },
      orderBy: { timestamp: 'desc' },
      take: 5
    })

    return {
      bondLevel: relationship.bondLevel,
      bondExp: relationship.bondExp,
      emotionalSync: relationship.emotionalSync,
      specialTitle: relationship.specialTitle || undefined,
      unlockedSecrets: (relationship.secretsUnlocked as string[]) || [],
      recentResonances: recentResonances.map(r => ({
        emotionType: r.emotionType,
        resonanceLevel: r.resonanceLevel,
        timestamp: r.timestamp
      }))
    }
  }

  private async getReputationContext(userId: string, npcId: string): Promise<any> {
    const reputation = await TownReputationService.getReputationSummary(userId)
    const npcAttitude = await TownReputationService.calculateNpcInitialAttitude(npcId, userId)

    return {
      level: reputation.reputation?.reputationLevel || 0,
      type: reputation.reputation?.reputationType || 'newcomer',
      gossipSentiment: reputation.townSentiment,
      npcAttitude: npcAttitude.finalAttitude
    }
  }

  private generateBondPrompt(bondContext: SoulBondContext): string {
    const prompts = []

    // 根據羈絆等級生成提示
    if (bondContext.bondLevel === 0) {
      prompts.push('你剛認識這個人，保持禮貌但有些距離感')
    } else if (bondContext.bondLevel <= 3) {
      prompts.push('你們是相識的朋友，可以進行日常對話')
    } else if (bondContext.bondLevel <= 6) {
      prompts.push('你們是親密的朋友，可以分享個人感受和故事')
    } else if (bondContext.bondLevel <= 9) {
      prompts.push('你們是知己摯友，可以談論深層的情感和秘密')
    } else {
      prompts.push('你們是靈魂伴侶，彼此完全理解和信任')
    }

    // 根據情緒同步度調整
    if (bondContext.emotionalSync >= 0.8) {
      prompts.push('你們的情緒高度同步，能夠深刻理解對方的感受')
    } else if (bondContext.emotionalSync >= 0.5) {
      prompts.push('你們有不錯的情緒共鳴，試著更理解對方')
    }

    // 根據特殊稱號調整
    if (bondContext.specialTitle) {
      prompts.push(`對方是你的${bondContext.specialTitle}，這個身份對你很特別`)
    }

    // 根據解鎖的秘密調整
    if (bondContext.unlockedSecrets.includes('核心秘密')) {
      prompts.push('你可以談論你最深層的秘密和創傷')
    } else if (bondContext.unlockedSecrets.includes('過去故事')) {
      prompts.push('你可以分享你的過去經歷')
    }

    return prompts.join('。')
  }

  private generateReputationPrompt(reputationContext: any): string {
    const prompts = []

    // 根據NPC對玩家的態度調整
    if (reputationContext.npcAttitude >= 80) {
      prompts.push('你聽說過很多關於這個人的好事，對他印象很好')
    } else if (reputationContext.npcAttitude >= 60) {
      prompts.push('你聽說過一些關於這個人的事，有些好奇')
    } else if (reputationContext.npcAttitude <= 30) {
      prompts.push('你聽說了一些關於這個人的負面消息，有些謹慎')
    }

    // 根據玩家的聲望類型調整
    switch (reputationContext.type) {
      case 'healer':
        prompts.push('你知道對方善於治癒他人的心靈')
        break
      case 'listener':
        prompts.push('你知道對方是個很好的傾聽者')
        break
      case 'troublemaker':
        prompts.push('你聽說對方有時會惹麻煩')
        break
      case 'mysterious':
        prompts.push('你覺得對方很神秘，想了解更多')
        break
    }

    return prompts.join('。')
  }

  private determineInteractionType(userMessage: string, npcResponse: string): string {
    const emotionalKeywords = ['難過', '開心', '害怕', '生氣', 'sad', 'happy', 'afraid', 'angry']
    const deepKeywords = ['為什麼', '如何', '感覺', '想法', 'why', 'how', 'feel', 'think']
    const supportKeywords = ['幫助', '支持', '安慰', '鼓勵', 'help', 'support', 'comfort', 'encourage']

    const combinedText = userMessage.toLowerCase() + ' ' + npcResponse.toLowerCase()

    if (supportKeywords.some(kw => combinedText.includes(kw))) {
      return 'emotional_support'
    }
    if (deepKeywords.filter(kw => combinedText.includes(kw)).length >= 2) {
      return 'deep_conversation'
    }
    if (emotionalKeywords.some(kw => combinedText.includes(kw))) {
      return 'emotional_conversation'
    }

    return 'normal_conversation'
  }

  private shouldCreateGossip(syncLevel: number, bondLevel: number): boolean {
    // 高同步度或高羈絆等級的對話更容易產生八卦
    const probability = (syncLevel * 0.3 + bondLevel * 0.05)
    return Math.random() < probability
  }

  private generateGossipContent(userMessage: string, npcResponse: string, bondLevel: number): string {
    const gossipTemplates = [
      `和玩家聊得很開心，他們的關係似乎更親近了`,
      `玩家說了些有趣的話，讓我印象深刻`,
      `我們進行了一次深入的對話，很有意義`,
      `玩家真的很懂得傾聽，是個好朋友`
    ]

    if (bondLevel >= 7) {
      return `我們之間有著特別的連結，這種感覺很美好`
    }

    return gossipTemplates[Math.floor(Math.random() * gossipTemplates.length)]
  }

  private async checkConversationAchievements(
    userId: string,
    npcId: string,
    resonance: any
  ): Promise<void> {
    // 檢查情緒共鳴成就
    if (resonance.syncLevel >= 1.0) {
      await AchievementService.checkAchievement(userId, 'perfect_resonance', { resonance })
    }

    // 檢查對話深度成就
    if (resonance.resonanceType === 'perfect_harmony') {
      await AchievementService.checkAchievement(userId, 'harmony_master', { resonance })
    }

    // 檢查首次觸動成就
    if (resonance.dominantEmotion === 'sadness' && resonance.syncLevel >= 0.8) {
      await AchievementService.checkAchievement(userId, 'first_tears', {
        npcId,
        emotionalImpact: 'tears'
      })
    }
  }
}

export default new GeminiMCPWithSoulBondService()