/**
 * Sub-Agent Service
 *
 * 职责：
 * 1. 接收 Chief Agent 分发的知识
 * 2. 评估知识与自身专业领域的相关性
 * 3. 自主决定是否存储到数据库
 * 4. 创建 AgentDecision 记录
 * 5. 如果决定存储，创建 Memory 记录
 */

import { PrismaClient, AssistantType, ContentType } from '@prisma/client'
import { logger } from '../utils/logger'
import axios from 'axios'
import { assistantService } from './assistantService'

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

  constructor() {
    this.mcpUrl = process.env.MCP_SERVICE_URL || 'http://localhost:8765'
  }

  /**
   * 评估知识相关性
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

      logger.info(`[${assistant.name}] 开始评估知识相关性`)

      // 构建评估提示词
      const prompt = this.buildEvaluationPrompt(assistant, distributionInput)

      // 调用 MCP 服务进行评估
      const response = await this.callMCP(prompt, assistantId)
      const parsed = this.parseJSON(response)

      // === Stage 5: 优化存储决策逻辑 ===
      const relevanceScore = typeof parsed.relevanceScore === 'number'
        ? Math.max(0, Math.min(1, parsed.relevanceScore))
        : 0.5

      const confidence = typeof parsed.confidence === 'number'
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.5

      // 智能存储决策：综合考虑相关性和置信度
      const shouldStore = this.shouldStoreKnowledge(
        relevanceScore,
        confidence,
        parsed.shouldStore
      )

      const evaluation: EvaluationResult = {
        relevanceScore,
        shouldStore,
        reasoning: parsed.reasoning || '无评估说明',
        confidence,
        suggestedCategory: this.isValidAssistantType(parsed.suggestedCategory)
          ? parsed.suggestedCategory
          : assistant.type,
        suggestedTags: Array.isArray(parsed.suggestedTags) ? parsed.suggestedTags : [],
        keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights : [],
      }

      logger.info(`[${assistant.name}] 评估完成 - 相关性: ${evaluation.relevanceScore.toFixed(2)}, 是否存储: ${evaluation.shouldStore}`)

      return evaluation
    } catch (error) {
      logger.error(`[Sub-Agent] 评估失败:`, error)

      // 降级方案：使用关键词匹配的简单评估
      return this.fallbackEvaluation(assistantId, distributionInput)
    }
  }

  /**
   * 处理知识分发
   */
  async processDistribution(
    userId: string,
    distributionId: string,
    assistantIds: string[]
  ) {
    try {
      // 获取分发记录
      const distribution = await prisma.knowledgeDistribution.findUnique({
        where: { id: distributionId },
      })

      if (!distribution) {
        throw new Error(`Distribution not found: ${distributionId}`)
      }

      logger.info(`[Sub-Agents] 开始处理分发记录 ${distributionId}，相关助手数量: ${assistantIds.length}`)

      const agentDecisions: any[] = []
      const memoriesCreated: any[] = []

      // 并发评估所有相关助手
      const evaluations = await Promise.all(
        assistantIds.map(async (assistantId) => {
          try {
            // 评估相关性
            const evaluation = await this.evaluateKnowledge(assistantId, distribution)

            // 创建决策记录
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

            // 如果决定存储，创建记忆
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
            logger.error(`[Sub-Agent] 处理助手 ${assistantId} 失败:`, error)
            return null
          }
        })
      )

      // 更新分发记录的 storedBy 列表
      const storedByIds = evaluations
        .filter(e => e && e.memory)
        .map(e => e!.assistantId)

      await prisma.knowledgeDistribution.update({
        where: { id: distributionId },
        data: { storedBy: storedByIds },
      })

      logger.info(`[Sub-Agents] 分发处理完成 - 决策数: ${agentDecisions.length}, 创建记忆数: ${memoriesCreated.length}`)

      return {
        agentDecisions,
        memoriesCreated,
        storedByCount: storedByIds.length,
      }
    } catch (error) {
      logger.error('[Sub-Agents] 处理知识分发失败:', error)
      throw new Error('处理知识分发失败')
    }
  }

  /**
   * 创建记忆
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

      const memory = await prisma.memory.create({
        data: {
          userId,
          assistantId,
          rawContent: distribution.rawContent,
          summary: distribution.chiefSummary,
          contentType: distribution.contentType,
          fileUrls: distribution.fileUrls,
          fileNames: distribution.fileNames,
          fileTypes: distribution.fileTypes,
          links: distribution.links,
          linkTitles: distribution.linkTitles,
          keyPoints: evaluation.keyInsights,
          aiSentiment: 'neutral',
          aiImportance: Math.round(evaluation.relevanceScore * 10),
          aiAnalysis: distribution.chiefAnalysis,
          category: evaluation.suggestedCategory || assistant.type,
          tags: [...distribution.suggestedTags, ...evaluation.suggestedTags],
          distributionId,
          relevanceScore: evaluation.relevanceScore,
        },
      })

      // 更新助手统计
      await assistantService.incrementAssistantStats(assistantId, 'memory')

      logger.info(`[${assistant.name}] 创建记忆: ${memory.id}`)

      return memory
    } catch (error) {
      logger.error('[Sub-Agent] 创建记忆失败:', error)
      throw error
    }
  }

  /**
   * 构建评估提示词
   */
  private buildEvaluationPrompt(
    assistant: any,
    distribution: DistributionInput
  ): string {
    return `${assistant.systemPrompt}

你作为 ${assistant.nameChinese} (${assistant.name})，是一个 ${assistant.type} 领域的专家。

现在有一个新的知识内容需要你评估是否与你的专业领域相关，以及是否应该存储到你的知识库中。

**知识内容:**
${distribution.rawContent}

${distribution.fileUrls.length > 0 ? `\n**附加文件 (${distribution.fileUrls.length}个):**\n${distribution.fileNames.map((name, i) => `- ${name} (${distribution.fileTypes[i]})`).join('\n')}` : ''}

${distribution.links.length > 0 ? `\n**相关链接 (${distribution.links.length}个):**\n${distribution.linkTitles.map((title, i) => `- ${title || distribution.links[i]}`).join('\n')}` : ''}

**总管的分析:**
${distribution.chiefAnalysis}

**总管的摘要:**
${distribution.chiefSummary}

**识别的主题:**
${distribution.identifiedTopics.join(', ')}

**建议的标签:**
${distribution.suggestedTags.join(', ')}

请以 JSON 格式返回你的评估（只返回 JSON）：
{
  "relevanceScore": 0.0-1.0,  // 与你的领域的相关度
  "shouldStore": true/false,   // 是否建议存储
  "reasoning": "详细说明你的评估理由和这个知识为什么重要",
  "confidence": 0.0-1.0,       // 你对决策的置信度
  "suggestedCategory": "${assistant.type}",  // 建议分类
  "suggestedTags": ["标签1", "标签2"],  // 你建议添加的标签
  "keyInsights": ["洞察1", "洞察2"]     // 你提取的关键洞察
}

评估标准：
- relevanceScore > 0.7: 高度相关，强烈建议存储
- relevanceScore 0.4-0.7: 中度相关，可根据其他因素决定
- relevanceScore < 0.4: 低相关性，不建议存储
`
  }

  /**
   * 降级方案：基于关键词的简单评估
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

      // 简单的关键词匹配
      const content = distribution.rawContent.toLowerCase()
      const topics = distribution.identifiedTopics.map(t => t.toLowerCase())

      // 基于关键词的相关性评分
      const typeKeywords: Record<AssistantType, string[]> = {
        [AssistantType.CHIEF]: [],
        [AssistantType.LEARNING]: ['学习', '教育', '知识', '课程', '培训', '技能'],
        [AssistantType.INSPIRATION]: ['灵感', '创意', '想法', '创新', '点子'],
        [AssistantType.WORK]: ['工作', '事业', '项目', '任务', '职业'],
        [AssistantType.SOCIAL]: ['社交', '朋友', '关系', '交流'],
        [AssistantType.LIFE]: ['生活', '日常', '健康', '生命'],
        [AssistantType.GOALS]: ['目标', '计划', '愿望', '梦想', '规划'],
        [AssistantType.RESOURCES]: ['资源', '工具', '链接', '材料', '资料'],
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
          ? `基于关键词匹配，此内容与 ${assistant.nameChinese} 的领域相关`
          : `基于关键词匹配，此内容与 ${assistant.nameChinese} 的领域相关性较低`,
        confidence: 0.3,
        suggestedCategory: assistant.type,
        suggestedTags: distribution.suggestedTags.slice(0, 3),
        keyInsights: [`关键词匹配数: ${matchCount}`],
      }
    } catch (error) {
      logger.error('[Sub-Agent] 降级评估失败:', error)
      return {
        relevanceScore: 0.1,
        shouldStore: false,
        reasoning: '无法评估知识相关性',
        confidence: 0.1,
        suggestedTags: [],
        keyInsights: [],
      }
    }
  }

  /**
   * 调用 MCP 服务
   */
  private async callMCP(prompt: string, assistantId: string): Promise<string> {
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
      throw new Error('AI 服务调用失败')
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
      logger.warn('JSON parse failed, using fallback')
      return {
        relevanceScore: 0.5,
        shouldStore: false,
        reasoning: '无法解析响应',
        confidence: 0.1,
        suggestedTags: [],
        keyInsights: [],
      }
    }
  }

  /**
   * 验证 AssistantType 是否有效
   */
  private isValidAssistantType(type: any): type is AssistantType {
    return Object.values(AssistantType).includes(type)
  }

  /**
   * Stage 5: 智能存储决策
   *
   * 综合考虑多个因素决定是否存储知识：
   * 1. 相关性评分 (relevanceScore)
   * 2. 置信度 (confidence)
   * 3. AI 的建议 (shouldStore)
   *
   * 决策规则：
   * - 高相关性 (>0.7) + 高置信度 (>0.7) → 一定存储
   * - 中相关性 (0.4-0.7) → 参考 AI 建议
   * - 低相关性 (<0.4) → 一定不存储
   * - 低置信度 (<0.5) → 更保守，需要更高的相关性
   */
  private shouldStoreKnowledge(
    relevanceScore: number,
    confidence: number,
    aiSuggestion: boolean
  ): boolean {
    // 规则 1: 高相关性且高置信度 → 强制存储
    if (relevanceScore >= 0.7 && confidence >= 0.7) {
      logger.info(`[Storage Decision] 高相关性 (${relevanceScore.toFixed(2)}) + 高置信度 (${confidence.toFixed(2)}) → 存储`)
      return true
    }

    // 规则 2: 低相关性 → 强制不存储
    if (relevanceScore < 0.4) {
      logger.info(`[Storage Decision] 低相关性 (${relevanceScore.toFixed(2)}) → 不存储`)
      return false
    }

    // 规则 3: 中等相关性 → 综合判断
    if (relevanceScore >= 0.4 && relevanceScore < 0.7) {
      // 如果置信度也是中等或更高，参考 AI 建议
      if (confidence >= 0.5) {
        logger.info(`[Storage Decision] 中相关性 (${relevanceScore.toFixed(2)}) + 中置信度 (${confidence.toFixed(2)}) → 参考 AI: ${aiSuggestion}`)
        return aiSuggestion
      }

      // 如果置信度低，需要更高的相关性才存储
      const threshold = 0.6 // 提高阈值
      const shouldStore = relevanceScore >= threshold
      logger.info(`[Storage Decision] 中相关性 (${relevanceScore.toFixed(2)}) + 低置信度 (${confidence.toFixed(2)}) → ${shouldStore ? '存储' : '不存储'}`)
      return shouldStore
    }

    // 规则 4: 相关性在阈值边界 → 综合评分
    // 计算综合评分：相关性权重 0.7，置信度权重 0.3
    const compositeScore = relevanceScore * 0.7 + confidence * 0.3
    const shouldStore = compositeScore >= 0.6

    logger.info(`[Storage Decision] 综合评分 (${compositeScore.toFixed(2)}) = 相关性×0.7 + 置信度×0.3 → ${shouldStore ? '存储' : '不存储'}`)

    return shouldStore
  }
}

export const subAgentService = new SubAgentService()
