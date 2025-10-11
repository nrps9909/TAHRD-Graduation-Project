# 🔐 SSL 證書快速檢查指南

## 問題
您有 SSL 證書，但網站出現 502 錯誤。

## 可能的原因

1. **證書文件名不匹配**
   - Nginx 配置要求：`cloudflare-cert.pem` 和 `cloudflare-key.pem`
   - 您的證書可能是其他名稱

2. **證書未正確掛載到容器**
   - 證書在主機上存在，但容器內看不到

3. **證書格式問題**
   - 證書可能不是正確的 PEM 格式

4. **證書權限問題**
   - Nginx 容器無法讀取證書文件

## 🚀 快速診斷

### 步驟 1：執行檢查腳本

SSH 到遠端服務器並執行：

```bash
cd /home/jesse/heart-whisper-town

# 拉取最新代碼（包含檢查腳本）
git pull origin production

# 執行檢查
chmod +x check-ssl-cert.sh
sudo ./check-ssl-cert.sh
```

這個腳本會自動檢查：
- ✅ 證書文件是否存在
- ✅ 容器內證書是否可訪問
- ✅ 證書權限
- ✅ 證書有效性
- ✅ Nginx 配置
- ✅ HTTPS 連接測試

### 步驟 2：根據檢查結果處理

#### 情況 A：證書文件名不對

如果您的證書文件名不是 `cloudflare-cert.pem`，有兩個選擇：

**選項 1：重命名證書文件**
```bash
cd /home/jesse/heart-whisper-town/nginx/ssl/

# 假設您的證書是 my-cert.pem 和 my-key.pem
mv your-cert-name.pem cloudflare-cert.pem
mv your-key-name.pem cloudflare-key.pem

# 設置權限
chmod 644 cloudflare-cert.pem
chmod 600 cloudflare-key.pem

# 重啟 Nginx
docker-compose -f docker-compose.production-prebuilt.yml restart nginx
```

**選項 2：修改 Nginx 配置**
```bash
# 編輯 ssl.conf
nano nginx/conf.d/ssl.conf

# 修改這兩行為您的證書文件名：
# ssl_certificate /etc/nginx/ssl/YOUR-CERT-NAME.pem;
# ssl_certificate_key /etc/nginx/ssl/YOUR-KEY-NAME.pem;

# 保存後重啟
docker-compose -f docker-compose.production-prebuilt.yml restart nginx
```

#### 情況 B：容器內看不到證書

```bash
# 重建容器以重新掛載
cd /home/jesse/heart-whisper-town
docker-compose -f docker-compose.production-prebuilt.yml up -d --force-recreate nginx
```

#### 情況 C：證書不在正確位置

證書應該在這個位置：
```
/home/jesse/heart-whisper-town/nginx/ssl/cloudflare-cert.pem
/home/jesse/heart-whisper-town/nginx/ssl/cloudflare-key.pem
```

如果在其他地方，請移動或複製：
```bash
cp /path/to/your/cert.pem /home/jesse/heart-whisper-town/nginx/ssl/cloudflare-cert.pem
cp /path/to/your/key.pem /home/jesse/heart-whisper-town/nginx/ssl/cloudflare-key.pem
```

## 🔧 手動檢查方法

如果無法執行腳本，手動檢查：

### 1. 檢查證書文件

```bash
cd /home/jesse/heart-whisper-town

# 列出所有證書文件
ls -la nginx/ssl/

# 檢查證書內容（應該看到 BEGIN CERTIFICATE）
head -5 nginx/ssl/cloudflare-cert.pem
```

### 2. 檢查容器內的證書

```bash
# 進入 Nginx 容器
docker exec -it heart-whisper-nginx sh

# 檢查證書
ls -la /etc/nginx/ssl/
cat /etc/nginx/ssl/cloudflare-cert.pem | head -5

# 測試 Nginx 配置
nginx -t

# 退出容器
exit
```

### 3. 查看 Nginx 錯誤日誌

```bash
# 查看最近的錯誤
docker logs heart-whisper-nginx 2>&1 | tail -50

# 或查看日誌文件
tail -50 nginx/logs/error.log
```

常見錯誤信息：
- `SSL: error:...` - 證書格式或內容錯誤
- `No such file or directory` - 證書文件不存在
- `Permission denied` - 權限問題

## 🎯 快速解決方案

### 方案 A：確認您的證書位置和名稱

```bash
# 在遠端服務器執行
find /home/jesse/heart-whisper-town -name "*.pem" -o -name "*.crt" -o -name "*.key"
```

這會列出所有證書相關文件。告訴我輸出，我可以幫您調整配置。

### 方案 B：先用 HTTP 測試

如果想先讓網站正常運行，可以暫時禁用 HTTPS：

```bash
cd /home/jesse/heart-whisper-town

# 執行修復腳本（會切換到 HTTP only）
chmod +x fix-502.sh
sudo ./fix-502.sh
```

之後再慢慢調試 HTTPS。

## 📋 完整的證書配置檢查清單

- [ ] 證書文件存在於 `nginx/ssl/` 目錄
- [ ] 文件名正確：`cloudflare-cert.pem` 和 `cloudflare-key.pem`
- [ ] 證書權限正確：644 (cert) 和 600 (key)
- [ ] 證書格式正確：PEM 格式，包含 `BEGIN CERTIFICATE`
- [ ] 容器可以訪問證書：`docker exec heart-whisper-nginx ls /etc/nginx/ssl/`
- [ ] Nginx 配置測試通過：`docker exec heart-whisper-nginx nginx -t`
- [ ] `ssl.conf` 存在於 `nginx/conf.d/` 目錄

## 🆘 仍然有問題？

請執行以下命令並分享輸出：

```bash
cd /home/jesse/heart-whisper-town

# 檢查證書
ls -la nginx/ssl/

# 檢查容器內證書
docker exec heart-whisper-nginx ls -la /etc/nginx/ssl/

# 測試 Nginx 配置
docker exec heart-whisper-nginx nginx -t

# 查看錯誤日誌
docker logs --tail 30 heart-whisper-nginx
```

---

**提示**：證書文件不應該提交到 Git，所以本地倉庫沒有證書是正常的。證書只需要存在於遠端服務器上。

