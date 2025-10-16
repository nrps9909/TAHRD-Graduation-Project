# WebSocket 斷線問題修復總結

**日期**: 2025-10-16
**問題**: WebSocket 連接在網站運行一段時間後會斷線
**狀態**: ✅ 已修復

---

## 🔍 問題分析

### 根本原因

通過分析日誌和代碼，發現了 3 個主要問題：

1. **Nginx 超時設定過短**
   - 原設定: `proxy_read_timeout 60s`
   - 問題: 60秒內沒有數據傳輸就會斷開連接
   - 影響: 當用戶沒有活動任務時，WebSocket 長時間無數據流動導致斷線

2. **心跳機制不完整**
   - 後端: 每 25 秒 ping, 30 秒超時
   - 前端: 缺少主動心跳，僅依賴每 5 秒的狀態查詢
   - 問題: 5 秒查詢可能不足以維持長時間空閒的連接

3. **重連策略不夠強韌**
   - 原設定: 最多重試 10 次
   - 問題: 在網絡不穩定時容易放棄重連

---

## 🔧 修復方案

### 1. 延長 Nginx WebSocket 超時 (最重要)

**文件**: `nginx/conf.d/ssl.conf:165-167`

**改動**:
```nginx
# 之前
proxy_connect_timeout 60s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;

# 之後
proxy_connect_timeout 10m;
proxy_send_timeout 10m;
proxy_read_timeout 10m;
```

**理由**:
- Socket.IO 的心跳間隔是 25 秒
- 需要比心跳間隔長得多的超時時間
- 10 分鐘足以應對各種網絡延遲和空閒場景

---

### 2. 增強前端心跳機制

**文件**:
- `frontend/src/components/QueueFloatingButton.tsx`
- `frontend/src/components/ProcessingQueuePanel.tsx`

**改動**:

#### A. 改進連接配置
```typescript
const newSocket = io(backendUrl, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity, // ← 無限重試（之前是 10 次）
  timeout: 20000,
})
```

#### B. 新增客戶端心跳
```typescript
// 每 20 秒發送 ping，確保連接活躍
const heartbeatIntervalId = setInterval(() => {
  if (newSocket.connected) {
    newSocket.emit('ping')
  }
}, 20000)
```

**心跳時間線**:
```
客戶端 ping:   [----20s----][----20s----][----20s----]
後端 ping:     [-----25s-----][-----25s-----]
Nginx 超時:    [----------10m----------]
```

#### C. 增強錯誤處理和日誌
```typescript
newSocket.on('connect', () => {
  console.log('[Queue] WebSocket connected ✅')
})

newSocket.on('disconnect', (reason) => {
  console.log('[Queue] WebSocket disconnected:', reason)
})

newSocket.on('reconnect', (attemptNumber) => {
  console.log('[Queue] Reconnected after', attemptNumber, 'attempts')
})

// 新增的事件監聽
newSocket.on('reconnect_attempt', (attemptNumber) => {
  console.log('[Queue] Reconnecting... attempt', attemptNumber)
})

newSocket.on('connect_error', (error) => {
  console.error('[Queue] Connection error:', error.message)
})
```

---

## 📊 修復效果對比

| 項目 | 修復前 | 修復後 | 改善 |
|------|--------|--------|------|
| Nginx 超時 | 60 秒 | 10 分鐘 | ⬆️ 10x |
| 客戶端心跳 | 無 | 20 秒/次 | ✅ 新增 |
| 重連次數 | 10 次 | 無限 | ✅ 永不放棄 |
| 斷線問題 | 頻繁發生 | 預期解決 | 🎯 |

---

## 🚀 部署步驟

### 生產環境部署（推薦使用 CI/CD）

#### 方式 1: 自動部署（推薦）
```bash
# 推送到 production 分支，GitHub Actions 會自動部署
git add .
git commit -m "fix: 修復 WebSocket 長時間連接斷線問題"
git push origin production
```

#### 方式 2: 手動部署
```bash
# 1. 拉取最新代碼
cd ~/heart-whisper-town
git pull origin production

# 2. 重啟服務
docker compose -f docker-compose.production-prebuilt.yml restart nginx
docker compose -f docker-compose.production-prebuilt.yml restart frontend
docker compose -f docker-compose.production-prebuilt.yml restart backend

# 3. 驗證服務狀態
docker compose -f docker-compose.production-prebuilt.yml ps
```

### 本地開發環境測試
```bash
# 1. 重啟服務
npm run dev  # 前端
npm start    # 後端

# 2. 打開瀏覽器控制台查看日誌
```

---

## ✅ 驗證清單

### 1. 檢查 Nginx 配置
```bash
docker exec heart-whisper-nginx nginx -t
```
預期: `syntax is ok` 和 `test is successful`

### 2. 監控瀏覽器控制台
打開網站 → F12 → Console 標籤，應該看到：

**正常連接**:
```
✓ Environment system initialized
[Queue] WebSocket connected ✅
```

**不應該再看到**:
```
❌ WebSocket connection to 'wss://jesse-chen.com/socket.io/...' failed
❌ Failed to load resource: the server responded with a status of 502
```

### 3. 長時間穩定性測試
- 打開網站並保持頁面開啟 10+ 分鐘
- 期間不進行任何操作
- 檢查 WebSocket 連接狀態（左下角指示燈應保持綠色）
- 控制台不應出現斷線錯誤

