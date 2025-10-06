# 🤖 個人AI助手團隊 - 實施計劃

> 從療癒小鎮轉型為個人知識管理助手

## 產品定位

**My AI Team** - 你的個人AI助手團隊
- 🎯 **核心功能**：貼上資訊 → AI自動分類摘要 → 存入個人資料庫
- 🤖 **Multi-Agent**：主助手 + 6個領域專家（八卦、想法、生活、學業、朋友、感情）
- 💬 **擬人化**：每個助手有獨特個性，像朋友聊天
- 🎨 **視覺**：混合式UI（迷你3D島嶼 + 2D卡片介面）

---

## Phase 1: 核心功能 MVP (2週)

### Week 1: Multi-Agent 架構

#### 1.1 數據模型設計 (Day 1)

**修改 `backend/prisma/schema.prisma`**

```prisma
// 記憶條目（原 Conversation）
model MemoryEntry {
  id          String   @id @default(cuid())
  userId      String

  // 內容
  rawContent  String   @db.Text
  summary     String   @db.Text
  keyPoints   String[]
  tags        String[]

  // 分類
  category    Category @default(OTHER)

  // AI處理
  processedBy String   // agent ID
  sentiment   String?
  importance  Int      @default(5)

  // 時間
  createdAt   DateTime @default(now())

  // 關聯
  user        User     @relation(fields: [userId], references: [id])
  chatHistory ChatMessage[]

  @@index([userId, category])
  @@index([userId, createdAt])
}

enum Category {
  GOSSIP         // 八卦
  FUTURE_IDEAS   // 未來想法
  DAILY_LIFE     // 私生活
  STUDY          // 學業
  FRIENDS        // 朋友
  RELATIONSHIPS  // 感情
  OTHER          // 其他
}

model ChatMessage {
  id        String   @id @default(cuid())
  userId    String
  agentId   String

  message   String   @db.Text
  response  String   @db.Text

  memoryId  String?
  memory    MemoryEntry? @relation(fields: [memoryId], references: [id])

  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
}

model AIAgent {
  id          String   @id
  name        String
  category    Category?
  personality String   @db.Text
  emoji       String
  color       String
  systemPrompt String  @db.Text

  messageCount Int    @default(0)
  memoryCount  Int    @default(0)
}
```

**執行 Migration**
```bash
cd backend
npx prisma migrate dev --name personal_ai_assistant
npx prisma generate
```

#### 1.2 AI Agent 系統 (Day 2-3)

**創建 `backend/src/services/multiAgentService.ts`**

