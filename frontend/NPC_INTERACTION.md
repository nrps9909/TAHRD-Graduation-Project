# NPC 互動系統整合說明

## 功能概述

實現了完整的 NPC 對話系統，整合了 Gemini LLM 來生成個性化的 NPC 回應。

## 實現內容

### 1. 前端功能

#### 人物朝向修正
- 修正了玩家角色朝向與移動方向不一致的問題
- 標準模式下修正了 Z 軸座標映射
- Pointer Lock 模式下角色朝向跟隨移動方向

#### F 鍵互動
- 按下 F 鍵檢測附近的 NPC（3 單位距離內）
- 自動選擇最近的 NPC 開始對話
- 支援 Console 日誌顯示互動信息

#### 視覺提示
- 新增 `InteractionHint` 組件
- 當玩家接近 NPC 時自動顯示「按 F 與 [NPC名稱] 對話」
- 提示會在玩家離開互動範圍時自動消失

### 2. 後端整合

#### Python LLM 服務
- 將 `gemini.py` 整合到後端
- 創建了專用的 `npc_dialogue_service.py`
- 支援個性化的 NPC 對話生成

#### 服務架構
```
前端 (F鍵) → Socket.IO → GraphQL → geminiService.ts → npc_dialogue_service.py → Gemini API
```

### 3. NPC 對話特性

#### 個性化回應
- 根據 NPC 的個性、背景故事生成回應
- 支援不同的情緒狀態（cheerful, calm, warm, thoughtful, dreamy）
- 回應長度控制在 1-3 句話

#### 智能備用機制
- 當 LLM 服務失敗時，提供符合角色個性的備用回應
- 確保遊戲體驗不會中斷

## 使用方式

1. **接近 NPC**：走到 NPC 附近（3 單位距離內）
2. **查看提示**：畫面會顯示「按 F 與 [NPC名稱] 對話」
3. **開始對話**：按下 F 鍵
4. **等待回應**：NPC 會根據其個性生成獨特的回應

## 技術細節

### 互動距離計算
```typescript
const interactionDistance = 3 // 單位
const distance = playerPos.distanceTo(npcPos)
```

### NPC 數據結構
```typescript
{
  name: string,
  personality: string,
  backgroundStory: string,
  currentMood: string,
  position: [x, y, z]
}
```

### 環境變數需求
- `GEMINI_API_KEY`：必須在環境變數中設定

## 後續優化建議

1. **互動動畫**：添加角色轉向 NPC 的動畫
2. **距離指示器**：顯示與 NPC 的距離
3. **多語言支援**：支援不同語言的對話
4. **對話歷史**：記錄並利用對話歷史增強連貫性
5. **表情系統**：根據對話內容改變 NPC 表情