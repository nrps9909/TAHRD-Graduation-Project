#!/bin/bash

echo "🚀 心語小鎮 - 知識管理系統啟動器"
echo "====================================="
echo ""

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 載入環境變數
if [ -f .env ]; then
    echo -e "${BLUE}=== 載入環境變數 ===${NC}"
    set -a
    source .env
    set +a
    echo -e "${GREEN}✅ 已從根目錄 .env 載入環境變數${NC}"
else
    echo -e "${RED}❌ 找不到 .env 檔案${NC}"
    echo -e "${YELLOW}   請複製 .env.example 為 .env 並填入實際值${NC}"
    echo -e "${YELLOW}   指令: cp .env.example .env${NC}"
    exit 1
fi

# 檢查必要的環境變數
if [ -z "$GEMINI_API_KEY" ] || [ "$GEMINI_API_KEY" = "your-api-key" ] || [ "$GEMINI_API_KEY" = "YOUR_GEMINI_API_KEY_HERE" ]; then
    echo -e "${YELLOW}⚠️  GEMINI_API_KEY 未設置或使用預設值${NC}"
    echo -e "${YELLOW}   AI 功能可能無法使用，請在 .env 中設置實際的 API Key${NC}"
fi

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL 未設置${NC}"
    echo -e "${YELLOW}   請在根目錄 .env 中設置 MongoDB Atlas 連接字符串${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 環境變數檢查完成${NC}"

# 清理舊進程
echo -e "${BLUE}=== 清理舊進程 ===${NC}"
pkill -f "node.*backend" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 1

# 清理並創建日誌目錄
echo -e "${BLUE}=== 準備日誌目錄 ===${NC}"
rm -rf backend/logs/* 2>/dev/null || true
mkdir -p backend/logs/gemini-tracking
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
echo "=== 心語小鎮服務啟動時間: $TIMESTAMP ===" > backend/logs/backend.log
echo "=== 心語小鎮服務啟動時間: $TIMESTAMP ===" > backend/logs/frontend.log
echo -e "${GREEN}✅ 日誌目錄已準備${NC}"

# 檢查依賴
echo -e "${BLUE}=== 檢查依賴 ===${NC}"
cd backend
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  後端依賴未安裝，正在安裝...${NC}"
    npm install
fi
cd ..

cd frontend
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  前端依賴未安裝，正在安裝...${NC}"
    npm install
fi
cd ..
echo -e "${GREEN}✅ 依賴檢查完成${NC}"

# 啟動後端
echo -e "${BLUE}=== 啟動後端服務 ===${NC}"
cd backend
npm run dev > logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# 等待後端啟動
echo "等待後端啟動..."
for i in {1..20}; do
    if curl -s http://localhost:4000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 後端服務已啟動 (PID: $BACKEND_PID)${NC}"

        # 顯示健康狀態
        HEALTH=$(curl -s http://localhost:4000/health 2>/dev/null)
        if [ ! -z "$HEALTH" ]; then
            echo -e "${BLUE}📊 後端狀態：${NC}"
            echo "$HEALTH" | python3 -m json.tool 2>/dev/null || echo "$HEALTH"
        fi
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
for i in {1..20}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 前端服務已啟動 (PID: $FRONTEND_PID)${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

echo ""
echo -e "${GREEN}=======================================${NC}"
echo -e "${GREEN}✅ 心語小鎮 - 知識管理系統已啟動！${NC}"
echo -e "${GREEN}=======================================${NC}"
echo ""
echo -e "${BLUE}🌐 服務端點：${NC}"
echo "   🏝️  島嶼視圖:    http://localhost:3000/"
echo "   📚 資料庫視圖:  http://localhost:3000/database"
echo "   🔌 GraphQL API: http://localhost:4000/graphql"
echo "   🏥 健康檢查:    http://localhost:4000/health"
echo ""
echo -e "${BLUE}📊 系統架構：${NC}"
echo "   ✅ MongoDB Atlas (雲端資料庫)"
echo "   ✅ 8 個 AI 助手 (已載入快取)"
echo "   ✅ GraphQL API (Apollo Server)"
echo "   ✅ React + Vite 前端"
echo ""
echo -e "${BLUE}📈 監控與除錯：${NC}"
echo "   後端日誌: tail -f backend/logs/backend.log"
echo "   前端日誌: tail -f backend/logs/frontend.log"
echo "   Gemini 追蹤: ls backend/logs/gemini-tracking/"
echo ""
echo -e "${BLUE}🛑 停止服務：${NC}"
echo "   ./stop-knowledge-system.sh"
echo "   或按 Ctrl+C"
echo ""

# 保存 PID
echo "$BACKEND_PID" > .backend.pid
echo "$FRONTEND_PID" > .frontend.pid

# 信號處理
trap 'echo ""; echo "停止服務..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit' INT TERM

# 保持運行
wait