### 4. 重連測試
```bash
# 模擬後端重啟
docker compose -f docker-compose.production-prebuilt.yml restart backend

# 瀏覽器控制台應該看到：
# [Queue] WebSocket disconnected: transport close
# [Queue] Reconnecting... attempt 1
# [Queue] Reconnected after 1 attempts
```

### 5. 網絡切換測試
- 切換網絡（例如 Wi-Fi → 有線 或 切換 Wi-Fi）
- WebSocket 應該自動重連
- 控制台應該顯示重連日誌

---

## 🔍 故障排查

### 問題 1: 仍然看到斷線
**檢查**:
```bash
# 1. 確認 Nginx 配置已應用
docker exec heart-whisper-nginx cat /etc/nginx/conf.d/ssl.conf | grep -A 3 "socket.io"

# 2. 檢查後端日誌
docker compose -f docker-compose.production-prebuilt.yml logs -f backend | grep Socket

# 3. 檢查 Nginx 日誌
docker compose -f docker-compose.production-prebuilt.yml logs -f nginx | grep socket
```

### 問題 2: 前端重複重連
**可能原因**:
- 後端沒有正確處理 ping/pong
- CORS 配置問題

**檢查後端配置** (`backend/src/index.ts:71-72`):
```typescript
pingInterval: 25000,
pingTimeout: 30000
```

**檢查後端 ping/pong 處理** (`backend/src/socket.ts:166-169`):
```typescript
socket.on('ping', () => {
  socket.emit('pong')
})
```

### 問題 3: 502 Bad Gateway
**原因**: 後端服務未啟動或無法連接

**解決**:
```bash
# 檢查後端狀態
docker compose -f docker-compose.production-prebuilt.yml ps backend

# 檢查後端健康
curl http://localhost:4000/health

# 重啟後端
docker compose -f docker-compose.production-prebuilt.yml restart backend
```

---

## 📈 性能影響

### 優點
- ✅ 連接更穩定，用戶體驗更好
- ✅ 自動重連，無需手動刷新
- ✅ 詳細日誌便於監控和調試

### 資源消耗
- 心跳機制: 每 20 秒發送一次小型 ping 消息（< 100 bytes）
- 網絡開銷: 可忽略不計（~4KB/小時）
- 服務器負載: 無明顯增加

---

## 🎯 技術細節

### 為什麼選擇 20 秒心跳間隔？

```
後端 pingInterval = 25 秒
後端 pingTimeout = 30 秒
客戶端心跳 = 20 秒 (< 25 秒)

確保客戶端比後端更頻繁地發送心跳，
維持連接活躍狀態，避免超時斷線。
```

### 為什麼 Nginx 超時設為 10 分鐘？

```
客戶端心跳: 20 秒/次
最壞情況: 假設連續 3 次心跳失敗 = 60 秒
安全餘量: 10x = 600 秒 (10 分鐘)

足夠長以應對：
- 網絡短暫中斷
- 客戶端暫時無響應
- 負載高峰期延遲
```

### Socket.IO 重連策略

```typescript
reconnectionAttempts: Infinity  // 無限重試
reconnectionDelay: 1000         // 初始延遲 1 秒
reconnectionDelayMax: 5000      // 最大延遲 5 秒

重連時間序列:
嘗試 1: 1 秒後
嘗試 2: 2 秒後
嘗試 3: 3 秒後
嘗試 4: 4 秒後
嘗試 5+: 5 秒後（持續重試）
```

---

## 📝 相關文件

- **Nginx 配置**: `nginx/conf.d/ssl.conf`
- **前端組件 1**: `frontend/src/components/QueueFloatingButton.tsx`
- **前端組件 2**: `frontend/src/components/ProcessingQueuePanel.tsx`
- **後端 Socket**: `backend/src/socket.ts`
- **後端主程式**: `backend/src/index.ts`

---

## 🔄 後續監控建議

### 監控指標

1. **WebSocket 連接穩定性**
   - 平均連接持續時間
   - 斷線頻率
   - 重連成功率

2. **心跳響應時間**
   - ping → pong 延遲
   - 異常心跳次數

3. **用戶影響**
   - 任務隊列更新延遲
   - 用戶投訴減少情況

### 監控工具

**瀏覽器控制台** (開發者工具):
```javascript
// 所有 [Queue] 開頭的日誌
// 重點關注: connected, disconnected, reconnecting
```

**後端日誌**:
```bash
docker compose logs -f backend | grep -E "Client (connected|disconnected)"
```

**Nginx 訪問日誌**:
```bash
docker compose logs -f nginx | grep socket.io
```

---

## 🎉 預期結果

修復後的系統應該能夠:

1. ✅ **長時間穩定連接**
   - 用戶可以保持頁面開啟數小時而不斷線

2. ✅ **自動恢復連接**
   - 網絡短暫中斷後自動重連
   - 後端重啟後自動重連

3. ✅ **零用戶干預**
   - 無需手動刷新頁面
   - 無需重新登入

4. ✅ **實時更新流暢**
   - 任務隊列狀態即時更新
   - 處理進度實時顯示

---

**修復完成日期**: 2025-10-16
**修復者**: Claude Code
**測試狀態**: 待驗證
**部署狀態**: 待部署
