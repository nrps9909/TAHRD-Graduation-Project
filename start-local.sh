#!/bin/bash

echo "🚀 心語小鎮本地開發環境啟動器 (優化版)"
echo "======================================="
echo ""

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 函數：檢查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $2 未安裝${NC}"
        echo "   請安裝：$3"
        return 1
    fi
    return 0
}

# 函數：檢查 Python 套件
check_python_package() {
    if ! pip3 show $1 &> /dev/null; then
        echo -e "${YELLOW}📦 安裝 Python 套件: $1${NC}"
        pip3 install $1
    else
        echo -e "${GREEN}✓${NC} Python 套件 $1 已安裝"
    fi
}

# 函數：檢查 Node 套件
check_node_package() {
    if [ ! -d "$1/node_modules" ]; then
        echo -e "${YELLOW}📦 在 $1 安裝 Node 依賴...${NC}"
        cd $1 && npm install && cd ..
    else
        echo -e "${GREEN}✓${NC} $1 Node 依賴已安裝"
    fi
}

# ============ 系統依賴檢查 ============
echo -e "${BLUE}=== 檢查系統依賴 ===${NC}"
echo ""

# 檢查基本命令
all_deps_ok=true

echo "檢查基本工具..."
check_command "git" "Git" "sudo apt install git" || all_deps_ok=false
check_command "node" "Node.js" "請從 https://nodejs.org 安裝" || all_deps_ok=false
check_command "npm" "npm" "請安裝 Node.js" || all_deps_ok=false
check_command "python3" "Python 3" "sudo apt install python3" || all_deps_ok=false
check_command "pip3" "pip3" "sudo apt install python3-pip" || all_deps_ok=false

echo ""
echo "檢查資料庫服務..."
check_command "psql" "PostgreSQL" "sudo apt install postgresql postgresql-contrib" || all_deps_ok=false
check_command "redis-cli" "Redis" "sudo apt install redis-server" || all_deps_ok=false

echo ""
echo "檢查 Gemini CLI..."
if ! command -v gemini &> /dev/null; then
    echo -e "${YELLOW}⚠️ Gemini CLI 未安裝${NC}"
    echo "   請參考官方文檔安裝：https://github.com/google/generative-ai-python"
    echo "   或使用: pip install google-generativeai"
    # 不強制要求 Gemini CLI
else
    echo -e "${GREEN}✓${NC} Gemini CLI 已安裝"
fi

if [ "$all_deps_ok" = false ]; then
    echo ""
    echo -e "${RED}請先安裝缺少的依賴，然後重新執行此腳本${NC}"
    exit 1
fi

# ============ Python 依賴安裝 ============
echo ""
echo -e "${BLUE}=== 安裝 Python 依賴 ===${NC}"
echo ""

# 檢查並安裝 Python 套件
check_python_package "fastapi"
check_python_package "uvicorn"
check_python_package "python-dotenv"
check_python_package "google-generativeai"
check_python_package "pydantic"

# ============ 啟動資料庫服務 ============
echo ""
echo -e "${BLUE}=== 啟動資料庫服務 ===${NC}"
echo ""

# 啟動 PostgreSQL
echo "📊 啟動 PostgreSQL..."
sudo service postgresql start
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ PostgreSQL 已啟動${NC}"
else
    echo -e "${YELLOW}⚠️ PostgreSQL 啟動失敗，嘗試重啟...${NC}"
    sudo service postgresql restart
fi

# 啟動 Redis
echo "💾 啟動 Redis..."
sudo service redis-server start
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Redis 已啟動${NC}"
else
    echo -e "${YELLOW}⚠️ Redis 啟動失敗，嘗試重啟...${NC}"
    sudo service redis-server restart
fi

# ============ 環境變數配置 ============
echo ""
echo -e "${BLUE}=== 配置環境變數 ===${NC}"
echo ""

# 檢查並載入環境變數
if [ -z "$GEMINI_API_KEY" ]; then
    if [ -f .env ]; then
        source .env
    fi
    
    if [ -z "$GEMINI_API_KEY" ] || [ "$GEMINI_API_KEY" = "your-api-key" ]; then
        echo -e "${RED}❌ GEMINI_API_KEY 未設置或無效${NC}"
        echo "請在 .env 檔案中設置："
        echo "GEMINI_API_KEY=\"your-actual-api-key\""
        exit 1
    fi
fi
echo -e "${GREEN}✅ 環境變數已載入${NC}"

