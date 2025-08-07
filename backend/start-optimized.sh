#!/bin/bash

# 心語小鎮優化啟動腳本
# 啟動 Python Gemini 服務和 Node.js 後端

echo "🚀 啟動心語小鎮優化版服務..."

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 檢查 Python 依賴
echo "📦 檢查 Python 依賴..."
pip3 show fastapi > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}安裝 Python 依賴...${NC}"
    pip3 install fastapi uvicorn python-dotenv
fi

# 檢查 Node.js 依賴
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}安裝 Node.js 依賴...${NC}"
    npm install
fi

# 檢查是否已有 Gemini 服務在運行
GEMINI_PID=$(lsof -ti:8765 2>/dev/null)
if [ ! -z "$GEMINI_PID" ]; then
    echo -e "${YELLOW}發現已運行的 Gemini 服務 (PID: $GEMINI_PID)${NC}"
    echo "是否要重啟服務？(y/n)"
    read -r response
    if [ "$response" = "y" ]; then
        kill $GEMINI_PID
        sleep 2
    fi
fi

# 啟動 Python Gemini 服務（背景執行）
echo -e "${GREEN}啟動 Gemini CLI 服務...${NC}"
nohup python3 backend/gemini_server.py > logs/gemini_server.log 2>&1 &
GEMINI_PID=$!
echo "Gemini 服務 PID: $GEMINI_PID"

# 等待服務啟動
echo "等待 Gemini 服務就緒..."
for i in {1..10}; do
    curl -s http://localhost:8765/ > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Gemini 服務已就緒${NC}"
        break
    fi
    sleep 1
done

# 檢查資料庫
echo "檢查 PostgreSQL..."
pg_isready > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ PostgreSQL 未運行${NC}"
    echo "請先啟動 PostgreSQL: sudo service postgresql start"
    exit 1
fi

# 檢查 Redis
echo "檢查 Redis..."
redis-cli ping > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️ Redis 未運行，某些功能可能受影響${NC}"
fi

# 編譯 TypeScript
echo "編譯 TypeScript..."
cd backend
npx tsc

# 啟動 Node.js 服務
echo -e "${GREEN}啟動 Node.js 後端...${NC}"
export USE_GEMINI_CLI=true
export GEMINI_SERVICE_URL=http://localhost:8765
node dist/src/index.js &
NODE_PID=$!

echo ""
echo "========================================="
echo -e "${GREEN}✅ 心語小鎮優化版已啟動！${NC}"
echo "========================================="
echo "📊 服務狀態："
echo "  - Gemini CLI 服務: http://localhost:8765"
echo "  - GraphQL API: http://localhost:4000/graphql"
echo "  - 前端應用: http://localhost:3000"
echo ""
echo "📝 監控日誌："
echo "  - Gemini 服務: tail -f logs/gemini_server.log"
echo "  - Node.js 後端: tail -f logs/app.log"
echo ""
echo "🛑 停止服務："
echo "  - kill $GEMINI_PID $NODE_PID"
echo ""
echo "📈 效能監控："
echo "  - curl http://localhost:8765/stats"
echo "  - curl http://localhost:4000/health"
echo "========================================="

# 保存 PID 到檔案
echo "$GEMINI_PID" > .gemini.pid
echo "$NODE_PID" > .node.pid

# 等待並顯示日誌
tail -f logs/gemini_server.log logs/app.log