# 動態 SubAgent 整合策略

## 🎯 目標
將固定的 `AssistantType` 枚舉系統改為從資料庫的 `Subcategory` 動態載入配置。

## 📊 現有架構分析

### 當前使用 AssistantType 的地方：
1. **ChiefAgentService** (`chiefAgentService.ts`)
   - `classifyContent()` - 分類內容
   - `quickClassifyForTororo()` - 白噗噗快速分類
   - `uploadKnowledge()` - 上傳知識
   - `analyzeKnowledge()` - 分析知識

2. **SubAgentService** (`subAgentService.ts`)
   - `evaluateKnowledge()` - 評估知識
   - `buildEvaluationPrompt()` - 構建提示詞
   - `fallbackEvaluation()` - 降級評估

3. **AssistantService** (`assistantService.ts`)
   - `getAssistantByType()` - 根據類型獲取助手
   - `loadAssistants()` - 載入助手

## 🔄 整合策略

### 方案：雙軌並行（向後兼容）

保留原有的 `Assistant` 系統，同時支援新的 `Subcategory` 系統：

1. **用戶有自訂 Subcategory** → 使用動態 SubAgent
2. **用戶無自訂 Subcategory** → 使用預設 Assistant

### 實作步驟：

#### 1. 創建動態 SubAgent 服務 ✅
- `DynamicSubAgentService` - 從資料庫載入 Subcategory
- 包含快取機制
- 支援關鍵字匹配

#### 2. 修改 Chief Agent
- 檢測用戶是否有 Subcategory
- 如果有：使用動態 SubAgent 進行分類
- 如果沒有：使用舊的 Assistant 系統

#### 3. 修改 Sub Agent
- 接受 Subcategory ID 而非 Assistant ID
- 使用 Subcategory 的 systemPrompt、personality、chatStyle
- 更新統計到 Subcategory

#### 4. 更新 Gemini CLI 提示詞
- 從 Subcategory 讀取動態提示詞
- 構建包含島嶼上下文的完整提示

## 🔑 關鍵修改點

### ChiefAgent - uploadKnowledge()

```typescript
// 舊版（固定類型）
const quickResult = await this.quickClassifyForTororo(userId, input)
const targetAssistant = await assistantService.getAssistantByType(quickResult.category)

// 新版（動態）
const userSubAgents = await dynamicSubAgentService.getUserSubAgents(userId)
if (userSubAgents.length > 0) {
  // 使用動態 SubAgent
  const relevantSubAgents = await dynamicSubAgentService.findRelevantSubAgents(
    userId,
    input.content,
    3
  )
  const targetSubAgent = relevantSubAgents[0]
  // 分發到該 SubAgent...
} else {
  // 降級到舊系統
  const quickResult = await this.quickClassifyForTororo(userId, input)
  const targetAssistant = await assistantService.getAssistantByType(quickResult.category)
  // 使用 Assistant...
}
```

### SubAgent - evaluateKnowledge()

```typescript
// 接受 subcategoryId
async evaluateKnowledge(
  userId: string,
  subcategoryId: string,  // 改為接受 subcategoryId
  distributionInput: DistributionInput
): Promise<EvaluationResult> {
  const subAgent = await dynamicSubAgentService.getSubAgentById(subcategoryId)
  if (!subAgent) {
    throw new Error(`SubAgent not found: ${subcategoryId}`)
  }
  
  // 使用 subAgent 的動態配置
  const prompt = this.buildEvaluationPrompt(subAgent, distributionInput)
  // ...
}
```

## ⚙️ 兼容性處理

### Memory 模型
已經支援雙系統：
- `assistantId` - 舊系統（可選）
- `subcategoryId` - 新系統（可選）

### 優先順序
1. 如果用戶有 Subcategory → 優先使用
2. 否則使用 Assistant 系統
3. 兩者都可以共存

