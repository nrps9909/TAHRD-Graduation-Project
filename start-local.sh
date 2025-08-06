#!/bin/bash

echo "🚀 心語小鎮本地開發環境啟動器"
echo "=============================="
echo ""

# 檢查並啟動 PostgreSQL
echo "📊 檢查 PostgreSQL..."
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL 未安裝，請先安裝：sudo apt install postgresql postgresql-contrib"
    exit 1
fi
sudo service postgresql start
echo "✅ PostgreSQL 已啟動"

# 檢查並啟動 Redis
echo "💾 檢查 Redis..."
if ! command -v redis-cli &> /dev/null; then
    echo "❌ Redis 未安裝，請先安裝：sudo apt install redis-server"
    exit 1
fi
sudo service redis-server start
echo "✅ Redis 已啟動"

# 檢查環境變數
echo ""
echo "🔑 檢查環境變數..."
if [ -z "$GEMINI_API_KEY" ]; then
    if [ -f .env ]; then
        source .env
    fi
    
    if [ -z "$GEMINI_API_KEY" ]; then
        echo "❌ GEMINI_API_KEY 未設置"
        echo "請先設置：export GEMINI_API_KEY='your-api-key'"
        exit 1
    fi
fi
echo "✅ 環境變數已設置"

# 創建後端 .env 文件（如果不存在或需要更新）
echo ""
echo "📝 配置後端環境..."

# 如果 backend/.env 已存在且包含有效的 GEMINI_API_KEY，則不覆蓋
if [ -f backend/.env ] && grep -q "GEMINI_API_KEY=AIza" backend/.env 2>/dev/null; then
    echo "✅ 後端環境已配置（保留現有設定）"
else
    # 確保 GEMINI_API_KEY 有正確的值
    if [ -z "$GEMINI_API_KEY" ] || [ "$GEMINI_API_KEY" = "your-api-key" ]; then
        # 從根目錄 .env 文件提取 API key
        GEMINI_API_KEY=$(grep "^GEMINI_API_KEY=" .env 2>/dev/null | tail -1 | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    fi
    
    cat > backend/.env << EOF
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password123@localhost:5433/heart_whisper_town
REDIS_URL=redis://localhost:6379
GEMINI_API_KEY=${GEMINI_API_KEY}
JWT_SECRET=${JWT_SECRET:-heart_whisper_town_secret_2024}
PORT=4000
USE_GEMINI_CLI=true
EOF
    echo "✅ 後端環境配置完成"
fi

# 創建前端 .env 文件
echo "📝 配置前端環境..."
cat > frontend/.env << EOF
VITE_API_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000
EOF
echo "✅ 前端環境配置完成"

# 初始化資料庫
echo ""
echo "🗄️ 初始化資料庫..."
sudo -u postgres psql -c "CREATE DATABASE heart_whisper_town;" 2>/dev/null || echo "資料庫已存在"
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'password123';" 2>/dev/null
echo "✅ 資料庫準備完成"

# 安裝依賴
echo ""
echo "📦 安裝依賴..."
cd backend && npm install
npx prisma generate
npx prisma db push
cd ..

cd frontend && npm install
cd ..

# 清理可能存在的進程
echo ""
echo "🧹 清理舊進程..."
pkill -f "nodemon" 2>/dev/null || true
pkill -f "ts-node" 2>/dev/null || true
sleep 2

# 啟動服務
echo ""
echo "🎮 啟動服務..."
echo "=============================="

# 啟動後端
cd backend
echo "啟動後端服務..."
npm run dev &
BACKEND_PID=$!
cd ..

# 等待後端啟動
echo "等待後端啟動..."
sleep 5

# 啟動前端
cd frontend
echo "啟動前端服務..."
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "=============================="
echo "✅ 本地環境已啟動！"
echo ""
echo "🌐 前端: http://localhost:3000"
echo "🔧 後端: http://localhost:4000"
echo "📊 GraphQL: http://localhost:4000/graphql"
echo ""
echo "按 Ctrl+C 停止所有服務"
echo "=============================="

# 等待用戶按 Ctrl+C
trap "echo '正在停止服務...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait