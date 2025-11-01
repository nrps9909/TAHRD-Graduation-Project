# Island 遷移執行指南

> **狀態**: 階段 1-3 已完成，階段 4-8 待執行
> **最後更新**: 2025-11-01

---

## ✅ 已完成階段

### 階段 1: Prisma Schema 擴展 ✅
- Island 添加 AI 配置欄位
- ChatSession/ChatMessage 添加 islandId
- 資料庫索引已同步

### 階段 2: IslandService 創建 ✅
- 完整的 CRUD 操作
- AssistantType 映射
- 快取管理

### 階段 3: 遷移腳本創建 ✅
- `scripts/migrate-memory-to-island.ts`
- `scripts/migrate-chatsession-to-island.ts`

---

## 📋 待執行階段

### 階段 3B: 執行數據遷移 ⏳

**重要**: 先在測試環境執行，確認無誤後再在生產環境執行

#### 步驟 1: 備份數據庫

```bash
# 備份整個數據庫
mongodump --uri="YOUR_MONGODB_URI" --out=./backup-$(date +%Y%m%d)

# 或只備份關鍵集合
mongodump --uri="YOUR_MONGODB_URI" --collection=memories --out=./memories-backup
mongodump --uri="YOUR_MONGODB_URI" --collection=chat_sessions --out=./sessions-backup
```

#### 步驟 2: 執行 Memory 遷移

```bash
cd backend

# 確保環境變數已載入
source .env  # 或 export $(cat .env | xargs)

# 執行 Memory 遷移
npx ts-node scripts/migrate-memory-to-island.ts
```

**預期輸出**:
```
=== 開始遷移 Memory 數據 ===

找到 150 條需要遷移的記憶

✅ 記憶 xxx: 學習記錄員 → 學習島
✅ 記憶 yyy: 工作記錄員 → 工作島
...

=== 遷移完成 ===
✅ 成功: 148
❌ 失敗: 2
📊 總數: 150

=== 重新計算 Island 統計 ===
✅ 學習島: 45 條記憶, 0 個聊天
✅ 工作島: 32 條記憶, 0 個聊天
...

=== 驗證遷移結果 ===
總記憶數: 150
只有 assistantId: 0
只有 islandId: 0
兩者都有: 150
兩者都無: 0

✅ 所有記憶都已遷移到 Island
```

#### 步驟 3: 執行 ChatSession 遷移

```bash
npx ts-node scripts/migrate-chatsession-to-island.ts
```

#### 步驟 4: 驗證遷移結果

```bash
# 進入 MongoDB
mongosh "YOUR_MONGODB_URI"

# 驗證 Memory
db.memories.countDocuments({ island_id: { $exists: true, $ne: null } })
db.memories.countDocuments({ assistant_id: { $ne: null }, island_id: null })

# 驗證 Island 統計
db.islands.find({}, { name_chinese: 1, memory_count: 1, total_chats: 1 })
```

---

### 階段 4: 更新後端服務層 ⏳

由於服務層修改較多，我提供關鍵修改點的代碼片段：

#### 4.1 更新 chiefAgentService.ts

**位置 1**: Line 232 - fallbackCategoryDetection

```typescript
// ❌ 舊代碼
const fallbackCategory = assistantService.fallbackCategoryDetection(content)

// ✅ 新代碼
const fallbackIslandId = await islandService.fallbackClassification(userId, content)
```

**位置 2**: Line 254 - getAssistantById

```typescript
// ❌ 舊代碼
const assistant = await assistantService.getAssistantById(assistantId)

// ✅ 新代碼
const island = await islandService.getIslandById(islandId, userId)
```

**位置 3**: Line 340-341 - incrementAssistantStats

```typescript
// ❌ 舊代碼
await assistantService.incrementAssistantStats(assistantId, 'memory')
await assistantService.incrementAssistantStats(assistantId, 'chat')

// ✅ 新代碼
await islandService.incrementIslandStats(islandId, 'memory')
await islandService.incrementIslandStats(islandId, 'chat')
```

**位置 4**: Line 369 - getAssistantByType

```typescript
// ❌ 舊代碼
const assistant = await assistantService.getAssistantByType(category)

// ✅ 新代碼
const island = await islandService.getIslandByType(userId, category)
```

**完整修改文件**: 由於修改點較多，建議使用以下命令生成補丁：

```bash
# 創建一個新分支進行修改
git checkout -b feature/island-migration

# 手動編輯 chiefAgentService.ts，將所有 assistantService 改為 islandService
# 除了 getChiefAssistant() 保留

# 檢查差異
git diff src/services/chiefAgentService.ts
```

#### 4.2 更新 subAgentService.ts

**已完成**: `categoriesInfo` 邏輯已更新（優先使用 Island）

**需要添加**: Import islandService

