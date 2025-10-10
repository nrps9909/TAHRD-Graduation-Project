#!/bin/bash

# ========================================
# Heart Whisper Town - 用戶目錄部署腳本
# 適用於非 root 用戶在自己的 home 目錄下部署
# ========================================

set -e

echo "🌸 歡迎使用心語小鎮用戶部署腳本"
echo "=========================================="

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 檢查不是 root
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}❌ 請不要使用 sudo 執行此腳本${NC}"
    echo -e "${YELLOW}💡 此腳本設計為在用戶目錄下運行${NC}"
    exit 1
fi

# 檢查 Docker 權限
echo -e "${YELLOW}🔍 檢查 Docker 權限...${NC}"
if ! docker ps &> /dev/null; then
    echo -e "${RED}❌ 無法執行 docker 命令${NC}"
    echo -e "${YELLOW}請確保：${NC}"
    echo "  1. Docker 已安裝"
    echo "  2. 您的用戶已加入 docker 群組: sudo usermod -aG docker $USER"
    echo "  3. 登出後重新登入以套用群組變更"
    exit 1
fi
echo -e "${GREEN}✅ Docker 權限正常${NC}"

# 檢查 docker-compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ docker-compose 未安裝${NC}"
    echo "請先安裝 Docker Compose"
    exit 1
fi
echo -e "${GREEN}✅ Docker Compose 已安裝${NC}"

# 設置專案目錄
PROJECT_DIR="$HOME/heart-whisper-town"

# 步驟 1: 準備專案
echo -e "${YELLOW}📂 步驟 1/3: 準備專案...${NC}"
if [ ! -d "$PROJECT_DIR" ]; then
    echo "請輸入 GitHub 專案 URL:"
    read REPO_URL
    
    if [ -z "$REPO_URL" ]; then
        echo -e "${RED}❌ 未提供專案 URL${NC}"
        exit 1
    fi
    
    git clone -b production "$REPO_URL" "$PROJECT_DIR"
    echo -e "${GREEN}✅ 專案克隆完成${NC}"
else
    echo -e "${YELLOW}專案已存在，拉取最新代碼...${NC}"
    cd "$PROJECT_DIR"
    git pull origin production
    echo -e "${GREEN}✅ 代碼更新完成${NC}"
fi

cd "$PROJECT_DIR"

# 步驟 2: 配置環境變數
echo -e "${YELLOW}⚙️  步驟 2/3: 配置環境變數...${NC}"
if [ ! -f ".env.production" ]; then
    if [ -f ".env.production.example" ]; then
        echo -e "${YELLOW}正在創建 .env.production...${NC}"
        cp .env.production.example .env.production
        
        echo -e "${RED}⚠️  重要：請編輯 .env.production 填入正確的配置${NC}"
        echo "按任意鍵繼續編輯..."
        read -n 1
        nano .env.production
    else
        echo -e "${RED}❌ .env.production.example 不存在${NC}"
        echo "請手動創建 .env.production 文件"
        exit 1
    fi
else
    echo -e "${GREEN}✅ .env.production 已存在${NC}"
fi

# 設置正確的權限
chmod 600 .env.production

# 步驟 3: 啟動服務
echo -e "${YELLOW}🚀 步驟 3/3: 啟動服務...${NC}"

# 停止舊服務（如果存在）
echo -e "${YELLOW}停止舊服務...${NC}"
docker-compose -f docker-compose.production.yml down || true

# 清理舊資源（可選）
echo -e "${YELLOW}是否清理舊的 Docker 映像以節省空間? (y/N)${NC}"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    docker-compose -f docker-compose.production.yml down -v
    docker image prune -af
    echo -e "${GREEN}✅ 已清理舊資源${NC}"
fi

# 啟動新服務
echo -e "${YELLOW}構建並啟動服務...${NC}"
docker-compose -f docker-compose.production.yml up -d --build

# 等待服務啟動
echo -e "${YELLOW}⏳ 等待服務啟動...${NC}"
sleep 15

# 檢查服務狀態
echo -e "${YELLOW}📊 檢查服務狀態...${NC}"
docker-compose -f docker-compose.production.yml ps

# 檢查服務健康狀態
echo ""
echo -e "${YELLOW}🏥 檢查服務健康狀態...${NC}"
for i in {1..6}; do
    if curl -s http://localhost/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 服務健康檢查通過${NC}"
        break
    else
        if [ $i -eq 6 ]; then
            echo -e "${YELLOW}⚠️  健康檢查超時，請查看日誌${NC}"
        else
            echo -e "${YELLOW}等待服務就緒... ($i/6)${NC}"
            sleep 5
        fi
    fi
done

# 顯示結果
echo ""
echo -e "${GREEN}=========================================="
echo "🎉 部署完成！"
echo "==========================================${NC}"
echo ""
echo "📍 專案位置："
echo "   $PROJECT_DIR"
echo ""
echo "📍 訪問地址："
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_SERVER_IP")
echo "   前端: http://$SERVER_IP"
echo "   後端 API: http://$SERVER_IP/graphql"
echo "   健康檢查: http://$SERVER_IP/health"
echo "   本地測試: http://localhost"
echo ""
echo "📝 常用命令："
echo "   查看日誌: docker-compose -f docker-compose.production.yml logs -f"
echo "   查看狀態: docker-compose -f docker-compose.production.yml ps"
echo "   重啟服務: docker-compose -f docker-compose.production.yml restart"
echo "   停止服務: docker-compose -f docker-compose.production.yml down"
echo ""
echo "🔧 管理腳本："
echo "   啟動: cd $PROJECT_DIR && docker-compose -f docker-compose.production.yml up -d"
echo "   停止: cd $PROJECT_DIR && docker-compose -f docker-compose.production.yml down"
echo "   更新: cd $PROJECT_DIR && git pull && docker-compose -f docker-compose.production.yml up -d --build"
echo ""
echo -e "${YELLOW}⚠️  下一步（可選但推薦）：${NC}"
echo "   1. 配置 SSL 證書: sudo bash setup-ssl.sh"
echo "   2. 設置自動啟動: 在 crontab 加入 @reboot 命令"
echo ""
echo -e "${GREEN}💡 磁碟使用情況：${NC}"
df -h $HOME
echo ""

