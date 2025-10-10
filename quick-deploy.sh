#!/bin/bash

# ========================================
# 心語小鎮 - 快速部署腳本（使用預構建映像）
# ========================================

set -e

echo "🚀 心語小鎮 - 快速部署"
echo "=========================================="

# 顏色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
PROJECT_DIR="/opt/heart-whisper-town"
GITHUB_REPO="${GITHUB_REPOSITORY:-nrps9909/TAHRD-Graduation-Project}"

cd "$PROJECT_DIR"

# 步驟 1: 拉取最新配置
echo -e "${YELLOW}📥 步驟 1/4: 拉取最新配置...${NC}"
git pull origin production --quiet
echo -e "${GREEN}✅ 配置更新完成${NC}"

# 步驟 2: 設置環境變數
echo -e "${YELLOW}⚙️  步驟 2/4: 設置環境變數...${NC}"
export GITHUB_REPOSITORY="$GITHUB_REPO"
echo -e "${GREEN}✅ 環境變數設置完成${NC}"

# 步驟 3: 拉取最新映像（這步很快！）
echo -e "${YELLOW}🐳 步驟 3/4: 拉取最新映像...${NC}"
echo -e "${BLUE}提示: 映像已經在 GitHub Actions 中構建好了${NC}"

docker-compose -f docker-compose.production-prebuilt.yml pull

echo -e "${GREEN}✅ 映像拉取完成${NC}"

# 步驟 4: 重啟服務
echo -e "${YELLOW}🔄 步驟 4/4: 重啟服務...${NC}"
docker-compose -f docker-compose.production-prebuilt.yml up -d

# 清理舊映像
docker image prune -f > /dev/null 2>&1

echo -e "${GREEN}✅ 服務重啟完成${NC}"

# 等待服務啟動
echo -e "${YELLOW}⏳ 等待服務啟動...${NC}"
sleep 5

# 檢查服務狀態
echo ""
echo -e "${YELLOW}📊 服務狀態:${NC}"
docker-compose -f docker-compose.production-prebuilt.yml ps

# 健康檢查
echo ""
echo -e "${YELLOW}🏥 健康檢查...${NC}"
sleep 3

if curl -f http://localhost/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 後端健康檢查通過${NC}"
else
    echo -e "${YELLOW}⚠️  後端尚未完全啟動，請稍後檢查${NC}"
fi

# 完成
echo ""
echo -e "${GREEN}=========================================="
echo "🎉 快速部署完成！"
echo "==========================================${NC}"
echo ""
echo -e "${BLUE}⏱️  部署時間: ~30 秒（vs 舊方式 ~10 分鐘）${NC}"
echo ""
echo "📍 訪問地址："
echo "   前端: http://$(curl -s ifconfig.me)"
echo "   後端 API: http://$(curl -s ifconfig.me)/graphql"
echo ""
echo "📝 查看日誌："
echo "   docker-compose -f docker-compose.production-prebuilt.yml logs -f"
echo ""
echo "🔄 如需查看實時日誌："
echo "   docker-compose -f docker-compose.production-prebuilt.yml logs -f backend"
echo ""

