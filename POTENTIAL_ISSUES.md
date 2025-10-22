# 潛在問題報告

生成時間：2025-10-22
生成者：Claude Code

## 🔴 高優先級（已處理）

### 1. WebSocket 連接錯誤
- **狀態**：✅ 已修復（等待 CI/CD 部署）
- **問題**：前端映像構建時環境變數未正確注入
- **修復**：更新 `.github/workflows/deploy-production.yml` 中的 VITE_WS_URL
- **預計解決時間**：5-10 分鐘（CI/CD 完成後）

---

## 🟡 中優先級（建議修復）

### 2. 缺少 Favicon
- **現象**：`/favicon.ico` 返回 404
- **影響**：瀏覽器控制台出現錯誤，每次載入都會請求
- **建議修復**：

```bash
# 方案 1：添加 favicon（推薦）
# 在 frontend/public/ 目錄添加 favicon.ico

# 方案 2：在 HTML 中禁用 favicon
# 在 index.html 中添加：
<link rel="icon" href="data:;base64,=" />
```

### 3. Three.js Context Lost
- **現象**：WebGL 渲染上下文丟失
- **可能原因**：
  - 資源載入失敗導致
  - GPU 記憶體不足
  - 瀏覽器標籤切換
- **建議**：
  - 等待 WebSocket 修復後觀察是否仍然出現
  - 如果持續出現，需要添加 WebGL 上下文恢復處理

```typescript
// 在 Three.js 場景中添加上下文恢復
renderer.domElement.addEventListener('webglcontextlost', (event) => {
  event.preventDefault()
  console.warn('WebGL context lost, attempting to restore...')
})

renderer.domElement.addEventListener('webglcontextrestored', () => {
  console.log('WebGL context restored')
  // 重新初始化場景
})
```

### 4. 錯誤的 public/index.html 文件
- **問題**：`frontend/public/index.html` 是 Kenney 角色預覽頁面
- **影響**：可能造成路由混淆
- **建議**：刪除或移動到其他位置

```bash
# 建議操作
mv frontend/public/index.html frontend/public/kenney-preview.html
```

---

## 🟢 低優先級（可忽略）

### 5. Vite Preload 警告
- **現象**：資源預載入但未在幾秒內使用
- **說明**：這是 Vite 代碼分割策略的正常副作用
- **影響**：無實際影響，可忽略
- **不需要修復**

---

## 📊 部署後驗證清單

部署完成後，請檢查以下項目：

### ✅ 必須驗證
- [ ] WebSocket 連接成功（檢查控制台無 `ws://localhost` 錯誤）
- [ ] 頁面樣式正常顯示（深色主題）
- [ ] 3D 場景正常渲染（無 Context Lost）

### 📝 可選驗證
- [ ] Favicon 是否正常顯示
- [ ] 無其他 404 錯誤
- [ ] 所有資源載入正常

---

## 🔧 手動測試命令

```bash
# 1. 檢查容器狀態
docker ps

# 2. 查看前端日誌
docker logs heart-whisper-frontend

# 3. 查看後端日誌
docker logs heart-whisper-backend

# 4. 測試 WebSocket 連接
# 在瀏覽器控制台執行：
new WebSocket('wss://jesse-chen.com/socket.io/')

# 5. 測試健康檢查
curl https://jesse-chen.com/health
```

---

## 📚 相關文檔

- CI/CD 配置：`.github/workflows/deploy-production.yml`
- 前端配置：`frontend/vite.config.ts`
- WebSocket 配置：`frontend/src/components/QueueFloatingButton.tsx:52`

---

**生成工具**：Claude Code
**最後更新**：2025-10-22
