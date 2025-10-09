# 任務隊列系統 (Task Queue System)

## 概述

為了防止使用者連續輸入多個知識導致後端 Sub-Agent 處理塞車，我們實現了一個完整的任務隊列系統，並在前端即時顯示處理進度。

## 系統架構

```
使用者輸入知識
    ↓
ChiefAgent 快速分類（白噗噗回應）
    ↓
加入任務隊列 (TaskQueueService)
    ↓
按順序處理（一次只處理1個任務）
    ↓
Sub-Agent 深度分析
    ↓
創建記憶到資料庫
    ↓
通過 WebSocket 通知前端
```

## 主要功能

### 後端

#### 1. TaskQueueService (`backend/src/services/taskQueueService.ts`)

**核心功能：**
- ✅ 任務隊列管理（支援優先級）
- ✅ 並發控制（一次只處理 1 個任務，嚴格順序）
- ✅ 任務狀態追蹤（PENDING, PROCESSING, COMPLETED, FAILED）
- ✅ 進度即時更新（每秒更新一次）
- ✅ WebSocket 即時通知

**任務狀態：**
```typescript
enum TaskStatus {
  PENDING = 'PENDING',       // 等待處理
  PROCESSING = 'PROCESSING', // 處理中
  COMPLETED = 'COMPLETED',   // 完成
  FAILED = 'FAILED'          // 失敗
}
```

**優先級：**
```typescript
enum TaskPriority {
  HIGH = 'HIGH',       // 高優先級（插隊到隊列前面）
  NORMAL = 'NORMAL',   // 普通優先級
  LOW = 'LOW'          // 低優先級
}
```

#### 2. 整合到 ChiefAgent

修改 `chiefAgentService.ts` 的 `uploadKnowledge` 方法：

```typescript
// 階段 2: 加入任務隊列進行 Sub-Agent 深度處理
const taskId = await taskQueueService.addTask(
  userId,
  distribution.id,
  [targetAssistant.id],
  TaskPriority.NORMAL
)
```

#### 3. WebSocket 事件

**伺服器發送的事件：**
- `queue-update` - 隊列狀態更新
- `task-start` - 任務開始處理
- `task-progress` - 任務進度更新（每秒）
- `task-complete` - 任務完成
- `task-error` - 任務失敗

**客戶端可發送的事件：**
- `get-queue-stats` - 獲取隊列統計
- `get-user-tasks` - 獲取用戶任務列表
- `get-task-status` - 獲取特定任務狀態

### 前端

#### ProcessingQueuePanel (`frontend/src/components/ProcessingQueuePanel.tsx`)

**顯示位置：** 右下角浮動面板

**功能：**
- ✅ 顯示處理中的任務（帶進度條和處理時間）
- ✅ 顯示等待中的任務隊列（最多顯示 3 個）
- ✅ 即時更新處理進度和時間
- ✅ 可折疊/展開
- ✅ 自動隱藏（無任務時）

**UI 特點：**
- 🎨 使用療癒的粉色漸變配色
- 🌟 處理中任務有脈衝動畫
- ⏱️ 顯示處理耗時（秒數/分鐘）
- 📊 顯示進度百分比
- 💡 友善的提示訊息

## 使用流程

### 1. 使用者上傳知識

```typescript
// 前端發送 GraphQL mutation
await uploadKnowledge({
  variables: {
    input: {
      content: "學習 React Hooks",
      files: [],
      links: []
    }
  }
})
```

### 2. 後端處理流程

```
Step 1: ChiefAgent 快速分類 (Gemini 2.5 Flash)
        ↓ ~2秒
        白噗噗溫暖回應：「收到了～這看起來是學習相關的內容喔！📚」

Step 2: 加入任務隊列
        ↓ 立即
        前端顯示：「已加入處理隊列，等待中...」

Step 3: Sub-Agent 深度分析 (Gemini 2.5 Pro)
        ↓ ~30-60秒
        進度面板更新：
        - 正在分析知識內容... (0%)
        - 提取關鍵洞察... (50%)
        - 創建記憶... (80%)
        - 完成！(100%)

Step 4: 通知完成
        ↓
        前端收到通知：「已創建 1 條記憶」
        隊列面板自動移除該任務
```

### 3. 防止塞車機制

**情境：** 使用者在 5 秒內連續上傳 5 個知識

