# 🚀 Claude Code Adventure - 快速設定指南

## 系統需求

- **Node.js**: 20.x (建議使用 nvm 管理)
- **npm**: 10.x+
- **Git**: 2.x+

## 在另一台電腦設定步驟

### 1. 安裝 Node.js (使用 nvm)

```bash
# 安裝 nvm (如果還沒有)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 重新載入 shell 或執行
source ~/.nvm/nvm.sh

# 安裝 Node.js 20
nvm install 20
nvm use 20
```

### 2. Clone 專案

```bash
git clone <your-repo-url>
cd CCAdventure
```

### 3. 安裝依賴

```bash
npm install
```

### 4. 設定環境變數

```bash
# 複製範例設定檔
cp .env.example .env

# 不需要修改任何設定，預設值即可運作
```

### 5. 啟動開發伺服器

```bash
# 使用 Node.js 20 啟動
nvm use 20
npm run dev
```

### 6. 開啟瀏覽器

```
http://localhost:5173
```

## 常見問題

### Q: 看到 "SyntaxError: Unexpected token '?'" 錯誤

**原因**: Node.js 版本太舊

**解決方案**:
```bash
nvm use 20
npm run dev
```

### Q: 如何重新建置專案？

```bash
npm run build
```

### Q: 如何只啟動前端 (不需要後端)?

```bash
npx vite
```

### Q: 資料庫在哪裡？

SQLite 資料庫會自動建立在專案根目錄的 `database.sqlite`

## 專案結構

```
CCAdventure/
├── src/                    # 前端源碼
│   ├── components/         # React 組件
│   ├── data/              # 關卡資料、場景定義
│   ├── store/             # Zustand 狀態管理
│   └── ...
├── server.js              # Express 後端伺服器
├── public/                # 靜態資源 (Live2D 模型等)
├── .env.example           # 環境變數範例
└── package.json           # 依賴管理
```

## 開發指令

| 指令 | 說明 |
|------|------|
| `npm run dev` | 啟動開發伺服器 (前端 + 後端) |
| `npm run build` | 建置生產版本 |
| `npm run preview` | 預覽生產版本 |
| `npm run lint` | 執行 ESLint 檢查 |
| `npm run typecheck` | TypeScript 類型檢查 |

## 技術棧

- **前端**: React 19 + TypeScript + Vite 7 + Tailwind CSS
- **動畫**: Framer Motion + Live2D (Pixi.js)
- **狀態管理**: Zustand
- **後端**: Express.js
- **資料庫**: SQLite

---

**注意**: 這個專案不需要任何 API Key，所有教學內容都是模擬的 Claude Code 體驗！
