# RAG 系統實現總結 - 黑噗噗對話增強

> **實現日期**: 2025-10-30
> **實現者**: Claude Code
> **目標**: 優化黑噗噗對話，使用 RAG (Retrieval-Augmented Generation) 實現語意相關性 + 時間維度的雙重檢索

---

## 🎯 實現目標

將黑噗噗（Chief Agent）的對話系統從簡單的「最近 10 條記憶」升級為**智能 RAG 系統**：

✅ **語意相關性**: 使用向量嵌入和餘弦相似度找出與問題最相關的記憶
✅ **時間維度**: 保留最近的記憶以維持時間脈絡
✅ **雙重檢索**: 合併語意搜索和時間檢索，去重並優先語意相關
✅ **自動向量化**: 新記憶創建時自動生成向量嵌入
✅ **批量處理**: 提供腳本為現有記憶批量生成向量

---

## 📦 系統架構

### 現有基礎設施（已存在）

項目已經有完整的 RAG 基礎設施：

1. **向量服務** (`vectorService.ts`)
   - 使用 Gemini text-embedding-004 模型
   - 768 維向量嵌入
   - 餘弦相似度計算
   - 語意搜索功能

2. **混合檢索服務** (`hybridSearchService.ts`)
   - 語意搜索（向量相似度）
   - 結構化查詢（時間、分類、標籤）
   - 統計聚合
   - 混合檢索策略

3. **資料庫 Schema** (`MemoryEmbedding` 模型)
   ```prisma
   model MemoryEmbedding {
     id             String   @id
     memoryId       String   @db.ObjectId
     userId         String   @db.ObjectId
     embedding      Float[]  // 768 維向量
     embeddingModel String   @default("text-embedding-004")
     textContent    String
     dimension      Int      @default(768)
   }
   ```

---

## 🔧 本次實現內容

### 1. 優化 chatWithChief 方法 ⚡

**檔案**: `backend/src/services/chiefAgentService.ts`

**改動內容**:
- 添加 `vectorService` 導入
- 實現雙重檢索策略：
  1. 語意搜索（相似度 > 0.6）
  2. 時間檢索（最近 10 條）
  3. 合併去重（優先語意 + 補充時間）
- 改進 prompt 構建（標註記憶來源）
- 添加性能日誌

**核心代碼**:
```typescript
// 1️⃣ 語意搜索：找出語意相關的記憶（相似度 > 0.6）
const semanticMemories = await vectorService.semanticSearch(
  userId,
  message,
  10,  // 取前 10 條
  0.6  // 相似度閾值
)

// 2️⃣ 時間維度：最近 10 條記憶
const recentMemories = await memoryService.getMemories({
  userId,
  limit: 10
})

// 3️⃣ 合併去重：優先語意相關 + 補充時間維度
const semanticMemoryIds = new Set(semanticMemories.map(m => m.memoryId))
const mergedMemoryIds = [
  ...semanticMemoryIds,
  ...recentMemories
    .filter(m => !semanticMemoryIds.has(m.id))
    .slice(0, 5)
    .map(m => m.id)
]
```

**Prompt 改進**:
```
【知識庫上下文】以下是與你的問題相關的記憶：
1. [🔍 語意相關] [LEARNING] TypeScript 進階技巧...
   內容: 學習了 TypeScript 的泛型和類型推導...

2. [🕒 最近記錄] [WORK] 專案進度更新...
   內容: 今天完成了用戶認證模組...
```

---

### 2. 自動向量嵌入生成 🤖

**檔案**: `backend/src/services/subAgentService.ts`

**改動內容**:
- 添加 `vectorService` 導入
- 在兩處記憶創建後添加向量生成：
  1. `createMemory()` - 標準記憶創建
  2. `createMemoryWithIsland()` - Island-based 記憶創建

**實現方式**: 異步生成（不阻塞主流程）
```typescript
// === 異步生成向量嵌入（RAG 支持）===
vectorService.generateEmbedding(memory.id, userId)
  .then(() => {
    logger.info(`[${assistant.name}] 向量嵌入生成成功: ${memory.id}`)
  })
  .catch((error) => {
    logger.error(`[${assistant.name}] 向量嵌入生成失敗: ${memory.id}`, error)
  })
```

---

### 3. 批量處理腳本 📜

**檔案**: `backend/scripts/generateEmbeddings.ts`

**功能**:
- 為現有記憶批量生成向量嵌入
- 支持指定用戶 ID
- 批量並發控制（避免 API rate limit）
- 詳細進度日誌
- 統計報告

