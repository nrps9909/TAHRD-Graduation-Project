# LINE Bot 快速開始指南

## 🚀 立即開始（5 分鐘設定）

### 步驟 1：取得 Channel Access Token

你已經有 Channel ID 和 Channel Secret，現在只需要 Access Token：

1. 前往 [LINE Developers Console](https://developers.line.biz/console/)
2. 選擇你的 Messaging API Channel（白噗噗官方帳號）
3. 點擊「Messaging API」分頁
4. 找到「Channel access token」區塊
5. 點擊 **「Issue」** 按鈕
6. 複製生成的 Token（長這樣：`很長的一串英數字`）

### 步驟 2：更新環境變數

編輯 `.env` 檔案，將 Token 貼上：

```bash
LINE_CHANNEL_ACCESS_TOKEN=你剛才複製的Token
```

> ⚠️ **注意**：Channel Secret 已經預設填好了：`5889ed858081395512721d2e7d98cb26`

### 步驟 3：啟動服務

```bash
# 啟動後端（在專案根目錄）
npm run dev
```

等待看到：
```
🌸 心語小鎮服務器啟動成功！
📍 GraphQL: http://localhost:4000/graphql
```

### 步驟 4：設定 ngrok（開發環境）

在**另一個終端**執行：

```bash
# 如果還沒安裝 ngrok
npm install -g ngrok

# 啟動 ngrok
ngrok http 4000
```

複製 ngrok 給你的 HTTPS URL（例如：`https://abc123.ngrok.io`）

### 步驟 5：配置 Webhook URL

回到 LINE Developers Console：

1. 在「Messaging API」分頁找到「Webhook settings」
2. 輸入 Webhook URL：
   ```
   https://your-ngrok-url.ngrok.io/api/line/webhook
   ```
   (把 `your-ngrok-url` 換成你的 ngrok URL)
3. 點擊 **「Verify」** - 應該顯示 Success ✅
4. 啟用 **「Use webhook」** 開關

### 步驟 6：關閉自動回應

在同一頁面：

- ❌ 關閉「Auto-reply messages」
- ❌ 關閉「Greeting messages」

### 步驟 7：測試！

1. 在 LINE Developers Console 找到你的 QR Code
2. 用 LINE 掃描加入白噗噗官方帳號
3. 傳送訊息：`/login`

預期回應：
```
你好！我是白噗噗 🐾

請輸入你的電子郵件地址來登入：
```

## ✅ 測試流程

### 完整登入測試

```
你：/login
白噗噗：請輸入你的電子郵件地址來登入：

你：your-email@example.com
白噗噗：找到你的帳號了！請輸入密碼：

你：your-password
白噗噗：✨ 登入成功！歡迎回來！
```

### 知識上傳測試

```
你：今天學會了 React Hooks，useEffect 真的很好用！
白噗噗：✨ 收到了！

很高興你跟我分享這個知識～

📁 已經幫你歸類到「學習」了

📝 [快速摘要內容]

你可以到網頁版查看更多細節喔！
```

### 狀態檢查測試

```
你：/status
白噗噗：✅ 已登入

使用者：你的名稱

你可以直接傳送訊息來上傳知識！
```

## 🔧 故障排除

### Webhook 驗證失敗

**檢查清單**：
- [ ] 後端服務正在運行（`npm run dev`）
- [ ] ngrok 正在運行
- [ ] Webhook URL 正確（包含 `/api/line/webhook`）
- [ ] 使用 HTTPS（ngrok 自動提供）

**解決方式**：
```bash
# 檢查後端狀態
curl http://localhost:4000/api/line/health

# 預期回應：
{"status":"ok","service":"LINE Bot","timestamp":"..."}
```

### 無法登入

**可能原因**：
1. 帳號不存在 → 先到網頁版註冊
2. Email 格式錯誤 → 確認拼寫
3. 密碼錯誤 → 重試或重設密碼
4. Redis 未運行 → 啟動 Redis

**檢查 Redis**：
```bash
# 測試 Redis 連接
redis-cli ping
# 應該回應：PONG
```

### 訊息沒有回應

**檢查步驟**：
1. 確認已登入（輸入 `/status`）
2. 查看後端 console 有無錯誤訊息
3. 確認 Gemini API Key 已配置

## 📊 查看日誌

後端會顯示詳細日誌：

```
[LINE Bot] 收到 1 個事件
[LINE Bot] 收到訊息: /login (用戶: U1234567...)
[LINE Bot] 已回應訊息: 你好！我是白噗噗...
```

## 🎯 下一步

完成測試後：

1. ✅ 邀請朋友測試
2. ✅ 嘗試上傳不同類型的知識
3. ✅ 到網頁版查看知識已正確儲存
4. ✅ 部署到生產環境（見 `LINE_BOT_SETUP.md`）

## 💡 實用指令

```bash
/login   - 登入
/logout  - 登出
/status  - 查看狀態
/help    - 查看幫助
```

---

**有問題？** 查看完整文檔：[LINE_BOT_SETUP.md](./LINE_BOT_SETUP.md)
