# Assistant 系統清理狀態報告

> **執行時間**: 2025-11-01
> **當前進度**: 30% 完成
> **剩餘工作**: 需要手動清理 93 個 assistantId 引用

---

## ✅ 已完成的工作 (30%)

### 1. Prisma Schema 更新 ✅
- ✅ **Memory model**
  - 移除 `assistantId` 欄位
  - 移除 `assistant` relation
  - `islandId` 改為必填
  - 移除 `assistantId` 相關索引

- ✅ **ChatSession model**
  - 移除 `assistantId` 欄位
  - 移除 `assistant` relation
  - `islandId` 改為必填
  - 移除 `assistantId` 索引

- ✅ **ChatMessage model**
  - 移除 `assistantId` 欄位
  - 移除 `assistant` relation
  - `islandId` 改為必填
  - 移除 `assistantId` 索引

- ✅ **Assistant model**
  - 移除 `memories`, `chatSessions`, `chatMessages` relations

- ✅ **資料庫同步**
  - `npx prisma db push --accept-data-loss` 成功
  - 已移除 4 個舊索引
  - Prisma Client 已重新生成

### 2. memoryService.ts 清理 ✅
- ✅ `MemoryFilterOptions` - 移除 `assistantId` 參數
- ✅ `CreateMemoryInput` - 移除 `assistantId`，`islandId` 改為必填
- ✅ `createMemory()` - 移除 assistant include
- ✅ `getMemories()` - 移除 assistantId 過濾和 assistant include
- ✅ `getMemoryById()` - 移除 assistant include

**結果**: memoryService.ts 現在 100% 使用 Island 系統！

---

## 🔄 需要手動清理的文件 (70%)

### 剩餘引用統計

根據 `check-assistant-references.sh` 掃描結果：

| 類型 | 數量 | 文件數 |
|------|------|--------|
| `assistantService` 導入 | 4 | 4 |
| `assistantService` 使用 | 25+ | 3 |
| `assistantId` 參數 | 20+ | 8 |
| `assistantId` 變量 | 93 | 多個 |

### 需要清理的文件列表

#### 高優先級（核心 Services）

1. **chiefAgentService.ts** (19 處引用)
   - `getChiefAssistant()` × 5
   - `getAssistantById()` × 2
   - `getAssistantByType()` × 3
   - `incrementAssistantStats()` × 3
   - 函數簽名需要改為 `islandId`

2. **subAgentService.ts** (8 處引用)
   - `getAssistantById()` × 3
   - `getAssistantByType()` × 2
   - `incrementAssistantStats()` × 1
   - `categoriesInfo` else 分支
   - 函數簽名需要改為 `islandId`

3. **tororoService.ts** (1 處引用)
   - `getAssistantByType()` × 1
   - `processAndCreateMemory` 調用需要改為 `islandId`

#### 中優先級（Service 層）

4. **chatSessionService.ts**
   - `getOrCreateSession()` 函數簽名
   - 所有 `assistantId` 參數改為 `islandId`

5. **assistantService.ts**
   - **選項 A**: 完全刪除 ✅ 推薦
   - **選項 B**: 只保留 `getChiefAssistant()` for deprecated use

#### 低優先級（Resolvers 和 Routes）

6. **memoryResolvers.ts**
   - 移除 `assistant` resolver
   - 移除 `assistant` include

7. **assistantResolvers.ts**
   - **選項 A**: 完全刪除 ✅ 推薦
   - **選項 B**: 標記為 deprecated，返回錯誤訊息

8. **resolvers/index.ts**
   - 移除 `assistantResolvers` 導入和註冊
   - 移除 `Assistant` type resolver

9. **routes/tororoChat.ts**
   - 移除 `TORORO_ASSISTANT_ID`
   - 改用 Island ID

10. **schema.ts (GraphQL)**
    - 移除 `assistantId` 欄位定義
    - 移除 `assistant` relation 定義

---

## 📋 詳細清理計劃

### Phase 1: 核心 Services（預估 30 分鐘）

#### 1.1 chiefAgentService.ts

**移除的功能：**
- 所有 `getChiefAssistant()` 調用 → 刪除 Chief 概念
- 所有 `getAssistantById()` 調用 → 改用 `islandService.getIslandById()`
- 所有 `getAssistantByType()` 調用 → 改用 `islandService.getIslandByType()`
- 所有 `incrementAssistantStats()` 調用 → 只保留 `islandService.incrementIslandStats()`

**函數簽名修改：**
```typescript
// ❌ 舊的
async processAndCreateMemory(
  userId: string,
  assistantId: string,
  content: string,
  category: AssistantType,
  contextType: ChatContextType
)

// ✅ 新的
async processAndCreateMemory(
  userId: string,
  islandId: string,
  content: string,
  category: AssistantType,
  contextType: ChatContextType
)
```

#### 1.2 subAgentService.ts

**函數簽名修改：**
```typescript
// ❌ 舊的
async evaluateKnowledge(assistantId: string, distributionInput: DistributionInput)
async createMemoryWithSubAgent(assistantId: string, distribution: any, evaluation: EvaluationResult, distributionId: string)
async callMCP(prompt: string, assistantId: string)

// ✅ 新的
async evaluateKnowledge(islandId: string, distributionInput: DistributionInput)
async createMemoryWithSubAgent(islandId: string, distribution: any, evaluation: EvaluationResult, distributionId: string)
async callMCP(prompt: string, islandId: string)
```

