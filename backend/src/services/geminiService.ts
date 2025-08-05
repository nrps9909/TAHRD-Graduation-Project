import { GoogleGenerativeAI } from '@google/generative-ai'
import { logger } from '../utils/logger'
import { spawn } from 'child_process'
import * as path from 'path'

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

class GeminiService {
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
    // 建構用於 CLI 的對話上下文
    const conversationPrompt = this.buildConversationPrompt(npcPersonality, userMessage, context)
    
    // 呼叫 gemini.py CLI
    const cliResponse = await this.callGeminiCLI(conversationPrompt, npcPersonality)
    
    // 解析 CLI 回應
    return this.parseAIResponse(cliResponse, npcPersonality)
  }

  private async callGeminiCLI(prompt: string, npcPersonality: NPCPersonality | null = null): Promise<string> {
    return new Promise((resolve, reject) => {
      const projectRoot = path.resolve(__dirname, '../../../')
      const geminiScriptPath = path.join(projectRoot, 'backend', 'npc_dialogue_service.py')
      
      // 準備參數
      const args = [geminiScriptPath, '--chat', prompt]
      
      // 如果有 NPC 個性數據則添加
      if (npcPersonality) {
        const npcData = JSON.stringify({
          name: npcPersonality.name,
          personality: npcPersonality.personality,
          backgroundStory: npcPersonality.backgroundStory,
          currentMood: npcPersonality.currentMood
        })
        args.push('--npc-data', npcData)
      }
      
      // 執行 Python 腳本
      const pythonProcess = spawn('python3', args, {
        cwd: projectRoot,
        env: { ...process.env }
      })
      
      let output = ''
      let errorOutput = ''
      
      pythonProcess.stdout.on('data', (data) => {
        output += data.toString()
      })
      
      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString()
      })
      
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          // 提取實際的 AI 回應（移除日誌信息）
          const cleanOutput = this.extractAIResponseFromCLIOutput(output)
          resolve(cleanOutput)
        } else {
          logger.error(`Gemini CLI failed with code ${code}: ${errorOutput}`)
          reject(new Error(`Gemini CLI failed: ${errorOutput}`))
        }
      })
      
      pythonProcess.on('error', (error) => {
        logger.error('Failed to start Gemini CLI process:', error)
        reject(error)
      })
    })
  }

  private extractAIResponseFromCLIOutput(output: string): string {
    // 查找 "NPC 回應：" 之後的內容
    const responseMarker = '🤖 NPC 回應：'
    const startIndex = output.indexOf(responseMarker)
    
    if (startIndex === -1) {
      // 如果沒有找到標記，嘗試提取所有非日誌內容
      const lines = output.split('\n')
      const contentLines = lines.filter(line => 
        !line.includes('INFO') && 
        !line.includes('✅') && 
        !line.includes('===') &&
        line.trim().length > 0
      )
      return contentLines.join('\n').trim()
    }
    
    // 提取標記後的內容
    const afterMarker = output.substring(startIndex + responseMarker.length)
    const lines = afterMarker.split('\n')
    
    // 移除分隔線和空行
    const contentLines = lines.filter(line => 
      !line.includes('===') && 
      line.trim().length > 0
    )
    
    return contentLines.join('\n').trim()
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
        return await this.callGeminiCLI(prompt, null)
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
}

export const geminiService = new GeminiService()