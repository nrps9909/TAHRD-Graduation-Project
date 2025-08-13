#!/bin/bash

echo "🚀 心語小鎮 MCP 優化模式啟動器"
echo "===================================="
echo ""

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 檢查環境變數
if [ -z "$GEMINI_API_KEY" ]; then
    # 優先從 backend/.env 讀取
    if [ -f backend/.env ]; then
        export $(grep -v '^#' backend/.env | xargs)
    elif [ -f .env ]; then
        source .env
    fi
    
    if [ -z "$GEMINI_API_KEY" ] || [ "$GEMINI_API_KEY" = "" ] || [ "$GEMINI_API_KEY" = "your-api-key" ]; then
        echo -e "${YELLOW}⚠️ GEMINI_API_KEY 未設置，MCP 生成功能可能無法使用。${NC}"
        echo -e "${YELLOW}   請在 backend/.env 設置你的 API KEY${NC}"
    else
        echo -e "${GREEN}✅ GEMINI_API_KEY 已載入${NC}"
    fi
fi

# 清理舊日誌檔案
echo -e "${BLUE}=== 清理舊日誌檔案 ===${NC}"
rm -rf backend/logs/*.log 2>/dev/null || true
mkdir -p backend/logs
mkdir -p backend/logs/gemini-tracking
touch backend/logs/mcp_server.log
touch backend/logs/backend.log
touch backend/logs/frontend.log
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
echo "=== 心語小鎮服務啟動時間: $TIMESTAMP ===" > backend/logs/mcp_server.log
echo "=== 心語小鎮服務啟動時間: $TIMESTAMP ===" > backend/logs/backend.log
echo "=== 心語小鎮服務啟動時間: $TIMESTAMP ===" > backend/logs/frontend.log
echo -e "${GREEN}✅ 日誌目錄已清理並重建${NC}"

# 清理舊進程
echo -e "${BLUE}=== 清理舊進程 ===${NC}"
pkill -f "mcp_server" 2>/dev/null || true
pkill -f "node.*backend" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 1

# 啟動 Redis（如果需要）
echo -e "${BLUE}=== 檢查 Redis 服務 ===${NC}"
if ! pgrep -x redis-server > /dev/null; then
    if command -v redis-server >/dev/null 2>&1; then
        redis-server --daemonize yes 2>/dev/null || true
        echo -e "${GREEN}✅ Redis 服務已啟動${NC}"
    else
        echo -e "${YELLOW}⚠️ Redis 未安裝，某些功能可能受限${NC}"
    fi
else
    echo -e "${GREEN}✅ Redis 服務已在運行${NC}"
fi

# 啟動 MCP 服務器（使用優化版）
echo -e "${BLUE}=== 啟動 MCP 服務器 ===${NC}"
cd backend
if command -v gemini >/dev/null 2>&1; then
  # 使用優化版的 MCP 服務器，不會覆蓋 gemini.py
  nohup python3 mcp_server_optimized.py > logs/mcp_server.log 2>&1 &
  MCP_PID=$!
  echo -e "${GREEN}✅ 使用優化版 MCP 服務器${NC}"
else
  echo -e "${YELLOW}⚠️ 未偵測到 gemini CLI，請執行：npm i -g @google/gemini-cli${NC}"
  nohup python3 mcp_server_optimized.py > logs/mcp_server.log 2>&1 &
  MCP_PID=$!
fi
cd ..

# 等待 MCP 服務就緒
echo "等待 MCP 服務啟動..."
for i in {1..10}; do
    if curl -s http://localhost:8765/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ MCP 服務已啟動 (PID: $MCP_PID)${NC}"
        
        # 顯示服務狀態
        STATUS=$(curl -s http://localhost:8765/status 2>/dev/null)
        if [ ! -z "$STATUS" ]; then
            echo -e "${BLUE}📊 MCP 服務狀態：${NC}"
            echo "$STATUS" | python3 -m json.tool 2>/dev/null || echo "$STATUS"
        fi
        break
    fi
    echo -n "."
    sleep 1
done

# 更新 backend/.env（只更新必要的變數，不覆蓋 API KEY）
echo -e "${BLUE}=== 更新環境變數 ===${NC}"
if [ ! -f backend/.env ]; then
    # 只有在檔案不存在時才創建
    cat > backend/.env << EOF
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password123@localhost:5432/heart_whisper_town
REDIS_URL=redis://localhost:6379
GEMINI_API_KEY="${GEMINI_API_KEY}"
JWT_SECRET=heart_whisper_town_secret_2024
PORT=4000
MCP_SERVICE_URL=http://localhost:8765
FRONTEND_URL=http://localhost:3000
EOF
    echo -e "${GREEN}✅ 創建 backend/.env${NC}"
else
    # 檔案存在時，只更新 MCP_SERVICE_URL（如果需要）
    if ! grep -q "MCP_SERVICE_URL" backend/.env; then
        echo "MCP_SERVICE_URL=http://localhost:8765" >> backend/.env
        echo -e "${GREEN}✅ 添加 MCP_SERVICE_URL 到 backend/.env${NC}"
    fi
    echo -e "${GREEN}✅ 保留現有 backend/.env 設定（包括 API KEY）${NC}"
fi

# 設置環境變數
export MCP_SERVICE_URL=http://localhost:8765
export NODE_ENV=development

# 啟動後端
echo -e "${BLUE}=== 啟動後端服務 ===${NC}"
cd backend
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
echo -e "${BLUE}=== 啟動前端服務 ===${NC}"
cd frontend
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

echo ""
echo -e "${GREEN}=======================================${NC}"
echo -e "${GREEN}✅ 心語小鎮 MCP 模式已啟動！${NC}"
echo -e "${GREEN}=======================================${NC}"
echo ""
echo -e "${BLUE}🌐 服務端點：${NC}"
echo "   前端應用: http://localhost:3000"
echo "   後端 API: http://localhost:4000"
echo "   GraphQL: http://localhost:4000/graphql"
echo "   MCP 服務: http://localhost:8765"
echo ""
echo -e "${BLUE}📊 監控與除錯：${NC}"
echo "   MCP 日誌: tail -f backend/logs/mcp_server.log"
echo "   後端日誌: tail -f backend/logs/backend.log"
echo "   前端日誌: tail -f backend/logs/frontend.log"
echo ""
echo -e "${BLUE}🚀 MCP 優化特性：${NC}"
echo "   ✅ Token Caching 加速回應"
echo "   ✅ Redis 快取優化"
echo "   ✅ /tmp 目錄高速 I/O"
echo "   ✅ 智能記憶管理"
echo ""
echo -e "${BLUE}📈 效能監控：${NC}"
echo "   MCP 狀態: curl http://localhost:8765/status | jq"
echo "   清空快取: curl -X POST http://localhost:8765/cache/clear"
echo ""
echo -e "${BLUE}🛑 停止服務：${NC}"
echo "   ./stop-mcp.sh"
echo "   或按 Ctrl+C"
echo ""

# 保存 PID
echo "$MCP_PID" > .mcp.pid
echo "$BACKEND_PID" > .backend.pid
echo "$FRONTEND_PID" > .frontend.pid

# 信號處理
trap 'echo ""; echo "停止服務..."; kill $MCP_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit' INT TERM

# 保持運行
wait