```typescript
import { geminiService } from './geminiServiceMCP'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Agent 定義
const AGENTS = {
  chief: {
    id: 'chief',
    name: '小知',
    role: 'router',
    emoji: '🏠',
    color: '#4ECDC4',
    personality: '溫暖、聰明、像個貼心管家',
    systemPrompt: `
      你是「小知」，用戶的主助手和管家。
      你的工作是：
      1. 溫暖地接收用戶分享的資訊
      2. 快速分析資訊類型，決定轉給哪個專家助手
      3. 用親切的語氣告訴用戶你的決定

      分類標準：
      - GOSSIP: 八卦、聽說的事、別人的故事
      - FUTURE_IDEAS: 未來想法、靈感、計劃、想做的事
      - DAILY_LIFE: 日常瑣事、生活記錄
      - STUDY: 學業、學習筆記、課程相關
      - FRIENDS: 朋友互動、社交活動
      - RELATIONSHIPS: 感情、戀愛、親密關係
      - OTHER: 其他

      回應風格：親切、簡短、像朋友
    `
  },

  gossip: {
    id: 'gossip-guru',
    name: '八卦通',
    category: 'GOSSIP',
    emoji: '🎭',
    color: '#FF6B9D',
    personality: '八卦但不評價，像閨蜜聊天',
    systemPrompt: `
      你是「八卦通」，專門幫用戶記錄八卦和別人的故事。
      你的風格：
      - 對八卦感興趣但不評價
      - 會幫用戶記住人物關係
      - 偶爾會問「後續呢？」

      任務：
      1. 提取關鍵人物和事件
      2. 生成簡短摘要
      3. 建議標籤（人名、事件類型）

      回應要親切、八卦、有趣
    `
  },

  dreams: {
    id: 'dream-keeper',
    name: '夢想家',
    category: 'FUTURE_IDEAS',
    emoji: '✨',
    color: '#FFD93D',
    personality: '樂觀、鼓勵、有創意',
    systemPrompt: `
      你是「夢想家」，幫用戶記錄所有未來想法和靈感。
      你的風格：
      - 樂觀鼓勵
      - 幫用戶把模糊想法具體化
      - 會問「需要我幫你規劃嗎？」

      任務：
      1. 提取核心想法
      2. 評估可行性（1-10）
      3. 建議第一步行動
    `
  },

  life: {
    id: 'life-buddy',
    name: '生活夥伴',
    category: 'DAILY_LIFE',
    emoji: '🏡',
    color: '#6BCB77',
    personality: '實在、溫暖、關心細節',
    systemPrompt: `
      你是「生活夥伴」，記錄日常生活點滴。
      你會關心用戶的作息、飲食、心情。
    `
  },

  study: {
    id: 'study-pal',
    name: '學習通',
    category: 'STUDY',
    emoji: '📚',
    color: '#4D96FF',
    personality: '耐心、有條理、像家教',
    systemPrompt: `
      你是「學習通」，幫用戶整理學習筆記。
      你會提取重點、建立知識連結、提供複習建議。
    `
  },

  social: {
    id: 'social-sage',
    name: '社交小幫手',
    category: 'FRIENDS',
    emoji: '👥',
    color: '#B983FF',
    personality: '善解人意、社交達人',
    systemPrompt: `
      你是「社交小幫手」，記錄朋友互動。
      你會記住每個朋友的特點、重要日期、約定。
    `
  },

  heart: {
    id: 'heart-whisper',
    name: '心語者',
    category: 'RELATIONSHIPS',
    emoji: '💕',
    color: '#FF8FA3',
    personality: '溫柔、同理心強、懂感情',
    systemPrompt: `
      你是「心語者」，陪伴用戶處理感情問題。
      你會傾聽、同理、給予溫暖的建議。
    `
  }
}

export class MultiAgentService {

  // 第一步：主助手路由
  async routeMessage(userId: string, content: string) {
    const chiefAgent = AGENTS.chief

    const routingPrompt = `
      分析這段訊息應該歸類到哪個類別：

      "${content}"

      請回覆 JSON 格式：
      {
        "category": "GOSSIP|FUTURE_IDEAS|DAILY_LIFE|STUDY|FRIENDS|RELATIONSHIPS|OTHER",
        "confidence": 0.0-1.0,
        "reason": "簡短說明",
        "greeting": "給用戶的溫暖回應"
      }
    `

    try {
      const response = await geminiService.generateResponse(
        chiefAgent.systemPrompt + '\n\n' + routingPrompt,
        chiefAgent.id
      )

      const result = this.parseJSON(response)

      // 記錄主助手的回應
      await prisma.chatMessage.create({
        data: {
          userId,
          agentId: chiefAgent.id,
          message: content,
          response: result.greeting
        }
      })

      return result

    } catch (error) {
      console.error('Routing error:', error)

      // 降級處理
      return {
        category: 'OTHER',
        confidence: 0.5,
        reason: '讓我想想...',
        greeting: '收到！讓我幫你處理～'
      }
    }
  }

  // 第二步：Sub-agent 處理
  async processWithAgent(userId: string, content: string, category: string) {
    const agent = Object.values(AGENTS).find(a => a.category === category)
    if (!agent) throw new Error('Agent not found')

    const processingPrompt = `
      用戶分享了這段內容：
      "${content}"

      請：
      1. 用你的個性回應用戶
      2. 提取關鍵資訊
      3. 生成摘要
      4. 建議標籤

      回覆 JSON 格式：
      {
        "response": "給用戶的親切回應",
        "summary": "精簡摘要（50字內）",
        "keyPoints": ["重點1", "重點2"],
        "tags": ["標籤1", "標籤2"],
        "importance": 1-10,
        "sentiment": "positive|neutral|negative"
      }
    `

    const response = await geminiService.generateResponse(
      agent.systemPrompt + '\n\n' + processingPrompt,
      agent.id
    )

    const result = this.parseJSON(response)

    // 存入記憶
    const memory = await prisma.memoryEntry.create({
      data: {
        userId,
        rawContent: content,
        summary: result.summary,
        keyPoints: result.keyPoints,
        tags: result.tags,
        category: category as any,
        processedBy: agent.id,
        sentiment: result.sentiment,
        importance: result.importance
      }
    })

    // 記錄對話
    await prisma.chatMessage.create({
      data: {
        userId,
        agentId: agent.id,
        message: content,
        response: result.response,
        memoryId: memory.id
      }
    })

    return {
      agent,
      memory,
      response: result.response
    }
  }

  // 與特定助手聊天
  async chatWithAgent(userId: string, agentId: string, message: string) {
    const agent = AGENTS[agentId]
    if (!agent) throw new Error('Agent not found')

    // 獲取相關記憶
    const relatedMemories = await prisma.memoryEntry.findMany({
      where: {
        userId,
        category: agent.category || undefined
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    const contextPrompt = `
      相關記憶：
      ${relatedMemories.map(m => `- ${m.summary}`).join('\n')}

      用戶問：${message}

      請基於你記錄的資訊回答，保持你的個性。
    `

    const response = await geminiService.generateResponse(
      agent.systemPrompt + '\n\n' + contextPrompt,
      agent.id
    )

    await prisma.chatMessage.create({
      data: {
        userId,
        agentId,
        message,
        response
      }
    })

    return { agent, response }
  }

  private parseJSON(text: string) {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    throw new Error('No JSON found in response')
  }
}

export const multiAgentService = new MultiAgentService()
```

