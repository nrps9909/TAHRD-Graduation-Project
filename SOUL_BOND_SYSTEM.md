# 心靈羈絆系統 (Soul Bond System) 實施指南

## 系統概覽

心靈羈絆系統是心語小鎮的核心玩法，通過深度的情感互動和持續的關係培養，創造玩家與NPC之間獨一無二的情感連結。

## 已實作功能

### 1. 資料庫結構 ✅
- 擴展了 `Relationship` model 加入羈絆系統欄位
- 新增多個支援表格：`EmotionalResonance`, `NPCDiaryEntry`, `DailyQuest`, `Achievement`, `TownReputation`, `GossipEntry` 等

### 2. 羈絆等級系統 (0-10級) ✅
**檔案**: `backend/src/services/soulBondService.ts`

- **等級進展**：
  - 0級：陌生人
  - 1-3級：相識→熟人→朋友
  - 4-6級：好友→知己→摯友
  - 7-9級：靈魂伴侶→生命之光→永恆羈絆
  - 10級：命運共同體

- **使用範例**：
```typescript
// 增加羈絆經驗
await SoulBondService.addBondExperience(userId, npcId, 50, "完成情感支持任務");

// 獲取羈絆資訊
const bondInfo = await SoulBondService.getBondLevelInfo(userId, npcId);
```

### 3. 情緒共鳴系統 ✅
**檔案**: `backend/src/services/emotionalResonanceService.ts`

- **情緒向量分析**：分析對話內容的情緒成分
- **共鳴計算**：計算玩家與NPC的情緒同步度
- **特殊對話解鎖**：高共鳴時解鎖特殊互動

```typescript
// 處理對話共鳴
const result = await EmotionalResonanceService.processConversationResonance(
  userId, npcId, userMessage, npcResponse
);
```

### 4. 每日任務系統 ✅
**檔案**: `backend/src/services/dailyQuestService.ts`

- **任務類型**：
  - 情感支持任務
  - 創作協助任務
  - 社交橋樑任務
  - 個人成長任務
  - 小鎮活動任務

```typescript
// 生成每日任務
const quests = await DailyQuestService.generateDailyQuests(userId);

// 完成任務
const { quest, rewards } = await DailyQuestService.completeQuest(questId, userId);
```

### 5. 小鎮影響力系統 ✅
**檔案**: `backend/src/services/townReputationService.ts`

- **聲望等級**：從新來者到小鎮傳奇（0-7級）
- **八卦傳播**：NPC之間會分享對玩家的印象
- **集體記憶**：影響整個小鎮對玩家的態度

```typescript
// 創建八卦
await TownReputationService.createGossip(userId, npcId, "幫助了我度過困難", 0.8);

// 計算NPC初始態度
const attitude = await TownReputationService.calculateNpcInitialAttitude(npcId, userId);
```

### 6. 成就系統 ✅
**檔案**: `backend/src/services/achievementService.ts`

- **成就類別**：
  - 羈絆建立類
  - 情感治癒類
  - 小鎮英雄類
  - 收集類
  - 探索類

```typescript
// 檢查成就
await AchievementService.checkAchievement(userId, 'first_tears', context);

// 獲取用戶成就
const achievements = await AchievementService.getUserAchievements(userId);
```

## 待實作功能

### 7. 離線進展功能
需要實作 `backend/src/services/offlineProgressService.ts`：

```typescript
class OfflineProgressService {
  // 生成離線期間的NPC活動
  async generateOfflineEvents(userId: string, offlineDuration: number) {}

  // 計算離線期間的關係變化
  async calculateRelationshipChanges(userId: string) {}

  // 生成重逢對話
  async generateReunionDialogue(userId: string, npcId: string) {}
}
```

### 8. 前端UI組件
需要在 `frontend/src/components/UI/` 建立：

1. **BondLevelDisplay.tsx** - 羈絆等級顯示
2. **QuestPanel.tsx** - 任務面板
3. **AchievementPanel.tsx** - 成就系統UI
4. **EmotionalSyncIndicator.tsx** - 情緒共鳴指示器
5. **TownReputationStatus.tsx** - 小鎮聲望狀態

### 9. GraphQL Schema 更新
需要在 `backend/src/schema/` 更新：

```graphql
type SoulBond {
  level: Int!
  exp: Int!
  emotionalSync: Float!
  specialTitle: String
  unlockedSecrets: [String!]!
}

type Query {
  getUserBonds(userId: ID!): [SoulBond!]!
  getDailyQuests(userId: ID!): [DailyQuest!]!
  getAchievements(userId: ID!): AchievementData!
  getTownReputation(userId: ID!): TownReputation!
}

type Mutation {
  completeQuest(questId: ID!): QuestCompletionResult!
  triggerResonanceEvent(npcId: ID!, eventType: String!): Boolean!
}
```

### 10. MCP整合
需要在 `backend/mcp_server.py` 中整合：

```python
# 在生成NPC回應時考慮羈絆等級
async def generate_with_bond_context(npc_id, user_id, message):
    bond_level = await get_bond_level(user_id, npc_id)
    emotional_sync = await get_emotional_sync(user_id, npc_id)

    # 根據羈絆等級調整回應深度
    context_depth = calculate_context_depth(bond_level)

    # 加入情緒共鳴提示
    emotional_prompt = generate_emotional_prompt(emotional_sync)

    return await generate_response(message, context_depth, emotional_prompt)
```

## 部署步驟

1. **更新資料庫**：
```bash
cd backend
npx prisma generate
npx prisma db push
```

2. **安裝依賴**：
```bash
npm install
```

3. **重啟服務**：
```bash
./start-mcp.sh
```

## 測試建議

1. **單元測試**：為每個服務建立測試檔案
2. **整合測試**：測試服務之間的互動
3. **負載測試**：確保系統能處理多用戶同時互動

## 注意事項

- 羈絆系統會大量使用記憶體，建議定期清理過期數據
- 八卦系統需要控制傳播速率，避免資料庫過載
- 成就檢查應該非同步進行，避免阻塞主要流程
- MCP整合時注意上下文長度限制

## 下一步開發重點

1. 完成離線進展系統
2. 建立前端UI組件
3. 整合到現有的MCP記憶系統
4. 實作季節性活動功能
5. 新增多人社交元素

這個系統將為心語小鎮帶來前所未有的深度和情感體驗！