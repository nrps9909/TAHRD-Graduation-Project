# 🚀 Streaming 知識上傳使用指南

## 概述

新的 Streaming 模式使用**一次 AI 調用**完成知識上傳，並分階段返回結果，提供更好的用戶體驗。

---

## 🎯 優勢

| 項目 | 舊模式（兩次 AI） | 新模式（Streaming） |
|------|-----------------|-------------------|
| AI 調用次數 | 2 次 | **1 次** ✅ |
| 用戶看到回應時間 | 3-5 秒 | **3-5 秒** ✅ |
| 完整分析時間 | 後台 10 秒 | **10 秒** ✅ |
| 成本 | 兩次調用 | **一次調用** ✅ |

---

## 📡 API 端點

### POST `/api/knowledge/upload-stream`

**請求格式**：
```typescript
{
  content: string       // 必填：用戶輸入的內容
  files?: FileInput[]   // 可選：上傳的文件
  links?: LinkInput[]   // 可選：連結
}
```

**Authorization**: `Bearer <token>`

**Response**: Server-Sent Events (SSE)

---

## 🎨 事件流程

### 1️⃣ **immediate 事件** (~3秒)
```json
{
  "type": "immediate",
  "data": {
    "category": "學習成長",
    "warmResponse": "記下了，慢慢來就好 ☁️",
    "quickSummary": "React hooks 學習筆記",
    "confidence": 0.92,
    "reasoning": "內容提到學習、React、hooks"
  },
  "processingTime": 3200
}
```

### 2️⃣ **deep 事件** (~10秒)
```json
{
  "type": "deep",
  "data": {
    "detailedSummary": "用戶學習了 React hooks，特別關注 useState 和 useEffect 的用法，表示收穫很大。這是一個積極的學習體驗記錄。",
    "keyInsights": [
      "學習重點：useState 和 useEffect hooks",
      "學習成果：理解了 hooks 的基本用法",
      "學習態度：積極正向，有成就感"
    ],
    "suggestedTags": ["React", "Hooks", "前端開發", "學習筆記", "useEffect"],
    "sentiment": "positive",
    "importanceScore": 7,
    "actionableAdvice": "建議繼續深入學習其他 React hooks（如 useContext、useReducer），並嘗試在實際項目中應用。"
  },
  "processingTime": 10500
}
```

### 3️⃣ **complete 事件** (~10秒)
```json
{
  "type": "complete",
  "data": {
    "memory": {
      "id": "507f1f77bcf86cd799439011",
      "content": "今天學習了 React hooks...",
      "summary": "React hooks 學習筆記",
      "tags": ["React", "Hooks", "前端開發"],
      // ... 其他 Memory 字段
    },
    "distribution": { /* KnowledgeDistribution */ },
    "island": {
      "id": "island_id",
      "name": "學習成長",
      "emoji": "📚",
      "color": "#4CAF50"
    }
  },
  "processingTime": 10850
}
```

### ❌ **error 事件**
```json
{
  "type": "error",
  "error": "處理知識上傳失敗"
}
```

---

## 💻 前端使用範例

### React + TypeScript

```typescript
const uploadKnowledgeStream = async (content: string) => {
  const response = await fetch('/api/knowledge/upload-stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ content, files: [], links: [] })
  })

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n')

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        const eventType = line.substring(7).trim()
        console.log('Event type:', eventType)
      }

      if (line.startsWith('data: ')) {
        const jsonStr = line.substring(6).trim()
        if (jsonStr && jsonStr !== '{}') {
          const event = JSON.parse(jsonStr)

          switch (event.type) {
            case 'immediate':
              // 🎯 立即顯示白噗噗的溫暖回應
              setTororoMessage(event.data.warmResponse)
              setCategory(event.data.category)
              break

            case 'deep':
              // 📊 顯示深度分析結果
              setDetailedSummary(event.data.detailedSummary)
              setKeyInsights(event.data.keyInsights)
              setTags(event.data.suggestedTags)
              break

            case 'complete':
              // ✅ 處理完成
              showSuccess(`知識已儲存到 ${event.data.island.name}`)
              break

            case 'error':
              // ❌ 錯誤處理
              showError(event.error)
              break
          }
        }
      }
    }
  }
}
```

---

## 🧪 測試

### 1. 啟動後端服務器
```bash
npm start
```

### 2. 執行測試腳本
```bash
npx ts-node test-streaming.ts
```

### 3. 手動測試（使用 curl）
```bash
curl -X POST http://localhost:4000/api/knowledge/upload-stream \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"今天學習了 React hooks"}' \
  --no-buffer
```

---

## 📊 性能監控

查看後端日誌中的關鍵指標：

```
[Chief Agent Stream] 開始 Streaming 調用...
[Chief Agent Stream] ✅ 階段 1 完成 - 即時回應
[Chief Agent Stream]    - category: 學習成長
[Chief Agent Stream]    - warmResponse: 記下了，慢慢來就好 ☁️
[Chief Agent Stream] ✅ 階段 2 完成 - 深度分析
[Chief Agent Stream]    - keyInsights: 3 個
[Chief Agent Stream]    - suggestedTags: 5 個
[Chief Agent Stream] ✅ Memory 創建完成: 507f1f77bcf86cd799439011
[Chief Agent Stream] 總處理時間: 10850ms
```

---

## 🔄 與舊模式的兼容性

- **舊模式**: GraphQL `uploadKnowledge` mutation（兩次 AI 調用）
- **新模式**: REST `/api/knowledge/upload-stream`（一次 AI 調用）

兩者可以並存，前端可以選擇使用哪種方式。

---

## ⚠️ 注意事項

1. **Streaming 需要保持連接**
   - 確保前端正確處理 SSE 連接
   - 超時時間設置為 60 秒

2. **錯誤處理**
   - 監聽 `error` 事件
   - 處理網路中斷情況

3. **Token 驗證**
   - 必須在 Authorization header 中提供有效 token

---

## 🎉 總結

Streaming 模式實現了：
- ✅ 一次 AI 調用完成所有工作
- ✅ 用戶 3 秒看到白噗噗的溫暖回應
- ✅ 10 秒獲得完整深度分析
- ✅ 降低成本（減少 50% 的 API 調用）
- ✅ 更好的用戶體驗（流暢的進度反饋）

完美達成你的需求！🚀
