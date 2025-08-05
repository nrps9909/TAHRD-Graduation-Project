# 🌸 心語小鎮 (Heart Whisper Town)

一個以 LLM 技術驅動的 3D 療癒社交遊戲，讓玩家在溫暖的小鎮中與 AI 驅動的居民建立深度情感連結。

![心語小鎮預覽](https://img.shields.io/badge/Status-In%20Development-yellow?style=for-the-badge)

## ✨ 核心特色

### 🤖 智能 NPC 系統
- **記憶持續性**: NPC 會記住每次對話，關係會逐漸加深
- **情緒智能**: 基於 Gemini AI 的情緒識別和回應
- **個性化對話**: 每個 NPC 都有獨特的性格和背景故事

### 🌺 記憶花園系統
- **情感記憶**: 深度對話會在世界中生成美麗的記憶花朵
- **視覺化關係**: 通過花朵的類型和顏色反映對話的情感
- **成長機制**: 關係越深，花園越繁茂

### 💬 真實對話體驗
- **非腳本對話**: 每次對話都是由 AI 即時生成，永不重複
- **情感共鳴**: AI 能理解並回應玩家的情緒狀態
- **自然互動**: 支持自由文字輸入，無預設選項限制

## 🛠 技術架構

### 前端
- **React 18** + **TypeScript** - 現代化 UI 框架
- **Three.js** + **React Three Fiber** - 3D 渲染引擎
- **Tailwind CSS** - 療癒風格樣式系統
- **Zustand** - 輕量狀態管理
- **Socket.IO Client** - 即時通訊

### 後端  
- **Node.js** + **Express** - 服務器框架
- **GraphQL** + **Apollo Server** - API 層
- **Socket.IO** - WebSocket 即時通訊
- **Prisma** - 資料庫 ORM
- **Google Gemini AI** - 大語言模型

### 資料庫
- **PostgreSQL** + **pgvector** - 主資料庫與向量搜索
- **Redis** - 緩存與會話管理

### DevOps
- **Docker** + **Docker Compose** - 容器化部署
- **Nginx** - 反向代理與靜態文件服務

## 🚀 快速開始

### 前置需求
- Node.js 18+
- Docker & Docker Compose
- Google Gemini API Key

### 1. 克隆專案
```bash
git clone https://github.com/yourusername/heart-whisper-town.git
cd heart-whisper-town
```

### 2. 環境配置
```bash
cp .env.example .env
```
編輯 `.env` 文件，填入你的 Gemini API Key：
```env
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=your_jwt_secret_here
```

### 3. 啟動開發環境
```bash
# 使用 Docker Compose 啟動所有服務
docker-compose up -d

# 或者手動啟動
npm install
npm run dev
```

### 4. 初始化資料庫
```bash
# 進入後端容器
docker-compose exec backend bash

# 執行資料庫遷移
npm run db:push

# 執行種子資料
npm run db:seed
```

### 5. 訪問應用
- 前端: http://localhost:3000
- GraphQL Playground: http://localhost:4000/graphql
- 健康檢查: http://localhost:4000/health

## 🎮 遊戲玩法

### 基礎互動
1. **探索小鎮**: 使用滑鼠拖拽來移動視角
2. **與 NPC 對話**: 點擊 NPC 角色開始對話
3. **自由聊天**: 在對話框中輸入任何想說的話
4. **建立關係**: 持續對話來提升與 NPC 的關係等級

### 高級功能
- **記憶花園**: 查看與每個 NPC 的珍貴回憶
- **心願系統**: 幫助 NPC 實現他們的心願
- **日記系統**: 記錄你在小鎮的生活點滴
- **信件系統**: 與 NPC 進行深度的書信往來

## 🏗 專案結構

```
heart-whisper-town/
├── frontend/                 # React 前端應用
│   ├── src/
│   │   ├── components/       # React 組件
│   │   │   ├── 3D/          # Three.js 3D 組件
│   │   │   └── UI/          # 用戶界面組件
│   │   ├── stores/          # Zustand 狀態管理
│   │   ├── hooks/           # 自定義 Hooks
│   │   └── utils/           # 工具函數
│   └── Dockerfile
├── backend/                  # Node.js 後端 API
│   ├── src/
│   │   ├── resolvers/       # GraphQL 解析器
│   │   ├── services/        # 業務邏輯服務
│   │   ├── utils/           # 工具函數
│   │   └── prisma/          # 資料庫模型
│   └── Dockerfile
├── database/                 # 資料庫初始化腳本
├── docker-compose.yml        # Docker 容器編排
└── README.md
```

## 👥 NPC 角色介紹

### 🌸 小雅 - 咖啡館老闆娘
- **個性**: 溫暖親切，善於傾聽
- **背景**: 前心理諮商師，用咖啡和對話療癒人心
- **位置**: 小鎮咖啡館

### 📚 阿山 - 圖書館管理員  
- **個性**: 內向博學，對故事充滿熱愛
- **背景**: 相信每本書都是一個世界
- **位置**: 小鎮圖書館

### 🎵 月兒 - 夢幻音樂家
- **個性**: 富有創造力，情感豐富
- **背景**: 用音樂表達內心，相信音樂能治癒心靈
- **位置**: 湖邊音樂台

### 🌻 老張 - 花園管理員
- **個性**: 慈祥和藹，熟悉每種植物
- **背景**: 見證了無數美好回憶在花園中綻放
- **位置**: 記憶花園

### ⭐ 小晴 - 樂觀學生
- **個性**: 活潑開朗，充滿好奇心
- **背景**: 剛來小鎮的交換學生，正在適應新環境
- **位置**: 學校附近

## 🔧 開發指南

### 添加新 NPC
1. 在資料庫中添加 NPC 記錄
2. 更新 `geminiService.ts` 中的個性描述
3. 在前端添加 3D 模型和位置

### 自定義對話邏輯
編輯 `backend/src/services/geminiService.ts` 中的 prompt 模板

### 調整 3D 場景
修改 `frontend/src/components/3D/` 目錄下的組件

## 📈 未來規劃

### Phase 1 (當前)
- [x] 基礎 3D 場景與 NPC 系統
- [x] Gemini AI 對話整合
- [x] 記憶花園系統
- [ ] 用戶認證系統

### Phase 2
- [ ] 多人共享世界
- [ ] 更豐富的 NPC 互動
- [ ] 季節變化系統
- [ ] 手機端適配

### Phase 3
- [ ] 用戶生成內容工具
- [ ] 社交分享功能
- [ ] 高級 AI 功能
- [ ] 商業化功能

## 🤝 貢獻指南

我們歡迎所有形式的貢獻！

1. Fork 這個專案
2. 創建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 開啟 Pull Request

## 📄 授權條款

本專案採用 MIT 授權條款 - 詳見 [LICENSE](LICENSE) 文件

## 🙋‍♂️ 支援與聯繫

- 提交 Issue: [GitHub Issues](https://github.com/yourusername/heart-whisper-town/issues)
- 專案討論: [GitHub Discussions](https://github.com/yourusername/heart-whisper-town/discussions)
- 電子郵件: your.email@example.com

---

❤️ 用愛與技術打造的療癒世界 - 心語小鎮團隊