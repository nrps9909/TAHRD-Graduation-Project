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

import { PrismaClient, ContentType } from '@prisma/client'
import { logger } from '../utils/logger'
import axios from 'axios'
import { callGeminiAPI } from '../utils/geminiAPI'
import { islandService } from './islandService'  // 新增 - Island 服務
import { multimodalProcessor } from './multimodalProcessor'
import { dynamicSubAgentService } from './dynamicSubAgentService'
import { vectorService } from './vectorService'

const prisma = new PrismaClient()

interface EvaluationResult {
  relevanceScore: number      // 0-1
  shouldStore: boolean
  reasoning: string
  confidence: number          // 0-1
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
   * 評估知識相關性（Island-based）
   */
  async evaluateKnowledge(
    islandId: string,
    distributionInput: DistributionInput,
    userId: string
  ): Promise<EvaluationResult> {
    try {
      const island = await islandService.getIslandById(islandId, userId)
      if (!island) {
        throw new Error(`Island not found: ${islandId}`)
      }

      logger.info(`[${island.nameChinese}] 開始評估知識相關性`)

      // 構建評估提示詞
      const prompt = this.buildEvaluationPrompt(island, distributionInput)

      // 調用 MCP 服務進行評估
      const response = await this.callMCP(prompt, islandId)
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
      logger.error(`[Sub-Agent] 評估失敗:`, error)

      // 降級方案：使用關鍵字匹配的簡單評估
      return this.fallbackEvaluation(islandId, distributionInput, userId)
    }
  }

