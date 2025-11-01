# Heart Whisper Town - Assistant 到 Island 完整遷移計劃

> **生成時間**: 2025-11-01
> **分析範圍**: 後端 17 個文件 + 前端 16 個文件 + Prisma Schema
> **預估時間**: 8-12 週
> **風險等級**: 🟡 中等（需謹慎執行，建議分階段遷移）

---

## 📋 執行摘要

### 當前狀態

Heart Whisper Town 專案目前處於 **Assistant 舊系統** 和 **Island 新系統** 的 **過渡期**：

- ✅ **Island 新架構已基本完成** - 支援完整的 CRUD、3D 配置、用戶專屬
- ⚠️ **部分功能仍依賴 Assistant** - Chief Agent、ChatSession、統計數據
- ⚠️ **代碼層面混用兩者** - 後端服務、前端組件、GraphQL schema
- ⚠️ **資料庫過渡期** - Memory 同時支援 `assistantId` 和 `islandId`

### 核心問題

| 問題 | 影響範圍 | 風險等級 |
|------|---------|----------|
| **Assistant 與 Island 概念混淆** | 全專案 | 🟡 中 |
| **資料庫雙重關聯** (assistantId + islandId) | Memory, AgentDecision | 🟡 中 |
| **ChatSession 強耦合 Assistant** | 聊天系統 | 🔴 高 |
| **統計數據分散** | Assistant.totalMemories vs Island.memoryCount | 🟡 中 |
| **AI 配置缺失** | Island 無 systemPrompt, personality | 🔴 高 |
| **前端路由混亂** | /island/:assistantId | 🟢 低 |

### 遷移目標

1. ✅ **完全移除 Assistant Model**（保留 Chief 作為系統服務）
2. ✅ **統一使用 Island 作為唯一的分類系統**
3. ✅ **為 Island 添加 AI 配置欄位**
4. ✅ **遷移 ChatSession 到 Island-based 架構**
5. ✅ **統一前後端 GraphQL schema**
6. ✅ **遷移歷史數據並重新計算統計**

---

## 📊 現狀分析

### 1. Prisma Schema 分析

#### Assistant Model (舊系統)

```prisma
model Assistant {
  id               String   @id @default(auto()) @map("_id") @db.ObjectId

  // Identity
  type             AssistantType @unique  // CHIEF, LEARNING, WORK, etc.
  name             String   @unique
  nameChinese      String
  emoji            String
  color            String

  // AI Configuration ⚠️ Island 缺失
  systemPrompt     String   @db.String
  personality      String   @db.String
  chatStyle        String   @db.String

  // 3D Position
  positionX        Float    @default(0)
  positionY        Float    @default(0)
  positionZ        Float    @default(0)

  // 3D Appearance
  modelUrl         String?
  textureId        String?
  shape            String?
  customShapeData  String?  @db.String
  islandHeight     Float?   @default(2.0)
  islandBevel      Float?   @default(0.5)

  // Statistics ⚠️ 與 Island 不一致
  totalMemories    Int      @default(0)
  totalChats       Int      @default(0)

  // Relations
  memories         Memory[]
  chatMessages     ChatMessage[]
  chatSessions     ChatSession[]

  @@map("assistants")
}
```

#### Island Model (新系統)

```prisma
model Island {
  id               String   @id @default(auto()) @map("_id") @db.ObjectId
  userId           String   @map("user_id") @db.ObjectId  // ⚠️ 用戶專屬

  // Order
  position         Int  // ⚠️ Assistant 沒有排序

  // Identity
  name             String?  // 已廢棄，僅向後兼容
  nameChinese      String
  emoji            String   @default("🏝️")
  color            String   @default("#FFB3D9")
  description      String?  @db.String

  // 3D Position
  positionX        Float    @default(0)
  positionY        Float    @default(0)
  positionZ        Float    @default(0)

  // 3D Appearance
  modelUrl         String?
  textureId        String?
  shape            String?  @default("circle")
  customShapeData  String?  @db.String
  islandHeight     Float?   @default(2.0)
  islandBevel      Float?   @default(0.5)

  // Statistics
  memoryCount      Int      @default(0)  // ⚠️ 只追蹤記憶數

  // Relations
  user             User     @relation(...)
  memories         Memory[]

  @@index([userId, position])
  @@map("islands")
}
```

#### Memory Model (過渡期 - 同時支援兩者)

```prisma
model Memory {
  id               String   @id
  userId           String   @db.ObjectId
  assistantId      String?  @db.ObjectId  // ⚠️ 舊系統
  islandId         String?  @db.ObjectId  // ⚠️ 新系統

  // Relations
  assistant        Assistant? @relation(...)
  island           Island?    @relation(...)

  // Indexes
  @@index([userId, assistantId])           // 舊
  @@index([userId, islandId])              // 新
  @@index([userId, islandId, createdAt(sort: Desc)])  // 新
}
```

#### 關聯圖

```
Assistant (舊 - 全域共享)
  ├─ Memory.assistantId (nullable)
  ├─ ChatSession.assistantId (required) 🔴
  ├─ ChatMessage.assistantId (required) 🔴
  └─ AgentDecision.assistantId (nullable)

Island (新 - 用戶專屬)
  └─ Memory.islandId (nullable)

User
  └─ Island.userId (用戶擁有多個島嶼)
```

### 2. 後端服務使用情況

#### assistantService.ts ⚠️ 核心依賴

| 功能 | 使用者 | 可替代性 |
|------|--------|----------|
| `getChiefAssistant()` | chiefAgentService, tororoService | ⚠️ Chief 特殊邏輯 |
| `getAssistantById()` | subAgentService, memoryService, chatSessionService | ✅ Island 查詢 |
| `getAssistantByType()` | chiefAgentService, subAgentService | ✅ Island 映射 |
| `incrementAssistantStats()` | 多個服務 | ⚠️ 需遷移到 Island |
| `fallbackCategoryDetection()` | chiefAgentService | ✅ Island 關鍵字匹配 |

**依賴樹**:
```
assistantService (核心)
  ├─ chiefAgentService (重度依賴)
  │   ├─ classifyContent()
  │   ├─ processAndCreateMemory()
  │   ├─ chatWithChief()
  │   └─ uploadKnowledgeStream()
  ├─ subAgentService (中度依賴)
  │   ├─ evaluateKnowledge()
  │   ├─ createMemoryWithIsland()
  │   └─ processDistributionWithIslands() ✅ 已適配 Island
  ├─ memoryService (輕度依賴)
  │   └─ Query 中 include assistant
  ├─ chatSessionService (中度依賴)
  │   └─ ChatSession 必須關聯 assistantId 🔴
  └─ assistantResolvers (直接調用)
```

#### chiefAgentService.ts ⚠️ 關鍵服務

**使用 Assistant 的地方**:

| 行號 | 方法 | 用途 | 遷移難度 |
|------|------|------|----------|
| 190, 398 | `classifyContent()` | 智能分類 | 🟡 需保留 Chief |
| 254 | `processAndCreateMemory()` | 創建記憶 | 🟢 可遷移 |
| 369-371 | `classifyAndCreate()` | 獲取分類對應助手 | 🟢 可遷移 |
| 525 | `chatWithChief()` | RAG 增強對話 | 🟡 需保留 Chief |
| 1391-1394 | `uploadKnowledgeStream()` | 獲取島嶼對應助手 | 🟢 已部分適配 |

**關鍵發現**:
- ✅ **Streaming 模式** (Lines 1235-1473) 已支持 Island
- ✅ **動態分類** (Lines 763-891) 已支持 Island
- ⚠️ **Chief 特殊邏輯** 無法直接遷移到 Island（需保留）

#### subAgentService.ts ✅ 已適配 Island

**Island 整合狀態**:
- ✅ `processDistributionWithIslands()` (Lines 616-761) - 完整 Island 處理
- ✅ 創建 Memory 時關聯 `islandId` (Line 172)
- ⚠️ 仍需 Assistant 的 `systemPrompt` (Line 76, 667-670)
- ⚠️ 統計更新使用 `incrementAssistantStats()` (Line 206)

#### chatSessionService.ts 🔴 強耦合

**問題**:
- ChatSession Model 必須關聯 `assistantId` (required)
- 查詢時 include `assistant` relation (Lines 48, 119, 210)
- 無法直接替換為 `islandId`（schema 限制）

### 3. 前端組件使用情況

#### 完全使用 Assistant 的組件

| 組件 | Query | 用途 | 遷移難度 |
|------|-------|------|----------|
| **IslandView** | `GET_ASSISTANTS` | 顯示島嶼 3D 場景 | 🟡 中 |
| **IslandEditorModal** | `UPDATE_ASSISTANT` | 編輯 3D 配置 | 🟢 低（已支持 Island 參數） |
| **TororoChatDialog** | `GET_CHIEF_ASSISTANT` | 知識上傳對話 | 🟢 低（不強依賴） |
| **TororoKnowledgeAssistant** | `GET_CHIEF_ASSISTANT` | 知識上傳主介面 | 🟢 低（不強依賴） |

