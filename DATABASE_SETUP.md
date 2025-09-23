# MongoDB Atlas 設置指南

## 1. 創建 MongoDB Atlas 帳戶

1. 前往 [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. 註冊免費帳戶
3. 創建新的叢集 (Cluster)

## 2. 設置資料庫連接

1. 在 Atlas 控制台中，點擊 "Connect"
2. 選擇 "Connect your application"
3. 選擇 Node.js 驅動程式
4. 複製連接字串

## 3. 配置應用程式

將您的 MongoDB 連接字串添加到 `.env` 檔案：

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ccadventure?retryWrites=true&w=majority
```

## 4. 設置網路存取

1. 在 Atlas 中設置 IP 白名單
2. 為了開發，可以允許從任何地方存取：`0.0.0.0/0`
3. 在生產環境中，請限制為特定 IP

## 5. 創建資料庫用戶

1. 在 "Database Access" 中創建新用戶
2. 設置用戶名和密碼
3. 給予讀寫權限

## 資料庫結構

### Users Collection
- nickname: String (用戶暱稱)
- email: String (唯一電子郵件)
- password_hash: String (加密密碼)
- created_at: Date (創建時間)

## 遷移說明

應用程式已從 SQLite 遷移到 MongoDB：
- ✅ 移除了 sqlite3 依賴
- ✅ 添加了 mongoose
- ✅ 更新了所有資料庫操作
- ✅ 保持了相同的 API 接口

## 測試連接

啟動服務器後，如果看到沒有 MongoDB 連接錯誤，表示連接成功。
您可以通過註冊新用戶來測試資料庫功能。