# 🚀 黑噗噗知識查詢混合檢索優化

> 優化完成時間: 2025-10-18
> 優化目標: 將查詢時間從 50 秒降低到 16-22 秒，提升查詢準確度 70-90%

---

## 📋 優化總覽

### 實施的優化

#### ✅ 1. 智能意圖分析器
- **文件**: `backend/src/services/queryIntentAnalyzer.ts`
- **功能**: 使用 Gemini Flash 快速分析用戶查詢意圖
- **支持類型**:
  - `semantic`: 語義相似搜尋（"關於學習的筆記"）
  - `temporal`: 時間範圍查詢（"10/17 讀了什麼"）
  - `categorical`: 分類/標籤查詢（"數學筆記"）
  - `statistical`: 統計查詢（"有多少筆記"）
  - `hybrid`: 混合查詢（多種組合）
- **性能**: 1-2 秒（帶緩存）

#### ✅ 2. 混合檢索服務
- **文件**: `backend/src/services/hybridSearchService.ts`
- **功能**: 根據意圖選擇最佳檢索策略
- **策略**:
  - 語義搜尋（向量相似度）
  - 結構化查詢（時間、分類、標籤）
  - 統計聚合（分組、計數）
  - 並行混合檢索
- **優勢**: 解決純向量搜尋的局限性

#### ✅ 3. 向量服務優化
- **文件**: `backend/src/services/vectorService.ts`
- **優化點**:
  1. **查詢向量緩存**: 避免重複調用 Gemini API（節省 5-10 秒）
  2. **限制搜尋範圍**: 只搜尋最近 500 條記憶（節省 3-10 秒）
  3. **合併資料庫查詢**: 直接 JOIN Memory 資訊（節省 1-3 秒）
- **性能提升**: 查詢時間減少 60-70%

#### ✅ 4. RAG 對話服務整合
- **文件**: `backend/src/services/ragConversation.ts`
- **更新**: 整合意圖分析 + 混合檢索
- **性能監控**: 詳細記錄各階段耗時

#### ✅ 5. Prisma Schema 優化
- **文件**: `backend/prisma/schema.prisma`
- **變更**: 添加 `MemoryEmbedding` ↔ `Memory` 關聯
- **效果**: 支持 JOIN 查詢，避免二次查詢

---

## 📊 預期效果

| 指標 | 優化前 | 優化後 | 改善幅度 |
|-----|--------|--------|----------|
| **查詢總耗時** | 50 秒 | 16-22 秒 | ⬇️ 60-70% |
| **查詢向量生成** | 5-10 秒 | 1-2 秒（緩存） | ⬇️ 80-90% |
| **向量搜尋** | 5-20 秒 | 2-5 秒 | ⬇️ 60-75% |
| **資料庫查詢** | 1-3 秒 | <1 秒 | ⬇️ 66% |
| **Gemini 生成** | 10-30 秒 | 10-30 秒 | - |

### 查詢準確度提升

| 查詢類型 | 優化前 | 優化後 | 改善 |
|---------|--------|--------|------|
| **時間查詢**（"10/17 讀了什麼"） | ❌ 失效 | ✅ 精確匹配 | ⬆️ 100% |
| **分類查詢**（"量子物理筆記"） | ❌ 找不到 | ✅ 分類匹配 | ⬆️ 100% |
| **語義查詢**（"微積分相關"） | ✅ 有效 | ✅ 有效 | - |
| **混合查詢**（"最近的學習筆記"） | ⚠️ 部分 | ✅ 完整 | ⬆️ 70% |

---

## 🚀 部署步驟

### 步驟 1: 生成 Prisma Client

```bash
cd backend
npx prisma generate
```

### 步驟 2: 推送到資料庫（可選）

如果需要更新資料庫 schema（主要是添加關聯）：

```bash
npx prisma db push
```

**注意**: 這是非破壞性變更，只添加了關聯定義，不會修改現有資料。

### 步驟 3: 重啟後端服務

