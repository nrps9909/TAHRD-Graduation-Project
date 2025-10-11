# 🔧 502 錯誤解決方案

## 問題診斷

根據您的部署日誌，所有容器都正常運行並且健康檢查通過，但網頁顯示 502 錯誤。

### 根本原因

您的 Nginx 配置（`nginx/conf.d/ssl.conf`）配置了 **HTTPS 強制重定向**：

```nginx
# HTTP -> HTTPS 重定向
server {
    listen 80;
    return 301 https://$host$request_uri;  # ← 這裡會重定向到 HTTPS
}

# HTTPS 配置
server {
    listen 443 ssl;
    ssl_certificate /etc/nginx/ssl/cloudflare-cert.pem;      # ← 證書可能不存在
    ssl_certificate_key /etc/nginx/ssl/cloudflare-key.pem;  # ← 或無效
}
```

**結果：**
1. 您訪問 `http://your-ip` 
2. Nginx 重定向到 `https://your-ip`
3. HTTPS 無法工作（證書問題）
4. 出現 502 錯誤

## 🚀 快速解決方案

### 方案 A：使用 HTTP only 配置（推薦，立即生效）

在遠端服務器執行：

```bash
# SSH 到服務器
ssh root@YOUR_SERVER_IP

# 進入專案目錄
cd /home/jesse/heart-whisper-town

# 拉取最新的修復文件
git pull origin production

# 執行修復腳本
chmod +x fix-502.sh
sudo ./fix-502.sh
```

**修復腳本會自動：**
1. ✅ 備份現有的 SSL 配置
2. ✅ 禁用 HTTPS 重定向
3. ✅ 啟用 HTTP only 配置
4. ✅ 重啟 Nginx
5. ✅ 測試連接

**完成後，您就可以通過 HTTP 訪問網站了！**

---

### 方案 B：手動診斷（如果想了解詳情）

```bash
# SSH 到服務器
ssh root@YOUR_SERVER_IP

# 進入專案目錄
cd /home/jesse/heart-whisper-town

# 執行診斷腳本
chmod +x diagnose-502.sh
sudo ./diagnose-502.sh
```

診斷腳本會檢查：
- ✅ 容器狀態
- ✅ 後端/前端日誌
- ✅ 健康檢查
- ✅ SSL 證書
- ✅ 網絡連接

---

### 方案 C：配置 HTTPS（生產環境推薦）

如果您想使用 HTTPS（推薦用於生產環境）：

#### 1. 獲取 SSL 證書

**選項 1：使用 Cloudflare Origin Certificate**
1. 登入 Cloudflare Dashboard
2. 前往 SSL/TLS → Origin Server
3. 創建證書
4. 下載證書和私鑰

**選項 2：使用 Let's Encrypt**
```bash
# 安裝 Certbot
apt-get update
apt-get install -y certbot python3-certbot-nginx

# 獲取證書（需要域名）
certbot --nginx -d your-domain.com
```

#### 2. 上傳證書到服務器

```bash
# 在本地
scp cloudflare-cert.pem root@YOUR_SERVER_IP:/home/jesse/heart-whisper-town/nginx/ssl/
scp cloudflare-key.pem root@YOUR_SERVER_IP:/home/jesse/heart-whisper-town/nginx/ssl/

# 或在服務器上直接創建
nano /home/jesse/heart-whisper-town/nginx/ssl/cloudflare-cert.pem
nano /home/jesse/heart-whisper-town/nginx/ssl/cloudflare-key.pem
```

#### 3. 啟用 SSL 配置

```bash
cd /home/jesse/heart-whisper-town

# 確保證書文件存在
ls -la nginx/ssl/

# 如果使用 ssl.conf
cp nginx/conf.d/http-only.conf nginx/conf.d/http-only.conf.backup
rm nginx/conf.d/http-only.conf

# 恢復 ssl.conf（如果之前備份了）
cp nginx/conf.d/ssl.conf.backup.* nginx/conf.d/ssl.conf

# 重啟 Nginx
docker-compose -f docker-compose.production-prebuilt.yml restart nginx
```

---

## 🔍 驗證修復

### 檢查 Nginx 配置

```bash
# 查看啟用的配置文件
ls -la nginx/conf.d/

# 測試 Nginx 配置
docker exec heart-whisper-nginx nginx -t

# 查看 Nginx 日誌
docker logs heart-whisper-nginx
```

### 測試連接

```bash
# 測試健康檢查
curl http://localhost/health

# 從外部測試
curl http://YOUR_SERVER_IP/health

# 查看所有服務狀態
docker-compose -f docker-compose.production-prebuilt.yml ps
```

---

## 📋 常見問題

### Q1: 為什麼部署顯示成功但網站不工作？

**A:** GitHub Actions 只檢查容器是否啟動和健康檢查是否通過，不檢查 Nginx 代理配置。所以即使容器正常運行，Nginx 配置錯誤也會導致 502。

### Q2: 我可以同時使用 HTTP 和 HTTPS 嗎？

**A:** 可以！修改 `nginx/conf.d/ssl.conf`，將 HTTP 重定向部分改為：

```nginx
# HTTP 服務器（不重定向）
server {
    listen 80;
    # ... 與 HTTPS 相同的配置
}

# HTTPS 服務器
server {
    listen 443 ssl;
    # ... SSL 配置
}
```

### Q3: 修復後還是 502 怎麼辦？

**A:** 運行診斷腳本查看詳細信息：

```bash
sudo ./diagnose-502.sh
```

檢查：
1. 後端日誌是否有錯誤
2. 數據庫連接是否正常
3. 環境變數是否正確配置

查看詳細日誌：
```bash
# 查看後端日誌
docker logs -f heart-whisper-backend

# 查看所有日誌
docker-compose -f docker-compose.production-prebuilt.yml logs -f
```

---

## 🎯 預防措施

### 自動使用 HTTP only 配置

修改 `quick-deploy.sh`，在部署時自動檢查 SSL 證書：

```bash
# 在 quick-deploy.sh 中添加
if ! docker exec heart-whisper-nginx test -f /etc/nginx/ssl/cloudflare-cert.pem 2>/dev/null; then
    echo "⚠️  SSL 證書不存在，使用 HTTP only 配置"
    rm -f nginx/conf.d/ssl.conf
fi
```

### 在 CI/CD 中添加健康檢查

修改 `.github/workflows/deploy-production.yml`：

```yaml
- name: Verify deployment
  run: |
    sleep 10
    curl -f http://${{ secrets.SERVER_HOST }}/health || exit 1
```

---

## 📚 相關文件

- `diagnose-502.sh` - 診斷腳本
- `fix-502.sh` - 快速修復腳本  
- `nginx/conf.d/http-only.conf` - HTTP only 配置
- `nginx/conf.d/ssl.conf` - HTTPS 配置

---

**需要幫助？** 查看日誌或提出 Issue。

