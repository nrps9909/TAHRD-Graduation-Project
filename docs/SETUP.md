# 🚀 Git & Claude Code 互動教學平台 - 安裝指南

## 📋 系統需求

- Node.js 18.0 或以上版本
- npm 或 yarn 套件管理器
- 現代瀏覽器 (Chrome, Firefox, Safari, Edge)
- 建議使用 WSL2 (Windows 用戶)

## 🪟 Windows (WSL) 安裝步驟

### 1. 安裝 WSL2

在 PowerShell (以系統管理員身份執行) 中執行：

```powershell
# 安裝 WSL 和 Ubuntu
wsl --install

# 設定 WSL2 為預設版本
wsl --set-default-version 2
```

### 2. 在 WSL Ubuntu 中設置開發環境

```bash
# 更新套件
sudo apt update && sudo apt upgrade -y

# 安裝必要工具
sudo apt install build-essential curl git -y

# 安裝 Node.js (使用 nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install --lts
nvm use --lts
```

### 3. 克隆專案並啟動

```bash
# 克隆專案 (替換為你的專案路徑)
cd ~/projects
git clone <your-repository-url>
cd ccadventure-game

# 使用啟動腳本
./start.sh
```

## 🐧 Linux / macOS 安裝步驟

### 1. 安裝 Node.js

**使用 nvm (推薦):**

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc  # 或 ~/.zshrc for macOS
nvm install --lts
nvm use --lts
```

### 2. 克隆並啟動專案

```bash
# 克隆專案
git clone <your-repository-url>
cd ccadventure-game

# 使用啟動腳本
./start.sh
```

## 💻 手動啟動

如果啟動腳本無法使用，可以手動執行：

```bash
# 安裝相依套件
npm install

# 啟動開發伺服器
npm run dev

# 或使用 yarn
yarn install
yarn dev
```

## 🛠️ 可用的 npm 指令

- `npm run dev` - 啟動開發伺服器
- `npm run build` - 建置生產版本
- `npm run preview` - 預覽生產版本
- `npm run lint` - 執行程式碼檢查

## 🌐 瀏覽器訪問

應用程式啟動後，開啟瀏覽器訪問：

- **本地開發**: http://localhost:5173/
- **網路訪問**: 查看終端輸出的 Network 地址

## ❓ 常見問題

### WSL 無法訪問 localhost

在 Windows 瀏覽器中訪問 WSL 應用：

1. 使用 `localhost:5173` (WSL2 自動轉發)
2. 或查看 WSL IP: `wsl hostname -I`

### 權限問題

```bash
# 修復權限
chmod +x start.sh
sudo chown -R $(whoami) node_modules
```

### 連接埠被佔用

```bash
# 查看佔用連接埠的程序
lsof -i :5173  # Linux/macOS
netstat -ano | findstr :5173  # Windows

# 更改連接埠 (在 vite.config.ts 中)
server: {
  port: 3000
}
```

## 📁 專案結構

```
ccadventure-game/
├── src/
│   ├── components/      # React 元件
│   │   ├── GitTerminal.tsx    # Git 終端模擬器
│   │   ├── WSLSetupGuide.tsx  # WSL 設置指南
│   │   └── ...
│   ├── data/            # 教學內容資料
│   │   └── gitScenes.ts       # Git 教學場景
│   ├── store/           # 狀態管理
│   └── App.tsx          # 主應用程式
├── public/              # 靜態資源
├── start.sh            # Linux/macOS 啟動腳本
├── start.bat           # Windows 啟動腳本
└── package.json        # 專案配置
```

## 🆘 取得協助

如遇到問題，請檢查：

1. Node.js 版本是否正確 (`node --version`)
2. 是否在專案根目錄
3. 相依套件是否已安裝 (`npm list`)
4. 查看錯誤訊息並參考上述解決方案

## 📝 授權

MIT License - 可自由用於教育和商業用途
