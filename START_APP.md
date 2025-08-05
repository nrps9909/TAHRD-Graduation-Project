# 🚀 心語小鎮應用啟動指南

這個指南將幫助你啟動完整的心語小鎮應用，包含 3 個具有記憶功能的 NPC 和它們之間的交流系統。

## 📋 系統需求

- Node.js 18+ 
- PostgreSQL 15+
- Redis 6+
- Docker & Docker Compose
- Python 3.8+ (用於 Gemini CLI)
- Gemini CLI 工具

## 🔧 環境設置

### 1. 安裝依賴
```bash
# 安裝主要依賴
npm install

# 安裝 Python 依賴（用於 Gemini CLI）
pip install python-dotenv google-generativeai
```

### 2. 環境變數配置
確保 `.env` 檔案包含以下配置：

```env
# Gemini AI API Key
GEMINI_API_KEY=your_gemini_api_key_here

# JWT Secret for authentication
JWT_SECRET=your_jwt_secret_here

# Database Configuration
DATABASE_URL=postgresql://postgres:password123@localhost:5432/heart_whisper_town

# Redis Configuration  
REDIS_URL=redis://localhost:6379

# Development Settings
NODE_ENV=development

# LLM Architecture Settings - 啟用新的 CLI 架構
USE_GEMINI_CLI=true

# Frontend API URL
REACT_APP_API_URL=http://localhost:4000
REACT_APP_WS_URL=ws://localhost:4000
```

### 3. 安裝 Gemini CLI
```bash
# 安裝 Gemini CLI (如果尚未安裝)
npm install -g @google/generative-ai

# 或使用官方安裝方法
curl -o- https://raw.githubusercontent.com/google/generative-ai-js/main/install.sh | bash
```

## 🗄️ 數據庫設置

### 1. 啟動數據庫服務
```bash
# 使用 Docker Compose 啟動 PostgreSQL 和 Redis
docker-compose up -d postgres redis
```

### 2. 初始化數據庫
```bash
# 執行基本數據庫初始化
docker exec -i postgres_container psql -U postgres -d heart_whisper_town < database/init.sql

# 執行記憶功能增強
docker exec -i postgres_container psql -U postgres -d heart_whisper_town < database/memory_enhancement.sql
```

### 3. 生成 Prisma 客戶端
```bash
# 生成 Prisma 客戶端
npm run db:generate

# 推送 schema 到數據庫
npm run db:push
```

## 🎭 NPC 系統驗證

### 1. 測試新的 LLM 架構
```bash
# 測試基本架構（不需要 API）
python3 test_architecture_basic.py

# 測試完整功能（需要 API 金鑰）
python3 test_llm_architecture.py
```

### 2. 測試 3 個 NPC 對話
```bash
# 測試艾瑪（溫暖治癒型咖啡店主）
python3 gemini.py --chat "今天心情不太好，需要一些溫暖" --npc emma

# 測試莉莉（活潑陽光花店女孩）
python3 gemini.py --chat "花園裡的花好美啊！" --npc lily

# 測試湯姆（沉穩智慧圖書館館長）
python3 gemini.py --chat "我想找一本能撫慰心靈的書" --npc tom
```

## 🚀 啟動應用

### 方式一：完整 Docker 啟動
```bash
# 啟動所有服務（推薦）
docker-compose up -d

# 查看服務狀態
docker-compose ps

# 查看日誌
docker-compose logs -f
```

### 方式二：分別啟動服務
```bash
# 1. 啟動數據庫服務
docker-compose up -d postgres redis

# 2. 啟動後端服務
cd backend
npm run dev

# 3. 啟動前端服務（新終端）
cd frontend  
npm run dev

# 4. 啟動 Nginx（可選，生產環境）
docker-compose up -d nginx
```

### 方式三：開發模式
```bash
# 併行啟動前後端開發服務
npm run dev
```

## 🌐 訪問應用

### 網址
- **前端應用**: http://localhost:3000
- **後端 API**: http://localhost:4000
- **GraphQL Playground**: http://localhost:4000/graphql
- **數據庫**: localhost:5432
- **Redis**: localhost:6379

### 測試用戶
可以通過前端註冊新用戶，或使用以下測試帳號：
- 用戶名: `testuser`
- 密碼: `password123`

