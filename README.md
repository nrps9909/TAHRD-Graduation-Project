# 🎮 CCAdventure

<div align="center">
  <img src="https://img.shields.io/badge/React-19.x-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-7.x-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.x-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
</div>

<div align="center">
  <h3>🚀 一個現代化的互動式程式碼學習遊戲平台</h3>
  <p>透過遊戲化的方式學習程式設計，支援即時代碼執行、Live2D 虛擬教師與智能助手。</p>
</div>

---

## ✨ 主要特色

### 🎯 **遊戲化學習體驗**
- 🏆 成就系統與進度追蹤
- 🎊 即時回饋與鼓勵動畫
- 📊 個人化學習路徑

### 💻 **互動式程式環境**
- ⚡ 即時代碼執行與預覽
- 🔧 內建代碼編輯器
- 🧪 安全的沙盒執行環境

### 👩‍🏫 **智能教學助手**
- 🤖 Live2D 虛擬教師
- 🧠 Gemini AI 程式輔助
- 💬 即時問答與指導

### 📱 **現代化界面**
- 🎨 響應式設計，支援多設備
- 🌙 深色/淺色主題切換
- ⚡ 流暢的動畫效果

---

## 🏗️ 技術架構

```
ccadventure/
├── 📁 src/
│   ├── 📁 components/           # React 組件
│   │   ├── 📁 core/            # 核心組件 (ErrorBoundary, LoadingScreen)
│   │   ├── 📁 game/            # 遊戲相關組件
│   │   ├── 📁 ui/              # UI 組件 (通知、回饋系統)
│   │   └── 📁 features/        # 功能組件 (編輯器、助手等)
│   ├── 📁 hooks/               # 自定義 React Hooks
│   ├── 📁 services/            # API 服務層
│   ├── 📁 store/               # 狀態管理 (Zustand)
│   ├── 📁 types/               # TypeScript 類型定義
│   ├── 📁 utils/               # 工具函數
│   └── 📁 styles/              # 樣式文件
├── 📁 public/                  # 靜態資源
├── 📁 docs/                    # 項目文檔
├── 📁 scripts/                 # 構建與部署腳本
└── 📁 sandbox-implementation/  # 沙盒執行環境
```

### 🛠️ 技術棧

| 類別 | 技術 | 版本 | 說明 |
|------|------|------|------|
| **前端框架** | React | 19.x | 現代化前端框架 |
| **開發語言** | TypeScript | 5.x | 類型安全的 JavaScript |
| **構建工具** | Vite | 7.x | 快速的前端構建工具 |
| **樣式框架** | Tailwind CSS | 3.x | 實用優先的 CSS 框架 |
| **狀態管理** | Zustand | 5.x | 輕量級狀態管理 |
| **後端服務** | Node.js + Express | 18+ | 服務器端運行環境 |
| **數據庫** | SQLite | 3.x | 輕量級關係型數據庫 |
| **動畫庫** | Framer Motion | 12.x | 強大的動畫庫 |
| **AI 整合** | Google Gemini API | Latest | 智能程式輔助 |
| **虛擬角色** | Pixi.js + Live2D | 6.x | 互動式虛擬教師 |

---

## 🚀 快速開始

### 📋 系統需求

- **Node.js**: 18.0+
- **npm**: 8.0+ 或 **yarn**: 1.22+
- **Git**: 2.0+

### ⚡ 安裝與運行

1. **克隆專案**
   ```bash
   git clone https://github.com/your-username/ccadventure.git
   cd ccadventure
   ```

2. **安裝依賴**
   ```bash
   npm install
   # 或
   yarn install
   ```

3. **環境配置**
   ```bash
   cp .env.example .env
   # 編輯 .env 文件，配置必要的 API Keys
   ```

4. **啟動開發服務器**
   ```bash
   npm run dev
   # 或
   yarn dev
   ```

5. **打開瀏覽器**
   ```
   http://localhost:5173
   ```

### 🏗️ 生產環境部署

```bash
# 構建生產版本
npm run build

# 預覽生產版本
npm run preview

# 啟動生產服務器
npm run server
```

---

## 📚 詳細文檔

- 📖 [安裝指南](docs/SETUP.md)
- 🏗️ [架構設計](docs/SANDBOX_DESIGN.md)
- 🚀 [部署指南](docs/SANDBOX_DEPLOYMENT_GUIDE.md)
- 🎮 [使用教程](docs/CLAUDE_CODE_WEB_COURSE.md)

---

## 🎯 核心功能

### 🎮 **遊戲化學習**
- 完整的進度追蹤系統
- 多種成就徽章獲得
- 個人化學習路徑推薦

### 💻 **即時代碼執行**
- 支援多種程式語言
- 安全的沙盒執行環境
- 即時結果預覽與錯誤提示

### 🤖 **AI 智能助手**
- 基於 Google Gemini 的程式輔助
- 自然語言程式問答
- 智能代碼建議與除錯

### 👩‍🏫 **虛擬教師系統**
- Live2D 動畫角色
- 語音與文字互動
- 個性化教學建議

---

## 🤝 參與貢獻

我們歡迎任何形式的貢獻！請查看 [貢獻指南](CONTRIBUTING.md) 了解詳情。

### 📝 開發指南

1. Fork 此專案
2. 創建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 開啟 Pull Request

---

## 📄 授權條款

此專案採用 MIT 授權條款 - 查看 [LICENSE](LICENSE) 文件了解詳情。

---

## 🙋‍♂️ 支援與聯絡

- 📧 **Email**: your-email@example.com
- 🐛 **Issue 回報**: [GitHub Issues](https://github.com/your-username/ccadventure/issues)
- 💬 **討論區**: [GitHub Discussions](https://github.com/your-username/ccadventure/discussions)

---

<div align="center">
  <p>如果這個專案對你有幫助，請給我們一個 ⭐！</p>
  <p>Made with ❤️ by CCAdventure Team</p>
</div>