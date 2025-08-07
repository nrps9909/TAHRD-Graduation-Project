#!/bin/bash

echo "🛑 停止心語小鎮服務"
echo "===================="
echo ""

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 從 PID 檔案讀取進程 ID
if [ -f .gemini.pid ]; then
    GEMINI_PID=$(cat .gemini.pid)
    if kill -0 $GEMINI_PID 2>/dev/null; then
        echo -e "${YELLOW}停止 Gemini 服務 (PID: $GEMINI_PID)${NC}"
        kill $GEMINI_PID
    fi
    rm -f .gemini.pid
fi

if [ -f .backend.pid ]; then
    BACKEND_PID=$(cat .backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        echo -e "${YELLOW}停止後端服務 (PID: $BACKEND_PID)${NC}"
        kill $BACKEND_PID
    fi
    rm -f .backend.pid
fi

if [ -f .frontend.pid ]; then
    FRONTEND_PID=$(cat .frontend.pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        echo -e "${YELLOW}停止前端服務 (PID: $FRONTEND_PID)${NC}"
        kill $FRONTEND_PID
    fi
    rm -f .frontend.pid
fi

# 清理可能殘留的進程
echo ""
echo "清理殘留進程..."

# 根據端口清理
for port in 8765 4000 3000; do
    PID=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$PID" ]; then
        echo -e "${YELLOW}清理端口 $port (PID: $PID)${NC}"
        kill -9 $PID 2>/dev/null
    fi
done

# 根據進程名清理
pkill -f "gemini_server.py" 2>/dev/null && echo "清理 gemini_server.py"
pkill -f "nodemon" 2>/dev/null && echo "清理 nodemon"
pkill -f "ts-node" 2>/dev/null && echo "清理 ts-node"
pkill -f "vite" 2>/dev/null && echo "清理 vite"

echo ""
echo -e "${GREEN}✅ 所有服務已停止${NC}"
echo ""

# 可選：詢問是否停止資料庫服務
echo "是否也要停止資料庫服務？(y/n)"
read -n 1 -s response
echo ""

if [ "$response" = "y" ]; then
    echo -e "${YELLOW}停止 PostgreSQL...${NC}"
    sudo service postgresql stop
    echo -e "${YELLOW}停止 Redis...${NC}"
    sudo service redis-server stop
    echo -e "${GREEN}✅ 資料庫服務已停止${NC}"
fi