# LINE Bot 設定指南

本文件說明如何設定白噗噗 LINE Bot 官方帳號。

## 📋 前置準備

- LINE Developers Console 帳號
- Channel ID: `2008402648`
- Channel Secret: `5889ed858081395512721d2e7d98cb26`（已配置）

## 🔧 設定步驟

### 1. 取得 Channel Access Token

1. 前往 [LINE Developers Console](https://developers.line.biz/console/)
2. 選擇你的 Provider 和 Channel
3. 進入「Messaging API」分頁
4. 在「Channel access token」區塊點擊「Issue」發行 Token
5. 複製產生的 Access Token

### 2. 配置環境變數

將 Channel Access Token 加入 `.env` 檔案：

```bash
LINE_CHANNEL_SECRET=5889ed858081395512721d2e7d98cb26
LINE_CHANNEL_ACCESS_TOKEN=你的_Access_Token
```

### 3. 設定 Webhook URL

#### 開發環境（使用 ngrok）

1. 安裝 ngrok：
```bash
npm install -g ngrok
```

2. 啟動後端服務：
```bash
cd backend
npm run dev
```

3. 在另一個終端啟動 ngrok：
```bash
ngrok http 4000
```

4. 複製 ngrok 提供的 HTTPS URL（例如：`https://abc123.ngrok.io`）

5. 在 LINE Developers Console 設定 Webhook URL：
   - 進入「Messaging API」分頁
   - 在「Webhook settings」區塊設定 URL：
     ```
     https://your-ngrok-url.ngrok.io/api/line/webhook
     ```
   - 點擊「Verify」驗證連接
   - 啟用「Use webhook」

#### 生產環境

Webhook URL 設定為：
```
https://your-domain.com/api/line/webhook
```

### 4. 啟用必要功能

在 LINE Developers Console 的「Messaging API」分頁：

- ✅ 啟用「Use webhook」
- ✅ 停用「Auto-reply messages」（自動回應）
- ✅ 停用「Greeting messages」（歡迎訊息）
- ✅ 啟用「Allow bot to join group chats」（如需支援群組）

## 📱 測試 LINE Bot

### 1. 加入好友

1. 在 LINE Developers Console 找到 QR Code
2. 用 LINE 掃描 QR Code 加入白噗噗官方帳號

### 2. 測試登入流程

```
你：/login
白噗噗：你好！我是白噗噗 🐾

請輸入你的電子郵件地址來登入：

你：your-email@example.com
白噗噗：找到你的帳號了！

請輸入密碼：
（你的密碼在 LINE 是安全的，我不會記錄下來）

你：your-password
白噗噗：✨ 登入成功！

歡迎回來，旅人！

現在你可以直接傳送訊息給我，我會幫你整理和記錄這些知識～

💡 試著告訴我一些你想記錄的事情吧！
```

### 3. 測試知識上傳

```
你：今天學會了 TypeScript 的泛型，真的很有用！
白噗噗：✨ 收到了！

很高興你跟我分享這個知識～

📁 已經幫你歸類到「學習」了

📝 [快速摘要]

你可以到網頁版查看更多細節喔！
```

### 4. 測試指令

```
/login   - 登入帳號
/logout  - 登出
/status  - 查看登入狀態
/help    - 顯示幫助訊息
```

## 🛠️ 開發工具

### 檢查 Webhook 健康狀態

```bash
curl http://localhost:4000/api/line/health
```

預期回應：
```json
{
  "status": "ok",
  "service": "LINE Bot",
  "timestamp": "2025-11-01T..."
}
```

### 查看後端日誌

```bash
cd backend
npm run dev
```

關注以下日誌訊息：
- `[LINE Bot] 收到 X 個事件`
- `[LINE Bot] 收到訊息: ...`
- `[LINE Bot] 用戶登入成功: ...`
- `[LINE Bot] 知識上傳完成: Memory ...`

## 🔍 故障排除

### Webhook 驗證失敗

**問題**：LINE Developers Console 顯示 Webhook 驗證失敗

**解決方案**：
1. 確認後端服務正在運行（`npm run dev`）
2. 確認 ngrok 正在運行且 URL 正確
3. 確認 `LINE_CHANNEL_SECRET` 設定正確
4. 檢查後端日誌是否有錯誤訊息

### 無法登入

**問題**：輸入 email 和密碼後無法登入

**解決方案**：
1. 確認帳號已在網頁版註冊
2. 確認 email 格式正確（小寫）
3. 確認密碼正確
4. 檢查 Redis 是否正常運行
5. 檢查後端日誌錯誤訊息

### 知識上傳失敗

**問題**：傳送訊息後沒有回應或錯誤

**解決方案**：
1. 確認已成功登入（輸入 `/status` 檢查）
2. 確認 Gemini API Key 已配置
3. 檢查後端日誌中的錯誤訊息
4. 確認資料庫連接正常

### Session 過期

**問題**：一段時間後需要重新登入

**說明**：Session 有效期為 30 分鐘，這是正常行為。如需調整，可修改 `lineBotService.ts` 中的 `SESSION_TTL` 常數。

## 📊 系統架構

```
LINE 用戶
    ↓ 傳送訊息
LINE Platform
    ↓ Webhook POST
你的後端 (/api/line/webhook)
    ↓ 驗證 signature
lineBotService
    ↓ 狀態管理 (Redis)
    ├─ 登入流程 (email + password)
    └─ 知識上傳
        ↓
    chiefAgentService
        ↓ AI 分析
    Memory 資料庫
```

## 🔐 安全性說明

1. **Signature 驗證**：所有 webhook 請求都會驗證 LINE 的簽章
2. **密碼加密**：密碼使用 bcrypt 加密儲存
3. **Session 管理**：使用 Redis 管理會話，30 分鐘自動過期
4. **速率限制**：API 有速率限制防止濫用

## 📚 相關文件

- [LINE Messaging API 文件](https://developers.line.biz/en/docs/messaging-api/)
- [LINE Bot SDK for Node.js](https://line.github.io/line-bot-sdk-nodejs/)
- [後端 API 文件](./backend/README.md)

## 🎯 下一步

完成 LINE Bot 設定後，你可以：

1. ✅ 在 LINE 上傳知識（不需打開網頁）
2. ✅ 查看白噗噗的溫暖回應
3. ✅ 自動分類和整理知識
4. ✅ 到網頁版查看詳細內容和視覺化

享受你的心語小鎮之旅！🌸
