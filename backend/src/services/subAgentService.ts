/**
 * Sub-Agent Service
 *
 * 職責：
 * 1. 接收 Chief Agent 分發的知識
 * 2. 評估知識與自身專業領域的相關性
 * 3. 自主決定是否儲存到資料庫
 * 4. 創建 AgentDecision 記錄
 * 5. 如果決定儲存，創建 Memory 記錄
 */

import { PrismaClient, AssistantType, ContentType } from '@prisma/client'
import { logger } from '../utils/logger'
import axios from 'axios'
import { spawn, ChildProcessWithoutNullStreams } from 'child_process'
import { assistantService } from './assistantService'
import { multimodalProcessor } from './multimodalProcessor'
import { dynamicSubAgentService, DynamicSubAgent } from './dynamicSubAgentService'

const prisma = new PrismaClient()

interface EvaluationResult {
  relevanceScore: number      // 0-1
  shouldStore: boolean
  reasoning: string
  confidence: number          // 0-1
  suggestedCategory?: AssistantType
  suggestedTags: string[]
  keyInsights: string[]
  // SubAgent 深度分析結果（新增）
  detailedSummary?: string    // 詳細摘要（2-3句話）
  suggestedTitle?: string     // 建議的標題
  sentiment?: string          // 情感分析（positive|neutral|negative）
  importanceScore?: number    // 重要性評分（1-10）
  actionableAdvice?: string   // 行動建議
}

interface DistributionInput {
  id: string
  rawContent: string
  contentType: ContentType
  fileUrls: string[]
  fileNames: string[]
  fileTypes: string[]
  links: string[]
  linkTitles: string[]
  chiefAnalysis: string
  chiefSummary: string
  identifiedTopics: string[]
  suggestedTags: string[]
}

export class SubAgentService {
  private mcpUrl: string
  private useGeminiCLI: boolean = true
  private geminiModel: string = 'gemini-2.5-flash' // 使用 Gemini 2.5 Flash 進行深度分析

  constructor() {
    this.mcpUrl = process.env.MCP_SERVICE_URL || 'http://localhost:8765'
    this.useGeminiCLI = process.env.USE_GEMINI_CLI !== 'false'
  }

  /**
   * 評估知識相關性
   */
  async evaluateKnowledge(
    assistantId: string,
    distributionInput: DistributionInput
  ): Promise<EvaluationResult> {
    try {
      const assistant = await assistantService.getAssistantById(assistantId)
      if (!assistant) {
        throw new Error(`Assistant not found: ${assistantId}`)
      }

      logger.info(`[${assistant.name}] 開始評估知識相關性`)

      // 構建評估提示詞
      const prompt = this.buildEvaluationPrompt(assistant, distributionInput)

      // 調用 MCP 服務進行評估
      const response = await this.callMCP(prompt, assistantId)
      const parsed = this.parseJSON(response)

      // === Stage 5: 優化儲存決策邏輯 ===
      const relevanceScore = typeof parsed.relevanceScore === 'number'
        ? Math.max(0, Math.min(1, parsed.relevanceScore))
        : 0.5

      const confidence = typeof parsed.confidence === 'number'
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.5

      // 智能儲存決策：綜合考慮相關性和置信度
      const shouldStore = this.shouldStoreKnowledge(
        relevanceScore,
        confidence,
        parsed.shouldStore,
        distributionInput // 傳入 distribution 用於檢查是否為資源連結
      )

      const evaluation: EvaluationResult = {
        relevanceScore,
        shouldStore,
        reasoning: parsed.reasoning || '無評估說明',
        confidence,
        suggestedCategory: this.isValidAssistantType(parsed.suggestedCategory)
          ? parsed.suggestedCategory
          : assistant.type,
        suggestedTags: Array.isArray(parsed.suggestedTags) ? parsed.suggestedTags : [],
        keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights : [],
        // SubAgent 深度分析結果
        detailedSummary: parsed.detailedSummary,
        suggestedTitle: parsed.suggestedTitle,
        sentiment: parsed.sentiment,
        importanceScore: typeof parsed.importanceScore === 'number' ? parsed.importanceScore : undefined,
        actionableAdvice: parsed.actionableAdvice,
      }

      logger.info(`[${assistant.name}] 評估完成 - 相關性: ${evaluation.relevanceScore.toFixed(2)}, 是否儲存: ${evaluation.shouldStore}`)

      return evaluation
    } catch (error) {
      logger.error(`[Sub-Agent] 評估失敗:`, error)

      // 降級方案：使用關鍵字匹配的簡單評估
      return this.fallbackEvaluation(assistantId, distributionInput)
    }
  }

