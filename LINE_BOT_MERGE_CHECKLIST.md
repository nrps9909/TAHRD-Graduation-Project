# LINE Bot Merge 到 Production 檢查清單

## ✅ 確認已完成

### 代碼實作
- [x] LINE Bot webhook 路由 (`backend/src/routes/lineBot.ts`)
- [x] LINE Bot 服務層 (`backend/src/services/lineBotService.ts`)
- [x] 整合到主程式 (`backend/src/index.ts`)
- [x] TypeScript 編譯通過（無錯誤）
- [x] 安裝 `@line/bot-sdk` 依賴

### 配置文件
- [x] `.env` - 開發環境配置（含 Token）
- [x] `.env.production` - 生產環境配置（含 Token）
- [x] `.env.example` - 範例配置已更新
- [x] `.env.production.example` - 範例配置已更新

### 文檔
- [x] `LINE_BOT_QUICKSTART.md` - 快速開始指南
- [x] `LINE_BOT_SETUP.md` - 完整設定指南
- [x] `LINE_BOT_IMPLEMENTATION_SUMMARY.md` - 實作總結
- [x] `LINE_BOT_PRODUCTION_DEPLOYMENT.md` - 生產部署指南
- [x] 本檢查清單

### 測試工具
- [x] `verify-line-config.js` - 配置驗證腳本
- [x] `backend/test-linebot-config.ts` - TypeScript 配置測試

## 📋 Merge 前檢查

### 1. 本地驗證

```bash
# 檢查配置
node verify-line-config.js

# 預期輸出：
# ✅ LINE_CHANNEL_SECRET: 已設定
# ✅ LINE_CHANNEL_ACCESS_TOKEN: 已設定
# ✨ 配置完成！可以開始測試 LINE Bot
```

### 2. TypeScript 編譯

```bash
npx tsc --noEmit

# 預期：無錯誤輸出
```

### 3. 檢查 Git 狀態

```bash
git status

# 確認新增的檔案：
# - backend/src/routes/lineBot.ts
# - backend/src/services/lineBotService.ts
# - LINE_BOT_*.md 文件
# - verify-line-config.js

# 確認修改的檔案：
# - backend/src/index.ts
# - backend/package.json
# - .env.example
# - .env.production
# - .env.production.example
```

### 4. 確認不該提交的檔案

```bash
# 確認 .gitignore 包含：
# .env
# .env.production

# 確認這些檔案不在 git add 清單中
git status | grep -E "\.env$|\.env\.production$"

# 預期：無輸出（表示這些檔案被 .gitignore 忽略）
```

## 🚀 Merge 流程

### Step 1: 提交變更

```bash
# 確保在正確的分支
git checkout main  # 或你當前的開發分支

# 查看變更
git diff

# 添加檔案（確保不包含 .env）
git add backend/src/routes/lineBot.ts
git add backend/src/services/lineBotService.ts
git add backend/src/index.ts
git add backend/package.json
git add .env.example
git add .env.production.example
git add LINE_BOT_*.md
git add verify-line-config.js
git add backend/test-linebot-config.ts

# 確認 staging area
git status

# 提交
git commit -m "feat: 新增 LINE Bot 整合功能

功能：
- 實作 LINE Bot webhook 接收與驗證
- 實作 Email + Password 登入系統
- 整合知識上傳服務到 LINE Bot
- 支援白噗噗風格的溫暖回應
- 新增指令系統 (/login, /logout, /status, /help)

技術細節：
- 使用 @line/bot-sdk 處理 LINE API
- Redis Session 管理（30 分鐘過期）
- 狀態機管理使用者認證流程
- 整合 chiefAgentService 處理知識分類

配置：
- 更新生產環境配置檔案
- 新增 LINE Bot 設定到 .env.example
- 提供完整部署文檔

文檔：
- LINE_BOT_QUICKSTART.md - 快速開始指南
- LINE_BOT_SETUP.md - 完整設定指南
- LINE_BOT_IMPLEMENTATION_SUMMARY.md - 實作總結
- LINE_BOT_PRODUCTION_DEPLOYMENT.md - 生產部署指南

測試：
- TypeScript 編譯通過
- 配置驗證工具已測試

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Step 2: Merge 到 production

```bash
# 切換到 production 分支
git checkout production

# 拉取最新的 production
git pull origin production

# Merge 開發分支
git merge main  # 或你的開發分支

# 檢查 merge 結果
git log -1

# 推送到 GitHub（觸發 CI/CD）
git push origin production
```

### Step 3: 監控 GitHub Actions

1. 前往 GitHub repository
2. 點擊 "Actions" 分頁
3. 查看 "Build, Test and Deploy to Production" workflow
4. 確認所有步驟通過：
   - ✅ detect-changes
   - ✅ test (backend, frontend)
   - ✅ validate-config
   - ✅ build-and-push
   - ✅ deploy

### Step 4: 更新伺服器環境變數

**重要**：`.env.production` 不會被 git 追蹤，需要手動更新伺服器。

```bash
# SSH 登入伺服器
ssh jesse@jesse-chen.com

# 進入專案目錄
cd ~/heart-whisper-town

# 備份現有配置
cp .env.production .env.production.backup

