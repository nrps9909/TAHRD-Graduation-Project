# MCP 架構優化指南

## 問題診斷報告

### 1. MCP 服務未啟動
**問題**：MCP 服務器 (mcp_server.py) 未運行，導致回應速度慢
**解決**：執行 `./start-mcp.sh` 啟動 MCP 服務

### 2. 人物定義重複且錯誤
**問題位置**：
- ❌ `backend/prisma/seed.ts` - 寫死的錯誤資料
- ❌ `backend/src/data/npcPersonalities.ts` - 混亂的定義
- ❌ `frontend/src/stores/gameStore.ts` - 寫死的初始資料

**正確來源**：
- ✅ `backend/personalities/*.txt` - NPC 個性檔案
- ✅ `backend/memories/*/GEMINI.md` - NPC 記憶檔案

### 3. 服務檔案混亂
**現有檔案**：
- `geminiService.ts` - 主服務（調用 MCP）✅
- `geminiServiceMCP.ts` - MCP 客戶端 ✅
- `npcInteractionService.ts` - NPC 互動 ✅
- `npcMemoryService.ts` - 記憶管理 ✅

## 優化方案

### 立即執行步驟

```bash
# 1. 啟動 MCP 服務
./start-mcp.sh

# 2. 檢查服務狀態
curl http://localhost:8765/status

# 3. 清理快取（如需要）
curl -X POST http://localhost:8765/cache/clear
```

### 代碼優化

#### 1. 統一人物資料載入
已創建 `backend/src/services/npcPersonalityLoader.ts`
- 從 personalities 目錄載入真實資料
- 提供統一的 API 給所有模組使用
- 避免重複定義

#### 2. 修改各模組使用統一載入器

```typescript
// 在需要 NPC 資料的地方
import { personalityLoader } from './services/npcPersonalityLoader'

// 獲取 NPC 資料
const npcData = personalityLoader.getPersonality('npc-1')
```

### 效能優化建議

#### 1. MCP 服務優化
- ✅ 使用 uvloop 高效能事件循環
- ✅ LRU 快取機制（已實現）
- ✅ 預載入個性檔案
- ⚡ 建議：調整模型為 `gemini-2.0-flash-exp` 獲得更快回應

#### 2. 前端優化
- 減少不必要的 GraphQL 查詢
- 使用 React.memo 優化渲染
- 實現虛擬滾動處理大量對話

#### 3. 後端優化
- 使用 Redis 快取常用查詢
- 實現資料庫連接池
- 優化 Prisma 查詢（使用 select 減少資料傳輸）

## 架構改進建議

### 短期改進（1-2天）
1. ✅ 啟動 MCP 服務
2. ✅ 統一人物資料來源
3. ⏳ 清理重複代碼
4. ⏳ 實現前端快取

### 中期改進（1週）
1. 實現完整的記憶系統
2. 優化 3D 場景渲染
3. 加強錯誤處理
4. 實現自動重連機制

### 長期改進（1個月）
1. 微服務架構拆分
2. 實現水平擴展
3. 加入監控系統
4. 實現 A/B 測試框架

## 監控指標

### 關鍵指標
- MCP 回應時間：目標 < 2秒
- 快取命中率：目標 > 60%
- 並發連接數：目標支援 100+
- 記憶體使用：目標 < 512MB

### 監控命令
```bash
# MCP 狀態
curl http://localhost:8765/status | jq

# 系統資源
htop

# 網路連接
netstat -antp | grep -E "(8765|4000|3000)"

# 日誌監控
tail -f backend/logs/mcp_server.log
```

## 疑難排解

### MCP 服務無法啟動
```bash
# 檢查 Python 依賴
pip3 install uvloop fastapi uvicorn pydantic

# 檢查 API Key
echo $GEMINI_API_KEY

# 檢查端口占用
lsof -i:8765
```

### 回應速度慢
1. 檢查 MCP 服務是否運行
2. 檢查快取是否正常工作
3. 考慮切換到更快的模型
4. 檢查網路延遲

### 人物回應不一致
1. 確保使用統一的個性載入器
2. 檢查 personalities 檔案是否正確
3. 清空快取重新載入

## 結論

主要問題是 MCP 服務未啟動和人物定義重複。執行 `./start-mcp.sh` 並使用統一的個性載入器可解決大部分問題。後續應持續優化快取策略和模型選擇以提升效能。