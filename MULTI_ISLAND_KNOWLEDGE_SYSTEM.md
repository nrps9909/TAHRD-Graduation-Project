# 🏝️ 多岛屿知识管理系统实施计划

## 系统架构概览

```
用户上传知识
    ↓
Chief Agent (中央协调)
    ↓
知识分析 & 路由决策
    ↓
分发给相关 Sub-agents
    ↓
Sub-agent 判断存储
    ↓
写入各自的知识库
```

## Stage 1: 多岛屿架构 🏝️

### 目标
将单一岛屿改为多个独立岛屿，每个NPC拥有独立的岛屿世界

### 设计
```
主视图 (IslandOverview)
├── 岛屿导航系统
│   ├── 岛屿缩略图网格
│   │   ├── NPC头像 + 名字
│   │   ├── 岛屿预览图
│   │   └── 悬浮效果
│   └── 侧边栏快速切换
│
└── 单个岛屿视图 (IndividualIsland)
    ├── 3D岛屿场景
    ├── NPC房屋（可点击）
    └── 装饰元素
```

### 实现要点
- [x] 创建 IslandOverview 组件（岛屿选择器）
- [x] 创建 IndividualIsland 组件（单个岛屿）
- [x] 实现岛屿切换动画
- [x] 点击房子直接进入聊天（移除中间步骤）
- [x] 每个岛屿独立的主题色和装饰

## Stage 2: 增强聊天界面 💬

### 多模态输入支持

#### 支持的输入类型
1. **文字** - 基础文本输入
2. **图片** - jpg, png, gif, webp
3. **文件** - pdf, docx, txt, md, json, csv
4. **链接** - 自动抓取预览
5. **语音** - 录音转文字（可选）

#### UI设计
```
┌─────────────────────────────────────┐
│  NPC 头像 + 名字            [X]     │
├─────────────────────────────────────┤
│                                     │
│  聊天消息区域                       │
│  ├── 用户消息                       │
│  │   ├── 文字                       │
│  │   ├── 图片预览                   │
│  │   └── 文件图标                   │
│  └── AI回复                         │
│                                     │
├─────────────────────────────────────┤
│  [📎] [🖼️] [📁] [🔗]          │
│  ┌─────────────────────────┐       │
│  │ 输入框（支持多行）      │ [发送]│
│  └─────────────────────────┘       │
└─────────────────────────────────────┘
```

#### 实现要点
- [x] 文件上传组件（支持拖拽）
- [x] 图片预览和压缩
- [x] 文件类型验证
- [x] 上传进度显示
- [x] 多文件同时上传

## Stage 3: Chief Agent 知识管理系统 🧠

### 架构设计

#### Chief Agent 职责
1. **接收知识** - 接收用户上传的所有内容
2. **内容分析** - 使用 Gemini 分析知识类型和相关性
3. **路由决策** - 决定应该分发给哪些 Sub-agents
4. **分发管理** - 将知识分发给相关的 Sub-agents

#### Sub-agent 职责
1. **接收知识** - 从 Chief Agent 接收知识
2. **相关性判断** - 判断知识是否与自己相关
3. **存储决策** - 决定是否需要存储到知识库
4. **知识整合** - 将知识整合到现有知识体系

### GraphQL Schema

```graphql
# 知识上传
type Mutation {
  uploadKnowledge(input: KnowledgeInput!): KnowledgeUploadResult!
}

input KnowledgeInput {
  content: String!          # 文字内容
  files: [Upload!]          # 文件列表
  links: [String!]          # 链接列表
  metadata: JSON            # 元数据
}

type KnowledgeUploadResult {
  id: ID!
  chiefAnalysis: String!    # Chief的分析
  distributedTo: [String!]! # 分发给哪些agents
  storedBy: [String!]!      # 哪些agents选择存储
  timestamp: DateTime!
}

# 查询知识分发历史
type Query {
  knowledgeDistributionHistory(limit: Int): [KnowledgeDistribution!]!
}

type KnowledgeDistribution {
  id: ID!
  content: String!
  chiefDecision: String!
  agentDecisions: [AgentDecision!]!
  createdAt: DateTime!
}

type AgentDecision {
  agentId: String!
  agentName: String!
  relevanceScore: Float!
  shouldStore: Boolean!
  reasoning: String!
}
```