**使用方式**:
```bash
# 為所有用戶生成（最多 1000 條，批量大小 10）
npx ts-node scripts/generateEmbeddings.ts

# 為特定用戶生成
npx ts-node scripts/generateEmbeddings.ts <userId>

# 自定義參數
npx ts-node scripts/generateEmbeddings.ts <userId> <limit> <batchSize>
```

**輸出範例**:
```
=== 開始批量生成向量嵌入 ===
📊 統計：
  - 總記憶數: 150
  - 已有嵌入: 50
  - 缺少嵌入: 100

🚀 開始處理 100 條記憶...
   批量大小: 10

📦 批次 1/10 (10 條記憶)
  ✅ 6731f2a8... - 學習 React Hooks
  ✅ 8a42d9e1... - 今天心情很好
  ...
  批次完成: 成功 10, 失敗 0

=== 批量生成完成 ===
✅ 成功: 100
❌ 失敗: 0
📊 成功率: 100.0%
```

---

## 🚀 性能優化

### 1. 並發查詢
語意搜索和時間檢索可以並發執行（目前順序執行，可進一步優化）

### 2. 向量緩存
Gemini Embedding API 調用已緩存（vectorService 內部處理）

### 3. 批量控制
- 批量生成腳本: 10 條/批次，批次間延遲 2 秒
- 自動生成: 異步非阻塞，不影響主流程

---

## 📊 預期效果

### 改善前（簡單時間檢索）
```typescript
// 只取最近 10 條記憶
const recentMemories = await memoryService.getMemories({
  userId,
  limit: 10
})
```

**問題**:
- ❌ 可能錯過相關但較早的記憶
- ❌ 無法理解語意相關性
- ❌ 回答不夠精準

### 改善後（RAG 雙重檢索）
```typescript
// 語意相關（top 10）+ 時間維度（recent 10）
// 合併去重，最多 15 條記憶作為上下文
```

**優勢**:
- ✅ 語意相關性高：找出真正相關的記憶
- ✅ 時間脈絡保留：不會丟失最近的上下文
- ✅ 回答更精準：基於更相關的知識
- ✅ 用戶體驗提升：黑噗噗真正「理解」問題

---

## 🧪 測試建議

### 1. 基礎功能測試

**測試場景 A: 語意搜索**
```
用戶記憶：
- 3 天前：「學習了 React Hooks 的 useState 和 useEffect」
- 2 天前：「今天去爬山，天氣很好」
- 1 天前：「學習了 React Context API」

用戶問題：「我之前學過哪些 React 相關的東西？」

預期行為：
✅ 應該找到第 1 和第 3 條記憶（語意相關）
✅ 不應該返回第 2 條記憶（無關）
```

**測試場景 B: 時間維度**
```
用戶記憶：
- 30 天前：「學習 TypeScript 泛型」
- 5 天前：「今天吃了好吃的火鍋」
- 3 天前：「完成了專案的用戶認證模組」

用戶問題：「最近發生了什麼事？」

預期行為：
✅ 應該優先返回最近的記憶（第 2、3 條）
✅ 可能不包含第 1 條（太久遠且無語意相關）
```

**測試場景 C: 雙重檢索**
```
用戶記憶：
- 20 天前：「深入學習了 RAG 系統架構」（語意相關但較舊）
- 2 天前：「今天去健身房運動」（最近但無關）
- 1 天前：「實現了 RAG 的向量搜索功能」（語意相關且最近）

用戶問題：「我對 RAG 系統了解多少？」

預期行為：
✅ 應該返回第 1 和第 3 條（語意相關）
✅ 可能包含第 2 條（最近記憶補充時間脈絡）
✅ 優先展示第 3 條（語意相關 + 時間新鮮）
```

### 2. 性能測試

**監控指標**:
- 語意搜索時間: < 500ms
- 時間檢索時間: < 100ms
- 總處理時間: < 3 秒（包含 Gemini API 調用）

**測試方式**:
```bash
# 查看後端日誌
docker compose -f docker-compose.production-prebuilt.yml logs -f backend | grep "Chat with Chief"
```

**預期日誌**:
```
[Chat with Chief] User xxx asks: "我之前學過哪些 React 相關的東西？"
[Chat with Chief] Semantic search completed in 320ms, found 5 relevant memories
[Chat with Chief] Temporal search completed in 45ms, found 10 recent memories
[Chat with Chief] Chat completed in 2456ms, used 8 memories (5 semantic + 3 temporal)
```

