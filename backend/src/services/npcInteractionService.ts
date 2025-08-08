import { PrismaClient } from '@prisma/client'
import { geminiService } from './geminiServiceMCP'
import { EventEmitter } from 'events'

const prisma = new PrismaClient()

interface NPCConversation {
  npc1Id: string
  npc2Id: string
  topic: string
  messages: Array<{
    speakerId: string
    content: string
    emotion: string
    timestamp: Date
  }>
}

export class NPCInteractionService extends EventEmitter {
  private activeConversations: Map<string, NPCConversation> = new Map()
  private conversationInterval: NodeJS.Timeout | null = null
  
  // 對話主題池
  private conversationTopics = [
    { topic: '天氣', starter: '今天的天氣真不錯呢！' },
    { topic: '美食', starter: '你知道鎮上新開了一家餐廳嗎？' },
    { topic: '音樂', starter: '最近有聽到什麼好聽的音樂嗎？' },
    { topic: '花園', starter: '花園裡的花開得真美麗！' },
    { topic: '夢想', starter: '你有什麼想要實現的夢想嗎？' },
    { topic: '回憶', starter: '還記得我們第一次見面的時候嗎？' },
    { topic: '節日', starter: '快要到節日了，有什麼計劃嗎？' },
    { topic: '友誼', starter: '能認識你真的很開心！' },
    { topic: '工作', starter: '最近工作還順利嗎？' },
    { topic: '興趣', starter: '你最近有發現什麼新的興趣嗎？' }
  ]

  constructor() {
    super()
    this.startRandomConversations()
  }

  // 啟動隨機NPC對話
  private startRandomConversations() {
    // 每30秒到2分鐘之間觸發一次NPC對話
    const scheduleNext = () => {
      const delay = 30000 + Math.random() * 90000 // 30s to 120s
      this.conversationInterval = setTimeout(() => {
        this.initiateRandomConversation()
        scheduleNext()
      }, delay)
    }
    
    // 初始延遲10秒後開始
    setTimeout(() => {
      this.initiateRandomConversation()
      scheduleNext()
    }, 10000)
  }

  // 發起隨機NPC對話
  private async initiateRandomConversation() {
    try {
      // 獲取主要的3個NPC (修正ID)
      const npcs = await prisma.nPC.findMany({
        where: { id: { in: ['npc-1', 'npc-2', 'npc-3'] } }
      })

      if (npcs.length < 2) return

      // 隨機選擇兩個不同的NPC
      const shuffled = [...npcs].sort(() => 0.5 - Math.random())
      const [npc1, npc2] = shuffled.slice(0, 2)

      // 檢查是否已有活躍對話
      const conversationKey = this.getConversationKey(npc1.id, npc2.id)
      if (this.activeConversations.has(conversationKey)) {
        return // 已有對話進行中
      }

      // 隨機選擇話題
      const topicData = this.conversationTopics[Math.floor(Math.random() * this.conversationTopics.length)]

      // 創建新對話
      const conversation: NPCConversation = {
        npc1Id: npc1.id,
        npc2Id: npc2.id,
        topic: topicData.topic,
        messages: []
      }

      this.activeConversations.set(conversationKey, conversation)

      // 發起對話
      await this.processNPCMessage(npc1, npc2, topicData.starter, conversation)

      // 設定對話回合數（3-5個回合）
      const rounds = 3 + Math.floor(Math.random() * 3)
      
      for (let i = 0; i < rounds; i++) {
        // 等待一段時間後繼續對話
        await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000))
        
        // 交替發言
        const speaker = i % 2 === 0 ? npc2 : npc1
        const listener = i % 2 === 0 ? npc1 : npc2
        
        await this.generateNPCResponse(speaker, listener, conversation)
      }

      // 對話結束
      this.activeConversations.delete(conversationKey)
      
