#!/bin/bash

echo "🎯 心靈羈絆系統健康檢查"
echo "========================"

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 檢查函數
check_service() {
    local service_name=$1
    local port=$2
    local endpoint=$3

    if curl -s "http://localhost:${port}${endpoint}" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ ${service_name} (Port ${port})${NC}"
        return 0
    else
        echo -e "${RED}❌ ${service_name} (Port ${port})${NC}"
        return 1
    fi
}

check_file() {
    local file_path=$1
    local description=$2

    if [ -f "$file_path" ]; then
        echo -e "${GREEN}✅ ${description}${NC}"
        return 0
    else
        echo -e "${RED}❌ ${description} - 檔案不存在${NC}"
        return 1
    fi
}

echo ""
echo -e "${BLUE}=== 檢查核心服務 ===${NC}"
check_service "前端服務" 3000 "/"
check_service "後端 API" 4000 "/health"
check_service "GraphQL" 4000 "/graphql"
check_service "MCP 服務" 8765 "/health"

echo ""
echo -e "${BLUE}=== 檢查心靈羈絆系統檔案 ===${NC}"
check_file "backend/src/services/soulBondService.ts" "羈絆等級服務"
check_file "backend/src/services/emotionalResonanceService.ts" "情緒共鳴服務"
check_file "backend/src/services/dailyQuestService.ts" "每日任務服務"
check_file "backend/src/services/townReputationService.ts" "小鎮聲望服務"
check_file "backend/src/services/achievementService.ts" "成就系統服務"
check_file "backend/src/services/offlineProgressService.ts" "離線進展服務"
check_file "backend/src/services/seasonalEventService.ts" "季節活動服務"
check_file "backend/src/services/geminiServiceMCPWithSoulBond.ts" "MCP整合服務"

echo ""
echo -e "${BLUE}=== 檢查資料庫設定 ===${NC}"
if [ -f "backend/prisma/schema.prisma" ]; then
    if grep -q "model SoulBond\|model EmotionalResonance\|model DailyQuest\|model Achievement" backend/prisma/schema.prisma 2>/dev/null; then
        echo -e "${GREEN}✅ 心靈羈絆資料庫 Schema 已配置${NC}"
    else
        echo -e "${YELLOW}⚠️ 需要更新資料庫 Schema${NC}"
        echo "   執行: cd backend && npx prisma db push"
    fi
else
    echo -e "${RED}❌ Prisma Schema 檔案不存在${NC}"
fi

echo ""
echo -e "${BLUE}=== 檢查 Python 環境 ===${NC}"
if command -v python3 >/dev/null 2>&1; then
    python_version=$(python3 --version | cut -d' ' -f2)
    echo -e "${GREEN}✅ Python ${python_version}${NC}"

    # 檢查必要套件
    if python3 -c "import fastapi, uvicorn, aiofiles" 2>/dev/null; then
        echo -e "${GREEN}✅ Python 套件已安裝${NC}"
    else
        echo -e "${YELLOW}⚠️ 缺少 Python 套件${NC}"
        echo "   執行: cd backend && pip install -r requirements.txt"
    fi
else
    echo -e "${RED}❌ Python3 未安裝${NC}"
fi

echo ""
echo -e "${BLUE}=== 測試心靈羈絆 API ===${NC}"

# 測試 MCP 狀態
if curl -s http://localhost:8765/status > /dev/null 2>&1; then
    echo -e "${GREEN}✅ MCP 服務回應正常${NC}"

    # 顯示快取狀態
    cache_status=$(curl -s http://localhost:8765/status 2>/dev/null | python3 -c "import sys, json; data=json.load(sys.stdin); print(f\"快取命中率: {data.get('cache_hit_rate', 'N/A')}, 活躍會話: {data.get('active_sessions', 'N/A')}\")" 2>/dev/null)
    if [ ! -z "$cache_status" ]; then
        echo "   ${cache_status}"
    fi
else
    echo -e "${RED}❌ MCP 服務無回應${NC}"
fi

# 測試 GraphQL
if curl -s http://localhost:4000/graphql > /dev/null 2>&1; then
    echo -e "${GREEN}✅ GraphQL 端點可用${NC}"

    # 測試心靈羈絆查詢
    test_query='{
        "query": "query { __schema { types { name } } }"
    }'

    response=$(curl -s -X POST http://localhost:4000/graphql \
        -H "Content-Type: application/json" \
        -d "$test_query" 2>/dev/null)

    if echo "$response" | grep -q "__schema"; then
        echo "   GraphQL Schema 載入成功"
    fi
else
    echo -e "${RED}❌ GraphQL 無法存取${NC}"
fi

echo ""
echo -e "${BLUE}=== 系統總結 ===${NC}"

all_good=true

# 計算健康狀態
if check_service "MCP 服務" 8765 "/health" > /dev/null 2>&1 && \
   check_service "後端 API" 4000 "/health" > /dev/null 2>&1 && \
   check_service "前端服務" 3000 "/" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 所有核心服務運行正常${NC}"
else
    echo -e "${YELLOW}⚠️ 部分服務需要啟動${NC}"
    echo "   執行: ./start-mcp.sh"
    all_good=false
fi

# 檢查心靈羈絆系統
soul_bond_files=(
    "backend/src/services/soulBondService.ts"
    "backend/src/services/emotionalResonanceService.ts"
    "backend/src/services/dailyQuestService.ts"
    "backend/src/services/achievementService.ts"
)

soul_bond_ready=true
for file in "${soul_bond_files[@]}"; do
    if [ ! -f "$file" ]; then
        soul_bond_ready=false
        break
    fi
done

if [ "$soul_bond_ready" = true ]; then
    echo -e "${GREEN}✅ 心靈羈絆系統已就緒${NC}"
else
    echo -e "${YELLOW}⚠️ 心靈羈絆系統檔案不完整${NC}"
    all_good=false
fi

echo ""
if [ "$all_good" = true ]; then
    echo -e "${GREEN}🎉 心語小鎮心靈羈絆系統完全就緒！${NC}"
    echo ""
    echo "訪問 http://localhost:3000 開始遊戲"
    echo "訪問 http://localhost:4000/graphql 測試 API"
else
    echo -e "${YELLOW}請執行以下命令完成設置：${NC}"
    echo ""
    echo "1. 更新資料庫："
    echo "   cd backend && npx prisma db push"
    echo ""
    echo "2. 啟動所有服務："
    echo "   ./start-mcp.sh"
fi

echo ""
echo "========================"
echo "檢查完成"