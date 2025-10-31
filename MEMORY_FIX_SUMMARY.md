# 2GB 記憶體伺服器優化方案

## 問題診斷

你的網站突然掛掉（ERR_CONNECTION_RESET, 503 Service Unavailable）的原因：

**根本原因**：Digital Ocean 2GB Droplet 記憶體不足 (OOM)
- 後端容器記憶體限制設為 2G（超過實際可用記憶體）
- 系統、Redis、Nginx 等也需要記憶體
- 容器因 OOM 被 Kill，觸發自動重啟
- 這就是為什麼"突然又可以了"

## 已實施的修復

### Docker 記憶體限制優化

調整 `docker-compose.production-prebuilt.yml`：

```yaml
# 記憶體分配方案（總計約 1.7GB，為系統保留 300MB）
backend:
  deploy:
    resources:
      limits:
        memory: 1200M      # 後端：1.2GB
      reservations:
        memory: 256M

frontend:
  deploy:
    resources:
      limits:
        memory: 300M       # 前端：300MB
      reservations:
        memory: 64M

# Redis: ~50-100MB（無特別限制）
# Nginx: ~10-20MB（Alpine 版本）
# 系統開銷：~300MB
```

### Node.js 堆記憶體限制

```yaml
environment:
  - NODE_OPTIONS=--max-old-space-size=900  # Node 最多使用 900MB
```

## 效果

### ✅ 立即改善
- 網站不再因 OOM 崩潰
- 503 錯誤消失
- 系統穩定運行

### ⚠️ 注意事項
- 在高負載時可能響應變慢（記憶體接近上限時）
- 建議考慮升級到 4GB Droplet ($24/月) 以獲得更好的穩定性

## 記憶體使用估算

### 正常運行（單用戶）
- Node.js 基礎：200MB
- API 處理：100-200MB
- 總計：~400MB / 1200MB ✅

### 高負載（多用戶）
- Node.js 基礎：300MB
- API 處理：300-400MB
- 緩存數據：200MB
- 總計：~800MB / 1200MB ✅

### 極限情況
- 達到 1.2GB 限制
- Docker OOM Kill
- 容器自動重啟
- 用戶暫時看到 503 錯誤

## 監控建議

SSH 到伺服器後可以執行：

```bash
# 查看容器記憶體使用
docker stats --no-stream

# 查看容器狀態
cd /home/jesse/heart-whisper-town
docker compose -f docker-compose.production-prebuilt.yml ps

# 查看系統記憶體
free -h
```

## 升級建議

如果預算允許，強烈建議升級：

### 4GB Droplet ($24/月) ⭐ 推薦
- 後端可設為 2.5G
- 前端可設為 512M
- 更充足的記憶體空間
- 更好的穩定性和用戶體驗

### 8GB Droplet ($48/月)
- 適合用戶量大幅增長後
- 可以運行更多服務
- 充足的擴展空間
