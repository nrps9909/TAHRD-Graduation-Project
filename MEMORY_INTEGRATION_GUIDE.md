# NPC 長短期記憶系統整合指南

> 將 test_memory 分支的 AI 智能篩選記憶功能整合到 louis_lu 分支

## 整合概述

已成功將 test_memory 分支的核心記憶篩選功能整合到 louis_lu 分支，實現：

- ✅ **長短期記憶分離**：自動區分短期對話和長期重要記憶
- ✅ **AI 智能篩選**：使用 Gemini 2.5 Flash 評估對話重要性
- ✅ **自動歸檔**：定期篩選並歸檔重要記憶
- ✅ **情緒與重要性評分**：AI 自動評估情緒影響和重要性

## 新增/修改的文件

### 1. 資料庫 Schema 修改

**文件**：`backend/prisma/schema.prisma`

新增欄位到 `Conversation` 模型：

```prisma
// Long-term Memory AI Filtering Fields
isLongTermMemory  Boolean   @default(false)
aiImportanceScore Float?
aiEmotionalImpact Float?
aiSummary         String?
aiKeywords        Json?
memoryType        String?   @default("short_term")
archivedAt        DateTime?
```

### 2. Python AI 篩選模組

**新文件**：`backend/memory_filter.py`

- 使用 Gemini CLI 進行記憶篩選
- 支援同步和異步調用
- 包含降級方案（規則篩選）

### 3. TypeScript 記憶服務擴展

**修改文件**：`backend/src/services/npcMemoryService.ts`

新增方法：
- `filterConversationsWithAI()` - AI 篩選對話
- `getLongTermMemories()` - 獲取長期記憶
- `getShortTermMemories()` - 獲取短期記憶
- `archiveAllNPCMemories()` - 批量歸檔所有 NPC 記憶

### 4. 定期歸檔調度器

**新文件**：`backend/src/services/memoryArchivalScheduler.ts`

- 每天凌晨 2 點自動執行記憶歸檔
- 支援手動觸發篩選
- 詳細日誌記錄

## 安裝步驟

### 1. 安裝依賴

```bash
cd backend
npm install node-cron
npm install --save-dev @types/node-cron
```

### 2. 運行資料庫遷移

```bash
cd backend
npx prisma migrate dev --name add_long_term_memory_fields
```

### 3. 生成 Prisma Client

```bash
npx prisma generate
```

### 4. 確保 Python 環境

```bash
# 確保已安裝 Gemini CLI
gemini --version

# 確保環境變數已設置
echo $GEMINI_API_KEY
```

## 使用方式

### 1. 在 backend/src/index.ts 中啟動調度器

```typescript
import { memoryArchivalScheduler } from './services/memoryArchivalScheduler'

// 啟動記憶歸檔調度器（每天凌晨 2 點執行）
memoryArchivalScheduler.start()

// 或自定義時間（例如每 6 小時）
// memoryArchivalScheduler.start('0 */6 * * *')
```

### 2. 手動觸發篩選（測試用）

```typescript
import { memoryArchivalScheduler } from './services/memoryArchivalScheduler'

// 立即執行一次全局歸檔
await memoryArchivalScheduler.runNow()

// 或針對特定 NPC 和用戶
await memoryArchivalScheduler.filterSpecificMemory('npc-1', 'user-123', 7)
```

### 3. 在 GraphQL Resolver 中使用

```typescript
import { npcMemoryService } from './services/npcMemoryService'

// 獲取長期記憶（用於對話上下文）
const longTermMemories = await npcMemoryService.getLongTermMemories(
  npcId,
  userId,
  20 // 最多 20 條
)

// 獲取短期記憶（最近 7 天）
const shortTermMemories = await npcMemoryService.getShortTermMemories(
  npcId,
  userId,
  7,  // 天數
  50  // 最多 50 條
)
```

## AI 篩選標準