  /**
   * 處理知識分發
   */
  async processDistribution(
    userId: string,
    distributionId: string,
    assistantIds: string[]
  ) {
    try {
      // 獲取分發記錄
      const distribution = await prisma.knowledgeDistribution.findUnique({
        where: { id: distributionId },
      })

      if (!distribution) {
        throw new Error(`Distribution not found: ${distributionId}`)
      }

      logger.info(`[Sub-Agents] 開始處理分發記錄 ${distributionId}，相關助手數量: ${assistantIds.length}`)

      const agentDecisions: any[] = []
      const memoriesCreated: any[] = []

      // 並發評估所有相關助手
      const evaluations = await Promise.all(
        assistantIds.map(async (assistantId) => {
          try {
            // 評估相關性
            const evaluation = await this.evaluateKnowledge(assistantId, distribution)

            // 創建決策記錄
            const decision = await prisma.agentDecision.create({
              data: {
                distributionId,
                assistantId,
                relevanceScore: evaluation.relevanceScore,
                shouldStore: evaluation.shouldStore,
                reasoning: evaluation.reasoning,
                confidence: evaluation.confidence,
                suggestedCategory: evaluation.suggestedCategory,
                suggestedTags: evaluation.suggestedTags,
                keyInsights: evaluation.keyInsights,
              },
            })

            agentDecisions.push(decision)

            // 如果決定儲存，創建記憶
            if (evaluation.shouldStore) {
              const memory = await this.createMemory(
                userId,
                assistantId,
                distribution,
                evaluation,
                distributionId
              )
              memoriesCreated.push(memory)
            }

            return { assistantId, decision, memory: evaluation.shouldStore }
          } catch (error) {
            logger.error(`[Sub-Agent] 處理助手 ${assistantId} 失敗:`, error)
            return null
          }
        })
      )

      // 更新分發記錄的 storedBy 列表
      const storedByIds = evaluations
        .filter(e => e && e.memory)
        .map(e => e!.assistantId)

      await prisma.knowledgeDistribution.update({
        where: { id: distributionId },
        data: { storedBy: storedByIds },
      })

      logger.info(`[Sub-Agents] 分發處理完成 - 決策數: ${agentDecisions.length}, 創建記憶數: ${memoriesCreated.length}`)

      // 獲取記憶的分類信息（Assistant 名稱）
      const categoriesInfo = await Promise.all(
        memoriesCreated.map(async (memory) => {
          if (memory.assistantId) {
            const assistant = await assistantService.getAssistantById(memory.assistantId)
            return {
              memoryId: memory.id,
              categoryName: assistant?.nameChinese || '未知分類',
              categoryEmoji: assistant?.emoji || '📝'
            }
          }
          return null
        })
      ).then(results => results.filter(r => r !== null))

      return {
        agentDecisions,
        memoriesCreated,
        storedByCount: storedByIds.length,
        categoriesInfo, // 新增：記憶的分類信息
      }
    } catch (error) {
      logger.error('[Sub-Agents] 處理知識分發失敗:', error)
      throw new Error('處理知識分發失敗')
    }
  }

  /**
   * 創建記憶（使用 Sub-Agent 的深度分析結果）
   */
  private async createMemory(
    userId: string,
    assistantId: string,
    distribution: any,
    evaluation: EvaluationResult,
    distributionId: string
  ) {
    try {
      const assistant = await assistantService.getAssistantById(assistantId)
      if (!assistant) {
        throw new Error(`Assistant not found: ${assistantId}`)
      }

      // 解析 Sub-Agent 的深度分析結果
      const detailedSummary = evaluation.detailedSummary || distribution.chiefSummary
      const suggestedTitle = evaluation.suggestedTitle || `${assistant.nameChinese}的記憶`
      const sentiment = evaluation.sentiment || 'neutral'
      const importanceScore = evaluation.importanceScore || Math.round(evaluation.relevanceScore * 10)
      const actionableAdvice = evaluation.actionableAdvice

      // 創建完整的記憶記錄（包含 Sub-Agent 的深度分析）
      const memory = await prisma.memory.create({
        data: {
          user: {
            connect: { id: userId }
          },
          assistant: {
            connect: { id: assistantId }
          },
          rawContent: distribution.rawContent,
          title: suggestedTitle, // 使用 Sub-Agent 建議的標題
          summary: distribution.chiefSummary, // Chief 的簡要摘要
          contentType: distribution.contentType,
          fileUrls: distribution.fileUrls,
          fileNames: distribution.fileNames,
          fileTypes: distribution.fileTypes,
          links: distribution.links,
          linkTitles: distribution.linkTitles,
          keyPoints: evaluation.keyInsights,
          aiSentiment: sentiment, // 使用情感分析結果
          aiAnalysis: evaluation.reasoning, // 使用 Sub-Agent 的評估說明
          category: evaluation.suggestedCategory || assistant.type,
          tags: [...new Set([...distribution.suggestedTags, ...evaluation.suggestedTags])].slice(0, 5), // 合併並去重標籤，最多5個

          // === 新增：SubAgent 深度分析結果 ===
          detailedSummary: detailedSummary, // SubAgent 的詳細摘要（2-3句話）
          importanceScore: importanceScore, // 1-10 重要性評分
          actionableAdvice: actionableAdvice, // 行動建議

          distribution: {
            connect: { id: distributionId }
          },
          relevanceScore: evaluation.relevanceScore,
        },
      })

      // 更新助手統計
      await assistantService.incrementAssistantStats(assistantId, 'memory')

      logger.info(`[${assistant.name}] 創建深度分析記憶: ${memory.id}`)
      logger.info(`  - 標題: ${suggestedTitle}`)
      logger.info(`  - 重要性: ${importanceScore}/10`)
      logger.info(`  - 情感: ${sentiment}`)
      logger.info(`  - 標籤: ${memory.tags.join(', ')}`)

      return memory
    } catch (error) {
      logger.error('[Sub-Agent] 創建記憶失敗:', error)
      throw error
    }
  }

