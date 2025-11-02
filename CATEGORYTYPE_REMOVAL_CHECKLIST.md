# CategoryType 移除快速檢查清單

> 配合使用 `CATEGORYTYPE_REMOVAL_PLAN.md` 詳細計劃

---

## 📋 檔案修改檢查清單

### 資料庫層

- [ ] `backend/prisma/schema.prisma`
  - [ ] 移除 `enum CategoryType { ... }`
  - [ ] 移除 `Memory.category` 欄位
  - [ ] 移除 `Tag.category` 欄位  
  - [ ] 移除 `AgentDecision.targetCategory` 欄位
  - [ ] 移除 `AgentDecision.suggestedCategory` 欄位
  - [ ] 移除 `@@index([userId, category])` 索引
  - [ ] 移除 `@@index([userId, category, createdAt(sort: Desc)])` 索引

### 後端核心服務 (8個)

- [ ] `chiefAgentService.ts`
  - [ ] 移除 `CategoryType` import
  - [ ] 修改 `ClassificationResult` 介面
  - [ ] 修改 `KnowledgeAnalysis` 介面
  - [ ] 重寫 `classifyContent()` → `classifyContentToIsland()`
  - [ ] 修改 `quickClassifyAndRespond()`
  - [ ] 移除所有 `CategoryType.LIFE` 等預設值

- [ ] `subAgentService.ts`
  - [ ] 移除 `CategoryType` import
  - [ ] 修改 `EvaluationResult` 介面（移除 suggestedCategory）
  - [ ] 修改評估 Prompt（移除 suggestedCategory）
  - [ ] 修改 `createMemoryFromEvaluation()`（移除 category）

- [ ] `memoryService.ts`
  - [ ] 移除 `CategoryType` import
  - [ ] 修改 `MemoryFilterOptions` 介面（移除 category）
  - [ ] 修改 `CreateMemoryInput` 介面（移除 category）
  - [ ] 修改 `getMemories()` 方法（移除 category 過濾）
  - [ ] 修改 `createMemory()` 方法（移除 category 欄位）

- [ ] `categoryService.ts`
  - [ ] 選擇：A) 完全移除檔案 或 B) 重構為 Island 工具
  - [ ] 如選 A：找出所有 `import { categoryService }` 並移除

- [ ] `tororoService.ts`
  - [ ] 移除 `CategoryType` import
  - [ ] 修改 `TororoResponse.memory.category` → `islandName`

- [ ] `hijikiService.ts`
  - [ ] 移除 `CategoryType` import
  - [ ] 修改 `HijikiQueryInput.filters.categories` → `islandIds`
  - [ ] 修改 `searchWithHijiki()` 過濾邏輯

- [ ] `analyticsEngine.ts`
  - [ ] 移除 `CategoryType` import
  - [ ] 修改 `KnowledgeStatistics.byCategory` → `byIsland`
  - [ ] 重寫 `getCategoryDistribution()` → `getIslandDistribution()`

- [ ] `hybridSearchService.ts`
  - [ ] 移除 category 過濾邏輯

### 後端其他服務 (2個)

- [ ] `categoryInitService.ts` - 檢查是否有 CategoryType 邏輯
- [ ] `lineBotService.ts` - 檢查是否有 CategoryType 引用

### GraphQL 層 (3個)

- [ ] `backend/src/schema.ts`
  - [ ] 移除 `enum CategoryType { ... }` (行 40-49)
  - [ ] 移除 `Memory.category` (行 97)
  - [ ] 移除 `Tag.category` (行 202)
  - [ ] 移除 `AgentDecision.targetCategory` (行 250)
  - [ ] 移除 `AgentDecision.suggestedCategory` (行 259)
  - [ ] 修改 `TororoQuickResponse.category` → `islandId/islandName`
  - [ ] 修改 `ClassificationResult` 介面
  - [ ] 移除 `CategoryStats.category` (行 312)
  - [ ] 移除 `CreateMemoryDirectInput.category` (行 411)
  - [ ] 移除 `UpdateMemoryInput.category` (行 419)
  - [ ] 移除 `MemoryFilterInput.category` (行 432)
  - [ ] 修改 `HijikiFilterInput.categories` → `islandIds` (行 635)

