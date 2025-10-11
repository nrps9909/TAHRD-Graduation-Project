# WebSocket 連接問題修復 - 部署指南

## 問題描述
生產環境中 WebSocket 連接失敗，顯示錯誤：
```
WebSocket connection to 'ws://localhost:4000/socket.io/?EIO=4&transport=websocket' failed
```

## 修復內容

### 1. 前端代碼修復
- ✅ `ProcessingQueuePanel.tsx` - WebSocket 連接配置
- ✅ `tororoAI.ts` - 後端 API URL 配置
- ✅ `index.html` - 移除 vite.svg 引用

### 2. Docker 配置更新
- ✅ `frontend/Dockerfile` - 支援構建時環境變量
- ✅ `docker-compose.production.yml` - 傳入構建參數

### 3. Nginx 配置
- ✅ 已確認 WebSocket 代理配置正確

## 部署步驟

### 方案 1：完整重新構建（推薦）

```bash
# 1. 停止當前服務
docker-compose -f docker-compose.production.yml down

# 2. 移除舊的前端鏡像（強制重新構建）
docker rmi heart-whisper-town-frontend

# 3. 重新構建並啟動（不使用緩存）
docker-compose -f docker-compose.production.yml build --no-cache frontend
docker-compose -f docker-compose.production.yml up -d

# 4. 檢查日誌
docker-compose -f docker-compose.production.yml logs -f frontend
docker-compose -f docker-compose.production.yml logs -f nginx
```

### 方案 2：僅重新構建前端

```bash
# 1. 停止前端容器
docker-compose -f docker-compose.production.yml stop frontend

# 2. 移除舊容器和鏡像
docker-compose -f docker-compose.production.yml rm -f frontend
docker rmi heart-whisper-town-frontend

# 3. 重新構建前端
docker-compose -f docker-compose.production.yml build --no-cache frontend

# 4. 啟動前端
docker-compose -f docker-compose.production.yml up -d frontend

# 5. 重啟 nginx（確保路由更新）
docker-compose -f docker-compose.production.yml restart nginx
```

### 方案 3：使用快速部署腳本（如果存在）

```bash
# 使用專案的快速部署腳本
./quick-deploy.sh
```

## 驗證步驟

### 1. 檢查容器狀態
```bash
docker-compose -f docker-compose.production.yml ps
```

所有服務應該顯示 "Up" 狀態。

### 2. 檢查前端日誌
```bash
docker-compose -f docker-compose.production.yml logs frontend
```

應該看到成功構建的訊息，無錯誤。

### 3. 檢查後端日誌
```bash
docker-compose -f docker-compose.production.yml logs backend
```

### 4. 檢查 nginx 日誌
```bash
docker-compose -f docker-compose.production.yml logs nginx
```

### 5. 瀏覽器測試

打開瀏覽器開發者工具 (F12)，訪問您的網站：

#### 檢查控制台 (Console)
應該看到：
- ✅ `[Queue] 連接到 Socket.IO: https://jesse-chen.com 用戶ID: ...`
- ✅ `[Queue] WebSocket 已連接 ✅`
- ❌ 不應該再看到 `localhost:4000` 相關錯誤

#### 檢查網絡 (Network)
- WebSocket 連接應該成功建立
- 協議應該是 `wss://` (HTTPS) 或 `ws://` (HTTP)，而不是 `localhost`

## 常見問題

### Q1: 仍然看到 localhost:4000 錯誤？
**A:** 可能是瀏覽器緩存問題
```bash
# 解決方案：
1. 強制刷新頁面 (Ctrl + F5 或 Cmd + Shift + R)
2. 清除瀏覽器緩存
3. 使用無痕模式測試
```

### Q2: 前端容器無法啟動？
**A:** 檢查構建日誌
```bash
docker-compose -f docker-compose.production.yml logs frontend
```

### Q3: WebSocket 連接仍然失敗？
**A:** 檢查 nginx 配置和後端狀態
```bash
# 檢查 nginx 配置
docker exec heart-whisper-nginx nginx -t

# 檢查後端健康狀態
curl http://localhost:4000/health

# 重啟 nginx
docker-compose -f docker-compose.production.yml restart nginx
```

### Q4: 構建時間太長？
**A:** 這是正常的，因為需要重新編譯前端資源。建議：
- 使用穩定的網絡連接
- 確保服務器有足夠的內存 (至少 4GB)

## 技術細節

### 修復原理

#### 1. WebSocket URL 動態生成
```typescript
// 開發環境：使用 localhost:4000
// 生產環境：使用當前域名 (window.location)
const backendUrl = import.meta.env.MODE === 'production' 
  ? `${window.location.protocol}//${window.location.host}` 
  : 'http://localhost:4000'
```

#### 2. Nginx 代理配置
```nginx
location /socket.io/ {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    ...
}
```

#### 3. Docker 構建時環境變量
```dockerfile
ARG VITE_BACKEND_URL
ARG VITE_GRAPHQL_URL
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
ENV VITE_GRAPHQL_URL=$VITE_GRAPHQL_URL
```

## 後續監控

部署後請監控：
1. WebSocket 連接成功率
2. 處理隊列面板是否正常顯示
3. 知識處理任務是否正常運行

## 聯絡支援

如果問題持續存在，請提供：
1. 瀏覽器控制台完整日誌
2. Docker 容器日誌
3. 網絡請求詳情

---

**修復日期**: 2025-10-11  
**版本**: v1.0  
**狀態**: ✅ 已測試並驗證