# 創建後端 .env 文件
echo "📝 配置後端環境..."
if [ -f backend/.env ] && grep -q "GEMINI_API_KEY=" backend/.env 2>/dev/null; then
    echo -e "${GREEN}✅ 後端環境已配置（保留現有設定）${NC}"
    # 添加新的優化設定（如果不存在）
    if ! grep -q "USE_OPTIMIZED_CLI" backend/.env; then
        echo "" >> backend/.env
        echo "# 優化設定" >> backend/.env
        echo "USE_OPTIMIZED_CLI=true" >> backend/.env
        echo "GEMINI_SERVICE_URL=http://localhost:8765" >> backend/.env
        echo "GEMINI_TIMEOUT=30000" >> backend/.env
        echo -e "${YELLOW}✓ 已添加優化設定${NC}"
    fi
else
    cat > backend/.env << EOF
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password123@localhost:5432/heart_whisper_town
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
GEMINI_API_KEY="${GEMINI_API_KEY}"
JWT_SECRET=${JWT_SECRET:-heart_whisper_town_secret_2024}
PORT=4000

# Gemini 服務設定
USE_GEMINI_CLI=true
USE_OPTIMIZED_CLI=true
GEMINI_SERVICE_URL=http://localhost:8765
GEMINI_TIMEOUT=30000

# 前端 URL
FRONTEND_URL=http://localhost:3000
EOF
    echo -e "${GREEN}✅ 後端環境配置完成${NC}"
fi

# 創建前端 .env 文件
echo "📝 配置前端環境..."
cat > frontend/.env << EOF
VITE_API_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000
VITE_GRAPHQL_URL=http://localhost:4000/graphql
EOF
echo -e "${GREEN}✅ 前端環境配置完成${NC}"

# ============ 資料庫初始化 ============
echo ""
echo -e "${BLUE}=== 初始化資料庫 ===${NC}"
echo ""

# 創建資料庫
echo "🗄️ 創建資料庫..."
sudo -u postgres psql -c "CREATE DATABASE heart_whisper_town;" 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 資料庫已創建${NC}"
else
    echo -e "${YELLOW}✓ 資料庫已存在${NC}"
fi

# 設定密碼
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'password123';" 2>/dev/null
echo -e "${GREEN}✅ 資料庫密碼已設定${NC}"

# 安裝 pgvector 擴充（如果需要）
echo "🔧 檢查 pgvector 擴充..."
sudo -u postgres psql -d heart_whisper_town -c "CREATE EXTENSION IF NOT EXISTS vector;" 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ pgvector 擴充已安裝${NC}"
else
    echo -e "${YELLOW}⚠️ pgvector 擴充安裝失敗（某些功能可能受限）${NC}"
fi

# 執行資料庫遷移（如果有）
if [ -f backend/prisma/migrations/add_shared_memory.sql ]; then
    echo "📊 執行共享記憶系統遷移..."
    sudo -u postgres psql -d heart_whisper_town < backend/prisma/migrations/add_shared_memory.sql 2>/dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 共享記憶系統已安裝${NC}"
    fi
fi

# ============ Node.js 依賴安裝 ============
echo ""
echo -e "${BLUE}=== 安裝 Node.js 依賴 ===${NC}"
echo ""

# 安裝後端依賴
check_node_package "backend"

# 特別檢查後端關鍵套件
cd backend
if ! npm list axios &> /dev/null; then
    echo -e "${YELLOW}📦 安裝 axios...${NC}"
    npm install axios
fi
if ! npm list ioredis &> /dev/null; then
    echo -e "${YELLOW}📦 安裝 ioredis...${NC}"
    npm install ioredis
fi
if ! npm list lru-cache &> /dev/null; then
    echo -e "${YELLOW}📦 安裝 lru-cache...${NC}"
    npm install lru-cache
fi

# Prisma 設定
echo "🔨 設定 Prisma..."
npx prisma generate
npx prisma db push --skip-generate
cd ..

# 安裝前端依賴
check_node_package "frontend"

# ============ 創建必要目錄 ============
echo ""
echo -e "${BLUE}=== 創建必要目錄 ===${NC}"
echo ""

mkdir -p backend/logs
mkdir -p backend/temp
mkdir -p frontend/public/assets
echo -e "${GREEN}✅ 目錄結構已建立${NC}"

# ============ 清理舊進程 ============
echo ""
echo -e "${BLUE}=== 清理舊進程 ===${NC}"
echo ""

# 檢查並清理占用端口的進程
for port in 8765 4000 3000; do
    PID=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$PID" ]; then
        echo -e "${YELLOW}清理端口 $port (PID: $PID)${NC}"
        kill -9 $PID 2>/dev/null
        sleep 1
    fi
done

# 清理其他可能的進程
pkill -f "gemini_server.py" 2>/dev/null || true
pkill -f "nodemon" 2>/dev/null || true
pkill -f "ts-node" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 2

echo -e "${GREEN}✅ 舊進程已清理${NC}"

