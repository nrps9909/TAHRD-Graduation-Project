# 🔄 專案遷移指南：從 Root 到用戶目錄

## 📋 問題說明

如果您使用 `deploy.sh` 將專案安裝在了 root 目錄（`/opt/heart-whisper-town`），但現在想將其遷移到用戶目錄（如 `/home/jesse/heart-whisper-town`），請按照以下步驟操作。

## 🎯 遷移目標

- **舊位置**: `/opt/heart-whisper-town` (root 權限)
- **新位置**: `/home/jesse/heart-whisper-town` (用戶權限)
- **清理空間**: 移除重複的 Docker 映像和容器
- **權限配置**: 讓 jesse 用戶可以管理 Docker

## 🚀 快速遷移步驟

### 方法一：一鍵遠程執行（最簡單）

從**本地機器**運行：

```bash
cd /home/jesse/Project/TAHRD-Graduation-Project
./remote-migrate.sh
```

這個腳本會自動：
- 檢測 SSH 配置
- 上傳遷移腳本
- 執行遷移
- 提供後續指令

### 方法二：使用自動化腳本（推薦）

```bash
# 1. 上傳遷移腳本到服務器
scp migrate-to-user.sh heart-whisper-town:/tmp/
# 或使用 IP: scp migrate-to-user.sh jesse@152.42.204.18:/tmp/

# 2. SSH 連接到服務器
ssh heart-whisper-town

# 3. 執行遷移腳本（需要 sudo）
sudo bash /tmp/migrate-to-user.sh jesse

# 4. 登出後重新登入以套用 docker 群組變更
exit
ssh heart-whisper-town

# 5. 進入專案目錄並啟動服務
cd ~/heart-whisper-town
docker-compose -f docker-compose.production.yml up -d --build
```

### 方法二：手動步驟

如果您想更細緻地控制每個步驟：

#### 步驟 1: 停止舊服務

```bash
sudo su -
cd /opt/heart-whisper-town
docker-compose -f docker-compose.production.yml down -v
```

#### 步驟 2: 徹底清理 Docker 資源（節省空間）

```bash
# 查看當前 Docker 資源使用
docker system df

# 停止所有容器
docker stop $(docker ps -aq)

# 刪除所有容器
docker rm $(docker ps -aq)

# 刪除所有映像
docker rmi $(docker images -q) -f

# 刪除所有卷（包括命名卷）
docker volume rm $(docker volume ls -q)

# 清理網絡
docker network prune -f

# 清理構建緩存
docker builder prune -af

# 執行系統級清理
docker system prune -af --volumes

# 查看清理後的空間
docker system df
```

**⚠️ 注意**: 這將刪除**所有** Docker 資源，包括非 Heart Whisper Town 的容器。如果服務器上有其他 Docker 應用，請謹慎操作！

#### 步驟 3: 移動專案

```bash
# 移動專案到 jesse 的目錄
mv /opt/heart-whisper-town /home/jesse/heart-whisper-town

# 修改所有權
chown -R jesse:jesse /home/jesse/heart-whisper-town

# 移除舊目錄（如果還存在）
rm -rf /opt/heart-whisper-town
```

#### 步驟 4: 配置 Docker 權限

```bash
# 將 jesse 加入 docker 群組
usermod -aG docker jesse

# 確認群組配置
groups jesse
```

#### 步驟 5: 切換到 jesse 用戶

```bash
# 登出 root
exit

# 重新以 jesse 登入（或切換用戶）
su - jesse

# 確認 docker 權限
docker ps
```

#### 步驟 6: 啟動服務

```bash
cd ~/heart-whisper-town

# 檢查環境配置
ls -la .env.production

# 如果需要，編輯環境配置
nano .env.production

# 啟動服務
docker-compose -f docker-compose.production.yml up -d --build

# 查看服務狀態
docker-compose -f docker-compose.production.yml ps

# 查看日誌
docker-compose -f docker-compose.production.yml logs -f
```

## 📊 驗證遷移結果

### 檢查磁碟空間

```bash
# 檢查整體磁碟使用
df -h

# 檢查 Docker 磁碟使用
docker system df

# 檢查專案目錄大小
du -sh ~/heart-whisper-town
```

### 檢查服務狀態

```bash
# 檢查所有容器
docker ps -a

# 檢查網絡連接
curl http://localhost/health

# 檢查服務日誌
docker-compose -f docker-compose.production.yml logs --tail=50
```

### 檢查權限

