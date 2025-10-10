#!/bin/bash

# ========================================
# Heart Whisper Town - DigitalOcean 部署腳本
# ========================================

set -e  # 遇到錯誤立即停止

echo "🌸 歡迎使用心語小鎮部署腳本"
echo "=========================================="

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 檢查是否為 root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ 請使用 sudo 執行此腳本${NC}"
    exit 1
fi

# 步驟 1: 系統更新
echo -e "${YELLOW}📦 步驟 1/6: 更新系統套件...${NC}"
apt-get update -qq
apt-get upgrade -y -qq

# 步驟 2: 安裝 Docker
echo -e "${YELLOW}🐳 步驟 2/6: 安裝 Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}✅ Docker 安裝完成${NC}"
else
    echo -e "${GREEN}✅ Docker 已安裝${NC}"
fi

# 步驟 3: 安裝 Docker Compose
echo -e "${YELLOW}🔧 步驟 3/6: 安裝 Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✅ Docker Compose 安裝完成${NC}"
else
    echo -e "${GREEN}✅ Docker Compose 已安裝${NC}"
fi

# 步驟 4: 安裝 Git
echo -e "${YELLOW}📥 步驟 4/6: 安裝 Git...${NC}"
if ! command -v git &> /dev/null; then
    apt-get install -y git
    echo -e "${GREEN}✅ Git 安裝完成${NC}"
else
    echo -e "${GREEN}✅ Git 已安裝${NC}"
fi

# 步驟 5: 克隆專案（如果不存在）
echo -e "${YELLOW}📂 步驟 5/6: 準備專案...${NC}"
PROJECT_DIR="/opt/heart-whisper-town"

if [ ! -d "$PROJECT_DIR" ]; then
    echo "請輸入 GitHub 專案 URL:"
    read REPO_URL
    git clone -b production "$REPO_URL" "$PROJECT_DIR"
    echo -e "${GREEN}✅ 專案克隆完成${NC}"
else
    echo -e "${YELLOW}專案已存在，拉取最新代碼...${NC}"
    cd "$PROJECT_DIR"
    git pull origin production
    echo -e "${GREEN}✅ 代碼更新完成${NC}"
fi

cd "$PROJECT_DIR"

# 步驟 6: 配置環境變數
echo -e "${YELLOW}⚙️  步驟 6/6: 配置環境變數...${NC}"
if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}正在創建 .env.production...${NC}"
    cp .env.production.example .env.production

    echo -e "${RED}⚠️  重要：請編輯 .env.production 填入正確的配置${NC}"
    echo "按任意鍵繼續編輯..."
    read -n 1
    nano .env.production
else
    echo -e "${GREEN}✅ .env.production 已存在${NC}"
fi

# 啟動服務
echo -e "${YELLOW}🚀 啟動服務...${NC}"
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d --build

# 等待服務啟動
echo -e "${YELLOW}⏳ 等待服務啟動...${NC}"
sleep 10

# 檢查服務狀態
echo -e "${YELLOW}📊 檢查服務狀態...${NC}"
docker-compose -f docker-compose.production.yml ps

# 顯示日誌
echo ""
echo -e "${GREEN}=========================================="
echo "🎉 部署完成！"
echo "==========================================${NC}"
echo ""
echo "📍 訪問地址："
echo "   前端: http://$(curl -s ifconfig.me)"
echo "   後端 API: http://$(curl -s ifconfig.me)/graphql"
echo "   健康檢查: http://$(curl -s ifconfig.me)/health"
echo ""
echo "📝 查看日誌："
echo "   docker-compose -f docker-compose.production.yml logs -f"
echo ""
echo "🔄 重啟服務："
echo "   docker-compose -f docker-compose.production.yml restart"
echo ""
echo "🛑 停止服務："
echo "   docker-compose -f docker-compose.production.yml down"
echo ""
echo -e "${YELLOW}⚠️  下一步：配置 SSL 證書（可選但推薦）${NC}"
echo "   執行: sudo bash setup-ssl.sh"
echo ""