#### 1.3 GraphQL API (Day 4)

**修改 `backend/src/schema.ts`**

```graphql
type MemoryEntry {
  id: ID!
  rawContent: String!
  summary: String!
  keyPoints: [String!]!
  tags: [String!]!
  category: Category!
  processedBy: String!
  importance: Int!
  createdAt: DateTime!
  chatHistory: [ChatMessage!]!
}

type ChatMessage {
  id: ID!
  agentId: String!
  message: String!
  response: String!
  createdAt: DateTime!
  memory: MemoryEntry
}

type AIAgent {
  id: ID!
  name: String!
  emoji: String!
  color: String!
  personality: String!
  messageCount: Int!
  memoryCount: Int!
}

enum Category {
  GOSSIP
  FUTURE_IDEAS
  DAILY_LIFE
  STUDY
  FRIENDS
  RELATIONSHIPS
  OTHER
}

type SubmitResponse {
  routing: RoutingResult!
  processing: ProcessingResult!
}

type RoutingResult {
  category: Category!
  greeting: String!
  reason: String!
}

type ProcessingResult {
  agent: AIAgent!
  memory: MemoryEntry!
  response: String!
}

type Query {
  # 記憶查詢
  memories(category: Category, limit: Int = 50): [MemoryEntry!]!
  memory(id: ID!): MemoryEntry
  searchMemories(query: String!): [MemoryEntry!]!

  # 助手
  agents: [AIAgent!]!
  agent(id: ID!): AIAgent

  # 對話歷史
  chatHistory(agentId: ID, limit: Int = 20): [ChatMessage!]!
}

type Mutation {
  # 主要功能：提交新資訊
  submitMemory(content: String!): SubmitResponse!

  # 與助手聊天
  chatWithAgent(agentId: ID!, message: String!): ChatMessage!

  # 記憶管理
  updateMemory(id: ID!, tags: [String!], importance: Int): MemoryEntry!
  deleteMemory(id: ID!): Boolean!
}
```