```typescript
import { islandService } from './islandService'
```

---

### 階段 6: 更新 GraphQL Schema ⏳

#### 6.1 擴展 Island Type

**文件**: `backend/src/schema.ts` 或 `backend/src/schema/categorySchema.ts`

在現有 Island Type 中添加 AI 配置欄位：

```graphql
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
```

#### 6.2 添加 Island Mutations

```graphql
extend type Mutation {
  # 🆕 更新 Island AI 配置
  updateIslandAIConfig(
    id: ID!
    systemPrompt: String
    personality: String
    chatStyle: String
    keywords: [String!]
  ): Island!

  # 🆕 更新 Island 統計
  incrementIslandStats(
    id: ID!
    type: StatType!
  ): Island!

  # 現有的 updateIsland 也需要支援新欄位
  updateIsland(
    id: ID!
    nameChinese: String
    emoji: String
    color: String
    description: String
    systemPrompt: String  # 🆕
    personality: String   # 🆕
    chatStyle: String     # 🆕
    keywords: [String!]   # 🆕
    # ... 其他欄位
  ): Island!
}

enum StatType {
  MEMORY
  CHAT
}
```

#### 6.3 更新 Memory Type

```graphql
type Memory {
  id: ID!
  userId: ID!

  # Relations - 同時支援兩者（向後兼容）
  assistantId: ID      # ⚠️ deprecated
  islandId: ID         # 🆕 推薦使用
  assistant: Assistant # ⚠️ deprecated
  island: Island       # 🆕 推薦使用

  # ... 其他欄位
}
```

#### 6.4 更新 ChatSession Type

```graphql
type ChatSession {
  id: ID!
  userId: ID!

  # Relations - 同時支援兩者（向後兼容）
  assistantId: ID      # ⚠️ deprecated
  islandId: ID         # 🆕 推薦使用
  assistant: Assistant # ⚠️ deprecated
  island: Island       # 🆕 推薦使用

  title: String!
  messageCount: Int!
  # ... 其他欄位
}
```

---

### 階段 6B: 更新 Resolvers ⏳

#### 6.1 創建/更新 islandResolvers.ts

**文件**: `backend/src/resolvers/islandResolvers.ts`

```typescript
import { islandService } from '../services/islandService'
import { Context } from '../context'

export const islandResolvers = {
  Query: {
    islands: async (_: any, { userId }: { userId: string }, { user }: Context) => {
      // 驗證權限
      if (!user || user.id !== userId) {
        throw new Error('無權訪問')
      }
      return await islandService.getAllIslands(userId)
    },

    island: async (_: any, { id, userId }: { id: string, userId: string }, { user }: Context) => {
      if (!user || user.id !== userId) {
        throw new Error('無權訪問')
      }

      const island = await islandService.getIslandById(id, userId)

      // 驗證所有權
      if (island && island.userId !== userId) {
        throw new Error('無權訪問此島嶼')
      }

      return island
    }
  },

  Mutation: {
    updateIslandAIConfig: async (
      _: any,
      { id, systemPrompt, personality, chatStyle, keywords }: any,
      { user, prisma }: Context
    ) => {
      if (!user) throw new Error('未登入')

      // 驗證所有權
      const island = await prisma.island.findUnique({ where: { id } })
      if (island?.userId !== user.id) {
        throw new Error('無權修改此島嶼')
      }

      return await islandService.updateIsland(id, {
        systemPrompt,
        personality,
        chatStyle,
        keywords
      })
    },

    incrementIslandStats: async (
      _: any,
      { id, type }: { id: string, type: 'MEMORY' | 'CHAT' },
      { user }: Context
    ) => {
      if (!user) throw new Error('未登入')

      await islandService.incrementIslandStats(id, type.toLowerCase() as 'memory' | 'chat')
      return await islandService.getIslandById(id, user.id)
    }
  },

  Island: {
    memories: async (parent: any, { limit = 50, offset = 0 }: any, { prisma }: Context) => {
      return await prisma.memory.findMany({
        where: { islandId: parent.id },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' }
      })
    },

    chatSessions: async (parent: any, _: any, { prisma }: Context) => {
      return await prisma.chatSession.findMany({
        where: { islandId: parent.id },
        orderBy: { lastMessageAt: 'desc' }
      })
    }
  }
}
```

#### 6.2 更新 memoryResolvers.ts

添加 `island` resolver:

```typescript
export const memoryResolvers = {
  // ... 現有 Query 和 Mutation

  Memory: {
    // 🆕 添加 island resolver
    island: async (parent: any, _: any, { prisma }: Context) => {
      if (!parent.islandId) return null

      return await prisma.island.findUnique({
        where: { id: parent.islandId }
      })
    },

    // ⚠️ 保留 assistant resolver（向後兼容）
    assistant: async (parent: any, _: any, { prisma }: Context) => {
      if (!parent.assistantId) return null

      return await prisma.assistant.findUnique({
        where: { id: parent.assistantId }
      })
    }
  }
}
```

