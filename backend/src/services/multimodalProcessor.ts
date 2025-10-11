/**
 * Multimodal Processor Service
 *
 * 优化版：充分利用 Gemini CLI 的 @ 语法直接读取文件和 URL
 * 1. 图片 - Gemini CLI @url 直接分析
 * 2. PDF - Gemini CLI @url 直接分析
 * 3. 网页链接 - Gemini CLI @url 直接分析
 * 4. YouTube - 结合 oEmbed API + Gemini 分析
 */

import axios from 'axios'
import { logger } from '../utils/logger'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

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
    logger.info('[MultimodalProcessor] 使用 Gemini CLI @ 语法进行多模态处理')
  }

  /**
   * 处理图片 - 使用 Gemini CLI @url 直接分析
   */
  async processImage(imageUrl: string, context?: string): Promise<ImageAnalysis> {
    try {
      logger.info(`[MultimodalProcessor] 使用 Gemini CLI 分析图片: ${imageUrl}`)

      const prompt = `分析这张图片 @${imageUrl}，提供以下信息（只回复 JSON）：

{
  "description": "详细描述图片内容（2-3句话）",
  "tags": ["标签1", "标签2", "标签3"],
  "keyInsights": ["洞察1", "洞察2"],
  "suggestedContext": "这张图片可能的使用场景或相关主题",
  "confidence": 0.95
}

${context ? `\n上下文信息: ${context}` : ''}`

      const response = await this.callGeminiCLI(prompt)
      const analysis = this.parseJSON(response)

      logger.info(`[MultimodalProcessor] 图片分析完成`)

      return {
        description: analysis.description || '无法识别图片内容',
        tags: Array.isArray(analysis.tags) ? analysis.tags : [],
        keyInsights: Array.isArray(analysis.keyInsights) ? analysis.keyInsights : [],
        suggestedContext: analysis.suggestedContext || '',
        confidence: analysis.confidence || 0.5
      }
    } catch (error) {
      logger.error('[MultimodalProcessor] 图片处理失败:', error)
      return {
        description: '图片分析失败',
        tags: ['图片'],
        keyInsights: [],
        suggestedContext: '',
        confidence: 0.1
      }
    }
  }

  /**
   * 处理 PDF 文档 - 使用 Gemini CLI @url 直接读取和分析
   */
  async processPDF(pdfUrl: string, context?: string): Promise<DocumentAnalysis> {
    try {
      logger.info(`[MultimodalProcessor] 使用 Gemini CLI 分析 PDF: ${pdfUrl}`)

      const prompt = `分析这个 PDF 文档 @${pdfUrl}，提供以下信息（只回复 JSON）：

{
  "summary": "文档的简短摘要（2-3句话）",
  "keyPoints": ["要点1", "要点2", "要点3"],
  "topics": ["主题1", "主题2"],
  "wordCount": 估计字数,
  "language": "zh 或 en"
}

${context ? `\n上下文: ${context}` : ''}`

      const response = await this.callGeminiCLI(prompt)
      const analysis = this.parseJSON(response)

      logger.info(`[MultimodalProcessor] PDF 分析完成`)

      return {
        summary: analysis.summary || 'PDF 文档',
        keyPoints: Array.isArray(analysis.keyPoints) ? analysis.keyPoints : [],
        topics: Array.isArray(analysis.topics) ? analysis.topics : [],
        wordCount: analysis.wordCount || 0,
        language: analysis.language || 'unknown'
      }
    } catch (error) {
      logger.error('[MultimodalProcessor] PDF 处理失败:', error)
      return {
        summary: 'PDF 处理失败',
        keyPoints: [],
        topics: [],
        wordCount: 0,
        language: 'unknown'
      }
    }
  }

  /**
   * 处理 URL 链接 - 使用 Gemini CLI @url 直接访问和分析
   */
  async processLink(url: string, context?: string): Promise<LinkAnalysis> {
    try {
      logger.info(`[MultimodalProcessor] 使用 Gemini CLI 分析链接: ${url}`)

      // 检查是否为 YouTube 链接（需要特殊处理获取标题）
      if (this.isYouTubeUrl(url)) {
        return await this.processYouTubeLink(url, context)
      }

      const prompt = `分析这个网页 @${url}，提供以下信息（只回复 JSON）：

{
  "title": "网页标题",
  "description": "简短描述",
  "summary": "网页内容的简短摘要（2-3句话）",
  "mainContent": "主要内容摘录（200字以内）",
  "tags": ["标签1", "标签2", "标签3"],
  "readingTime": 预估阅读时间（分钟）
}

${context ? `\n上下文: ${context}` : ''}`

      const response = await this.callGeminiCLI(prompt)
      const analysis = this.parseJSON(response)

      logger.info(`[MultimodalProcessor] 网页分析完成`)

      return {
        title: analysis.title || '网页',
        description: analysis.description || '',
        summary: analysis.summary || '网页内容',
        mainContent: analysis.mainContent || '',
        tags: Array.isArray(analysis.tags) ? analysis.tags : ['网页'],
        readingTime: analysis.readingTime || 5,
        url
      }
    } catch (error) {
      logger.error('[MultimodalProcessor] URL 处理失败:', error)
      return {
        title: '链接处理失败',
        description: '',
        summary: '无法访问或解析该链接',
        mainContent: '',
        tags: ['链接'],
        readingTime: 0,
        url
      }
    }
  }

  /**
   * 检查是否为 YouTube URL
   */
  private isYouTubeUrl(url: string): boolean {
    return url.includes('youtube.com') || url.includes('youtu.be')
  }

  /**
   * 处理 YouTube 链接
   */
  private async processYouTubeLink(url: string, context?: string): Promise<LinkAnalysis> {
    try {
      logger.info(`[MultimodalProcessor] 处理 YouTube 链接: ${url}`)

      // 提取视频 ID
      const videoId = this.extractYouTubeVideoId(url)
      if (!videoId) {
        throw new Error('无法提取 YouTube 视频 ID')
      }

      // 获取视频元数据 (使用 oEmbed API - 无需 API Key)
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
      const response = await axios.get(oembedUrl, { timeout: 10000 })
      const metadata = response.data

      const title = metadata.title || 'YouTube 视频'
      const author = metadata.author_name || '未知作者'

      logger.info(`[MultimodalProcessor] YouTube 元数据获取成功: ${title}`)

      // 使用 Gemini 生成视频相关分析
      const analysisPrompt = `分析这个 YouTube 视频的相关信息（以 JSON 格式回应）：

视频标题: ${title}
作者: ${author}
${context ? `\n用户备注: ${context}` : ''}

{
  "summary": "根据标题和作者生成一句话概述",
  "tags": ["标签1", "标签2", "标签3"]
}
`

      const analysisText = await this.callGeminiCLI(analysisPrompt)
      const analysis = this.parseJSON(analysisText)

      return {
        title,
        description: `作者: ${author}`,
        summary: analysis.summary || `${author} 的 YouTube 视频`,
        mainContent: `YouTube 视频: ${title}\n作者: ${author}\n链接: ${url}`,
        tags: ['YouTube', 'video', ...(analysis.tags || [])],
        readingTime: 0, // 视频没有阅读时间
        url
      }
    } catch (error) {
      logger.error('[MultimodalProcessor] YouTube 处理失败:', error)
      return {
        title: 'YouTube 视频',
        description: '无法获取视频信息',
        summary: '已保存 YouTube 视频链接',
        mainContent: `YouTube 链接: ${url}`,
        tags: ['YouTube', 'video'],
        readingTime: 0,
        url
      }
    }
  }

  /**
   * 从 YouTube URL 中提取视频 ID
   */
  private extractYouTubeVideoId(url: string): string | null {
    // 支持多种 YouTube URL 格式
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
   * 调用 Gemini CLI
   */
  private async callGeminiCLI(prompt: string): Promise<string> {
    try {
      // 转义特殊字符
      const escapedPrompt = prompt
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\$/g, '\\$')
        .replace(/`/g, '\\`')

      const command = `gemini -m ${this.geminiModel} -p "${escapedPrompt}"`

      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024, // 10MB
        timeout: 60000, // 60秒超时
        env: {
          ...process.env,
          GEMINI_API_KEY: process.env.GEMINI_API_KEY
        }
      })

      if (stderr && stderr.includes('Error')) {
        logger.warn('[MultimodalProcessor] Gemini CLI stderr:', stderr)
      }

      const response = stdout.trim()
      logger.debug(`[MultimodalProcessor] Gemini response: ${response.substring(0, 200)}...`)

      return response
    } catch (error: any) {
      logger.error('[MultimodalProcessor] Gemini CLI 调用失败:', error.message)
      throw new Error('Gemini CLI 调用失败')
    }
  }

  /**
   * 解析 JSON 响应
   */
  private parseJSON(text: string): any {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      return JSON.parse(text)
    } catch (error) {
      logger.warn('[MultimodalProcessor] JSON 解析失败, 使用降级方案')
      return {}
    }
  }
}

export const multimodalProcessor = new MultimodalProcessor()
