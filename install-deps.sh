#!/bin/bash
set -euo pipefail

echo "📦 心語小鎮依賴安裝腳本"
echo "======================"
echo ""

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============ 系統套件安裝 ============
echo -e "${BLUE}=== 安裝系統套件 ===${NC}"
echo ""

# 更新套件列表
echo "更新套件列表..."
sudo apt update

# 基本工具
echo ""
echo "安裝基本工具..."
sudo apt install -y curl wget git build-essential python3-dev gnupg ca-certificates

# Python 和 pip
echo ""
echo "安裝 Python..."
sudo apt install -y python3 python3-pip python3-venv

# PostgreSQL
echo ""
echo "安裝 PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib postgresql-client

# 安裝 pgvector 擴充（如果可用）
echo "安裝 pgvector..."
sudo apt install -y postgresql-14-pgvector 2>/dev/null || \
sudo apt install -y postgresql-15-pgvector 2>/dev/null || \
sudo apt install -y postgresql-16-pgvector 2>/dev/null || \
echo -e "${YELLOW}pgvector 需要手動安裝${NC}"

# Redis
echo ""
echo "安裝 Redis..."
sudo apt install -y redis-server

# Node.js (使用 nvm 官方安裝流程)
echo ""
echo "安裝 Node.js (nvm)..."
export NVM_DIR="$HOME/.nvm"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
fi
# 載入 nvm（同一個 shell 立即生效）
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
fi
# 安裝並使用 Node 22（可自行調整為 LTS）
nvm install 22
nvm use 22
nvm alias default 22
echo -e "${GREEN}✓ Node.js 已安裝：$(node -v) / npm：$(npm -v)${NC}"

# 使用 nvm 的 npm 作為全域安裝工具
NPM_BIN="$(command -v npm)"

# ============ Python 套件安裝（系統環境 + requirements） ============
echo ""
echo -e "${BLUE}=== 安裝 Python 套件（系統環境）===${NC}"
echo ""

# 啟用覆蓋 PEP 668（Ubuntu 24.04）
export PIP_BREAK_SYSTEM_PACKAGES=1

echo "升級 pip..."
sudo -H python3 -m pip install --upgrade pip --break-system-packages --ignore-installed || true

echo "從 backend/requirements.txt 安裝套件（系統環境）..."
sudo -H python3 -m pip install --break-system-packages --upgrade --ignore-installed -r backend/requirements.txt || true

# ============ Gemini CLI 安裝（npm） ============
echo ""
echo -e "${BLUE}=== 安裝 Gemini CLI ===${NC}"
echo ""

if ! command -v gemini &> /dev/null; then
    echo "使用 npm 安裝 Gemini CLI (@google/gemini-cli)..."
    "$NPM_BIN" install -g @google/gemini-cli || {
        echo -e "${YELLOW}⚠️ npm 安裝失敗，請確認 npm 已安裝且 PATH 正確${NC}";
    }
else
    echo -e "${GREEN}✓ Gemini CLI 已安裝${NC}"
fi

# ============ Node.js 全域套件 ============
echo ""
echo -e "${BLUE}=== 安裝 Node.js 全域套件 ===${NC}"
echo ""

# TypeScript
echo "安裝 TypeScript..."
"$NPM_BIN" install -g typescript || true

# ts-node
echo "安裝 ts-node..."
"$NPM_BIN" install -g ts-node || true

# nodemon
echo "安裝 nodemon..."
"$NPM_BIN" install -g nodemon || true

# Prisma CLI
echo "安裝 Prisma CLI..."
"$NPM_BIN" install -g prisma || true

# ============ 專案依賴安裝 ============
echo ""
echo -e "${BLUE}=== 安裝專案依賴 ===${NC}"
echo ""

# 後端依賴
if [ -d "backend" ]; then
    echo "安裝後端依賴..."
    cd backend
    npm install
    
    # 額外的優化套件
    npm install --save axios ioredis lru-cache
    npm install --save-dev @types/node @types/express
    
    cd ..
    echo -e "${GREEN}✅ 後端依賴安裝完成${NC}"
else
    echo -e "${YELLOW}⚠️ backend 目錄不存在${NC}"
fi

# 前端依賴
if [ -d "frontend" ]; then
    echo "安裝前端依賴..."
    cd frontend
    npm install
    cd ..
    echo -e "${GREEN}✅ 前端依賴安裝完成${NC}"
else
    echo -e "${YELLOW}⚠️ frontend 目錄不存在${NC}"
fi

# ============ 設定資料庫 ============
echo ""
echo -e "${BLUE}=== 設定資料庫 ===${NC}"
echo ""