- [ ] `backend/src/resolvers/memoryResolvers.ts`
  - [ ] 移除 `CategoryType` import
  - [ ] 修改過濾邏輯

- [ ] `backend/src/resolvers/categoryResolvers.ts`
  - [ ] 檢查是否有 CategoryType 相關邏輯

### 前端類型定義 (2個)

- [ ] `frontend/src/types/category.ts`
  - [ ] 整個檔案移除（或註釋掉）

- [ ] `frontend/src/types/memory.ts`
  - [ ] 移除 `type MemoryCategory`
  - [ ] 移除 `Memory.category` 欄位
  - [ ] 移除 `RelatedMemoryPreview.category` 欄位
  - [ ] 移除 `MemoryFilterInput.category` 欄位
  - [ ] 移除 `UpdateMemoryInput.category` 欄位

### 前端 GraphQL 查詢 (4個)

- [ ] `frontend/src/graphql/memory.ts`
  - [ ] 移除所有 `category` 欄位查詢
  - [ ] 確保有 `islandId` 和 `island { ... }` 查詢

- [ ] `frontend/src/graphql/knowledge.ts`
  - [ ] 檢查並移除 `category` 欄位

- [ ] `frontend/src/graphql/category.ts`
  - [ ] 檢查並移除 CategoryType 相關查詢

- [ ] `frontend/src/graphql/taskHistory.ts`
  - [ ] 檢查並移除 `category` 欄位

### 前端 UI 組件 (需檢查的主要組件)

- [ ] `TororoKnowledgeAssistant.tsx` - 檢查 CategoryType 引用
- [ ] `MemoryDetailModal.tsx` - 移除 category 顯示
- [ ] `MemoryEditor.tsx` - 移除 category 編輯
- [ ] `Editor/CategorySelector.tsx` - 改為 Island 選擇器或移除
- [ ] `DatabaseView/CuteDatabaseView.tsx` - 移除 category 過濾
- [ ] 統計圖表組件 - 改為顯示 byIsland

---

## 🔧 執行步驟檢查清單

### Stage 1: 準備 (1小時)

- [ ] 備份生產資料庫
  ```bash
  mongodump --uri="$PRODUCTION_DB_URL" --out=/backup/categorytype-removal-$(date +%Y%m%d)
  ```

- [ ] 記錄當前統計
  - [ ] Memory 總數
  - [ ] CategoryType 分佈
  - [ ] Island memoryCount

- [ ] 創建驗證腳本
  - [ ] `backend/scripts/verify-categorytype-removal.ts`

- [ ] 創建回滾腳本
  - [ ] `backend/scripts/rollback-categorytype-removal.sh`

### Stage 2: 後端核心修改 (2-3小時)

- [ ] 修改 `chiefAgentService.ts` (45分鐘)
- [ ] 修改 `subAgentService.ts` (30分鐘)
- [ ] 修改 `memoryService.ts` (15分鐘)
- [ ] 處理 `categoryService.ts` (15分鐘)
- [ ] 修改其他服務 (30分鐘)
  - [ ] tororoService.ts
  - [ ] hijikiService.ts
  - [ ] analyticsEngine.ts
  - [ ] hybridSearchService.ts
- [ ] 測試編譯
  ```bash
  cd backend && npm run build
  ```

### Stage 3: GraphQL Schema 修改 (30分鐘)

- [ ] 修改 `schema.ts` (20分鐘)
- [ ] 修改 resolvers (10分鐘)
- [ ] 測試 GraphQL
  ```bash
  npm run dev
  # 測試 GraphQL Playground
  ```

### Stage 4: 資料庫 Schema 遷移 (30分鐘)

- [ ] 修改 `schema.prisma` (10分鐘)
- [ ] 測試環境執行 (10分鐘)
  ```bash
  npx prisma db push --skip-generate
  npx prisma generate
  npx prisma validate
  ```
- [ ] 驗證資料完整性 (10分鐘)
  ```bash
  ts-node scripts/verify-categorytype-removal.ts
  ```

### Stage 5: 前端修改 (1.5-2小時)

- [ ] 修改類型定義 (20分鐘)
  - [ ] 移除/修改 `types/category.ts`
  - [ ] 修改 `types/memory.ts`

- [ ] 修改 GraphQL 查詢 (20分鐘)
  - [ ] memory.ts
  - [ ] knowledge.ts
  - [ ] category.ts

