# 開發工作流程指南

> 本文檔說明如何從本地開發到生產環境部署的完整流程

## 🌳 分支策略

```
main        → 開發分支（本地開發和測試）
production  → 生產分支（部署到伺服器）
```

## 📋 日常開發流程

### 1️⃣ 本地開發

```bash
# 確保在 main 分支
git checkout main

# 拉取最新代碼
git pull origin main

# 開始開發...
# 修改代碼、測試功能

# 查看修改
git status
git diff

# 提交更改
git add .
git commit -m "feat: 你的功能描述"
```

### 2️⃣ 推送到遠端 main

```bash
# 推送到遠端 main 分支
git push origin main
```

**✅ 這一步完全安全！** 不會影響生產環境。

### 3️⃣ 部署到生產環境

當功能測試完成，準備部署時：

```bash
# 切換到 production 分支
git checkout production

# 從遠端拉取最新的 production
git pull origin production

# 合併 main 分支的更新
git merge main

# 推送到遠端 production（觸發自動部署）
git push origin production
```

**🚀 CI/CD 會自動部署到生產伺服器！**

### 4️⃣ 回到開發分支

```bash
# 切回 main 繼續開發
git checkout main
```

## 🔄 完整範例流程

```bash
# === 步驟 1: 開發新功能 ===
git checkout main
git pull origin main

# 修改代碼...

git add .
git commit -m "feat: 新增記憶樹澆水功能"
git push origin main

# === 步驟 2: 測試確認無誤後部署 ===
git checkout production
git pull origin production
git merge main
git push origin production  # 觸發自動部署

# === 步驟 3: 繼續開發下一個功能 ===
git checkout main
```

## 🛡️ 環境配置保護

### 本地環境配置 (`.env`)

這些文件**已經在 `.gitignore` 中**，不會被提交：

- `frontend/.env`
- `backend/.env`
- `.env.production`
- `.env.local`

### 智能 URL 處理

代碼已經實現智能 URL 處理，自動適配不同環境：

**本地開發**：
```env
VITE_API_URL=http://localhost:4000/graphql
```
→ REST API 自動使用 `http://localhost:4000` ✅

**生產環境**：
```env
VITE_API_URL=https://your-domain.com/graphql
```
→ REST API 自動使用 `https://your-domain.com` ✅

## ⚠️ 重要提醒

### ✅ 可以做的事

- 在 `main` 分支自由開發和提交
- 隨時推送到 `origin/main`
- 測試完成後合併到 `production`

### ❌ 不要做的事

- **不要** 直接在 `production` 分支開發
- **不要** 提交 `.env` 文件到 Git
- **不要** 在未測試的情況下推送到 `production`

## 🐛 遇到問題時

### 合併衝突

```bash
# 如果 merge 時出現衝突
git status  # 查看衝突文件

# 手動解決衝突後
git add .
git commit -m "fix: 解決合併衝突"
git push origin production
```

### 回滾錯誤部署

```bash
# 查看提交歷史
git log --oneline

# 回滾到之前的版本
git reset --hard <commit-hash>
git push origin production --force-with-lease
```

## 📊 分支狀態檢查

```bash
# 查看所有分支
git branch -a

# 查看分支差異
git log main..production     # production 比 main 多的提交
git log production..main     # main 比 production 多的提交

# 圖形化查看歷史
git log --oneline --graph --all --decorate
```

## 🎯 最佳實踐

1. **頻繁提交** - 小步快跑，每個功能點提交一次
2. **清晰的提交訊息** - 使用 `feat:`, `fix:`, `refactor:` 等前綴
3. **先測試再部署** - 確保本地測試通過後再推送到 production
4. **定期同步** - 每天開始工作前 `git pull origin main`
5. **保持分支乾淨** - 不要累積太多未提交的更改

## 🚀 CI/CD 自動部署

推送到 `origin/production` 會自動觸發：

1. ✅ 拉取最新代碼
2. ✅ 構建 Docker 映像
3. ✅ 重啟容器
4. ✅ 執行資料庫遷移
5. ✅ 健康檢查
6. ❌ 失敗自動回滾

查看部署日誌：
```bash
# 在 VPS 上查看
docker compose -f docker-compose.production-prebuilt.yml logs --tail=100
```

---

**最後更新**: 2025-11-01
**維護者**: Claude Code
