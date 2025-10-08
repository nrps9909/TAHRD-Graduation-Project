# 知識庫系統整合完成文檔

## 📋 整合概述

已成功將前端聊天系統（Live2DCat）連接到後端知識庫系統，實現完整的 Chief Agent + Sub Agents 智能分發架構。

## ✅ 已完成的工作

### 1. 後端架構（已存在並完整）

#### Chief Agent Service (`backend/src/services/chiefAgentService.ts`)
- ✅ 使用 Gemini 2.5 Pro（通過 MCP Server）
- ✅ 分析知識內容並決定分配到哪些知識庫
- ✅ 多模態支持（文本、圖片、PDF、連結）
- ✅ 智能分類和標籤生成
- ✅ 主要功能：
  - `analyzeKnowledge()` - 深度分析知識內容
  - `uploadKnowledge()` - 上傳知識到分發系統
  - `classifyContent()` - 智能分類
  - `generateSummary()` - 生成全局摘要

#### Sub Agent Service (`backend/src/services/subAgentService.ts`)
- ✅ 每個知識庫都有獨立的 Sub Agent
- ✅ 使用 Gemini 2.5 Pro 評估知識相關性
- ✅ 自主決定是否存儲到資料庫
- ✅ 智能存儲決策邏輯：
  - 高相關性 (>0.7) + 高置信度 (>0.7) → 一定存儲
  - 中相關性 (0.4-0.7) → 參考 AI 建議
  - 低相關性 (<0.4) → 一定不存儲
- ✅ 主要功能：
  - `evaluateKnowledge()` - 評估知識相關性
  - `processDistribution()` - 處理知識分發
  - `createMemory()` - 創建記憶

#### GraphQL API (`backend/src/resolvers/knowledgeDistributionResolvers.ts`)
- ✅ Query:
  - `knowledgeDistributions` - 獲取知識分發列表
  - `knowledgeDistribution(id)` - 獲取單個分發記錄
  - `agentDecisions(distributionId)` - 獲取 Agent 決策列表
- ✅ Mutation:
  - `uploadKnowledge(input)` - 上傳知識到 Chief Agent

#### 資料庫 Schema (`backend/prisma/schema.prisma`)
- ✅ `KnowledgeDistribution` - 知識分發記錄
- ✅ `AgentDecision` - Sub Agent 決策記錄
- ✅ `Memory` - 知識儲存記錄
- ✅ `Assistant` - AI 助手配置（包含 CHIEF 類型）

### 2. 前端整合（新增）

#### GraphQL Mutations (`frontend/src/graphql/knowledge.ts`)
- ✅ `UPLOAD_KNOWLEDGE` - 上傳知識到 Chief Agent
- ✅ `CHAT_WITH_CHIEF` - 與 Chief Agent 對話
- ✅ `GET_CHIEF_ASSISTANT` - 獲取 Chief Assistant 資訊
- ✅ `GET_ASSISTANTS` - 獲取所有助手列表
- ✅ `GET_KNOWLEDGE_DISTRIBUTIONS` - 查詢知識分發記錄

#### Live2DCat 組件更新 (`frontend/src/components/Live2DCat.tsx`)
- ✅ 引入 Apollo Client hooks
- ✅ 使用 `useMutation(UPLOAD_KNOWLEDGE)` 上傳知識
- ✅ 使用 `useQuery(GET_CHIEF_ASSISTANT)` 獲取 Chief 資訊
- ✅ 處理上傳結果並顯示智能回覆
- ✅ 添加處理中狀態（`isProcessing`）
- ✅ 支持多模態輸入（文本 + 圖片 + 檔案 + 語音，最多 10 個）
- ✅ 動態顯示 Chief Agent 分析結果

## 🔄 完整流程

```
用戶輸入（文本 + 附件）
    ↓
Live2DCat 組件
    ↓
GraphQL Mutation: uploadKnowledge
    ↓
Apollo Client → Backend GraphQL API
    ↓
Chief Agent Service (Gemini 2.5 Pro)
    ├─ 分析內容（多模態處理）
    ├─ 識別主題和標籤
    ├─ 決定分配到哪些知識庫
    └─ 創建 KnowledgeDistribution 記錄
    ↓
Sub Agent Service（並發處理）
    ├─ Sub Agent 1 (Gemini 2.5 Pro) → 評估相關性 → 決定是否存儲
    ├─ Sub Agent 2 (Gemini 2.5 Pro) → 評估相關性 → 決定是否存儲
    ├─ Sub Agent 3 (Gemini 2.5 Pro) → 評估相關性 → 決定是否存儲
    └─ ... (所有相關的 Sub Agents)
    ↓
創建 AgentDecision 記錄
    ↓
決定存儲的 Sub Agent 創建 Memory 記錄
    ↓
返回結果給前端
    ↓
Live2DCat 顯示分析結果
    ├─ Chief Agent 摘要
    ├─ 存儲到哪些知識庫
    └─ 識別的主題
```

## 📦 知識庫類型（Assistant Types）

系統支持以下 7 種知識庫 + 1 個總管：

