#!/bin/bash

# 心語小鎮快速啟動腳本

echo "🌟 歡迎來到心語小鎮 - Heart Whisper Town 🌟"
echo "================================================"

# 檢查必要檔案
echo "🔍 檢查環境設置..."

if [ ! -f .env ]; then
    echo "❌ 未找到 .env 檔案，正在複製範例檔案..."
    cp .env.example .env
    echo "⚠️  請編輯 .env 檔案設定您的 GEMINI_API_KEY"
    exit 1
fi

# 檢查 API 金鑰
if ! grep -q "GEMINI_API_KEY=.*[^_]" .env; then
    echo "⚠️  請確保 .env 檔案中設定了有效的 GEMINI_API_KEY"
    echo "   編輯 .env 檔案並設定: GEMINI_API_KEY=your_api_key_here"
    exit 1
fi

# 檢查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安裝，請先安裝 Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose 未安裝，請先安裝 Docker Compose"
    exit 1
fi

echo "✅ 環境檢查完成"

# 確保所有依賴都已安裝
echo "📦 檢查 Node.js 依賴..."
if [ ! -d node_modules ]; then
    echo "正在安裝依賴..."
    npm install
fi

# 測試 LLM 架構
echo "🧠 測試 LLM 架構..."
python3 test_architecture_basic.py
if [ $? -ne 0 ]; then
    echo "❌ 架構測試失敗，請檢查配置"
    exit 1
fi

# 停止可能運行的舊服務
echo "🛑 停止舊服務..."
docker-compose down

# 清理舊的 Docker 映像（可選）
read -p "是否要清理舊的 Docker 映像？[y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧹 清理舊映像..."
    docker-compose down --rmi all --volumes --remove-orphans
fi

# 啟動服務
echo "🚀 啟動心語小鎮..."
echo "   - PostgreSQL (資料庫)"
echo "   - Redis (緩存)"
echo "   - Backend API (後端服務)"
echo "   - Frontend (前端應用)"

docker-compose up -d

# 等待服務啟動
echo "⏳ 等待服務啟動..."
sleep 10

# 檢查服務狀態
echo "📊 檢查服務狀態..."
docker-compose ps

# 檢查後端健康狀態
echo "🏥 檢查後端健康狀態..."
for i in {1..30}; do
    if curl -s http://localhost:4000/health > /dev/null; then
        echo "✅ 後端服務已就緒"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "⚠️  後端服務啟動超時，請檢查日誌: docker-compose logs backend"
    fi
    sleep 2
done

# 初始化數據庫（如果需要）
echo "🗄️  檢查數據庫初始化..."
docker-compose exec postgres psql -U postgres -d heart_whisper_town -c "SELECT COUNT(*) FROM npcs;" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ 數據庫已初始化"
else
    echo "🔧 正在初始化數據庫..."
    docker-compose exec postgres psql -U postgres -d heart_whisper_town -f /docker-entrypoint-initdb.d/01-init.sql
    docker-compose exec postgres psql -U postgres -d heart_whisper_town -f /docker-entrypoint-initdb.d/02-memory_enhancement.sql
fi

echo ""
echo "🎉 心語小鎮啟動完成！"
echo "================================================"
echo "📱 前端應用: http://localhost:3000"
echo "🔌 後端 API: http://localhost:4000"
echo "🎮 GraphQL: http://localhost:4000/graphql"
echo ""
echo "👥 3 個 NPC 角色:"
echo "   🍵 艾瑪 - 溫暖治癒的咖啡店主 (座標: 10, 0, 15)"
echo "   🌸 莉莉 - 活潑陽光的花店女孩 (座標: -15, 0, 20)"
echo "   📚 湯姆 - 沉穩智慧的圖書館館長 (座標: 0, 0, -25)"
echo ""
echo "🧠 特色功能:"
echo "   ✨ NPC 記憶系統 - 記住你們的每次對話"
echo "   💬 NPC 間交流 - NPC 會互相分享信息"
echo "   🌺 記憶花園 - 重要對話生成記憶花朵"
echo "   📈 關係發展 - 透過互動提升關係等級"
echo ""
echo "🛠️  管理命令:"
echo "   查看日誌: docker-compose logs -f"
echo "   停止服務: docker-compose down"
echo "   重啟服務: docker-compose restart"
echo ""
echo "🌟 現在就開始你的心語小鎮之旅吧！"
echo "   訪問 http://localhost:3000 開始遊玩"

# 可選：自動打開瀏覽器
read -p "是否要自動打開瀏覽器？[y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v xdg-open &> /dev/null; then
        xdg-open http://localhost:3000
    elif command -v open &> /dev/null; then
        open http://localhost:3000
    elif command -v start &> /dev/null; then
        start http://localhost:3000
    else
        echo "請手動打開瀏覽器訪問 http://localhost:3000"
    fi
fi