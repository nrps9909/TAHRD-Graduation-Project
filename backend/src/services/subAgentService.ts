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
import { callGeminiAPI } from '../utils/geminiAPI'
import { assistantService } from './assistantService'
import { multimodalProcessor } from './multimodalProcessor'
import { dynamicSubAgentService } from './dynamicSubAgentService'

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
  // 社交成長紀錄專用字段（針對 SOCIAL 分類）
  socialContext?: string      // [情境] 簡述當下發生什麼（限一句話）
  userReaction?: string       // [使用者反應] 情緒或行為反應
  aiFeedback?: string         // [AI 回饋] 建議或安撫（具體一句話）
  socialSkillTags?: string[]  // [社交能力標籤] #表達情緒 #傾聽 #自我覺察 #主動互動
  progressChange?: number     // [進度變化] 成長 +1／維持 0／退步 -1
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
  private geminiModel: string = 'gemini-2.5-flash' // 使用 Gemini 2.5 Flash 進行深度分析

  constructor() {
    this.mcpUrl = process.env.MCP_SERVICE_URL || 'http://localhost:8765'
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

      // ⚡ 優化：智能優先級評估
      // 1. 先評估 Chief 推薦的主要助手（distributedTo[0]）
      const primaryAssistantId = distribution.distributedTo[0]
      const otherAssistantIds = assistantIds.filter(id => id !== primaryAssistantId)

      let primaryEvaluation: any = null

      // 評估主要助手
      if (primaryAssistantId && assistantIds.includes(primaryAssistantId)) {
        try {
          logger.info(`[Sub-Agents] 優先評估主要助手: ${primaryAssistantId}`)
          const evaluation = await this.evaluateKnowledge(primaryAssistantId, distribution)

          // 創建決策記錄
          const decision = await prisma.agentDecision.create({
            data: {
              distributionId,
              assistantId: primaryAssistantId,
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
              primaryAssistantId,
              distribution,
              evaluation,
              distributionId
            )
            memoriesCreated.push(memory)
          }

          primaryEvaluation = { assistantId: primaryAssistantId, decision, memory: evaluation.shouldStore, evaluation }
        } catch (error) {
          logger.error(`[Sub-Agent] 處理主要助手 ${primaryAssistantId} 失敗:`, error)
        }
      }

      // 2. 判斷是否需要評估其他助手
      // 如果主要助手的相關性很高 (>0.9) 且置信度很高 (>0.9)，跳過其他助手
      const shouldSkipOthers = primaryEvaluation &&
        primaryEvaluation.evaluation.relevanceScore >= 0.9 &&
        primaryEvaluation.evaluation.confidence >= 0.9

      let otherEvaluations: any[] = []

      if (shouldSkipOthers) {
        logger.info(`[Sub-Agents] 主要助手高相關性 (${primaryEvaluation.evaluation.relevanceScore.toFixed(2)}) + 高置信度 (${primaryEvaluation.evaluation.confidence.toFixed(2)})，跳過其他助手評估`)
      } else if (otherAssistantIds.length > 0) {
        // 3. 並發評估其他助手
        logger.info(`[Sub-Agents] 評估其他 ${otherAssistantIds.length} 個助手`)
        otherEvaluations = await Promise.all(
          otherAssistantIds.map(async (assistantId) => {
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
      }

      // 合併所有評估結果（主要助手 + 其他助手）
      const evaluations = [
        ...(primaryEvaluation ? [primaryEvaluation] : []),
        ...otherEvaluations.filter(e => e !== null)
      ]

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
            const categoryInfo = {
              memoryId: memory.id,
              categoryName: assistant?.nameChinese || '未知分類',
              categoryEmoji: assistant?.emoji || '📝'
            }
            logger.info(`[Sub-Agents] 生成分類信息: ${JSON.stringify(categoryInfo)}`)
            return categoryInfo
          }
          logger.warn(`[Sub-Agents] 記憶 ${memory.id} 缺少 assistantId`)
          return null
        })
      ).then(results => results.filter(r => r !== null))

      logger.info(`[Sub-Agents] 🎯 返回結果摘要:`)
      logger.info(`  - agentDecisions: ${agentDecisions.length}`)
      logger.info(`  - memoriesCreated: ${memoriesCreated.length}`)
      logger.info(`  - storedByCount: ${storedByIds.length}`)
      logger.info(`  - categoriesInfo: ${categoriesInfo.length} 項`)
      logger.info(`  - categoriesInfo detail: ${JSON.stringify(categoriesInfo)}`)

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

      // 解析社交成長紀錄專用字段（針對 SOCIAL 分類）
      const socialContext = evaluation.socialContext
      const userReaction = evaluation.userReaction
      const aiFeedback = evaluation.aiFeedback
      const socialSkillTags = evaluation.socialSkillTags || []
      const progressChange = evaluation.progressChange

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

          // === 新增：社交成長紀錄專用字段 ===
          socialContext: socialContext, // [情境] 簡述當下發生什麼
          userReaction: userReaction, // [使用者反應] 情緒或行為反應
          aiFeedback: aiFeedback, // [AI 回饋] 建議或安撫
          socialSkillTags: socialSkillTags, // [社交能力標籤]
          progressChange: progressChange, // [進度變化] +1/0/-1

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
   * 創建記憶（Island-based，包含 islandId）
   */
  private async createMemoryWithIsland(
    userId: string,
    assistantId: string,
    islandId: string,
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

      // 解析社交成長紀錄專用字段（針對 SOCIAL 分類）
      const socialContext = evaluation.socialContext
      const userReaction = evaluation.userReaction
      const aiFeedback = evaluation.aiFeedback
      const socialSkillTags = evaluation.socialSkillTags || []
      const progressChange = evaluation.progressChange

      // 創建完整的記憶記錄（包含 Sub-Agent 的深度分析和 islandId）
      const memory = await prisma.memory.create({
        data: {
          user: {
            connect: { id: userId }
          },
          assistant: {
            connect: { id: assistantId }
          },
          island: {
            connect: { id: islandId }  // 新增：關聯到島嶼
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

          // === 新增：社交成長紀錄專用字段 ===
          socialContext: socialContext, // [情境] 簡述當下發生什麼
          userReaction: userReaction, // [使用者反應] 情緒或行為反應
          aiFeedback: aiFeedback, // [AI 回饋] 建議或安撫
          socialSkillTags: socialSkillTags, // [社交能力標籤]
          progressChange: progressChange, // [進度變化] +1/0/-1

          distribution: {
            connect: { id: distributionId }
          },
          relevanceScore: evaluation.relevanceScore,
        },
      })

      // 更新助手統計
      await assistantService.incrementAssistantStats(assistantId, 'memory')

      logger.info(`[${assistant.name}] 創建深度分析記憶 (Island-based): ${memory.id}`)
      logger.info(`  - Island ID: ${islandId}`)
      logger.info(`  - 標題: ${suggestedTitle}`)
      logger.info(`  - 重要性: ${importanceScore}/10`)
      logger.info(`  - 情感: ${sentiment}`)
      logger.info(`  - 標籤: ${memory.tags.join(', ')}`)

      return memory
    } catch (error) {
      logger.error('[Sub-Agent] 創建記憶失敗 (Island-based):', error)
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
${assistant.type === 'SOCIAL' ? `
**🌟 特別要求 - 社交成長紀錄格式（人際關係島專用）：**

這是與一般知識不同的特殊格式，專門用來追蹤用戶的社交成長軌跡。
請額外提供以下專屬分析，讓用戶能看到自己的進步：

- **[主題]** - 用 suggestedTitle 表示對話/事件名稱（例：「與藝術女聊天」、「與朋友討論感情」、「練習主動打招呼」）
- **[情境] socialContext** - 用一句話簡述當下發生了什麼（例：「在 Bumble 上聊到認識的人」、「朋友討論交友狀況」）
- **[使用者反應] userReaction** - 描述使用者的情緒或行為反應（例：「好奇並積極討論」、「感到不確定」、「主動分享想法」）
- **[AI 回饋] aiFeedback** - 提供具體一句話的建議或安撫（例：「你能主動參與社交話題，這很棒！」、「討論感情話題顯示你願意探索人際關係」）
- **[社交能力標籤] socialSkillTags** - 從以下選項中選擇適用的標籤（可多選）：
  #表達情緒 #傾聽 #自我覺察 #主動互動 #同理心 #衝突解決 #建立關係 #維持友誼 #情感表達 #社交好奇 #開放討論
- **[進度變化] progressChange** - 評估這次互動對使用者社交能力的影響：
  • 成長 +1：有明確進步（例：主動互動、表達情感、解決衝突）
  • 維持 0：持平狀態（例：一般對話、觀察學習）
  • 退步 -1：遇到挫折（例：迴避、衝突升級、情緒失控）
- **[建議行動] actionableAdvice** - AI 給下一步具體任務（例：「下次可以嘗試更深入地分享你的感受」、「保持這種開放的態度繼續與朋友交流」）

**重要提醒：**
這個格式能幫助使用者看到自己的社交成長軌跡，提供具體證據證明系統真的能解決社交困擾。
即使是看似普通的對話，也要從社交能力培養的角度進行分析！
` : ''}

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
  "actionableAdvice": "建議用戶可以..."${assistant.type === 'SOCIAL' ? `,
  "socialContext": "在 Bumble 上聊到台藝大認識的人，與朋友討論交友狀況",
  "userReaction": "好奇並積極參與討論，主動分享自己的觀察",
  "aiFeedback": "你能主動參與社交話題並分享想法，這顯示你對人際關係保持開放態度！",
  "socialSkillTags": ["#主動互動", "#社交好奇", "#開放討論", "#情感表達"],
  "progressChange": 1` : ''}
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
        [AssistantType.MISC]: ['雜項', '其他', '待整理', '未分類', '隨記'],
      }

      const keywords: string[] = typeKeywords[assistant.type as AssistantType] || []
      const matchCount = keywords.filter((kw: string) =>
        content.includes(kw) || topics.some(t => t.includes(kw.toLowerCase()))
      ).length

      const relevanceScore = Math.min(matchCount / Math.max(keywords.length, 1), 1)
      // ⚠️ 移除相關性門檻 - 所有內容都儲存
      const shouldStore = true

      logger.info(`[Fallback Evaluation] ✅ 降級評估：所有對話都記錄 - 相關性 (${relevanceScore.toFixed(2)}) → 儲存`)

      return {
        relevanceScore,
        shouldStore,
        reasoning: `基於降級評估，此內容歸類到 ${assistant.nameChinese}`,
        confidence: 0.3,
        suggestedCategory: assistant.type,
        suggestedTags: distribution.suggestedTags.slice(0, 3),
        keyInsights: [`關鍵字匹配數: ${matchCount}`],
      }
    } catch (error) {
      logger.error('[Sub-Agent] 降級評估失敗:', error)
      // ⚠️ 即使降級評估失敗，仍然儲存內容
      logger.info(`[Fallback Evaluation Error] ✅ 評估失敗但仍記錄 → 儲存`)
      return {
        relevanceScore: 0.1,
        shouldStore: true, // 改為 true
        reasoning: '降級評估失敗，但仍儲存此內容',
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
  /**
   * 調用 Gemini API 進行深度分析
   * 優化：完全使用 REST API，移除不穩定的 CLI
   */
  private async callMCP(prompt: string, assistantId: string): Promise<string> {
    try {
      // 直接使用 Gemini REST API（快速、穩定）
      // 注意：評估任務使用低 temperature (0.2) 以獲得穩定、準確的相關性判斷
      const response = await callGeminiAPI(prompt, {
        model: this.geminiModel,
        temperature: 0.2, // 降低 temperature 提升評估準確度（原 0.7）
        maxOutputTokens: 4096, // SubAgent 需要更長的輸出
        timeout: 20000 // 20 秒超時（深度分析需要更多時間）
      })

      return response

    } catch (error: any) {
      logger.error(`[Sub-Agent] Gemini API error: ${error.message || error}`)
      logger.error(`[Sub-Agent] Error details:`, {
        message: error.message,
        stack: error.stack,
        model: this.geminiModel
      })

      // Fallback: 使用 MCP Server（如果配置）
      try {
        logger.info('[Sub-Agent] Trying MCP Server fallback')
        const fallbackResponse = await axios.post(
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

        return fallbackResponse.data.response || ''
      } catch (fallbackError) {
        logger.error('[Sub-Agent] All AI services failed')
        throw new Error('AI 深度分析服務暫時不可用，請稍後再試')
      }
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
   * ⚠️ 新策略：所有對話都會被記錄到資料庫
   *
   * 原因：用戶明確要求記錄所有訊息，包括日常對話如「今天跟許小姐出門吃飯 真開心」
   * 這些對話雖然相關性可能不高，但對用戶來說有記憶價值
   *
   * 決策規則（簡化版）：
   * - 所有內容都儲存（預設 true）
   * - 只有極少數明確無意義的內容會被過濾（如空白、純數字等）
   */
  private shouldStoreKnowledge(
    relevanceScore: number,
    confidence: number,
    aiSuggestion: boolean,
    distribution?: any // 可選：用於檢查內容類型
  ): boolean {
    // ⚠️ 新策略：預設儲存所有內容
    // 不再根據相關性評分進行複雜判斷

    logger.info(`[Storage Decision] ✅ 所有對話都記錄 - 相關性 (${relevanceScore.toFixed(2)}), 置信度 (${confidence.toFixed(2)}) → 儲存`)

    return true

    // 註：如果未來需要恢復過濾邏輯，可以參考以下被註解的代碼：
    /*
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
    if (relevanceScore >= 0.5 && confidence >= 0.5) {
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
    const compositeScore = relevanceScore * 0.7 + confidence * 0.3
    const shouldStore = compositeScore >= 0.5
    logger.info(`[Storage Decision] 綜合評分 (${compositeScore.toFixed(2)}) = 相關性×0.7 + 置信度×0.3 → ${shouldStore ? '儲存' : '不儲存'}`)
    return shouldStore
    */
  }

  /**
   * 智能匹配自定義島嶼到合適的 AssistantType
   * 根據島嶼名稱和描述中的關鍵字，選擇最合適的預設類別
   */
  private matchIslandToAssistantType(island: any): string {
    const text = `${island.nameChinese} ${island.description || ''}`.toLowerCase()

    // 關鍵字匹配規則（按優先級排序）
    const patterns = [
      { keywords: ['學習', '知識', '教育', '課程', '讀書', '研究'], type: 'LEARNING' },
      { keywords: ['工作', '職業', '事業', '專案', '任務', '會議'], type: 'WORK' },
      { keywords: ['社交', '人際', '朋友', '關係', '交友', '聊天'], type: 'SOCIAL' },
      { keywords: ['目標', '規劃', '夢想', '計畫', '願望', '理想'], type: 'GOALS' },
      { keywords: ['資源', '收藏', '連結', '工具', '參考', '素材'], type: 'RESOURCES' },
      { keywords: ['靈感', '創意', '藝術', '音樂', '設計', '興趣', '娛樂', '偶像'], type: 'INSPIRATION' },
      { keywords: ['生活', '日常', '健康', '飲食', '運動', '休閒'], type: 'LIFE' },
    ]

    // 嘗試匹配關鍵字
    for (const pattern of patterns) {
      if (pattern.keywords.some(keyword => text.includes(keyword))) {
        logger.info(`[Island Matcher] 島嶼 "${island.nameChinese}" 匹配到類別: ${pattern.type} (關鍵字匹配)`)
        return pattern.type
      }
    }

    // 無法匹配時，使用 MISC（雜項）而不是 LIFE
    logger.info(`[Island Matcher] 島嶼 "${island.nameChinese}" 無法匹配到特定類別，使用 MISC`)
    return 'MISC'
  }

  /**
   * 處理知識分發（使用 Island-based SubAgent）
   * 與 processDistribution 類似，但使用 Island 配置映射到對應的 Assistant
   */
  async processDistributionWithIslands(
    userId: string,
    distributionId: string,
    islandIds: string[]
  ) {
    try {
      // 獲取分發記錄
      const distribution = await prisma.knowledgeDistribution.findUnique({
        where: { id: distributionId },
      })

      if (!distribution) {
        throw new Error(`Distribution not found: ${distributionId}`)
      }

      logger.info(`[Island Sub-Agents] 開始處理分發記錄 ${distributionId}，相關 Island 數量: ${islandIds.length}`)

      const agentDecisions: any[] = []
      const memoriesCreated: any[] = []

      // 並發評估所有相關 Island（映射到對應的 Assistant）
      const evaluations = await Promise.all(
        islandIds.map(async (islandId) => {
          try {
            // 載入 Island 配置
            const island = await dynamicSubAgentService.getIslandById(islandId)
            if (!island) {
              logger.error(`[Island Sub-Agent] Island not found: ${islandId}`)
              return null
            }

            // 根據 Island 類型映射到對應的 Assistant
            // 首先嘗試直接匹配（適用於預設島嶼，如 LEARNING_ISLAND）
            const islandType = island.name?.replace('_ISLAND', '') || island.name
            let assistant = await assistantService.getAssistantByType(islandType as any)

            if (!assistant) {
              // 對於自定義島嶼，使用智能匹配邏輯
              const matchedType = this.matchIslandToAssistantType(island)
              assistant = await assistantService.getAssistantByType(matchedType as any)

              if (!assistant) {
                logger.error(`[Island Sub-Agent] 無法找到 Assistant，島嶼: ${island.nameChinese}, 匹配類型: ${matchedType}`)
                return null
              }
            }

            // 評估相關性（使用 Island 配置，但通過 Assistant 處理）
            const evaluation = await this.evaluateKnowledgeWithIsland(
              assistant,
              island,
              distribution
            )

            // 創建決策記錄（使用 assistantId）
            const decision = await prisma.agentDecision.create({
              data: {
                distributionId,
                assistantId: assistant.id,
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

            // 如果決定儲存，創建記憶（使用 assistantId 和 islandId）
            if (evaluation.shouldStore) {
              const memory = await this.createMemoryWithIsland(
                userId,
                assistant.id,
                islandId,  // 新增：傳遞 islandId
                distribution,
                evaluation,
                distributionId
              )
              memoriesCreated.push(memory)

              // 更新 Island 統計
              await dynamicSubAgentService.incrementStats(islandId, 'memory')
            }

            return { islandId, assistantId: assistant.id, decision, memory: evaluation.shouldStore }
          } catch (error) {
            logger.error(`[Island Sub-Agent] 處理 Island ${islandId} 失敗:`, error)
            return null
          }
        })
      )

      // 更新分發記錄的 storedBy 列表（使用 assistantIds）
      const storedByIds = evaluations
        .filter(e => e && e.memory)
        .map(e => e!.assistantId)

      await prisma.knowledgeDistribution.update({
        where: { id: distributionId },
        data: { storedBy: storedByIds },
      })

      logger.info(`[Island Sub-Agents] 分發處理完成 - 決策數: ${agentDecisions.length}, 創建記憶數: ${memoriesCreated.length}`)

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
      logger.error('[Island Sub-Agents] 處理知識分發失敗:', error)
      throw new Error('處理知識分發失敗')
    }
  }

  /**
   * 評估知識相關性（使用 Island 配置）
   */
  private async evaluateKnowledgeWithIsland(
    assistant: any,
    island: any,
    distributionInput: DistributionInput
  ): Promise<EvaluationResult> {
    try {
      logger.info(`[${island.nameChinese}] 開始評估知識相關性`)

      // 構建 Island-based 評估提示詞
      const prompt = this.buildIslandEvaluationPrompt(assistant, island, distributionInput)

      // 調用 MCP 服務進行評估（使用 assistant.id）
      const response = await this.callMCP(prompt, assistant.id)
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
        distributionInput
      )

      const evaluation: EvaluationResult = {
        relevanceScore,
        shouldStore,
        reasoning: parsed.reasoning || '無評估說明',
        confidence,
        suggestedCategory: parsed.suggestedCategory || assistant.type,  // 優先使用 AI 建議，否則使用 assistant.type
        suggestedTags: Array.isArray(parsed.suggestedTags) ? parsed.suggestedTags : [],
        keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights : [],
        // SubAgent 深度分析結果
        detailedSummary: parsed.detailedSummary,
        suggestedTitle: parsed.suggestedTitle,
        sentiment: parsed.sentiment,
        importanceScore: typeof parsed.importanceScore === 'number' ? parsed.importanceScore : undefined,
        actionableAdvice: parsed.actionableAdvice,
      }

      logger.info(`[${island.nameChinese}] 評估完成 - 相關性: ${evaluation.relevanceScore.toFixed(2)}, 是否儲存: ${evaluation.shouldStore}`)

      return evaluation
    } catch (error) {
      logger.error(`[Island Sub-Agent] 評估失敗:`, error)

      // 降級方案：使用關鍵字匹配
      return this.fallbackIslandEvaluation(assistant, island, distributionInput)
    }
  }

  /**
   * 構建 Island-based 評估提示詞（使用 Island + Assistant 的配置 + @url）
   */
  private buildIslandEvaluationPrompt(
    assistant: any,
    island: any,
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

你是 ${assistant.nameChinese} (${assistant.name})，專注於 ${island.nameChinese || assistant.type} 領域。

**Island 背景：**
${island.description || `${island.nameChinese} 島嶼的知識管理`}

**專業關鍵字：**
${island.keywords?.join('、') || assistant.type}

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
1. **相關性評估** - 這個知識與 ${island.nameChinese} 領域的關聯程度
   ${distribution.links.length > 0 ? '   ⚠️ 如果有連結，請直接存取網址內容進行評估（使用 @url）' : ''}
2. **內容分類** - 根據內容語義，從以下類別中選擇最合適的：LEARNING（學習）、INSPIRATION（靈感）、WORK（工作）、SOCIAL（社交）、LIFE（生活）、GOALS（目標）、RESOURCES（資源）、MISC（雜項）
3. **詳細摘要** - 用 2-3 句話總結核心內容和價值
   ${distribution.links.length > 0 ? '   ⚠️ 對於連結內容，請基於實際存取的內容撰寫摘要' : ''}
4. **關鍵洞察** - 提取 3-5 個重要的知識點或洞察
   ${distribution.links.length > 0 ? '   ⚠️ 如果是影片/文章，請提取內容中的關鍵要點' : ''}
5. **精準標籤** - 產生 3-5 個描述性標籤
6. **標題建議** - 為這個記憶創建一個清晰的標題（10字以內）
7. **情感分析** - 判斷內容的情感傾向
8. **重要性評分** - 1-10分，評估這個知識的重要程度
9. **行動建議** - 如果適用，提供後續行動建議

請以 JSON 格式返回完整分析（只返回 JSON，不要其他文字）：
{
  "relevanceScore": 0.95,
  "shouldStore": true,
  "reasoning": "這是一個關於XXX的重要知識，因為...，對用戶的XXX方面有幫助",
  "confidence": 0.9,
  "suggestedCategory": "INSPIRATION",
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
- **高度相關 (>0.7)**: 核心內容完全匹配 ${island.nameChinese} 領域，具有長期價值
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
   * 降級方案：基於關鍵字的 Island 評估
   */
  private fallbackIslandEvaluation(
    assistant: any,
    island: any,
    distribution: DistributionInput
  ): EvaluationResult {
    const content = distribution.rawContent.toLowerCase()
    const keywords = island.keywords || []

    // 計算關鍵字匹配度
    const matchCount = keywords.filter((kw: string) => content.includes(kw.toLowerCase())).length
    const relevanceScore = keywords.length > 0 ? Math.min(matchCount / keywords.length, 1) : 0.5
    // ⚠️ 移除相關性門檻 - 所有內容都儲存
    const shouldStore = true

    logger.info(`[Fallback Island Evaluation] ✅ 降級評估（Island-based）：所有對話都記錄 - 相關性 (${relevanceScore.toFixed(2)}) → 儲存`)

    return {
      relevanceScore,
      shouldStore,
      reasoning: `基於降級評估，此內容歸類到 ${island.nameChinese}`,
      confidence: 0.3,
      suggestedCategory: assistant.type,
      suggestedTags: distribution.suggestedTags.slice(0, 3),
      keyInsights: [`關鍵字匹配數: ${matchCount}/${keywords.length}`],
    }
  }
}

export const subAgentService = new SubAgentService()