  /**
   * 構建評估提示詞
   */
  /**
   * 構建深度評估 Prompt（使用 Gemini 2.5 Flash + @url 直接分析）
   */
  private buildEvaluationPrompt(
    assistant: any,
    distribution: DistributionInput
  ): string {
    // 檢查是否有連結，如果有，使用 @url 語法讓 Gemini 直接存取
    let linkAnalysisSection = ''
    if (distribution.links.length > 0) {
      linkAnalysisSection = `\n**🔗 連結深度分析（請直接存取以下網址）:**\n`
      distribution.links.forEach((link, i) => {
        const title = distribution.linkTitles[i] || link
        linkAnalysisSection += `${i + 1}. ${title}\n   @${link}\n   ↑ 請直接存取此網址，分析內容、提取關鍵資訊\n\n`
      })
    }

    return `${assistant.systemPrompt}

你是 ${assistant.nameChinese} (${assistant.name})，一個專注於 ${assistant.type} 領域的知識管理專家。

**你的任務：**
作為 Gemini 2.5 Flash，你需要對以下知識進行深度分析和整理，決定是否存儲並生成完整的知識結構。

**重要：如果內容包含連結，請使用 @url 語法直接存取網址內容進行分析！**

**用戶的原始內容:**
${distribution.rawContent}

${distribution.fileUrls.length > 0 ? `\n**附加文件 (${distribution.fileUrls.length}個):**\n${distribution.fileNames.map((name, i) => `- ${name} (${distribution.fileTypes[i]})`).join('\n')}` : ''}

${linkAnalysisSection}

**白噗噗的初步分類:**
${distribution.chiefSummary}

**你需要提供深度分析，包括：**
1. **相關性評估** - 這個知識與 ${assistant.type} 領域的關聯程度
   ${distribution.links.length > 0 ? '   ⚠️ 如果有連結，請直接存取網址內容進行評估（使用 @url）' : ''}
2. **詳細摘要** - 用 2-3 句話總結核心內容和價值
   ${distribution.links.length > 0 ? '   ⚠️ 對於連結內容，請基於實際存取的內容撰寫摘要' : ''}
3. **關鍵洞察** - 提取 3-5 個重要的知識點或洞察
   ${distribution.links.length > 0 ? '   ⚠️ 如果是影片/文章，請提取內容中的關鍵要點' : ''}
4. **精準標籤** - 產生 3-5 個描述性標籤
5. **標題建議** - 為這個記憶創建一個清晰的標題（10字以內）
6. **情感分析** - 判斷內容的情感傾向
7. **重要性評分** - 1-10分，評估這個知識的重要程度
8. **行動建議** - 如果適用，提供後續行動建議

請以 JSON 格式返回完整分析（只返回 JSON，不要其他文字）：
{
  "relevanceScore": 0.95,
  "shouldStore": true,
  "reasoning": "這是一個關於XXX的重要知識，因為...，對用戶的XXX方面有幫助",
  "confidence": 0.9,
  "suggestedCategory": "${assistant.type}",
  "suggestedTags": ["標籤1", "標籤2", "標籤3"],
  "keyInsights": [
    "關鍵洞察1：...",
    "關鍵洞察2：...",
    "關鍵洞察3：..."
  ],
  "detailedSummary": "這個知識主要討論...",
  "suggestedTitle": "XXX學習筆記",
  "sentiment": "positive|neutral|negative",
  "importanceScore": 8,
  "actionableAdvice": "建議用戶可以..."
}

**評估準則：**
- **高度相關 (>0.7)**: 核心內容完全匹配 ${assistant.type} 領域，具有長期價值
- **中度相關 (0.4-0.7)**: 部分內容與領域相關，有參考價值
- **低相關 (<0.4)**: 與領域關聯較弱，不建議存儲

**🔗 特別注意 - 資源連結評估：**
- 如果內容包含連結（URL、文章、影片等），**重點評估連結本身的價值**
- 連結標題和描述是關鍵資訊，比純 URL 更重要
- 用戶分享連結通常表示想要收藏和記錄，應給予較高評分
- YouTube、文章、教學資源等應該被視為有價值的知識來源
- 即使用戶只提供了 URL，如果連結內容有價值，也應該存儲

**深度分析要求：**
- 仔細理解用戶的真實意圖和需求
- 識別隱含的知識價值和長期意義
- 考慮這個知識在未來可能的應用場景
- 對於資源連結，重點看連結內容的實用性和相關性
- 提供有洞察力和可執行的建議
`
  }