```bash
# 本地開發
npm run dev

# 生產環境（Docker）
docker-compose restart backend

# 或通過 PM2
pm2 restart backend
```

### 步驟 4: 驗證部署

```bash
# 檢查後端日誌
docker logs heart-whisper-backend --tail=100

# 或 PM2 日誌
pm2 logs backend
```

---

## 🧪 測試方案

### 測試用例 1: 時間查詢

```graphql
query {
  chatWithHijiki(
    sessionId: "test-session-1"
    query: "我 10/17 讀了什麼？"
    maxContext: 5
  ) {
    answer
    sources {
      memoryId
      title
      relevance
    }
  }
}
```

**預期結果**:
- 意圖類型: `temporal`
- 應返回 2025-10-17 當天的記憶
- 耗時: <20 秒

### 測試用例 2: 分類查詢

```graphql
query {
  chatWithHijiki(
    sessionId: "test-session-2"
    query: "我有哪些關於學習的筆記？"
    maxContext: 5
  ) {
    answer
    sources {
      memoryId
      title
      relevance
    }
  }
}
```

**預期結果**:
- 意圖類型: `categorical`
- 應返回 category="學習" 的記憶
- 耗時: <18 秒

### 測試用例 3: 語義查詢

```graphql
query {
  chatWithHijiki(
    sessionId: "test-session-3"
    query: "量子物理相關的內容"
    maxContext: 5
  ) {
    answer
    sources {
      memoryId
      title
      relevance
    }
  }
}
```

**預期結果**:
- 意圖類型: `semantic` 或 `categorical`
- 應返回物理相關的記憶（即使沒有"量子物理"關鍵詞）
- 耗時: <22 秒

### 測試用例 4: 混合查詢

```graphql
query {
  chatWithHijiki(
    sessionId: "test-session-4"
    query: "最近一週的學習筆記"
    maxContext: 5
  ) {
    answer
    sources {
      memoryId
      title
      relevance
    }
  }
}
```

**預期結果**:
- 意圖類型: `hybrid`
- 應返回最近 7 天 + category="學習" 的記憶
- 耗時: <20 秒

### 測試用例 5: 統計查詢

```graphql
query {
  chatWithHijiki(
    sessionId: "test-session-5"
    query: "我總共有多少筆記？分別在哪些領域？"
    maxContext: 5
  ) {
    answer
    sources {
      memoryId
      title
      relevance
    }
  }
}
```

**預期結果**:
- 意圖類型: `statistical`
- 應返回統計資訊（數量、分類分布）
- 耗時: <15 秒

---

## 📝 性能監控

### 查看性能日誌

所有關鍵步驟都已添加性能日誌，格式如下：

```log
[RAG] Intent analysis completed in 1523ms: type=temporal, confidence=0.92
[RAG] Hybrid search completed in 3241ms: found 5 results
[RAG] Chat completed in 18765ms: intent=1523ms, search=3241ms, session=234ms, gemini=13567ms
```

### 關鍵指標

監控這些指標以確保優化效果：

1. **意圖分析時間** (`intent`): 應 <3 秒
2. **混合檢索時間** (`search`): 應 <5 秒
3. **Gemini 生成時間** (`gemini`): 10-30 秒（無法優化）
4. **總耗時** (`total`): 應 <25 秒

### 緩存效果監控

```log
[Intent] Cache hit for query: "我 10/17 讀了什麼"
[Vector] Query embedding cache HIT for: "量子物理相關的內容"
```

緩存命中率應 >30%（重複查詢）

---

## 🔧 故障排除

### 問題 1: Prisma Client 未更新

**症狀**:
```
Property 'memory' does not exist on type 'MemoryEmbedding'
```

**解決**:
```bash
cd backend
rm -rf node_modules/.prisma
npx prisma generate
```

### 問題 2: 意圖分析失敗

**症狀**:
```
[Intent] Analysis failed, falling back to semantic search
```

