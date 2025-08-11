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
    if [ -f .env ]; then
        source .env
    fi
    
    if [ -z "$GEMINI_API_KEY" ] || [ "$GEMINI_API_KEY" = "your-api-key" ]; then
        echo -e "${RED}❌ GEMINI_API_KEY 未設置${NC}"
        echo "請在 .env 檔案中設置："
        echo "GEMINI_API_KEY=\"your-actual-api-key\""
        exit 1
    fi
fi

# 安裝 Python 依賴（系統環境）
echo -e "${BLUE}=== 檢查 Python 依賴（系統環境）===${NC}"
export PIP_BREAK_SYSTEM_PACKAGES=1
sudo -H python3 -m pip install --quiet --upgrade --break-system-packages -r backend/requirements.txt 2>/dev/null || true
echo -e "${GREEN}✅ Python 依賴已就緒${NC}"

# 啟動資料庫
echo -e "${BLUE}=== 啟動資料庫服務 ===${NC}"
if sudo service postgresql start; then
  :
else
  echo -e "${YELLOW}⚠️ 無法啟動 PostgreSQL，WSL 可能未啟用 systemd。請改用 docker compose 啟動資料庫。${NC}"
fi

if sudo service redis-server start; then
  :
else
  echo -e "${YELLOW}⚠️ 無法啟動 Redis，WSL 可能未啟用 systemd。請改用 docker compose 啟動 Redis。${NC}"
fi
echo -e "${GREEN}✅ 資料庫服務處理完成${NC}"

# 清理舊日誌檔案並建立新的日誌目錄
echo -e "${BLUE}=== 清理舊日誌檔案 ===${NC}"
# 清除所有舊的日誌檔案
rm -rf backend/logs/* 2>/dev/null || true
# 確保日誌目錄存在
mkdir -p backend/logs
mkdir -p backend/logs/gemini-tracking
# 創建空的日誌檔案，避免寫入時出錯
touch backend/logs/mcp_server.log
touch backend/logs/backend.log
touch backend/logs/frontend.log
# 添加啟動時間戳記到每個日誌檔案
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
echo "=== 心語小鎮服務啟動時間: $TIMESTAMP ===" > backend/logs/mcp_server.log
echo "=== 心語小鎮服務啟動時間: $TIMESTAMP ===" > backend/logs/backend.log
echo "=== 心語小鎮服務啟動時間: $TIMESTAMP ===" > backend/logs/frontend.log
echo -e "${GREEN}✅ 日誌目錄已清理並重建${NC}"

# 清理舊進程
echo -e "${BLUE}=== 清理舊進程 ===${NC}"
pkill -f "mcp_server.py" 2>/dev/null || true
pkill -f "node.*backend" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 1

# 啟動 MCP 服務器
echo -e "${BLUE}=== 啟動 MCP 服務器 ===${NC}"
cd backend
nohup python3 mcp_server.py > logs/mcp_server.log 2>&1 &
MCP_PID=$!
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
            echo "$STATUS" | python3 -m json.tool
        fi
        break
    fi
    echo -n "."
    sleep 1
done

# 配置環境變數
export MCP_SERVICE_URL=http://localhost:8765
export NODE_ENV=development

# 創建後端 .env
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
echo "   ✅ Gemini CLI --all-files 載入所有記憶"
echo "   ✅ --checkpointing 保存對話狀態"
echo "   ✅ --include-directories 載入 NPC 記憶"
echo "   ✅ LRU 快取優化回應速度"
echo ""
echo -e "${BLUE}📈 效能監控：${NC}"
echo "   MCP 狀態: curl http://localhost:8765/status"
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