#### 已遷移到 Island 的組件

| 組件 | Query | 狀態 |
|------|-------|------|
| **CuteDatabaseView** | `GET_ISLANDS`, `GET_MEMORIES` | ✅ 完全遷移 |
| **IslandCreator** | `CREATE_ISLAND` | ✅ 完全遷移 |
| **IslandOverview** | `GET_ISLANDS` | ✅ 完全遷移 |

#### 關鍵問題

**IslandView 問題** (`pages/IslandView/index.tsx`):
```typescript
// ⚠️ 路由使用 assistantId 但概念上是 Island
const { assistantId } = useParams()

// ⚠️ 使用 GET_ASSISTANTS 而非 GET_ISLANDS
const { data } = useQuery(GET_ASSISTANTS)

// ⚠️ 缺少 userId 過濾（安全性問題）
// 任何用戶都能訪問所有 Assistant/Island
```

**IslandEditorModal 問題** (`components/IslandEditorModal.tsx`):
```typescript
// ⚠️ 命名為 islandId 但調用 UPDATE_ASSISTANT
const [updateAssistant] = useMutation(UPDATE_ASSISTANT, {
  variables: {
    id: islandId,  // 實際上是 assistantId
    color, textureId, shape, ...
  }
})
```

### 4. GraphQL Schema 分析

#### Assistant 相關定義

```graphql
type Assistant {
  id: ID!
  type: AssistantType!  # CHIEF, LEARNING, WORK, etc.
  name: String!
  nameChinese: String!
  emoji: String!
  color: String!
  systemPrompt: String!  # ⚠️ Island 缺失
  personality: String!   # ⚠️ Island 缺失
  chatStyle: String!     # ⚠️ Island 缺失
  position: Location!
  totalMemories: Int!
  totalChats: Int!
  memories: [Memory!]!
  chatMessages: [ChatMessage!]!
}

enum AssistantType {
  CHIEF, LEARNING, INSPIRATION, WORK, SOCIAL, LIFE, GOALS, RESOURCES, MISC
}
```

#### Island 相關定義

```graphql
type Island {
  id: ID!
  userId: ID!  # ⚠️ 用戶專屬
  position: Int!
  nameChinese: String!
  emoji: String!
  color: String!
  description: String
  positionX: Float!
  positionY: Float!
  positionZ: Float!
  memoryCount: Int!  # ⚠️ 只追蹤記憶數
  isActive: Boolean!
  memories: [Memory!]!

  # 3D Configuration
  customShapeData: String
  islandHeight: Float
  islandBevel: Float
  shape: String
  textureId: String
  modelUrl: String

  # ⚠️ 缺失：systemPrompt, personality, chatStyle
}
```

#### Memory Type (支援雙向兼容)

```graphql
type Memory {
  assistantId: ID     # ⚠️ 舊系統
  islandId: ID        # ⚠️ 新系統
  assistant: Assistant  # ⚠️ 舊 relation
  island: Island      # ⚠️ 新 relation (未完全實現)
}
```

---

## 🎯 遷移目標與策略

### 最終目標

**Phase 1: 過渡期（當前）**
```
Assistant (全域共享)  →  Island (用戶專屬)
      ↓                       ↓
   Memory                  Memory
(assistantId + islandId 雙重關聯)
```

**Phase 2: 遷移完成**
```
Chief Service (系統級)  +  Island (用戶專屬)
                               ↓
                            Memory
                        (只有 islandId)
```

### 核心策略

1. **保留 Chief Assistant 作為系統級服務**
   - Chief 不是分類，而是智能調度器
   - 負責總管功能（分類、摘要、RAG）
   - 不需要遷移到 Island

2. **Island 取代所有其他 Assistant**
   - LEARNING, WORK, LIFE 等 → 用戶自訂 Island
   - 支持用戶創建無限個自訂分類

3. **為 Island 添加 AI 配置**
   - 新增 `systemPrompt`, `personality`, `chatStyle`
   - 每個 Island 可以有自己的 AI 個性

4. **ChatSession 遷移到 Island**
   - Schema: `assistantId` → `islandId`
   - 歷史數據遷移

5. **漸進式遷移**
   - Memory 優先（已有基礎）
   - 服務層逐步替換
   - 前端組件最後統一

---

## 📅 分階段遷移計劃

### 階段 0: 準備工作（1 週）

#### 0.1 資料備份

```bash
# 備份生產資料庫
mongodump --uri="mongodb://..." --out=./backup-$(date +%Y%m%d)

# 備份關鍵集合
mongodump --uri="mongodb://..." --collection=assistants --out=./assistants-backup
mongodump --uri="mongodb://..." --collection=memories --out=./memories-backup
mongodump --uri="mongodb://..." --collection=chat_sessions --out=./chat_sessions-backup
```

#### 0.2 創建測試環境

```bash
# 複製生產環境到測試環境
mongorestore --uri="mongodb://test-db..." ./backup-20251101
```

#### 0.3 分析現有數據

```typescript
// scripts/analyze-assistant-usage.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function analyzeData() {
  // 1. 統計每個 Assistant 的使用情況
  const assistants = await prisma.assistant.findMany({
    include: {
      _count: {
        select: {
          memories: true,
          chatSessions: true,
          chatMessages: true
        }
      }
    }
  })

  console.log('=== Assistant 使用統計 ===')
  for (const assistant of assistants) {
    console.log(`${assistant.nameChinese} (${assistant.type}):`)
    console.log(`  - Memories: ${assistant._count.memories}`)
    console.log(`  - ChatSessions: ${assistant._count.chatSessions}`)
    console.log(`  - ChatMessages: ${assistant._count.chatMessages}`)
  }

  // 2. 檢查 Memory 的雙重關聯情況
  const memories = await prisma.memory.findMany({
    select: {
      id: true,
      assistantId: true,
      islandId: true
    }
  })

  const bothNull = memories.filter(m => !m.assistantId && !m.islandId)
  const onlyAssistant = memories.filter(m => m.assistantId && !m.islandId)
  const onlyIsland = memories.filter(m => !m.assistantId && m.islandId)
  const both = memories.filter(m => m.assistantId && m.islandId)

  console.log('\n=== Memory 關聯統計 ===')
  console.log(`總數: ${memories.length}`)
  console.log(`無關聯: ${bothNull.length}`)
  console.log(`只有 assistantId: ${onlyAssistant.length}`)
  console.log(`只有 islandId: ${onlyIsland.length}`)
  console.log(`兩者都有: ${both.length}`)

  // 3. 檢查用戶是否已創建 Island
  const users = await prisma.user.findMany({
    include: {
      islands: true
    }
  })

  console.log('\n=== 用戶 Island 統計 ===')
  for (const user of users) {
    console.log(`${user.username}: ${user.islands.length} 個島嶼`)
  }
}

analyzeData()
```

---

### 階段 1: 擴展 Island Schema（1-2 週）

#### 1.1 更新 Prisma Schema

```prisma
// backend/prisma/schema.prisma

model Island {
  id               String   @id @default(auto()) @map("_id") @db.ObjectId
  userId           String   @map("user_id") @db.ObjectId

  // Order
  position         Int

  // Identity
  name             String?  // 已廢棄，僅向後兼容
  nameChinese      String
  emoji            String   @default("🏝️")
  color            String   @default("#FFB3D9")
  description      String?  @db.String

  // 🆕 AI Configuration (新增)
  systemPrompt     String?  @map("system_prompt") @db.String
  personality      String?  @db.String
  chatStyle        String?  @map("chat_style") @db.String

  // 🆕 Fallback Keywords (新增 - 用於關鍵字分類)
  keywords         String[] @default([])

  // 3D Position
  positionX        Float    @default(0) @map("position_x")
  positionY        Float    @default(0) @map("position_y")
  positionZ        Float    @default(0) @map("position_z")

  // 3D Appearance
  modelUrl         String?  @map("model_url")
  textureId        String?  @map("texture_id")
  shape            String?  @default("circle")
  customShapeData  String?  @map("custom_shape_data") @db.String
  islandHeight     Float?   @default(2.0) @map("island_height")
  islandBevel      Float?   @default(0.5) @map("island_bevel")

  // 🆕 Statistics (擴展)
  memoryCount      Int      @default(0) @map("memory_count")
  totalChats       Int      @default(0) @map("total_chats")  // 新增

  // Status
  isActive         Boolean  @default(true) @map("is_active")

  // Timestamps
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  // Relations
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  memories         Memory[]
  chatSessions     ChatSession[]  // 🆕 新增
  chatMessages     ChatMessage[]  // 🆕 新增

  @@index([userId, position])
  @@index([userId])
  @@map("islands")
}
```