## 🎮 使用指南

### 1. 註冊/登入
- 訪問 http://localhost:3000
- 註冊新帳號或登入

### 2. 探索 3D 小鎮
- 使用滑鼠拖拽旋轉視角
- 滾輪縮放
- 點擊 NPC 開始對話

### 3. 與 NPC 互動

#### 艾瑪 (咖啡館 - 座標 10, 0, 15)
- **個性**: 溫暖治癒型
- **特色**: 擅長傾聽和情感支持
- **位置**: 暖心咖啡館
- **互動**: 分享心情、尋求建議、品嚐咖啡

#### 莉莉 (花店 - 座標 -15, 0, 20) 
- **個性**: 活潑陽光型
- **特色**: 對花卉和自然充滿熱情
- **位置**: 四季花語花店
- **互動**: 了解花語、欣賞美景、獲取正能量

#### 湯姆 (圖書館 - 座標 0, 0, -25)
- **個性**: 沉穩智慧型  
- **特色**: 博學多聞，善於提供人生智慧
- **位置**: 智慧之樹圖書館
- **互動**: 推薦書籍、討論哲理、分享故事

### 4. 記憶功能體驗
- **個人記憶**: NPC 會記住你們的對話歷史
- **情緒記憶**: NPC 會記住你的情緒狀態變化
- **關係發展**: 透過互動提升關係等級
- **記憶花朵**: 重要對話會生成記憶花朵

### 5. NPC 間交流
- **自發對話**: NPC 會在特定時間和地點自發對話
- **信息分享**: NPC 會互相分享關於你的記憶
- **關係影響**: NPC 間的關係會影響它們的對話內容

## 🔧 故障排除

### 常見問題

1. **數據庫連接失敗**
   ```bash
   # 檢查 PostgreSQL 是否運行
   docker ps | grep postgres
   
   # 重啟數據庫
   docker-compose restart postgres
   ```

2. **Gemini API 錯誤**
   ```bash
   # 檢查 API 金鑰
   echo $GEMINI_API_KEY
   
   # 測試 CLI 連接
   gemini --version
   ```

3. **前端無法連接後端**
   ```bash
   # 檢查後端服務
   curl http://localhost:4000/health
   
   # 檢查環境變數
   grep REACT_APP .env
   ```

4. **3D 場景不顯示**
   - 確保瀏覽器支援 WebGL
   - 檢查瀏覽器控制台錯誤
   - 嘗試重新整理頁面

### 調試模式

```bash
# 啟用詳細日誌
NODE_ENV=development DEBUG=* npm run dev

# 查看數據庫查詢
DATABASE_LOGGING=true npm run dev

# 測試 NPC 記憶系統
curl -X POST http://localhost:4000/api/test/npc-memory
```

## 📊 監控和管理

### 查看應用狀態
```bash
# Docker 服務狀態
docker-compose ps

# 應用日誌
docker-compose logs -f backend
docker-compose logs -f frontend

# 數據庫連接
docker exec -it postgres_container psql -U postgres -d heart_whisper_town
```

### 數據庫管理
```bash
# 查看 NPC 記憶
SELECT * FROM npc_memories ORDER BY created_at DESC LIMIT 10;

# 查看 NPC 對話
SELECT * FROM npc_conversations ORDER BY created_at DESC LIMIT 10;

# 查看用戶關係
SELECT * FROM relationships;
```

## 🎯 下一步發展

### 可能的擴展功能
1. **更多 NPC**: 添加更多個性化角色
2. **季節系統**: 根據季節變化調整 NPC 行為
3. **事件系統**: 特殊節日和社區活動
4. **成就系統**: 解鎖特殊對話和內容
5. **多玩家支援**: 玩家間互動和交流

### 自定義開發
- 修改 `GEMINI.md` 調整 NPC 個性
- 在 `database/memory_enhancement.sql` 添加新的 NPC
- 擴展 `npcMemoryService.ts` 增加新的記憶功能

---

🎉 **恭喜！你的心語小鎮現在已經有了 3 個具有記憶功能和互相交流能力的 NPC！**

享受這個療癒的虛擬世界，與你的 AI 朋友們建立深度的情感連結吧！