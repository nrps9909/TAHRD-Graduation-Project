# 🌱 Knowledge Garden - 轉型實施計劃

> 從療癒遊戲到AI驅動的個人知識庫

## 產品定位

**AI Knowledge Garden** - 會成長的個人知識庫
- 🤖 **核心差異**：AI即時對話互動 + 3D視覺化知識圖譜
- 🎮 **遊戲化**：知識花園成長系統，讓學習變有趣
- 🔗 **智能連結**：AI主動發現知識關聯與盲點

## Phase 1: MVP - 基礎知識庫 (Week 1-3)

### 任務清單

#### 1.1 數據模型改造
- [ ] 修改 `schema.prisma`
  ```prisma
  model KnowledgeEntry {
    id            String   @id @default(cuid())
    userId        String
    title         String
    content       String   // Markdown
    type          String   // 'note' | 'concept' | 'question'
    tags          String[]
    importance    Float    @default(0.5)
    createdAt     DateTime @default(now())
    lastReviewed  DateTime?

    user          User     @relation(fields: [userId], references: [id])
    relations     KnowledgeRelation[] @relation("from")
    aiChats       AIChat[]
  }

  model KnowledgeRelation {
    id           String @id @default(cuid())
    fromId       String
    toId         String
    relationType String // 'related' | 'prerequisite' | 'example'
    strength     Float  @default(0.5)

    from         KnowledgeEntry @relation("from", fields: [fromId], references: [id])
    to           KnowledgeEntry @relation("to", fields: [toId], references: [id])
  }

  model AIChat {
    id          String   @id @default(cuid())
    userId      String
    message     String
    response    String
    knowledgeId String?
    createdAt   DateTime @default(now())

    user        User           @relation(fields: [userId], references: [id])
    knowledge   KnowledgeEntry? @relation(fields: [knowledgeId], references: [id])
  }
  ```

- [ ] 運行 migration：`npx prisma migrate dev --name knowledge_garden`

#### 1.2 AI助手改造

- [ ] 修改 `backend/src/services/geminiServiceMCP.ts`
  - 更新 system prompt：從 NPC → 知識助手
  - 添加知識提取功能
  - 實現知識搜尋能力

- [ ] 創建 `backend/src/services/knowledgeAssistantService.ts`
  ```typescript
  export class KnowledgeAssistantService {
    // 對話中提取知識
    async extractKnowledge(message: string): Promise<KnowledgeEntry>

    // 搜尋知識庫
    async searchKnowledge(query: string): Promise<KnowledgeEntry[]>

    // AI回答問題（基於知識庫）
    async answerQuestion(question: string, context: KnowledgeEntry[]): Promise<string>

    // 建議知識關聯
    async suggestRelations(entryId: string): Promise<KnowledgeRelation[]>
  }
  ```

#### 1.3 前端UI改造

- [ ] 修改 `frontend/src/components/UI/index.tsx`
  - 對話模式：AI助手聊天界面
  - 知識卡片：顯示提取的知識點
  - 標籤系統：快速分類

- [ ] 創建新組件
  - `KnowledgeCard.tsx` - 知識卡片
  - `ChatInterface.tsx` - AI對話界面
  - `KnowledgeList.tsx` - 知識列表

#### 1.4 GraphQL Schema更新

- [ ] 修改 `backend/src/schema.ts`
  ```graphql
  type Query {
    knowledgeEntries(tags: [String], search: String): [KnowledgeEntry!]!
    knowledgeEntry(id: ID!): KnowledgeEntry
    searchKnowledge(query: String!): [KnowledgeEntry!]!
  }

  type Mutation {
    createKnowledge(input: KnowledgeInput!): KnowledgeEntry!
    updateKnowledge(id: ID!, input: KnowledgeInput!): KnowledgeEntry!
    chatWithAI(message: String!): AIChatResponse!
    linkKnowledge(fromId: ID!, toId: ID!, type: String!): KnowledgeRelation!
  }

  type AIChatResponse {
    message: String!
    extractedKnowledge: KnowledgeEntry
    suggestedRelations: [KnowledgeEntry!]
  }
  ```

### 測試標準
- [ ] 可以通過對話創建知識
- [ ] AI能基於知識庫回答問題
- [ ] 知識可以被標籤分類
- [ ] 基本的CRUD操作正常

---

## Phase 2: 視覺化與關聯 (Week 4-5)

### 任務清單

#### 2.1 3D知識圖譜

- [ ] 修改 `frontend/src/components/3D/` 場景
  - `KnowledgeNode.tsx` - 知識節點（原記憶花朵）
  - `KnowledgeGraph.tsx` - 力導向圖布局
  - `KnowledgeSpace.tsx` - 3D空間管理

