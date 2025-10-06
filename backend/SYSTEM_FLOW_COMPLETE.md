# 🎯 Multi-Agent 知识助手系统 - 完整流程说明

**最后更新**: 2025-10-06
**系统版本**: v1.0 (Stages 1-5 完成)

---

## 📋 目录

1. [系统概览](#系统概览)
2. [完整流程图](#完整流程图)
3. [详细流程步骤](#详细流程步骤)
4. [实际示例](#实际示例)
5. [技术架构](#技术架构)
6. [决策规则](#决策规则)

---

## 系统概览

### 🎪 你现在有什么？

一个**智能的多 Agent 知识管理系统**，包含：

- **1 个 Chief Agent (总管)** - 负责分析和分发知识
- **7 个 Sub-agents (专业助手)** - 各自负责不同领域
  - 📚 Scholar (学识博士) - 学习知识
  - 💡 Muse (灵感女神) - 创意灵感
  - 💼 Manager (效率管家) - 工作事务
  - 👥 Companion (人际知音) - 社交关系
  - 🌱 Diary (生活记录员) - 日常生活
  - 🎯 Dreamer (梦想规划师) - 目标规划
  - 🔖 Librarian (资源管理员) - 资源收藏

### 💬 当你跟 Chief 传讯息或上传文件时会发生什么？

系统会自动：
1. 深度分析你的内容（包括文本、图片、PDF、链接）
2. 决定哪些助手应该看到这个信息
3. 让每个相关助手独立评估是否要记住
4. 只有助手觉得重要的才会存入它的记忆库

**关键特点**:
- ✅ 完全自动化
- ✅ 智能分类
- ✅ 每个助手独立决策
- ✅ 支持多模态内容（文本、图片、PDF、链接）

---

## 完整流程图

```
┌─────────────────────────────────────────────────────────────────┐
│  用户动作：发送消息 / 上传文件给 Chief Agent                   │
│  内容类型：文本 + 图片 + PDF + 链接                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  第一步：Chief Agent 接收并记录                                │
│  - GraphQL Mutation: uploadKnowledge                            │
│  - 参数: { content, files[], links[] }                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  第二步：多模态深度分析 (Stage 4)                              │
│  ┌──────────────────────────────────────────────────────┐      │
│  │  并发处理所有附件：                                  │      │
│  │  ├─ 图片 → Gemini Vision API 分析                    │      │
│  │  │   输出: 描述、标签、关键洞察                      │      │
│  │  ├─ PDF → 文本提取 + Gemini 分析                     │      │
│  │  │   输出: 摘要、关键要点、主题                      │      │
│  │  └─ 链接 → 网页抓取 + Gemini 分析                    │      │
│  │      输出: 标题、摘要、内容、标签                    │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                 │
│  处理时间: 图片 2-3秒, PDF 5-10秒, 链接 3-5秒                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  第三步：Chief Agent 综合分析 (Stage 3)                        │
│  ┌──────────────────────────────────────────────────────┐      │
│  │  整合所有分析结果：                                  │      │
│  │  - 用户输入的文本                                    │      │
│  │  - 所有图片的分析结果                                │      │
│  │  - 所有 PDF 的分析结果                               │      │
│  │  - 所有链接的分析结果                                │      │
│  │                                                      │      │
│  │  使用 Gemini (通过 MCP) 进行最终分析：               │      │
│  │  ├─ 识别主题 (identifiedTopics)                     │      │
│  │  ├─ 建议标签 (suggestedTags)                        │      │
│  │  ├─ 生成摘要 (summary)                              │      │
│  │  ├─ 深度分析 (analysis)                             │      │
│  │  └─ 推荐相关助手 (relevantAssistants: 1-3 个)       │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                 │
│  示例输出:                                                      │
│  {                                                              │
│    "analysis": "这是一份关于React性能优化的技术文章...",       │
│    "summary": "React Hooks 性能优化技巧",                       │
│    "identifiedTopics": ["前端开发", "React", "性能优化"],      │
│    "suggestedTags": ["JavaScript", "React", "优化"],           │
│    "relevantAssistants": ["LEARNING", "WORK"]                  │
│  }                                                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  第四步：创建知识分发记录                                      │
│  - 数据库: KnowledgeDistribution 表                            │
│  - 存储所有原始内容和分析结果                                  │
│  - 记录分发目标: distributedTo = ["学识博士", "效率管家"]      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  第五步：并发分发给相关 Sub-agents (Stage 3)                   │
│                                                                 │
│  例如分发给 2 个助手：Scholar (学识博士) 和 Manager (效率管家) │
│                                                                 │
│  ┌──────────────────┐              ┌──────────────────┐        │
│  │  Scholar         │              │  Manager         │        │
│  │  (学识博士)      │              │  (效率管家)      │        │
│  │                  │              │                  │        │
│  │  ┌────────────┐  │              │  ┌────────────┐  │        │
│  │  │ 1. 接收知识│  │              │  │ 1. 接收知识│  │        │
│  │  └──────┬─────┘  │              │  └──────┬─────┘  │        │
│  │         │        │              │         │        │        │
│  │         ↓        │              │         ↓        │        │
│  │  ┌────────────┐  │              │  ┌────────────┐  │        │
│  │  │ 2. AI评估  │  │              │  │ 2. AI评估  │  │        │
│  │  │  相关性    │  │              │  │  相关性    │  │        │
│  │  └──────┬─────┘  │              │  └──────┬─────┘  │        │
│  │         │        │              │         │        │        │
│  │         ↓        │              │         ↓        │        │
│  │  ┌────────────┐  │              │  ┌────────────┐  │        │
│  │  │ 3. 智能决策│  │              │  │ 3. 智能决策│  │        │
│  │  │ (Stage 5)  │  │              │  │ (Stage 5)  │  │        │
│  │  └──────┬─────┘  │              │  └──────┬─────┘  │        │
│  │         │        │              │         │        │        │
│  │         ↓        │              │         ↓        │        │
│  │  Score: 0.85     │              │  Score: 0.45     │        │
│  │  Confidence: 0.9 │              │  Confidence: 0.6 │        │
│  │  → 存储 ✓        │              │  → 不存储 ✗      │        │
│  └──────────────────┘              └──────────────────┘        │
│                                                                 │
│  处理时间: 每个助手 2-3 秒 (并发执行)                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  第六步：创建 AgentDecision 记录                               │
│  - 每个助手的决策都会被记录                                    │
│  - 包含: 相关性评分、是否存储、推理过程、置信度                │
│                                                                 │
│  示例 (Scholar 的决策):                                         │
│  {                                                              │
│    "assistantId": "学识博士",                                   │
│    "relevanceScore": 0.85,  // 高度相关                        │
│    "shouldStore": true,     // 决定存储                        │
│    "reasoning": "这份 React 优化文章包含重要的学习知识...",     │
│    "confidence": 0.9,       // 高置信度                        │
│    "keyInsights": ["Hooks优化", "useMemo使用", "性能监控"]     │
│  }                                                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  第七步：存储到助手的记忆库 (如果决定存储)                     │
│  - 只有 shouldStore = true 的才会创建 Memory 记录              │
│  - Memory 包含完整内容、分析结果、标签等                       │
│  - 关联到原始的知识分发记录                                    │
│                                                                 │
│  Scholar (学识博士) 的记忆:                                     │
│  {                                                              │
│    "rawContent": "原始文本内容",                                │
│    "summary": "React Hooks 性能优化技巧",                       │
│    "fileUrls": ["image1.png", "doc.pdf"],                      │
│    "links": ["https://..."],                                   │
│    "keyPoints": ["Hooks优化", "useMemo使用", "性能监控"],      │
│    "tags": ["JavaScript", "React", "优化", "学习"],            │
│    "category": "LEARNING",                                     │
│    "aiImportance": 9,  // 1-10 分                              │
│    "relevanceScore": 0.85                                      │
│  }                                                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  第八步：更新知识分发记录的 storedBy                           │
│  - 记录哪些助手选择了存储                                      │
│  - storedBy = ["学识博士"]                                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  完成！返回结果给用户                                          │
│                                                                 │
│  {                                                              │
│    "distribution": { ... },        // 知识分发记录             │
│    "agentDecisions": [             // 所有助手的决策           │
│      { assistant: "学识博士", shouldStore: true, score: 0.85 }, │
│      { assistant: "效率管家", shouldStore: false, score: 0.45 } │
│    ],                                                           │
│    "memoriesCreated": 1,           // 创建了 1 条记忆           │
│    "processingTime": 8547          // 总耗时 8.5 秒            │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 详细流程步骤

### 步骤 1: 用户上传知识

**GraphQL Mutation**:
```graphql
mutation {
  uploadKnowledge(input: {
    content: "我刚学了 React Hooks 的性能优化..."
    files: [
      { url: "https://...", name: "diagram.png", type: "image/png" }
    ]
    links: [
      { url: "https://reactjs.org/...", title: "Official Guide" }
    ]
  }) {
    distribution { id }
    agentDecisions { assistantId shouldStore relevanceScore }
    memoriesCreated { id }
  }
}
```

---

### 步骤 2: 多模态深度分析 (Stage 4)

**处理内容**:

#### 2.1 图片分析
```javascript
// 使用 Gemini Vision API
const imageAnalysis = await multimodalProcessor.processImage(
  "https://.../diagram.png",
  "React 性能优化学习"
)

// 返回
{
  description: "这是一张展示 React Hooks 优化技巧的流程图",
  tags: ["React", "Hooks", "性能"],
  keyInsights: ["useMemo 避免重复计算", "useCallback 稳定引用"],
  confidence: 0.92
}
```

#### 2.2 PDF 分析
```javascript
// 提取文本 + Gemini 分析
const pdfAnalysis = await multimodalProcessor.processPDF(
  "https://.../guide.pdf"
)

// 返回
{
  summary: "详细介绍了 React 性能优化的最佳实践",
  keyPoints: ["避免不必要的渲染", "使用 React.memo", "虚拟化长列表"],
  topics: ["前端优化", "React"],
  wordCount: 5230,
  language: "zh"
}
```

#### 2.3 链接分析
```javascript
// 抓取网页 + Gemini 分析
const linkAnalysis = await multimodalProcessor.processLink(
  "https://reactjs.org/docs/hooks-faq.html"
)

// 返回
{
  title: "Hooks FAQ – React",
  summary: "React 官方的 Hooks 常见问题解答",
  tags: ["React", "Hooks", "文档"],
  readingTime: 12  // 分钟
}
```

---

### 步骤 3: Chief Agent 综合分析 (Stage 3)

**整合所有信息**:
```javascript
const finalAnalysis = await chiefAgent.analyzeKnowledge(userId, {
  content: "我刚学了 React Hooks 的性能优化...",
  imageAnalyses: [...],  // 图片分析结果
  pdfAnalyses: [...],    // PDF 分析结果
  linkAnalyses: [...]    // 链接分析结果
})

// Chief Agent 使用所有信息生成最终分析
{
  analysis: "这是一次完整的 React Hooks 性能优化学习，包含理论知识、实践案例和官方文档参考。内容涵盖了 useMemo、useCallback 等核心优化技巧。",
  summary: "React Hooks 性能优化完整学习",
  identifiedTopics: ["前端开发", "React", "性能优化", "Hooks"],
  suggestedTags: ["JavaScript", "React", "优化", "学习笔记"],
  relevantAssistants: ["LEARNING", "WORK"],  // 推荐给学识博士和效率管家
  confidence: 0.95
}
```

---

### 步骤 4: 创建知识分发记录

**数据库操作**:
```javascript
const distribution = await prisma.knowledgeDistribution.create({
  data: {
    userId: "user-123",
    rawContent: "我刚学了 React Hooks 的性能优化...",
    contentType: "MIXED",  // 文本 + 图片 + 链接
    fileUrls: ["https://.../diagram.png"],
    fileNames: ["diagram.png"],
    fileTypes: ["image/png"],
    links: ["https://reactjs.org/..."],
    linkTitles: ["Official Guide"],
    chiefAnalysis: "这是一次完整的 React Hooks 性能优化学习...",
    chiefSummary: "React Hooks 性能优化完整学习",
    identifiedTopics: ["前端开发", "React", "性能优化", "Hooks"],
    suggestedTags: ["JavaScript", "React", "优化", "学习笔记"],
    distributedTo: ["学识博士-id", "效率管家-id"],
    processingTime: 3250  // 毫秒
  }
})
```

---

### 步骤 5: 并发分发给 Sub-agents (Stage 3)

**每个助手独立评估**:

#### Scholar (学识博士) 的评估
```javascript
// Sub-agent 收到知识和 Chief 的分析
const evaluation = await subAgent.evaluateKnowledge("学识博士-id", {
  rawContent: "我刚学了 React Hooks 的性能优化...",
  chiefAnalysis: "这是一次完整的 React Hooks 性能优化学习...",
  chiefSummary: "React Hooks 性能优化完整学习",
  identifiedTopics: ["前端开发", "React", "性能优化", "Hooks"],
  suggestedTags: ["JavaScript", "React", "优化", "学习笔记"]
})

// 学识博士的评估 (使用 MCP/Gemini)
{
  relevanceScore: 0.85,  // 高度相关 (>0.7)
  confidence: 0.90,      // 高置信度
  shouldStore: true,     // AI 建议存储
  reasoning: "这份学习笔记包含了详细的 React 性能优化知识，包括理论、实践和官方文档，非常适合存入我的学习知识库。",
  suggestedCategory: "LEARNING",
  suggestedTags: ["React Hooks", "性能优化", "前端学习"],
  keyInsights: [
    "useMemo 可以避免重复计算",
    "useCallback 保持引用稳定性",
    "React.memo 减少不必要渲染"
  ]
}
```

#### Manager (效率管家) 的评估
```javascript
// 效率管家的评估
{
  relevanceScore: 0.45,  // 中低相关 (0.4-0.7)
  confidence: 0.60,
  shouldStore: false,    // AI 建议不存储
  reasoning: "虽然这是技术学习内容，但与我负责的工作任务管理关联度不高，更适合学识博士保存。",
  suggestedCategory: "LEARNING",
  suggestedTags: ["技术学习"],
  keyInsights: []
}
```

---

### 步骤 6: 智能存储决策 (Stage 5)

**决策规则应用**:

#### Scholar (学识博士)
```javascript
// 输入
relevanceScore = 0.85  // 高相关性
confidence = 0.90      // 高置信度
aiSuggestion = true

// Stage 5 决策逻辑
if (relevanceScore >= 0.7 && confidence >= 0.7) {
  return true  // 规则1: 高相关性 + 高置信度 → 强制存储
}

// 结果: ✓ 存储到学识博士的记忆库
```

#### Manager (效率管家)
```javascript
// 输入
relevanceScore = 0.45  // 中低相关性
confidence = 0.60      // 中等置信度
aiSuggestion = false

// Stage 5 决策逻辑
if (relevanceScore >= 0.4 && relevanceScore < 0.7) {
  if (confidence >= 0.5) {
    return aiSuggestion  // 规则3: 参考 AI 建议
  }
}

// 结果: ✗ 不存储
```

---

### 步骤 7: 创建 AgentDecision 记录

**记录所有决策**:
```javascript
// Scholar 的决策记录
await prisma.agentDecision.create({
  data: {
    distributionId: "dist-123",
    assistantId: "学识博士-id",
    relevanceScore: 0.85,
    shouldStore: true,
    reasoning: "这份学习笔记包含了详细的 React 性能优化知识...",
    confidence: 0.90,
    suggestedCategory: "LEARNING",
    suggestedTags: ["React Hooks", "性能优化", "前端学习"],
    keyInsights: ["useMemo 可以避免重复计算", ...]
  }
})

// Manager 的决策记录
await prisma.agentDecision.create({
  data: {
    distributionId: "dist-123",
    assistantId: "效率管家-id",
    relevanceScore: 0.45,
    shouldStore: false,
    reasoning: "虽然这是技术学习内容，但与我负责的工作任务管理关联度不高...",
    confidence: 0.60,
    ...
  }
})
```

---

### 步骤 8: 创建 Memory 记录 (如果 shouldStore = true)

**只有学识博士存储**:
```javascript
const memory = await prisma.memory.create({
  data: {
    userId: "user-123",
    assistantId: "学识博士-id",
    rawContent: "我刚学了 React Hooks 的性能优化...",
    summary: "React Hooks 性能优化完整学习",
    contentType: "MIXED",
    fileUrls: ["https://.../diagram.png"],
    fileNames: ["diagram.png"],
    fileTypes: ["image/png"],
    links: ["https://reactjs.org/..."],
    linkTitles: ["Official Guide"],
    keyPoints: [
      "useMemo 可以避免重复计算",
      "useCallback 保持引用稳定性",
      "React.memo 减少不必要渲染"
    ],
    aiSentiment: "neutral",
    aiImportance: 9,  // 基于 relevanceScore 0.85 → 9/10
    aiAnalysis: "这是一次完整的 React Hooks 性能优化学习...",
    category: "LEARNING",
    tags: ["JavaScript", "React", "优化", "学习笔记", "React Hooks", "性能优化"],
    distributionId: "dist-123",
    relevanceScore: 0.85
  }
})

// 更新学识博士的统计
await updateStats("学识博士-id", { memoriesCount: +1 })
```

---

### 步骤 9: 更新 storedBy 并返回结果

**更新分发记录**:
```javascript
await prisma.knowledgeDistribution.update({
  where: { id: "dist-123" },
  data: {
    storedBy: ["学识博士-id"]  // 只有学识博士选择了存储
  }
})
```

**返回给用户**:
```json
{
  "distribution": {
    "id": "dist-123",
    "chiefSummary": "React Hooks 性能优化完整学习",
    "distributedTo": ["学识博士", "效率管家"],
    "storedBy": ["学识博士"]
  },
  "agentDecisions": [
    {
      "assistant": "学识博士",
      "relevanceScore": 0.85,
      "shouldStore": true,
      "reasoning": "这份学习笔记包含了详细的 React 性能优化知识..."
    },
    {
      "assistant": "效率管家",
      "relevanceScore": 0.45,
      "shouldStore": false,
      "reasoning": "虽然这是技术学习内容，但与我负责的工作任务管理关联度不高..."
    }
  ],
  "memoriesCreated": [
    {
      "id": "mem-456",
      "assistant": "学识博士",
      "summary": "React Hooks 性能优化完整学习"
    }
  ],
  "processingTime": 8547  // 总耗时 8.5 秒
}
```

---

## 实际示例

### 示例 1: 上传学习笔记

**用户操作**:
```
内容: "今天学习了 TypeScript 的高级类型，包括泛型、联合类型、交叉类型..."
附件: 无
链接: https://www.typescriptlang.org/docs/handbook/advanced-types.html
```

**系统处理**:
1. Chief分析: "TypeScript 学习笔记" → 推荐给 Scholar (学识博士)
2. Scholar评估: 相关性 0.92, 置信度 0.95 → **存储** ✓
3. 其他助手: 不相关 → 不存储

**结果**: 学识博士的记忆库 +1

---

### 示例 2: 分享工作成果

**用户操作**:
```
内容: "完成了季度报告PPT，包含数据分析和未来规划..."
附件: report.pdf (15页)
```

**系统处理**:
1. PDF分析: 提取文本 → "季度业绩报告，包含数据分析..."
2. Chief分析: "工作成果" → 推荐给 Manager (效率管家)、Dreamer (梦想规划师)
3. Manager评估: 相关性 0.88 → **存储** ✓
4. Dreamer评估: 相关性 0.65, 包含未来规划 → **存储** ✓

**结果**: 效率管家和梦想规划师的记忆库各 +1

---

### 示例 3: 随手记录灵感

**用户操作**:
```
内容: "突然想到一个App创意：结合AI的个人知识管理系统..."
附件: sketch.png (界面草图)
```

**系统处理**:
1. 图片分析: "UI界面草图，包含导航、卡片布局..."
2. Chief分析: "创意灵感 + 产品设计" → 推荐给 Muse (灵感女神)、Manager (效率管家)
3. Muse评估: 相关性 0.95 → **存储** ✓
4. Manager评估: 相关性 0.42 → 不存储

**结果**: 灵感女神的记忆库 +1

---

### 示例 4: 闲聊日常

**用户操作**:
```
内容: "今天天气真好，吃了好吃的午餐"
附件: 无
```

**系统处理**:
1. Chief分析: "日常生活记录" → 推荐给 Diary (生活记录员)
2. Diary评估: 相关性 0.38 → 不存储 (太简单的日常)

**结果**: 无记忆创建（内容不够重要）

---

## 技术架构

### 数据库模型关系

```
User (用户)
  └── KnowledgeDistribution (知识分发记录)
       ├── AgentDecision (Agent决策记录) × N
       │    └── Assistant (助手)
       └── Memory (记忆记录) × 0-N
            └── Assistant (助手)
```

### API 调用链

```
GraphQL API (Apollo Server)
    ↓
chiefAgentService.uploadKnowledge()
    ↓
├─ multimodalProcessor.processImage()    → Gemini Vision API
├─ multimodalProcessor.processPDF()      → PDF Parse + Gemini
├─ multimodalProcessor.processLink()     → Cheerio + Gemini
    ↓
chiefAgentService.analyzeKnowledge()     → MCP Service → Gemini
    ↓
subAgentService.processDistribution()
    ├─ subAgentService.evaluateKnowledge() → MCP Service → Gemini
    ├─ subAgentService.shouldStoreKnowledge() (Stage 5 决策)
    └─ subAgentService.createMemory()
```

### 使用的 AI 模型

- **主模型**: Gemini 2.0 Flash Exp
- **Vision API**: Gemini Vision (图片分析)
- **文本分析**: Gemini Text (文档和链接分析)
- **决策推理**: Gemini via MCP (所有评估和决策)

---

## 决策规则 (Stage 5)

### 智能存储决策算法

```javascript
function shouldStoreKnowledge(relevanceScore, confidence, aiSuggestion) {
  // 规则1: 高相关性 + 高置信度 → 强制存储
  if (relevanceScore >= 0.7 && confidence >= 0.7) {
    return true  // ✓ 存储
  }

  // 规则2: 低相关性 → 强制不存储
  if (relevanceScore < 0.4) {
    return false  // ✗ 不存储
  }

  // 规则3: 中等相关性 (0.4-0.7)
  if (relevanceScore >= 0.4 && relevanceScore < 0.7) {
    if (confidence >= 0.5) {
      return aiSuggestion  // 参考 AI 建议
    } else {
      // 低置信度时，需要更高的相关性
      return relevanceScore >= 0.6
    }
  }

  // 规则4: 综合评分 (边界情况)
  const compositeScore = relevanceScore * 0.7 + confidence * 0.3
  return compositeScore >= 0.6
}
```

### 决策示例

| 相关性 | 置信度 | AI建议 | 决策结果 | 应用规则 |
|--------|--------|--------|----------|----------|
| 0.85 | 0.90 | true | ✓ 存储 | 规则1 |
| 0.75 | 0.75 | false | ✓ 存储 | 规则1 (忽略AI) |
| 0.65 | 0.70 | true | ✓ 存储 | 规则3 (采纳AI) |
| 0.55 | 0.60 | false | ✗ 不存储 | 规则3 (采纳AI) |
| 0.50 | 0.40 | true | ✗ 不存储 | 规则3 (低置信) |
| 0.62 | 0.45 | true | ✓ 存储 | 规则3 (≥0.6) |
| 0.35 | 0.90 | true | ✗ 不存储 | 规则2 |

---

## 性能指标

### 处理时间

| 操作 | 平均耗时 | 说明 |
|------|----------|------|
| 纯文本分析 | 2-3秒 | Chief 分析 + Sub-agents 评估 |
| 单张图片 | +2-3秒 | Vision API 分析 |
| 单个PDF | +5-10秒 | 文本提取 + 分析 |
| 单个链接 | +3-5秒 | 网页抓取 + 分析 |
| 完整流程 | 5-15秒 | 取决于附件数量 |

### 并发处理

- 多个图片/PDF/链接: **并发处理** (不是串行)
- 多个 Sub-agents: **并发评估** (Promise.all)

---

## 系统优势

### ✅ 智能化
- 自动分类和标签
- 多模态深度理解
- 基于 AI 的决策

### ✅ 自主化
- 每个助手独立评估
- 不需要用户手动分类
- 智能过滤不重要内容

### ✅ 可追溯
- 完整的决策记录
- 每个助手的评估理由
- 所有分析结果可查询

### ✅ 多模态
- 支持文本、图片、PDF、链接
- 深度分析每种内容
- 整合多源信息

---

## 总结

当你跟 Chief 发送消息或上传文件时，系统会：

1. ✅ **深度分析**所有内容（文本、图片、PDF、链接）
2. ✅ **智能推荐**相关的 2-3 个助手
3. ✅ **并发评估**每个助手独立打分
4. ✅ **自主决策**只存储真正重要的内容
5. ✅ **完整记录**所有决策过程和理由

**关键特点**:
- 🤖 完全自动化
- 🧠 深度 AI 分析
- 🎯 精准分发
- 💾 智能存储

**你只需要**: 发送内容，系统会自动帮你管理一切！

---

**文档版本**: v1.0
**最后更新**: 2025-10-06
**维护者**: Multi-Agent Knowledge System Team