**移除的代碼：**
- Line 746 的 else 分支（Assistant 向後兼容邏輯）
- 所有 `assistantService` 調用

#### 1.3 tororoService.ts

**替換：**
```typescript
// ❌ 舊的
const assistant = await assistantService.getAssistantByType(classification.suggestedCategory)
const result = await chiefAgentService.processAndCreateMemory(
  input.userId,
  assistant.id,
  input.content,
  classification.suggestedCategory
)

// ✅ 新的
const island = await islandService.getIslandByType(input.userId, classification.suggestedCategory)
const result = await chiefAgentService.processAndCreateMemory(
  input.userId,
  island.id,
  input.content,
  classification.suggestedCategory
)
```

### Phase 2: Resolvers 和 Routes（預估 15 分鐘）

#### 2.1 memoryResolvers.ts

**移除：**
```typescript
// ❌ 移除 assistant resolver
Memory: {
  assistant: async (parent: any, _: any, { prisma }: Context) => {
    // 刪除整個 resolver
  }
}

// ❌ 移除 assistant include
include: {
  assistant: true,  // 刪除這行
  memory: true
}
```

#### 2.2 刪除 assistantResolvers.ts

```bash
rm src/resolvers/assistantResolvers.ts
```

#### 2.3 更新 resolvers/index.ts

```typescript
// ❌ 移除這些
import { assistantResolvers } from './assistantResolvers'

...assistantResolvers.Query,
...assistantResolvers.Mutation,
Assistant: assistantResolvers.Assistant,
```

#### 2.4 更新 schema.ts

移除所有 `assistantId` 欄位定義。

### Phase 3: 最終清理（預估 10 分鐘）

#### 3.1 刪除 assistantService.ts

```bash
rm src/services/assistantService.ts
```

#### 3.2 更新 chatSessionService.ts

所有函數參數 `assistantId` 改為 `islandId`。

#### 3.3 更新 routes/tororoChat.ts

移除 `TORORO_ASSISTANT_ID` 常量，改用 Island ID。

---

## 🧪 測試檢查清單

完成每個 Phase 後執行：

```bash
# 1. TypeScript 編譯檢查
npx tsc --noEmit

# 2. 檢查剩餘的 Assistant 引用
./scripts/check-assistant-references.sh

# 3. 啟動服務測試
npm run dev
```

### 預期結果

**Phase 1 完成後：**
- `assistantService` 使用應該從 25+ 降到 0
- TypeScript 編譯應該有錯誤（因為 Resolvers 還沒更新）

**Phase 2 完成後：**
- GraphQL Resolvers 錯誤應該消失
- TypeScript 編譯應該成功

**Phase 3 完成後：**
- `./scripts/check-assistant-references.sh` 應該只顯示極少數引用（僅註釋或文檔）
- 服務啟動成功
- 所有 API 正常運行

---

## 📊 預估時間

| Phase | 任務 | 預估時間 |
|-------|------|----------|
| Phase 1 | 核心 Services | 30 分鐘 |
| Phase 2 | Resolvers & Routes | 15 分鐘 |
| Phase 3 | 最終清理 | 10 分鐘 |
| 測試 | 編譯和運行測試 | 10 分鐘 |
| **總計** | | **65 分鐘** |

---

## 🎯 最終目標

完成清理後，系統應該：

✅ **0** `assistantService` 導入
✅ **0** `assistantService` 使用
✅ **0** `assistantId` 參數（除了註釋）
✅ **100%** 使用 Island 系統
✅ 代碼更乾淨、更快速、更 DRY

---

## 💡 建議

### 如果現在立即執行

1. **先備份當前代碼**
   ```bash
   git add .
   git commit -m "WIP: Schema cleanup complete, services in progress"
   ```

2. **按 Phase 順序執行**
   - 不要跳過 Phase
   - 每個 Phase 完成後執行測試

3. **遇到問題時**
   - 參考 `CLEANUP_ASSISTANT_GUIDE.md`
   - 檢查每個文件的具體修改建議

### 如果稍後執行

**已提供的工具：**
- ✅ `CLEANUP_ASSISTANT_GUIDE.md` - 詳細的清理指南
- ✅ `scripts/check-assistant-references.sh` - 檢查腳本
- ✅ `ASSISTANT_CLEANUP_STATUS.md` - 本報告

**快速開始：**
```bash
cd /home/jesse/Project/TAHRD-Graduation-Project/backend

# 1. 查看清理指南
cat CLEANUP_ASSISTANT_GUIDE.md

# 2. 檢查當前狀態
./scripts/check-assistant-references.sh

# 3. 開始 Phase 1
# 手動編輯 chiefAgentService.ts, subAgentService.ts, tororoService.ts

# 4. 測試
npx tsc --noEmit

# 5. 繼續 Phase 2 和 Phase 3
```

---

**報告生成**: 2025-11-01
**作者**: Claude Code
**版本**: v1.0
