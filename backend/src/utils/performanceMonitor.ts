import { logger } from './logger'

interface PerformanceMetrics {
  requestId: string
  userId: string
  npcId: string
  userInput: number
  socketReceived: number
  dbQueryStart: number
  dbQueryEnd: number
  aiCallStart: number
  aiCallEnd: number
  responseSent: number
  totalTime?: number
  aiTime?: number
  dbTime?: number
}

/**
 * 效能監控工具
 */
export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map()
  private readonly SLOW_THRESHOLD = 2000 // 2秒為慢查詢
  
  /**
   * 開始追蹤新請求
   */
  startTracking(requestId: string, userId: string, npcId: string): PerformanceMetrics {
    const metrics: PerformanceMetrics = {
      requestId,
      userId,
      npcId,
      userInput: Date.now(),
      socketReceived: 0,
      dbQueryStart: 0,
      dbQueryEnd: 0,
      aiCallStart: 0,
      aiCallEnd: 0,
      responseSent: 0
    }
    
    this.metrics.set(requestId, metrics)
    return metrics
  }
  
  /**
   * 標記時間點
   */
  mark(requestId: string, event: keyof PerformanceMetrics) {
    const metrics = this.metrics.get(requestId)
    if (metrics) {
      metrics[event] = Date.now() as any
    }
  }
  
  /**
   * 完成追蹤並記錄
   */
  endTracking(requestId: string) {
    const metrics = this.metrics.get(requestId)
    if (!metrics) return
    
    // 計算各階段耗時
    metrics.totalTime = metrics.responseSent - metrics.userInput
    metrics.aiTime = metrics.aiCallEnd - metrics.aiCallStart
    metrics.dbTime = metrics.dbQueryEnd - metrics.dbQueryStart
    
    // 記錄效能資料
    const logData = {
      requestId,
      npcId: metrics.npcId,
      totalTime: metrics.totalTime,
      aiTime: metrics.aiTime,
      dbTime: metrics.dbTime,
      socketLatency: metrics.socketReceived - metrics.userInput,
      processingTime: metrics.responseSent - metrics.socketReceived
    }
    
    // 檢查是否為慢查詢
    if (metrics.totalTime > this.SLOW_THRESHOLD) {
      logger.warn('⚠️ 慢查詢檢測', logData)
      this.analyzeBottleneck(metrics)
    } else {
      logger.info('✅ 效能指標', logData)
    }
    
    // 清理記憶體
    this.metrics.delete(requestId)
    
    return metrics
  }
  
  /**
   * 分析瓶頸
   */
  private analyzeBottleneck(metrics: PerformanceMetrics) {
    const bottlenecks = []
    
    if (metrics.aiTime! > 1500) {
      bottlenecks.push(`AI 回應過慢: ${metrics.aiTime}ms`)
    }
    
    if (metrics.dbTime! > 500) {
      bottlenecks.push(`資料庫查詢過慢: ${metrics.dbTime}ms`)
    }
    
    const socketLatency = metrics.socketReceived - metrics.userInput
    if (socketLatency > 100) {
      bottlenecks.push(`Socket 延遲過高: ${socketLatency}ms`)
    }
    
    if (bottlenecks.length > 0) {
      logger.error('🔴 效能瓶頸分析', {
        requestId: metrics.requestId,
        bottlenecks,
        suggestion: this.getSuggestion(metrics)
      })
    }
  }
  
  /**
   * 提供優化建議
   */
  private getSuggestion(metrics: PerformanceMetrics): string[] {
    const suggestions = []
    
    if (metrics.aiTime! > 1500) {
      suggestions.push('考慮使用快取或更快的 AI 模型')
    }
    
    if (metrics.dbTime! > 500) {
      suggestions.push('優化資料庫查詢或添加索引')
    }
    
    return suggestions
  }
  
  /**
   * 獲取統計資料
   */
  getStats() {
    const activeRequests = this.metrics.size
    const avgMetrics = this.calculateAverages()
    
    return {
      activeRequests,
      averageResponseTime: avgMetrics.avgTotal,
      averageAITime: avgMetrics.avgAI,
      averageDBTime: avgMetrics.avgDB
    }
  }
  
  private calculateAverages() {
    const completed = Array.from(this.metrics.values()).filter(m => m.responseSent > 0)
    
    if (completed.length === 0) {
      return { avgTotal: 0, avgAI: 0, avgDB: 0 }
    }
    
    const sum = completed.reduce((acc, m) => ({
      total: acc.total + (m.totalTime || 0),
      ai: acc.ai + (m.aiTime || 0),
      db: acc.db + (m.dbTime || 0)
    }), { total: 0, ai: 0, db: 0 })
    
    return {
      avgTotal: Math.round(sum.total / completed.length),
      avgAI: Math.round(sum.ai / completed.length),
      avgDB: Math.round(sum.db / completed.length)
    }
  }
}

// 單例模式
export const performanceMonitor = new PerformanceMonitor()

// Express 中間件
export function performanceMiddleware() {
  return (req: any, res: any, next: any) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    req.perfId = requestId
    
    // 記錄請求開始時間
    const startTime = Date.now()
    
    // 攔截 response
    const originalSend = res.send
    res.send = function(data: any) {
      const duration = Date.now() - startTime
      
      // 添加效能標頭
      res.setHeader('X-Response-Time', `${duration}ms`)
      res.setHeader('X-Request-ID', requestId)
      
      // 記錄慢請求
      if (duration > 1000) {
        logger.warn(`Slow HTTP request: ${req.method} ${req.path} - ${duration}ms`)
      }
      
      return originalSend.call(this, data)
    }
    
    next()
  }
}