## 📝 TODO
- [x] 創建 DynamicSubAgentService
- [x] 修改 ChiefAgent.uploadKnowledge 使用動態 SubAgent
- [x] 修改 SubAgent.evaluateKnowledge 接受 subcategoryId
- [x] 更新 SubAgent 提示詞構建邏輯
- [x] 修改 TaskQueueService 支援 metadata 參數
- [x] 後端編譯測試通過
- [ ] 功能整合測試（需要實際運行測試）
- [ ] 更新 API 文檔

---

## ✅ 實作摘要

### 已完成的修改

#### 1. **ChiefAgentService** (`chiefAgentService.ts:898-1095`)
- **新增**: 動態 SubAgent 檢查邏輯
- **流程變更**:
  1. 檢查用戶是否有自訂 Subcategory
  2. 如果有 → 使用 `findRelevantSubAgents()` 找到最相關的 SubAgent
  3. 創建 KnowledgeDistribution 時使用 subcategoryId
  4. 傳遞 `metadata: { useDynamicSubAgent: true }` 給任務隊列
  5. 如果沒有 → 降級到舊的 Assistant 系統
- **向後兼容**: 完全保留舊系統，兩者可共存

#### 2. **TaskQueueService** (`taskQueueService.ts:29-50, 77-100, 192-228`)
- **新增接口**: `QueueTask.metadata?: { useDynamicSubAgent?: boolean }`
- **參數更新**: `addTask()` 新增 `metadata` 參數
- **執行邏輯**:
  - 檢查 `metadata.useDynamicSubAgent`
  - 如果為 true → 調用 `processDistributionWithDynamicSubAgents()`
  - 如果為 false → 調用原有的 `processDistribution()`

#### 3. **SubAgentService** (`subAgentService.ts:571-892`)
- **新增方法**:
  - `processDistributionWithDynamicSubAgents()` - 動態 SubAgent 處理流程
  - `evaluateKnowledgeWithDynamicSubAgent()` - 使用動態配置評估
  - `buildDynamicEvaluationPrompt()` - 構建包含 Subcategory 完整配置的提示詞
  - `createMemoryWithDynamicSubAgent()` - 創建使用 subcategoryId 的記憶
  - `fallbackDynamicEvaluation()` - 基於關鍵字的降級評估

- **關鍵特性**:
  - 使用 Subcategory 的 `systemPrompt`、`personality`、`chatStyle`、`keywords`
  - 創建 Memory 時使用 `subcategoryId` 而非 `assistantId`
  - 自動更新 Subcategory 統計（`memoryCount`）
  - 在 Memory metadata 中保存 SubAgent 和 Island 名稱

#### 4. **DynamicSubAgentService** (`dynamicSubAgentService.ts`)
- 已在之前創建，提供完整的動態 SubAgent 載入和管理
- 包含快取機制、關鍵字匹配、統計更新等功能

### 架構優勢

1. **雙軌並行**: 支援新舊兩套系統同時運行
2. **向後兼容**: 沒有破壞性變更，現有功能完全保留
3. **自動選擇**: 根據用戶配置自動切換使用動態或預設系統
4. **完整配置**: SubAgent 使用完整的 Subcategory 配置（systemPrompt、personality、chatStyle）
5. **統計追蹤**: 自動更新 Subcategory 的使用統計

### 資料流程

```
用戶上傳知識
    ↓
Chief Agent 檢查是否有 Subcategory
    ↓
有 Subcategory ─────→ 動態 SubAgent 路徑
    │                     ↓
    │              findRelevantSubAgents()
    │                     ↓
    │              TaskQueue (metadata.useDynamicSubAgent = true)
    │                     ↓
    │              processDistributionWithDynamicSubAgents()
    │                     ↓
    │              創建 Memory (使用 subcategoryId)
    │
無 Subcategory ─────→ 預設 Assistant 路徑
                          ↓
                   getAssistantByType()
                          ↓
                   TaskQueue (無 metadata)
                          ↓
                   processDistribution()
                          ↓
                   創建 Memory (使用 assistantId)
```

### 測試狀態

- ✅ TypeScript 編譯成功
- ⏳ 功能整合測試（待執行）
- ⏳ 端對端測試（需要實際運行環境）
