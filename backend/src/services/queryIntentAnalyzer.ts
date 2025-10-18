/**
 * Query Intent Analyzer - 查詢意圖分析器
 *
 * 使用 Gemini Flash 快速分析用戶查詢意圖，決定最佳檢索策略
 */

import { logger } from '../utils/logger'
import { callGeminiAPI } from '../utils/geminiAPI'

/**
 * 查詢意圖類型
 */
export enum QueryIntentType {
  SEMANTIC = 'semantic',      // 語義相似搜尋（"關於學習的筆記"）
  TEMPORAL = 'temporal',      // 時間範圍查詢（"10/17", "最近"）
  CATEGORICAL = 'categorical', // 分類/標籤查詢（"數學", "物理"）
  STATISTICAL = 'statistical', // 統計查詢（"有多少", "哪些領域"）
  HYBRID = 'hybrid'           // 混合查詢（同時包含多種）
}

/**
 * 時間範圍
 */
export interface TimeRange {
  start: Date
  end: Date
}

/**
 * 查詢意圖參數
 */
export interface QueryIntentParams {
  // 時間範圍（用於 temporal 查詢）
  timeRange?: TimeRange

  // 分類列表（用於 categorical 查詢）
  categories?: string[]

  // 標籤列表（用於 categorical 查詢）
  tags?: string[]

  // 語義查詢文本（用於 semantic 查詢）
  semanticQuery?: string

  // 聚合類型（用於 statistical 查詢）
  aggregation?: 'count' | 'list' | 'summary' | 'groupBy'

  // 分組欄位（用於 statistical 查詢）
  groupByField?: 'category' | 'tags' | 'date'
}

/**
 * 查詢意圖結果
 */
export interface QueryIntent {
  type: QueryIntentType
  params: QueryIntentParams
  confidence: number // 0-1，意圖分析的置信度
}

/**
 * 意圖分析器配置
 */
interface AnalyzerConfig {
  model: string
  timeout: number
  cacheEnabled: boolean
}

/**
 * 查詢意圖分析器服務
 */
export class QueryIntentAnalyzer {
  private config: AnalyzerConfig = {
    model: 'gemini-2.5-flash', // 使用最快的模型
    timeout: 5000, // 5 秒超時
    cacheEnabled: true
  }

  // 簡單的記憶體緩存（避免重複分析相同查詢）
  private cache = new Map<string, QueryIntent>()
  private readonly MAX_CACHE_SIZE = 100

  /**
   * 分析查詢意圖
   */
  async analyze(query: string): Promise<QueryIntent> {
    try {
      // 檢查緩存
      if (this.config.cacheEnabled && this.cache.has(query)) {
        logger.info(`[Intent] Cache hit for query: "${query.substring(0, 50)}"`)
        return this.cache.get(query)!
      }

      logger.info(`[Intent] Analyzing query: "${query.substring(0, 50)}..."`)
      const startTime = Date.now()

      // 調用 Gemini 進行意圖分析
      const intent = await this.callGeminiForIntent(query)

      const duration = Date.now() - startTime
      logger.info(`[Intent] Analysis completed in ${duration}ms, type: ${intent.type}`)

      // 更新緩存
      this.updateCache(query, intent)

      return intent
    } catch (error) {
      logger.error('[Intent] Analysis failed, falling back to semantic search:', error)

      // 失敗時回退到純語義搜尋
      return {
        type: QueryIntentType.SEMANTIC,
        params: { semanticQuery: query },
        confidence: 0.5
      }
    }
  }

  /**
   * 調用 Gemini 進行意圖分析
   */
  private async callGeminiForIntent(query: string): Promise<QueryIntent> {
    const prompt = this.buildIntentPrompt(query)

    try {
      const response = await this.callGemini(prompt)
      return this.parseIntentResponse(response, query)
    } catch (error: any) {
      logger.error('[Intent] Gemini call failed:', error.message)
      throw error
    }
  }