```
時間軸：
0s  - 知識1: 立即加入隊列 → 開始處理（處理中：1/1）
1s  - 知識2: 加入隊列 → 等待（隊列：1）
2s  - 知識3: 加入隊列 → 等待（隊列：2）
3s  - 知識4: 加入隊列 → 等待（隊列：3）
4s  - 知識5: 加入隊列 → 等待（隊列：4）

30s - 知識1 處理完成 → 知識2 開始處理（處理中：1/1，隊列：3）
60s - 知識2 處理完成 → 知識3 開始處理（處理中：1/1，隊列：2）
90s - 知識3 處理完成 → 知識4 開始處理（處理中：1/1，隊列：1）
120s - 知識4 處理完成 → 知識5 開始處理（處理中：1/1，隊列：0）
150s - 知識5 處理完成（處理中：0/1，隊列：0）✅ 全部完成
```

## 配置參數

### 後端配置 (`taskQueueService.ts`)

```typescript
private maxConcurrent: number = 1  // 一次只處理 1 個任務
```

**建議值：**
- 開發環境：1（避免 API 限流，確保順序處理）
- 生產環境：1-2（根據 Gemini API 配額調整）

### 前端配置 (`ProcessingQueuePanel.tsx`)

```typescript
const socketUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'
```

## 測試方法

### 1. 測試單個任務

```bash
# 前端上傳一個知識
# 觀察：
# - 白噗噗立即回應
# - 右下角出現隊列面板
# - 進度條從 0% → 100%
# - 顯示處理時間
# - 完成後面板消失
```

### 2. 測試隊列功能

```bash
# 前端快速連續上傳 5 個知識
# 觀察：
# - 第一個立即開始處理
# - 後四個顯示「等待中」
# - 依序處理完成（嚴格一個接一個）
# - 隊列數量逐漸減少
```

### 3. 測試 WebSocket 連接

```bash
# 開啟瀏覽器開發者工具 → Network → WS
# 觀察 WebSocket 訊息：
# - queue-update
# - task-start
# - task-progress (每秒)
# - task-complete
```

## 監控和日誌

### 後端日誌

```bash
# 查看任務隊列日誌
tail -f backend/logs/app.log | grep TaskQueue

# 範例輸出：
[TaskQueue] Task added: task-xxx, Priority: NORMAL, Queue size: 1
[TaskQueue] Processing task: task-xxx, Remaining in queue: 0
[TaskQueue] Task completed: task-xxx, Time: 32451ms
```

### 前端 Console

```javascript
// 開啟瀏覽器 Console，會看到：
[Queue] WebSocket connected
[Queue] Queue update received { stats: {...}, userTasks: [...] }
[Queue] Task progress { taskId: 'xxx', progress: {...}, elapsedTime: 15 }
[Queue] Task completed { taskId: 'xxx', result: {...} }
```

## 故障排除

### 問題 1：隊列面板不顯示

**檢查：**
```bash
# 1. 確認 WebSocket 連接
瀏覽器開發者工具 → Network → WS → 查看是否有 WebSocket 連接

# 2. 確認後端服務
curl http://localhost:4000/health

# 3. 查看日誌
tail -f backend/logs/app.log | grep Socket
```

### 問題 2：任務一直處於 PROCESSING 狀態

**可能原因：**
- Gemini API 超時
- Sub-Agent 處理異常

**解決方案：**
```typescript
// 增加超時時間 (taskQueueService.ts)
// 預設 120秒，可增加到 180秒
```

### 問題 3：進度不更新

**檢查：**
```javascript
// 確認定時器是否運行
// taskQueueService.ts 中的 startProgressTimer()
```

## 未來優化方向

1. **持久化隊列**
   - 使用 Redis 儲存任務隊列
   - 伺服器重啟後恢復未完成任務

2. **更詳細的進度報告**
   - Sub-Agent 處理的每個步驟都回報進度
   - 顯示當前正在分析的具體內容

3. **任務優先級自動調整**
   - 根據用戶等待時間自動提升優先級
   - VIP 用戶自動高優先級

4. **批次處理優化**
   - 相似的知識合併處理
   - 減少 API 調用次數

5. **性能監控**
   - 記錄每個任務的處理時間
   - 分析瓶頸並優化

## 相關文件

- `backend/src/services/taskQueueService.ts` - 任務隊列核心邏輯
- `backend/src/services/chiefAgentService.ts` - Chief Agent 整合
- `backend/src/socket.ts` - WebSocket 事件處理
- `frontend/src/components/ProcessingQueuePanel.tsx` - 前端顯示組件

## 聯絡資訊

如有問題或建議，請聯繫開發團隊。
