# Claude Code 線上沙盒部署指南

## 🚀 快速開始

### 開發環境設置

```bash
# 1. 進入專案目錄
cd sandbox-implementation

# 2. 安裝依賴
npm install

# 3. 設置環境變數
cp .env.example .env

# 4. 啟動開發服務器
npm run dev  # 前端 - http://localhost:3000
npm run server  # 後端 - http://localhost:3001
```

### 環境變數配置

創建 `.env.local` 文件：

```env
# Claude API
ANTHROPIC_API_KEY=your_api_key_here

# 資料庫
DATABASE_URL=postgresql://user:password@localhost:5432/sandbox_db
REDIS_URL=redis://localhost:6379

# 安全設定
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_encryption_key_here

# 沙盒配置
MAX_SANDBOXES=100
SANDBOX_TIMEOUT_MS=30000
USE_DOCKER=false  # 開發環境設為 false

# 第三方服務（可選）
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

---

## 🏗️ 生產環境部署

### 選項 1: Docker Compose（推薦）

```bash
# 1. 構建映像
docker-compose build

# 2. 啟動服務
docker-compose up -d

# 3. 檢查服務狀態
docker-compose ps

# 4. 查看日誌
docker-compose logs -f
```

### 選項 2: Kubernetes 部署

```bash
# 1. 創建命名空間
kubectl create namespace claude-sandbox

# 2. 應用配置
kubectl apply -f k8s/ -n claude-sandbox

# 3. 檢查部署狀態
kubectl get pods -n claude-sandbox

# 4. 獲取服務 URL
kubectl get ingress -n claude-sandbox
```

### 選項 3: Vercel + Railway 部署

#### 前端（Vercel）

```bash
# 1. 安裝 Vercel CLI
npm i -g vercel

# 2. 部署
vercel --prod

# 3. 設置環境變數
vercel env add NEXT_PUBLIC_API_URL production
```

#### 後端（Railway）

```bash
# 1. 安裝 Railway CLI
npm i -g @railway/cli

# 2. 初始化專案
railway init

# 3. 部署
railway up

# 4. 設置環境變數
railway variables set USE_DOCKER=true
```

---

## 🔒 安全性檢查清單

### 部署前必須完成

- [ ] 更改所有默認密碼
- [ ] 配置 HTTPS/SSL 證書
- [ ] 設置防火牆規則
- [ ] 啟用速率限制
- [ ] 配置 CORS 政策
- [ ] 實施內容安全策略（CSP）
- [ ] 設置資源限制（CPU、記憶體、磁碟）
- [ ] 啟用日誌監控
- [ ] 配置備份策略
- [ ] 測試沙盒隔離

### 安全配置範例

```nginx
# nginx.conf 安全頭部
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Content-Security-Policy "default-src 'self';" always;
```

---

## 📊 監控與維護

### 監控設置

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'sandbox-metrics'
    static_configs:
      - targets:
          - 'backend:3001/metrics'
          - 'frontend:3000/metrics'
```

### 健康檢查端點

```bash
# 檢查服務健康狀態
curl http://your-domain.com/health

# 回應範例
{
  "status": "healthy",
  "services": {
    "database": "connected",
    "redis": "connected",
    "sandboxes": {
      "active": 15,
      "available": 85
    }
  },
  "uptime": 3600
}
```

### 日誌管理

```bash
# 查看應用日誌
docker logs sandbox-backend -f

# 查看錯誤日誌
docker logs sandbox-backend 2>&1 | grep ERROR

# 導出日誌
docker logs sandbox-backend > logs/app_$(date +%Y%m%d).log
```

---

## 🔧 故障排除

### 常見問題

#### 1. 沙盒無法啟動

```bash
# 檢查 Docker 狀態
systemctl status docker

# 檢查容器資源
docker stats

# 清理未使用的容器
docker system prune -a
```

#### 2. WebSocket 連接失敗

```nginx
# 確保 nginx 配置正確
location /socket.io {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

#### 3. 記憶體不足

```bash
# 調整 Docker 記憶體限制
docker update --memory="2g" container_name

# 或修改 docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 2G
```

---

## 📈 效能優化

### 1. CDN 配置

```javascript
// next.config.js
module.exports = {
  images: {
    domains: ['cdn.example.com'],
  },
  assetPrefix: process.env.CDN_URL || '',
}
```

### 2. 資料庫優化

```sql
-- 創建索引
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_files_project_id ON files(project_id);

-- 分區表（大數據量時）
CREATE TABLE files_2024 PARTITION OF files
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

### 3. Redis 快取策略

```javascript
// 快取配置
const cacheConfig = {
  'user:*': 3600, // 1小時
  'project:*': 1800, // 30分鐘
  'sandbox:*': 300, // 5分鐘
  'static:*': 86400, // 1天
}
```

---

## 🔄 更新與維護

### 零停機更新

```bash
# 1. 構建新映像
docker build -t sandbox:new .

# 2. 滾動更新
docker service update \
  --image sandbox:new \
  --update-parallelism 1 \
  --update-delay 10s \
  sandbox_service

# 3. 驗證更新
docker service ps sandbox_service
```

### 數據備份

```bash
# PostgreSQL 備份
pg_dump -h localhost -U postgres sandbox_db > backup_$(date +%Y%m%d).sql

# Redis 備份
redis-cli --rdb /backup/dump_$(date +%Y%m%d).rdb

# 檔案系統備份
tar -czf sandboxes_$(date +%Y%m%d).tar.gz ./sandboxes/
```

### 災難恢復

```bash
# 恢復 PostgreSQL
psql -h localhost -U postgres sandbox_db < backup.sql

# 恢復 Redis
redis-cli --rdb /backup/dump.rdb

# 恢復檔案
tar -xzf sandboxes_backup.tar.gz -C ./
```

---

## 📱 移動端支援（未來功能）

### Progressive Web App 配置

```json
// manifest.json
{
  "name": "Claude Code Sandbox",
  "short_name": "CC Sandbox",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#000000",
  "background_color": "#ffffff",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

---

## 📞 支援資源

- 文檔：https://docs.your-domain.com
- 狀態頁面：https://status.your-domain.com
- GitHub Issues：https://github.com/your-org/sandbox/issues
- Discord 社群：https://discord.gg/your-invite

## 📜 授權

MIT License - 詳見 LICENSE 文件
