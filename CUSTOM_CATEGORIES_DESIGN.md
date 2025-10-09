# 自訂分類系統設計文檔

## 🎯 目標

讓使用者可以自訂：
1. **5個島嶼的大類別名稱**（固定5個島嶼，但可自訂名稱和顏色）
2. **7個 SubAgent 的小類別**（可自訂名稱、描述、對應的島嶼）
3. **分類系統會動態影響 SubAgent 的提示詞和行為**

## 📊 資料庫設計

### 1. Island Model（島嶼大類別）

```prisma
model Island {
  id            String   @id @default(auto()) @map("_id") @db.ObjectId
  userId        String   @map("user_id") @db.ObjectId

  // 固定位置（0-4，對應5個島嶼）
  position      Int      @unique // 0, 1, 2, 3, 4

  // 自訂資訊
  name          String   // 使用者自訂名稱，例如：「學習島」
  nameChinese   String   @map("name_chinese")
  emoji         String   @default("🏝️")
  color         String   @default("#FFB3D9")
  description   String?  @db.String

  // 3D位置（預設位置）
  positionX     Float    @default(0) @map("position_x")
  positionY     Float    @default(0) @map("position_y")
  positionZ     Float    @default(0) @map("position_z")

  // 統計
  subcategoryCount Int   @default(0) @map("subcategory_count")
  memoryCount   Int      @default(0) @map("memory_count")

  // 狀態
  isActive      Boolean  @default(true) @map("is_active")

  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  // Relations
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  subcategories Subcategory[]

  @@index([userId, position])
  @@map("islands")
}
```

### 2. Subcategory Model（小類別 = SubAgent）

```prisma
model Subcategory {
  id               String   @id @default(auto()) @map("_id") @db.ObjectId
  userId           String   @map("user_id") @db.ObjectId
  islandId         String   @map("island_id") @db.ObjectId

  // 固定位置（0-6，對應7個 SubAgent）
  position         Int      // 0, 1, 2, 3, 4, 5, 6

  // 自訂資訊
  name             String   // 英文名稱，例如：LEARNING
  nameChinese      String   @map("name_chinese") // 中文名稱
  emoji            String   @default("📚")
  color            String   @default("#FFB3D9")
  description      String?  @db.String

  // AI 設定（關鍵！）
  systemPrompt     String   @map("system_prompt") @db.String
  personality      String   @db.String
  chatStyle        String   @map("chat_style") @db.String

  // 關鍵字（用於分類判斷）
  keywords         String[] @default([])

  // 統計
  memoryCount      Int      @default(0) @map("memory_count")
  chatCount        Int      @default(0) @map("chat_count")

  // 狀態
  isActive         Boolean  @default(true) @map("is_active")

  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  // Relations
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  island           Island   @relation(fields: [islandId], references: [id], onDelete: Cascade)
  memories         Memory[]

  @@unique([userId, position])
  @@index([userId, islandId])
  @@map("subcategories")
}
```

### 3. Memory Model 更新

```prisma
model Memory {
  id               String   @id @default(auto()) @map("_id") @db.ObjectId
  userId           String   @map("user_id") @db.ObjectId

  // 改用新的分類系統
  subcategoryId    String   @map("subcategory_id") @db.ObjectId

  // ... 其他欄位保持不變

  // Relations
  subcategory      Subcategory @relation(fields: [subcategoryId], references: [id], onDelete: Cascade)

  @@index([userId, subcategoryId])
  @@map("memories")
}
```

## 🔄 遷移策略

### Phase 1: 創建新的 Schema
1. 添加 Island 和 Subcategory models
2. 保留原有的 Assistant 和 AssistantType（向後兼容）

### Phase 2: 初始化預設分類
為每個使用者創建預設的5個島嶼和7個小類別：