- [ ] 實現力導向圖算法
  ```typescript
  // 使用 d3-force 或 sigma.js
  import { forceSimulation, forceLink, forceManyBody } from 'd3-force'

  const simulation = forceSimulation(nodes)
    .force("link", forceLink(links))
    .force("charge", forceManyBody())
  ```

#### 2.2 智能關聯系統

- [ ] AI關聯建議
  - 基於內容相似度
  - 基於標籤重疊
  - 基於時間關聯

- [ ] 互動建立關聯
  - 拖拉節點建立連結
  - 右鍵菜單快速關聯

#### 2.3 知識導航

- [ ] 節點互動
  - 點擊展開詳情
  - 懸停顯示摘要
  - 雙擊進入編輯

- [ ] 視圖控制
  - 縮放探索
  - 過濾顯示
  - 搜尋定位

### 測試標準
- [ ] 知識以3D圖譜呈現
- [ ] 可以視覺化探索知識關聯
- [ ] 互動流暢，性能良好

---

## Phase 3: 遊戲化系統 (Week 6-7)

### 任務清單

#### 3.1 知識成長系統

- [ ] 節點成長視覺化
  ```typescript
  enum GrowthStage {
    SEED = 1,      // 剛創建
    SPROUT = 2,    // 複習1次
    BLOOM = 3,     // 建立3個關聯
    FRUIT = 4      // 實際應用
  }
  ```

- [ ] 成長動畫
  - 粒子效果
  - 尺寸變化
  - 顏色漸變

#### 3.2 AI助手進化

- [ ] 等級系統
  ```typescript
  model AIAssistant {
    userId    String @unique
    level     Int    @default(1)
    exp       Int    @default(0)
    abilities String[] // ['basic', 'suggest', 'insight']
  }
  ```

- [ ] 能力解鎖
  - Lv1: 基本問答
  - Lv3: 主動建議
  - Lv5: 發現盲點
  - Lv7: 學習路徑
  - Lv10: 深度分析

#### 3.3 成就系統

- [ ] 定義成就
  ```typescript
  const achievements = [
    { id: 'collector', name: '藏書家', condition: 'knowledge_count >= 100' },
    { id: 'linker', name: '連結大師', condition: 'relations_count >= 50' },
    { id: 'gardener', name: '園丁', condition: 'streak_days >= 30' }
  ]
  ```

- [ ] 成就追蹤與通知

#### 3.4 每日任務

- [ ] 任務系統
  - 晨間複習（3個知識）
  - 晚間總結（記錄今日所學）
  - 週報生成（AI分析知識結構）

- [ ] 習慣養成
  - 連續打卡
  - 複習提醒
  - 數據統計

### 測試標準
- [ ] 知識會隨互動成長
- [ ] AI助手能力隨等級提升
- [ ] 成就系統正常運作
- [ ] 每日任務能養成習慣

---

## Phase 4: 進階功能 (持續迭代)

### 未來功能
- [ ] 語音輸入
- [ ] 文件解析（PDF/Word）
- [ ] 網頁剪藏插件
- [ ] 知識分享社群
- [ ] 團隊協作模式
- [ ] 移動端APP

---

## 技術債務處理

### 需要移除/重構
- [ ] NPC相關代碼 → AI助手
- [ ] 療癒相關UI → 知識庫UI
- [ ] 小鎮場景 → 知識空間

### 可以保留
- ✅ Gemini MCP架構
- ✅ WebSocket實時通信
- ✅ Three.js 3D渲染
- ✅ Prisma數據層
- ✅ 認證系統

---

## 成功指標

### MVP階段
- 可以創建 >= 20 個知識條目
- AI回答準確率 >= 80%
- 用戶留存 >= 3天

### 完整版
- 日活用戶 >= 100
- 知識庫平均深度 >= 5層
- 用戶滿意度 >= 4.5/5

---

## 開始第一步

```bash
# 1. 創建新分支
git checkout -b feature/knowledge-garden

# 2. 修改數據模型
cd backend
# 編輯 prisma/schema.prisma

# 3. 運行遷移
npx prisma migrate dev --name init_knowledge_garden

# 4. 開始編碼！
```

---

## 參考資源

- [Obsidian](https://obsidian.md) - 筆記軟件參考
- [Roam Research](https://roamresearch.com) - 雙向連結概念
- [Mem](https://mem.ai) - AI知識助手
- [d3-force](https://github.com/d3/d3-force) - 力導向圖
- [React Flow](https://reactflow.dev) - 節點圖組件
