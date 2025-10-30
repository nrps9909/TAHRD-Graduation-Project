/**
 * Multimodal Processor Service
 *
 * 優化版：使用 Gemini REST API 處理多模態內容
 * 1. 圖片 - Gemini REST API 分析
 * 2. PDF - Gemini REST API 分析
 * 3. 網頁連結 - Gemini REST API 分析
 * 4. YouTube - 結合 oEmbed API + Gemini 分析
 */

import axios from 'axios'
import { logger } from '../utils/logger'
import { callGeminiAPI } from '../utils/geminiAPI'

export interface ImageAnalysis {
  description: string
  tags: string[]
  keyInsights: string[]
  suggestedContext: string
  confidence: number
}

export interface DocumentAnalysis {
  summary: string
  keyPoints: string[]
  topics: string[]
  wordCount: number
  language: string
}

export interface LinkAnalysis {
  title: string
  description: string
  summary: string
  mainContent: string
  tags: string[]
  readingTime: number
  url: string
}

export class MultimodalProcessor {
  private geminiModel: string = 'gemini-2.5-flash'

  constructor() {
    logger.info('[MultimodalProcessor] 使用 Gemini REST API 進行多模態處理')
  }

  /**
   * 處理圖片 - 使用 Gemini REST API 直接分析
   */
  async processImage(imageUrl: string, context?: string): Promise<ImageAnalysis> {
    try {
      logger.info(`[MultimodalProcessor] 使用 Gemini REST API 分析圖片: ${imageUrl}`)

      const prompt = `分析這張圖片（URL: ${imageUrl}），提供以下信息（只回復 JSON）：

{
  "description": "詳細描述圖片內容（2-3句話）",
  "tags": ["標籤1", "標籤2", "標籤3"],
  "keyInsights": ["洞察1", "洞察2"],
  "suggestedContext": "這張圖片可能的使用場景或相關主題",
  "confidence": 0.95
}

${context ? `\n上下文信息: ${context}` : ''}`

      const response = await callGeminiAPI(prompt, {
        model: this.geminiModel,
        temperature: 0.7,
        maxOutputTokens: 1024,
        timeout: 20000
      })
      const analysis = this.parseJSON(response)

      logger.info(`[MultimodalProcessor] 圖片分析完成`)

      return {
        description: analysis.description || '無法識別圖片內容',
        tags: Array.isArray(analysis.tags) ? analysis.tags : [],
        keyInsights: Array.isArray(analysis.keyInsights) ? analysis.keyInsights : [],
        suggestedContext: analysis.suggestedContext || '',
        confidence: analysis.confidence || 0.5
      }
    } catch (error) {
      logger.error('[MultimodalProcessor] 圖片處理失敗:', error)
      return {
        description: '圖片分析失敗',
        tags: ['圖片'],
        keyInsights: [],
        suggestedContext: '',
        confidence: 0.1
      }
    }
  }

  /**
   * 處理 PDF 文檔 - 使用 Gemini REST API 讀取和分析
   */
  async processPDF(pdfUrl: string, context?: string): Promise<DocumentAnalysis> {
    try {
      logger.info(`[MultimodalProcessor] 使用 Gemini REST API 分析 PDF: ${pdfUrl}`)

      const prompt = `分析這個 PDF 文檔（URL: ${pdfUrl}），提供以下信息（只回復 JSON）：

{
  "summary": "文檔的簡短摘要（2-3句話）",
  "keyPoints": ["要點1", "要點2", "要點3"],
  "topics": ["主題1", "主題2"],
  "wordCount": 估計字數,
  "language": "zh 或 en"
}

${context ? `\n上下文: ${context}` : ''}`

      const response = await callGeminiAPI(prompt, {
        model: this.geminiModel,
        temperature: 0.7,
        maxOutputTokens: 2048,
        timeout: 30000
      })
      const analysis = this.parseJSON(response)

      logger.info(`[MultimodalProcessor] PDF 分析完成`)

      return {
        summary: analysis.summary || 'PDF 文檔',
        keyPoints: Array.isArray(analysis.keyPoints) ? analysis.keyPoints : [],
        topics: Array.isArray(analysis.topics) ? analysis.topics : [],
        wordCount: analysis.wordCount || 0,
        language: analysis.language || 'unknown'
      }
    } catch (error) {
      logger.error('[MultimodalProcessor] PDF 處理失敗:', error)
      return {
        summary: 'PDF 處理失敗',
        keyPoints: [],
        topics: [],
        wordCount: 0,
        language: 'unknown'
      }
    }
  }

