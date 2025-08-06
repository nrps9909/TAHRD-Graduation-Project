# CORS 設定說明

## 問題描述
當前端應用運行在不同的端口時（例如 3001 而不是預設的 3000），可能會遇到 CORS 錯誤。

## 解決方案
後端已經更新為支援多個 origins：

### 預設支援的端口
- `http://localhost:3000` - Create React App 預設端口
- `http://localhost:3001` - 當 3000 被佔用時的備用端口
- `http://localhost:5173` - Vite 預設端口
- 環境變數中設定的 `FRONTEND_URL`

### 開發環境特性
在開發環境中（`NODE_ENV=development`），後端會自動允許所有來自 localhost 的請求，無需額外設定。

### 生產環境設定
在生產環境中，請確保設定 `FRONTEND_URL` 環境變數為實際的前端 URL：

```bash
FRONTEND_URL=https://your-frontend-domain.com
```

### 新增其他允許的 origins
如果需要支援其他端口或域名，可以修改 `backend/src/index.ts` 中的 `allowedOrigins` 陣列：

```typescript
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://localhost:8080', // 新增的端口
  process.env.FRONTEND_URL
].filter(Boolean)
```

### 疑難排解
1. 確保後端服務已重新啟動
2. 檢查瀏覽器開發者工具中的網路請求
3. 確認前端的 API 端點設定正確（應該是 `http://localhost:4000`）