  /**
   * 創建記憶（Island-based，包含 islandId）
   */
  private async createMemoryWithIsland(
    userId: string,
    islandId: string,
    distribution: any,
    evaluation: EvaluationResult,
    distributionId: string
  ) {
    try {
      const island = await islandService.getIslandById(islandId, userId)
      if (!island) {
        throw new Error(`Island not found: ${islandId}`)
      }

      // 解析 Sub-Agent 的深度分析結果
      const detailedSummary = evaluation.detailedSummary || distribution.chiefSummary
      const suggestedTitle = evaluation.suggestedTitle || `${island.nameChinese}的記憶`
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
          userId,
          islandId,  // 關聯到島嶼（必填）
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

          distributionId,
          relevanceScore: evaluation.relevanceScore,
        },
      })

      // 更新島嶼統計
      await islandService.incrementIslandStats(islandId, 'memory')

      logger.info(`[${island.nameChinese}] 創建深度分析記憶 (Island-based): ${memory.id}`)
      logger.info(`  - Island ID: ${islandId}`)
      logger.info(`  - 標題: ${suggestedTitle}`)
      logger.info(`  - 重要性: ${importanceScore}/10`)
      logger.info(`  - 情感: ${sentiment}`)
      logger.info(`  - 標籤: ${memory.tags.join(', ')}`)

      // === 異步生成向量嵌入（RAG 支持）===
      vectorService.generateEmbedding(memory.id, userId)
        .then(() => {
          logger.info(`[${island.nameChinese}] 向量嵌入生成成功 (Island-based): ${memory.id}`)
        })
        .catch((error) => {
          logger.error(`[${island.nameChinese}] 向量嵌入生成失敗 (Island-based): ${memory.id}`, error)
        })

      return memory
    } catch (error) {
      logger.error('[Sub-Agent] 創建記憶失敗 (Island-based):', error)
      throw error
    }
  }

  /**
   * 構建評估提示詞（Island-based）
   */
  private buildEvaluationPrompt(
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

    // 構建島嶼描述
    const islandDesc = island.description || island.nameChinese
    const islandPrompt = island.systemPrompt || `你是 ${island.nameChinese} 島嶼的知識管理專家，專注於整理和分析相關知識。`
    const islandKeywords = island.keywords && island.keywords.length > 0
      ? `\n**島嶼關鍵字**: ${island.keywords.join(', ')}\n`
      : ''

    return `${islandPrompt}

你是 ${island.nameChinese}，${islandDesc}${islandKeywords}

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
1. **相關性評估** - 這個知識與本島嶼（${island.nameChinese}）的關聯程度
   ${distribution.links.length > 0 ? '   ⚠️ 如果有連結，請直接存取網址內容進行評估（使用 @url）' : ''}
2. **詳細摘要** - 用 2-3 句話總結核心內容和價值
   ${distribution.links.length > 0 ? '   ⚠️ 對於連結內容，請基於實際存取的內容撰寫摘要' : ''}
3. **關鍵洞察** - 提取 3 個重要的知識點或洞察
   ${distribution.links.length > 0 ? '   ⚠️ 如果是影片/文章，請提取內容中的關鍵要點' : ''}
4. **精準標籤** - 產生 3 個描述性標籤
5. **標題建議** - 為這個記憶創建一個清晰的標題（10字以內）
6. **情感分析** - 判斷內容的情感傾向
7. **重要性評分** - 1-10分，評估這個知識的重要程度
8. **行動建議** - 如果適用，提供後續行動建議

**🌟 特殊要求 - 聊天記錄/社交互動分析格式：**

**⚠️ 重要：請先判斷內容類型！**

如果用戶上傳的內容符合以下任一特徵，則視為「聊天記錄」：
- 包含對話形式（例："A: ...", "B: ...", "replied to", "You sent", "You replied"）
- 有多人之間的互動交流
- 包含社交訊息應用的格式（例：LINE、Discord、WhatsApp、Messenger）
- 內容主要是人際交流和對話

${island.nameChinese.includes('社交') || island.nameChinese.includes('人際') ? `**✨ 你在「${island.nameChinese}」島嶼，所有對話都應該被視為社交成長的素材！**` : `**如果判斷為聊天記錄，請使用以下結構化格式：**`}

**如果是聊天記錄，請務必填寫以下專屬欄位：**

1. **[主題] suggestedTitle** - 對話/事件名稱（例：「與朋友討論購物經驗」、「練習主動打招呼」）
2. **[情境] socialContext** - 一句話簡述對話背景（例：「與朋友閔討論淘寶購物」）
3. **[使用者反應] userReaction** - 描述使用者的情緒或行為（例：「積極分享經驗並詢問建議」）
4. **[AI 回饋] aiFeedback** - 具體的鼓勵或建議（例：「你能主動與朋友交流購物心得，展現出良好的社交互動能力」）
5. **[社交能力標籤] socialSkillTags** - 選擇適用標籤（可多選）：
   #表達情緒 #傾聽 #自我覺察 #主動互動 #同理心 #衝突解決 #建立關係 #維持友誼 #情感表達 #社交好奇 #開放討論 #分享經驗
6. **[進度變化] progressChange** - 評估社交能力變化：
   • +1 = 成長（主動互動、表達情感、解決衝突）
   • 0 = 維持（一般對話、觀察學習）
   • -1 = 退步（迴避、衝突升級、情緒失控）
7. **[建議行動] actionableAdvice** - 下一步具體行動（例：「繼續與朋友保持這種開放的交流態度」）

**JSON 格式（只返回 JSON，不要其他文字）：**

如果是**聊天記錄**，JSON 必須包含：
{
  "relevanceScore": 0.95,
  "shouldStore": true,
  "reasoning": "這是用戶與朋友閔的購物討論對話...",
  "confidence": 0.9,
  "suggestedTags": ["購物", "淘寶", "朋友交流"],
  "keyInsights": [
    "用戶主動分享購物經驗",
    "朋友提供實用建議",
    "展現良好的社交互動"
  ],
  "detailedSummary": "用戶與朋友閔討論淘寶購物經驗...",
  "suggestedTitle": "與閔討論淘寶購物",
  "sentiment": "positive",
  "importanceScore": 7,
  "actionableAdvice": "繼續保持這種開放的交流態度，與朋友分享更多生活經驗",
  "socialContext": "用戶與朋友閔在聊天中討論淘寶和蝦皮的購物經驗",
  "userReaction": "積極參與對話，主動詢問集運事宜，表現出對購物話題的興趣",
  "aiFeedback": "你能主動與朋友交流購物心得並尋求建議，這展現了良好的社交互動能力！",
  "socialSkillTags": ["主動互動", "開放討論", "分享經驗", "維持友誼"],
  "progressChange": 1
}

如果是**一般知識**（非聊天記錄），JSON 格式：
{
  "relevanceScore": 0.85,
  "shouldStore": true,
  "reasoning": "...",
  "confidence": 0.9,
  "suggestedTags": ["標籤1", "標籤2"],
  "keyInsights": ["洞察1", "洞察2", "洞察3"],
  "detailedSummary": "...",
  "suggestedTitle": "XXX學習筆記",
  "sentiment": "neutral",
  "importanceScore": 8,
  "actionableAdvice": "建議用戶可以..."
}

**評估準則：**
- **高度相關 (>0.7)**: 核心內容完全匹配 ${island.nameChinese} 島嶼主題，具有長期價值
- **中度相關 (0.4-0.7)**: 部分內容與島嶼主題相關，有參考價值
- **低相關 (<0.4)**: 與島嶼主題關聯較弱，不建議存儲

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
   * 降級方案：基於關鍵字的簡單評估（Island-based）
   */
  private async fallbackEvaluation(
    islandId: string,
    distribution: DistributionInput,
    userId: string
  ): Promise<EvaluationResult> {
    try {
      const island = await islandService.getIslandById(islandId, userId)
      if (!island) {
        throw new Error(`Island not found: ${islandId}`)
      }

      // 簡單的關鍵字匹配
      const content = distribution.rawContent.toLowerCase()
      const topics = distribution.identifiedTopics.map(t => t.toLowerCase())

      // 使用島嶼的關鍵字（如果有配置）
      const keywords: string[] = island.keywords || []
      const matchCount = keywords.filter((kw: string) =>
        content.includes(kw.toLowerCase()) || topics.some(t => t.includes(kw.toLowerCase()))
      ).length

      // 如果沒有關鍵字，預設相關性為 0.5
      const relevanceScore = keywords.length > 0
        ? Math.min(matchCount / keywords.length, 1)
        : 0.5

      // ⚠️ 移除相關性門檻 - 所有內容都儲存
      const shouldStore = true

      logger.info(`[Fallback Evaluation] ✅ 降級評估：所有對話都記錄 - 相關性 (${relevanceScore.toFixed(2)}) → 儲存`)

      return {
        relevanceScore,
        shouldStore,
        reasoning: `基於降級評估，此內容歸類到 ${island.nameChinese}`,
        confidence: 0.3,
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
   * 處理知識分發（使用 Island-based SubAgent）
   *
   * ✨ 兩階段智能評估策略（節省 API 調用）
   *
   * 階段 1: 評估白噗噗推薦的主要島嶼（如果有）
   *   - 相關性 >= 0.7 → 直接使用（早期退出）✅
   *   - 相關性 < 0.7 → 進入階段 2
   *
   * 階段 2: 評估其他島嶼
   *   - 比較所有島嶼，選擇相關性最高的
   *   - 確保不會都丟給同一個島
   *
   * 性能：90% 情況只需 1 次 API 調用
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

      logger.info(`[Island Sub-Agents] 開始處理分發記錄 ${distributionId}`)

      const agentDecisions: any[] = []
      const memoriesCreated: any[] = []

      // ✨ 新策略：完全信任 Chief Agent 的推薦
      // Chief Agent 現在保證會推薦一個島嶼，我們直接使用它的推薦

      const primaryIslandName = distribution.identifiedTopics[0]

      if (!primaryIslandName) {
        throw new Error('Chief Agent 未推薦島嶼，這不應該發生')
      }

      // 通過島嶼名稱找到對應的島嶼 ID
      let primaryIslandId: string | null = null
      for (const islandId of islandIds) {
        const island = await dynamicSubAgentService.getIslandById(islandId)
        if (island && island.nameChinese === primaryIslandName) {
          primaryIslandId = islandId
          break
        }
      }

      if (!primaryIslandId) {
        throw new Error(`找不到白噗噗推薦的島嶼: ${primaryIslandName}`)
      }

      logger.info(`[Island Sub-Agents] 📊 使用白噗噗推薦的島嶼: ${primaryIslandName}`)

      const primaryIsland = await dynamicSubAgentService.getIslandById(primaryIslandId)
      if (!primaryIsland) {
        throw new Error(`主要島嶼未找到: ${primaryIslandId}`)
      }

      // 進行深度分析（提取 insights、生成標籤等）- 完全使用 Island
      const evaluation = await this.evaluateKnowledge(
        primaryIslandId,
        distribution,
        userId
      )

      // 創建決策記錄（Island-based architecture）
      const decision = await prisma.agentDecision.create({
        data: {
          distributionId,
          targetIslandId: primaryIslandId, // Island-based architecture
          relevanceScore: evaluation.relevanceScore,
          shouldStore: evaluation.shouldStore,
          reasoning: evaluation.reasoning,
          confidence: evaluation.confidence,
          suggestedTags: evaluation.suggestedTags,
          keyInsights: evaluation.keyInsights,
        },
      })
      agentDecisions.push(decision)

      logger.info(`[Island Sub-Agents] 深度分析完成`)
      logger.info(`[Island Sub-Agents]    - 相關性: ${evaluation.relevanceScore.toFixed(2)}`)
      logger.info(`[Island Sub-Agents]    - 置信度: ${evaluation.confidence.toFixed(2)}`)

      // 創建記憶
      const memory = await this.createMemoryWithIsland(
        userId,
        primaryIslandId,
        distribution,
        evaluation,
        distributionId
      )
      memoriesCreated.push(memory)

      // 更新統計
      await dynamicSubAgentService.incrementStats(primaryIslandId, 'memory')
      await prisma.knowledgeDistribution.update({
        where: { id: distributionId },
        data: { storedBy: [primaryIslandId] }, // 使用 islandId 而非 assistantId
      })

      logger.info(`[Island Sub-Agents] 🎯 完成 - 總 AI 調用次數: 2 (Chief + SubAgent)`)

      logger.info(`[Island Sub-Agents] 📊 返回結果: 決策 ${agentDecisions.length}, 記憶 ${memoriesCreated.length}`)

      // 獲取記憶的分類信息（Island 名稱）
      const categoriesInfo = await Promise.all(
        memoriesCreated.map(async (memory) => {
          const island = await prisma.island.findUnique({
            where: { id: memory.islandId }
          })
          return {
            memoryId: memory.id,
            categoryName: island?.nameChinese || '未知分類',
            categoryEmoji: island?.emoji || '🏝️',
            islandName: island?.nameChinese
          }
        })
      )

      return {
        agentDecisions,
        memoriesCreated,
        storedByCount: memoriesCreated.length,
        categoriesInfo, // 新增：記憶的分類信息
      }
    } catch (error) {
      logger.error('[Island Sub-Agents] 處理知識分發失敗:', error)
      throw new Error('處理知識分發失敗')
    }
  }
}

export const subAgentService = new SubAgentService()
