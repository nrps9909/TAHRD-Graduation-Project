# 快速重置資料庫

## ⚠️ 警告
**此操作會刪除所有數據，包括所有用戶帳號！**

## 🚀 快速執行（3步驟）

### 步驟 1：執行清理
```bash
cd /home/jesse/Project/TAHRD-Graduation-Project/backend
./scripts/reset-database-safe.sh
```

輸入 `YES` 確認執行

### 步驟 2：重新創建基礎數據
```bash
npx prisma db seed
```

### 步驟 3：重新啟動服務
```bash
npm run dev
```

## ✅ 完成！

現在可以：
1. 前往前端重新註冊帳號
2. 系統會自動為新用戶創建 8 個島嶼
3. 開始測試新的 Island 系統

## 📝 詳細文檔

查看 `DATABASE_RESET_GUIDE.md` 了解更多細節
