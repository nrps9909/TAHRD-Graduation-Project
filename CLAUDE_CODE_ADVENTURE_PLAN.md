# Claude Code Adventure 實作計畫

## 一、現有架構分析

### 可復用的現有系統
| 系統 | 檔案位置 | 可復用程度 |
|------|----------|-----------|
| 學習路徑管理 | `src/data/unifiedLearningPath.ts` | 100% - 直接擴充 |
| 場景資料結構 | `src/data/scenes.ts` | 100% - 新增場景 |
| 遊戲狀態管理 | `src/store/gameStore.ts` | 90% - 小幅擴充 |
| 成就系統 | `src/data/achievements.ts` | 100% - 新增成就 |
| 互動組件 | `src/components/features/` | 80% - 新增組件 |
| 學習地圖 UI | `src/components/features/LearningPathMap.tsx` | 100% |

---

## 二、實作內容規劃

### Phase 1: 核心資料結構 (新增檔案)

#### 1.1 Claude Code 場景資料
**檔案**: `src/data/claudeCodeScenes.ts`

```typescript
// 6 個主要關卡的場景定義
- level-1-vibe-coding: 認識 Vibe Coding
- level-2-function-gen: 函式生成訓練
- level-3-refactor: 程式碼重構
- level-4-debug: 除錯技巧
- level-5-mini-project: 小型專案開發
- level-6-boss: 完整專案構建
```

#### 1.2 Prompt Templates 資料
**檔案**: `src/data/claudePromptCards.ts`

```typescript
interface PromptCard {
  id: string
  category: 'basic' | 'function' | 'refactor' | 'debug' | 'project'
  title: string
  template: string
  example: string
  tips: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
}
```

#### 1.3 NPC 角色定義
**檔案**: `src/data/npcCharacters.ts`

```typescript
// 4 個 NPC 角色
- Debug 仙人: 除錯專家
- Refactor 工匠: 重構大師
- Prompt 導師: 提示詞專家
- Code 貓咪: 主要導覽角色
```

---

### Phase 2: 新增 UI 組件

#### 2.1 Claude 模擬輸出組件
**檔案**: `src/components/features/ClaudeSimulator.tsx`

功能:
- 模擬 Claude Code 的輸入/輸出介面
- 支援預定義回應 (不串 API)
- 打字機效果動畫
- 程式碼高亮顯示

#### 2.2 Mission Page 模板
**檔案**: `src/components/features/MissionPage.tsx`

四大模塊:
1. 任務目標 (Mission Objective)
2. 提示與常用指令模板 (Hints & Prompt Templates)
3. 模擬 Claude Code 輸出
4. 互動式測驗

#### 2.3 Prompt Card 收集介面
**檔案**: `src/components/features/PromptCardCollection.tsx`

功能:
- 已收集卡片展示
- 卡片詳情彈窗
- 分類篩選

#### 2.4 冒險地圖組件
**檔案**: `src/components/features/AdventureMap.tsx`

功能:
- RPG 風格地圖視覺化
- 關卡連接線動畫
- 當前進度標示
- Boss 關卡特殊效果

#### 2.5 NPC 對話組件
**檔案**: `src/components/features/NPCDialog.tsx`

功能:
- NPC 立繪顯示
- 對話框動畫
- 提示引導

---

### Phase 3: 擴充現有系統

#### 3.1 擴充 gameStore
```typescript
// 新增狀態
collectedPromptCards: string[]
unlockedNPCs: string[]
claudeCodeProgress: {
  currentLevel: number
  levelProgress: Record<string, number>
}

// 新增方法
collectPromptCard: (cardId: string) => void
unlockNPC: (npcId: string) => void
```

#### 3.2 擴充學習路徑
在 `unifiedLearningPath.ts` 新增:
```typescript
// Claude Code Adventure 學習階段
{
  id: 'claude-code-adventure',
  title: 'Claude Code 冒險之旅',
  stages: [/* 6 個關卡 */]
}
```

#### 3.3 新增成就
在 `achievements.ts` 新增:
```typescript
// 10+ 個 Claude Code 相關成就
- vibe-coding-master
- prompt-collector
- debug-hero
- refactor-wizard
- project-builder
- boss-slayer
```

---

### Phase 4: 新增頁面路由

#### 4.1 Playground 頁面
**路由**: `/playground`
**檔案**: `src/components/features/Playground.tsx`

功能:
- 模擬 Claude Code UI
- Prompt 輸入區
- 模擬輸出區 (預定義回應)
- 範例 Prompt 選擇

#### 4.2 Docs 文件頁面
**路由**: `/docs`
**檔案**: `src/components/features/DocsPage.tsx`

內容:
- 什麼是 Vibe Coding
- Claude Code 核心能力
- Prompt Engineering 基本原則
- 常用模板與指令
- 常見錯誤排查

