# 專案結構詳細說明 (Detailed Project Structure)

本文件旨在深入說明「心語小鎮」專案的整體架構，並詳細闡述各個檔案與目錄的核心功能、用途及其彼此之間的關聯。

## 總體架構

此專案是一個以 AI 驅動的 3D 療癒社交遊戲，採用現代化的 Web 技術棧，其主要架構分為四大核心部分：

-   **前端 (Frontend)**: 使用 React、TypeScript 和 Three.js (透過 `@react-three/fiber`) 打造的 3D 互動介面。負責渲染遊戲世界、UI 介面，並處理使用者互動。
-   **後端 (Backend)**: 一個混合式後端，結合了 Node.js (TypeScript) 的 GraphQL API 伺服器和一個獨立的 Python 對話生成服務。負責處理業務邏輯、資料庫互動、即時通訊以及與 AI 模型的通訊。
-   **資料庫 (Database)**: 使用 PostgreSQL 搭配 `pgvector` 擴充套件，用於儲存應用程式核心資料 (如用戶、NPC 資訊) 和 AI 的向量化記憶，以實現語義搜尋。
-   **容器化 (Containerization)**: 使用 Docker 和 Docker Compose 進行服務編排，將前端、後端、資料庫等服務容器化，以簡化開發環境的設定和實現一致的部署。

---

## 根目錄 (Root Directory)

根目錄包含專案的頂層設定、腳本和高階說明文件。

-   `package.json`: 頂層 Node.js 設定檔。它定義了整個專案的 `workspaces` (`frontend` 和 `backend`)，並提供全域腳本 (如 `dev`, `build`) 來同時操作前後端專案。
-   `docker-compose.yml`: 主要的 Docker Compose 設定檔。定義了前端、後端 API、PostgreSQL 和 Redis 等核心服務的容器化設定、網路和儲存卷。
-   `docker-compose-pgvector.yml`: 一個獨立的 Docker Compose 設定，專門用於啟動一個帶有 `pgvector` 擴充的 PostgreSQL 實例，主要用於測試或獨立的資料庫開發。
-   `start-local.sh` / `stop-local.sh`: 在本地非 Docker 環境中啟動/停止所有服務的便利腳本。它會手動啟動資料庫服務和前後端開發伺服器。
-   `start-mcp.sh` / `stop-mcp.sh`: 用於啟動/停止後端 AI 優化模式 (MCP, Model Context Protocol) 的腳本。
-   `GEMINI.md`, `SYSTEM_ARCHITECTURE.md`, `CLAUDE.md`, `PROJECT_STRUCTURE.md`: 專案的高階說明文件，分別描述了 AI 設計理念、系統架構、開發規範和專案結構。
-   `.gitignore`: Git 的忽略清單，用於排除不需要版本控制的檔案 (如 `node_modules`, `.env`, `dist` 等)。
-   `install-deps.sh`: 一個自動化安裝腳本，用於設定開發環境所需的所有系統級和專案級依賴。

---

## 後端 (`backend/`)

後端是專案的大腦，負責處理所有核心邏輯。

-   `gemini.py`: Python 腳本，作為與 Google Gemini API 互動的基礎 CLI 介面。它會讀取 NPC 的個性設定檔，建構 prompt，並呼叫 Gemini CLI 來生成對話。
-   `mcp_server.py`: (MCP: Model Context Protocol) 一個使用 FastAPI 框架的 Python HTTP 伺服器。它封裝了 `gemini.py` 的功能，提供一個常駐的、高效能的對話生成服務，透過預載入模型和快取機制來降低延遲，是專案中推薦的 AI 服務運行模式。
-   `package.json`: 後端 Node.js 服務的設定檔，定義了 GraphQL 伺服器、Prisma、Socket.IO 等相關的依賴。
-   `tsconfig.json`: TypeScript 編譯器的設定檔，定義了編譯選項，如目標 ES 版本、模組系統和路徑別名。
-   `nodemon.json`: `nodemon` 工具的設定檔，用於在開發過程中監控 `src` 和 `prisma` 目錄下的檔案變更，並自動重啟 Node.js 伺服器。

### `personalities/`
此目錄存放定義 NPC 行為的核心檔案。

