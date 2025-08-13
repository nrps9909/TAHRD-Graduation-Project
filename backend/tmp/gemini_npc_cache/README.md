# Gemini NPC Cache 目錄結構

這個目錄包含了所有 NPC 的獨立執行環境，每個 NPC 都有自己的隔離空間。

## 目錄結構

```
gemini_npc_cache/
├── lupeixiu/                      # 陸培修 NPC
├── liuyucen/                      # 劉宇岑 NPC  
├── chentingan/                    # 陳庭安 NPC
└── README.md                      # 本文件

每個 NPC 目錄結構：
[npc_name]/
├── gemini.py                      # NPC 專用的優化版 Gemini 執行腳本
├── GEMINI.md                      # Gemini CLI 系統提示詞（必須與 gemini.py 同目錄）
├── .geminiignore                  # 忽略檔案設定（必須與 gemini.py 同目錄）
├── [NPC_Name]_Personality.md     # NPC 人設檔案
├── [NPC_Name]_Chat_style.txt     # NPC 對話風格範例
├── short_term_memory/             # 短期記憶目錄
│   └── conversations.json        # 最近的對話記錄
└── long_term_memory/              # 長期記憶目錄
    └── memories.json              # 重要的長期記憶
```

## 重要說明

### 必須與 gemini.py 同目錄的檔案
- **GEMINI.md**: Gemini CLI 的系統提示詞，通過 `--include-directories` 自動載入
- **.geminiignore**: 指定要忽略的檔案，避免載入不必要的內容

### 記憶系統
- **短期記憶**: 儲存最近的對話，用於保持對話連貫性
- **長期記憶**: 儲存重要事件和關係，形成 NPC 的持久記憶

### 檔案命名規範
- Personality 檔案: `[NPC_Name]_Personality.md` (注意大小寫)
  - lupeixiu: `LuPeiXiu_Personality.md`
  - liuyucen: `LiuYuCen_Personality.md`
  - chentingan: `ChenTingAn_Personality.md`
- Chat style 檔案: `[NPC_Name]_Chat_style.txt` (注意大小寫)

### 執行方式
每個 NPC 都通過自己目錄下的 `gemini.py` 執行：
```bash
cd [npc_name]/
python3 gemini.py "你的對話內容"
```

### 優化特性
- 使用官方 Token Caching 加速回應
- /tmp 目錄快取提升 I/O 效能
- 預編譯上下文減少重複讀取
- 智能快取管理（5分鐘內重用）
- 自動清理系統訊息輸出

## 維護指南

1. **更新記憶**: 直接修改 JSON 檔案或通過 API 更新
2. **清理快取**: 刪除 `/tmp/gemini_[npc_name]_cache/` 目錄
3. **調試模式**: 設定 `DEBUG=1` 環境變數查看詳細執行資訊
4. **性能監控**: 查看 stderr 輸出的執行時間和快取狀態