# 編輯配置
nano .env.production

# 在檔案最後加入：
# ----- LINE Bot 設定 -----
LINE_CHANNEL_SECRET=5889ed858081395512721d2e7d98cb26
LINE_CHANNEL_ACCESS_TOKEN=MyNItQ7xx9cp23qShbZvjrJu4kERyRZBqhwTwjpQfN7gSwiQjLIf8RbCgPa+c3/JuOPy95EJY5f3ntnQvIrx44WDp2ngaUiRIJk1rQpnsViexQ5B4kkf/OeASiBr3iirq4uBo8j11VIM0bbBEz+CsQdB04t89/1O/w1cDnyilFU=

# 儲存（Ctrl+X, Y, Enter）

# 重啟後端容器
docker compose -f docker-compose.production-prebuilt.yml restart backend

# 驗證容器狀態
docker compose -f docker-compose.production-prebuilt.yml ps

# 檢查環境變數載入
docker exec heart-whisper-backend env | grep LINE

# 預期輸出：
# LINE_CHANNEL_SECRET=5889ed858081395512721d2e7d98cb26
# LINE_CHANNEL_ACCESS_TOKEN=MyNItQ7xx9cp23qShbZvjrJu4kERyRZBqhwTwjpQfN7gSwiQjLIf8RbCgPa+c3/...
```

### Step 5: 設定 LINE Webhook URL

1. 前往 [LINE Developers Console](https://developers.line.biz/console/)
2. 選擇 Channel（Channel ID: 2008402648）
3. 進入「Messaging API」分頁
4. 在「Webhook settings」設定：
   ```
   https://jesse-chen.com/api/line/webhook
   ```
5. 點擊 **「Verify」** - 應該顯示 Success ✅
6. 啟用 **「Use webhook」** 開關
7. 關閉「Auto-reply messages」
8. 關閉「Greeting messages」

### Step 6: 測試

#### A. 端點測試

```bash
# 健康檢查
curl https://jesse-chen.com/api/line/health

# 預期回應：
# {"status":"ok","service":"LINE Bot","timestamp":"..."}
```

#### B. LINE Bot 測試

1. 用 LINE 掃描 QR Code
2. 傳送 `/login`
3. 輸入 email 和密碼
4. 測試知識上傳
5. 確認收到白噗噗風格回應

#### C. 檢查日誌

```bash
# SSH 到伺服器
ssh jesse@jesse-chen.com
cd ~/heart-whisper-town

# 查看 LINE Bot 日誌
docker compose -f docker-compose.production-prebuilt.yml logs backend | grep "\[LINE Bot\]"
```

## ✅ 完成確認

部署完成後，確認以下項目：

### 功能測試
- [ ] Webhook 驗證成功（LINE Developers Console）
- [ ] `/login` 指令正常運作
- [ ] Email 登入流程正常
- [ ] 密碼驗證正常
- [ ] 知識上傳正常運作
- [ ] 白噗噗回應正確顯示
- [ ] `/status` 顯示登入狀態
- [ ] `/logout` 登出功能正常
- [ ] `/help` 顯示幫助訊息

### 技術驗證
- [ ] Webhook signature 驗證正常
- [ ] Redis Session 正常運作
- [ ] 密碼 bcrypt 加密正常
- [ ] AI 知識分類正常
- [ ] 資料儲存到 Memory 正常
- [ ] 日誌記錄正確

### 安全性
- [ ] `.env` 不在 git 中
- [ ] `.env.production` 不在 git 中
- [ ] Channel Access Token 保密
- [ ] HTTPS 連接正常

### 相容性
- [ ] 網頁版功能不受影響
- [ ] GraphQL API 正常運作
- [ ] WebSocket 連接正常
- [ ] 現有功能無異常

## 🐛 常見問題

### Webhook 驗證失敗

```bash
# 檢查後端是否運行
docker compose -f docker-compose.production-prebuilt.yml ps backend

# 檢查日誌
docker compose -f docker-compose.production-prebuilt.yml logs backend --tail=50

# 測試端點
curl -X POST https://jesse-chen.com/api/line/webhook \
  -H "Content-Type: application/json" \
  -d '{"events":[]}'
```

### 環境變數未載入

```bash
# 重啟容器
docker compose -f docker-compose.production-prebuilt.yml restart backend

# 重新創建容器（如果重啟無效）
docker compose -f docker-compose.production-prebuilt.yml up -d --force-recreate backend
```

### 回滾

如果需要回滾：

```bash
# 在伺服器上
cd ~/heart-whisper-town
git log --oneline -5  # 查看最近的 commits
git reset --hard <previous-commit-hash>
docker compose -f docker-compose.production-prebuilt.yml up -d --force-recreate
```

## 📚 相關文檔

- [快速開始指南](./LINE_BOT_QUICKSTART.md)
- [完整設定指南](./LINE_BOT_SETUP.md)
- [實作總結](./LINE_BOT_IMPLEMENTATION_SUMMARY.md)
- [生產部署指南](./LINE_BOT_PRODUCTION_DEPLOYMENT.md)

---

**準備好 Merge 了嗎？** ✅

所有配置已完成，按照上述流程執行即可！

祝你部署順利！🚀🌸