echo "啟動 PostgreSQL..."
PG_STARTED=0
if sudo service postgresql start; then
    PG_STARTED=1
else
    # WSL 無 systemd 時，改用 pg_ctlcluster 啟動
    if command -v pg_lsclusters >/dev/null 2>&1; then
        CL_INFO=$(pg_lsclusters 2>/dev/null | awk 'NR==2{print $1" "$2}')
        if [ -n "$CL_INFO" ]; then
            PG_VER=$(echo "$CL_INFO" | awk '{print $1}')
            PG_NAME=$(echo "$CL_INFO" | awk '{print $2}')
            sudo pg_ctlcluster "$PG_VER" "$PG_NAME" start && PG_STARTED=1 || true
        fi
    fi
fi
if [ "$PG_STARTED" -eq 1 ]; then
    echo "設定資料庫用戶/資料庫..."
    # 建立資料庫（存在則略過）
    if ! sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='heart_whisper_town'" | grep -q 1; then
        sudo -u postgres createdb heart_whisper_town || true
    fi
    # 設定密碼
    sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'password123';" || true
    # 安裝 pgvector 擴充
    echo "設定 pgvector 擴充..."
    sudo -u postgres psql -d heart_whisper_town -c "CREATE EXTENSION IF NOT EXISTS vector;" 2>/dev/null || true
    # 健康檢查（可選）
    if command -v pg_isready &> /dev/null; then
        sudo -u postgres pg_isready -d heart_whisper_town || true
    fi
else
    echo -e "${YELLOW}⚠️ 無法啟動 PostgreSQL。若在 WSL 無 systemd，請改用 docker compose。${NC}"
fi

echo -e "${GREEN}✅ 資料庫設定完成${NC}"

# ============ Prisma 同步與種子資料 ============
if [ -d "backend" ]; then
  echo ""
  echo -e "${BLUE}=== Prisma 資料庫同步與種子資料 ===${NC}"
  export DATABASE_URL=postgresql://postgres:password123@localhost:5432/heart_whisper_town
  cd backend
  npx prisma generate || true
  npx prisma db push || true
  npm run db:seed || true
  cd ..
  echo -e "${GREEN}✅ Prisma 已同步並嘗試寫入初始資料${NC}"
fi

# ============ 創建目錄結構 ============
echo ""
echo -e "${BLUE}=== 創建目錄結構 ===${NC}"
echo ""

mkdir -p backend/logs
mkdir -p backend/temp
mkdir -p backend/dist
mkdir -p frontend/dist
mkdir -p frontend/public/assets

echo -e "${GREEN}✅ 目錄結構已建立${NC}"

# ============ 環境變數檢查 ============
echo ""
echo -e "${BLUE}=== 環境變數檢查 ===${NC}"
echo ""

if [ ! -f .env ]; then
    echo -e "${YELLOW}創建 .env 檔案範本...${NC}"
    cat > .env.example << EOF
# Gemini API Key (必須)
GEMINI_API_KEY="your-api-key-here"

# JWT Secret
JWT_SECRET=heart_whisper_town_secret_2024

# Database
DATABASE_URL=postgresql://postgres:password123@localhost:5432/heart_whisper_town

# Redis
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# Ports
PORT=4000
FRONTEND_PORT=3000

# Gemini 服務設定
USE_GEMINI_CLI=true
USE_OPTIMIZED_CLI=true
GEMINI_SERVICE_URL=http://localhost:8765
GEMINI_TIMEOUT=30000
EOF
    echo -e "${YELLOW}請複製 .env.example 為 .env 並填入您的 API Key${NC}"
    echo "cp .env.example .env"
    echo "然後編輯 .env 檔案"
else
    echo -e "${GREEN}✓ .env 檔案已存在${NC}"
fi

# ============ 完成 ============
echo ""
echo -e "${GREEN}=======================================${NC}"
echo -e "${GREEN}✅ 依賴安裝完成！${NC}"
echo -e "${GREEN}=======================================${NC}"
echo ""
echo "下一步："
echo "1. 設定 GEMINI_API_KEY："
echo "   編輯 .env 檔案並填入您的 API Key"
echo ""
echo "2. 啟動服務："
echo "   ./start-mcp.sh"
echo ""
echo "3. 停止服務："
echo "   ./stop-mcp.sh"
echo ""
echo -e "${BLUE}提示：${NC}"
echo "- 如果遇到權限問題，請使用 sudo"
echo "- 如果套件安裝失敗，請檢查網路連線"
echo "- 詳細文檔請參考 README.md"
echo ""