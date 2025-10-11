#!/bin/bash

# ========================================
# 502 錯誤診斷腳本
# ========================================

echo "🔍 開始診斷 502 錯誤..."
echo "=========================================="

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. 檢查容器狀態
echo -e "${YELLOW}1. 檢查容器狀態...${NC}"
docker ps -a --filter "name=heart-whisper" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# 2. 檢查後端日誌（最近 50 行）
echo -e "${YELLOW}2. 檢查後端日誌（最近 50 行）...${NC}"
docker logs --tail 50 heart-whisper-backend
echo ""

# 3. 檢查 Nginx 日誌（最近 20 行錯誤）
echo -e "${YELLOW}3. 檢查 Nginx 錯誤日誌...${NC}"
docker logs --tail 20 heart-whisper-nginx 2>&1 | grep -i error || echo "無錯誤"
echo ""

# 4. 測試後端健康檢查
echo -e "${YELLOW}4. 測試後端健康檢查...${NC}"
docker exec heart-whisper-backend curl -f http://localhost:4000/health 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 後端健康檢查成功${NC}"
else
    echo -e "${RED}❌ 後端健康檢查失敗${NC}"
fi
echo ""

# 5. 測試前端
echo -e "${YELLOW}5. 測試前端服務...${NC}"
docker exec heart-whisper-frontend curl -f http://localhost:3000 2>/dev/null > /dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 前端服務正常${NC}"
else
    echo -e "${RED}❌ 前端服務異常${NC}"
fi
echo ""

# 6. 檢查 Nginx 配置
echo -e "${YELLOW}6. 測試 Nginx 配置...${NC}"
docker exec heart-whisper-nginx nginx -t
echo ""

# 7. 檢查 SSL 證書
echo -e "${YELLOW}7. 檢查 SSL 證書...${NC}"
if docker exec heart-whisper-nginx test -f /etc/nginx/ssl/cloudflare-cert.pem; then
    echo -e "${GREEN}✅ SSL 證書存在${NC}"
else
    echo -e "${RED}❌ SSL 證書不存在（這可能是 502 的原因！）${NC}"
fi
echo ""

# 8. 從容器內測試連接
echo -e "${YELLOW}8. 從 Nginx 容器測試後端連接...${NC}"
docker exec heart-whisper-nginx wget -O- http://backend:4000/health 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Nginx 可以連接到後端${NC}"
else
    echo -e "${RED}❌ Nginx 無法連接到後端${NC}"
fi
echo ""

# 9. 檢查網絡連接
echo -e "${YELLOW}9. 檢查 Docker 網絡...${NC}"
docker network inspect heart-whisper-network | grep -A 5 "Containers"
echo ""

# 10. 建議
echo -e "${YELLOW}=========================================="
echo "💡 診斷建議："
echo "==========================================${NC}"

# 檢查是否是 SSL 問題
if ! docker exec heart-whisper-nginx test -f /etc/nginx/ssl/cloudflare-cert.pem 2>/dev/null; then
    echo -e "${RED}主要問題: SSL 證書缺失${NC}"
    echo ""
    echo "您的 Nginx 配置要求 HTTPS，但 SSL 證書不存在。"
    echo ""
    echo "解決方案 A（推薦）：使用 HTTP 配置（測試/開發用）"
    echo "  1. 切換到 HTTP 配置："
    echo "     cd /home/jesse/heart-whisper-town"
    echo "     cp nginx/conf.d/default.conf.backup nginx/conf.d/default.conf"
    echo "     rm nginx/conf.d/ssl.conf"
    echo "     docker-compose -f docker-compose.production-prebuilt.yml restart nginx"
    echo ""
    echo "解決方案 B：安裝 SSL 證書（生產環境用）"
    echo "  1. 上傳 Cloudflare SSL 證書到 nginx/ssl/ 目錄"
    echo "  2. 重啟 Nginx"
    echo ""
else
    echo -e "${GREEN}SSL 證書存在${NC}"
    echo ""
    echo "可能的其他問題："
    echo "  1. 檢查上面的後端日誌是否有錯誤"
    echo "  2. 檢查環境變數配置 (.env.production)"
    echo "  3. 檢查數據庫連接"
    echo ""
fi

echo "完整日誌查看："
echo "  docker-compose -f docker-compose.production-prebuilt.yml logs -f"
echo ""

