import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { logger } from '../utils/logger'

export interface NPCPersonalityData {
  id: string
  name: string
  displayName: string
  personality: string
  backgroundStory: string
  traits: string[]
  interests: string[]
  speakingStyle: string
}

/**
 * 統一的 NPC 個性載入器
 * 從 personalities 和 memories 目錄載入真實資料
 */
export class NPCPersonalityLoader {
  private personalitiesPath: string
  private memoriesPath: string
  private cache: Map<string, NPCPersonalityData> = new Map()

  // NPC ID 到檔案名稱的映射
  private npcMapping: Record<string, { file: string; name: string }> = {
    'npc-1': { file: 'lupeixiu', name: '鋁配咻' },
    'npc-2': { file: 'liuyucen', name: '流羽岑' },
    'npc-3': { file: 'chentingan', name: '沉停鞍' }
  }

  constructor() {
    this.personalitiesPath = join(process.cwd(), 'personalities')
    this.memoriesPath = join(process.cwd(), 'memories')
    this.loadAllPersonalities()
  }

  private loadAllPersonalities() {
    for (const [npcId, mapping] of Object.entries(this.npcMapping)) {
      try {
        const personalityFile = join(this.personalitiesPath, `${mapping.file}_personality.txt`)
        const memoryFile = join(this.memoriesPath, mapping.file, 'GEMINI.md')
        
        if (existsSync(personalityFile)) {
          const personalityContent = readFileSync(personalityFile, 'utf-8')
          const memoryContent = existsSync(memoryFile) ? readFileSync(memoryFile, 'utf-8') : ''
          
          const personalityData = this.parsePersonalityFile(npcId, mapping.name, personalityContent, memoryContent)
          this.cache.set(npcId, personalityData)
          logger.info(`✅ 載入 NPC 個性: ${mapping.name} (${npcId})`)
        }
      } catch (error) {
        logger.error(`載入 NPC ${npcId} 失敗:`, error)
      }
    }
  }

  private parsePersonalityFile(
    npcId: string,
    displayName: string,
    personalityContent: string,
    memoryContent: string
  ): NPCPersonalityData {
    // 解析個性檔案內容
    const lines = personalityContent.split('\n')
    let personality = ''
    let backgroundStory = ''
    let traits: string[] = []
    let interests: string[] = []
    let speakingStyle = ''
    
    let currentSection = ''
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      
      if (trimmedLine.startsWith('## ')) {
        currentSection = trimmedLine.substring(3).toLowerCase()
        continue
      }
      
      if (!trimmedLine) continue
      
      switch (currentSection) {
        case '基本資訊':
        case '基本資料':
          if (trimmedLine.startsWith('- 個性：')) {
            personality = trimmedLine.substring(6)
          }
          break
        case '背景故事':
          backgroundStory += trimmedLine + ' '
          break
        case '性格特徵':
        case '個性特質':
          if (trimmedLine.startsWith('- ')) {
            traits.push(trimmedLine.substring(2))
          }
          break
        case '興趣愛好':
        case '興趣':
          if (trimmedLine.startsWith('- ')) {
            interests.push(trimmedLine.substring(2))
          }
          break
        case '說話風格':
        case '對話風格':
          speakingStyle += trimmedLine + ' '
          break
      }
    }
    
    // 如果沒有解析到，使用整個檔案內容作為個性
    if (!personality) {
      personality = personalityContent.substring(0, 200)
    }
    
    return {
      id: npcId,
      name: this.npcMapping[npcId]?.file || npcId,
      displayName,
      personality: personality.trim(),
      backgroundStory: backgroundStory.trim(),
      traits,
      interests,
      speakingStyle: speakingStyle.trim()
    }
  }

  getPersonality(npcId: string): NPCPersonalityData | null {
    return this.cache.get(npcId) || null
  }

  getAllPersonalities(): NPCPersonalityData[] {
    return Array.from(this.cache.values())
  }

  getNPCDisplayName(npcId: string): string {
    return this.npcMapping[npcId]?.name || 'NPC'
  }

  getNPCFileName(npcId: string): string {
    return this.npcMapping[npcId]?.file || ''
  }

  reload() {
    this.cache.clear()
    this.loadAllPersonalities()
    logger.info('🔄 重新載入所有 NPC 個性')
  }
}

// 單例實例
export const personalityLoader = new NPCPersonalityLoader()