```bash
# 確認文件所有權
ls -la ~/heart-whisper-town/

# 確認 Docker 權限
docker info

# 確認用戶群組
groups
```

## 🛠️ 常見問題

### Q1: docker 命令報權限錯誤

**問題**: `permission denied while trying to connect to the Docker daemon socket`

**解決方案**:
```bash
# 確認已加入 docker 群組
groups | grep docker

# 如果沒有，請執行
sudo usermod -aG docker $USER

# 然後登出並重新登入
exit
```

### Q2: 服務無法啟動

**檢查步驟**:
```bash
# 1. 檢查環境配置
cat .env.production

# 2. 檢查容器日誌
docker-compose -f docker-compose.production.yml logs

# 3. 檢查端口占用
sudo netstat -tlnp | grep -E '(80|443|4000)'

# 4. 重新構建
docker-compose -f docker-compose.production.yml up -d --build --force-recreate
```

### Q3: 磁碟空間不足

**清理建議**:
```bash
# 清理 Docker 系統
docker system prune -a --volumes

# 清理 Git 歷史（如果專案很大）
cd ~/heart-whisper-town
git gc --aggressive --prune=now

# 查看大文件
du -ah ~/heart-whisper-town | sort -rh | head -20
```

### Q4: 想完全重新開始

```bash
# 停止並移除所有容器
docker-compose -f docker-compose.production.yml down -v

# 移除專案目錄
rm -rf ~/heart-whisper-town

# 重新克隆專案
git clone -b production YOUR_REPO_URL ~/heart-whisper-town

# 重新部署
cd ~/heart-whisper-town
bash deploy-user.sh
```

## 📝 未來部署建議

### 使用用戶部署腳本

為避免再次安裝到 root 目錄，使用專門的用戶部署腳本：

```bash
cd ~/heart-whisper-town
bash deploy-user.sh
```

### 設置自動更新腳本

創建 `~/update.sh`:

```bash
#!/bin/bash
cd ~/heart-whisper-town
git pull origin production
docker-compose -f docker-compose.production.yml up -d --build
docker image prune -f
```

使其可執行：
```bash
chmod +x ~/update.sh
```

### 設置開機自動啟動

添加到 crontab：

```bash
crontab -e
```

添加以下行：
```
@reboot cd /home/jesse/heart-whisper-town && docker-compose -f docker-compose.production.yml up -d
```

## ✨ migrate-to-user.sh 腳本功能

該腳本會自動執行：

### 🧹 徹底清理
- ✅ 停止所有運行中的容器
- ✅ 刪除所有 Docker 容器
- ✅ 刪除所有 Docker 映像
- ✅ 刪除所有 Docker 卷（包括命名卷）
- ✅ 清理 Docker 網絡和構建緩存
- ✅ 刪除 root 的 npm 緩存
- ✅ 清理系統臨時文件
- ✅ 清理舊日誌文件（保留最近7天）
- ✅ 清理 apt 緩存和不需要的套件

### 📦 遷移與配置
- ✅ 移動專案從 `/opt/heart-whisper-town` 到 `/home/jesse/heart-whisper-town`
- ✅ 修改所有文件所有權為 jesse
- ✅ 將 jesse 添加到 docker 群組
- ✅ 設置正確的文件權限
- ✅ 自動刪除舊專案目錄

### 📊 報告
- ✅ 顯示遷移前後磁碟使用對比
- ✅ 顯示 Docker 資源使用情況
- ✅ 提供詳細的後續操作指引

## 🎉 遷移完成檢查清單

- [ ] 舊服務已停止
- [ ] **所有** Docker 資源已徹底清理
- [ ] 專案已移至用戶目錄
- [ ] 文件權限正確（jesse:jesse）
- [ ] jesse 用戶可執行 docker 命令（重新登入後）
- [ ] 新服務成功啟動
- [ ] 健康檢查通過（http://YOUR_IP/health）
- [ ] 可從外部訪問服務
- [ ] 磁碟空間充足（至少 20% 可用）
- [ ] 舊的 `/opt/heart-whisper-town` 已完全刪除
- [ ] Docker 映像和容器已清空
- [ ] 系統緩存已清理

## 📞 需要幫助？

如果遇到問題，請檢查：

1. **服務日誌**: `docker-compose -f docker-compose.production.yml logs -f`
2. **系統日誌**: `sudo journalctl -xe`
3. **磁碟空間**: `df -h`
4. **Docker 狀態**: `docker info`

---

**最後更新**: 2025-10-10