-   `*_personality.txt`: 定義每個 NPC 的靜態人設，包括其背景故事、個性特徵 (MBTI)、價值觀、興趣愛好和口頭禪。
-   `*_chat_history.txt`: 提供該 NPC 的真實對話範例。這些範例作為 Few-shot Learning 的基礎，讓 AI 能夠模仿其獨特的說話風格、用詞和語氣。

### `prisma/`
此目錄負責所有與資料庫模型和遷移相關的任務。

-   `schema.prisma`: Prisma ORM 的核心檔案，使用 Prisma Schema Language (PSL) 定義了所有資料庫的資料模型 (如 `User`, `NPC`, `Conversation`)、欄位和模型之間的關聯。
-   `seed.ts`: 一個 TypeScript 腳本，用於在資料庫中植入初始資料 (Seeding)，例如，在系統首次啟動時建立預設的 NPC 角色。
-   `migrations/`: 存放 Prisma 自動產生的資料庫遷移 SQL 腳本。每個子目錄代表一次遷移，記錄了資料庫結構的演變歷史。

### `src/`
後端 Node.js 服務的主要原始碼目錄。

-   `index.ts`: Node.js 應用程式的進入點 (Entry Point)。它負責初始化 Express 伺服器、Apollo Server (GraphQL)、Socket.IO，並將它們整合在一起。
-   `context.ts`: 定義並創建 GraphQL 的 `Context`。它會在每個請求中被創建，並將資料庫實例 (`prisma`)、Redis 客戶端、Socket.IO 實例和用戶認證資訊注入到 resolvers 中。
-   `schema.ts`: 定義 GraphQL 的 Schema，包括所有的 `Type` (如 `User`, `NPC`), `Query`, `Mutation` 和 `Subscription`。這是 API 的契約。
-   `socket.ts`: 處理所有 Socket.IO 的即時通訊邏輯，包括監聽客戶端的事件 (如 `user-message`) 和廣播事件給客戶端 (如 `npc-conversation`)。
-   **`resolvers/`**: 存放 GraphQL 的解析器，實作 `schema.ts` 中定義的 API 的具體邏輯。
    -   `conversationResolvers.ts`: 處理所有與對話、關係和記憶花朵相關的查詢和變更。
    -   `npcResolvers.ts`: 處理與 NPC 資訊、心願相關的查詢。
    -   `userResolvers.ts`: 處理用戶註冊、登入、個人資訊查詢等。
    -   `scalarResolvers.ts`: 定義自訂的 GraphQL 純量類型，如 `DateTime` 和 `JSON`。
-   **`services/`**: 存放核心的業務邏輯，將複雜的邏輯從 resolvers 中分離出來。
    -   `geminiService.ts`: 統一的 AI 服務介面，它會根據環境變數決定是使用 `geminiServiceMCP.ts` (優化模式) 還是其他模式。
    -   `geminiServiceMCP.ts`: 專門與 `mcp_server.py` 互動的客戶端服務，負責發送請求並解析回應。
    -   `npcInteractionService.ts`: 處理 NPC 之間的自主互動邏輯。它會定期觸發 NPC 之間的對話，營造一個生動的世界。
    -   `npcMemoryService.ts`: 管理 NPC 記憶的服務，包括記憶的創建、檢索和分享。
-   **`utils/`**: 存放共用的工具函式。
    -   `logger.ts`: 設定 `winston` 日誌系統，提供統一的日誌記錄格式和輸出。
    -   `redis.ts`: 封裝 Redis 的連接邏輯。
    -   `pubsub.ts`: 用於 GraphQL 訂閱 (Subscription) 的發布/訂閱系統。

---

## 前端 (`frontend/`)

前端是使用者直接互動的 3D 遊戲介面，使用 Vite 作為建置工具。

-   `package.json`: 前端專案的設定檔，包含 React、Three.js、Zustand、Apollo Client 等依賴。
-   `vite.config.ts`: Vite 建置工具的設定檔，用於配置開發伺服器、路徑別名 (`@/`) 和建置選項。
-   `index.html`: 網站的 HTML 進入點，React 應用程式會被掛載到此頁面的 `<div id="root"></div>` 中。
-   `nginx.conf`: 用於生產環境部署的 Nginx 伺服器設定。它處理靜態檔案服務、API 和 WebSocket 的反向代理。