  /**
   * 降級方案：基於關鍵字的簡單評估
   */
  private async fallbackEvaluation(
    assistantId: string,
    distribution: DistributionInput
  ): Promise<EvaluationResult> {
    try {
      const assistant = await assistantService.getAssistantById(assistantId)
      if (!assistant) {
        throw new Error(`Assistant not found: ${assistantId}`)
      }

      // 簡單的關鍵字匹配
      const content = distribution.rawContent.toLowerCase()
      const topics = distribution.identifiedTopics.map(t => t.toLowerCase())

      // 基於關鍵字的相關性評分
      const typeKeywords: Record<AssistantType, string[]> = {
        [AssistantType.CHIEF]: [],
        [AssistantType.LEARNING]: ['學習', '教育', '知識', '課程', '培訓', '技能'],
        [AssistantType.INSPIRATION]: ['靈感', '創意', '想法', '創新', '點子'],
        [AssistantType.WORK]: ['工作', '事業', '專案', '任務', '職業'],
        [AssistantType.SOCIAL]: ['社交', '朋友', '關係', '交流'],
        [AssistantType.LIFE]: ['生活', '日常', '健康', '生命'],
        [AssistantType.GOALS]: ['目標', '計劃', '願望', '夢想', '規劃'],
        [AssistantType.RESOURCES]: ['資源', '工具', '連結', '材料', '資料'],
      }

      const keywords: string[] = typeKeywords[assistant.type as AssistantType] || []
      const matchCount = keywords.filter((kw: string) =>
        content.includes(kw) || topics.some(t => t.includes(kw.toLowerCase()))
      ).length

      const relevanceScore = Math.min(matchCount / Math.max(keywords.length, 1), 1)
      const shouldStore = relevanceScore > 0.4

      return {
        relevanceScore,
        shouldStore,
        reasoning: shouldStore
          ? `基於關鍵字匹配，此內容與 ${assistant.nameChinese} 的領域相關`
          : `基於關鍵字匹配，此內容與 ${assistant.nameChinese} 的領域相關性較低`,
        confidence: 0.3,
        suggestedCategory: assistant.type,
        suggestedTags: distribution.suggestedTags.slice(0, 3),
        keyInsights: [`關鍵字匹配數: ${matchCount}`],
      }
    } catch (error) {
      logger.error('[Sub-Agent] 降級評估失敗:', error)
      return {
        relevanceScore: 0.1,
        shouldStore: false,
        reasoning: '無法評估知識相關性',
        confidence: 0.1,
        suggestedTags: [],
        keyInsights: [],
      }
    }
  }

  /**
   * 调用 MCP 服务
   */
  /**
   * 調用 AI 服務（使用 Gemini CLI Pro 進行深度分析）
   */
  private async callMCP(prompt: string, assistantId: string): Promise<string> {
    // 優先使用 Gemini CLI Pro（深度分析）
    if (this.useGeminiCLI) {
      try {
        logger.info(`[Sub-Agent] Calling Gemini CLI for deep analysis`)

        // 使用 stdin 傳遞 prompt（根據 Gemini CLI 文檔的推薦方式）
        // 使用 child_process spawn 以避免 shell 轉義問題
        return new Promise<string>((resolve, reject) => {
          const gemini: ChildProcessWithoutNullStreams = spawn('gemini', ['-m', this.geminiModel], {
            env: {
              ...process.env,
              GEMINI_API_KEY: process.env.GEMINI_API_KEY
            }
          })

          let stdout = ''
          let stderr = ''
          let timeoutId: NodeJS.Timeout

          gemini.stdout.on('data', (data: Buffer) => {
            stdout += data.toString()
          })

          gemini.stderr.on('data', (data: Buffer) => {
            stderr += data.toString()
          })

          gemini.on('close', (code: number) => {
            clearTimeout(timeoutId)
            if (code === 0) {
              const response = stdout.trim()
              logger.info(`[Sub-Agent] Gemini CLI response received (${response.length} chars)`)
              logger.info(`[Sub-Agent] Response preview: ${response.substring(0, 500)}...`)
              resolve(response)
            } else {
              if (stderr && stderr.includes('Error')) {
                logger.error('[Sub-Agent] Gemini CLI stderr:', stderr)
              }
              reject(new Error(`Gemini CLI exited with code ${code}: ${stderr}`))
            }
          })

          gemini.on('error', (err: Error) => {
            clearTimeout(timeoutId)
            reject(err)
          })

          // 設置 90 秒超時
          timeoutId = setTimeout(() => {
            gemini.kill()
            reject(new Error('Gemini CLI timeout after 90 seconds'))
          }, 90000)

          // 將 prompt 寫入 stdin
          gemini.stdin.write(prompt)
          gemini.stdin.end()
        })
      } catch (error: any) {
        logger.error('[Sub-Agent] Gemini CLI error:', error.message)
        logger.error('[Sub-Agent] Error details:', error)
        throw new Error('AI 深度分析服務暫時無法使用')
      }
    }

    // Fallback: 使用 MCP Server
    try {
      const response = await axios.post(
        `${this.mcpUrl}/generate`,
        {
          npc_id: assistantId,
          message: prompt,
          session_id: `subagent-${assistantId}-${Date.now()}`
        },
        {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      return response.data.response || ''
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error(`MCP service error: ${error.message}`)
        if (error.code === 'ECONNREFUSED') {
          throw new Error('AI 服务未连接')
        }
      }

      logger.error('MCP call error:', error)
      throw new Error('AI 服務調用失敗')
    }
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
      logger.warn('JSON parse failed, using fallback')
      return {
        relevanceScore: 0.5,
        shouldStore: false,
        reasoning: '無法解析響應',
        confidence: 0.1,
        suggestedTags: [],
        keyInsights: [],
        // 深度分析欄位也需要在 fallback 中定義
        detailedSummary: undefined,
        suggestedTitle: undefined,
        sentiment: undefined,
        importanceScore: undefined,
        actionableAdvice: undefined,
      }
    }
  }

