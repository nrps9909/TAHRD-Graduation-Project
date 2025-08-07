# 🚀 Gemini CLI 優化指南

## 核心優化功能

### 1. MCP (Model Context Protocol) - 最大優化
**降低延遲：70-80%**
```bash
# 啟用 MCP 模式
export USE_MCP=true

# 使用專用 MCP 服務器
gemini --allowed-mcp-server-names heart-whisper-npc
```

**優勢：**
- 持久化連接，無需重複初始化
- 並行處理多個 NPC 請求
- 內建記憶管理系統
- 支援分散式部署

### 2. Memory 系統優化
**降低延遲：30-40%**
```bash
# 載入所有記憶檔案
gemini --all-files \
       --load-memory-from-include-directories \
       --include-directories backend/memories/npc-1,backend/memories/npc-2

# 使用 Checkpointing
gemini --checkpointing
```

**實作方式：**
- 每個 NPC 有獨立記憶目錄
- GEMINI.md 自動載入為上下文
- 檢查點保存對話狀態

### 3. 現有優化保留

#### HTTP 服務模式 (gemini_server.py)
**降低延遲：50%**
- 預載入個性檔案
- LRU 快取機制
- 常駐服務減少啟動時間

## 建議實施順序

### 階段 1：Memory 優化 (立即可用)
```bash
# 修改 gemini.py 添加記憶載入
gemini -p "$prompt" \
       --all-files \
       --include-directories backend/memories/$npc_id \
       --checkpointing
```

### 階段 2：MCP 整合 (需要安裝 MCP SDK)
```bash
# 安裝 MCP SDK
pip install mcp

# 啟動 MCP 服務器
python backend/mcp_server.py

# 配置環境變數
export USE_MCP=true
```

### 階段 3：混合模式
- MCP 處理主要對話
- HTTP 服務處理快速查詢
- 原始 CLI 作為備援

## 效能對比

| 模式 | 延遲 | CPU | 記憶體 | 適用場景 |
|-----|------|-----|--------|---------|
| 原始 CLI | 3-5s | 高 | 低 | 開發測試 |
| HTTP 服務 | 1.5-2.5s | 中 | 中 | 一般生產 |
| Memory 優化 | 2-3s | 中 | 高 | 複雜對話 |
| MCP 模式 | 0.5-1s | 低 | 高 | 高併發生產 |

## 配置範例

### .env 配置
```env
# 基礎配置
GEMINI_API_KEY="your-key"
USE_GEMINI_CLI=true

# 優化選項 (選擇一個)
USE_OPTIMIZED_CLI=true    # HTTP 服務
USE_MCP=true              # MCP 模式 (最優)
USE_MEMORY_SYSTEM=true    # Memory 優化

# Memory 設定
GEMINI_MEMORY_DIRS="backend/memories"
GEMINI_CHECKPOINTING=true
GEMINI_ALL_FILES=true

# MCP 設定
MCP_SERVER_NAMES="heart-whisper-npc,memory-manager"
MCP_SERVER_PORT=9876
```

## 監控與調試

### 查看 Memory 使用
```bash
gemini --show-memory-usage
```

### MCP 服務狀態
```bash
curl http://localhost:9876/status
```

### 效能統計
```bash
# HTTP 服務統計
curl http://localhost:8765/stats

# MCP 統計
curl http://localhost:9876/metrics
```

## 注意事項

1. **Memory 系統**
   - GEMINI.md 檔案會自動載入
   - 避免在記憶檔案中放敏感資訊
   - 定期清理過期記憶

2. **MCP 模式**
   - 需要額外安裝 MCP SDK
   - 建議使用 Docker 部署
   - 支援水平擴展

3. **混合使用**
   - 可同時啟用多種優化
   - 自動降級機制確保穩定性
   - 監控各模式效能選擇最優

## 快速開始

```bash
# 1. 安裝依賴
pip install mcp fastapi uvicorn

# 2. 創建記憶目錄
mkdir -p backend/memories/{npc-1,npc-2,npc-3,shared}

# 3. 啟動優化服務
./start-local.sh

# 4. 測試效能
curl http://localhost:8765/test
```

## 故障排除

### Memory 載入失敗
- 檢查 GEMINI.md 格式
- 確認目錄權限
- 查看 gemini 日誌

### MCP 連接問題
- 確認 MCP SDK 安裝
- 檢查防火牆設定
- 驗證服務器狀態

### 效能未改善
- 檢查快取命中率
- 調整 LRU 大小
- 優化記憶檔案大小