#### 1.2 更新 GraphQL Schema

```graphql
# backend/src/schema.ts

type Island {
  id: ID!
  userId: ID!
  position: Int!

  # Identity
  nameChinese: String!
  emoji: String!
  color: String!
  description: String

  # 🆕 AI Configuration
  systemPrompt: String
  personality: String
  chatStyle: String
  keywords: [String!]!

  # 3D Configuration
  positionX: Float!
  positionY: Float!
  positionZ: Float!
  customShapeData: String
  islandHeight: Float
  islandBevel: Float
  shape: String
  textureId: String
  modelUrl: String

  # Statistics
  memoryCount: Int!
  totalChats: Int!  # 🆕

  # Status
  isActive: Boolean!

  # Relations
  memories: [Memory!]!
  chatSessions: [ChatSession!]!  # 🆕

  # Timestamps
  createdAt: DateTime!
  updatedAt: DateTime!
}

# 🆕 新增 Mutation
extend type Mutation {
  updateIslandAIConfig(
    id: ID!
    systemPrompt: String
    personality: String
    chatStyle: String
    keywords: [String!]
  ): Island!

  incrementIslandStats(
    id: ID!
    type: StatType!  # MEMORY | CHAT
  ): Island!
}

enum StatType {
  MEMORY
  CHAT
}
```

#### 1.3 數據庫遷移

```bash
# 推送 schema 變更
cd backend
npx prisma db push

# 確認變更
npx prisma studio
```

#### 1.4 為現有 Island 填充 AI 配置

```typescript
// scripts/migrate-assistant-to-island-ai-config.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ASSISTANT_AI_CONFIG = {
  LEARNING: {
    systemPrompt: '你是學習記錄助手，專注於幫助使用者記錄和整理學習筆記、知識點...',
    personality: '細心、條理清晰、善於總結',
    chatStyle: '條理分明、重點突出',
    keywords: ['學習', '筆記', '知識', '課程', '書籍', '閱讀', '考試', '複習']
  },
  WORK: {
    systemPrompt: '你是工作事務助手，協助使用者管理工作任務、項目進度...',
    personality: '高效、專業、目標導向',
    chatStyle: '簡潔明瞭、注重行動',
    keywords: ['工作', '項目', '任務', '會議', '郵件', '報告', 'deadline']
  },
  INSPIRATION: {
    systemPrompt: '你是靈感創意助手，幫助使用者捕捉和發展創意想法...',
    personality: '開放、創新、鼓勵探索',
    chatStyle: '啟發式、開放性問題',
    keywords: ['靈感', '創意', '想法', '點子', '設計', '創作', '藝術']
  },
  SOCIAL: {
    systemPrompt: '你是人際關係助手，協助使用者記錄和改善社交互動...',
    personality: '同理心強、善於傾聽、溫暖',
    chatStyle: '溫和、引導式',
    keywords: ['朋友', '家人', '同事', '社交', '人際', '溝通', '關係']
  },
  LIFE: {
    systemPrompt: '你是生活記錄助手，幫助使用者記錄日常生活點滴...',
    personality: '親切、隨和、生活化',
    chatStyle: '輕鬆、日常對話',
    keywords: ['生活', '日常', '飲食', '運動', '健康', '休閒', '娛樂']
  },
  GOALS: {
    systemPrompt: '你是目標規劃助手，協助使用者設定和追蹤目標...',
    personality: '激勵、堅定、支持',
    chatStyle: '目標導向、追蹤進度',
    keywords: ['目標', '規劃', '計劃', '夢想', '里程碑', '進度', '成就']
  },
  RESOURCES: {
    systemPrompt: '你是資源收藏助手，幫助使用者整理和管理各類資源...',
    personality: '整理有序、分類清晰',
    chatStyle: '結構化、標籤化',
    keywords: ['資源', '收藏', '連結', '工具', '網站', '文章', '參考']
  },
  MISC: {
    systemPrompt: '你是雜項記錄助手，處理不屬於其他分類的知識...',
    personality: '靈活、開放',
    chatStyle: '適應性強',
    keywords: ['其他', '雜項', '臨時', '隨記']
  }
}

async function migrateAIConfig() {
  // 獲取所有用戶
  const users = await prisma.user.findMany()

  for (const user of users) {
    console.log(`處理用戶: ${user.username}`)

    // 獲取用戶的所有 Island
    const islands = await prisma.island.findMany({
      where: { userId: user.id }
    })

    for (const island of islands) {
      // 嘗試根據 nameChinese 匹配 AI 配置
      let config = null

      if (island.nameChinese.includes('學習')) {
        config = ASSISTANT_AI_CONFIG.LEARNING
      } else if (island.nameChinese.includes('工作')) {
        config = ASSISTANT_AI_CONFIG.WORK
      } else if (island.nameChinese.includes('靈感') || island.nameChinese.includes('創意')) {
        config = ASSISTANT_AI_CONFIG.INSPIRATION
      } else if (island.nameChinese.includes('人際') || island.nameChinese.includes('社交')) {
        config = ASSISTANT_AI_CONFIG.SOCIAL
      } else if (island.nameChinese.includes('生活')) {
        config = ASSISTANT_AI_CONFIG.LIFE
      } else if (island.nameChinese.includes('目標') || island.nameChinese.includes('規劃')) {
        config = ASSISTANT_AI_CONFIG.GOALS
      } else if (island.nameChinese.includes('資源') || island.nameChinese.includes('收藏')) {
        config = ASSISTANT_AI_CONFIG.RESOURCES
      } else {
        config = ASSISTANT_AI_CONFIG.MISC
      }

      // 更新 Island
      await prisma.island.update({
        where: { id: island.id },
        data: {
          systemPrompt: config.systemPrompt,
          personality: config.personality,
          chatStyle: config.chatStyle,
          keywords: config.keywords
        }
      })

      console.log(`  ✅ 更新島嶼: ${island.nameChinese}`)
    }
  }

  console.log('✅ AI 配置遷移完成')
}

migrateAIConfig()
```

---

### 階段 2: 創建 IslandService（1 週）

#### 2.1 實現 IslandService

```typescript
// backend/src/services/islandService.ts

import { PrismaClient, AssistantType } from '@prisma/client'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

export class IslandService {
  // 快取機制（類似 assistantService）
  private islandsCache: Map<string, any> = new Map()
  private cacheExpiry: number = 0
  private CACHE_TTL = 5 * 60 * 1000 // 5 分鐘

  /**
   * 載入所有島嶼到快取
   */
  private async loadIslands(userId: string) {
    const now = Date.now()

    if (this.islandsCache.size > 0 && now < this.cacheExpiry) {
      return
    }

    const islands = await prisma.island.findMany({
      where: { userId, isActive: true },
      orderBy: { position: 'asc' }
    })

    this.islandsCache.clear()
    islands.forEach(island => {
      this.islandsCache.set(island.id, island)
    })

    this.cacheExpiry = now + this.CACHE_TTL

    logger.info(`[IslandService] 載入 ${islands.length} 個島嶼到快取 (userId: ${userId})`)
  }

  /**
   * 獲取用戶的所有島嶼
   */
  async getAllIslands(userId: string) {
    await this.loadIslands(userId)
    return Array.from(this.islandsCache.values())
  }

  /**
   * 根據 ID 獲取島嶼
   */
  async getIslandById(islandId: string) {
    // 嘗試從快取獲取
    if (this.islandsCache.has(islandId)) {
      return this.islandsCache.get(islandId)
    }

    // 從資料庫查詢
    const island = await prisma.island.findUnique({
      where: { id: islandId }
    })

    if (island) {
      this.islandsCache.set(islandId, island)
    }

    return island
  }

  /**
   * 🆕 根據 AssistantType 獲取對應的島嶼（向後兼容）
   * 用於 Chief Agent 分類結果映射
   */
  async getIslandByType(userId: string, type: AssistantType) {
    await this.loadIslands(userId)

    const typeMapping: Record<AssistantType, string[]> = {
      LEARNING: ['學習', 'LEARNING'],
      WORK: ['工作', 'WORK'],
      INSPIRATION: ['靈感', '創意', 'INSPIRATION'],
      SOCIAL: ['人際', '社交', 'SOCIAL'],
      LIFE: ['生活', 'LIFE'],
      GOALS: ['目標', '規劃', 'GOALS'],
      RESOURCES: ['資源', '收藏', 'RESOURCES'],
      MISC: ['雜項', '其他', 'MISC'],
      CHIEF: [] // Chief 不映射
    }

    const keywords = typeMapping[type]

    // 優先精確匹配 name
    const exactMatch = Array.from(this.islandsCache.values()).find(
      island => island.name === type
    )
    if (exactMatch) return exactMatch

    // 模糊匹配 nameChinese
    const fuzzyMatch = Array.from(this.islandsCache.values()).find(
      island => keywords.some(keyword => island.nameChinese.includes(keyword))
    )
    if (fuzzyMatch) return fuzzyMatch

    // 如果沒有匹配，返回第一個島嶼（或 null）
    const islands = Array.from(this.islandsCache.values())
    logger.warn(`[IslandService] 無法為 AssistantType ${type} 找到匹配的島嶼，使用預設島嶼`)
    return islands[0] || null
  }

  /**
   * 🆕 獲取島嶼的 systemPrompt（用於 AI 調用）
   */
  async getSystemPrompt(islandId: string): Promise<string | null> {
    const island = await this.getIslandById(islandId)
    return island?.systemPrompt || null
  }

  /**
   * 🆕 更新島嶼統計（替代 incrementAssistantStats）
   */
  async incrementIslandStats(
    islandId: string,
    type: 'memory' | 'chat'
  ): Promise<void> {
    const updateData = type === 'memory'
      ? { memoryCount: { increment: 1 } }
      : { totalChats: { increment: 1 } }

    await prisma.island.update({
      where: { id: islandId },
      data: updateData
    })

    // 清除快取，強制重新載入
    this.islandsCache.delete(islandId)

    logger.info(`[IslandService] 島嶼統計更新: ${islandId} (${type})`)
  }

  /**
   * 🆕 降級方案：關鍵字分類（替代 fallbackCategoryDetection）
   */
  async fallbackClassification(userId: string, content: string): Promise<string | null> {
    await this.loadIslands(userId)
    const islands = Array.from(this.islandsCache.values())

    const contentLower = content.toLowerCase()

    // 遍歷島嶼，計算關鍵字匹配分數
    const scores = islands.map(island => {
      const keywords = island.keywords || []
      const matchCount = keywords.filter(keyword =>
        contentLower.includes(keyword.toLowerCase())
      ).length

      return {
        islandId: island.id,
        score: matchCount
      }
    })

    // 找出最高分
    const best = scores.reduce((max, current) =>
      current.score > max.score ? current : max
    , { islandId: null, score: 0 })

    if (best.score > 0) {
      logger.info(`[IslandService] 降級分類成功: ${best.islandId} (分數: ${best.score})`)
      return best.islandId
    }

    logger.warn('[IslandService] 降級分類失敗，無法匹配')
    return null
  }

  /**
   * 清除快取（用於測試或強制刷新）
   */
  clearCache() {
    this.islandsCache.clear()
    this.cacheExpiry = 0
  }
}

export const islandService = new IslandService()
```