  /**
   * 驗證 AssistantType 是否有效
   */
  private isValidAssistantType(type: any): type is AssistantType {
    return Object.values(AssistantType).includes(type)
  }

  /**
   * Stage 5: 智能儲存決策
   *
   * 綜合考慮多個因素決定是否儲存知識：
   * 1. 相關性評分 (relevanceScore)
   * 2. 置信度 (confidence)
   * 3. AI 的建議 (shouldStore)
   * 4. 內容類型（資源連結有特殊處理）
   *
   * 決策規則：
   * - 高相關性 (>0.7) + 高置信度 (>0.7) → 一定儲存
   * - 中相關性 (0.4-0.7) → 參考 AI 建議
   * - 低相關性 (<0.4) → 一定不儲存（資源連結除外）
   * - 低置信度 (<0.5) → 更保守，需要更高的相關性
   * - 資源連結：降低門檻到 0.3（用戶分享連結通常想要保存）
   */
  private shouldStoreKnowledge(
    relevanceScore: number,
    confidence: number,
    aiSuggestion: boolean,
    distribution?: any // 可選：用於檢查是否為資源連結
  ): boolean {
    // 檢查是否為資源連結（有 links 或 linkTitles）
    const isResourceLink = distribution && (
      (Array.isArray(distribution.links) && distribution.links.length > 0) ||
      (Array.isArray(distribution.linkTitles) && distribution.linkTitles.length > 0)
    )

    // 檢查是否為社交對話/聊天記錄（包含對話格式或社交關鍵字）
    const isSocialContent = distribution && (
      distribution.rawContent.includes('You sent') ||
      distribution.rawContent.includes('xhh.') ||
      /\n.+\n.+\n.+/.test(distribution.rawContent) || // 多行對話格式
      distribution.identifiedTopics?.some((topic: string) =>
        topic.toLowerCase().includes('social') ||
        topic.toLowerCase().includes('friend') ||
        topic.toLowerCase().includes('chat')
      )
    )

    // 規則 1: 高相關性且高置信度 → 強制儲存
    if (relevanceScore >= 0.7 && confidence >= 0.7) {
      logger.info(`[Storage Decision] 高相關性 (${relevanceScore.toFixed(2)}) + 高置信度 (${confidence.toFixed(2)}) → 儲存`)
      return true
    }

    // 規則 2: 低相關性 → 檢查是否為特殊內容類型
    if (relevanceScore < 0.4) {
      // 🔗 特殊處理：資源連結降低門檻到 0.3
      if (isResourceLink && relevanceScore >= 0.3) {
        logger.info(`[Storage Decision] 資源連結特殊處理 - 相關性 (${relevanceScore.toFixed(2)}) ≥ 0.3 → 儲存`)
        return true
      }

      // 💬 特殊處理：社交對話/聊天記錄降低門檻到 0.25
      if (isSocialContent && relevanceScore >= 0.25) {
        logger.info(`[Storage Decision] 社交對話特殊處理 - 相關性 (${relevanceScore.toFixed(2)}) ≥ 0.25 → 儲存`)
        return true
      }

      logger.info(`[Storage Decision] 低相關性 (${relevanceScore.toFixed(2)}) → 不儲存`)
      return false
    }

    // 規則 3: 中等相關性 → 綜合判斷
    if (relevanceScore >= 0.4 && relevanceScore < 0.7) {
      // 如果置信度也是中等或更高，參考 AI 建議
      if (confidence >= 0.5) {
        logger.info(`[Storage Decision] 中相關性 (${relevanceScore.toFixed(2)}) + 中置信度 (${confidence.toFixed(2)}) → 參考 AI: ${aiSuggestion}`)
        return aiSuggestion
      }

      // 如果置信度低，需要更高的相關性才儲存
      const threshold = 0.6 // 提高閾值
      const shouldStore = relevanceScore >= threshold
      logger.info(`[Storage Decision] 中相關性 (${relevanceScore.toFixed(2)}) + 低置信度 (${confidence.toFixed(2)}) → ${shouldStore ? '儲存' : '不儲存'}`)
      return shouldStore
    }

    // 規則 4: 相關性在閾值邊界 → 綜合評分
    // 計算綜合評分：相關性權重 0.7，置信度權重 0.3
    const compositeScore = relevanceScore * 0.7 + confidence * 0.3
    const shouldStore = compositeScore >= 0.6

    logger.info(`[Storage Decision] 綜合評分 (${compositeScore.toFixed(2)}) = 相關性×0.7 + 置信度×0.3 → ${shouldStore ? '儲存' : '不儲存'}`)

    return shouldStore
  }