1. **CHIEF** - 總管（智能分配 + 全局摘要）
2. **LEARNING** - 學習筆記
3. **INSPIRATION** - 靈感創意
4. **WORK** - 工作事務
5. **SOCIAL** - 人際關係
6. **LIFE** - 生活記錄
7. **GOALS** - 目標規劃
8. **RESOURCES** - 資源收藏

## 🚀 使用示例

### 前端上傳知識

```typescript
const [uploadKnowledge] = useMutation(UPLOAD_KNOWLEDGE)

const handleSendMessage = async () => {
  const { data } = await uploadKnowledge({
    variables: {
      input: {
        content: "今天學了 React Hooks，useEffect 很強大！",
        files: [
          { url: "...", name: "notes.pdf", type: "application/pdf" }
        ],
        contentType: "DOCUMENT"
      }
    }
  })

  // data.uploadKnowledge.distribution - 分發記錄
  // data.uploadKnowledge.agentDecisions - Sub Agent 決策
  // data.uploadKnowledge.memoriesCreated - 創建的記憶
}
```

### 後端處理流程

1. **Chief Agent 分析**
   ```
   Input: "今天學了 React Hooks，useEffect 很強大！"
   Output:
     - analysis: "用戶學習了 React Hooks 技術..."
     - summary: "React Hooks 學習筆記"
     - identifiedTopics: ["React", "前端開發", "Hooks"]
     - relevantAssistants: ["LEARNING", "WORK"]
   ```

2. **Sub Agent 評估**
   - Learning Agent: relevanceScore=0.92, shouldStore=true
   - Work Agent: relevanceScore=0.65, shouldStore=true
   - Life Agent: relevanceScore=0.15, shouldStore=false

3. **結果**
   - 在 LEARNING 知識庫創建記憶
   - 在 WORK 知識庫創建記憶
   - LIFE 知識庫不存儲

## ⚙️ 配置要求

### 環境變數

```env
# Backend (.env)
GEMINI_API_KEY="your-gemini-api-key"
DATABASE_URL="mongodb://..."
MCP_SERVICE_URL="http://localhost:8765"
USE_GEMINI_CLI=true

# Frontend (.env)
VITE_GRAPHQL_URL="http://localhost:4000/graphql"
```

### MCP Server

確保 MCP Server 運行在 `http://localhost:8765`，配置為使用 Gemini 2.5 Pro：

```bash
cd backend
python3 mcp_server.py
```

### 資料庫初始化

```bash
cd backend
npm run db:push       # 推送 schema 到資料庫
npm run db:seed       # 初始化 Assistants 數據
```

## 🧪 測試步驟

1. **啟動後端服務**
   ```bash
   cd backend
   npm run dev
   ```

2. **啟動 MCP Server**
   ```bash
   cd backend
   python3 mcp_server.py
   ```

3. **啟動前端**
   ```bash
   cd frontend
   npm run dev
   ```

4. **測試知識上傳**
   - 打開 Live2DCat 組件
   - 輸入文本訊息
   - 上傳圖片或檔案（選填）
   - 點擊發送
   - 觀察 Chief Agent 的分析結果

## 📊 預期結果

用戶發送訊息後，應該看到：

```
喵~ 我已經幫你分析並儲存了！✨

📝 **摘要:** React Hooks 學習筆記

💾 **已儲存到 2 個知識庫:**
  📚 學習筆記
  💼 工作事務

🏷️ **主題:** React、前端開發、Hooks
```

## 🔍 調試建議

### 查看後端日誌

```bash
# Chief Agent 處理日誌
[Chief Agent] 開始處理知識上傳，用戶: 6789...
[Chief Agent] 分析完成，相關助手: LEARNING, WORK

# Sub Agent 處理日誌
[Learning Agent] 評估完成 - 相關性: 0.92, 是否存儲: true
[Work Agent] 評估完成 - 相關性: 0.65, 是否存儲: true
```

### GraphQL Playground

訪問 `http://localhost:4000/graphql` 測試 mutations：

```graphql
mutation TestUpload {
  uploadKnowledge(input: {
    content: "測試知識上傳"
  }) {
    distribution {
      id
      chiefSummary
    }
    agentDecisions {
      relevanceScore
      shouldStore
      reasoning
    }
  }
}
```

## 🎯 下一步優化建議

1. **前端優化**
   - 添加知識分發歷史查看頁面
   - 可視化 Agent 決策過程
   - 支持編輯和重新分類已存儲的知識

2. **後端優化**
   - 實現知識關聯推薦
   - 優化 Gemini API 調用頻率
   - 添加知識搜索和檢索功能

3. **用戶體驗**
   - 添加實時處理進度提示
   - 支持批量上傳
   - 提供知識統計和洞察

## 📝 重要提醒

- ✅ 所有後端架構已完整實現
- ✅ 前端已成功連接到 Chief Agent
- ⚠️ 需要確保 Gemini API Key 有效
- ⚠️ 需要 MCP Server 正常運行
- ⚠️ 需要 MongoDB 資料庫連接正常

整合已完成！現在可以通過 Live2DCat 上傳知識，系統會自動使用 Chief Agent (Gemini 2.5 Pro) 分析並分配到相應的知識庫，Sub Agents (Gemini 2.5 Pro) 會評估並決定是否存儲。
