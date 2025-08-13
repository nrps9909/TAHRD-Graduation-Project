import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { logger } from './logger'

export interface GeminiCallRecord {
  id: string
  timestamp: string
  npcId: string
  npcName: string
  playerMessage: string
  filesLoaded: {
    personality: string[]
    memories: string[]
    shared: string[]
    geminiMd: string[]
  }
  prompt: string
  response: string
  responseTime: number
  cacheHit: boolean
  error?: string
  context?: {
    sessionId?: string
    relationshipLevel?: number
    mood?: string
    recentMessages?: any[]
  }
}

export class GeminiTracker {
  private logsDir: string
  private npcRecords: Map<string, GeminiCallRecord[]> = new Map()
  private currentRecord: GeminiCallRecord | null = null

  constructor() {
    // 確保日誌目錄存在
    this.logsDir = join(process.cwd(), 'logs', 'gemini-tracking')
    if (!existsSync(this.logsDir)) {
      mkdirSync(this.logsDir, { recursive: true })
    }

    // 載入所有 NPC 的現有記錄
    this.loadAllNpcRecords()
    
    logger.info(`🎯 Gemini Tracker 已啟動，日誌目錄: ${this.logsDir}`)
  }

  // 獲取 NPC 專屬檔案路徑
  private getNpcLogFile(npcName: string): string {
    const date = new Date().toISOString().split('T')[0]
    const safeName = npcName.toLowerCase().replace(/\s+/g, '-')
    return join(this.logsDir, `${safeName}-${date}.json`)
  }

  // 載入所有 NPC 的現有記錄
  private loadAllNpcRecords() {
    try {
      // 載入目錄中所有今天的 JSON 檔案
      const date = new Date().toISOString().split('T')[0]
      const files = existsSync(this.logsDir) ? 
        require('fs').readdirSync(this.logsDir).filter((f: string) => 
          f.endsWith(`-${date}.json`)
        ) : []

      for (const file of files) {
        const filePath = join(this.logsDir, file)
        const data = readFileSync(filePath, 'utf-8')
        const records = JSON.parse(data) as GeminiCallRecord[]
        
        // 從記錄中提取 NPC 名稱
        if (records.length > 0) {
          const npcName = records[0].npcName
          this.npcRecords.set(npcName, records)
          logger.info(`載入了 ${npcName} 的 ${records.length} 條追蹤記錄`)
        }
      }
    } catch (error) {
      logger.error('載入 NPC 追蹤記錄失敗:', error)
    }
  }

  // 載入特定 NPC 的記錄
  private loadNpcRecords(npcName: string): GeminiCallRecord[] {
    const logFile = this.getNpcLogFile(npcName)
    try {
      if (existsSync(logFile)) {
        const data = readFileSync(logFile, 'utf-8')
        const records = JSON.parse(data) as GeminiCallRecord[]
        this.npcRecords.set(npcName, records)
        return records
      }
    } catch (error) {
      logger.error(`載入 ${npcName} 追蹤記錄失敗:`, error)
    }
    return []
  }

