/**
 * Multimodal Processor Service
 *
 * 处理多模态内容的深度分析：
 * 1. 图片 - Gemini Vision API 分析
 * 2. PDF/文档 - 文本提取和分析
 * 3. URL链接 - 内容抓取和分析
 */

import axios from 'axios'
import * as cheerio from 'cheerio'
import { logger } from '../utils/logger'
import { GoogleGenerativeAI } from '@google/generative-ai'

const pdfParse = require('pdf-parse')

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

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
  private visionModel: any
  private textModel: any

  constructor() {
    // 初始化 Gemini 模型
    this.visionModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    this.textModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  }

  /**
   * 处理图片 - 使用 Gemini Vision API
   */
  async processImage(imageUrl: string, context?: string): Promise<ImageAnalysis> {
    try {
      logger.info(`[MultimodalProcessor] 开始分析图片: ${imageUrl}`)

      // 下载图片
      const imageData = await this.fetchImage(imageUrl)

      // 构建 Vision API prompt
      const prompt = `分析这张图片，提供以下信息（以 JSON 格式回应）：

{
  "description": "详细描述图片内容（2-3句话）",
  "tags": ["标签1", "标签2", "标签3"],
  "keyInsights": ["洞察1", "洞察2"],
  "suggestedContext": "这张图片可能的使用场景或相关主题",
  "confidence": 0.95
}

${context ? `\n上下文信息: ${context}` : ''}`

      const result = await this.visionModel.generateContent([
        prompt,
        {
          inlineData: {
            data: imageData.base64,
            mimeType: imageData.mimeType
          }
        }
      ])

      const response = await result.response
      const analysisText = response.text()
      const analysis = this.parseJSON(analysisText)

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
   * 处理 PDF 文档 - 文本提取和分析
   */
  async processPDF(pdfUrl: string, context?: string): Promise<DocumentAnalysis> {
    try {
      logger.info(`[MultimodalProcessor] 开始处理 PDF: ${pdfUrl}`)

      // 下载 PDF
      const pdfBuffer = await this.fetchFile(pdfUrl)

      // 提取文本
      const pdfData: any = await pdfParse(pdfBuffer)
      const text = pdfData.text

      logger.info(`[MultimodalProcessor] PDF 文本提取完成，字数: ${text.length}`)

      // 使用 Gemini 分析文本
      const analysis = await this.analyzeDocument(text, context)

      return {
        ...analysis,
        wordCount: text.length,
        language: this.detectLanguage(text)
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
   * 处理 URL 链接 - 内容抓取和分析
   */
  async processLink(url: string, context?: string): Promise<LinkAnalysis> {
    try {
      logger.info(`[MultimodalProcessor] 开始抓取链接: ${url}`)

      // 检查是否为 YouTube 链接
      if (this.isYouTubeUrl(url)) {
        return await this.processYouTubeLink(url, context)
      }

      // 抓取网页内容
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; KnowledgeBot/1.0)'
        }
      })

      const html = response.data
      const $ = cheerio.load(html)

      // 提取基本信息
      const title = $('title').text() || $('h1').first().text() || '无标题'
      const description = $('meta[name="description"]').attr('content') ||
                         $('meta[property="og:description"]').attr('content') || ''

      // 提取主要内容
      $('script, style, nav, footer, header, aside').remove()
      const mainContent = $('article, main, .content, .post, #content')
        .text()
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 5000) // 限制长度

      logger.info(`[MultimodalProcessor] 网页内容提取完成，标题: ${title}`)

      // 使用 Gemini 分析内容
      const analysis = await this.analyzeWebContent(title, description, mainContent, url, context)

      return {
        title,
        description,
        summary: analysis.summary,
        mainContent: mainContent.substring(0, 1000), // 保存部分内容
        tags: analysis.tags,
        readingTime: Math.ceil(mainContent.split(' ').length / 200), // 按 200 词/分钟计算
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

      const result = await this.textModel.generateContent(analysisPrompt)
      const analysisResponse = await result.response
      const analysisText = analysisResponse.text()
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
   * 分析文档内容
   */
  private async analyzeDocument(text: string, context?: string): Promise<Omit<DocumentAnalysis, 'wordCount' | 'language'>> {
    try {
      const prompt = `分析以下文档内容，提供摘要和关键要点（以 JSON 格式回应）：

{
  "summary": "文档的简短摘要（2-3句话）",
  "keyPoints": ["要点1", "要点2", "要点3"],
  "topics": ["主题1", "主题2"]
}

${context ? `\n上下文: ${context}` : ''}

文档内容:
${text.substring(0, 10000)}` // 限制输入长度

      const result = await this.textModel.generateContent(prompt)
      const response = await result.response
      const analysisText = response.text()
      const analysis = this.parseJSON(analysisText)

      return {
        summary: analysis.summary || '无法生成摘要',
        keyPoints: Array.isArray(analysis.keyPoints) ? analysis.keyPoints : [],
        topics: Array.isArray(analysis.topics) ? analysis.topics : []
      }
    } catch (error) {
      logger.error('[MultimodalProcessor] 文档分析失败:', error)
      return {
        summary: text.substring(0, 200),
        keyPoints: [],
        topics: []
      }
    }
  }

  /**
   * 分析网页内容
   */
  private async analyzeWebContent(
    title: string,
    description: string,
    content: string,
    url: string,
    context?: string
  ): Promise<{ summary: string; tags: string[] }> {
    try {
      const prompt = `分析以下网页内容，提供摘要和标签（以 JSON 格式回应）：

{
  "summary": "网页内容的简短摘要（2-3句话）",
  "tags": ["标签1", "标签2", "标签3"]
}

${context ? `\n上下文: ${context}` : ''}

标题: ${title}
描述: ${description}
URL: ${url}

主要内容:
${content.substring(0, 2000)}`

      const result = await this.textModel.generateContent(prompt)
      const response = await result.response
      const analysisText = response.text()
      const analysis = this.parseJSON(analysisText)

      return {
        summary: analysis.summary || description || title,
        tags: Array.isArray(analysis.tags) ? analysis.tags : []
      }
    } catch (error) {
      logger.error('[MultimodalProcessor] 网页内容分析失败:', error)
      return {
        summary: description || title,
        tags: []
      }
    }
  }

  /**
   * 下载图片并转换为 base64
   */
  private async fetchImage(url: string): Promise<{ base64: string; mimeType: string }> {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000
    })

    const base64 = Buffer.from(response.data).toString('base64')
    const mimeType = response.headers['content-type'] || 'image/jpeg'

    return { base64, mimeType }
  }

  /**
   * 下载文件
   */
  private async fetchFile(url: string): Promise<Buffer> {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000
    })

    return Buffer.from(response.data)
  }

  /**
   * 检测语言
   */
  private detectLanguage(text: string): string {
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
    const totalChars = text.length
    const chineseRatio = chineseChars / totalChars

    if (chineseRatio > 0.3) return 'zh'
    return 'en'
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
