# 資料庫完全重置指南

> 本指南幫助你完全清空資料庫，重新開始

---

## ⚠️ 重要警告

**此操作會刪除所有數據，包括：**
- ✗ 所有用戶帳號及個人資料
- ✗ 所有記憶 (Memory)
- ✗ 所有島嶼 (Island)
- ✗ 所有助手 (Assistant)
- ✗ 所有聊天記錄 (ChatSession, ChatMessage)
- ✗ 所有知識分發記錄 (KnowledgeDistribution)
- ✗ 所有任務歷史 (TaskHistory)

**此操作無法復原！請確保你真的想要刪除所有數據。**

---

## 📋 執行步驟

### 方法 1：安全腳本（推薦）

使用帶確認的安全腳本：

```bash
cd backend
./scripts/reset-database-safe.sh
```

腳本會：
1. 顯示將要刪除的數據
2. 要求你輸入 `YES` 確認
3. 執行清理
4. 顯示清理統計

### 方法 2：直接執行

如果你確定要執行，可以直接運行：

```bash
cd backend
npx ts-node scripts/reset-database-completely.ts
```

---

## 🔄 重置後的步驟

### 1. 重新創建基礎數據

執行 seed 腳本：

```bash
npx prisma db seed
```

這會創建：
- ✓ 8 個預設 Assistant（包括 Chief）
- ✓ 基礎系統配置

### 2. 重新啟動服務

```bash
# 開發環境
npm run dev

# 生產環境
npm start
```

### 3. 重新註冊用戶

前往前端重新註冊帳號：
- 用戶資料會從零開始
- 系統會自動為新用戶創建預設的 8 個 Island

---

## 📊 清理內容詳細說明

### 刪除順序（遵循外鍵依賴）

1. **ChatMessage** - 所有聊天訊息
2. **ChatSession** - 所有聊天會話
3. **AgentDecision** - 所有代理決策記錄
4. **KnowledgeDistribution** - 所有知識分發記錄
5. **Memory** - 所有記憶
6. **Island** - 所有用戶島嶼
7. **Subcategory** - 所有子分類
8. **TaskHistory** - 所有任務歷史
9. **Assistant** - 所有助手（包括 Chief）
10. **User** - 所有用戶

### 保留的資料

**無** - 此腳本會清空所有數據

---

## 🛡️ 安全建議

### 執行前

1. **確認環境**
   ```bash
   # 檢查當前連接的資料庫
   echo $DATABASE_URL
   ```

2. **備份資料庫**（如果需要）
   ```bash
   # 使用 mongodump 備份（如果是 MongoDB）
   mongodump --uri="YOUR_DATABASE_URL" --out=backup-$(date +%Y%m%d)
   ```

3. **停止正在運行的服務**
   ```bash
   # 停止 backend
   pm2 stop heart-whisper-backend

   # 或使用 Ctrl+C 停止 npm run dev
   ```

### 執行後

1. **驗證清理結果**
   ```bash
   # 連接到資料庫
   mongosh "YOUR_DATABASE_URL"

   # 檢查集合
   show collections
   db.users.countDocuments()
   db.memories.countDocuments()
   db.islands.countDocuments()
   ```

2. **重新執行 seed**
   ```bash
   npx prisma db seed
   ```

3. **測試系統**
   - 註冊新用戶
   - 創建測試記憶
   - 驗證 Island 功能

---

## 🔧 故障排除

### 問題：外鍵約束錯誤

**原因**：刪除順序不正確

**解決**：腳本已按正確順序刪除，如果仍有問題：
```bash
# 強制刪除所有集合（僅限 MongoDB）
mongosh "YOUR_DATABASE_URL" --eval "db.dropDatabase()"
npx prisma db push --force-reset
```

### 問題：seed 失敗

**原因**：資料庫連接問題或 Prisma Client 未更新

**解決**：
```bash
# 重新生成 Prisma Client
npx prisma generate

# 重新推送 schema
npx prisma db push

# 再次執行 seed
npx prisma db seed
```

### 問題：部分數據未刪除

**原因**：腳本執行中斷

**解決**：
```bash
# 再次執行清理腳本
npx ts-node scripts/reset-database-completely.ts

# 或手動連接資料庫檢查
mongosh "YOUR_DATABASE_URL"
```

---

## 📝 使用場景

### 適合使用的情況

✅ 開發環境需要重置
✅ 測試數據過多需要清理
✅ 遷移到新的資料結構
✅ 修復損壞的數據
✅ 從頭開始測試系統

### 不適合使用的情況

❌ 生產環境（除非你真的確定）
❌ 有重要用戶數據需要保留
❌ 只想刪除特定數據（使用其他腳本）

---

## 🎯 執行範例

```bash
# 1. 進入 backend 目錄
cd /home/jesse/Project/TAHRD-Graduation-Project/backend

# 2. 停止服務（如果正在運行）
pm2 stop heart-whisper-backend

# 3. 執行安全腳本
./scripts/reset-database-safe.sh

# 輸出：
# ==========================================
# ⚠️  資料庫完全重置
# ==========================================
#
# 此操作將刪除所有數據，包括：
#   ❌ 所有用戶帳號
#   ❌ 所有記憶 (Memory)
#   ...
#
# ⚠️  此操作無法復原！
#
# 確定要繼續嗎？輸入 'YES' 確認: YES
#
# 開始執行資料庫重置...
#
# ✅ 刪除 1523 條聊天訊息
# ✅ 刪除 45 個聊天會話
# ✅ 刪除 89 個代理決策
# ✅ 刪除 234 個知識分發記錄
# ✅ 刪除 567 個記憶
# ✅ 刪除 8 個島嶼
# ✅ 刪除 0 個子分類
# ✅ 刪除 123 個任務歷史
# ✅ 刪除 9 個助手
# ✅ 刪除 1 個用戶
#
# 🎉 資料庫清理完成！

# 4. 重新創建基礎數據
npx prisma db seed

# 5. 重新啟動服務
npm run dev
```

---

## 📞 需要幫助？

如果遇到問題：
1. 檢查 `backend/logs/` 下的日誌文件
2. 查看終端輸出的錯誤訊息
3. 確認資料庫連接 URL 正確
4. 確認 Prisma Client 已生成

---

**最後更新**: 2025-11-01
**版本**: v1.0
**作者**: Claude Code
