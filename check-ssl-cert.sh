#!/bin/bash

# ========================================
# 檢查 SSL 證書狀態
# ========================================

echo "🔐 檢查 SSL 證書狀態..."
echo "=========================================="

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="/home/jesse/heart-whisper-town"
cd "$PROJECT_DIR"

# 1. 檢查證書文件是否存在
echo -e "${YELLOW}1. 檢查證書文件...${NC}"
echo ""

if [ -f "nginx/ssl/cloudflare-cert.pem" ]; then
    echo -e "${GREEN}✅ cloudflare-cert.pem 存在${NC}"
    ls -lh nginx/ssl/cloudflare-cert.pem
else
    echo -e "${RED}❌ cloudflare-cert.pem 不存在${NC}"
fi

echo ""

if [ -f "nginx/ssl/cloudflare-key.pem" ]; then
    echo -e "${GREEN}✅ cloudflare-key.pem 存在${NC}"
    ls -lh nginx/ssl/cloudflare-key.pem
else
    echo -e "${RED}❌ cloudflare-key.pem 不存在${NC}"
fi

echo ""
echo -e "${BLUE}所有證書文件：${NC}"
ls -la nginx/ssl/

echo ""
echo "=========================================="

# 2. 檢查容器內的證書
echo -e "${YELLOW}2. 檢查 Nginx 容器內的證書...${NC}"
echo ""

if docker exec heart-whisper-nginx test -f /etc/nginx/ssl/cloudflare-cert.pem 2>/dev/null; then
    echo -e "${GREEN}✅ 容器內證書文件存在${NC}"
    docker exec heart-whisper-nginx ls -lh /etc/nginx/ssl/
else
    echo -e "${RED}❌ 容器內證書文件不存在${NC}"
    echo "檢查掛載情況..."
    docker exec heart-whisper-nginx ls -la /etc/nginx/ssl/ 2>/dev/null || echo "SSL 目錄不存在"
fi

echo ""
echo "=========================================="

# 3. 檢查證書權限
echo -e "${YELLOW}3. 檢查證書權限...${NC}"
echo ""

if [ -f "nginx/ssl/cloudflare-cert.pem" ]; then
    CERT_PERM=$(stat -c "%a" nginx/ssl/cloudflare-cert.pem)
    echo "證書權限: $CERT_PERM"
    
    if [ "$CERT_PERM" = "644" ] || [ "$CERT_PERM" = "600" ]; then
        echo -e "${GREEN}✅ 權限正確${NC}"
    else
        echo -e "${YELLOW}⚠️  權限可能有問題，建議設置為 644${NC}"
        echo "執行: chmod 644 nginx/ssl/cloudflare-cert.pem"
    fi
fi

echo ""
echo "=========================================="

# 4. 驗證證書有效性
echo -e "${YELLOW}4. 驗證證書有效性...${NC}"
echo ""

if [ -f "nginx/ssl/cloudflare-cert.pem" ]; then
    echo "證書信息："
    openssl x509 -in nginx/ssl/cloudflare-cert.pem -noout -subject -issuer -dates 2>/dev/null || \
        echo -e "${RED}無法讀取證書（可能格式錯誤）${NC}"
else
    echo -e "${RED}證書文件不存在，跳過驗證${NC}"
fi

echo ""
echo "=========================================="

# 5. 檢查 Nginx 配置
echo -e "${YELLOW}5. 檢查 Nginx 配置...${NC}"
echo ""

echo "當前啟用的配置文件："
ls -1 nginx/conf.d/*.conf

echo ""

if [ -f "nginx/conf.d/ssl.conf" ]; then
    echo -e "${GREEN}✅ ssl.conf 存在（HTTPS 配置）${NC}"
    echo ""
    echo "SSL 配置摘要："
    grep -E "ssl_certificate|listen.*443" nginx/conf.d/ssl.conf | head -5
else
    echo -e "${YELLOW}⚠️  ssl.conf 不存在（使用 HTTP only）${NC}"
fi

echo ""
echo "=========================================="

# 6. 測試 Nginx 配置
echo -e "${YELLOW}6. 測試 Nginx 配置...${NC}"
echo ""

docker exec heart-whisper-nginx nginx -t

echo ""
echo "=========================================="

# 7. 檢查 HTTPS 連接
echo -e "${YELLOW}7. 測試 HTTPS 連接...${NC}"
echo ""

if curl -k -f https://localhost/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ HTTPS 連接成功${NC}"
else
    echo -e "${RED}❌ HTTPS 連接失敗${NC}"
    
    # 嘗試 HTTP
    if curl -f http://localhost/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ HTTP 連接成功${NC}"
        echo -e "${YELLOW}💡 建議：檢查為什麼 HTTPS 不工作${NC}"
    else
        echo -e "${RED}❌ HTTP 也連接失敗${NC}"
    fi
fi

echo ""
echo "=========================================="
echo -e "${BLUE}總結與建議${NC}"
echo "=========================================="
echo ""

# 給出建議
CERT_EXISTS=false
CERT_IN_CONTAINER=false

[ -f "nginx/ssl/cloudflare-cert.pem" ] && CERT_EXISTS=true
docker exec heart-whisper-nginx test -f /etc/nginx/ssl/cloudflare-cert.pem 2>/dev/null && CERT_IN_CONTAINER=true

if [ "$CERT_EXISTS" = true ] && [ "$CERT_IN_CONTAINER" = true ]; then
    echo -e "${GREEN}✅ 證書配置正確${NC}"
    echo ""
    echo "如果仍有 502 錯誤，可能的原因："
    echo "  1. 證書格式錯誤"
    echo "  2. 證書過期"
    echo "  3. 後端服務問題"
    echo ""
    echo "建議執行："
    echo "  docker logs heart-whisper-nginx"
    echo "  docker logs heart-whisper-backend"
    
elif [ "$CERT_EXISTS" = true ] && [ "$CERT_IN_CONTAINER" = false ]; then
    echo -e "${YELLOW}⚠️  證書在主機上存在，但容器內不存在${NC}"
    echo ""
    echo "解決方案："
    echo "  1. 重啟 Nginx 容器："
    echo "     docker-compose -f docker-compose.production-prebuilt.yml restart nginx"
    echo ""
    echo "  2. 如果還是不行，完全重建："
    echo "     docker-compose -f docker-compose.production-prebuilt.yml up -d --force-recreate nginx"
    
elif [ "$CERT_EXISTS" = false ]; then
    echo -e "${RED}❌ 證書不存在${NC}"
    echo ""
    echo "解決方案 A：添加證書文件"
    echo "  1. 將證書文件複製到 nginx/ssl/ 目錄："
    echo "     cp /path/to/your-cert.pem nginx/ssl/cloudflare-cert.pem"
    echo "     cp /path/to/your-key.pem nginx/ssl/cloudflare-key.pem"
    echo ""
    echo "  2. 設置正確權限："
    echo "     chmod 644 nginx/ssl/cloudflare-cert.pem"
    echo "     chmod 600 nginx/ssl/cloudflare-key.pem"
    echo ""
    echo "  3. 重啟 Nginx："
    echo "     docker-compose -f docker-compose.production-prebuilt.yml restart nginx"
    echo ""
    echo "解決方案 B：暫時使用 HTTP only（推薦用於測試）"
    echo "  執行: sudo ./fix-502.sh"
fi

echo ""

