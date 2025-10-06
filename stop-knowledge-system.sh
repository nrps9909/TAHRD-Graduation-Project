#!/bin/bash

echo "🛑 停止心語小鎮 - 知識管理系統"
echo "================================"

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# 停止進程
echo -e "${BLUE}停止服務...${NC}"

# 從 PID 文件停止
if [ -f .backend.pid ]; then
    BACKEND_PID=$(cat .backend.pid)
    kill $BACKEND_PID 2>/dev/null && echo "✅ 後端服務已停止 (PID: $BACKEND_PID)"
    rm .backend.pid
fi

if [ -f .frontend.pid ]; then
    FRONTEND_PID=$(cat .frontend.pid)
    kill $FRONTEND_PID 2>/dev/null && echo "✅ 前端服務已停止 (PID: $FRONTEND_PID)"
    rm .frontend.pid
fi

# 額外清理
pkill -f "node.*backend" 2>/dev/null && echo "✅ 清理後端進程"
pkill -f "vite" 2>/dev/null && echo "✅ 清理前端進程"

echo ""
echo -e "${GREEN}✅ 所有服務已停止${NC}"