#### 2.2 單元測試

```typescript
// backend/src/services/__tests__/islandService.test.ts

import { islandService } from '../islandService'
import { prismaMock } from '../../test-utils/prismaMock'

describe('IslandService', () => {
  beforeEach(() => {
    islandService.clearCache()
  })

  it('should get island by type - LEARNING', async () => {
    const mockIslands = [
      { id: '1', userId: 'user1', nameChinese: '學習島', name: 'LEARNING', keywords: ['學習', '筆記'] },
      { id: '2', userId: 'user1', nameChinese: '工作島', name: 'WORK', keywords: ['工作', '項目'] }
    ]

    prismaMock.island.findMany.mockResolvedValue(mockIslands)

    const result = await islandService.getIslandByType('user1', 'LEARNING')

    expect(result?.id).toBe('1')
    expect(result?.nameChinese).toBe('學習島')
  })

  it('should increment island stats', async () => {
    prismaMock.island.update.mockResolvedValue({} as any)

    await islandService.incrementIslandStats('island1', 'memory')

    expect(prismaMock.island.update).toHaveBeenCalledWith({
      where: { id: 'island1' },
      data: { memoryCount: { increment: 1 } }
    })
  })

  it('should fallback classify by keywords', async () => {
    const mockIslands = [
      { id: '1', userId: 'user1', keywords: ['學習', '筆記', '知識'] },
      { id: '2', userId: 'user1', keywords: ['工作', '項目'] }
    ]

    prismaMock.island.findMany.mockResolvedValue(mockIslands)

    const result = await islandService.fallbackClassification('user1', '我今天學習了 React 筆記')

    expect(result).toBe('1')
  })
})
```

---

### 階段 3: 遷移 Memory 數據（1-2 週）

#### 3.1 為所有 Memory 補齊 islandId

```typescript
// scripts/migrate-memory-assistant-to-island.ts

import { PrismaClient } from '@prisma/client'
import { islandService } from '../src/services/islandService'

const prisma = new PrismaClient()

async function migrateMemories() {
  console.log('開始遷移 Memory...')

  // 1. 獲取所有只有 assistantId 但沒有 islandId 的 Memory
  const memories = await prisma.memory.findMany({
    where: {
      assistantId: { not: null },
      islandId: null
    },
    include: {
      assistant: true,
      user: true
    }
  })

  console.log(`找到 ${memories.length} 條需要遷移的記憶`)

  let successCount = 0
  let failCount = 0

  for (const memory of memories) {
    try {
      if (!memory.assistant || !memory.user) {
        console.warn(`⚠️  跳過記憶 ${memory.id}: 缺少 assistant 或 user`)
        failCount++
        continue
      }

      // 根據 assistant.type 找到對應的 Island
      const island = await islandService.getIslandByType(
        memory.user.id,
        memory.assistant.type
      )

      if (!island) {
        console.warn(`⚠️  記憶 ${memory.id}: 無法為 ${memory.assistant.type} 找到對應島嶼`)
        failCount++
        continue
      }

      // 更新 Memory
      await prisma.memory.update({
        where: { id: memory.id },
        data: { islandId: island.id }
      })

      console.log(`✅ 記憶 ${memory.id}: ${memory.assistant.nameChinese} → ${island.nameChinese}`)
      successCount++

    } catch (error) {
      console.error(`❌ 記憶 ${memory.id} 遷移失敗:`, error)
      failCount++
    }
  }

  console.log('\n=== 遷移完成 ===')
  console.log(`✅ 成功: ${successCount}`)
  console.log(`❌ 失敗: ${failCount}`)
  console.log(`📊 總數: ${memories.length}`)
}

migrateMemories()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
```

#### 3.2 重新計算 Island 統計

```typescript
// scripts/recalculate-island-stats.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function recalculateStats() {
  console.log('重新計算 Island 統計...')

  const islands = await prisma.island.findMany()

  for (const island of islands) {
    // 計算記憶數
    const memoryCount = await prisma.memory.count({
      where: { islandId: island.id }
    })

    // 計算聊天數（暫時設為 0，待 ChatSession 遷移後再計算）
    const totalChats = 0

    // 更新統計
    await prisma.island.update({
      where: { id: island.id },
      data: {
        memoryCount,
        totalChats
      }
    })

    console.log(`✅ ${island.nameChinese}: ${memoryCount} 條記憶`)
  }

  console.log('✅ 統計計算完成')
}

recalculateStats()
```

#### 3.3 驗證數據完整性

```typescript
// scripts/verify-memory-migration.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyMigration() {
  console.log('=== 驗證 Memory 遷移 ===\n')

  const total = await prisma.memory.count()
  const onlyAssistant = await prisma.memory.count({
    where: { assistantId: { not: null }, islandId: null }
  })
  const onlyIsland = await prisma.memory.count({
    where: { assistantId: null, islandId: { not: null } }
  })
  const both = await prisma.memory.count({
    where: { assistantId: { not: null }, islandId: { not: null } }
  })
  const neither = await prisma.memory.count({
    where: { assistantId: null, islandId: null }
  })

  console.log(`總記憶數: ${total}`)
  console.log(`只有 assistantId: ${onlyAssistant}`)
  console.log(`只有 islandId: ${onlyIsland}`)
  console.log(`兩者都有: ${both}`)
  console.log(`兩者都無: ${neither}`)

  if (onlyAssistant > 0) {
    console.warn(`\n⚠️  仍有 ${onlyAssistant} 條記憶只有 assistantId，需要手動處理`)
  } else {
    console.log('\n✅ 所有記憶都已遷移到 Island')
  }
}

verifyMigration()
```

---

### 階段 4: 更新服務層（2-3 週）

#### 4.1 更新 chiefAgentService.ts

**目標**: 使用 `islandService` 替代 `assistantService`（保留 Chief 邏輯）