**創建 Resolvers `backend/src/resolvers/memoryResolvers.ts`**

```typescript
import { multiAgentService } from '../services/multiAgentService'

export const memoryResolvers = {
  Query: {
    memories: async (_: any, { category, limit }: any, { userId, prisma }: any) => {
      return prisma.memoryEntry.findMany({
        where: {
          userId,
          ...(category && { category })
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      })
    },

    searchMemories: async (_: any, { query }: any, { userId, prisma }: any) => {
      return prisma.memoryEntry.findMany({
        where: {
          userId,
          OR: [
            { rawContent: { contains: query, mode: 'insensitive' } },
            { summary: { contains: query, mode: 'insensitive' } },
            { tags: { has: query } }
          ]
        }
      })
    }
  },

  Mutation: {
    submitMemory: async (_: any, { content }: any, { userId }: any) => {
      // 第一步：路由
      const routing = await multiAgentService.routeMessage(userId, content)

      // 第二步：處理
      const processing = await multiAgentService.processWithAgent(
        userId,
        content,
        routing.category
      )

      return { routing, processing }
    },

    chatWithAgent: async (_: any, { agentId, message }: any, { userId }: any) => {
      const result = await multiAgentService.chatWithAgent(userId, agentId, message)
      return result
    }
  }
}
```

---

### Week 2: 前端實作

#### 2.1 基礎UI組件 (Day 5-6)

**創建 `frontend/src/components/AIAssistant/SubmitBox.tsx`**

```tsx
import { useState } from 'react'
import { useMutation } from '@apollo/client'
import { SUBMIT_MEMORY } from '@/graphql/mutations'

export function SubmitBox() {
  const [content, setContent] = useState('')
  const [submitMemory, { loading, data }] = useMutation(SUBMIT_MEMORY)

  const handleSubmit = async () => {
    if (!content.trim()) return

    await submitMemory({ variables: { content } })
    setContent('')
  }

  return (
    <div className="submit-box">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="貼上你的想法、截圖、連結... ✨"
        className="w-full p-4 rounded-lg border-2 border-gray-200 focus:border-blue-400"
      />

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="mt-2 px-6 py-2 bg-blue-500 text-white rounded-lg"
      >
        {loading ? '處理中...' : '送出'}
      </button>

      {/* 顯示AI處理過程 */}
      {data && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-gray-600">
            <span>🏠</span>
            <span>{data.submitMemory.routing.greeting}</span>
          </div>

          <div className="flex items-center gap-2 text-blue-600">
            <span>{data.submitMemory.processing.agent.emoji}</span>
            <span>{data.submitMemory.processing.response}</span>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">已整理</div>
            <div className="font-medium">{data.submitMemory.processing.memory.summary}</div>
            <div className="mt-2 flex gap-2">
              {data.submitMemory.processing.memory.tags.map(tag => (
                <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-sm">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

**創建 `frontend/src/components/AIAssistant/AgentCard.tsx`**

```tsx
interface Agent {
  id: string
  name: string
  emoji: string
  color: string
  personality: string
  memoryCount: number
}

export function AgentCard({ agent, onClick }: { agent: Agent, onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="agent-card p-4 rounded-xl cursor-pointer hover:scale-105 transition-transform"
      style={{ backgroundColor: agent.color + '20', borderColor: agent.color }}
    >
      <div className="text-4xl mb-2">{agent.emoji}</div>
      <div className="font-bold">{agent.name}</div>
      <div className="text-sm text-gray-600">{agent.personality}</div>
      <div className="mt-2 text-xs text-gray-500">
        {agent.memoryCount} 則記憶
      </div>
    </div>
  )
}
```

#### 2.2 主界面 (Day 7)

**創建 `frontend/src/pages/Dashboard.tsx`**

```tsx
import { useQuery } from '@apollo/client'
import { SubmitBox } from '@/components/AIAssistant/SubmitBox'
import { AgentCard } from '@/components/AIAssistant/AgentCard'
import { MemoryTimeline } from '@/components/AIAssistant/MemoryTimeline'