  /**
   * 構建意圖分析 Prompt
   */
  private buildIntentPrompt(query: string): string {
    const today = new Date().toISOString().split('T')[0]

    return `你是一個查詢意圖分析專家。分析用戶查詢並返回 JSON。

【今天日期】
${today}

【用戶問題】
${query}

【分析要求】
1. 判斷查詢類型（選擇最匹配的一個）：
   - semantic: 語義相似搜尋（例: "關於學習的筆記", "量子物理相關"）
   - temporal: 時間範圍查詢（例: "10/17 讀了什麼", "最近一週", "昨天"）
   - categorical: 分類/標籤查詢（例: "數學筆記", "工作相關", "靈感"）
   - statistical: 統計查詢（例: "有多少筆記", "哪些領域", "統計分析"）
   - hybrid: 混合查詢（同時包含時間+分類，或其他組合）

2. 提取參數：
   - 時間範圍：解析相對時間（今天、昨天、最近、上週等）
   - 分類：識別分類關鍵詞（學習、工作、生活、靈感、目標等）
   - 標籤：提取可能的標籤關鍵詞
   - 語義查詢：提取核心語義內容

3. 置信度：評估分析的準確度（0-1）

【返回格式】
{
  "type": "temporal",
  "params": {
    "timeRange": {"start": "2025-10-17T00:00:00Z", "end": "2025-10-17T23:59:59Z"},
    "semanticQuery": "讀了什麼"
  },
  "confidence": 0.9
}

【重要】
- 只返回 JSON，不要其他文字
- 如果是混合查詢，type 必須是 "hybrid"
- timeRange 必須是完整的 ISO 8601 格式
- categories 必須是陣列，從這些選項中選: ["學習", "靈感", "工作", "社交", "生活", "目標", "資源"]

返回 JSON：`
  }

  /**
   * 解析 Gemini 返回的意圖
   */
  private parseIntentResponse(response: string, originalQuery: string): QueryIntent {
    try {
      // 清理響應（移除可能的 markdown 代碼塊）
      let cleaned = response.trim()
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '')
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/```\n?/g, '')
      }

      const parsed = JSON.parse(cleaned)

      // 驗證和規範化
      const intent: QueryIntent = {
        type: this.normalizeIntentType(parsed.type),
        params: this.normalizeParams(parsed.params),
        confidence: parsed.confidence || 0.7
      }

      return intent
    } catch (error) {
      logger.error('[Intent] Failed to parse response:', error)
      logger.error('[Intent] Raw response:', response)

      // 解析失敗，回退到語義搜尋
      return {
        type: QueryIntentType.SEMANTIC,
        params: { semanticQuery: originalQuery },
        confidence: 0.5
      }
    }
  }

  /**
   * 規範化意圖類型
   */
  private normalizeIntentType(type: string): QueryIntentType {
    const normalized = type.toLowerCase()
    if (Object.values(QueryIntentType).includes(normalized as QueryIntentType)) {
      return normalized as QueryIntentType
    }
    return QueryIntentType.SEMANTIC
  }

  /**
   * 規範化參數
   */
  private normalizeParams(params: any): QueryIntentParams {
    const normalized: QueryIntentParams = {}

    // 時間範圍
    if (params.timeRange) {
      normalized.timeRange = {
        start: new Date(params.timeRange.start),
        end: new Date(params.timeRange.end)
      }
    }

    // 分類
    if (params.categories && Array.isArray(params.categories)) {
      normalized.categories = params.categories
    }

    // 標籤
    if (params.tags && Array.isArray(params.tags)) {
      normalized.tags = params.tags
    }

    // 語義查詢
    if (params.semanticQuery) {
      normalized.semanticQuery = params.semanticQuery
    }

    // 聚合類型
    if (params.aggregation) {
      normalized.aggregation = params.aggregation
    }

    // 分組欄位
    if (params.groupByField) {
      normalized.groupByField = params.groupByField
    }

    return normalized
  }

  /**
   * 調用 Gemini REST API
   */
  private async callGemini(prompt: string): Promise<string> {
    return await callGeminiAPI(prompt, {
      model: this.config.model,
      temperature: 0.7,
      maxOutputTokens: 1024,
      timeout: this.config.timeout
    })
  }

  /**
   * 更新緩存
   */
  private updateCache(query: string, intent: QueryIntent): void {
    if (!this.config.cacheEnabled) return

    // 限制緩存大小
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      // 刪除最舊的項目（FIFO）
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }

    this.cache.set(query, intent)
  }

  /**
   * 清空緩存
   */
  clearCache(): void {
    this.cache.clear()
    logger.info('[Intent] Cache cleared')
  }

  /**
   * 獲取緩存統計
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE
    }
  }
}

// 導出單例
export const queryIntentAnalyzer = new QueryIntentAnalyzer()