      // 發送對話結束事件
      this.emit('conversationEnded', {
        npc1: npc1.name,
        npc2: npc2.name,
        topic: topicData.topic,
        messages: conversation.messages
      })

    } catch (error) {
      console.error('Error in NPC conversation:', error)
    }
  }

  // 處理NPC消息
  private async processNPCMessage(
    speaker: any,
    listener: any,
    message: string,
    conversation: NPCConversation
  ) {
    try {
      // 分析說話者的情緒
      const emotion = this.analyzeEmotion(message)
      
      // 記錄消息
      const msgData = {
        speakerId: speaker.id,
        content: message,
        emotion,
        timestamp: new Date()
      }
      
      conversation.messages.push(msgData)

      // 發送消息事件（用於前端顯示）
      this.emit('npcMessage', {
        speakerId: speaker.id,
        speakerName: speaker.name,
        listenerId: listener.id,
        listenerName: listener.name,
        content: message,
        emotion,
        topic: conversation.topic
      })

      // 更新NPC心情
      await prisma.nPC.update({
        where: { id: speaker.id },
        data: { currentMood: emotion }
      })

    } catch (error) {
      console.error('Error processing NPC message:', error)
    }
  }

  // 生成NPC回應
  private async generateNPCResponse(
    speaker: any,
    listener: any,
    conversation: NPCConversation
  ) {
    try {
      // 準備對話歷史
      const history = conversation.messages.map(msg => {
        const speakerName = msg.speakerId === speaker.id ? speaker.name : listener.name
        return `${speakerName}: ${msg.content}`
      }).join('\n')

      // 簡化提示詞 - 只告訴基本資訊，其他通過檔案載入
      // 取得對話歷史中最後一句話
      const lastMessage = conversation.messages.length > 0 ? 
        conversation.messages[conversation.messages.length - 1].content : 
        `${listener.name}說話了`
      
      const prompt = `你是「${speaker.name}」，正在與${listener.name}對話。${listener.name}說：${lastMessage}`

      // 使用Gemini生成回應
      const response = await geminiService.generateResponse(prompt, speaker.id)
      
      // 處理生成的消息
      await this.processNPCMessage(speaker, listener, response, conversation)

    } catch (error) {
      console.error('Error generating NPC response:', error)
      // 使用備用回應
      const fallbackResponses = [
        '是啊，我也這麼覺得。',
        '你說得對，確實如此。',
        '嗯，這個話題很有意思。',
        '我很高興能和你聊天。',
        '謝謝你的分享！'
      ]
      const fallback = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)]
      await this.processNPCMessage(speaker, listener, fallback, conversation)
    }
  }

  // 分析情緒
  private analyzeEmotion(message: string): string {
    const emotions = {
      cheerful: ['開心', '快樂', '太好了', '真棒', '喜歡', '愛'],
      calm: ['平靜', '安靜', '舒適', '放鬆', '悠閒'],
      excited: ['興奮', '激動', '期待', '迫不及待', '太棒了'],
      thoughtful: ['思考', '想想', '或許', '可能', '如果'],
      warm: ['溫暖', '友善', '關心', '謝謝', '感激'],
      dreamy: ['夢想', '希望', '美好', '浪漫', '幻想'],
      peaceful: ['和平', '寧靜', '祥和', '安詳', '自然']
    }

    for (const [emotion, keywords] of Object.entries(emotions)) {
      if (keywords.some(keyword => message.includes(keyword))) {
        return emotion
      }
    }

    return 'calm' // 默認情緒
  }

  // 獲取對話鍵值
  private getConversationKey(npc1Id: string, npc2Id: string): string {
    return [npc1Id, npc2Id].sort().join('-')
  }

  // 手動觸發特定NPC之間的對話
  public async triggerConversation(npc1Id: string, npc2Id: string, topic?: string) {
    try {
      const npc1 = await prisma.nPC.findUnique({ where: { id: npc1Id } })
      const npc2 = await prisma.nPC.findUnique({ where: { id: npc2Id } })

      if (!npc1 || !npc2) {
        throw new Error('NPCs not found')
      }

      const conversationKey = this.getConversationKey(npc1Id, npc2Id)
      if (this.activeConversations.has(conversationKey)) {
        return { success: false, message: 'Conversation already in progress' }
      }

      const topicData = topic 
        ? { topic, starter: `我想和你聊聊關於${topic}的事情。` }
        : this.conversationTopics[Math.floor(Math.random() * this.conversationTopics.length)]

      const conversation: NPCConversation = {
        npc1Id,
        npc2Id,
        topic: topicData.topic,
        messages: []
      }

      this.activeConversations.set(conversationKey, conversation)
      
      // 開始對話
      await this.processNPCMessage(npc1, npc2, topicData.starter, conversation)
      
      // 持續對話
      const rounds = 3 + Math.floor(Math.random() * 3)
      for (let i = 0; i < rounds; i++) {
        await new Promise(resolve => setTimeout(resolve, 3000))
        const speaker = i % 2 === 0 ? npc2 : npc1
        const listener = i % 2 === 0 ? npc1 : npc2
        await this.generateNPCResponse(speaker, listener, conversation)
      }

      this.activeConversations.delete(conversationKey)
      
      return { 
        success: true, 
        conversation: conversation.messages 
      }

    } catch (error) {
      console.error('Error triggering conversation:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  // 獲取當前活躍的對話
  public getActiveConversations() {
    return Array.from(this.activeConversations.entries()).map(([key, conv]) => ({
      key,
      npc1Id: conv.npc1Id,
      npc2Id: conv.npc2Id,
      topic: conv.topic,
      messageCount: conv.messages.length
    }))
  }

  // 清理資源
  public cleanup() {
    if (this.conversationInterval) {
      clearTimeout(this.conversationInterval)
    }
    this.removeAllListeners()
  }
}

// 創建單例實例
export const npcInteractionService = new NPCInteractionService()