### `src/`
前端應用程式的主要原始碼目錄。

-   `main.tsx`: React 應用程式的掛載點，它會將 `App` 元件渲染到 `index.html` 的 root 元素中，並設定 `ApolloProvider`。
-   `App.tsx`: 應用程式的根元件，負責組織整個應用的佈局，包括 3D 場景 (`Canvas`) 和 2D UI。
-   **`components/`**: 存放所有的 React 元件，是 UI 的核心。
    -   `Scene.tsx`: 3D 場景的主容器，在 R3F 的 `<Canvas>` 元件內，負責組織所有 3D 物件、光線和環境。
    -   **`3D/`**: 存放所有 3D 場景物件的元件。
        -   `Player.tsx`: 玩家角色模型和控制邏輯。
        -   `NPCCharacter.tsx`: NPC 角色模型、動畫和基礎互動邏輯。
        -   `Buildings.tsx`, `Ground.tsx`, `Tree.tsx`, `Flower.tsx`: 構成 3D 世界的各種環境元件。
        -   `CameraController.tsx`: 實現第三人稱視角的相機跟隨和旋轉邏輯。
    -   **`UI/`**: 存放所有 2D 使用者介面的元件。
        -   `DialogueBox.tsx`: 玩家與 NPC 的主要對話介面。
        -   `NPCConversationBubble.tsx`: 用於顯示 NPC 之間自主對話的懸浮氣泡。
        -   `AnimalCrossingPhone/`: 遊戲內手機的 UI 元件集合，靈感來自《動物森友會》，提供地圖、設定、日記等功能。
        -   `InteractionHint.tsx`: 當玩家靠近可互動的 NPC 時，顯示的提示訊息。
-   **`hooks/`**: 存放自定義的 React Hooks，用於封裝共用邏輯。
    -   `useSocketConnection.ts`: 封裝與後端 Socket.IO 的連接、事件監聽和訊息發送邏輯。
-   **`stores/`**: 存放全域狀態管理邏輯。
    -   `gameStore.ts`: 使用 `Zustand` 建立的全局狀態儲存，管理玩家位置、NPC 狀態、對話紀錄、UI 顯示狀態等核心遊戲數據。
-   **`styles/`**: 存放 CSS 樣式檔案。
    -   `animalcrossing.css`: 定義了大量靈感來自《動物森友會》的 UI 風格和動畫效果。
    -   `index.css`: 專案的主樣式入口點，負責導入其他所有樣式模組。
-   **`utils/`**: 存放前端的共用工具函式。
    -   `apollo-client.ts`: 設定 Apollo Client，用於連接後端的 GraphQL API。
    -   `collision.ts`: 一個簡易的客戶端碰撞偵測系統，用於防止玩家穿過建築物或樹木。
    -   `soundManager.ts`: 管理遊戲中的背景音樂和音效播放。

---

## 資料庫 (`database/`)

存放用於初始化和遷移資料庫的 SQL 腳本。

-   `init.sql`: 基礎的資料庫初始化腳本，用於建立專案所需的所有表格 (tables) 和索引 (indexes)。
-   `init-3npcs.sql` / `seed-npcs.sql`: 用於在資料庫中植入初始 NPC 數據的腳本，確保開發和測試時有可互動的角色。
-   `memory_enhancement.sql`: 用於擴充資料庫功能的腳本，特別是新增與 NPC 共享記憶系統相關的表格，如 `SharedMemory` 和 `NPCMemoryAccess`。

---

## 文字資料 (`text/`)

此目錄存放用於訓練或產生 NPC 對話風格的原始文字資料。

-   `*.txt`: 包含各種來源的原始聊天記錄，是 AI 學習說話風格的素材庫。
-   `clean_*.py`: 用於清理和預處理原始聊天記錄的 Python 腳本。它們會移除時間戳、系統訊息、URL 等無關資訊，並進行匿名化處理，最終產生可供 AI 直接參考的 `*_chat_history.txt` 檔案。
