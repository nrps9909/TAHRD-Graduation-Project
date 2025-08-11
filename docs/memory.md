● NPC長短期記憶系統詳細架構

  一、系統架構圖

  ┌─────────────────────────────────────────────────────────────┐
  │                         玩家輸入                              │
  └────────────────────────┬────────────────────────────────────┘
                           ↓
  ┌─────────────────────────────────────────────────────────────┐
  │                    MCP Server (mcp_server.py)                │
  │  ┌──────────────────────────────────────────────────────┐   │
  │  │            記憶管理器 (MemoryManager)                  │   │
  │  │  • 載入短期/長期記憶                                   │   │
  │  │  • 生成記憶上下文                                      │   │
  │  │  • 保存新對話                                         │   │
  │  └──────────────────────┬───────────────────────────────┘   │
  └────────────────────────┬────────────────────────────────────┘
                           ↓
  ┌─────────────────────────────────────────────────────────────┐
  │                      Gemini CLI 調用                         │
  │  帶入參數：                                                   │
  │  • --include-directories memories/[npc_name]                │
  │  • 載入 [npc_name]_memories.md                              │
  │  • 載入個性檔案和聊天風格                                     │
  └────────────────────────┬────────────────────────────────────┘
                           ↓
  ┌─────────────────────────────────────────────────────────────┐
  │                     生成 NPC 回應                             │
  └─────────────────────────────────────────────────────────────┘

  二、檔案結構詳解

  backend/
  ├── memory_manager.py          # 核心記憶管理模組
  ├── mcp_server.py             # 整合記憶系統的MCP服務
  ├── memories/
  │   ├── lupeixiu/             # 鋁配咻的記憶庫
  │   │   ├── short_term_memory/
  │   │   │   └── conversations.json    # 7天內所有對話
  │   │   ├── long_term_memory/
  │   │   │   └── memories.json         # 篩選後的重要記憶
  │   │   ├── lupeixiu_memories.md     # Gemini可讀格式（自動生成）
  │   │   ├── LuPeiXiu_Personality.md  # 個性設定
  │   │   └── LuPeiXiu_Chat_style.txt  # 聊天風格
  │   ├── liuyucen/            # 流羽岑的記憶庫
  │   ├── chentingan/          # 沉停鞍的記憶庫
  │   └── shared/              # 共享記憶（NPC間的八卦）

  三、記憶生命週期

  1. 記憶創建階段

  # 玩家與NPC對話時
  conversation = {
      "timestamp": "2025-08-11T15:00:00",
      "player_message": "你好，今天天氣真好",
      "npc_response": "是啊！陽光暖暖的...",
      "context": {},
      "emotion": "positive"  # 自動分析情緒
  }

  2. 短期記憶階段（0-7天）

  - 儲存位置: short_term_memory/conversations.json
  - 特點:
    - 保存完整對話內容
    - 包含時間戳記
    - 自動情緒分析
    - FIFO管理（先進先出）

  {
    "timestamp": "2025-08-11T15:00:00",
    "player_message": "完整的玩家訊息",
    "npc_response": "完整的NPC回應",
    "context": {
      "location": "花園",
      "weather": "晴天"
    },
    "emotion": "positive"
  }

  3. 記憶篩選階段（第7天）

  def _filter_important_memories(self, memories):
      """篩選重要記憶的三大標準"""

      # 標準1: 情緒強度
      if memory["emotion"] in ["positive", "negative"]:
          is_important = True

      # 標準2: 關鍵詞檢測
      keywords = ["喜歡", "愛", "討厭", "重要",
                  "秘密", "約定", "承諾", "夢想"]

      # 標準3: 對話深度（字數>50）
      if len(memory["player_message"]) > 50:
          is_important = True

  4. 長期記憶階段（7天後）

  - 儲存位置: long_term_memory/memories.json
  - 特點:
    - 摘要形式儲存
    - 包含重要性評分
    - 永久保存
    - 限制數量（避免無限增長）

  {
    "timestamp": "2025-08-01T10:00:00",
    "summary": "愉快的對話：玩家提到「喜歡畫畫」，我開心地回應",
    "emotion": "positive",
    "importance": "high"
  }

  四、記憶載入機制

  1. MCP Server啟動時

  class NPCDialogueServer:
      def __init__(self):
          # 為每個NPC初始化記憶管理器
          self.memory_managers = {}
          for npc_id, npc_name in self.npc_map.items():
              self.memory_managers[npc_id] = MemoryManager(npc_name)

              # 生成Gemini可讀的記憶檔案
              memory_content = self.memory_managers[npc_id].export_memories_to_gemini_format()
              memory_file.write_text(memory_content)

  2. Gemini CLI調用時

  # 自動載入記憶目錄
  cmd.extend([
      "--include-directories",
      f"memories/{npc_name},memories/shared"
  ])

  3. 記憶上下文生成

  # LUPEIXIU 的記憶庫

  ## 個人記憶摘要
  我是lupeixiu，這是我與玩家互動的記憶。

  【長期記憶】
  - 2025-08-01: 愉快的對話：玩家提到「喜歡畫畫」 (情緒: positive)
  - 2025-07-28: 困難的對話：玩家說「感到孤單」 (情緒: negative)

  【短期記憶（最近7天）】
  - 2025-08-11 15:00: 玩家說「你好」我回「你好呀！」
  - 2025-08-10 14:30: 玩家說「天氣真好」我回「是啊！」

  五、記憶更新流程

  1. 啟動時更新（start-mcp.sh）

  # 只在啟動時執行，避免背景負載
  python3 -c "
  from memory_manager import update_all_npc_memories
  update_all_npc_memories()  # 處理所有NPC的記憶遷移
  "

  2. 對話後保存

  # 在 mcp_server.py 中
  if response and npc_id in self.memory_managers:
      # 保存到短期記憶
      self.memory_managers[npc_id].add_conversation(
          player_message=message,
          npc_response=response,
          context=context
      )

      # 更新Gemini可讀檔案
      memory_content = self.memory_managers[npc_id].export_memories_to_gemini_format()
      memory_file.write_text(memory_content)

  六、記憶系統特色功能

  1. 情緒記憶分析

  def _analyze_emotion(self, player_message, npc_response):
      positive_words = ["開心", "快樂", "喜歡", "愛", "好"]
      negative_words = ["難過", "生氣", "討厭", "不好"]

      # 計算情緒分數
      positive_count = sum(1 for word in positive_words if word in text)
      negative_count = sum(1 for word in negative_words if word in text)

      return "positive" / "negative" / "neutral"

  2. 記憶重要性評分

  importance_factors = {
      "emotion_intensity": 0.3,      # 情緒強度
      "keyword_presence": 0.3,       # 關鍵詞
      "conversation_length": 0.2,    # 對話長度
      "player_engagement": 0.2       # 玩家參與度
  }

  3. 記憶容量管理

  # 短期記憶：無限制（7天後自動清理）
  # 長期記憶：限制最多保留50條最重要的記憶
  if len(long_term_memories) > 50:
      # 根據importance排序，只保留前50條
      long_term_memories = sorted(
          long_term_memories,
          key=lambda x: x['importance'],
          reverse=True
      )[:50]

  七、效能優化策略

  1. LRU快取機制
    - 快取最近使用的記憶查詢結果
    - 減少檔案I/O操作
  2. 記憶摘要限制
    - 短期記憶：前30字
    - 長期記憶：50字摘要
  3. 載入數量限制
    - 長期記憶：最近5條
    - 短期記憶：最近10條
  4. 異步處理
    - 使用asyncio非同步保存記憶
    - 不阻塞對話生成

  八、安全機制

  1. 防止記憶洩漏
    - 定期清理過期記憶
    - 限制記憶檔案大小
  2. 防止系統過載
    - 只在啟動時批量更新
    - 禁止背景自動更新
  3. 資料完整性
    - JSON格式驗證
    - 錯誤處理和日誌記錄

  九、未來擴展方向

  1. 記憶關聯圖譜
    - 建立記憶之間的關聯
    - 實現聯想記憶
  2. NPC間記憶共享
    - 八卦系統
    - 共同記憶
  3. 記憶遺忘曲線
    - 模擬真實記憶衰退
    - 重要性隨時間變化
  4. 多模態記憶
    - 圖像記憶
    - 聲音記憶
    - 場景記憶

  這個系統讓每個NPC都擁有獨特的記憶體驗，真正實現了"活著的NPC"概念！