```typescript
// backend/src/services/chiefAgentService.ts

import { assistantService } from './assistantService'  // ⚠️ 只保留 Chief 相關
import { islandService } from './islandService'  // 🆕

export class ChiefAgentService {

  /**
   * 處理並創建記憶（已適配 Island）
   */
  async processAndCreateMemory(
    userId: string,
    content: string,
    category: AssistantType
  ) {
    // ⚠️ 不再使用 getAssistantById，改用 getIslandByType
    const island = await islandService.getIslandByType(userId, category)

    if (!island) {
      throw new Error(`無法為分類 ${category} 找到對應的島嶼`)
    }

    // 獲取 Island 的 systemPrompt
    const systemPrompt = island.systemPrompt || this.getDefaultPrompt(category)

    // AI 處理邏輯...
    const aiAnalysis = await this.callGemini(systemPrompt, content)

    // 創建記憶（關聯 islandId）
    const memory = await prisma.memory.create({
      data: {
        userId,
        islandId: island.id,  // 🆕 使用 islandId
        rawContent: content,
        aiAnalysis,
        category,
        // assistantId: ...  // ⚠️ 移除（向後兼容期可保留）
      }
    })

    // 更新統計
    await islandService.incrementIslandStats(island.id, 'memory')  // 🆕

    return memory
  }

  /**
   * 智能分類（保留 Chief 邏輯）
   */
  async classifyContent(content: string): Promise<AssistantType> {
    const chief = await assistantService.getChiefAssistant()  // ⚠️ 保留

    // Chief AI 分類邏輯...
    const classification = await this.callGeminiForClassification(
      chief.systemPrompt,
      content
    )

    return classification.category as AssistantType
  }

  /**
   * 🆕 降級分類（使用 Island 關鍵字）
   */
  async fallbackClassify(userId: string, content: string): Promise<string | null> {
    return await islandService.fallbackClassification(userId, content)
  }

  /**
   * 知識上傳流式處理（已適配 Island）
   */
  async uploadKnowledgeStream(userId: string, content: string) {
    // 1. Chief 分類
    const category = await this.classifyContent(content)

    // 2. 獲取對應 Island
    const island = await islandService.getIslandByType(userId, category)

    if (!island) {
      // 降級方案
      const islandId = await this.fallbackClassify(userId, content)
      if (!islandId) {
        throw new Error('無法分類到任何島嶼')
      }
    }

    // 3. 創建記憶（關聯 islandId）
    const memory = await prisma.memory.create({
      data: {
        userId,
        islandId: island.id,  // 🆕
        rawContent: content,
        category
      }
    })

    // 4. 更新統計
    await islandService.incrementIslandStats(island.id, 'memory')

    return { memory, island }
  }
}
```

#### 4.2 更新 subAgentService.ts

**目標**: 完全移除 `assistantService` 依賴

```typescript
// backend/src/services/subAgentService.ts

import { islandService } from './islandService'  // 🆕

export class SubAgentService {

  /**
   * 評估知識相關性（使用 Island）
   */
  private async evaluateKnowledge(
    islandId: string,  // 🆕 改為 islandId
    distribution: any
  ) {
    const island = await islandService.getIslandById(islandId)  // 🆕

    if (!island) {
      throw new Error(`找不到島嶼: ${islandId}`)
    }

    // 使用 Island 的 systemPrompt
    const systemPrompt = island.systemPrompt || '...'  // 🆕

    // AI 評估邏輯...
    const evaluation = await this.callGemini(systemPrompt, distribution.chiefSummary)

    return evaluation
  }

  /**
   * 處理知識分發（Island-based）
   */
  async processDistributionWithIslands(userId: string, distributionId: string) {
    // 1. 獲取分發記錄
    const distribution = await prisma.knowledgeDistribution.findUnique({
      where: { id: distributionId }
    })

    // 2. Chief 推薦的主要分類
    const primaryCategory = distribution.identifiedTopics[0]

    // 3. 獲取對應 Island
    const primaryIsland = await islandService.getIslandByType(userId, primaryCategory)

    if (!primaryIsland) {
      throw new Error(`無法為 ${primaryCategory} 找到對應島嶼`)
    }

    // 4. 評估相關性
    const evaluation = await this.evaluateKnowledge(primaryIsland.id, distribution)

    // 5. 如果高相關性 + 高置信度，早期退出
    if (evaluation.relevanceScore >= 0.9 && evaluation.confidence >= 0.9) {
      logger.info('[Sub-Agents] 主要島嶼高相關性，跳過其他評估')

      const memory = await this.createMemoryWithIsland(
        userId,
        primaryIsland.id,  // 🆕
        distribution,
        evaluation
      )

      return {
        agentDecisions: [evaluation],
        memoriesCreated: [memory],
        categoriesInfo: [{
          memoryId: memory.id,
          categoryName: primaryIsland.nameChinese,  // 🆕
          categoryEmoji: primaryIsland.emoji,        // 🆕
          islandName: primaryIsland.nameChinese      // 🆕
        }]
      }
    }

    // 6. 並發評估其他島嶼
    const otherIslands = await islandService.getAllIslands(userId)
    const evaluations = await Promise.all(
      otherIslands
        .filter(i => i.id !== primaryIsland.id)
        .map(island => this.evaluateKnowledge(island.id, distribution))
    )

    // 7. 創建記憶
    const memories = []
    const categoriesInfo = []

    for (const eval of evaluations) {
      if (eval.shouldStore) {
        const island = await islandService.getIslandById(eval.islandId)
        const memory = await this.createMemoryWithIsland(userId, island.id, distribution, eval)

        memories.push(memory)
        categoriesInfo.push({
          memoryId: memory.id,
          categoryName: island.nameChinese,
          categoryEmoji: island.emoji,
          islandName: island.nameChinese
        })
      }
    }

    return {
      agentDecisions: evaluations,
      memoriesCreated: memories,
      categoriesInfo
    }
  }

  /**
   * 創建記憶（關聯 Island）
   */
  private async createMemoryWithIsland(
    userId: string,
    islandId: string,  // 🆕 改為 islandId
    distribution: any,
    evaluation: any
  ) {
    const memory = await prisma.memory.create({
      data: {
        userId,
        islandId,  // 🆕
        distributionId: distribution.id,
        rawContent: distribution.rawContent,
        summary: distribution.chiefSummary,
        keyPoints: evaluation.keyInsights,
        relevanceScore: evaluation.relevanceScore,
        category: evaluation.suggestedCategory,
        tags: evaluation.suggestedTags,
        // assistantId: ...  // ⚠️ 移除
      }
    })

    // 更新統計
    await islandService.incrementIslandStats(islandId, 'memory')  // 🆕

    return memory
  }
}
```

#### 4.3 更新 memoryService.ts

**目標**: 優先使用 `islandId` 查詢

```typescript
// backend/src/services/memoryService.ts

export class MemoryService {

  /**
   * 獲取記憶列表（優先 Island）
   */
  async getMemories(userId: string, filters: any) {
    const where: any = { userId }

    // 🆕 優先使用 islandId 過濾
    if (filters.islandId) {
      where.islandId = filters.islandId
    } else if (filters.assistantId) {
      // ⚠️ 向後兼容：如果傳入 assistantId，也支援
      logger.warn('[MemoryService] 仍在使用 assistantId 過濾，建議改用 islandId')
      where.assistantId = filters.assistantId
    }

    if (filters.category) {
      where.category = filters.category
    }

    // 查詢時 include island（而非 assistant）
    const memories = await prisma.memory.findMany({
      where,
      include: {
        island: true,  // 🆕
        // assistant: true,  // ⚠️ 移除（向後兼容期可保留）
      },
      orderBy: { createdAt: 'desc' }
    })

    return memories
  }
}
```

---

### 階段 5: ChatSession 遷移（2-3 週）

#### 5.1 更新 Prisma Schema

```prisma
model ChatSession {
  id               String   @id @default(auto()) @map("_id") @db.ObjectId
  userId           String   @map("user_id") @db.ObjectId

  // ⚠️ 改為 nullable + 添加 islandId
  assistantId      String?  @map("assistant_id") @db.ObjectId  // 🆕 nullable
  islandId         String   @map("island_id") @db.ObjectId     // 🆕 新增

  // ... 其他欄位

  // Relations
  user             User     @relation(...)
  assistant        Assistant? @relation(...)  // 🆕 nullable
  island           Island   @relation(...)    // 🆕 新增

  @@index([userId, islandId])  // 🆕
}

model ChatMessage {
  id               String   @id @default(auto()) @map("_id") @db.ObjectId
  userId           String   @map("user_id") @db.ObjectId

  // ⚠️ 改為 nullable + 添加 islandId
  assistantId      String?  @map("assistant_id") @db.ObjectId  // 🆕 nullable
  islandId         String   @map("island_id") @db.ObjectId     // 🆕 新增
  sessionId        String   @map("session_id") @db.ObjectId

  // ... 其他欄位

  // Relations
  user             User     @relation(...)
  assistant        Assistant? @relation(...)  // 🆕 nullable
  island           Island   @relation(...)    // 🆕 新增
  session          ChatSession @relation(...)

  @@index([userId, islandId])  // 🆕
}
```

#### 5.2 遷移 ChatSession 數據