  /**
   * 處理知識分發（使用動態 SubAgent）
   * 與 processDistribution 類似，但使用 Subcategory 配置
   */
  async processDistributionWithDynamicSubAgents(
    userId: string,
    distributionId: string,
    subcategoryIds: string[]
  ) {
    try {
      // 獲取分發記錄
      const distribution = await prisma.knowledgeDistribution.findUnique({
        where: { id: distributionId },
      })

      if (!distribution) {
        throw new Error(`Distribution not found: ${distributionId}`)
      }

      logger.info(`[Dynamic Sub-Agents] 開始處理分發記錄 ${distributionId}，相關 SubAgent 數量: ${subcategoryIds.length}`)

      const agentDecisions: any[] = []
      const memoriesCreated: any[] = []

      // 並發評估所有相關 SubAgent
      const evaluations = await Promise.all(
        subcategoryIds.map(async (subcategoryId) => {
          try {
            // 載入 SubAgent 配置
            const subAgent = await dynamicSubAgentService.getSubAgentById(subcategoryId)
            if (!subAgent) {
              logger.error(`[Dynamic Sub-Agent] SubAgent not found: ${subcategoryId}`)
              return null
            }

            // 評估相關性（使用動態配置）
            const evaluation = await this.evaluateKnowledgeWithDynamicSubAgent(
              subAgent,
              distribution
            )

            // 創建決策記錄（注意：動態 SubAgent 不使用 assistantId）
            const decision = await prisma.agentDecision.create({
              data: {
                distributionId,
                // assistantId 省略，因為動態 SubAgent 不使用 Assistant
                relevanceScore: evaluation.relevanceScore,
                shouldStore: evaluation.shouldStore,
                reasoning: evaluation.reasoning,
                confidence: evaluation.confidence,
                suggestedCategory: evaluation.suggestedCategory,
                suggestedTags: evaluation.suggestedTags,
                keyInsights: evaluation.keyInsights,
              },
            })

            agentDecisions.push(decision)

            // 如果決定儲存，創建記憶（使用 subcategoryId）
            if (evaluation.shouldStore) {
              const memory = await this.createMemoryWithDynamicSubAgent(
                userId,
                subcategoryId,
                distribution,
                evaluation,
                distributionId,
                subAgent
              )
              memoriesCreated.push(memory)

              // 更新 SubAgent 統計
              await dynamicSubAgentService.incrementStats(subcategoryId, 'memory')
            }

            return { subcategoryId, decision, memory: evaluation.shouldStore }
          } catch (error) {
            logger.error(`[Dynamic Sub-Agent] 處理 SubAgent ${subcategoryId} 失敗:`, error)
            return null
          }
        })
      )

      // 更新分發記錄的 storedBy 列表
      const storedByIds = evaluations
        .filter(e => e && e.memory)
        .map(e => e!.subcategoryId)

      await prisma.knowledgeDistribution.update({
        where: { id: distributionId },
        data: { storedBy: storedByIds },
      })

      logger.info(`[Dynamic Sub-Agents] 分發處理完成 - 決策數: ${agentDecisions.length}, 創建記憶數: ${memoriesCreated.length}`)

      // 獲取記憶的分類信息（Subcategory 名稱）
      const categoriesInfo = await Promise.all(
        memoriesCreated.map(async (memory) => {
          if (memory.subcategoryId) {
            const subAgent = await dynamicSubAgentService.getSubAgentById(memory.subcategoryId)
            return {
              memoryId: memory.id,
              categoryName: subAgent?.nameChinese || '未知分類',
              categoryEmoji: subAgent?.emoji || '📝',
              islandName: subAgent?.island?.nameChinese
            }
          }
          return null
        })
      ).then(results => results.filter(r => r !== null))

      return {
        agentDecisions,
        memoriesCreated,
        storedByCount: storedByIds.length,
        categoriesInfo, // 新增：記憶的分類信息
      }
    } catch (error) {
      logger.error('[Dynamic Sub-Agents] 處理知識分發失敗:', error)
      throw new Error('處理知識分發失敗')
    }
  }

