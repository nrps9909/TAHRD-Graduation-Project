#!/bin/bash

echo "🛑 停止心語小鎮 MCP 服務..."

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 從 PID 檔案讀取進程 ID
if [ -f .mcp.pid ]; then
    MCP_PID=$(cat .mcp.pid)
    kill $MCP_PID 2>/dev/null && echo -e "${GREEN}✅ MCP 服務已停止${NC}"
    rm .mcp.pid
fi

if [ -f .backend.pid ]; then
    BACKEND_PID=$(cat .backend.pid)
    kill $BACKEND_PID 2>/dev/null && echo -e "${GREEN}✅ 後端服務已停止${NC}"
    rm .backend.pid
fi

if [ -f .frontend.pid ]; then
    FRONTEND_PID=$(cat .frontend.pid)
    kill $FRONTEND_PID 2>/dev/null && echo -e "${GREEN}✅ 前端服務已停止${NC}"
    rm .frontend.pid
fi

# 確保清理所有相關進程
pkill -f "mcp_server.py" 2>/dev/null
pkill -f "node.*backend" 2>/dev/null
pkill -f "vite" 2>/dev/null

echo -e "${GREEN}✅ 所有服務已停止${NC}"