  // 開始追蹤一個新的 Gemini 調用
  startTracking(npcId: string, npcName: string, playerMessage: string, sessionId?: string): string {
    const recordId = `gemini-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    this.currentRecord = {
      id: recordId,
      timestamp: new Date().toISOString(),
      npcId,
      npcName,
      playerMessage,
      filesLoaded: {
        personality: [],
        memories: [],
        shared: [],
        geminiMd: []
      },
      prompt: '',
      response: '',
      responseTime: 0,
      cacheHit: false,
      context: {
        sessionId
      }
    }

    logger.info(`🔴 開始追蹤 Gemini 調用: ${recordId} | NPC: ${npcName} | 玩家訊息: "${playerMessage}"`)
    
    // 立即保存（即使還沒完成）
    this.saveProgress()
    
    return recordId
  }

  // 記錄載入的檔案
  recordFileLoaded(category: 'personality' | 'memories' | 'shared' | 'geminiMd', filePath: string) {
    if (!this.currentRecord) return

    this.currentRecord.filesLoaded[category].push(filePath)
    logger.info(`📁 載入檔案 [${category}]: ${filePath}`)
    
    // 即時保存
    this.saveProgress()
  }

  // 記錄完整的 prompt
  recordPrompt(prompt: string) {
    if (!this.currentRecord) return

    this.currentRecord.prompt = prompt
    logger.info(`📝 記錄 Prompt (${prompt.length} 字元)`)
    
    // 即時保存
    this.saveProgress()
  }

  // 記錄回應
  recordResponse(response: string, responseTime: number, cacheHit: boolean = false) {
    if (!this.currentRecord) return

    this.currentRecord.response = response
    this.currentRecord.responseTime = responseTime
    this.currentRecord.cacheHit = cacheHit
    
    // 安全處理 response 可能為 undefined 的情況
    const responsePreview = response ? response.substring(0, 50) : '(空回應)'
    logger.info(`✅ 收到回應 (${responseTime}ms, 快取: ${cacheHit ? '是' : '否'}): "${responsePreview}..."`)
    
    // 完成這條記錄
    this.finishTracking()
  }

  // 記錄錯誤
  recordError(error: string) {
    if (!this.currentRecord) return

    this.currentRecord.error = error
    logger.error(`❌ Gemini 調用錯誤: ${error}`)
    
    // 完成這條記錄
    this.finishTracking()
  }

  // 記錄額外的上下文資訊
  recordContext(context: any) {
    if (!this.currentRecord) return

    this.currentRecord.context = {
      ...this.currentRecord.context,
      ...context
    }
    
    // 即時保存
    this.saveProgress()
  }

  // 完成當前追蹤
  private finishTracking() {
    if (!this.currentRecord) return

    const npcName = this.currentRecord.npcName
    
    // 獲取或創建該 NPC 的記錄列表
    if (!this.npcRecords.has(npcName)) {
      this.npcRecords.set(npcName, [])
    }
    
    // 加入到該 NPC 的記錄列表
    const records = this.npcRecords.get(npcName)!
    records.push(this.currentRecord)
    
    // 保存到該 NPC 專屬的檔案
    this.saveNpcRecords(npcName)
    
    logger.info(`🟢 完成追蹤: ${this.currentRecord.id} | NPC: ${npcName}`)
    
    // 清空當前記錄
    this.currentRecord = null
  }

  // 保存進度（用於即時更新）
  private saveProgress() {
    if (!this.currentRecord) return

    const npcName = this.currentRecord.npcName
    
    // 獲取或創建該 NPC 的記錄列表
    if (!this.npcRecords.has(npcName)) {
      this.npcRecords.set(npcName, [])
    }
    
    const records = this.npcRecords.get(npcName)!
    
    // 創建包含當前進行中記錄的臨時陣列
    const allRecords = [
      ...records,
      { ...this.currentRecord, inProgress: true }
    ]

    const logFile = this.getNpcLogFile(npcName)
    try {
      writeFileSync(logFile, JSON.stringify(allRecords, null, 2))
    } catch (error) {
      logger.error(`保存 ${npcName} 追蹤進度失敗:`, error)
    }
  }

  // 保存特定 NPC 的記錄到檔案
  private saveNpcRecords(npcName: string) {
    const records = this.npcRecords.get(npcName)
    if (!records) return

    const logFile = this.getNpcLogFile(npcName)
    try {
      writeFileSync(logFile, JSON.stringify(records, null, 2))
      logger.info(`💾 已保存 ${records.length} 條 ${npcName} 的追蹤記錄到 ${logFile}`)
    } catch (error) {
      logger.error(`保存 ${npcName} 追蹤記錄失敗:`, error)
    }
  }

  // 獲取統計資訊
  getStatistics() {
    // 合併所有 NPC 的記錄
    const allRecords: GeminiCallRecord[] = []
    for (const records of this.npcRecords.values()) {
      allRecords.push(...records)
    }

    const stats = {
      totalCalls: allRecords.length,
      cacheHits: allRecords.filter(r => r.cacheHit).length,
      averageResponseTime: 0,
      npcCallCounts: {} as Record<string, number>,
      errorCount: allRecords.filter(r => r.error).length,
      filesLoadedStats: {
        personality: new Set<string>(),
        memories: new Set<string>(),
        shared: new Set<string>(),
        geminiMd: new Set<string>()
      },
      perNpcStats: {} as Record<string, {
        totalCalls: number,
        cacheHits: number,
        averageResponseTime: number,
        errorCount: number
      }>
    }

    // 計算平均回應時間和 NPC 調用次數
    let totalTime = 0
    for (const record of allRecords) {
      totalTime += record.responseTime
      stats.npcCallCounts[record.npcName] = (stats.npcCallCounts[record.npcName] || 0) + 1
      
      // 統計載入的檔案
      for (const file of record.filesLoaded.personality) {
        stats.filesLoadedStats.personality.add(file)
      }
      for (const file of record.filesLoaded.memories) {
        stats.filesLoadedStats.memories.add(file)
      }
      for (const file of record.filesLoaded.shared) {
        stats.filesLoadedStats.shared.add(file)
      }
      for (const file of record.filesLoaded.geminiMd) {
        stats.filesLoadedStats.geminiMd.add(file)
      }
    }

    // 計算每個 NPC 的統計資料
    for (const [npcName, records] of this.npcRecords.entries()) {
      let npcTotalTime = 0
      for (const record of records) {
        npcTotalTime += record.responseTime
      }
      
      stats.perNpcStats[npcName] = {
        totalCalls: records.length,
        cacheHits: records.filter(r => r.cacheHit).length,
        averageResponseTime: records.length > 0 ? npcTotalTime / records.length : 0,
        errorCount: records.filter(r => r.error).length
      }
    }

    stats.averageResponseTime = allRecords.length > 0 ? totalTime / allRecords.length : 0

    return {
      ...stats,
      filesLoadedStats: {
        personality: Array.from(stats.filesLoadedStats.personality),
        memories: Array.from(stats.filesLoadedStats.memories),
        shared: Array.from(stats.filesLoadedStats.shared),
        geminiMd: Array.from(stats.filesLoadedStats.geminiMd)
      },
      cacheHitRate: allRecords.length > 0 
        ? ((stats.cacheHits / allRecords.length) * 100).toFixed(2) + '%'
        : '0%'
    }
  }

  // 獲取最近的記錄（可選指定 NPC）
  getRecentRecords(limit: number = 10, npcName?: string): GeminiCallRecord[] {
    if (npcName) {
      const records = this.npcRecords.get(npcName) || []
      return records.slice(-limit)
    }
    
    // 合併所有 NPC 的記錄並按時間排序
    const allRecords: GeminiCallRecord[] = []
    for (const records of this.npcRecords.values()) {
      allRecords.push(...records)
    }
    
    // 按時間戳排序
    allRecords.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
    
    return allRecords.slice(-limit)
  }

  // 獲取特定 NPC 的所有記錄
  getNpcRecords(npcName: string): GeminiCallRecord[] {
    return this.npcRecords.get(npcName) || []
  }

  // 清空記錄（可選指定 NPC）
  clearRecords(npcName?: string) {
    if (npcName) {
      // 清空特定 NPC 的記錄
      this.npcRecords.set(npcName, [])
      this.saveNpcRecords(npcName)
      logger.info(`🗑️ 已清空 ${npcName} 的追蹤記錄`)
    } else {
      // 清空所有記錄
      this.npcRecords.clear()
      this.currentRecord = null
      logger.info('🗑️ 已清空所有 NPC 的追蹤記錄')
    }
  }

  // 獲取所有 NPC 名稱列表
  getNpcList(): string[] {
    return Array.from(this.npcRecords.keys())
  }
}

// 單例實例
export const geminiTracker = new GeminiTracker()