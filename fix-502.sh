#!/bin/bash

# ========================================
# 快速修復 502 錯誤
# ========================================

set -e

echo "🔧 正在修復 502 錯誤..."
echo "=========================================="

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="/home/jesse/heart-whisper-town"
cd "$PROJECT_DIR"

echo -e "${YELLOW}問題分析：${NC}"
echo "您的 Nginx 配置需要 HTTPS，但 SSL 證書可能不存在或無效。"
echo "這會導致 HTTP -> HTTPS 重定向失敗，出現 502 錯誤。"
echo ""

echo -e "${BLUE}解決方案：切換到 HTTP only 配置${NC}"
echo ""

# 備份現有配置
echo -e "${YELLOW}步驟 1/4: 備份現有配置...${NC}"
if [ -f "nginx/conf.d/ssl.conf" ]; then
    cp nginx/conf.d/ssl.conf nginx/conf.d/ssl.conf.backup.$(date +%Y%m%d_%H%M%S)
    echo -e "${GREEN}✅ 已備份 ssl.conf${NC}"
fi

# 禁用 SSL 配置
echo -e "${YELLOW}步驟 2/4: 禁用 HTTPS 配置...${NC}"
if [ -f "nginx/conf.d/ssl.conf" ]; then
    rm nginx/conf.d/ssl.conf
    echo -e "${GREEN}✅ 已移除 ssl.conf${NC}"
else
    echo -e "${BLUE}ssl.conf 不存在，跳過${NC}"
fi

# 確保 HTTP only 配置存在
echo -e "${YELLOW}步驟 3/4: 啟用 HTTP only 配置...${NC}"
if [ -f "nginx/conf.d/http-only.conf" ]; then
    echo -e "${GREEN}✅ http-only.conf 已存在${NC}"
else
    echo -e "${RED}❌ 找不到 http-only.conf${NC}"
    echo "請先執行: git pull origin production"
    exit 1
fi

# 重啟 Nginx
echo -e "${YELLOW}步驟 4/4: 重啟 Nginx...${NC}"
docker-compose -f docker-compose.production-prebuilt.yml restart nginx

echo ""
echo -e "${GREEN}=========================================="
echo "✅ 修復完成！"
echo "==========================================${NC}"
echo ""

# 等待服務啟動
echo -e "${YELLOW}等待 Nginx 重啟...${NC}"
sleep 3

# 測試連接
echo -e "${YELLOW}測試連接...${NC}"
if curl -f http://localhost/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 健康檢查通過！${NC}"
else
    echo -e "${YELLOW}⚠️  健康檢查未通過，但 Nginx 已重啟${NC}"
    echo "請稍等片刻讓服務完全啟動"
fi

echo ""
echo "📍 現在可以通過以下方式訪問："
echo "   http://$(curl -s ifconfig.me)"
echo ""
echo "📝 查看 Nginx 日誌："
echo "   docker logs -f heart-whisper-nginx"
echo ""
echo "📝 查看所有服務日誌："
echo "   docker-compose -f docker-compose.production-prebuilt.yml logs -f"
echo ""
echo -e "${BLUE}💡 提示：${NC}"
echo "  - 現在使用 HTTP (80 端口)"
echo "  - 如需啟用 HTTPS，請先配置 SSL 證書"
echo "  - SSL 證書路徑：nginx/ssl/cloudflare-cert.pem"
echo ""