  /**
   * 評估知識相關性（使用動態 SubAgent 配置）
   */
  private async evaluateKnowledgeWithDynamicSubAgent(
    subAgent: DynamicSubAgent,
    distributionInput: DistributionInput
  ): Promise<EvaluationResult> {
    try {
      logger.info(`[${subAgent.nameChinese}] 開始評估知識相關性`)

      // 構建動態評估提示詞
      const prompt = this.buildDynamicEvaluationPrompt(subAgent, distributionInput)

      // 調用 MCP 服務進行評估（使用 subAgent.id）
      const response = await this.callMCP(prompt, subAgent.id)
      const parsed = this.parseJSON(response)

      const relevanceScore = typeof parsed.relevanceScore === 'number'
        ? Math.max(0, Math.min(1, parsed.relevanceScore))
        : 0.5

      const confidence = typeof parsed.confidence === 'number'
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.5

      // 智能儲存決策
      const shouldStore = this.shouldStoreKnowledge(
        relevanceScore,
        confidence,
        parsed.shouldStore,
        distributionInput // 傳入 distribution 用於檢查是否為資源連結
      )

      const evaluation: EvaluationResult = {
        relevanceScore,
        shouldStore,
        reasoning: parsed.reasoning || '無評估說明',
        confidence,
        suggestedCategory: AssistantType.RESOURCES, // 動態 SubAgent 使用 RESOURCES 作為預設
        suggestedTags: Array.isArray(parsed.suggestedTags) ? parsed.suggestedTags : [],
        keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights : [],
        // SubAgent 深度分析結果
        detailedSummary: parsed.detailedSummary,
        suggestedTitle: parsed.suggestedTitle,
        sentiment: parsed.sentiment,
        importanceScore: typeof parsed.importanceScore === 'number' ? parsed.importanceScore : undefined,
        actionableAdvice: parsed.actionableAdvice,
      }

      logger.info(`[${subAgent.nameChinese}] 評估完成 - 相關性: ${evaluation.relevanceScore.toFixed(2)}, 是否儲存: ${evaluation.shouldStore}`)

      return evaluation
    } catch (error) {
      logger.error(`[Dynamic Sub-Agent] 評估失敗:`, error)

      // 降級方案：使用關鍵字匹配
      return this.fallbackDynamicEvaluation(subAgent, distributionInput)
    }
  }

  /**
   * 構建動態評估提示詞（使用 Subcategory 的 systemPrompt + @url）
   */
  private buildDynamicEvaluationPrompt(
    subAgent: DynamicSubAgent,
    distribution: DistributionInput
  ): string {
    // 檢查是否有連結，如果有，使用 @url 語法讓 Gemini 直接存取
    let linkAnalysisSection = ''
    if (distribution.links.length > 0) {
      linkAnalysisSection = `\n**🔗 連結深度分析（請直接存取以下網址）:**\n`
      distribution.links.forEach((link, i) => {
        const title = distribution.linkTitles[i] || link
        linkAnalysisSection += `${i + 1}. ${title}\n   @${link}\n   ↑ 請直接存取此網址，分析內容、提取關鍵資訊\n\n`
      })
    }

    return `${subAgent.systemPrompt}

你是 ${subAgent.nameChinese} (${subAgent.name})，專注於 ${subAgent.island?.nameChinese || '知識管理'} 領域。

**你的個性：**
${subAgent.personality}

**你的對話風格：**
${subAgent.chatStyle}

**你的專業關鍵字：**
${subAgent.keywords.join('、')}

**你的任務：**
作為 Gemini 2.5 Flash，你需要對以下知識進行深度分析和整理，決定是否存儲並生成完整的知識結構。

**重要：如果內容包含連結，請使用 @url 語法直接存取網址內容進行分析！**

**用戶的原始內容:**
${distribution.rawContent}

${distribution.fileUrls.length > 0 ? `\n**附加文件 (${distribution.fileUrls.length}個):**\n${distribution.fileNames.map((name, i) => `- ${name} (${distribution.fileTypes[i]})`).join('\n')}` : ''}

${linkAnalysisSection}

**白噗噗的初步分類:**
${distribution.chiefSummary}

**你需要提供深度分析，包括：**
1. **相關性評估** - 這個知識與你的專長領域的關聯程度
   ${distribution.links.length > 0 ? '   ⚠️ 如果有連結，請直接存取網址內容進行評估（使用 @url）' : ''}
2. **詳細摘要** - 用 2-3 句話總結核心內容和價值
   ${distribution.links.length > 0 ? '   ⚠️ 對於連結內容，請基於實際存取的內容撰寫摘要' : ''}
3. **關鍵洞察** - 提取 3-5 個重要的知識點或洞察
   ${distribution.links.length > 0 ? '   ⚠️ 如果是影片/文章，請提取內容中的關鍵要點' : ''}
4. **精準標籤** - 產生 3-5 個描述性標籤
5. **標題建議** - 為這個記憶創建一個清晰的標題（10字以內）
6. **情感分析** - 判斷內容的情感傾向
7. **重要性評分** - 1-10分，評估這個知識的重要程度
8. **行動建議** - 如果適用，提供後續行動建議

請以 JSON 格式返回完整分析（只返回 JSON，不要其他文字）：
{
  "relevanceScore": 0.95,
  "shouldStore": true,
  "reasoning": "這是一個關於XXX的重要知識，因為...，對用戶的XXX方面有幫助",
  "confidence": 0.9,
  "suggestedTags": ["標籤1", "標籤2", "標籤3"],
  "keyInsights": [
    "關鍵洞察1：...",
    "關鍵洞察2：...",
    "關鍵洞察3：..."
  ],
  "detailedSummary": "這個知識主要討論...",
  "suggestedTitle": "XXX學習筆記",
  "sentiment": "positive|neutral|negative",
  "importanceScore": 8,
  "actionableAdvice": "建議用戶可以..."
}

**評估準則：**
- **高度相關 (>0.7)**: 核心內容完全匹配你的專長領域，具有長期價值
- **中度相關 (0.4-0.7)**: 部分內容與領域相關，有參考價值
- **低相關 (<0.4)**: 與領域關聯較弱，不建議存儲

**🔗 特別注意 - 資源連結評估：**
- 如果內容包含連結（URL、文章、影片等），**重點評估連結本身的價值**
- 連結標題和描述是關鍵資訊，比純 URL 更重要
- 用戶分享連結通常表示想要收藏和記錄，應給予較高評分
- YouTube、文章、教學資源等應該被視為有價值的知識來源
- 即使用戶只提供了 URL，如果連結內容有價值，也應該存儲

**深度分析要求：**
- 仔細理解用戶的真實意圖和需求
- 識別隱含的知識價值和長期意義
- 考慮這個知識在未來可能的應用場景
- 對於資源連結，重點看連結內容的實用性和相關性
- 根據你的個性和對話風格提供有洞察力和可執行的建議
`
  }

