# 🚀 DigitalOcean 部署指南

這份文件將指導你在 DigitalOcean 上部署心語小鎮專案。

## 📋 前置需求

### 1. GitHub Student Pack
- ✅ 已申請並獲得批准
- ⏳ 等待 72 小時後可領取 DigitalOcean $200 額度

### 2. DigitalOcean 帳號
- 前往：https://www.digitalocean.com/github-students
- 使用 GitHub 帳號登入
- 領取 $200 學生額度

### 3. 必要的 API 金鑰
- Gemini API Key（https://ai.google.dev/）
- OpenWeather API Key（可選，用於天氣系統）

---

## 🎯 快速部署（推薦）

### 步驟 1：創建 Droplet

1. 登入 DigitalOcean Dashboard
2. 點擊 "Create" → "Droplets"
3. 選擇配置：
   ```
   - 映像：Ubuntu 22.04 LTS
   - 方案：Basic
   - CPU 選項：Regular - $6/月
     • 1 GB RAM
     • 1 vCPU
     • 25 GB SSD
     • 1000 GB 流量
   - 資料中心：選擇離你最近的（例如：新加坡）
   - Authentication：SSH Key（推薦）或密碼
   - Hostname：heart-whisper-town
   ```
4. 點擊 "Create Droplet"

### 步驟 2：連接到 Droplet

```bash
# 使用 SSH 連接（從你的電腦執行）
ssh root@YOUR_DROPLET_IP

# 如果使用密碼，會要求輸入密碼
# 如果使用 SSH Key，會自動登入
```

### 步驟 3：執行一鍵部署

```bash
# 下載部署腳本
curl -o deploy.sh https://raw.githubusercontent.com/YOUR_USERNAME/TAHRD-Graduation-Project/production/deploy.sh

# 給予執行權限
chmod +x deploy.sh

# 執行部署
sudo bash deploy.sh
```

### 步驟 4：配置環境變數

部署腳本會提示你編輯 `.env.production`：

```bash
# 必須修改的項目：
DOMAIN=YOUR_DROPLET_IP  # 或你的域名

# 資料庫（推薦使用 MongoDB Atlas 免費方案）
DATABASE_URL=mongodb+srv://...

# Gemini API
GEMINI_API_KEY=your_gemini_api_key

# JWT Secret（必須改成隨機字串）
JWT_SECRET=your_random_secret_min_32_chars

# 前端 URL
FRONTEND_URL=http://YOUR_DROPLET_IP
VITE_API_URL=http://YOUR_DROPLET_IP/api
VITE_GRAPHQL_URL=http://YOUR_DROPLET_IP/graphql
VITE_WS_URL=ws://YOUR_DROPLET_IP/graphql
```

### 步驟 5：訪問你的應用

```
🌐 前端：http://YOUR_DROPLET_IP
🔌 GraphQL API：http://YOUR_DROPLET_IP/graphql
🏥 健康檢查：http://YOUR_DROPLET_IP/health
```

---

## 🔒 配置 SSL（可選但推薦）

### 前置條件：需要一個域名

如果你有域名（例如從 Namecheap、Cloudflare 等購買）：

#### 1. 配置 DNS

在你的域名提供商設置 A 記錄：
```
Type: A
Name: @（或你的子域名）
Value: YOUR_DROPLET_IP
TTL: 自動
```

#### 2. 執行 SSL 設置腳本

```bash
# 在 Droplet 上執行
cd /opt/heart-whisper-town
sudo bash setup-ssl.sh

# 按提示輸入：
# - 你的域名
# - 你的 Email
```

#### 3. 更新環境變數

編輯 `.env.production`，將所有 URL 改為 `https://`：
```bash
nano /opt/heart-whisper-town/.env.production

# 修改：
FRONTEND_URL=https://your-domain.com
VITE_API_URL=https://your-domain.com/api
VITE_GRAPHQL_URL=https://your-domain.com/graphql
VITE_WS_URL=wss://your-domain.com/graphql
```

#### 4. 重啟服務

```bash
cd /opt/heart-whisper-town
docker-compose -f docker-compose.production.yml restart
```

現在你的網站已經啟用 HTTPS！🔒

---

## 🛠️ 常用管理命令