#### 4.3 冒險地圖頁面
**路由**: `/adventure`
**檔案**: `src/components/features/AdventurePage.tsx`

功能:
- 完整冒險地圖顯示
- 關卡選擇
- 進度總覽

---

## 三、關卡內容設計

### Level 1: 認識 Vibe Coding
**目標**: 用自然語言生成 "Hello World"
**場景**:
- 1-1: 什麼是 Vibe Coding
- 1-2: 第一次對話
- 1-3: 觀察 AI 回應
**獎勵**: 🎯 Vibe Coding 新手徽章

### Level 2: 函式生成訓練
**目標**: 學會描述 function 需求
**場景**:
- 2-1: 描述函式功能
- 2-2: 指定輸入輸出
- 2-3: 要求最佳實踐
**獎勵**: ⚡ 函式大師徽章

### Level 3: 程式碼重構
**目標**: 使用 Claude 重寫混亂程式
**場景**:
- 3-1: 識別程式碼問題
- 3-2: 請求重構
- 3-3: 添加註解與文件
**獎勵**: 🔧 Refactor 工匠徽章

### Level 4: 除錯技巧
**目標**: 學會描述 bug 給 Claude
**場景**:
- 4-1: 複製錯誤訊息
- 4-2: 描述預期行為
- 4-3: 理解修復建議
**獎勵**: 🐛 Debug 仙人徽章

### Level 5: 小型專案開發
**目標**: 用 Claude 完成 Todo App
**場景**:
- 5-1: 規劃專案架構
- 5-2: 逐步實作功能
- 5-3: 整合與測試
**獎勵**: 🚀 專案建造者徽章

### Level 6 (Boss): 完整專案構建
**目標**: 獨立完成一個完整專案
**場景**:
- 6-1: 需求分析
- 6-2: 架構設計
- 6-3: 實作與部署
**獎勵**: 👑 Vibe Coding 大師徽章

---

## 四、檔案結構

```
src/
├── data/
│   ├── claudeCodeScenes.ts      # 新增 - Claude Code 場景
│   ├── claudePromptCards.ts     # 新增 - Prompt 卡片
│   ├── npcCharacters.ts         # 新增 - NPC 定義
│   ├── unifiedLearningPath.ts   # 修改 - 新增學習路徑
│   ├── achievements.ts          # 修改 - 新增成就
│   └── scenes.ts                # 維持
│
├── components/features/
│   ├── ClaudeSimulator.tsx      # 新增 - Claude 模擬器
│   ├── MissionPage.tsx          # 新增 - 任務頁面
│   ├── PromptCardCollection.tsx # 新增 - 卡片收集
│   ├── AdventureMap.tsx         # 新增 - 冒險地圖
│   ├── NPCDialog.tsx            # 新增 - NPC 對話
│   ├── Playground.tsx           # 新增 - Playground
│   └── DocsPage.tsx             # 新增 - 文件頁面
│
├── store/
│   └── gameStore.ts             # 修改 - 擴充狀態
│
└── App.tsx                      # 修改 - 新增路由
```

---

## 五、實作優先順序

### MVP (最小可行版本)
1. ✅ `claudeCodeScenes.ts` - 6 個關卡基本場景
2. ✅ `ClaudeSimulator.tsx` - 模擬輸出組件
3. ✅ `MissionPage.tsx` - 任務頁面模板
4. ✅ 擴充 `unifiedLearningPath.ts`
5. ✅ 擴充 `gameStore.ts`
6. ✅ 前 3 關可互動內容

### 第二階段
7. `Playground.tsx` - Playground 頁面
8. `DocsPage.tsx` - 文件頁面
9. `claudePromptCards.ts` - Prompt 卡片系統
10. `PromptCardCollection.tsx` - 卡片收集 UI

### 第三階段
11. `AdventureMap.tsx` - RPG 風格地圖
12. `npcCharacters.ts` - NPC 系統
13. `NPCDialog.tsx` - NPC 對話
14. 完整 6 關內容
15. 新增成就系統

---

## 六、技術決策

| 項目 | 決策 | 原因 |
|------|------|------|
| API 串接 | 使用模擬輸出 | 避免 API 成本，保持可控 |
| 動畫庫 | Framer Motion | 與現有專案一致 |
| 樣式 | Tailwind CSS | 與現有專案一致 |
| 狀態管理 | Zustand | 與現有專案一致 |
| 路由 | React Router | 與現有專案一致 |

---

## 七、預估工作量

| 階段 | 內容 | 估計檔案數 |
|------|------|-----------|
| Phase 1 | 資料結構 | 3 檔案 |
| Phase 2 | UI 組件 | 5 檔案 |
| Phase 3 | 系統擴充 | 3 檔案修改 |
| Phase 4 | 新頁面 | 3 檔案 |
| **總計** | | **~14 檔案** |
