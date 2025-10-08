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
import { exec } from 'child_process'
import { promisify } from 'util'
import { assistantService } from './assistantService'
import { multimodalProcessor } from './multimodalProcessor'

const execAsync = promisify(exec)
const prisma = new PrismaClient()

interface EvaluationResult {
  relevanceScore: number      // 0-1
  shouldStore: boolean
  reasoning: string
  confidence: number          // 0-1
  suggestedCategory?: AssistantType
  suggestedTags: string[]
  keyInsights: string[]
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
  private geminiModel: string = 'gemini-2.5-pro' // Sub-Agent 使用 Pro 進行深度分析

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
        parsed.shouldStore
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

      return {
        agentDecisions,
        memoriesCreated,
        storedByCount: storedByIds.length,
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
      const detailedSummary = (evaluation as any).detailedSummary || distribution.chiefSummary
      const suggestedTitle = (evaluation as any).suggestedTitle || `${assistant.nameChinese}的記憶`
      const sentiment = (evaluation as any).sentiment || 'neutral'
      const importanceScore = (evaluation as any).importanceScore || Math.round(evaluation.relevanceScore * 10)
      const actionableAdvice = (evaluation as any).actionableAdvice

      // 創建完整的記憶記錄（包含 Sub-Agent 的深度分析）
      const memory = await prisma.memory.create({
        data: {
          userId,
          assistantId,
          rawContent: distribution.rawContent,
          title: suggestedTitle, // 使用 Sub-Agent 建議的標題
          summary: detailedSummary, // 使用詳細摘要
          contentType: distribution.contentType,
          fileUrls: distribution.fileUrls,
          fileNames: distribution.fileNames,
          fileTypes: distribution.fileTypes,
          links: distribution.links,
          linkTitles: distribution.linkTitles,
          keyPoints: evaluation.keyInsights,
          aiSentiment: sentiment, // 使用情感分析結果
          aiImportance: importanceScore, // 使用重要性評分
          aiAnalysis: evaluation.reasoning, // 使用 Sub-Agent 的詳細分析
          category: evaluation.suggestedCategory || assistant.type,
          tags: [...new Set([...distribution.suggestedTags, ...evaluation.suggestedTags])], // 合併並去重標籤
          distributionId,
          relevanceScore: evaluation.relevanceScore,
          // 如果有行動建議，存儲在 metadata 中
          ...(actionableAdvice && {
            metadata: {
              actionableAdvice
            }
          })
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
   * 構建深度評估 Prompt（使用 Gemini 2.5 Pro）
   */
  private buildEvaluationPrompt(
    assistant: any,
    distribution: DistributionInput
  ): string {
    return `${assistant.systemPrompt}

你是 ${assistant.nameChinese} (${assistant.name})，一個專注於 ${assistant.type} 領域的知識管理專家。

**你的任務：**
作為 Gemini 2.5 Pro，你需要對以下知識進行深度分析和整理，決定是否存儲並生成完整的知識結構。

**用戶的原始內容:**
${distribution.rawContent}

${distribution.fileUrls.length > 0 ? `\n**附加文件 (${distribution.fileUrls.length}個):**\n${distribution.fileNames.map((name, i) => `- ${name} (${distribution.fileTypes[i]})`).join('\n')}` : ''}

${distribution.links.length > 0 ? `\n**相關連結 (${distribution.links.length}個):**\n${distribution.linkTitles.map((title, i) => `- ${title || distribution.links[i]}`).join('\n')}` : ''}

**白噗噗的初步分類:**
${distribution.chiefSummary}

**你需要提供深度分析，包括：**
1. **相關性評估** - 這個知識與 ${assistant.type} 領域的關聯程度
2. **詳細摘要** - 用 2-3 句話總結核心內容和價值
3. **關鍵洞察** - 提取 3-5 個重要的知識點或洞察
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

**深度分析要求：**
- 仔細理解用戶的真實意圖和需求
- 識別隱含的知識價值和長期意義
- 考慮這個知識在未來可能的應用場景
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
        logger.info(`[Sub-Agent] Calling Gemini CLI Pro for deep analysis`)

        // 转义 prompt 中的特殊字符
        const escapedPrompt = prompt
          .replace(/\\/g, '\\\\')
          .replace(/"/g, '\\"')
          .replace(/\$/g, '\\$')
          .replace(/`/g, '\\`')

        // 使用 Gemini CLI Pro 调用（深度分析）
        const command = `gemini -m ${this.geminiModel} -p "${escapedPrompt}"`
        const { stdout, stderr } = await execAsync(command, {
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
          timeout: 90000, // 90 seconds timeout (Pro 需要更長時間)
          env: {
            ...process.env,
            GEMINI_API_KEY: process.env.GEMINI_API_KEY
          }
        })

        if (stderr && stderr.includes('Error')) {
          logger.error('[Sub-Agent] Gemini CLI Pro stderr:', stderr)
        }

        const response = stdout.trim()
        logger.info(`[Sub-Agent] Gemini CLI Pro response received (${response.length} chars)`)
        return response
      } catch (error: any) {
        logger.error('[Sub-Agent] Gemini CLI Pro error:', error.message)
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
   *
   * 決策規則：
   * - 高相關性 (>0.7) + 高置信度 (>0.7) → 一定儲存
   * - 中相關性 (0.4-0.7) → 參考 AI 建議
   * - 低相關性 (<0.4) → 一定不儲存
   * - 低置信度 (<0.5) → 更保守，需要更高的相關性
   */
  private shouldStoreKnowledge(
    relevanceScore: number,
    confidence: number,
    aiSuggestion: boolean
  ): boolean {
    // 規則 1: 高相關性且高置信度 → 強制儲存
    if (relevanceScore >= 0.7 && confidence >= 0.7) {
      logger.info(`[Storage Decision] 高相關性 (${relevanceScore.toFixed(2)}) + 高置信度 (${confidence.toFixed(2)}) → 儲存`)
      return true
    }

    // 規則 2: 低相關性 → 強制不儲存
    if (relevanceScore < 0.4) {
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
}

export const subAgentService = new SubAgentService()