```typescript
// scripts/migrate-chatsession-to-island.ts

import { PrismaClient } from '@prisma/client'
import { islandService } from '../src/services/islandService'

const prisma = new PrismaClient()

async function migrateChatSessions() {
  console.log('開始遷移 ChatSession...')

  // 1. 獲取所有 ChatSession
  const sessions = await prisma.chatSession.findMany({
    include: {
      assistant: true,
      user: true
    }
  })

  console.log(`找到 ${sessions.length} 個會話`)

  let successCount = 0
  let failCount = 0

  for (const session of sessions) {
    try {
      if (!session.assistant || !session.user) {
        console.warn(`⚠️  跳過會話 ${session.id}: 缺少 assistant 或 user`)
        failCount++
        continue
      }

      // 根據 assistant.type 找到對應 Island
      const island = await islandService.getIslandByType(
        session.user.id,
        session.assistant.type
      )

      if (!island) {
        console.warn(`⚠️  會話 ${session.id}: 無法為 ${session.assistant.type} 找到對應島嶼`)
        failCount++
        continue
      }

      // 更新 ChatSession
      await prisma.chatSession.update({
        where: { id: session.id },
        data: { islandId: island.id }
      })

      console.log(`✅ 會話 ${session.id}: ${session.assistant.nameChinese} → ${island.nameChinese}`)
      successCount++

    } catch (error) {
      console.error(`❌ 會話 ${session.id} 遷移失敗:`, error)
      failCount++
    }
  }

  console.log('\n=== ChatSession 遷移完成 ===')
  console.log(`✅ 成功: ${successCount}`)
  console.log(`❌ 失敗: ${failCount}`)
}

async function migrateChatMessages() {
  console.log('\n開始遷移 ChatMessage...')

  // 獲取所有 ChatMessage
  const messages = await prisma.chatMessage.findMany({
    include: {
      session: true  // 從 session 獲取 islandId
    }
  })

  console.log(`找到 ${messages.length} 條訊息`)

  let successCount = 0

  for (const message of messages) {
    if (!message.session.islandId) {
      console.warn(`⚠️  訊息 ${message.id}: session 沒有 islandId`)
      continue
    }

    await prisma.chatMessage.update({
      where: { id: message.id },
      data: { islandId: message.session.islandId }
    })

    successCount++

    if (successCount % 100 === 0) {
      console.log(`已處理 ${successCount} 條訊息...`)
    }
  }

  console.log(`\n✅ ChatMessage 遷移完成: ${successCount} 條`)
}

async function run() {
  await migrateChatSessions()
  await migrateChatMessages()
}

run()
```

#### 5.3 更新 chatSessionService.ts

```typescript
// backend/src/services/chatSessionService.ts

export class ChatSessionService {

  /**
   * 創建會話（使用 Island）
   */
  async createSession(userId: string, islandId: string) {
    const session = await prisma.chatSession.create({
      data: {
        userId,
        islandId,  // 🆕 使用 islandId
        // assistantId: ...  // ⚠️ 移除
      },
      include: {
        island: true  // 🆕
      }
    })

    return session
  }

  /**
   * 獲取用戶會話列表
   */
  async getUserSessions(userId: string, islandId?: string) {
    const where: any = { userId }

    if (islandId) {
      where.islandId = islandId  // 🆕
    }

    const sessions = await prisma.chatSession.findMany({
      where,
      include: {
        island: true,  // 🆕
        // assistant: true,  // ⚠️ 移除
      },
      orderBy: { lastMessageAt: 'desc' }
    })

    return sessions
  }
}
```

---

### 階段 6: 前端遷移（2 週）

#### 6.1 更新 IslandView 路由和查詢

```typescript
// frontend/src/pages/IslandView/index.tsx

import { useQuery } from '@apollo/client'
import { useParams } from 'react-router-dom'
import { GET_ISLAND } from '../../graphql/island'  // 🆕 改用 GET_ISLAND
import { useAuthStore } from '../../stores/authStore'

export function IslandView() {
  const { islandId } = useParams()  // 🆕 改為 islandId
  const { user } = useAuthStore()

  // 🆕 使用 GET_ISLAND 而非 GET_ASSISTANTS
  const { data, loading } = useQuery(GET_ISLAND, {
    variables: {
      id: islandId,
      userId: user?.id  // 🆕 添加用戶驗證
    }
  })

  if (loading) return <Loading />

  const island = data?.island

  if (!island) {
    return <div>找不到島嶼</div>
  }

  // 🆕 驗證島嶼所有權
  if (island.userId !== user?.id) {
    return <div>無權訪問此島嶼</div>
  }

  return (
    <div>
      <h1>{island.emoji} {island.nameChinese}</h1>

      {/* 3D 場景 */}
      <Canvas>
        <IslandScene
          color={island.color}
          position={{ x: island.positionX, y: island.positionY, z: island.positionZ }}
          shape={island.shape}
          textureId={island.textureId}
          modelUrl={island.modelUrl}
        />
      </Canvas>

      {/* 記憶列表 */}
      <MemoryList islandId={island.id} />
    </div>
  )
}
```

#### 6.2 更新路由配置

```typescript
// frontend/src/App.tsx

import { BrowserRouter, Routes, Route } from 'react-router-dom'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ⚠️ 舊路由（向後兼容） */}
        <Route path="/island/:assistantId" element={<IslandViewCompat />} />

        {/* 🆕 新路由 */}
        <Route path="/islands/:islandId" element={<IslandView />} />
      </Routes>
    </BrowserRouter>
  )
}

// 向後兼容組件（將 assistantId 轉換為 islandId）
function IslandViewCompat() {
  const { assistantId } = useParams()
  const { user } = useAuthStore()

  // 查詢 Island（根據 Assistant 映射）
  const { data } = useQuery(GET_ISLANDS, {
    variables: { userId: user?.id }
  })

  // 找到對應的 Island（根據名稱或其他欄位匹配）
  const island = data?.islands.find(i => {
    // 簡單映射邏輯
    return i.name === assistantId || i.id === assistantId
  })

  if (!island) {
    return <Navigate to="/islands" />
  }

  // 重定向到新路由
  return <Navigate to={`/islands/${island.id}`} replace />
}
```

#### 6.3 更新 IslandEditorModal

```typescript
// frontend/src/components/IslandEditorModal.tsx

import { useMutation } from '@apollo/client'
import { UPDATE_ISLAND } from '../graphql/island'  // 🆕 改用 UPDATE_ISLAND

export function IslandEditorModal({ islandId, onClose }: Props) {
  const [updateIsland] = useMutation(UPDATE_ISLAND, {  // 🆕
    refetchQueries: ['GetIsland', 'GetIslands']
  })

  const handleSave = async () => {
    await updateIsland({
      variables: {
        id: islandId,
        color: selectedColor,
        textureId: selectedTexture,
        shape: selectedShape,
        customShapeData: JSON.stringify(customShape),
        islandHeight,
        islandBevel
      }
    })

    onClose()
  }

  return (
    <Modal>
      {/* 編輯器 UI */}
      <ColorPicker value={selectedColor} onChange={setSelectedColor} />
      <TexturePicker value={selectedTexture} onChange={setSelectedTexture} />
      <ShapePicker value={selectedShape} onChange={setSelectedShape} />

      <Button onClick={handleSave}>保存</Button>
    </Modal>
  )
}
```

#### 6.4 添加 Island AI 配置編輯器

```typescript
// frontend/src/components/IslandAIConfigModal.tsx

import { useMutation } from '@apollo/client'
import { UPDATE_ISLAND_AI_CONFIG } from '../graphql/island'

export function IslandAIConfigModal({ islandId, onClose }: Props) {
  const [systemPrompt, setSystemPrompt] = useState('')
  const [personality, setPersonality] = useState('')
  const [chatStyle, setChatStyle] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])

  const [updateAIConfig] = useMutation(UPDATE_ISLAND_AI_CONFIG)

  const handleSave = async () => {
    await updateAIConfig({
      variables: {
        id: islandId,
        systemPrompt,
        personality,
        chatStyle,
        keywords
      }
    })

    onClose()
  }

  return (
    <Modal>
      <h2>AI 配置</h2>

      <Textarea
        label="System Prompt"
        value={systemPrompt}
        onChange={setSystemPrompt}
        placeholder="這個島嶼助手的角色定位..."
      />

      <Input
        label="個性"
        value={personality}
        onChange={setPersonality}
        placeholder="例如：細心、條理清晰、善於總結"
      />

      <Input
        label="對話風格"
        value={chatStyle}
        onChange={setChatStyle}
        placeholder="例如：條理分明、重點突出"
      />

      <TagInput
        label="關鍵字（用於自動分類）"
        value={keywords}
        onChange={setKeywords}
        placeholder="例如：學習、筆記、知識"
      />

      <Button onClick={handleSave}>保存</Button>
    </Modal>
  )
}
```

---

### 階段 7: GraphQL Resolver 遷移（1 週）

#### 7.1 更新 Memory Resolvers