export function Dashboard() {
  const { data: agents } = useQuery(GET_AGENTS)
  const { data: memories } = useQuery(GET_RECENT_MEMORIES)

  return (
    <div className="dashboard max-w-6xl mx-auto p-6">
      {/* 頂部：助手列表 */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">你的AI助手團隊</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {agents?.agents.map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onClick={() => openAgentChat(agent.id)}
            />
          ))}
        </div>
      </div>

      {/* 中間：提交區 */}
      <div className="mb-8">
        <h3 className="text-xl font-bold mb-4">今天發生什麼事？</h3>
        <SubmitBox />
      </div>

      {/* 下方：記憶時間軸 */}
      <div>
        <h3 className="text-xl font-bold mb-4">最近記憶</h3>
        <MemoryTimeline memories={memories?.memories} />
      </div>
    </div>
  )
}
```

---

## Phase 2: 視覺優化 (1週)

### 2.3 迷你3D島嶼 (Day 8-10)

**簡化現有Three.js場景**

```tsx
// frontend/src/components/3D/MiniIsland.tsx
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

function AgentHouse({ position, color, emoji, active }) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={color}
          emissive={active ? color : '#000'}
          emissiveIntensity={active ? 0.5 : 0}
        />
      </mesh>
      <Html position={[0, 0.8, 0]}>
        <div className="text-2xl">{emoji}</div>
      </Html>
    </group>
  )
}

export function MiniIsland({ agents, activeAgentId }) {
  return (
    <div className="w-full h-64">
      <Canvas camera={{ position: [0, 5, 10], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />

        {/* 島嶼平台 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[8, 32]} />
          <meshStandardMaterial color="#90EE90" />
        </mesh>

        {/* 助手小屋 */}
        {agents.map((agent, i) => {
          const angle = (i / agents.length) * Math.PI * 2
          const x = Math.cos(angle) * 4
          const z = Math.sin(angle) * 4

          return (
            <AgentHouse
              key={agent.id}
              position={[x, 0.5, z]}
              color={agent.color}
              emoji={agent.emoji}
              active={agent.id === activeAgentId}
            />
          )
        })}

        <OrbitControls enableZoom={false} />
      </Canvas>
    </div>
  )
}
```

---

## Phase 3: 進階功能 (持續)

- [ ] 智能搜尋（向量搜尋）
- [ ] 助手成長系統
- [ ] 每日摘要
- [ ] 移動端適配
- [ ] Chrome擴展（快速剪藏）

---

## 🚀 立即開始

```bash
# 1. 創建分支
git checkout -b feature/ai-assistant-team

# 2. 修改數據模型
cd backend
code prisma/schema.prisma
# 複製上面的 schema

# 3. 運行 migration
npx prisma migrate dev --name ai_assistant_team
npx prisma generate

# 4. 創建服務
mkdir -p src/services
code src/services/multiAgentService.ts
# 複製上面的代碼

# 5. 測試
npm run dev
```

---

## 成功指標

### MVP (2週後)
- ✅ 可以貼上資訊，AI自動分類
- ✅ 6個助手各司其職
- ✅ 記憶正確存儲和檢索
- ✅ 基本UI可用

### 完整版
- 📊 日活 >= 50人
- 💾 平均每人 >= 100則記憶
- 😊 用戶滿意度 >= 4.5/5
- 🔄 7日留存 >= 40%

---

## 差異化優勢

vs Notion：
- ✨ AI自動分類（不用手動整理）
- 💬 對話式互動（更自然）
- 🎭 多個性化助手（有溫度）

vs Obsidian：
- 🤖 AI即時處理（不只是記錄）
- 🎨 視覺化呈現（3D島嶼）
- 🎮 遊戲化體驗（有趣）

vs ChatGPT：
- 💾 長期記憶（持久化）
- 🏷️ 自動分類（結構化）
- 👥 多助手（專業化）
