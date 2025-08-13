# 心語小鎮 NPC 對話系統 - 後端邏輯流程

## 🎯 完整對話流程圖

```
📱 前端發送訊息
        ↓
🚪 GraphQL Resolver (conversationResolvers.ts)
        ↓
📝 儲存用戶訊息到資料庫
        ↓
🔍 獲取/創建 NPC 關係狀態
        ↓
📚 獲取最近對話歷史 (5條)
        ↓
📡 調用 GeminiMCPService
        ↓
🌐 HTTP 請求到 MCP Server (Python)
        ↓
🧠 MCP Server 處理邏輯
        ↓
📂 準備固定快取資料夾
        ↓
🤖 調用 Gemini CLI
        ↓
✨ Redis 快取檢查/保存
        ↓
🔄 返回 AI 回應
        ↓
💾 儲存 NPC 回應到資料庫
        ↓
📊 更新關係狀態
        ↓
🌸 創建記憶花朵 (如果重要)
        ↓
📻 Socket.IO 廣播
        ↓
📱 前端接收並顯示
```

## 🎮 詳細執行步驟

### 1. 前端觸發 (Frontend)
```typescript
// 用戶輸入訊息，發送 GraphQL mutation
mutation SendMessage($input: SendMessageInput!) {
  sendMessage(input: $input) {
    content
    emotionTag
    suggestedActions
  }
}
```

### 2. GraphQL Resolver 處理
**檔案**: `backend/src/resolvers/conversationResolvers.ts:101`

```typescript
// sendMessage Mutation 處理流程:
1. 身份驗證檢查
2. 儲存用戶訊息到 Prisma 資料庫
3. 獲取 NPC 資訊
4. 獲取/創建用戶與 NPC 的關係狀態
5. 構建對話上下文 (最近3條訊息)
6. 發送 Socket.IO 輸入指示器
7. 調用 GeminiMCPService
```

### 3. Gemini MCP Service 層
**檔案**: `backend/src/services/geminiServiceMCP.ts:66`

```typescript
async generateNPCResponse(
  npcPersonality: NPCPersonality,
  userMessage: string,
  context: ConversationContext
): Promise<AIResponse>

// 處理流程:
1. 開始效能追蹤 (geminiTracker)
2. 構建 MCP 請求載荷
3. 發送 HTTP POST 到 MCP Server (Python)
4. 解析回應並構建完整的 AIResponse
5. 包含情感分析、關係影響、建議行動
```

### 4. MCP Server (Python)
**檔案**: `backend/mcp_server.py:484`

```python
@app.post("/generate")
async def generate_dialogue(request: DialogueRequest):
    # 處理流程:
    1. 檢查 Redis 快取
    2. 準備固定路徑臨時資料夾
    3. 複製 5 個必要檔案到快取資料夾
    4. 調用 Gemini CLI (在固定資料夾執行)
    5. 保存回應到 Redis 快取
    6. 更新會話歷史
```

### 5. 檔案系統準備
**檔案**: `backend/mcp_server.py:176`

```python
# 固定路徑策略 (優化版本):
/tmp/gemini_npc_cache/[npc_name]/
├── [NPC]_Personality.md      # NPC 個性檔案
├── [NPC]_Chat_style.txt      # 聊天風格
├── short_term_memory/
│   └── conversations.json    # 短期記憶
├── long_term_memory/
│   └── memories.json        # 長期記憶
└── GEMINI.md               # 系統提示
```

### 6. Gemini CLI 執行
**檔案**: `backend/mcp_server.py:266`

```python
# 在固定快取資料夾中執行 Gemini CLI:
cmd = ["gemini", "-p", prompt, "--model", "gemini-2.5-flash"]
# cwd=temp_dir (關鍵優化: 避免掃描其他檔案)
```

### 7. 快取系統 (Redis)
**檔案**: `backend/mcp_server.py:134`

```python
# 三層快取策略:
1. Redis 快取 (2小時 TTL) - 相同請求 0.002秒回應
2. Files API 快取 (48小時) - 固定路徑提升命中率
3. 本地 LRU 快取 - 記憶體層快取
```

### 8. 回應處理與資料庫更新
**檔案**: `backend/src/resolvers/conversationResolvers.ts:194`

```typescript
// 收到 AI 回應後:
1. 儲存 NPC 回應到資料庫
2. 更新關係狀態 (信任度、好感度、等級)
3. 更新 NPC 情緒 (如果改變)
4. 創建記憶花朵 (重要對話)
5. Socket.IO 廣播給前端
6. 發布 GraphQL 訂閱
```

### 9. 記憶系統整合
**檔案**: `backend/memory_manager.py:24`

```python
# NPC 記憶管理:
1. 短期記憶: 7天內的對話
2. 長期記憶: AI 篩選的重要記憶
3. 自動清理過期記憶
4. 智能記憶篩選器
```

## ⚡ 性能優化重點

### 1. 固定路徑策略
- 使用 `/tmp/gemini_npc_cache/[npc_id]` 固定路徑
- 提升 Files API 48小時快取命中率
- 減少檔案重複上傳

### 2. Redis 快取層
- 快取完整的 AI 回應
- 2小時 TTL 設定
- MD5 雜湊作為快取鍵
- **效果**: 快取命中僅需 0.002-0.004 秒

### 3. 檔案最小化
- 每個 NPC 只複製 5 個必要檔案
- 避免 Gemini CLI 掃描不相關檔案
- 減少上下文收集時間

### 4. 預熱機制
- 服務啟動時預熱所有 NPC
- 首次使用時已有快取可用
- 改善冷啟動體驗

## 🔧 關鍵設定檔案

### 環境變數
```bash
# .env
GEMINI_API_KEY="your-gemini-api-key"
MCP_SERVICE_URL=http://localhost:8765
REDIS_URL=redis://localhost:6379
```

### NPC 映射
```python
# backend/mcp_server.py:67
npc_map = {
    "npc-1": "lupeixiu",    # 陸培修
    "npc-2": "liuyucen",    # 劉宇岑
    "npc-3": "chentingan"   # 陳庭安
}
```

## 📊 性能指標

### 回應時間
- **Redis 快取命中**: 0.002-0.004 秒 (99.98% 提升)
- **新查詢 (Files API 快取)**: 14-20 秒 (原 20-30秒)
- **完全冷啟動**: 25-30 秒

### 快取命中率
- **目標快取命中率**: >80%
- **實測快取行為準確率**: 83%

### 瓶頸分析
- **主要瓶頸**: Gemini CLI 執行 (佔總時間 96.6%)
- **已優化**: 檔案準備、快取策略、固定路徑
- **無法優化**: API 調用延遲 (依賴外部服務)

## 🚀 啟動順序

```bash
# 1. 啟動 Redis
redis-server

# 2. 啟動 MCP Server
cd backend && python3 mcp_server.py

# 3. 啟動後端 GraphQL
npm run dev

# 4. 啟動前端
cd frontend && npm run dev
```

這個流程確保了高效能的 NPC 對話體驗，結合了快取優化、記憶系統和即時通訊功能。