  /**
   * 處理 URL 連結 - 使用 Gemini REST API 訪問和分析
   */
  async processLink(url: string, context?: string): Promise<LinkAnalysis> {
    try {
      logger.info(`[MultimodalProcessor] 使用 Gemini REST API 分析連結: ${url}`)

      // 檢查是否為 YouTube 連結（需要特殊處理獲取標題）
      if (this.isYouTubeUrl(url)) {
        return await this.processYouTubeLink(url, context)
      }

      const prompt = `分析這個網頁（URL: ${url}），提供以下信息（只回復 JSON）：

{
  "title": "網頁標題",
  "description": "簡短描述",
  "summary": "網頁內容的簡短摘要（2-3句話）",
  "mainContent": "主要內容摘錄（200字以內）",
  "tags": ["標籤1", "標籤2", "標籤3"],
  "readingTime": 預估閱讀時間（分鐘）
}

${context ? `\n上下文: ${context}` : ''}`

      const response = await callGeminiAPI(prompt, {
        model: this.geminiModel,
        temperature: 0.7,
        maxOutputTokens: 2048,
        timeout: 25000
      })
      const analysis = this.parseJSON(response)

      logger.info(`[MultimodalProcessor] 網頁分析完成`)

      return {
        title: analysis.title || '網頁',
        description: analysis.description || '',
        summary: analysis.summary || '網頁內容',
        mainContent: analysis.mainContent || '',
        tags: Array.isArray(analysis.tags) ? analysis.tags : ['網頁'],
        readingTime: analysis.readingTime || 5,
        url
      }
    } catch (error) {
      logger.error('[MultimodalProcessor] URL 處理失敗:', error)
      return {
        title: '連結處理失敗',
        description: '',
        summary: '無法訪問或解析該連結',
        mainContent: '',
        tags: ['連結'],
        readingTime: 0,
        url
      }
    }
  }

  /**
   * 檢查是否為 YouTube URL
   */
  private isYouTubeUrl(url: string): boolean {
    return url.includes('youtube.com') || url.includes('youtu.be')
  }

  /**
   * 處理 YouTube 連結
   */
  private async processYouTubeLink(url: string, context?: string): Promise<LinkAnalysis> {
    try {
      logger.info(`[MultimodalProcessor] 處理 YouTube 連結: ${url}`)

      // 提取視頻 ID
      const videoId = this.extractYouTubeVideoId(url)
      if (!videoId) {
        throw new Error('無法提取 YouTube 視頻 ID')
      }

      // 獲取視頻元數據 (使用 oEmbed API - 無需 API Key)
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
      const response = await axios.get(oembedUrl, { timeout: 10000 })
      const metadata = response.data

      const title = metadata.title || 'YouTube 視頻'
      const author = metadata.author_name || '未知作者'

      logger.info(`[MultimodalProcessor] YouTube 元數據獲取成功: ${title}`)

      // 使用 Gemini 生成視頻相關分析
      const analysisPrompt = `分析這個 YouTube 視頻的相關信息（以 JSON 格式回應）：

視頻標題: ${title}
作者: ${author}
${context ? `\n用戶備註: ${context}` : ''}

{
  "summary": "根據標題和作者生成一句話概述",
  "tags": ["標籤1", "標籤2", "標籤3"]
}
`

      const analysisText = await callGeminiAPI(analysisPrompt, {
        model: this.geminiModel,
        temperature: 0.7,
        maxOutputTokens: 512,
        timeout: 60000 // 60 秒超時 - 增加以應對複雜媒體分析
      })
      const analysis = this.parseJSON(analysisText)

      return {
        title,
        description: `作者: ${author}`,
        summary: analysis.summary || `${author} 的 YouTube 視頻`,
        mainContent: `YouTube 視頻: ${title}\n作者: ${author}\n連結: ${url}`,
        tags: ['YouTube', 'video', ...(analysis.tags || [])],
        readingTime: 0, // 視頻沒有閱讀時間
        url
      }
    } catch (error) {
      logger.error('[MultimodalProcessor] YouTube 處理失敗:', error)
      return {
        title: 'YouTube 視頻',
        description: '無法獲取視頻信息',
        summary: '已保存 YouTube 視頻連結',
        mainContent: `YouTube 連結: ${url}`,
        tags: ['YouTube', 'video'],
        readingTime: 0,
        url
      }
    }
  }

  /**
   * 從 YouTube URL 中提取視頻 ID
   */
  private extractYouTubeVideoId(url: string): string | null {
    // 支持多種 YouTube URL 格式
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match && match[1]) {
        return match[1]
      }
    }

    return null
  }

  /**
   * 解析 JSON 響應
   */
  private parseJSON(text: string): any {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      return JSON.parse(text)
    } catch (error) {
      logger.warn('[MultimodalProcessor] JSON 解析失敗, 使用降級方案')
      return {}
    }
  }
}

export const multimodalProcessor = new MultimodalProcessor()