### 3. 批量生成測試

**測試步驟**:
```bash
cd backend

# 1. 檢查當前狀態
npx prisma db execute --stdin <<< "db.memories.count()"
npx prisma db execute --stdin <<< "db.memory_embeddings.count()"

# 2. 執行批量生成
npx ts-node scripts/generateEmbeddings.ts

# 3. 驗證結果
npx prisma db execute --stdin <<< "db.memory_embeddings.count()"
```

---

## 🔍 故障排查

### 問題 1: 語意搜索無結果

**可能原因**:
- 記憶沒有向量嵌入
- 相似度閾值太高（當前 0.6）

**解決方案**:
```bash
# 檢查向量嵌入覆蓋率
docker exec heart-whisper-backend npx prisma db execute --stdin <<< "
  db.memories.count()
  db.memory_embeddings.count()
"

# 執行批量生成
docker exec heart-whisper-backend npx ts-node scripts/generateEmbeddings.ts
```

### 問題 2: API 配額用盡

**錯誤訊息**: `API 配額已用盡`

**解決方案**:
- 檢查 Gemini API Key 配額
- 減少批量生成的並發數
- 增加批次間延遲時間

### 問題 3: 向量生成失敗

**可能原因**:
- 記憶內容為空
- API 網路問題
- 超時

**解決方案**:
```typescript
// 檢查日誌
docker compose logs backend | grep "向量嵌入生成失敗"

// 手動重試失敗的記憶
npx ts-node scripts/generateEmbeddings.ts <userId> 50
```

---

## 📝 代碼變更清單

### 修改的文件

1. **backend/src/services/chiefAgentService.ts**
   - 添加 `vectorService` 導入
   - 重寫 `chatWithChief` 方法實現 RAG

2. **backend/src/services/subAgentService.ts**
   - 添加 `vectorService` 導入
   - 在 `createMemory()` 添加向量生成
   - 在 `createMemoryWithIsland()` 添加向量生成

### 新增的文件

3. **backend/scripts/generateEmbeddings.ts**
   - 批量生成向量嵌入腳本

---

## 🎓 技術亮點

### 1. 智能雙重檢索
結合語意相關性和時間維度，既精準又保持上下文

### 2. 異步非阻塞
向量生成不阻塞主流程，提升用戶體驗

### 3. 容錯設計
語意搜索失敗時自動降級為時間檢索

### 4. 詳細日誌
每個階段都有性能監控和調試日誌

### 5. 可擴展性
- 可調整相似度閾值（當前 0.6）
- 可調整檢索數量（語意 10 + 時間 10）
- 可切換向量模型

---

## 🔮 未來優化方向

### 1. 並發優化
將語意搜索和時間檢索改為並發執行，節省 ~100ms

### 2. 緩存策略
對常見問題緩存搜索結果，減少 API 調用

### 3. 混合評分
結合語意相關性和時間新鮮度計算綜合分數：
```
score = similarity * 0.7 + recency * 0.3
```

### 4. 動態閾值
根據搜索結果數量動態調整相似度閾值

### 5. 用戶反饋學習
記錄用戶對回答的評價，優化檢索策略

---

## ✅ 檢查清單

- [x] vectorService 導入添加
- [x] chatWithChief 方法重寫
- [x] 雙重檢索策略實現
- [x] 自動向量生成（兩處）
- [x] 批量處理腳本創建
- [x] 日誌和監控添加
- [x] 文檔編寫完成
- [ ] 功能測試（待用戶測試）
- [ ] 性能測試（待用戶測試）
- [ ] 批量生成執行（待用戶執行）

---

## 📞 測試指引

### 第一步：執行批量生成（為現有記憶生成向量）

```bash
cd backend
npx ts-node scripts/generateEmbeddings.ts
```

### 第二步：重啟後端服務

```bash
docker compose -f docker-compose.production-prebuilt.yml restart backend
```

### 第三步：測試對話功能

在前端與黑噗噗對話，嘗試以下問題：
- 「我之前學過哪些技術？」
- 「我最近在做什麼專案？」
- 「我對 React 了解多少？」

### 第四步：查看日誌

```bash
docker compose -f docker-compose.production-prebuilt.yml logs -f backend | grep "Chat with Chief"
```

觀察：
- ✅ 語意搜索是否成功
- ✅ 找到多少條相關記憶
- ✅ 總處理時間是否合理

---

**最後更新**: 2025-10-30
**狀態**: ✅ 實現完成，待測試
**下一步**: 用戶測試並根據反饋調整參數
