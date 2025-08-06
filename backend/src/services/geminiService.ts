import { GoogleGenerativeAI } from '@google/generative-ai'
import { logger } from '../utils/logger'
import { spawn } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import * as dotenv from 'dotenv'

interface NPCPersonality {
  id: string
  name: string
  personality: string
  backgroundStory?: string
  currentMood: string
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
}

export class GeminiService {
  private genAI?: GoogleGenerativeAI
  private model?: any
  private useGeminiCLI: boolean

  constructor() {
    // 可以透過環境變數控制是否使用 Gemini CLI
    this.useGeminiCLI = process.env.USE_GEMINI_CLI === 'true'
    
    const apiKey = process.env.GEMINI_API_KEY
    if (!this.useGeminiCLI && (!apiKey || apiKey === 'your-api-key')) {
      throw new Error('GEMINI_API_KEY is required when USE_GEMINI_CLI is false')
    }
    
    if (!this.useGeminiCLI) {
      this.genAI = new GoogleGenerativeAI(apiKey!)
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })
    }
  }

  async generateNPCResponse(
    npcPersonality: NPCPersonality,
    userMessage: string,
    context: ConversationContext
  ): Promise<AIResponse> {
    try {
      // 根據配置選擇使用 CLI 或直接 API
      if (this.useGeminiCLI) {
        return await this.generateNPCResponseWithCLI(npcPersonality, userMessage, context)
      } else {
        return await this.generateNPCResponseWithAPI(npcPersonality, userMessage, context)
      }
    } catch (error) {
      logger.error('Gemini generation error:', error)
      
      // 降級處理 - 返回預設回應
      return this.getFallbackResponse(npcPersonality, userMessage)
    }
  }

  // 新增：生成簡單回應（用於NPC之間的對話）
  async generateResponse(prompt: string, npcId: string): Promise<string> {
    try {
      if (this.useGeminiCLI) {
        return await this.generateSimpleResponseWithCLI(prompt, npcId)
      } else {
        const result = await this.model.generateContent(prompt)
        const response = await result.response
        return response.text().trim()
      }
    } catch (error) {
      logger.error('Simple response generation error:', error)
      // 返回備用回應
      const fallbacks = [
        '是啊，我也這麼覺得。',
        '你說得對！',
        '嗯，這很有趣。',
        '謝謝你的分享。',
        '我很高興能和你聊天。'
      ]
      return fallbacks[Math.floor(Math.random() * fallbacks.length)]
    }
  }

  // 生成簡單回應（CLI版本）
  private async generateSimpleResponseWithCLI(prompt: string, npcId: string): Promise<string> {
    try {
      // 建立臨時 JSON 檔案
      const tempDir = path.join(process.cwd(), 'temp')
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
      }
      
      const tempFileName = `simple_conversation_${uuidv4()}.json`
      const tempFilePath = path.join(tempDir, tempFileName)
      
      // 準備簡單對話資料
      const conversationData = {
        message: prompt,
        npcData: {
          id: npcId,
          name: this.getNPCName(npcId),
          personality: this.getNPCPersonality(npcId),
          currentMood: 'neutral',
          relationshipLevel: 5
        },
        context: {
          recentMessages: [],
          timestamp: new Date().toISOString()
        }
      }
      
      // 寫入 JSON 檔案
      fs.writeFileSync(tempFilePath, JSON.stringify(conversationData, null, 2), 'utf-8')
      logger.info(`Created temp JSON file for simple response: ${tempFilePath}`)
      
      // 呼叫 gemini.py CLI
      const cliResponse = await this.callGeminiCLI(tempFilePath)
      
      // 清理臨時檔案
      try {
        fs.unlinkSync(tempFilePath)
      } catch (err) {
        logger.warn(`Failed to delete temp file: ${tempFilePath}`)
      }
      
      return cliResponse || '嗯，我明白了。'
    } catch (error) {
      logger.error('Error in generateSimpleResponseWithCLI:', error)
      return '抱歉，我現在有點困惑...'
    }
  }
  
  // Helper functions for NPC data
  private getNPCName(npcId: string): string {
    const npcNames: Record<string, string> = {
      'npc-1': '小雅',
      'npc-3': '月兒',
      'npc-5': '小晴'
    }
    return npcNames[npcId] || 'Unknown'
  }
  
  private getNPCPersonality(npcId: string): string {
    const npcPersonalities: Record<string, string> = {
      'npc-1': '溫暖親切的咖啡館老闆娘，總是能敏銳察覺到他人的情緒變化',
      'npc-3': '充滿夢幻氣質的音樂家，經常在月光下彈奏吉他',
      'npc-5': '活潑開朗的大學生，充滿青春活力'
    }
    return npcPersonalities[npcId] || 'Friendly NPC'
  }

  private async generateNPCResponseWithAPI(
    npcPersonality: NPCPersonality,
    userMessage: string,
    context: ConversationContext
  ): Promise<AIResponse> {
    const prompt = this.buildPrompt(npcPersonality, userMessage, context)
    
    const result = await this.model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    // 解析結構化回應
    return this.parseAIResponse(text, npcPersonality)
  }

  private async generateNPCResponseWithCLI(
    npcPersonality: NPCPersonality,
    userMessage: string,
    context: ConversationContext
  ): Promise<AIResponse> {
    // 建立臨時 JSON 檔案
    const tempDir = path.join(process.cwd(), 'temp')
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }
    
    const tempFileName = `conversation_${uuidv4()}.json`
    const tempFilePath = path.join(tempDir, tempFileName)
    
    // 準備共享記憶（從最近的對話中提取）
    const sharedMemories = await this.getSharedMemories(npcPersonality.id)
    
    // 準備對話資料
    const conversationData = {
      message: userMessage,
      npcData: {
        id: npcPersonality.id,
        name: npcPersonality.name,
        personality: npcPersonality.personality,
        backgroundStory: npcPersonality.backgroundStory,
        currentMood: npcPersonality.currentMood,
        relationshipLevel: context.relationshipLevel,
        sharedMemories: sharedMemories // 加入共享記憶
      },
      context: {
        recentMessages: context.recentMessages,
        timestamp: new Date().toISOString()
      }
    }
    
    try {
      // 寫入 JSON 檔案
      fs.writeFileSync(tempFilePath, JSON.stringify(conversationData, null, 2), 'utf-8')
      logger.info(`Created temp JSON file: ${tempFilePath}`)
      
      // 呼叫 gemini.py CLI
      const cliResponse = await this.callGeminiCLI(tempFilePath)
      
      // 刪除臨時檔案 - 暫時保留以供調試
      // fs.unlinkSync(tempFilePath)
      
      // 處理回應
      return this.processGeminiResponse(cliResponse, npcPersonality)
      
    } catch (error) {
      // 確保清理臨時檔案
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath)
      }
      throw error
    }
  }

  private async callGeminiCLI(jsonFilePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()
      logger.info(`[DEBUG] callGeminiCLI 開始執行`)
      
      const projectRoot = path.resolve(__dirname, '../../')
      const geminiScriptPath = path.join(projectRoot, 'gemini.py')
      
      // 準備參數 - 只傳入 JSON 檔案路徑
      const args = [geminiScriptPath, jsonFilePath]
      
      logger.info(`Calling gemini.py with args: ${args.join(' ')}`)
      logger.info(`[DEBUG] 檔案是否存在: ${fs.existsSync(jsonFilePath)}`)
      logger.info(`[DEBUG] 當前環境變數 GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '已設置' : '未設置'}`)
      
      // 執行 Python 腳本 - 從 backend 目錄執行以確保正確讀取 .env
      const backendDir = projectRoot
      
      // 如果當前進程沒有 GEMINI_API_KEY，嘗試從 backend/.env 讀取
      let processEnv = { ...process.env }
      if (!processEnv.GEMINI_API_KEY) {
        const envPath = path.join(projectRoot, '.env')
        const envConfig = dotenv.config({ path: envPath })
        if (envConfig.parsed && envConfig.parsed.GEMINI_API_KEY) {
          processEnv.GEMINI_API_KEY = envConfig.parsed.GEMINI_API_KEY
          logger.info(`[DEBUG] 從 ${envPath} 載入 GEMINI_API_KEY`)
        }
      }
      
      logger.info(`[DEBUG] 傳遞的 GEMINI_API_KEY: ${processEnv.GEMINI_API_KEY ? '已設置' : '未設置'}`)
      
      // Ensure PATH is included in the environment
      processEnv.PATH = process.env.PATH || '/usr/bin:/bin:/usr/local/bin'
      
      const pythonProcess = spawn('python3', args, {
        cwd: backendDir,
        env: processEnv
      })
      
      logger.info(`[DEBUG] Python 進程已啟動，PID: ${pythonProcess.pid}`)
      
      let output = ''
      let errorOutput = ''
      
      pythonProcess.stdout.on('data', (data) => {
        output += data.toString()
      })
      
      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString()
      })
      
      pythonProcess.on('close', (code) => {
        const duration = Date.now() - startTime
        logger.info(`[DEBUG] Python 進程結束，耗時: ${duration}ms，退出碼: ${code}`)
        
        // 記錄 stderr 輸出（包含日誌）
        if (errorOutput) {
          logger.info(`Gemini CLI stderr output:\n${errorOutput}`)
        }
        
        if (code === 0) {
          // 直接返回輸出，gemini.py 只會輸出純文字回應
          const response = output.trim()
          logger.info(`Gemini response: ${response}`)
          logger.info(`[DEBUG] 成功返回回應，長度: ${response.length} 字符`)
          resolve(response)
        } else {
          logger.error(`Gemini CLI failed with code ${code}: ${errorOutput}`)
          logger.error(`[DEBUG] 失敗詳情 - 輸出: "${output}", 錯誤: "${errorOutput}"`)
          reject(new Error(`Gemini CLI failed: ${errorOutput}`))
        }
      })
      
      pythonProcess.on('error', (error) => {
        logger.error('Failed to start Gemini CLI process:', error)
        reject(error)
      })
    })
  }

  private processGeminiResponse(response: string, npc: NPCPersonality): AIResponse {
    // gemini.py 返回純文字回應，我們需要建構完整的 AIResponse
    const content = response.trim()
    
    // 根據 NPC 的情緒決定 emotionTag
    const emotionTag = npc.currentMood || 'neutral'
    
    // 簡單的情感分析來決定關係影響
    let trustChange = 0
    let affectionChange = 0
    
    // 檢查回應的情感傾向
    if (content.includes('謝謝') || content.includes('感謝')) {
      trustChange = 0.1
      affectionChange = 0.05
    } else if (content.includes('開心') || content.includes('快樂')) {
      affectionChange = 0.1
    } else if (content.includes('理解') || content.includes('明白')) {
      trustChange = 0.05
    }
    
    return {
      content,
      emotionTag,
      suggestedActions: [],
      relationshipImpact: {
        trustChange,
        affectionChange,
        levelChange: 0
      }
    }
  }

  private buildConversationPrompt(
    npc: NPCPersonality,
    userMessage: string,
    context: ConversationContext
  ): string {
    const recentHistory = context.recentMessages
      .slice(-5)
      .map(msg => `${msg.speaker === 'user' ? '玩家' : npc.name}: ${msg.content}`)
      .join('\n')

    return `
對話歷史：
${recentHistory}

關係狀態：
- 關係等級: ${context.relationshipLevel}/10
- 信任度: ${Math.round(context.trustLevel * 100)}%
- 好感度: ${Math.round(context.affectionLevel * 100)}%

當前玩家訊息：
${userMessage}

請以 ${npc.name} 的身份回應，並返回有效的 JSON 格式。
    `.trim()
  }

  private buildPrompt(
    npc: NPCPersonality,
    userMessage: string,
    context: ConversationContext
  ): string {
    const recentHistory = context.recentMessages
      .slice(-5) // 只取最近5條消息
      .map(msg => `${msg.speaker === 'user' ? '玩家' : npc.name}: ${msg.content}`)
      .join('\n')

    return `
你是「心語小鎮」中的NPC角色「${npc.name}」。這是一個療癒向的社交遊戲，重點在於建立深度的情感連結。

【角色設定】
姓名: ${npc.name}
個性: ${npc.personality}
背景故事: ${npc.backgroundStory || '待發掘'}
當前情緒: ${npc.currentMood}

【關係狀態】
關係等級: ${context.relationshipLevel}/10
信任度: ${Math.round(context.trustLevel * 100)}%
好感度: ${Math.round(context.affectionLevel * 100)}%

【對話歷史】
${recentHistory}

【當前玩家訊息】
玩家: ${userMessage}

【回應指南】
1. 保持角色一致性，體現個性特徵
2. 根據關係等級調整親密程度和話題深度
3. 考慮當前情緒影響對話風格
4. 展現真實的情感反應，不完美但真實
5. 適時分享個人想法或回憶
6. 對玩家表現出真正的關心和興趣

請用以下JSON格式回應：
{
  "content": "對話內容（自然、溫暖、符合角色性格）",
  "emotionTag": "情緒標籤（如：溫暖、關懷、思考、開心、擔心等）",
  "suggestedActions": ["建議的後續話題或行動"],
  "memoryFlowerData": {
    "flowerType": "記憶花朵類型（如果這是重要對話時刻）",
    "emotionColor": "花朵顏色（如：warm_pink, gentle_blue, soft_yellow等）"
  },
  "relationshipImpact": {
    "trustChange": 0.1,
    "affectionChange": 0.05,
    "levelChange": 0
  },
  "moodChange": "新的情緒狀態（如果有變化）"
}

請確保回應是有效的JSON格式。
    `.trim()
  }

  private parseAIResponse(text: string, npc: NPCPersonality): AIResponse {
    try {
      // 嘗試解析JSON回應
      const cleanText = text.replace(/```json\n?|\n?```/g, '').trim()
      const parsed = JSON.parse(cleanText)
      
      // 驗證必要欄位
      if (!parsed.content) {
        throw new Error('Missing content field')
      }
      
      return {
        content: parsed.content,
        emotionTag: parsed.emotionTag || 'neutral',
        suggestedActions: parsed.suggestedActions || [],
        memoryFlowerData: parsed.memoryFlowerData,
        relationshipImpact: {
          trustChange: parsed.relationshipImpact?.trustChange || 0,
          affectionChange: parsed.relationshipImpact?.affectionChange || 0,
          levelChange: parsed.relationshipImpact?.levelChange || 0,
        },
        moodChange: parsed.moodChange,
      }
      
    } catch (error) {
      logger.warn('Failed to parse AI response as JSON, using fallback:', error)
      
      // 如果解析失敗，嘗試提取基本回應
      return {
        content: text || '抱歉，我一時不知道該說什麼...',
        emotionTag: 'confused',
        suggestedActions: [],
        relationshipImpact: {
          trustChange: 0,
          affectionChange: 0,
          levelChange: 0,
        },
      }
    }
  }

  private getFallbackResponse(npc: NPCPersonality, userMessage: string): AIResponse {
    const fallbackResponses = [
      '真的嗎？告訴我更多吧。',
      '這聽起來很有趣呢。',
      '我在想你剛才說的話...',
      '嗯，我覺得我需要時間消化一下。',
      '你總是有這麼多想法，我很喜歡和你聊天。',
    ]
    
    const randomResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)]
    
    return {
      content: randomResponse,
      emotionTag: 'thoughtful',
      suggestedActions: ['繼續對話'],
      relationshipImpact: {
        trustChange: 0.01,
        affectionChange: 0.01,
        levelChange: 0,
      },
    }
  }

  async generateMemoryFlowerDescription(
    conversationContent: string,
    emotionTag: string
  ): Promise<{
    flowerType: string
    emotionColor: string
    description: string
  }> {
    try {
      const prompt = `
基於以下對話內容和情緒，為「心語小鎮」的記憶花園系統生成一朵記憶花：

對話內容: ${conversationContent}
情緒標籤: ${emotionTag}

請以JSON格式回應：
{
  "flowerType": "花朵類型（如：cherry_blossom, sunflower, lavender, rose等）",
  "emotionColor": "情緒色彩（如：warm_pink, gentle_blue, soft_yellow等）",
  "description": "這朵花代表的記憶描述"
}
      `.trim()

      const result = await this.model.generateContent(prompt)
      const response = await result.response
      const text = response.text()
      
      const cleanText = text.replace(/```json\n?|\n?```/g, '').trim()
      const parsed = JSON.parse(cleanText)
      
      return {
        flowerType: parsed.flowerType || 'wildflower',
        emotionColor: parsed.emotionColor || 'soft_white',
        description: parsed.description || '一段美好的回憶',
      }
      
    } catch (error) {
      logger.error('Failed to generate memory flower:', error)
      
      // 降級處理
      return {
        flowerType: 'wildflower',
        emotionColor: 'soft_white',
        description: '一段珍貴的對話記憶',
      }
    }
  }

  async generateNPCLetter(
    npc: NPCPersonality,
    relationshipLevel: number,
    recentEvents: string[]
  ): Promise<{
    subject: string
    content: string
  }> {
    try {
      const prompt = `
你是「${npc.name}」，想要主動寫信給玩家。

角色設定:
${npc.personality}

關係等級: ${relationshipLevel}/10
最近的事件: ${recentEvents.join(', ')}

請寫一封真誠的信，分享你的想法或關心玩家。以JSON格式回應：
{
  "subject": "信件主題",
  "content": "信件內容（溫暖、個人化、符合角色性格）"
}
      `.trim()

      const result = await this.model.generateContent(prompt)
      const response = await result.response
      const text = response.text()
      
      const cleanText = text.replace(/```json\n?|\n?```/g, '').trim()
      const parsed = JSON.parse(cleanText)
      
      return {
        subject: parsed.subject || '來自小鎮的問候',
        content: parsed.content || '希望你一切都好。',
      }
      
    } catch (error) {
      logger.error('Failed to generate NPC letter:', error)
      
      return {
        subject: '來自小鎮的問候',
        content: '最近過得好嗎？小鎮依然溫暖如昔，期待下次見面。',
      }
    }
  }

  async generateNPCToNPCConversation(prompt: string): Promise<string> {
    try {
      // 根據配置選擇使用 CLI 或直接 API
      if (this.useGeminiCLI) {
        // NPC-to-NPC 對話暫時不支援 CLI 模式，使用備用回應
        logger.warn('NPC-to-NPC conversation not supported in CLI mode, using fallback')
        throw new Error('CLI mode not supported for NPC-to-NPC')
      } else {
        const result = await this.model.generateContent(prompt)
        const response = await result.response
        return response.text()
      }
    } catch (error) {
      logger.error('Failed to generate NPC-to-NPC conversation:', error)
      
      // 降級處理 - 返回預設對話
      return JSON.stringify([
        {
          speakerName: '艾瑪',
          content: '今天天氣真好呢。',
          emotionalTone: 'warm'
        },
        {
          speakerName: '莉莉', 
          content: '是啊！花園裡的花都開得特別美麗。',
          emotionalTone: 'cheerful'
        }
      ])
    }
  }

  /**
   * 獲取 NPC 的共享記憶
   * @param npcId NPC ID
   * @returns 共享記憶列表
   */
  private async getSharedMemories(npcId: string): Promise<string[]> {
    // TODO: 從資料庫或快取中獲取實際的共享記憶
    // 目前返回空陣列作為預設值
    return []
  }
}

export const geminiService = new GeminiService()