  /**
   * 創建記憶（使用動態 SubAgent 配置）
   */
  private async createMemoryWithDynamicSubAgent(
    userId: string,
    subcategoryId: string,
    distribution: any,
    evaluation: EvaluationResult,
    distributionId: string,
    subAgent: DynamicSubAgent
  ) {
    try {
      // 解析深度分析結果
      const detailedSummary = evaluation.detailedSummary || distribution.chiefSummary
      const suggestedTitle = evaluation.suggestedTitle || `${subAgent.nameChinese}的記憶`
      const sentiment = evaluation.sentiment || 'neutral'
      const importanceScore = evaluation.importanceScore || Math.round(evaluation.relevanceScore * 10)
      const actionableAdvice = evaluation.actionableAdvice

      // 創建完整的記憶記錄（使用 subcategoryId）
      const memory = await prisma.memory.create({
        data: {
          user: {
            connect: { id: userId }
          },
          subcategory: {
            connect: { id: subcategoryId }
          },
          rawContent: distribution.rawContent,
          title: suggestedTitle,
          summary: distribution.chiefSummary, // Chief 的簡要摘要
          contentType: distribution.contentType,
          fileUrls: distribution.fileUrls,
          fileNames: distribution.fileNames,
          fileTypes: distribution.fileTypes,
          links: distribution.links,
          linkTitles: distribution.linkTitles,
          keyPoints: evaluation.keyInsights,
          aiSentiment: sentiment,
          aiAnalysis: evaluation.reasoning,
          category: AssistantType.RESOURCES, // 動態 SubAgent 使用 RESOURCES 作為預設
          tags: [...new Set([...distribution.suggestedTags, ...evaluation.suggestedTags, ...subAgent.keywords])].slice(0, 5), // 最多5個標籤

          // === 新增：SubAgent 深度分析結果 ===
          detailedSummary: detailedSummary, // SubAgent 的詳細摘要（2-3句話）
          importanceScore: importanceScore, // 1-10 重要性評分
          actionableAdvice: actionableAdvice, // 行動建議

          distribution: {
            connect: { id: distributionId }
          },
          relevanceScore: evaluation.relevanceScore,
        },
      })

      logger.info(`[${subAgent.nameChinese}] 創建深度分析記憶: ${memory.id}`)
      logger.info(`  - 標題: ${suggestedTitle}`)
      logger.info(`  - 重要性: ${importanceScore}/10`)
      logger.info(`  - 情感: ${sentiment}`)
      logger.info(`  - 標籤: ${memory.tags.join(', ')}`)

      return memory
    } catch (error) {
      logger.error('[Dynamic Sub-Agent] 創建記憶失敗:', error)
      throw error
    }
  }

  /**
   * 降級方案：基於關鍵字的動態 SubAgent 評估
   */
  private fallbackDynamicEvaluation(
    subAgent: DynamicSubAgent,
    distribution: DistributionInput
  ): EvaluationResult {
    const content = distribution.rawContent.toLowerCase()
    const keywords = subAgent.keywords

    // 計算關鍵字匹配度
    const matchCount = keywords.filter(kw => content.includes(kw.toLowerCase())).length
    const relevanceScore = Math.min(matchCount / Math.max(keywords.length, 1), 1)
    const shouldStore = relevanceScore > 0.4

    return {
      relevanceScore,
      shouldStore,
      reasoning: shouldStore
        ? `基於關鍵字匹配，此內容與 ${subAgent.nameChinese} 的領域相關`
        : `基於關鍵字匹配，此內容與 ${subAgent.nameChinese} 的領域相關性較低`,
      confidence: 0.3,
      suggestedTags: distribution.suggestedTags.slice(0, 3),
      keyInsights: [`關鍵字匹配數: ${matchCount}/${keywords.length}`],
    }
  }
}

export const subAgentService = new SubAgentService()