### Backend 服务流程

```typescript
// Chief Agent Service
class ChiefAgentService {
  async processKnowledge(input: KnowledgeInput): Promise<KnowledgeUploadResult> {
    // 1. 分析内容
    const analysis = await this.analyzeContent(input)

    // 2. 决定分发目标
    const targets = await this.decideDistribution(analysis)

    // 3. 分发给 Sub-agents
    const decisions = await this.distributeToAgents(targets, input)

    // 4. 收集存储决策
    const stored = decisions.filter(d => d.shouldStore)

    // 5. 返回结果
    return {
      chiefAnalysis: analysis.summary,
      distributedTo: targets.map(t => t.id),
      storedBy: stored.map(s => s.agentId)
    }
  }

  async analyzeContent(input: KnowledgeInput): Promise<Analysis> {
    // 使用 Gemini CLI 分析内容
    const prompt = `
      分析以下知识内容，判断：
      1. 主题和类别
      2. 关键概念
      3. 可能相关的角色（陆培修/劉宇岑/陳庭安）

      内容: ${input.content}
      文件: ${input.files?.length || 0} 个
      链接: ${input.links?.length || 0} 个
    `

    return await geminiCLI.analyze(prompt, input.files)
  }

  async decideDistribution(analysis: Analysis): Promise<Agent[]> {
    // 基于分析结果决定分发给哪些agents
    const relevantAgents = []

    for (const agent of allAgents) {
      const score = await this.calculateRelevance(analysis, agent)
      if (score > RELEVANCE_THRESHOLD) {
        relevantAgents.push({ agent, score })
      }
    }

    return relevantAgents.map(r => r.agent)
  }
}

// Sub-agent Knowledge Service
class SubAgentKnowledgeService {
  async receiveKnowledge(agentId: string, knowledge: Knowledge): Promise<AgentDecision> {
    // 1. 判断相关性
    const relevance = await this.assessRelevance(agentId, knowledge)

    // 2. 决定是否存储
    const shouldStore = await this.decideShouldStore(relevance)

    // 3. 如果决定存储，写入数据库
    if (shouldStore) {
      await this.storeKnowledge(agentId, knowledge)
    }

    return {
      agentId,
      relevanceScore: relevance.score,
      shouldStore,
      reasoning: relevance.reasoning
    }
  }

  async assessRelevance(agentId: string, knowledge: Knowledge): Promise<Relevance> {
    const agent = await this.getAgent(agentId)

    const prompt = `
      你是 ${agent.name}。

      以下是一段新知识，请判断它与你的相关性：
      ${knowledge.content}

      考虑因素：
      1. 是否与你的个性、兴趣相关？
      2. 是否能帮助你更好地与用户互动？
      3. 是否包含对你有价值的信息？

      请给出相关性评分（0-1）和理由。
    `

    return await geminiCLI.assessRelevance(prompt, knowledge.files)
  }
}
```

## Stage 4: Gemini CLI 多模态集成 🤖

### 文件处理流程

#### 图片处理
```typescript
// 上传图片 → Gemini Vision API
async function processImage(file: File): Promise<ImageAnalysis> {
  const base64 = await fileToBase64(file)

  const response = await geminiCLI.vision({
    image: base64,
    prompt: "描述这张图片的内容，提取关键信息"
  })

  return {
    description: response.description,
    tags: response.tags,
    shouldStore: response.shouldStore,
    reasoning: response.reasoning
  }
}
```

