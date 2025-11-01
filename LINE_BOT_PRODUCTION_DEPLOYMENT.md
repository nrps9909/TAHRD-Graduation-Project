# LINE Bot 生產環境部署指南

## 📋 概述

本指南說明如何將 LINE Bot 部署到生產環境（jesse-chen.com）。

## ✅ 已完成的配置

### 本地配置
- ✅ `.env.production` 已加入 LINE Bot 配置
- ✅ `.env.production.example` 已更新
- ✅ LINE Bot 路由已整合到後端 (`/api/line/webhook`)
- ✅ TypeScript 編譯通過
- ✅ GitHub Actions CI/CD 配置完整

### LINE Bot 配置
- **Channel ID**: `2008402648`
- **Channel Secret**: `5889ed858081395512721d2e7d98cb26`
- **Channel Access Token**: 已配置（172 字元）

## 🚀 部署步驟

### 步驟 1：確認本地測試通過

在 merge 到 production 之前，請先在開發環境測試：

```bash
# 啟動本地開發環境
npm run dev

# 在另一個終端啟動 ngrok
ngrok http 4000

# 設定 Webhook URL（開發環境）
https://your-ngrok-url.ngrok.io/api/line/webhook
```

測試流程：
1. 用 LINE 掃描 QR Code 加入白噗噗
2. 傳送 `/login` 測試登入
3. 上傳測試知識
4. 確認回應正常

### 步驟 2：Merge 到 production 分支

```bash
# 確保在正確的分支
git checkout main  # 或你當前的開發分支

# 提交所有變更
git add .
git commit -m "feat: 新增 LINE Bot 整合功能

- 實作 LINE Bot webhook 接收與驗證
- 實作 Email + Password 登入系統
- 整合知識上傳服務
- 支援白噗噗風格回應
- 更新生產環境配置"

# Merge 到 production
git checkout production
git merge main  # 或你的開發分支

# 推送到 GitHub（觸發自動部署）
git push origin production
```

### 步驟 3：GitHub Actions 自動部署

推送後，GitHub Actions 會自動：

1. ✅ 測試和驗證程式碼
2. ✅ 構建 Docker 映像
3. ✅ 推送到 GitHub Container Registry
4. ✅ 部署到生產伺服器
5. ✅ 執行健康檢查

監控部署進度：
- 前往 GitHub repository → Actions 分頁
- 查看 "Build, Test and Deploy to Production" workflow

### 步驟 4：更新伺服器環境變數

**重要**：由於 `.env.production` 不會被 git 追蹤，需要手動更新伺服器上的環境變數。

#### 選項 A：SSH 登入伺服器手動更新（推薦）

```bash
# SSH 登入伺服器
ssh jesse@jesse-chen.com

# 進入專案目錄
cd ~/heart-whisper-town

# 編輯 .env.production
nano .env.production

# 加入以下內容到檔案最後：
# ----- LINE Bot 設定 -----
LINE_CHANNEL_SECRET=5889ed858081395512721d2e7d98cb26
LINE_CHANNEL_ACCESS_TOKEN=MyNItQ7xx9cp23qShbZvjrJu4kERyRZBqhwTwjpQfN7gSwiQjLIf8RbCgPa+c3/JuOPy95EJY5f3ntnQvIrx44WDp2ngaUiRIJk1rQpnsViexQ5B4kkf/OeASiBr3iirq4uBo8j11VIM0bbBEz+CsQdB04t89/1O/w1cDnyilFU=

# 儲存並離開（Ctrl+X, Y, Enter）

# 重新啟動容器以載入新環境變數
docker compose -f docker-compose.production-prebuilt.yml restart backend

# 驗證容器狀態
docker compose -f docker-compose.production-prebuilt.yml ps
```

#### 選項 B：使用 GitHub Secrets（需要修改 CI/CD）

如果你希望透過 GitHub Actions 管理敏感資訊：

1. 在 GitHub repository 設定 Secrets：
   - `LINE_CHANNEL_SECRET`
   - `LINE_CHANNEL_ACCESS_TOKEN`

2. 修改 `.github/workflows/deploy-production.yml`，在部署腳本中寫入環境變數

### 步驟 5：設定生產環境 Webhook URL