### 高優先級（必須保存）：
1. 表達強烈情感的對話（愛、喜歡、討厭、憤怒）
2. 包含承諾、約定的對話
3. 玩家分享的個人秘密、重要經歷
4. 關係里程碑時刻
5. 深度交流（人生、價值觀、未來）

### 中優先級（可以保存）：
1. 特別有趣或創意的對話
2. 學習時刻
3. 情緒轉折

### 低優先級（不保存）：
1. 簡單招呼
2. 重複內容
3. 無意義互動

## 配置選項

### 調整篩選週期

在 `memoryArchivalScheduler.ts` 中修改 cron 表達式：

```typescript
// 每天凌晨 2 點
memoryArchivalScheduler.start('0 2 * * *')

// 每 6 小時
memoryArchivalScheduler.start('0 */6 * * *')

// 每週日凌晨 3 點
memoryArchivalScheduler.start('0 3 * * 0')
```

### 調整記憶保留天數

在調用 `archiveAllNPCMemories()` 時修改參數：

```typescript
// 篩選過去 14 天的記憶
await npcMemoryService.archiveAllNPCMemories(14)
```

## 測試

### 1. 測試 Python 篩選腳本

```bash
cd backend

# 創建測試數據
cat > /tmp/test_conversations.json << 'EOF'
[
  {
    "id": "conv-1",
    "timestamp": "2025-08-01T10:00:00Z",
    "content": "我喜歡你",
    "speakerType": "PLAYER",
    "emotionTag": "happy"
  },
  {
    "id": "conv-2",
    "timestamp": "2025-08-01T10:01:00Z",
    "content": "你好",
    "speakerType": "PLAYER",
    "emotionTag": "neutral"
  }
]
EOF

# 執行篩選
python3 memory_filter.py lupeixiu /tmp/test_conversations.json
```

### 2. 測試歸檔調度器

在 `backend/src/index.ts` 中：

```typescript
import { memoryArchivalScheduler } from './services/memoryArchivalScheduler'

// 啟動後立即執行一次測試
memoryArchivalScheduler.runNow().then(() => {
  console.log('✅ Test archival completed')
})
```

## 監控與日誌

所有記憶篩選操作都會記錄在日誌中：

```bash
# 查看記憶篩選日誌
tail -f backend/logs/app.log | grep -i "memory"

# 查看 Python 篩選日誌
tail -f backend/logs/app.log | grep -i "Gemini AI"
```

## 性能考量

1. **批量處理**：調度器會批量處理所有 NPC-用戶對，避免重複調用
2. **超時控制**：Python 調用設置 60 秒超時
3. **降級方案**：AI 篩選失敗時自動使用規則篩選
4. **臨時文件清理**：自動清理篩選過程中的臨時 JSON 文件

## 故障排除

### Python 調用失敗

```bash
# 檢查 Python 環境
which python3
python3 --version

# 檢查 Gemini CLI
which gemini
gemini --version

# 檢查 API Key
echo $GEMINI_API_KEY
```

### 資料庫遷移失敗

```bash
# 重置遷移
npx prisma migrate reset

# 重新遷移
npx prisma migrate dev --name add_long_term_memory_fields
```

### Node-cron 不執行

```bash
# 檢查 cron 表達式是否正確
# 使用 https://crontab.guru/ 驗證

# 手動測試
memoryArchivalScheduler.runNow()
```

## 下一步計劃

- [ ] 添加 GraphQL Mutation 用於手動觸發篩選
- [ ] 前端顯示長期記憶標記
- [ ] 記憶之花 (MemoryFlower) 與長期記憶的整合
- [ ] 記憶統計儀表板
- [ ] 向量搜尋整合（使用 aiKeywords 和 contextEmbedding）

## 相關文檔

- [Gemini CLI 文檔](../gemini-cli-docs/)
- [Prisma Schema 文檔](https://www.prisma.io/docs/concepts/components/prisma-schema)
- [node-cron 文檔](https://www.npmjs.com/package/node-cron)