```typescript
// backend/src/resolvers/memoryResolvers.ts

export const memoryResolvers = {
  Query: {
    memories: async (_, { userId, islandId, filters }, { prisma }) => {
      const where: any = { userId }

      // 🆕 優先使用 islandId
      if (islandId) {
        where.islandId = islandId
      }

      return await prisma.memory.findMany({
        where,
        include: {
          island: true,  // 🆕
          // assistant: true  // ⚠️ 移除（向後兼容期可保留）
        }
      })
    }
  },

  Memory: {
    // 🆕 添加 island resolver
    island: async (parent, _, { prisma }) => {
      if (!parent.islandId) return null

      return await prisma.island.findUnique({
        where: { id: parent.islandId }
      })
    },

    // ⚠️ 保留 assistant resolver（向後兼容）
    assistant: async (parent, _, { prisma }) => {
      if (!parent.assistantId) return null

      return await prisma.assistant.findUnique({
        where: { id: parent.assistantId }
      })
    }
  }
}
```

#### 7.2 創建/更新 Island Resolvers

```typescript
// backend/src/resolvers/islandResolvers.ts

import { islandService } from '../services/islandService'

export const islandResolvers = {
  Query: {
    islands: async (_, { userId }, { prisma }) => {
      return await islandService.getAllIslands(userId)
    },

    island: async (_, { id, userId }, { prisma }) => {
      const island = await islandService.getIslandById(id)

      // 驗證所有權
      if (island && island.userId !== userId) {
        throw new Error('無權訪問此島嶼')
      }

      return island
    }
  },

  Mutation: {
    createIsland: async (_, { input }, { user, prisma }) => {
      if (!user) throw new Error('未登入')

      // 獲取當前最大 position
      const maxPosition = await prisma.island.findFirst({
        where: { userId: user.id },
        orderBy: { position: 'desc' },
        select: { position: true }
      })

      return await prisma.island.create({
        data: {
          ...input,
          userId: user.id,
          position: (maxPosition?.position || 0) + 1
        }
      })
    },

    updateIsland: async (_, { id, input }, { user, prisma }) => {
      if (!user) throw new Error('未登入')

      // 驗證所有權
      const island = await prisma.island.findUnique({ where: { id } })
      if (island?.userId !== user.id) {
        throw new Error('無權修改此島嶼')
      }

      return await prisma.island.update({
        where: { id },
        data: input
      })
    },

    // 🆕 AI 配置更新
    updateIslandAIConfig: async (_, { id, systemPrompt, personality, chatStyle, keywords }, { user, prisma }) => {
      if (!user) throw new Error('未登入')

      const island = await prisma.island.findUnique({ where: { id } })
      if (island?.userId !== user.id) {
        throw new Error('無權修改此島嶼')
      }

      return await prisma.island.update({
        where: { id },
        data: {
          systemPrompt,
          personality,
          chatStyle,
          keywords
        }
      })
    },

    // 🆕 統計更新
    incrementIslandStats: async (_, { id, type }, { user, prisma }) => {
      await islandService.incrementIslandStats(id, type.toLowerCase())
      return await islandService.getIslandById(id)
    }
  },

  Island: {
    memories: async (parent, { limit, offset }, { prisma }) => {
      return await prisma.memory.findMany({
        where: { islandId: parent.id },
        take: limit || 50,
        skip: offset || 0,
        orderBy: { createdAt: 'desc' }
      })
    },

    chatSessions: async (parent, _, { prisma }) => {
      return await prisma.chatSession.findMany({
        where: { islandId: parent.id },
        orderBy: { lastMessageAt: 'desc' }
      })
    }
  }
}
```

#### 7.3 標記 Assistant Resolvers 為 deprecated

```typescript
// backend/src/resolvers/assistantResolvers.ts

export const assistantResolvers = {
  Query: {
    assistants: async (_, __, { prisma }) => {
      logger.warn('[assistantResolvers] assistants query is deprecated, use islands instead')
      // ⚠️ 保留功能，但記錄警告
      return await prisma.assistant.findMany()
    },

    assistant: async (_, { id }, { prisma }) => {
      logger.warn('[assistantResolvers] assistant query is deprecated, use island instead')
      return await prisma.assistant.findUnique({ where: { id } })
    },

    // ⚠️ Chief 相關查詢保留
    chiefAssistant: async (_, __, { prisma }) => {
      return await prisma.assistant.findUnique({
        where: { type: 'CHIEF' }
      })
    }
  },

  Mutation: {
    updateAssistant: async (_, { id, input }, { prisma }) => {
      logger.warn('[assistantResolvers] updateAssistant is deprecated, use updateIsland instead')
      // ⚠️ 保留功能（因為 Assistant 和 Island 共享資料表）
      return await prisma.assistant.update({
        where: { id },
        data: input
      })
    }
  }
}
```

---

### 階段 8: 清理與優化（1 週）

#### 8.1 移除 Assistant Model（可選）

**⚠️ 重要決策：是否完全移除 Assistant？**

**選項 A: 完全移除 Assistant**
- ✅ 代碼庫徹底清理
- ✅ 概念統一（只有 Island）
- ❌ 失去與舊 API 的兼容性
- ❌ Chief 需要特殊處理

**選項 B: 保留 Chief Assistant（推薦）**
- ✅ Chief 作為系統級服務
- ✅ 向後兼容性
- ⚠️ 仍有兩套概念（Chief + Island）

**選項 C: 保留整個 Assistant Model（不推薦）**
- ✅ 完全向後兼容
- ❌ 代碼混亂
- ❌ 維護成本高

**建議：選擇選項 B - 保留 Chief Assistant**

```prisma
// 保留 Chief Assistant
model Assistant {
  id               String   @id @default(auto()) @map("_id") @db.ObjectId
  type             AssistantType @unique
  name             String   @unique
  nameChinese      String
  emoji            String
  systemPrompt     String   @db.String
  personality      String   @db.String

  // ⚠️ 只保留 CHIEF 類型
  @@map("assistants")
}

// 刪除其他 AssistantType（只保留 CHIEF）
enum AssistantType {
  CHIEF

  @@map("assistant_type")
}
```

#### 8.2 移除冗餘代碼

**後端清理清單**:
```typescript
// ❌ 可移除的文件
backend/src/services/assistantService.ts  // ⚠️ 保留 Chief 相關功能

// ❌ 可移除的 Resolvers
backend/src/resolvers/assistantResolvers.ts  // ⚠️ 只保留 chiefAssistant query

// ❌ 可移除的 GraphQL Types
type Assistant (除了 Chief)
enum AssistantType (除了 CHIEF)
```

**前端清理清單**:
```typescript
// ❌ 可移除的文件
frontend/src/types/assistant.ts  // ⚠️ 保留 Chief 類型定義
frontend/src/graphql/assistant.ts  // ⚠️ 只保留 GET_CHIEF_ASSISTANT

// ❌ 可移除的查詢
GET_ASSISTANTS
GET_ASSISTANT
GET_ASSISTANT_BY_TYPE
CLASSIFY_AND_CREATE (改用 Island-based)
```

#### 8.3 更新文檔

**需要更新的文檔**:
1. **API 文檔** - 標記 Assistant API 為 deprecated
2. **遷移指南** - 提供 Assistant → Island 轉換對照表
3. **開發者文檔** - 更新架構圖和數據流程
4. **用戶手冊** - 更新 UI 截圖和功能說明

```markdown
# API Migration Guide

## Deprecated APIs (仍可用，但建議遷移)

### Queries
- ~~`assistants`~~ → `islands(userId: ID!)`
- ~~`assistant(id: ID!)`~~ → `island(id: ID!, userId: ID!)`
- ~~`assistantByType(type: AssistantType!)`~~ → 使用 `islands` 並根據 nameChinese 過濾

### Mutations
- ~~`updateAssistant(...)`~~ → `updateIsland(...)`
- ~~`classifyAndCreate(...)`~~ → 使用 `uploadKnowledge` (自動分類到 Island)

## Breaking Changes

### Memory
- `Memory.assistant` → `Memory.island`
- `Memory.assistantId` → `Memory.islandId`

### ChatSession
- `ChatSession.assistant` → `ChatSession.island`
- `ChatSession.assistantId` → `ChatSession.islandId`
```

---

## 📈 遷移進度追蹤

### 檢查清單

#### 階段 0: 準備工作
- [ ] 生產資料庫備份
- [ ] 創建測試環境
- [ ] 分析現有數據（執行 analyze-assistant-usage.ts）
- [ ] 制定回滾計劃

#### 階段 1: 擴展 Island Schema
- [ ] 更新 Prisma Schema（添加 AI 配置欄位）
- [ ] 更新 GraphQL Schema
- [ ] 執行資料庫遷移（npx prisma db push）
- [ ] 為現有 Island 填充 AI 配置
- [ ] 驗證 Island 資料完整性