#### PDF/文档处理
```typescript
// PDF → 文本提取 → Gemini 分析
async function processPDF(file: File): Promise<DocumentAnalysis> {
  const text = await extractPDFText(file)

  const response = await geminiCLI.analyze({
    content: text,
    prompt: "总结这份文档的要点，判断是否需要存储"
  })

  return {
    summary: response.summary,
    keyPoints: response.keyPoints,
    shouldStore: response.shouldStore
  }
}
```

#### 链接处理
```typescript
// URL → 抓取内容 → Gemini 分析
async function processLink(url: string): Promise<LinkAnalysis> {
  const content = await fetchURL(url)

  const response = await geminiCLI.analyze({
    content: content.text,
    metadata: { url, title: content.title },
    prompt: "分析这个网页的内容，判断价值"
  })

  return {
    title: content.title,
    summary: response.summary,
    shouldStore: response.shouldStore
  }
}
```

## Stage 5: 自动存储判断系统 💾

### 存储决策逻辑

#### Gemini Prompt 设计
```
你是一个智能知识管理助手。你的任务是判断以下内容是否应该被存储到知识库。

内容: {content}
类型: {type}
来源: {source}

判断标准：
1. **重要性** - 是否包含有价值的信息？
2. **长期性** - 是否需要长期保存？
3. **可用性** - 未来是否可能被引用？
4. **相关性** - 与当前对话主题的相关度？

不应存储的内容：
- 简单的问候语
- 临时性的对话
- 无意义的闲聊
- 重复的信息

应该存储的内容：
- 用户的个人信息和偏好
- 重要的知识和见解
- 有价值的文档和资源
- 长期项目的相关信息

请以JSON格式返回：
{
  "shouldStore": boolean,
  "category": string,  // "personal" | "knowledge" | "resource" | "project"
  "priority": number,  // 1-5
  "reasoning": string,
  "tags": string[]
}
```

### 数据库 Schema

```prisma
model Memory {
  id          String   @id @default(cuid())
  assistantId String
  assistant   Assistant @relation(fields: [assistantId], references: [id])

  // 内容
  content     String
  contentType String   // "text" | "image" | "file" | "link"

  // 元数据
  category    String   // "personal" | "knowledge" | "resource" | "project"
  priority    Int      // 1-5
  tags        String[]

  // 文件信息
  fileUrl     String?
  fileName    String?
  fileType    String?

  // 分析结果
  aiAnalysis  String?  // Gemini的分析
  embedding   Float[]  // 向量嵌入（用于语义搜索）

  // 来源追踪
  sourceType  String   // "chat" | "upload" | "chief_distribution"
  distributedBy String? // 如果是从Chief分发的

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model KnowledgeDistribution {
  id          String   @id @default(cuid())

  // 原始内容
  content     String
  files       Json?
  links       String[]

  // Chief 分析
  chiefAnalysis String

  // 分发记录
  decisions   AgentDecision[]

  createdAt   DateTime @default(now())
}

model AgentDecision {
  id            String   @id @default(cuid())
  distributionId String
  distribution  KnowledgeDistribution @relation(fields: [distributionId], references: [id])

  agentId       String
  agentName     String

  relevanceScore Float
  shouldStore   Boolean
  reasoning     String

  createdAt     DateTime @default(now())
}
```

## 实施顺序

1. **Stage 1** - 多岛屿UI（2-3小时）
2. **Stage 2** - 聊天界面增强（2-3小时）
3. **Stage 3** - Chief Agent系统（4-5小时）
4. **Stage 4** - Gemini CLI集成（3-4小时）
5. **Stage 5** - 自动存储系统（2-3小时）

**总计**: 13-18小时

## 技术栈

- **Frontend**: React, Three.js, Apollo Client
- **Backend**: Node.js, GraphQL, Prisma
- **AI**: Gemini CLI (gemini-2.0-flash-exp)
- **Storage**: PostgreSQL + pgvector, File storage (S3/本地)
- **Real-time**: Socket.IO

## 下一步行动

让我们从 Stage 1 开始！
