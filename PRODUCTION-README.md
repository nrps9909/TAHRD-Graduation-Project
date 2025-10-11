# 🌸 Heart Whisper Town - 生產環境部署文檔

**部署時間**: 2025-10-10
**服務器 IP**: 152.42.204.18
**環境**: Production

---

## 📍 訪問地址

- **前端**: http://152.42.204.18
- **後端 API**: http://152.42.204.18/graphql
- **健康檢查**: http://152.42.204.18/health
- **WebSocket**: ws://152.42.204.18

---

## ✅ 已完成的配置

### 1️⃣ 服務自動啟動
- ✅ 已配置 systemd 服務
- ✅ 系統重啟後自動啟動所有容器
- ✅ 服務名稱: `heart-whisper-town.service`

**管理命令**:
```bash
# 查看狀態
sudo systemctl status heart-whisper-town

# 手動啟動/停止
sudo systemctl start heart-whisper-town
sudo systemctl stop heart-whisper-town

# 查看日誌
sudo journalctl -u heart-whisper-town -f
```

### 2️⃣ 自動備份
- ✅ 每日凌晨 2:00 自動備份
- ✅ 備份內容: 配置文件、記憶數據、Redis 數據
- ✅ 備份位置: `/home/jesse/backups/`
- ✅ 自動清理 7 天前的備份

**手動備份**:
```bash
cd ~/heart-whisper-town
./backup.sh
```

### 3️⃣ 健康監控
- ✅ 每 5 分鐘自動檢查服務健康狀態
- ✅ 服務異常時自動嘗試重啟
- ✅ 監控日誌: `~/heart-whisper-town/logs/health-check.log`

**手動監控**:
```bash
cd ~/heart-whisper-town
./monitor.sh
```

### 4️⃣ 日誌管理
- ✅ 自動日誌輪轉（每日）
- ✅ Docker 日誌保留 7 天
- ✅ 應用日誌保留 14 天
- ✅ 自動壓縮舊日誌

### 5️⃣ 系統優化
- ✅ 添加 2GB SWAP 空間
- ✅ 防火牆規則配置（UFW）
- ✅ Docker 資源清理

---

## 📊 當前系統狀態

### 容器狀態
```
✅ heart-whisper-redis      - Healthy
✅ heart-whisper-backend    - Healthy
✅ heart-whisper-frontend   - Running
✅ heart-whisper-nginx      - Healthy
```

### 資源使用
- **磁碟**: 58% (14G/25G) - ⚠️ 建議監控
- **內存**: 358MB/957MB (37%) + 2GB SWAP
- **Backend**: ~89MB RAM
- **Frontend**: ~4.5MB RAM
- **Redis**: ~7.3MB RAM

---

## 🔧 常用管理命令

### Docker 服務管理
```bash
# 進入專案目錄
cd ~/heart-whisper-town

# 查看所有容器狀態
docker-compose -f docker-compose.production.yml ps

# 查看實時日誌
docker-compose -f docker-compose.production.yml logs -f

# 查看特定服務日誌
docker-compose -f docker-compose.production.yml logs -f backend

# 重啟所有服務
docker-compose -f docker-compose.production.yml restart

# 重啟特定服務
docker-compose -f docker-compose.production.yml restart backend

# 停止所有服務
docker-compose -f docker-compose.production.yml down

# 啟動所有服務
docker-compose -f docker-compose.production.yml up -d
```

### 更新代碼
```bash
cd ~/heart-whisper-town

# 拉取最新代碼
git pull origin production

# 重新構建並啟動
docker-compose -f docker-compose.production.yml up -d --build

# 查看更新後的日誌
docker-compose -f docker-compose.production.yml logs -f
```

### 資源監控
```bash
# 運行監控腳本
~/heart-whisper-town/monitor.sh

# 查看容器資源使用
docker stats

# 查看磁碟使用
df -h

# 查看內存使用
free -h

# 查看 Docker 資源
docker system df
```

### 數據庫管理
```bash
# 連接到 Redis
docker exec -it heart-whisper-redis redis-cli

# 檢查 Redis 數據
docker exec heart-whisper-redis redis-cli INFO

# 手動保存 Redis 數據
docker exec heart-whisper-redis redis-cli SAVE
```

---

## 📝 定期維護任務

### 每日
- ✅ **自動執行**: 備份（凌晨 2:00）
- ✅ **自動執行**: 健康檢查（每 5 分鐘）
- ✅ **自動執行**: 日誌輪轉

### 每週
- 🔍 **手動檢查**: 運行 `monitor.sh` 檢查資源使用
- 🧹 **手動清理**: 檢查並清理 Docker 構建緩存

```bash
# 清理 Docker 緩存
docker builder prune -af
docker system prune -af
```

### 每月
- 📊 **手動檢查**: 審查日誌文件大小
- 💾 **手動檢查**: 驗證備份完整性
- 🔄 **手動執行**: 更新系統套件

```bash
# 更新系統
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get autoremove -y
```

---

## ⚠️ 待完成事項

### 🔐 SSL 證書配置
**狀態**: 等待域名
**說明**: 當前使用 HTTP，需要域名後才能配置 HTTPS

**配置步驟** (當有域名後):
1. 將域名 DNS 指向 `152.42.204.18`
2. 運行 SSL 配置腳本:
```bash
cd ~/heart-whisper-town
sudo bash setup-ssl.sh
```

### 📈 建議的額外優化
- [ ] 安裝 fail2ban 防止暴力破解
- [ ] 配置更詳細的監控告警
- [ ] 設置數據庫定期備份到外部存儲
- [ ] 配置 Nginx 日誌分析工具

---

## 🆘 故障排查

### 服務無法訪問
1. 檢查容器狀態: `docker ps -a`
2. 查看服務日誌: `docker-compose -f docker-compose.production.yml logs`
3. 檢查端口占用: `sudo ss -tlnp | grep -E '(80|443|4000)'`
4. 嘗試重啟服務: `docker-compose -f docker-compose.production.yml restart`

### 磁碟空間不足
1. 檢查磁碟使用: `df -h`
2. 清理 Docker 資源:
```bash
docker system prune -af --volumes
docker builder prune -af
```
3. 清理舊日誌:
```bash
sudo journalctl --vacuum-time=3d
find ~/heart-whisper-town/logs -name "*.log" -mtime +7 -delete
```

### 內存不足
1. 檢查內存使用: `free -h`
2. 重啟佔用內存較多的容器:
```bash
docker-compose -f docker-compose.production.yml restart backend
```
3. 如果問題持續，考慮升級服務器內存

### 服務啟動失敗
1. 查看詳細錯誤: `docker-compose -f docker-compose.production.yml logs --tail=100`
2. 檢查環境變數: `cat .env.production`
3. 驗證 Dockerfile: `docker-compose -f docker-compose.production.yml config`

---

## 📞 緊急聯繫

如果遇到無法解決的問題:
1. 查看日誌: `~/heart-whisper-town/logs/`
2. 運行診斷: `~/heart-whisper-town/monitor.sh`
3. 聯繫技術團隊

---

## 📚 相關文檔

- [專案 README](./README.md)
- [部署指南](./DEPLOYMENT.md)
- [功能文檔](./FEATURES.md)
- [遷移指南](./MIGRATION-GUIDE.md)

---

**最後更新**: 2025-10-10
**維護者**: Jesse
**版本**: v2.0 Production