```typescript
// 預設島嶼配置
const DEFAULT_ISLANDS = [
  { position: 0, name: 'LEARNING_ISLAND', nameChinese: '學習島', emoji: '📚', color: '#FFB3D9' },
  { position: 1, name: 'LIFE_ISLAND', nameChinese: '生活島', emoji: '🌱', color: '#FFE5B3' },
  { position: 2, name: 'WORK_ISLAND', nameChinese: '工作島', emoji: '💼', color: '#B3D9FF' },
  { position: 3, name: 'SOCIAL_ISLAND', nameChinese: '社交島', emoji: '👥', color: '#D9FFB3' },
  { position: 4, name: 'GOALS_ISLAND', nameChinese: '目標島', emoji: '🎯', color: '#FFB3B3' },
]

// 預設小類別配置
const DEFAULT_SUBCATEGORIES = [
  { position: 0, islandPosition: 0, name: 'LEARNING', nameChinese: '學習筆記', keywords: ['學習', '教育', '知識'] },
  { position: 1, islandPosition: 0, name: 'INSPIRATION', nameChinese: '靈感創意', keywords: ['靈感', '創意', '想法'] },
  { position: 2, islandPosition: 2, name: 'WORK', nameChinese: '工作事務', keywords: ['工作', '專案', '任務'] },
  { position: 3, islandPosition: 3, name: 'SOCIAL', nameChinese: '人際關係', keywords: ['社交', '朋友', '關係'] },
  { position: 4, islandPosition: 1, name: 'LIFE', nameChinese: '生活記錄', keywords: ['生活', '日常', '健康'] },
  { position: 5, islandPosition: 4, name: 'GOALS', nameChinese: '目標規劃', keywords: ['目標', '計劃', '願望'] },
  { position: 6, islandPosition: 2, name: 'RESOURCES', nameChinese: '資源收藏', keywords: ['資源', '工具', '連結'] },
]
```

### Phase 3: 漸進式遷移
1. 新功能使用新的分類系統
2. 舊資料保持兼容
3. 提供遷移工具

## 🎨 UI 設計

### 資料庫頁面側邊欄
```
┌─────────────────────────┐
│ 💝 知識寶庫            │
│ 123 條記憶             │
│ [設定分類] ← 新按鈕    │
├─────────────────────────┤
│                         │
│ 📚 學習島 (35)         │
│   ├ 學習筆記 (20)      │
│   └ 靈感創意 (15)      │
│                         │
│ 🌱 生活島 (28)         │
│   └ 生活記錄 (28)      │
│                         │
│ 💼 工作島 (40)         │
│   ├ 工作事務 (25)      │
│   └ 資源收藏 (15)      │
│                         │
│ 👥 社交島 (12)         │
│   └ 人際關係 (12)      │
│                         │
│ 🎯 目標島 (8)          │
│   └ 目標規劃 (8)       │
│                         │
└─────────────────────────┘
```

### 分類管理 Modal
```
┌────────────────────────────────────┐
│ 🎨 自訂分類系統                    │
├────────────────────────────────────┤
│                                    │
│ 島嶼設定（5個固定島嶼）             │
│ ┌──────────────────────────────┐   │
│ │ 📚 學習島                     │   │
│ │ 名稱: [學習島          ]      │   │
│ │ 顏色: [#FFB3D9] 🎨            │   │
│ │ Emoji: [📚]                   │   │
│ └──────────────────────────────┘   │
│                                    │
│ 小類別設定（7個 SubAgent）          │
│ ┌──────────────────────────────┐   │
│ │ 📚 學習筆記                   │   │
│ │ 所屬島嶼: [學習島  ▼]         │   │
│ │ 名稱: [學習筆記    ]          │   │
│ │ 描述: [記錄學習心得...]        │   │
│ │ 關鍵字: 學習,教育,知識         │   │
│ │ [編輯提示詞]                   │   │
│ └──────────────────────────────┘   │
│                                    │
│ [取消] [儲存設定]                  │
└────────────────────────────────────┘
```

## 🚀 實作步驟

1. ✅ 分析現有架構
2. 🔄 設計新的 Schema（當前）
3. ⏳ 更新 Prisma Schema
4. ⏳ 創建遷移腳本
5. ⏳ 實作 GraphQL API
6. ⏳ 建立 UI 組件
7. ⏳ 整合到 SubAgent 系統
8. ⏳ 更新 Gemini CLI 提示詞

## ⚠️ 注意事項

1. **向後兼容**：保留原有的 Assistant 系統
2. **資料一致性**：確保島嶼和小類別的 position 唯一
3. **效能**：分類查詢需要優化索引
4. **AI 提示詞**：動態生成，避免硬編碼