# ============ 啟動服務 ============
echo ""
echo -e "${BLUE}=== 啟動服務 ===${NC}"
echo ""

# 啟動 Python Gemini 服務（優化版）
echo "🤖 啟動 Gemini CLI 服務..."
if [ -f backend/gemini_server.py ]; then
    cd backend
    nohup python3 gemini_server.py > logs/gemini_server.log 2>&1 &
    GEMINI_PID=$!
    cd ..
    
    # 等待服務啟動
    echo "等待 Gemini 服務就緒..."
    for i in {1..10}; do
        if curl -s http://localhost:8765/ > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Gemini CLI 服務已啟動 (PID: $GEMINI_PID)${NC}"
            
            # 顯示服務統計
            STATS=$(curl -s http://localhost:8765/stats 2>/dev/null)
            if [ ! -z "$STATS" ]; then
                echo -e "${BLUE}📊 服務狀態：${NC}"
                echo "$STATS" | python3 -m json.tool 2>/dev/null || echo "$STATS"
            fi
            break
        fi
        echo -n "."
        sleep 1
    done
    
    if [ $i -eq 10 ]; then
        echo -e "${YELLOW}⚠️ Gemini 服務啟動較慢，但會在背景繼續啟動${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ gemini_server.py 不存在，使用原始模式${NC}"
fi

# 啟動後端
cd backend
echo "🔧 啟動後端服務..."
npm run dev > logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# 等待後端啟動
echo "等待後端啟動..."
for i in {1..15}; do
    if curl -s http://localhost:4000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 後端服務已啟動 (PID: $BACKEND_PID)${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

# 啟動前端
cd frontend
echo "🎨 啟動前端服務..."
npm run dev > ../backend/logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# 等待前端啟動
echo "等待前端啟動..."
for i in {1..15}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 前端服務已啟動 (PID: $FRONTEND_PID)${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

# ============ 顯示服務狀態 ============
echo ""
echo -e "${GREEN}=======================================${NC}"
echo -e "${GREEN}✅ 心語小鎮本地環境已啟動！${NC}"
echo -e "${GREEN}=======================================${NC}"
echo ""
echo -e "${BLUE}🌐 服務端點：${NC}"
echo "   前端應用: http://localhost:3000"
echo "   後端 API: http://localhost:4000"
echo "   GraphQL: http://localhost:4000/graphql"
echo "   Gemini 服務: http://localhost:8765"
echo ""
echo -e "${BLUE}📊 監控與除錯：${NC}"
echo "   Gemini 日誌: tail -f backend/logs/gemini_server.log"
echo "   後端日誌: tail -f backend/logs/backend.log"
echo "   前端日誌: tail -f backend/logs/frontend.log"
echo ""
echo -e "${BLUE}📈 效能監控：${NC}"
echo "   Gemini 統計: curl http://localhost:8765/stats"
echo "   健康檢查: curl http://localhost:4000/health"
echo "   清空快取: curl -X POST http://localhost:8765/clear-cache"
echo ""
echo -e "${BLUE}🛑 停止服務：${NC}"
echo "   按 Ctrl+C 或執行: kill $GEMINI_PID $BACKEND_PID $FRONTEND_PID"
echo ""
echo -e "${GREEN}=======================================${NC}"

# 保存 PID 到檔案（方便後續管理）
echo "$GEMINI_PID" > .gemini.pid
echo "$BACKEND_PID" > .backend.pid
echo "$FRONTEND_PID" > .frontend.pid

# 設定信號處理
trap cleanup INT TERM

cleanup() {
    echo ""
    echo -e "${YELLOW}正在停止所有服務...${NC}"
    
    # 停止服務
    [ ! -z "$GEMINI_PID" ] && kill $GEMINI_PID 2>/dev/null && echo "停止 Gemini 服務"
    [ ! -z "$BACKEND_PID" ] && kill $BACKEND_PID 2>/dev/null && echo "停止後端服務"
    [ ! -z "$FRONTEND_PID" ] && kill $FRONTEND_PID 2>/dev/null && echo "停止前端服務"
    
    # 清理 PID 檔案
    rm -f .gemini.pid .backend.pid .frontend.pid
    
    echo -e "${GREEN}✅ 所有服務已停止${NC}"
    exit 0
}

# 顯示即時日誌（可選）
echo ""
echo -e "${YELLOW}提示：按 Enter 查看即時日誌，或按 Ctrl+C 停止所有服務${NC}"
read -n 1 -s key

if [ -z "$key" ]; then
    echo ""
    echo -e "${BLUE}=== 即時日誌 ===${NC}"
    echo "（按 Ctrl+C 停止）"
    echo ""
    tail -f backend/logs/gemini_server.log backend/logs/backend.log backend/logs/frontend.log
fi

# 等待直到收到終止信號
wait