### 查看服務狀態
```bash
cd /opt/heart-whisper-town
docker-compose -f docker-compose.production.yml ps
```

### 查看日誌
```bash
# 所有服務
docker-compose -f docker-compose.production.yml logs -f

# 只看後端
docker-compose -f docker-compose.production.yml logs -f backend

# 只看前端
docker-compose -f docker-compose.production.yml logs -f frontend
```

### 重啟服務
```bash
# 重啟所有服務
docker-compose -f docker-compose.production.yml restart

# 只重啟後端
docker-compose -f docker-compose.production.yml restart backend
```

### 停止服務
```bash
docker-compose -f docker-compose.production.yml down
```

### 更新代碼
```bash
cd /opt/heart-whisper-town
git pull origin production
docker-compose -f docker-compose.production.yml up -d --build
```

---

## 💾 資料庫選項

### 選項 1：MongoDB Atlas（推薦）

**優點：**
- 完全免費（M0 tier）
- 512MB 儲存空間
- 不需要自己管理
- 自動備份

**設置步驟：**
1. 前往：https://www.mongodb.com/cloud/atlas/register
2. 創建免費 M0 cluster
3. 設置資料庫用戶和密碼
4. 將 Droplet IP 加入白名單（或設為 `0.0.0.0/0` 允許所有 IP）
5. 複製連接字串到 `.env.production` 的 `DATABASE_URL`

### 選項 2：本地 PostgreSQL（在 Droplet 上）

如果你想用 PostgreSQL，修改 `docker-compose.production.yml`，加入 postgres 服務（參考 `docker-compose.yml`）。

---

## 📊 監控和維護

### 查看系統資源使用

```bash
# 查看記憶體使用
free -h

# 查看硬碟使用
df -h

# 查看 Docker 容器資源
docker stats
```

### 清理 Docker 空間

```bash
# 清理未使用的映像
docker system prune -a

# 清理所有未使用的資源
docker system prune --volumes
```

---

## 🔧 故障排除

### 問題 1：容器無法啟動

```bash
# 查看詳細錯誤
docker-compose -f docker-compose.production.yml logs backend

# 常見原因：
# - 環境變數設置錯誤
# - 資料庫連接失敗
# - 端口已被佔用
```

### 問題 2：無法訪問網站

```bash
# 檢查防火牆
sudo ufw status

# 開放必要端口
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 22  # SSH
sudo ufw enable
```

### 問題 3：記憶體不足

```bash
# 添加 swap 空間
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 永久啟用
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 問題 4：CORS 錯誤

編輯 `backend/src/index.ts`，確保 `FRONTEND_URL` 在 CORS 允許列表中。

---

## 💡 優化建議

### 1. 設置自動備份

```bash
# 創建備份腳本
cat > /opt/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups"
mkdir -p $BACKUP_DIR

# 備份環境變數
cp /opt/heart-whisper-town/.env.production $BACKUP_DIR/env_$DATE

# 備份記憶檔案
tar -czf $BACKUP_DIR/memories_$DATE.tar.gz /opt/heart-whisper-town/backend/memories

# 刪除 7 天前的備份
find $BACKUP_DIR -mtime +7 -delete
EOF

chmod +x /opt/backup.sh

# 設置每日自動備份（凌晨 2 點）
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/backup.sh") | crontab -
```

### 2. 設置監控（可選）

使用 DigitalOcean 的內建監控：
- Dashboard → Droplet → Monitoring
- 可查看 CPU、記憶體、硬碟、網路使用情況

---

## 📞 需要幫助？

如果遇到問題：

1. **查看日誌**：`docker-compose logs -f`
2. **檢查健康狀態**：訪問 `http://YOUR_IP/health`
3. **重啟服務**：`docker-compose restart`
4. **GitHub Issues**：在專案 repo 提問

---

## 🎉 恭喜！

你的心語小鎮已經成功部署到雲端！

**下一步：**
- [ ] 分享 URL 給同學
- [ ] 配置自定義域名（可選）
- [ ] 設置 SSL 證書（推薦）
- [ ] 配置自動備份
- [ ] 監控服務狀態

**預估成本：**
- Droplet: $6/月
- 使用 Student Pack $200 額度
- 可運行約 33 個月（近 3 年）！
