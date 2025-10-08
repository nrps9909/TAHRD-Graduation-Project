# 🌸 心語小鎮 (Heart Whisper Town)

> 一個結合 AI 智能與溫暖療癒的元宇宙遊戲，讓每個 NPC 都擁有獨特的人格與深度記憶。

[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-61dafb)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![Gemini](https://img.shields.io/badge/Gemini-2.0--flash--exp-orange)](https://ai.google.dev/)

## ✨ 專案簡介

**心語小鎮**是一個次世代的 AI 驅動元宇宙療癒遊戲，融合了：

- 🎮 **動物森友會**風格的可愛視覺與溫暖氛圍
- 🤖 **深度 AI 人格系統** - 每個 NPC 都有獨特的個性、記憶與成長軌跡
- 🧠 **知識管理系統** - 玩家的想法、對話都被智能整理與關聯
- 💬 **自然語言互動** - 透過 Google Gemini 2.0 實現流暢的對話體驗
- 🌈 **情緒共鳴機制** - NPC 會記住你的情緒，並在未來的互動中展現同理心

## 🎯 核心特色

### 1. 🤖 AI 助手團隊系統

遊戲中有 8 位各具特色的 AI 助手：

| 助手 | 特色 | 功能 |
|------|------|------|
| 🐱 **呂貝熙 (Shiropu)** | 總長 | 團隊管理與決策協調 |
| 🐰 **白噗噗 (Hijiki)** | 知識管理 | RAG 知識檢索與記憶整理 |
| 🌸 **Tororo** | 情緒療癒 | 陪伴對話與心理支持 |
| 📚 **其他助手** | 各司其職 | 任務分配、分析、執行 |

### 2. 💭 智能知識管理

- **自動摘要與標籤** - AI 自動分析對話內容，提取關鍵重點
- **重要性評分** - 根據情緒強度與內容價值自動評分 (1-10)
- **相關記憶連結** - 智能關聯相似的記憶片段
- **多模態支援** - 文字、圖片、連結統一管理

### 3. 🌐 3D 互動世界

- **React Three Fiber** 打造的沉浸式 3D 環境
- **Live2D** 動態角色表情與動作
- **島嶼探索系統** - 每個助手都有獨立的居住島嶼
- **實時天氣與日夜循環**

## 🏗️ 技術架構

```
┌─────────────────────────────────────────────────┐
│            Frontend (React + Three.js)           │
│     • 3D Island View (React Three Fiber)        │
│     • Knowledge Database UI (Tailwind)          │
│     • Real-time Chat (Socket.IO)                │
└────────────────┬────────────────────────────────┘
                 │ GraphQL + WebSocket
┌────────────────┴────────────────────────────────┐
│           Backend (Node.js + Express)            │
│     • Apollo GraphQL Server                     │
│     • Multi-Agent Orchestration                 │
│     • Memory & Knowledge Management             │
└────────────────┬────────────────────────────────┘
                 │ API Calls
┌────────────────┴────────────────────────────────┐
│          AI Layer (Google Gemini)               │
│     • gemini-2.0-flash-exp                      │
│     • Personality Prompts                       │
│     • RAG (Retrieval-Augmented Generation)      │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────┴────────────────────────────────┐
│        Database (PostgreSQL + Redis)            │
│     • User Data & Conversations                 │
│     • NPC Memories & Relationships              │
│     • Vector Store (pgvector)                   │
└─────────────────────────────────────────────────┘
```

## 🚀 快速開始

### 前置需求

- **Node.js** >= 18.0.0
- **PostgreSQL** >= 14 (或使用 Docker)
- **Redis** (選用，用於快取)
- **Google Gemini API Key** ([申請連結](https://ai.google.dev/))

### 1. 克隆專案

```bash
git clone https://github.com/your-username/TAHRD-Graduation-Project.git
cd TAHRD-Graduation-Project
```

### 2. 環境變數設定

在 `backend/.env` 建立檔案：

```env
# 必填
GEMINI_API_KEY="your-gemini-api-key-here"
DATABASE_URL="postgresql://user:password@localhost:5432/heart_whisper_town"

# 選填
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-jwt-secret"
NODE_ENV="development"
```

### 3. 安裝依賴

```bash
# 安裝前後端依賴
npm install

# 或分別安裝
cd backend && npm install
cd ../frontend && npm install
```

### 4. 資料庫設定

```bash
cd backend

# 生成 Prisma Client
npm run db:generate

# 推送 Schema 到資料庫
npm run db:push

# (選用) 填充初始資料
npm run db:seed
```

### 5. 啟動服務

#### 方式 1: 使用啟動腳本 (推薦)

```bash
./start-knowledge-system.sh
```

#### 方式 2: 手動啟動

```bash
# Terminal 1 - 後端
cd backend
npm run dev

# Terminal 2 - 前端
cd frontend
npm run dev
```

### 6. 訪問應用

- 🌐 **前端**: http://localhost:3000
- 📚 **知識資料庫**: http://localhost:3000/database
- 🔌 **GraphQL Playground**: http://localhost:4000/graphql
- 🏥 **健康檢查**: http://localhost:4000/health

## 📁 專案結構

```
TAHRD-Graduation-Project/
├── backend/                    # Node.js 後端
│   ├── src/
│   │   ├── agents/            # AI 助手邏輯
│   │   ├── resolvers/         # GraphQL Resolvers
│   │   ├── services/          # 業務邏輯層
│   │   │   ├── chiefAgentService.ts    # 總長協調
│   │   │   ├── hijikiService.ts        # 知識管理
│   │   │   ├── ragConversation.ts      # RAG 對話
│   │   │   └── vectorService.ts        # 向量檢索
│   │   ├── schema.ts          # GraphQL Schema
│   │   └── index.ts           # 服務入口
│   ├── prisma/
│   │   ├── schema.prisma      # 資料庫 Schema
│   │   └── seed.ts            # 初始化資料
│   └── package.json
├── frontend/                   # React 前端
│   ├── src/
│   │   ├── components/
│   │   │   ├── 3D/           # Three.js 3D 組件
│   │   │   └── CatChat/      # 聊天組件
│   │   ├── pages/
│   │   │   ├── IslandView/   # 島嶼視圖
│   │   │   └── KnowledgeDatabase/  # 知識庫
│   │   ├── services/
│   │   │   └── tororoAI.ts   # AI 服務封裝
│   │   └── graphql/          # GraphQL Queries
│   └── package.json
├── .gitignore
├── start-knowledge-system.sh  # 一鍵啟動腳本
└── README.md
```

## 🎮 使用指南

### 知識管理系統

1. **新增記憶**
   - 點擊右下角「✨」浮動按鈕
   - 輸入內容，AI 會自動分析並添加標籤

2. **查看記憶**
   - Grid 視圖：卡片式展示，適合瀏覽
   - List 視圖：列表式展示，適合快速掃描

3. **篩選與排序**
   - 依助手分類篩選
   - 點擊「🔧 進階篩選」展開更多選項

4. **釘選重要記憶**
   - 點擊卡片上的 📌 圖標
   - 釘選的記憶會固定在最上方

### AI 對話系統

1. **與助手聊天**
   - 點擊島嶼上的 NPC
   - 開始自然語言對話

2. **知識檢索**
   - 詢問「我之前說過什麼？」
   - Hijiki 會透過 RAG 檢索相關記憶

3. **情緒支持**
   - 與 Tororo 分享心情
   - 獲得溫暖的回應與建議

## 🛠️ 開發

### 可用腳本

#### 後端
```bash
npm run dev          # 開發模式（hot reload）
npm run build        # 編譯 TypeScript
npm run start        # 生產模式
npm run db:generate  # 生成 Prisma Client
npm run db:push      # 同步資料庫 Schema
npm run db:migrate   # 執行資料庫遷移
npm run lint         # ESLint 檢查
npm run test         # 執行測試
```

#### 前端
```bash
npm run dev          # 開發模式（Vite HMR）
npm run build        # 生產打包
npm run preview      # 預覽生產版本
npm run lint         # ESLint 檢查
npm run test         # 執行測試
```

### Hot Reload

- ✅ **後端**: 使用 `nodemon`，修改 `.ts` 檔案自動重啟
- ✅ **前端**: 使用 Vite HMR，修改即時更新

## 🧪 測試

```bash
# 執行所有測試
npm run test

# 後端測試
cd backend && npm run test

# 前端測試
cd frontend && npm run test
```

## 📊 資料庫 Schema

### 主要模型

- **User** - 使用者帳號
- **Memory** - 知識記憶片段
- **Assistant** - AI 助手資料
- **Conversation** - 對話紀錄
- **Island** - 3D 島嶼配置

詳細 Schema 請參考 `backend/prisma/schema.prisma`

## 🔧 環境變數說明

| 變數 | 必填 | 說明 | 預設值 |
|------|------|------|--------|
| `GEMINI_API_KEY` | ✅ | Google Gemini API Key | - |
| `DATABASE_URL` | ✅ | PostgreSQL 連接字串 | - |
| `REDIS_URL` | ❌ | Redis 連接字串 | - |
| `JWT_SECRET` | ✅ | JWT 加密密鑰 | - |
| `NODE_ENV` | ❌ | 執行環境 | `development` |
| `PORT` | ❌ | 後端服務埠號 | `4000` |

## 🐛 疑難排解

### 後端無法連接資料庫

1. 確認 PostgreSQL 服務已啟動
2. 檢查 `DATABASE_URL` 格式是否正確
3. 執行 `npm run db:push` 同步 Schema

### Gemini API 錯誤

1. 確認 API Key 有效且有足夠配額
2. 檢查 `.env` 中 `GEMINI_API_KEY` 是否包含引號
3. 查看 `backend/logs/backend.log` 取得詳細錯誤

### 前端無法載入資料

1. 確認後端服務已啟動（http://localhost:4000/health）
2. 檢查瀏覽器 Console 是否有 CORS 錯誤
3. 清除瀏覽器快取並硬刷新（Ctrl+Shift+R）

## 🤝 貢獻指南

我們歡迎所有形式的貢獻！

1. Fork 專案
2. 建立特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交變更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

## 📝 授權

本專案採用 MIT 授權 - 詳見 [LICENSE](LICENSE) 檔案

## 👥 團隊

**心語小鎮開發團隊** - TAHRD 畢業專題

## 🙏 致謝

- [Google Gemini](https://ai.google.dev/) - AI 對話引擎
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber/) - 3D 渲染框架
- [Prisma](https://www.prisma.io/) - 現代化 ORM
- [Apollo GraphQL](https://www.apollographql.com/) - GraphQL 實作
- 所有開源社群的貢獻者們

## 📮 聯絡方式

如有任何問題或建議，歡迎透過以下方式聯絡：

- 📧 Email: your-email@example.com
- 🐛 Issues: [GitHub Issues](https://github.com/your-username/TAHRD-Graduation-Project/issues)

---

💖 用愛與科技打造的溫暖小鎮，歡迎來玩！