1. 前往 [LINE Developers Console](https://developers.line.biz/console/)
2. 選擇你的 Channel（白噗噗官方帳號）
3. 進入「Messaging API」分頁
4. 設定 Webhook URL：
   ```
   https://jesse-chen.com/api/line/webhook
   ```
5. 點擊 **「Verify」** 驗證連接
6. 確認顯示 Success ✅
7. 啟用 **「Use webhook」** 開關

### 步驟 6：驗證部署

#### A. 檢查服務狀態

```bash
# SSH 登入伺服器
ssh jesse@jesse-chen.com

# 檢查容器運行狀態
cd ~/heart-whisper-town
docker compose -f docker-compose.production-prebuilt.yml ps

# 檢查後端日誌
docker compose -f docker-compose.production-prebuilt.yml logs -f backend

# 尋找 LINE Bot 相關日誌
docker compose -f docker-compose.production-prebuilt.yml logs backend | grep "LINE"
```

#### B. 測試 Webhook 端點

```bash
# 在本地或伺服器上測試
curl https://jesse-chen.com/api/line/health

# 預期回應：
# {"status":"ok","service":"LINE Bot","timestamp":"..."}
```

#### C. LINE Bot 端對端測試

1. 用 LINE 掃描 QR Code 加入白噗噗官方帳號
2. 傳送測試訊息：

```
你：/login
白噗噗：你好！我是白噗噗 🐾
       請輸入你的電子郵件地址來登入：

你：your-email@example.com
白噗噗：找到你的帳號了！請輸入密碼：

你：your-password
白噗噗：✨ 登入成功！歡迎回來！

你：今天學會了 LINE Bot 整合
白噗噗：✨ 收到了！
       很高興你跟我分享這個知識～
       📁 已經幫你歸類到「學習」了
       你可以到網頁版查看更多細節喔！
```

## 🔍 故障排除

### Webhook 驗證失敗

**檢查項目**：

1. 後端服務是否運行：
   ```bash
   docker compose -f docker-compose.production-prebuilt.yml ps backend
   ```

2. 檢查 Nginx 配置：
   ```bash
   docker compose -f docker-compose.production-prebuilt.yml logs nginx
   ```

3. 檢查環境變數是否載入：
   ```bash
   docker exec heart-whisper-backend env | grep LINE
   ```

4. 測試端點可達性：
   ```bash
   curl -X POST https://jesse-chen.com/api/line/webhook \
     -H "Content-Type: application/json" \
     -d '{"events":[]}'
   ```

**預期錯誤**（沒有 signature）：
```json
{"error":"Missing signature"}
```

### 無法登入

**檢查項目**：

1. Redis 是否運行：
   ```bash
   docker compose -f docker-compose.production-prebuilt.yml ps redis
   ```

2. 檢查資料庫連接：
   ```bash
   docker compose -f docker-compose.production-prebuilt.yml logs backend | grep "Database"
   ```

3. 驗證帳號存在（在網頁版註冊）

### 知識上傳失敗

**檢查項目**：

1. Gemini API Key 是否配置：
   ```bash
   docker exec heart-whisper-backend env | grep GEMINI
   ```

2. 檢查後端錯誤日誌：
   ```bash
   docker compose -f docker-compose.production-prebuilt.yml logs backend --tail=100
   ```

### 回滾部署

如果部署出現問題，可以快速回滾：

```bash
# SSH 登入伺服器
ssh jesse@jesse-chen.com
cd ~/heart-whisper-town

# 查看備份映像
docker images | grep backup

# 回滾到備份版本
BACKUP_TAG="backup-20250101-120000"  # 替換為實際的備份標籤
docker tag ghcr.io/nrps9909/tahrd-graduation-project/backend:${BACKUP_TAG} \
  ghcr.io/nrps9909/tahrd-graduation-project/backend:latest

# 重啟容器
docker compose -f docker-compose.production-prebuilt.yml up -d --force-recreate
```

## 📊 監控與日誌

### 查看 LINE Bot 日誌

```bash
# 即時查看日誌
docker compose -f docker-compose.production-prebuilt.yml logs -f backend

# 過濾 LINE Bot 相關日誌
docker compose -f docker-compose.production-prebuilt.yml logs backend | grep "\[LINE Bot\]"

# 查看最近的錯誤
docker compose -f docker-compose.production-prebuilt.yml logs backend --tail=100 | grep -i error
```

### 關鍵日誌訊息

```
[LINE Bot] 收到 1 個事件
[LINE Bot] 收到訊息: /login (用戶: U1234...)
[LINE Bot Service] Handle message error: ...
[LINE Bot] 用戶登入成功: user@example.com
[LINE Bot] 開始處理知識上傳: 用戶 abc123
[LINE Bot] 知識上傳完成: Memory xyz789
[LINE Bot] 已回應訊息: ✨ 收到了！...
```

## 🔐 安全性檢查清單

部署後確認：

- [ ] Webhook signature 驗證正常運作
- [ ] HTTPS 連接正常（jesse-chen.com 使用 SSL）
- [ ] 環境變數不在 git 中
- [ ] Channel Access Token 保密
- [ ] Redis Session 正常運作
- [ ] 密碼加密（bcrypt）正常
- [ ] 速率限制正常運作

## 📈 效能監控

### 檢查回應時間

```bash
# Webhook 回應時間
time curl -X POST https://jesse-chen.com/api/line/webhook \
  -H "Content-Type: application/json" \
  -d '{"events":[]}'

# 健康檢查回應時間
time curl https://jesse-chen.com/api/line/health
```

### 檢查容器資源使用

```bash
docker stats heart-whisper-backend --no-stream
```

## 🎯 部署檢查清單

完整的部署確認清單：

### 部署前
- [ ] 本地測試通過（開發環境 + ngrok）
- [ ] TypeScript 編譯無錯誤
- [ ] 所有測試通過
- [ ] 代碼已提交到 git

### 部署中
- [ ] GitHub Actions 構建成功
- [ ] Docker 映像推送成功
- [ ] 伺服器部署腳本執行成功
- [ ] 健康檢查通過

### 部署後
- [ ] 伺服器環境變數已更新
- [ ] 容器正常運行
- [ ] Webhook URL 已設定並驗證
- [ ] LINE Bot 登入測試通過
- [ ] 知識上傳測試通過
- [ ] 日誌顯示正常
- [ ] 網頁版功能正常（不受影響）

## 📞 支援資源

### 文件
- [LINE Bot 快速開始](./LINE_BOT_QUICKSTART.md)
- [LINE Bot 設定指南](./LINE_BOT_SETUP.md)
- [實作總結](./LINE_BOT_IMPLEMENTATION_SUMMARY.md)

### LINE 官方資源
- [LINE Developers Console](https://developers.line.biz/console/)
- [LINE Messaging API 文件](https://developers.line.biz/en/docs/messaging-api/)

### 伺服器資訊
- **網域**: jesse-chen.com
- **伺服器路徑**: `/home/jesse/heart-whisper-town`
- **Webhook URL**: `https://jesse-chen.com/api/line/webhook`

---

**準備好了嗎？**

✅ 所有配置已完成
✅ 代碼已整合到專案
✅ 只需 merge 到 production 並更新伺服器環境變數

祝你部署順利！🚀🌸
