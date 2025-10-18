# 🧹 Docker 快取管理與預防指南

> 如何避免 Docker 建置快取無限增長

---

## 📊 問題分析

### 本次發現的問題
- **Docker 建置快取**: 8.96GB
- **未使用的映像**: 1.7GB
- **系統日誌**: 328MB
- **總計**: ~10GB 可清理空間

### 快取累積原因

1. **GitHub Actions CI/CD**
   - 每次 push 都會建立新的 layer cache
   - 快取存儲在 GitHub Container Registry
   - 沒有過期清理機制

2. **本地部署**
   - `docker compose pull` 會下載映像
   - 本地 buildx cache 會累積
   - 舊映像不會自動刪除

3. **開發階段建置**
   - 本地開發時的 `docker build`
   - 測試用的臨時映像
   - 失敗的建置殘留

---

## ✅ 解決方案總覽

### 短期方案（已實施）
- [x] 清理舊的 Docker 建置快取
- [x] 設置每週自動清理 cron job
- [x] 優化系統記憶體設定

### 中期方案（建議實施）
- [ ] 改進 GitHub Actions 快取策略
- [ ] 在 CI/CD 中加入自動清理步驟
- [ ] 優化 Dockerfile 減少 layer 數量

### 長期方案（可選）
- [ ] 實施映像大小監控
- [ ] 建立快取使用告警機制
- [ ] 考慮使用外部快取存儲

---

## 🛠️ 方案 1: 自動清理機制（已實施）

### 每週自動清理腳本

**位置**: `/home/jesse/docker-cleanup.sh`

**執行時間**: 每週日凌晨 2:00

**清理內容**:
- 停止的容器
- 未使用的映像（保留最近 7 天）
- 建置快取（保留最近 7 天）
- 未使用的網路

**手動執行**:
```bash
/home/jesse/docker-cleanup.sh
```

**查看清理日誌**:
```bash
tail -f /home/jesse/docker-cleanup.log
```

---

## 🚀 方案 2: 改進 GitHub Actions 快取策略

### 問題分析

**當前配置** (.github/workflows/deploy-production.yml:133-134):
```yaml
cache-from: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/${{ matrix.component }}:buildcache
cache-to: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/${{ matrix.component }}:buildcache,mode=max
```

**問題**:
- `mode=max` 會保存所有 layer（快取大）
- 沒有清理舊快取的機制
- Registry 中的快取會無限累積

### 改進方案 A: 使用 mode=min（推薦）

**優點**: 只快取最終映像的 layers，減少 ~60% 快取大小

**修改**:
```yaml
cache-to: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/${{ matrix.component }}:buildcache,mode=min
```

### 改進方案 B: 使用本地快取（更快但只限 GitHub）

**優點**: 不占用 registry 空間，建置更快

**配置**:
```yaml
- name: Build and push ${{ matrix.component }} image
  uses: docker/build-push-action@v5
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

### 改進方案 C: 混合策略（最佳平衡）

**配置**:
```yaml
# 從 GitHub Actions cache 讀取（快）
cache-from: |
  type=gha
  type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/${{ matrix.component }}:buildcache

# 同時寫入兩個快取
cache-to: |
  type=gha,mode=max
  type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/${{ matrix.component }}:buildcache,mode=min
```

**優點**:
- GitHub Actions cache: 快速建置
- Registry cache: 本地部署可用
- mode=min: 減少 registry 快取大小

---

## 🧹 方案 3: 在 CI/CD 中加入清理步驟

### 在部署後清理舊快取

**新增到 deploy job**:
```yaml
- name: Cleanup old Docker cache on server
  uses: appleboy/ssh-action@v1.0.0
  with:
    host: ${{ secrets.SERVER_HOST }}
    username: ${{ secrets.SERVER_USER }}
    key: ${{ secrets.SSH_PRIVATE_KEY }}
    script: |
      # 清理 7 天前的映像和快取
      docker image prune -af --filter "until=168h"
      docker builder prune -af --filter "until=168h"

      # 顯示清理後的狀態
      echo "清理後的 Docker 使用狀況："
      docker system df