#### 階段 2: 創建 IslandService
- [ ] 實現 IslandService
- [ ] 編寫單元測試
- [ ] 集成到現有服務

#### 階段 3: 遷移 Memory 數據
- [ ] 執行 Memory 遷移腳本（補齊 islandId）
- [ ] 重新計算 Island 統計
- [ ] 驗證數據完整性
- [ ] 測試 Memory 查詢（同時支援 assistantId 和 islandId）

#### 階段 4: 更新服務層
- [ ] 更新 chiefAgentService（使用 islandService）
- [ ] 更新 subAgentService（完全移除 assistantService 依賴）
- [ ] 更新 memoryService（優先使用 islandId）
- [ ] 測試服務層功能

#### 階段 5: ChatSession 遷移
- [ ] 更新 Prisma Schema（assistantId nullable, 添加 islandId）
- [ ] 執行 ChatSession 遷移腳本
- [ ] 執行 ChatMessage 遷移腳本
- [ ] 更新 chatSessionService
- [ ] 測試聊天功能

#### 階段 6: 前端遷移
- [ ] 更新 IslandView（改用 GET_ISLAND + userId 驗證）
- [ ] 更新路由配置（/islands/:islandId）
- [ ] 更新 IslandEditorModal（改用 UPDATE_ISLAND）
- [ ] 添加 Island AI 配置編輯器
- [ ] 測試前端功能

#### 階段 7: GraphQL Resolver 遷移
- [ ] 更新 Memory Resolvers（添加 island resolver）
- [ ] 更新/創建 Island Resolvers
- [ ] 標記 Assistant Resolvers 為 deprecated
- [ ] 測試 GraphQL API

#### 階段 8: 清理與優化
- [ ] 決定 Assistant Model 處理方式（保留 Chief / 完全移除）
- [ ] 移除冗餘代碼
- [ ] 更新文檔
- [ ] 性能優化（查詢效率測試）
- [ ] 最終驗收測試

#### 生產部署
- [ ] 在測試環境完整測試所有功能
- [ ] 準備生產環境遷移腳本
- [ ] 安排停機維護時間（如需要）
- [ ] 執行生產環境遷移
- [ ] 監控系統運行狀態
- [ ] 準備回滾方案（以防萬一）

---

## 🚨 風險管理

### 高風險項目

#### 1. ChatSession 遷移失敗

**風險**: ChatSession Schema 變更導致現有對話無法訪問

**緩解措施**:
- 先在測試環境完整測試
- 遷移腳本包含資料驗證
- 保留 assistantId 作為 fallback
- 準備回滾腳本

**回滾計劃**:
```sql
-- 恢復 ChatSession Schema
db.chat_sessions.updateMany({}, { $unset: { island_id: "" } })

-- 將 assistantId 改回 required（需要代碼層面支持）
```

#### 2. Memory 數據遷移不完整

**風險**: 部分 Memory 未正確關聯到 Island

**緩解措施**:
- 遷移前統計數據（總數、各狀態數量）
- 遷移後驗證數據（verify-memory-migration.ts）
- 手動處理無法自動遷移的記錄

**補救措施**:
```typescript
// 手動補齊遺漏的 Memory
async function fixOrphanMemories() {
  const orphans = await prisma.memory.findMany({
    where: { assistantId: { not: null }, islandId: null }
  })

  for (const memory of orphans) {
    // 手動分配到預設 Island 或提示用戶選擇
    console.log(`需要手動處理: ${memory.id}`)
  }
}
```

#### 3. 統計數據不準確

**風險**: Island.memoryCount 與實際不符

**緩解措施**:
- 定期重新計算統計
- 創建監控指標
- 提供手動修復腳本

**修復腳本**:
```typescript
// scripts/fix-island-stats.ts
async function fixStats() {
  const islands = await prisma.island.findMany()

  for (const island of islands) {
    const actualCount = await prisma.memory.count({
      where: { islandId: island.id }
    })

    if (actualCount !== island.memoryCount) {
      console.warn(`島嶼 ${island.nameChinese} 統計錯誤: 預期 ${island.memoryCount}, 實際 ${actualCount}`)

      await prisma.island.update({
        where: { id: island.id },
        data: { memoryCount: actualCount }
      })
    }
  }
}
```

### 中風險項目

#### 4. AI 配置缺失導致功能異常

**風險**: Island 沒有 systemPrompt，AI 調用失敗

**緩解措施**:
- 遷移時為所有 Island 填充預設 AI 配置
- AI 調用時使用 fallback prompt
- 提供 UI 讓用戶自訂 AI 配置

**Fallback 邏輯**:
```typescript
const systemPrompt = island.systemPrompt || getDefaultPrompt(island.nameChinese)

function getDefaultPrompt(islandName: string): string {
  if (islandName.includes('學習')) {
    return '你是學習記錄助手...'
  }
  // ...其他分類
  return '你是記憶助手，幫助使用者記錄和整理知識。'
}
```

#### 5. 前端向後兼容性問題

**風險**: 舊路由 `/island/:assistantId` 失效

**緩解措施**:
- 創建兼容路由（IslandViewCompat）
- 自動重定向到新路由
- 更新所有內部連結

### 低風險項目

#### 6. GraphQL API 向後兼容性

**風險**: 舊 API 調用失敗

**緩解措施**:
- 保留 deprecated APIs
- 添加警告日誌
- 提供遷移時間窗口（3-6 個月）

---

## 💰 成本估算

### 開發時間

| 階段 | 時間估算 | 主要任務 |
|------|---------|----------|
| 階段 0: 準備工作 | 1 週 | 數據備份、分析 |
| 階段 1: 擴展 Island Schema | 1-2 週 | Schema 更新、AI 配置遷移 |
| 階段 2: IslandService | 1 週 | 服務實現、測試 |
| 階段 3: Memory 遷移 | 1-2 週 | 數據遷移、驗證 |
| 階段 4: 服務層更新 | 2-3 週 | chiefAgent, subAgent, memory 服務 |
| 階段 5: ChatSession 遷移 | 2-3 週 | Schema 變更、數據遷移 |
| 階段 6: 前端遷移 | 2 週 | 組件、路由更新 |
| 階段 7: GraphQL 遷移 | 1 週 | Resolvers 更新 |
| 階段 8: 清理優化 | 1 週 | 代碼清理、文檔 |
| **總計** | **12-16 週** | **約 3-4 個月** |

### 資源需求

- **後端開發**: 1 人 x 10 週
- **前端開發**: 1 人 x 6 週
- **測試**: 1 人 x 4 週
- **DevOps**: 0.5 人 x 2 週

---

## ✅ 驗收標準

### 功能驗收

- [ ] 所有 Memory 都有 `islandId`
- [ ] Island 統計數據準確
- [ ] ChatSession 關聯到 Island
- [ ] 前端組件使用 Island 查詢
- [ ] AI 功能正常（分類、對話）
- [ ] 3D 場景渲染正常

### 性能驗收

- [ ] Memory 查詢速度 < 100ms
- [ ] Island 統計更新 < 50ms
- [ ] 3D 場景載入 < 2s

### 資料完整性

- [ ] 無 Memory 資料遺失
- [ ] ChatSession 歷史記錄完整
- [ ] Island 統計與實際一致

### 向後兼容性

- [ ] 舊 API 仍可用（但有 deprecated 警告）
- [ ] 舊路由自動重定向
- [ ] Memory 同時支援 assistantId 和 islandId（過渡期）

---

## 🎯 結論

Heart Whisper Town 從 **Assistant 舊系統** 遷移到 **Island 新系統** 是一個複雜但必要的升級。本遷移計劃提供了：

### ✅ 優勢

1. **用戶專屬分類** - Island 支援用戶自訂，不再限於固定 8 個分類
2. **完整的 3D 配置** - Island 支援豐富的外觀自訂
3. **AI 個性化** - 每個 Island 可以有自己的 AI 配置
4. **清晰的架構** - 統一使用 Island，代碼更易維護
5. **向後兼容** - 保留 Chief Assistant，平滑過渡

### ⚠️ 風險

1. **資料遷移複雜** - 需要謹慎處理 Memory、ChatSession 數據
2. **開發週期長** - 預計 3-4 個月
3. **測試工作量大** - 需要完整的功能和性能測試

### 🚀 建議執行方式

**採用「漸進式遷移」策略**：
1. 優先遷移低風險項目（Memory）
2. 充分測試後再遷移高風險項目（ChatSession）
3. 保留向後兼容性，給用戶足夠的遷移時間
4. 定期監控和優化

**關鍵成功因素**：
- 完整的資料備份
- 充分的測試（單元、整合、E2E）
- 清晰的回滾計劃
- 監控和告警機制

---

**報告生成者**: Claude Code
**版本**: v1.0
**最後更新**: 2025-11-01