#### 6.3 更新 resolvers/index.ts

```typescript
import { islandResolvers } from './islandResolvers'  // 🆕

export const resolvers = {
  // ...

  Query: {
    // ... 現有 queries
    ...islandResolvers.Query,  // 🆕
  },

  Mutation: {
    // ... 現有 mutations
    ...islandResolvers.Mutation,  // 🆕
  },

  // Type resolvers
  Island: islandResolvers.Island,  // 🆕
  Memory: memoryResolvers.Memory,  // 已更新
}
```

---

### 階段 7: 更新前端 ⏳

由於前端修改較多，這裡只列出關鍵文件和修改點：

#### 7.1 更新 GraphQL Queries

**文件**: `frontend/src/graphql/island.ts`

添加新的 queries 和 mutations:

```graphql
# 🆕 更新 Island AI 配置
export const UPDATE_ISLAND_AI_CONFIG = gql`
  mutation UpdateIslandAIConfig(
    $id: ID!
    $systemPrompt: String
    $personality: String
    $chatStyle: String
    $keywords: [String!]
  ) {
    updateIslandAIConfig(
      id: $id
      systemPrompt: $systemPrompt
      personality: $personality
      chatStyle: $chatStyle
      keywords: $keywords
    ) {
      id
      nameChinese
      systemPrompt
      personality
      chatStyle
      keywords
    }
  }
`

# 🆕 更新統計
export const INCREMENT_ISLAND_STATS = gql`
  mutation IncrementIslandStats($id: ID!, $type: StatType!) {
    incrementIslandStats(id: $id, type: $type) {
      id
      memoryCount
      totalChats
    }
  }
`

# 更新 GET_ISLAND query（添加新欄位）
export const GET_ISLAND = gql`
  query GetIsland($id: ID!, $userId: ID!) {
    island(id: $id, userId: $userId) {
      id
      userId
      position
      nameChinese
      emoji
      color
      description

      # 🆕 AI 配置
      systemPrompt
      personality
      chatStyle
      keywords

      # 3D 配置
      positionX
      positionY
      positionZ
      shape
      textureId
      modelUrl
      customShapeData
      islandHeight
      islandBevel

      # 統計
      memoryCount
      totalChats  # 🆕

      isActive
      createdAt
      updatedAt

      # Relations
      memories(limit: 50) {
        id
        rawContent
        summary
        # ...
      }
    }
  }
`
```

#### 7.2 更新 IslandView 組件

**文件**: `frontend/src/pages/IslandView/index.tsx`

**主要修改**:

```typescript
// ❌ 舊代碼
import { GET_ASSISTANTS } from '../../graphql/assistant'
const { assistantId } = useParams()
const { data } = useQuery(GET_ASSISTANTS)

// ✅ 新代碼
import { GET_ISLAND } from '../../graphql/island'
const { islandId } = useParams()
const { user } = useAuthStore()
const { data, loading } = useQuery(GET_ISLAND, {
  variables: {
    id: islandId,
    userId: user?.id
  }
})

// 驗證所有權
if (data?.island && data.island.userId !== user?.id) {
  return <Navigate to="/islands" />
}
```

#### 7.3 更新路由

**文件**: `frontend/src/App.tsx`

```typescript
// 🆕 新路由
<Route path="/islands/:islandId" element={<IslandView />} />

// ⚠️ 向後兼容路由（自動重定向）
<Route path="/island/:assistantId" element={<IslandViewCompat />} />

// 向後兼容組件
function IslandViewCompat() {
  const { assistantId } = useParams()
  const { user } = useAuthStore()

  const { data } = useQuery(GET_ISLANDS, {
    variables: { userId: user?.id }
  })

  // 根據 name 或 id 匹配 Island
  const island = data?.islands.find(i =>
    i.name === assistantId || i.id === assistantId
  )

  if (!island) {
    return <Navigate to="/islands" />
  }

  return <Navigate to={`/islands/${island.id}`} replace />
}
```

#### 7.4 創建 IslandAIConfigModal 組件

**文件**: `frontend/src/components/IslandAIConfigModal.tsx`

```typescript
import { useMutation } from '@apollo/client'
import { UPDATE_ISLAND_AI_CONFIG } from '../graphql/island'

export function IslandAIConfigModal({ islandId, onClose }: Props) {
  const [systemPrompt, setSystemPrompt] = useState('')
  const [personality, setPersonality] = useState('')
  const [chatStyle, setChatStyle] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])

  const [updateAIConfig, { loading }] = useMutation(UPDATE_ISLAND_AI_CONFIG, {
    refetchQueries: ['GetIsland']
  })

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
        placeholder="輸入關鍵字後按 Enter"
      />

      <Button onClick={handleSave} disabled={loading}>
        {loading ? '保存中...' : '保存'}
      </Button>
    </Modal>
  )
}
```

