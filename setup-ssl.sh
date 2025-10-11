#!/bin/bash

# ========================================
# Heart Whisper Town - SSL 證書設置腳本
# 使用 Let's Encrypt 免費 SSL 證書
# ========================================

set -e

echo "🔒 SSL 證書設置腳本"
echo "=========================================="

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 檢查是否為 root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ 請使用 sudo 執行此腳本${NC}"
    exit 1
fi

# 檢查是否有域名
echo -e "${YELLOW}請輸入你的域名（例如：example.com）：${NC}"
read DOMAIN

if [ -z "$DOMAIN" ]; then
    echo -e "${RED}❌ 域名不能為空${NC}"
    exit 1
fi

echo -e "${YELLOW}請輸入你的 Email（用於 Let's Encrypt 通知）：${NC}"
read EMAIL

if [ -z "$EMAIL" ]; then
    echo -e "${RED}❌ Email 不能為空${NC}"
    exit 1
fi

# 安裝 Certbot
echo -e "${YELLOW}📦 安裝 Certbot...${NC}"
apt-get update -qq
apt-get install -y certbot python3-certbot-nginx

# 停止 Nginx（讓 Certbot 使用 80 端口）
echo -e "${YELLOW}🛑 暫時停止 Nginx...${NC}"
cd /home/jesse/heart-whisper-town
docker-compose -f docker-compose.production.yml stop nginx

# 獲取 SSL 證書
echo -e "${YELLOW}🔐 獲取 SSL 證書...${NC}"
certbot certonly --standalone \
    --preferred-challenges http \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN"

# 複製證書到專案目錄
echo -e "${YELLOW}📋 複製證書...${NC}"
mkdir -p /home/jesse/heart-whisper-town/nginx/ssl
cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /home/jesse/heart-whisper-town/nginx/ssl/
cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /home/jesse/heart-whisper-town/nginx/ssl/

# 創建 SSL Nginx 配置
echo -e "${YELLOW}⚙️  創建 SSL 配置...${NC}"
cat > /home/jesse/heart-whisper-town/nginx/conf.d/ssl.conf << EOF
upstream backend {
    server backend:4000;
}

upstream frontend {
    server frontend:3000;
}

# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS 配置
server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    # SSL 證書
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    # SSL 優化
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # 安全標頭
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 前端
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # GraphQL API
    location /graphql {
        proxy_pass http://backend/graphql;
        proxy_http_version 1.1;

        # WebSocket 支援
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # API 路由
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # 健康檢查
    location /health {
        proxy_pass http://backend/health;
        access_log off;
    }
}
EOF

# 刪除舊的 HTTP-only 配置
rm -f /home/jesse/heart-whisper-town/nginx/conf.d/default.conf

# 重啟服務
echo -e "${YELLOW}🔄 重啟服務...${NC}"
cd /home/jesse/heart-whisper-town
docker-compose -f docker-compose.production.yml up -d

# 設置自動續期
echo -e "${YELLOW}⏰ 設置證書自動續期...${NC}"
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/$DOMAIN/*.pem /home/jesse/heart-whisper-town/nginx/ssl/ && cd /home/jesse/heart-whisper-town && docker-compose -f docker-compose.production.yml restart nginx") | crontab -

echo ""
echo -e "${GREEN}=========================================="
echo "🎉 SSL 配置完成！"
echo "==========================================${NC}"
echo ""
echo "🔒 你的網站現在已啟用 HTTPS："
echo "   https://$DOMAIN"
echo ""
echo "✅ 證書將自動每天凌晨 3 點檢查並續期"
echo ""
