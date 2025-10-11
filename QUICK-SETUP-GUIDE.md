# ⚡ 5 分鐘快速設置指南

從現在開始，你的部署只需要 **~30 秒**！

## 📋 需要做的事（只需做一次）

### 步驟 1: 配置 GitHub Secrets（2 分鐘）

1. 打開你的 GitHub 倉庫
2. 點擊 **Settings** → **Secrets and variables** → **Actions**
3. 點擊 **New repository secret** 添加以下 3 個 secrets：

#### Secret 1: SERVER_HOST
```
Name: SERVER_HOST
Value: 152.42.204.18
```

#### Secret 2: SERVER_USER  
```
Name: SERVER_USER
Value: root
```

#### Secret 3: SSH_PRIVATE_KEY

```bash
# 在你的本地電腦執行（WSL Ubuntu）
cat ~/.ssh/id_rsa
```

複製**整個輸出**（包括 `-----BEGIN` 和 `-----END` 行），然後：

```
Name: SSH_PRIVATE_KEY
Value: <貼上你的私鑰>
```

### 步驟 2: 服務器端設置（3 分鐘）

SSH 連接到你的服務器：

```bash
ssh root@152.42.204.18
```

然後執行以下命令：

```bash
# 1. 進入專案目錄
cd /home/jesse/heart-whisper-town

# 2. 拉取最新代碼
git pull origin production

# 3. 賦予執行權限
chmod +x quick-deploy.sh

# 4. 生成 GitHub Personal Access Token
# 前往: https://github.com/settings/tokens/new
# 勾選: read:packages
# 複製生成的 token

# 5. 登入 GitHub Container Registry（替換 YOUR_TOKEN 和 YOUR_USERNAME）
echo YOUR_TOKEN | docker login ghcr.io -u YOUR_USERNAME --password-stdin
```

**獲取 GitHub Token：**
1. 前往 https://github.com/settings/tokens/new
2. Note: `TAHRD GHCR Access`
3. 勾選 `read:packages` 和 `write:packages`
4. 點擊 **Generate token**
5. **複製 token**（只會顯示一次！）

## 🎉 完成！現在你可以：

### 自動部署（推薦）

```bash
# 在本地開發完成後
git add .
git commit -m "你的更改"
git push origin production

# GitHub Actions 會自動：
# 1. 構建 Docker 映像（~3-5 分鐘，在 GitHub 上）
# 2. 推送到 GHCR
# 3. 部署到服務器（~30 秒）

# 完成！🎉
```

### 手動快速部署

```bash
# SSH 到服務器
ssh root@152.42.204.18

# 執行快速部署
cd /home/jesse/heart-whisper-town
sudo ./quick-deploy.sh

# 完成時間：~30 秒！
```

## 📊 對比

| 操作 | 舊方式 | 新方式 |
|------|--------|--------|
| 推送代碼 | `git push` | `git push` |
| SSH 到服務器 | ✅ 需要 | ❌ 不需要 |
| 手動執行部署 | ✅ 需要 | ❌ 自動執行 |
| 構建時間 | ~10 分鐘（服務器） | ~30 秒（拉取預構建映像）|
| 服務器負載 | 很高 | 極低 |
| 成本 | 免費 | 免費 |

## 🔍 查看部署狀態

### 在 GitHub 上

1. 前往倉庫的 **Actions** 標籤
2. 查看最新的 workflow
3. 實時查看部署日誌

### 在服務器上

```bash
# 查看服務狀態
docker-compose -f docker-compose.production-prebuilt.yml ps

# 查看日誌
docker-compose -f docker-compose.production-prebuilt.yml logs -f

# 健康檢查
curl http://localhost/health
```

## ❓ 常見問題

### Q: 第一次部署會失敗嗎？

可能會！因為 GHCR 上還沒有映像。解決方法：

```bash
# 在服務器上手動觸發一次構建
cd /home/jesse/heart-whisper-town
docker-compose -f docker-compose.production.yml up -d --build
```

之後就可以使用快速部署了！

### Q: 如何回滾到舊版本？

```bash
# 在服務器上
cd /home/jesse/heart-whisper-town

# 查看可用的映像版本
docker images | grep ghcr.io

# 回滾到特定 commit
export IMAGE_TAG=59ff11a  # 替換為舊的 commit SHA
docker-compose -f docker-compose.production-prebuilt.yml pull
docker-compose -f docker-compose.production-prebuilt.yml up -d
```

### Q: 如何查看構建日誌？

在 GitHub 倉庫的 **Actions** 標籤查看詳細日誌。

### Q: 部署失敗怎麼辦？

1. 檢查 GitHub Actions 日誌
2. 確認 Secrets 配置正確
3. 確認服務器可以 SSH 連接
4. 查看 [FAST-DEPLOY.md](FAST-DEPLOY.md) 故障排查章節

## 📚 更多資訊

- 詳細配置：[FAST-DEPLOY.md](FAST-DEPLOY.md)
- 項目文檔：[README.md](README.md)
- 功能說明：[FEATURES.md](FEATURES.md)

---

**需要幫助？** 在 GitHub Issues 提問！

