# 心語小鎮 NPC 長短期記憶管理系統

## 系統架構

### 1. 記憶分層設計

#### 短期記憶 (Short-term Memory)
- **儲存位置**: `memories/[npc_name]/short_term_memory/conversations.json`
- **保留時間**: 7天內的對話
- **容量限制**: 無限制（會定期清理）
- **儲存格式**: 完整對話內容 + 時間戳 + 情緒標記

#### 長期記憶 (Long-term Memory)
- **儲存位置**: `memories/[npc_name]/long_term_memory/memories.json`
- **篩選機制**: AI 智能篩選（Gemini 2.5 Flash）
- **容量限制**: 最多50條重要記憶
- **儲存格式**: 摘要 + 重要性等級 + 理由

### 2. 記憶篩選流程

```
短期記憶（7天內）
    ↓ 超過7天
AI 篩選器（Gemini 2.5 Flash）
    ↓ 判斷重要性
長期記憶（永久保存）
```

#### 篩選標準
**高優先級 (High)**:
- 情感深度（愛、喜歡、討厭、憤怒）
- 個人承諾（約定、承諾、答應）
- 重要資訊（秘密、夢想、重要經歷）
- 關係里程碑（第一次見面、特殊稱呼）

**中優先級 (Medium)**:
- 有趣互動
- 學習時刻
- 情緒轉折

**低優先級 (Low)**:
- 日常招呼
- 重複內容
- 無意義互動

### 3. 系統整合

#### gemini.py (核心對話生成)
```python
# 在第372行整合記憶管理
update_npc_memory(npc_name, user_message, response, context)
```

#### mcp_server.py (MCP服務器)
```python
# 在第484-497行自動儲存對話
self.memory_managers[npc_id].add_conversation(
    player_message=message,
    npc_response=response,
    context=context
)
```

#### memory_manager.py (記憶管理核心)
- 管理短期和長期記憶
- 自動去重複對話
- 定期更新和清理

#### memory_filter.py (AI篩選器)
- 使用 Gemini 2.5 Flash 進行智能篩選
- 降級規則篩選作為備用方案

### 4. 使用方式

#### 手動更新記憶
```bash
# 更新所有 NPC 的記憶
cd backend
python3 memory_manager.py
```

#### 測試記憶系統
```bash
# 運行完整測試
cd backend
python3 test_memory_system.py
```

#### 清理冗餘記憶
```bash
# 清理重複和無用記憶
cd backend
python3 clean_memories.py
```

### 5. 自動化機制

1. **對話後自動儲存**: 每次對話後自動儲存到短期記憶
2. **定期篩選**: 每小時自動將超過7天的記憶篩選到長期記憶
3. **啟動時更新**: MCP服務器啟動時自動更新所有NPC記憶
4. **去重機制**: 自動檢測並跳過重複對話

### 6. 記憶格式範例

#### 短期記憶
```json
{
  "timestamp": "2025-08-12T18:05:34",
  "player_message": "我愛你，培修",
  "npc_response": "我...我也很喜歡你呢！",
  "emotion": "positive"
}
```

#### 長期記憶
```json
{
  "timestamp": "2025-08-04T10:00:00",
  "summary": "玩家向鋁配咻告白，鋁配咻也表達了喜歡。",
  "emotion": "愛情告白",
  "importance": "high",
  "reason": "關係發展的重要里程碑",
  "original": {
    "player": "我愛你，培修",
    "npc": "我...我也很喜歡你呢！"
  }
}
```

### 7. 注意事項

1. **API金鑰**: 確保設定 `GEMINI_API_KEY` 環境變數
2. **記憶檔案**: 不要手動刪除 memories 資料夾中的檔案
3. **篩選頻率**: AI篩選有成本，建議每小時執行一次
4. **備份機制**: 定期備份 memories 資料夾

### 8. 效能優化

- 使用 LRU 快取減少重複計算
- 異步處理避免阻塞主程序
- 智能去重減少儲存空間
- 降級機制確保系統穩定性

### 9. 監控指標

- 短期記憶數量
- 長期記憶數量
- AI篩選成功率
- 記憶去重效率
- 儲存空間使用率

### 10. 未來改進方向

1. 支援跨NPC記憶共享（八卦系統）
2. 情緒分析更精準化
3. 記憶檢索優化
4. 視覺化記憶管理界面
5. 記憶備份和恢復機制