```

---

## 📦 方案 4: 優化 Dockerfile（減少 layer）

### 後端 Dockerfile 優化建議

**當前問題**:
- 過多的 RUN 指令 = 更多 layers
- 不必要的臨時文件殘留

**優化示例**:
```dockerfile
# ❌ 不佳：多個 RUN 指令
RUN npm install
RUN npm run build
RUN rm -rf /tmp/*

# ✅ 良好：合併 RUN 指令
RUN npm install && \
    npm run build && \
    rm -rf /tmp/* /root/.npm

# ✅ 更好：多階段建置
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
CMD ["npm", "start"]
```

**效果**:
- 減少 layer 數量 = 減少快取大小
- 最終映像更小
- 建置快取更高效

---

## 📊 方案 5: 監控和告警

### 設置磁碟使用告警

**創建監控腳本**: `/home/jesse/disk-monitor.sh`
```bash
#!/bin/bash

THRESHOLD=80
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')

if [ $DISK_USAGE -gt $THRESHOLD ]; then
  echo "⚠️ 磁碟使用率過高: ${DISK_USAGE}%"
  docker system df
  # 可以在這裡添加通知邏輯（如發送郵件）
fi
```

**添加到 crontab**:
```bash
# 每天檢查一次
0 9 * * * /home/jesse/disk-monitor.sh >> /home/jesse/disk-monitor.log 2>&1
```

---

## 🎯 推薦實施計劃

### 立即實施（高優先級）

✅ **已完成**:
1. 設置每週自動清理 cron job
2. 優化系統記憶體設定（swappiness）
3. 清理舊日誌和映像

### 本週實施

1. **修改 GitHub Actions 快取策略**
   ```bash
   # 修改 .github/workflows/deploy-production.yml
   # 將 mode=max 改為 mode=min（第 134 行）

   git add .github/workflows/deploy-production.yml
   git commit -m "optimize: reduce Docker cache size in CI/CD"
   git push origin production
   ```

2. **在 CI/CD 加入清理步驟**
   ```bash
   # 參考上面「方案 3」的配置
   # 在 deploy job 最後加入清理步驟
   ```

### 下個月實施

1. **優化 Dockerfile**
   - 審查 backend/Dockerfile
   - 審查 frontend/Dockerfile
   - 實施多階段建置

2. **設置監控**
   - 創建磁碟監控腳本
   - 設置告警機制

---

## 📋 檢查清單

### 每週檢查（自動化）
- [x] Docker 資源清理（cron job）
- [ ] 磁碟使用率監控

### 每月檢查（手動）
- [ ] GitHub Container Registry 快取大小
- [ ] 檢查 Docker 日誌大小
- [ ] 審查未使用的映像

### 每季檢查（手動）
- [ ] 優化 Dockerfile
- [ ] 審查 CI/CD 流程
- [ ] 檢查系統資源配置

---

## 🔍 診斷指令

### 查看 Docker 資源使用
```bash
docker system df -v
```

### 查看建置快取詳情
```bash
docker buildx du
```

### 查看所有映像（含中間層）
```bash
docker images -a
```

### 手動清理（謹慎使用）
```bash
# 清理所有未使用資源
docker system prune -a --volumes

# 只清理建置快取
docker builder prune -af

# 清理 7 天前的資源
docker image prune -af --filter "until=168h"
```

---

## ⚙️ 系統資源限制建議

### Docker Daemon 配置

**位置**: `/etc/docker/daemon.json`

**建議配置**:
```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "builder": {
    "gc": {
      "enabled": true,
      "defaultKeepStorage": "2GB",
      "policy": [
        {"keepStorage": "2GB", "filter": ["unused-for=168h"]}
      ]
    }
  }
}
```

**說明**:
- 限制日誌大小（每個容器最多 30MB）
- 啟用建置快取垃圾回收
- 保留最近 7 天的快取
- 總快取限制 2GB

**套用配置**:
```bash
sudo systemctl restart docker
```

---

## 📚 參考資源

- [Docker BuildKit Cache](https://docs.docker.com/build/cache/)
- [GitHub Actions Cache](https://docs.docker.com/build/ci/github-actions/cache/)
- [Docker System Prune](https://docs.docker.com/engine/reference/commandline/system_prune/)

---

## 🤖 自動化總結

### 已設置的自動化
1. ✅ 每週日清理 Docker 資源
2. ✅ 系統記憶體優化（swappiness=10）
3. ✅ 日誌自動清理（journalctl 7天）

### 建議新增的自動化
1. 📋 GitHub Actions 自動清理舊快取
2. 📋 每日磁碟使用監控
3. 📋 Docker daemon 自動垃圾回收

---

**最後更新**: 2025-10-18
**維護者**: Heart Whisper Town Team
**協助**: Claude Code
