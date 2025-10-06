#!/bin/bash

echo "🔧 初始化心靈羈絆系統資料庫"
echo "============================"

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 檢查是否在正確目錄
if [ ! -f "package.json" ] || [ ! -d "backend" ]; then
    echo -e "${RED}❌ 請在專案根目錄執行此腳本${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}步驟 1: 檢查 PostgreSQL${NC}"

# 檢查 PostgreSQL 是否運行
if pg_isready > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PostgreSQL 正在運行${NC}"
else
    echo -e "${YELLOW}⚠️ PostgreSQL 未運行，嘗試啟動...${NC}"

    # macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew services start postgresql 2>/dev/null || true
    # Linux
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo systemctl start postgresql 2>/dev/null || \
        sudo service postgresql start 2>/dev/null || true
    fi

    sleep 2

    if pg_isready > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PostgreSQL 已啟動${NC}"
    else
        echo -e "${RED}❌ 無法啟動 PostgreSQL，請手動啟動${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${BLUE}步驟 2: 創建資料庫${NC}"

# 創建資料庫（如果不存在）
if psql -U postgres -lqt | cut -d \| -f 1 | grep -qw heart_whisper_town; then
    echo -e "${GREEN}✅ 資料庫 'heart_whisper_town' 已存在${NC}"
else
    echo "創建資料庫 'heart_whisper_town'..."
    createdb -U postgres heart_whisper_town 2>/dev/null || \
    psql -U postgres -c "CREATE DATABASE heart_whisper_town;" 2>/dev/null || true

    if psql -U postgres -lqt | cut -d \| -f 1 | grep -qw heart_whisper_town; then
        echo -e "${GREEN}✅ 資料庫創建成功${NC}"
    else
        echo -e "${YELLOW}⚠️ 資料庫可能需要手動創建${NC}"
        echo "執行: psql -U postgres -c 'CREATE DATABASE heart_whisper_town;'"
    fi
fi

echo ""
echo -e "${BLUE}步驟 3: 設置環境變數${NC}"

# 創建或更新 .env 檔案
cd backend

if [ ! -f ".env" ]; then
    echo "創建 .env 檔案..."
    cat > .env << EOF
# Database
DATABASE_URL="postgresql://postgres:password123@localhost:5432/heart_whisper_town"

# Redis
REDIS_URL="redis://localhost:6379"

# Gemini API (請替換為你的 API Key)
GEMINI_API_KEY="your-gemini-api-key"

# JWT
JWT_SECRET="heart_whisper_town_soul_bond_secret_2024"

# Server
PORT=4000
NODE_ENV=development

# MCP Service
MCP_SERVICE_URL="http://localhost:8765"
USE_GEMINI_CLI=true

# Frontend
FRONTEND_URL="http://localhost:3000"
EOF
    echo -e "${GREEN}✅ .env 檔案已創建${NC}"
    echo -e "${YELLOW}請記得在 .env 中設置你的 GEMINI_API_KEY${NC}"
else
    echo -e "${GREEN}✅ .env 檔案已存在${NC}"
fi

echo ""
echo -e "${BLUE}步驟 4: 安裝依賴${NC}"

# 安裝 npm 依賴
if [ ! -d "node_modules" ]; then
    echo "安裝後端依賴..."
    npm install
else
    echo -e "${GREEN}✅ 後端依賴已安裝${NC}"
fi

echo ""
echo -e "${BLUE}步驟 5: 生成 Prisma Client${NC}"

# 生成 Prisma Client
echo "生成 Prisma Client..."
npx prisma generate

echo ""
echo -e "${BLUE}步驟 6: 推送資料庫 Schema${NC}"

# 推送 Schema 到資料庫
echo "推送心靈羈絆系統 Schema..."
npx prisma db push --accept-data-loss

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 資料庫 Schema 推送成功${NC}"
else
    echo -e "${RED}❌ Schema 推送失敗，請檢查資料庫連接${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}步驟 7: 執行資料庫種子${NC}"

# 檢查是否有種子檔案
if [ -f "prisma/seed.ts" ] || [ -f "prisma/seed.js" ]; then
    echo "執行資料庫種子..."
    npx prisma db seed
    echo -e "${GREEN}✅ 資料庫種子執行完成${NC}"
else
    echo -e "${YELLOW}⚠️ 未找到種子檔案，跳過${NC}"
fi

echo ""
echo -e "${BLUE}步驟 8: 創建初始 NPC 資料${NC}"

# 使用 Node.js 腳本創建初始資料
cat > init-npcs.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('創建初始 NPC...');

  const npcs = [
    {
      id: 'npc-1',
      name: '陸培修',
      personality: '溫柔、藝術氣質、喜歡畫畫',
      backgroundStory: '一位夢想成為畫家的青年',
      currentMood: 'peaceful',
      locationX: 100,
      locationY: 0,
      locationZ: 100
    },
    {
      id: 'npc-2',
      name: '劉宇岑',
      personality: '活潑、開朗、充滿活力',
      backgroundStory: '喜歡冒險的樂天派',
      currentMood: 'cheerful',
      locationX: -100,
      locationY: 0,
      locationZ: 100
    },
    {
      id: 'npc-3',
      name: '陳庭安',
      personality: '內向、細心、善解人意',
      backgroundStory: '溫柔的靈魂守護者',
      currentMood: 'thoughtful',
      locationX: 0,
      locationY: 0,
      locationZ: -100
    }
  ];

  for (const npc of npcs) {
    await prisma.nPC.upsert({
      where: { id: npc.id },
      update: npc,
      create: npc
    });
    console.log(`✅ 創建/更新 NPC: ${npc.name}`);
  }

  console.log('初始資料創建完成！');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
EOF

node init-npcs.js
rm init-npcs.js

cd ..

echo ""
echo -e "${GREEN}==============================${NC}"
echo -e "${GREEN}✅ 心靈羈絆系統資料庫初始化完成！${NC}"
echo -e "${GREEN}==============================${NC}"
echo ""
echo -e "${BLUE}資料庫資訊：${NC}"
echo "   資料庫名稱: heart_whisper_town"
echo "   連接字串: postgresql://postgres:password123@localhost:5432/heart_whisper_town"
echo ""
echo -e "${BLUE}新增的資料表：${NC}"
echo "   • relationships (羈絆關係)"
echo "   • emotional_resonances (情緒共鳴)"
echo "   • npc_diary_entries (NPC日記)"
echo "   • daily_quests (每日任務)"
echo "   • achievements (成就)"
echo "   • town_reputation (小鎮聲望)"
echo "   • gossip_entries (八卦)"
echo "   • offline_progress (離線進展)"
echo "   • seasonal_events (季節活動)"
echo ""
echo -e "${BLUE}下一步：${NC}"
echo "1. 設置 GEMINI_API_KEY："
echo "   編輯 backend/.env 檔案"
echo ""
echo "2. 啟動所有服務："
echo "   ./start-mcp.sh"
echo ""
echo "3. 檢查系統狀態："
echo "   ./check-soul-bond.sh"
echo ""
echo "祝你在心語小鎮有美好的體驗！ 💝"