- [ ] 修改 UI 組件 (40分鐘)
  - [ ] 移除 Category 選擇器
  - [ ] 更新記憶編輯器
  - [ ] 更新過濾器
  - [ ] 更新統計圖表

- [ ] 測試編譯 (10分鐘)
  ```bash
  cd frontend && npm run build
  ```

### Stage 6: 整合測試 (1小時)

- [ ] 知識上傳流程 (20分鐘)
  - [ ] 上傳文字知識
  - [ ] 上傳多模態內容
  - [ ] 驗證 AI 分類到正確 Island
  - [ ] 檢查 SubAgent 評估和儲存

- [ ] 記憶管理 (15分鐘)
  - [ ] 查詢記憶列表
  - [ ] 按 Island 過濾
  - [ ] 搜尋記憶
  - [ ] 編輯記憶
  - [ ] 刪除記憶

- [ ] 黑噗噗 RAG 搜尋 (10分鐘)
  - [ ] 語義搜尋
  - [ ] 按 Island 過濾
  - [ ] 統計分析

- [ ] 白噗噗回應 (10分鐘)
  - [ ] 檢查回應格式
  - [ ] 驗證島嶼顯示

- [ ] 統計和分析 (5分鐘)
  - [ ] 按島嶼分佈統計
  - [ ] 趨勢分析

### Stage 7: 生產環境部署 (30分鐘)

- [ ] 提交代碼
  ```bash
  git add .
  git commit -m "refactor: Remove CategoryType system, use Island as single classification"
  git push origin main
  ```

- [ ] 合併到 production 分支
  ```bash
  git checkout production
  git merge main
  git push origin production
  ```

- [ ] CI/CD 自動部署 (等待完成)

- [ ] 生產環境驗證
  - [ ] 檢查服務狀態
  - [ ] 驗證基本功能
  - [ ] 監控錯誤日誌

---

## ✅ 手動測試檢查清單

### 前端測試

- [ ] 上傳知識（文字）
- [ ] 上傳知識（多模態：圖片 + 連結）
- [ ] 查看記憶列表
- [ ] 按島嶼過濾記憶
- [ ] 搜尋記憶
- [ ] 編輯記憶（確認沒有 category 選項）
- [ ] 刪除記憶
- [ ] 白噗噗對話
- [ ] 黑噗噗搜尋
- [ ] 統計頁面顯示（確認顯示 byIsland）

### 後端測試

- [ ] GraphQL Playground 測試所有 Query
- [ ] GraphQL Playground 測試所有 Mutation
- [ ] 檢查伺服器日誌無錯誤
- [ ] 檢查 AI 分類日誌（應該顯示 Island ID）
- [ ] 檢查資料庫統計一致性

---

## ⚠️ 關鍵檢查點

### 編譯檢查

- [ ] 後端 TypeScript 編譯無錯誤
- [ ] 前端 TypeScript 編譯無錯誤
- [ ] Prisma Client 生成成功
- [ ] GraphQL Schema 驗證通過

### 資料完整性檢查

- [ ] 所有 Memory 都有 islandId
- [ ] 沒有孤立的 Memory (islandId 不存在)
- [ ] Island 的 memoryCount 統計正確
- [ ] 沒有遺漏的 CategoryType 引用

### 功能驗證

- [ ] AI 分類返回 Island ID（不是 CategoryType）
- [ ] SubAgent 評估不再返回 suggestedCategory
- [ ] 記憶創建只需要 islandId（不需要 category）
- [ ] 過濾和搜尋使用 islandId（不是 category）
- [ ] 統計分析顯示 byIsland（不是 byCategory）

---

## 🔴 如果遇到問題

### 立即回滾條件

- 🚨 資料丟失
- 🚨 服務不可用
- 🚨 錯誤率 > 5%（15分鐘內）

### 回滾步驟

```bash
# 1. 還原資料庫
mongorestore --uri="$PRODUCTION_DB_URL" /backup/categorytype-removal-YYYYMMDD

# 2. 回滾代碼
git revert <commit-hash>
git push origin production --force

# 3. 驗證服務恢復
curl -f http://localhost:4000/graphql
```

---

**創建時間**: 2025-11-01  
**配合使用**: `CATEGORYTYPE_REMOVAL_PLAN.md`
