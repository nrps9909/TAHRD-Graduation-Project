#!/bin/bash

# ========================================
# 心語小鎮 - 改進的部署腳本
# ========================================

set -e

echo "🚀 心語小鎮 - 生產環境部署"
echo "=========================================="

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
PROJECT_DIR="/home/jesse/heart-whisper-town"
COMPOSE_FILE="docker-compose.production.yml"
BACKUP_DIR="$PROJECT_DIR/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

cd "$PROJECT_DIR"

# 步驟 1: 創建備份
echo -e "${YELLOW}📦 步驟 1/7: 創建備份...${NC}"
mkdir -p "$BACKUP_DIR"
docker-compose -f "$COMPOSE_FILE" ps > "$BACKUP_DIR/containers_${TIMESTAMP}.txt" || true
echo -e "${GREEN}✅ 備份完成${NC}"

# 步驟 2: 驗證配置文件
echo -e "${YELLOW}🔍 步驟 2/7: 驗證配置文件...${NC}"

# 檢查 Nginx 配置衝突
UPSTREAM_COUNT=$(grep -r "^upstream backend" nginx/conf.d/*.conf 2>/dev/null | wc -l || echo "0")
if [ "$UPSTREAM_COUNT" -gt 1 ]; then
    echo -e "${RED}❌ 錯誤：發現 $UPSTREAM_COUNT 個重複的 upstream backend 定義${NC}"
    grep -n "^upstream backend" nginx/conf.d/*.conf
    exit 1
fi

# 檢查 SSL 證書
if [ ! -f "nginx/ssl/cloudflare-cert.pem" ] || [ ! -f "nginx/ssl/cloudflare-key.pem" ]; then
    echo -e "${RED}❌ 錯誤：SSL 證書缺失${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 配置驗證通過${NC}"

# 步驟 3: 拉取最新代碼
echo -e "${YELLOW}📥 步驟 3/7: 拉取最新代碼...${NC}"
git fetch origin
CURRENT_COMMIT=$(git rev-parse HEAD)
git reset --hard origin/production
NEW_COMMIT=$(git rev-parse HEAD)

if [ "$CURRENT_COMMIT" != "$NEW_COMMIT" ]; then
    echo -e "${GREEN}✅ 代碼已更新: $CURRENT_COMMIT -> $NEW_COMMIT${NC}"
else
    echo -e "${BLUE}ℹ️  代碼已是最新${NC}"
fi

# 步驟 4: 構建新映像
echo -e "${YELLOW}🔨 步驟 4/7: 構建映像...${NC}"
docker-compose -f "$COMPOSE_FILE" build --no-cache

# 步驟 5: 停止舊服務
echo -e "${YELLOW}🛑 步驟 5/7: 停止舊服務...${NC}"
docker-compose -f "$COMPOSE_FILE" down

# 步驟 6: 啟動新服務
echo -e "${YELLOW}🚀 步驟 6/7: 啟動新服務...${NC}"
docker-compose -f "$COMPOSE_FILE" up -d --force-recreate

# 等待服務啟動
echo -e "${YELLOW}⏳ 等待服務啟動（30秒）...${NC}"
sleep 30

# 步驟 7: 健康檢查
echo -e "${YELLOW}🏥 步驟 7/7: 健康檢查...${NC}"

HEALTH_CHECK_FAILED=0

# 檢查容器狀態
echo "檢查容器狀態..."
docker-compose -f "$COMPOSE_FILE" ps

# 檢查後端健康
echo "檢查後端健康..."
if curl -f -s http://localhost/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 後端健康檢查通過${NC}"
else
    echo -e "${RED}❌ 後端健康檢查失敗${NC}"
    HEALTH_CHECK_FAILED=1
fi

# 檢查 GraphQL
echo "檢查 GraphQL API..."
if curl -f -s http://localhost/graphql -H "Content-Type: application/json" -d '{"query":"{__typename}"}' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ GraphQL API 檢查通過${NC}"
else
    echo -e "${RED}❌ GraphQL API 檢查失敗${NC}"
    HEALTH_CHECK_FAILED=1
fi

# 檢查 Nginx 配置
echo "檢查 Nginx 配置..."
if docker-compose -f "$COMPOSE_FILE" exec -T nginx nginx -t > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Nginx 配置檢查通過${NC}"
else
    echo -e "${RED}❌ Nginx 配置檢查失敗${NC}"
    HEALTH_CHECK_FAILED=1
fi

# 如果健康檢查失敗，顯示日誌
if [ $HEALTH_CHECK_FAILED -eq 1 ]; then
    echo -e "${RED}=========================================="
    echo "❌ 健康檢查失敗，顯示日誌："
    echo "==========================================${NC}"
    
    echo -e "${YELLOW}Backend 日誌：${NC}"
    docker-compose -f "$COMPOSE_FILE" logs --tail=50 backend
    
    echo -e "${YELLOW}Nginx 日誌：${NC}"
    docker-compose -f "$COMPOSE_FILE" logs --tail=50 nginx
    
    echo -e "${RED}=========================================="
    echo "❌ 部署失敗"
    echo "==========================================${NC}"
    
    # 可選：自動回滾
    read -p "是否回滾到上一個版本？(y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}🔄 回滾中...${NC}"
        git reset --hard "$CURRENT_COMMIT"
        docker-compose -f "$COMPOSE_FILE" down
        docker-compose -f "$COMPOSE_FILE" up -d
        echo -e "${GREEN}✅ 已回滾${NC}"
    fi
    
    exit 1
fi

# 清理舊映像
echo -e "${YELLOW}🧹 清理舊映像...${NC}"
docker image prune -f > /dev/null 2>&1

# 完成
echo ""
echo -e "${GREEN}=========================================="
echo "🎉 部署成功！"
echo "==========================================${NC}"
echo ""
echo "📍 訪問地址："
echo "   主站: https://jesse-chen.com"
echo "   GraphQL: https://jesse-chen.com/graphql"
echo "   健康檢查: https://jesse-chen.com/health"
echo ""
echo "📝 查看日誌："
echo "   docker-compose -f $COMPOSE_FILE logs -f"
echo ""
echo "🔄 查看服務狀態："
echo "   docker-compose -f $COMPOSE_FILE ps"
echo ""