---

### 階段 8: 清理 Assistant 代碼 ⏳

**決策**: 保留 Chief Assistant 作為系統級服務

#### 8.1 Assistant Model 處理

**選項 A（推薦）**: 保留 Assistant Model，但限制只能有 CHIEF 類型

**Prisma Schema**:

```prisma
model Assistant {
  id               String   @id @default(auto()) @map("_id") @db.ObjectId
  type             AssistantType @unique  // 只允許 CHIEF
  name             String   @unique
  nameChinese      String
  emoji            String
  systemPrompt     String   @db.String
  personality      String   @db.String
  // ... 其他欄位

  @@map("assistants")
}

enum AssistantType {
  CHIEF  // 只保留 CHIEF

  @@map("assistant_type")
}
```

**選項 B**: 完全移除 Assistant Model，將 Chief 邏輯整合到 chiefAgentService

#### 8.2 標記 GraphQL APIs 為 Deprecated

```graphql
type Query {
  # ⚠️ Deprecated: Use islands instead
  assistants: [Assistant!]! @deprecated(reason: "使用 islands 查詢代替")

  # ⚠️ Deprecated: Use island instead
  assistant(id: ID!): Assistant @deprecated(reason: "使用 island 查詢代替")

  # ✅ 保留：Chief 特殊功能
  chiefAssistant: Assistant!

  # ✅ 推薦使用
  islands(userId: ID!): [Island!]!
  island(id: ID!, userId: ID!): Island
}
```

---

## 🧪 測試檢查清單

### 資料庫層面

- [ ] 所有 Memory 都有 islandId
- [ ] Island 統計準確（memoryCount, totalChats）
- [ ] ChatSession/ChatMessage 都有 islandId
- [ ] 資料庫索引正常運作

### 後端 API

- [ ] Island CRUD 操作正常
- [ ] Memory 創建時關聯 islandId
- [ ] ChatSession 創建時關聯 islandId
- [ ] 統計更新正常
- [ ] Chief Agent 功能正常

### 前端

- [ ] 島嶼列表顯示正常
- [ ] Island 3D 場景渲染正常
- [ ] 記憶創建關聯到正確 Island
- [ ] 路由跳轉正常
- [ ] AI 配置編輯功能正常

---

## 🚨 回滾計劃

如果遷移出現問題，執行以下回滾步驟：

### 回滾資料庫變更

```bash
# 恢復備份
mongorestore --uri="YOUR_MONGODB_URI" --drop ./backup-20251101

# 或只恢復特定集合
mongorestore --uri="YOUR_MONGODB_URI" --collection=memories ./memories-backup
```

### 回滾代碼變更

```bash
# 撤銷 Git 提交
git reset --hard HEAD~1

# 或切換回主分支
git checkout main

# 重新部署
npm run build
pm2 restart all
```

---

## 📞 常見問題

### Q: 遷移後舊的 assistantId 關聯會消失嗎？
A: 不會。Memory/ChatSession 同時保留 `assistantId` 和 `islandId`，向後兼容。

### Q: 如果某個 Memory 無法自動映射到 Island 怎麼辦？
A: 遷移腳本會記錄失敗的 Memory ID，你可以手動分配或使用降級分類。

### Q: Chief Agent 還能用嗎？
A: 可以。Chief Assistant 保留為系統級服務，負責智能分類和摘要功能。

### Q: 前端需要同時支持兩套 API 嗎？
A: 過渡期需要。長期建議只使用 Island API，Assistant API 標記為 deprecated。

---

## 📋 執行檢查表

### 準備階段
- [ ] 閱讀完整遷移計劃
- [ ] 備份生產資料庫
- [ ] 在測試環境完整測試
- [ ] 準備回滾方案

### 執行階段
- [ ] 執行 Memory 遷移腳本
- [ ] 執行 ChatSession 遷移腳本
- [ ] 驗證數據完整性
- [ ] 更新後端服務層
- [ ] 更新 GraphQL Schema
- [ ] 更新前端組件
- [ ] 執行完整測試

### 驗證階段
- [ ] 單元測試通過
- [ ] 整合測試通過
- [ ] E2E 測試通過
- [ ] 性能測試通過
- [ ] 用戶驗收測試

### 部署階段
- [ ] 生產環境部署
- [ ] 監控系統運行狀態
- [ ] 收集用戶反饋
- [ ] 修復 bug

---

**文檔版本**: v1.0
**最後更新**: 2025-11-01
**維護者**: Claude Code