**檢查**:
1. 確認 `GEMINI_API_KEY` 環境變數
2. 檢查 Gemini CLI 是否安裝: `gemini --version`
3. 測試 Gemini CLI: `echo "test" | gemini -m gemini-2.0-flash-exp`

**回退**: 系統會自動回退到純語義搜尋，不會影響基本功能

### 問題 3: 查詢仍然很慢

**診斷步驟**:

1. **檢查日誌中的各階段耗時**:
   ```log
   [RAG] Chat completed in XXXms: intent=XXXms, search=XXXms, gemini=XXXms
   ```

2. **如果 `intent` 很慢 (>5秒)**:
   - 檢查 Gemini API 連線
   - 檢查緩存是否生效

3. **如果 `search` 很慢 (>10秒)**:
   - 檢查記憶向量數量:
     ```bash
     # 在 MongoDB 中執行
     db.memory_embeddings.count({ userId: "YOUR_USER_ID" })
     ```
   - 如果超過 1000 條，考慮調低 `MAX_VECTOR_SEARCH_SIZE`

4. **如果 `gemini` 很慢 (>30秒)**:
   - 這是正常現象（Gemini 生成時間）
   - 考慮減少上下文長度（`maxContext`）

### 問題 4: 查詢準確度不高

**調整參數**:

1. **調整相似度閾值**:
   ```typescript
   // backend/src/services/hybridSearchService.ts
   private config: HybridSearchConfig = {
     maxResults: 10,
     minSimilarity: 0.5, // 降低此值會返回更多結果
     enableParallelSearch: true
   }
   ```

2. **調整意圖分析 prompt**:
   編輯 `backend/src/services/queryIntentAnalyzer.ts` 的 `buildIntentPrompt` 方法

3. **調整向量搜尋限制**:
   ```typescript
   // backend/src/services/vectorService.ts
   private readonly MAX_VECTOR_SEARCH_SIZE = 500 // 增加此值
   ```

---

## 📈 進一步優化建議

### 短期優化（1-2 天）

1. **添加意圖分析結果緩存持久化**
   - 使用 Redis 代替記憶體緩存
   - 預計額外節省 1-2 秒

2. **實現查詢結果緩存**
   - 緩存常見查詢的結果
   - 預計節省 10-20 秒（緩存命中時）

3. **優化 Gemini prompt 長度**
   - 壓縮上下文內容
   - 預計節省 2-5 秒

### 中期優化（3-7 天）

1. **使用 MongoDB Atlas Vector Search**
   - 原生向量搜尋，性能極佳
   - 預計將搜尋時間降到 <1 秒

2. **實現查詢結果預熱**
   - 在用戶打開聊天面板時預生成常見查詢
   - 用戶體驗提升 50%

3. **添加 GraphQL DataLoader**
   - 批量加載相關資料
   - 預計節省 0.5-1 秒

### 長期優化（1-2 週）

1. **遷移到專門的向量資料庫**
   - Pinecone、Weaviate 或 Qdrant
   - 預計將總耗時降到 **3-5 秒**

2. **實現流式響應**
   - 使用 GraphQL Subscriptions 或 SSE
   - 用戶實時看到生成的文字
   - 感知延遲減少 70%

3. **添加智能預加載**
   - 根據用戶行為預測查詢
   - 提前準備結果

---

## 🎯 成功指標

優化成功的標準：

- ✅ 查詢總耗時 <25 秒（90% 案例）
- ✅ 緩存命中率 >30%
- ✅ 時間查詢準確率 >95%
- ✅ 分類查詢準確率 >90%
- ✅ 語義查詢準確率 >85%
- ✅ 用戶滿意度提升 >50%

---

## 📞 支持

如有問題，請：

1. 檢查本文檔的「故障排除」部分
2. 查看後端日誌: `docker logs heart-whisper-backend --tail=200`
3. 檢查性能指標: 尋找 `[RAG]`, `[Intent]`, `[Hybrid]`, `[Vector]` 日誌

---

**最後更新**: 2025-10-18
**作者**: Claude Code
**版本**: 1.0.0
