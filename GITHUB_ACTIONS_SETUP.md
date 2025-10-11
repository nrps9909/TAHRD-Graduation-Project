# GitHub Actions 權限設定指南

## ⚠️ 解決 "permission_denied: write_package" 錯誤

如果您在 GitHub Actions 中看到以下錯誤：
```
denied: permission_denied: write_package
```

這表示 GitHub Actions 沒有權限寫入 GitHub Container Registry (GHCR)。

## 🔧 解決步驟

### 步驟 1: 設定 Repository Workflow 權限

1. **前往 Repository 設定頁面：**
   ```
   https://github.com/nrps9909/TAHRD-Graduation-Project/settings/actions
   ```

2. **找到 "Workflow permissions" 區塊**
   
3. **選擇正確的權限設定：**
   - ✅ **Read and write permissions** ← 必須選擇這個！
   - ✅ **Allow GitHub Actions to create and approve pull requests**
   
4. **點擊 Save 按鈕**

### 步驟 2: 確認 Package 設定

1. **前往 Package 設定（如果 package 已存在）：**
   ```
   https://github.com/users/nrps9909/packages/container/tahrd-graduation-project/settings
   ```

2. **在 "Manage Actions access" 區塊中：**
   - 確保您的 repository 有 **Write** 權限
   - 如果沒有，點擊 "Add repository" 並授予 Write 權限

### 步驟 3: 重新運行 GitHub Actions

權限設定完成後：

1. 前往 Actions 頁面：
   ```
   https://github.com/nrps9909/TAHRD-Graduation-Project/actions
   ```

2. 找到失敗的 workflow run

3. 點擊 "Re-run failed jobs" 或 "Re-run all jobs"

## 📋 檢查清單

在推送代碼之前，確保：

- [ ] Repository 的 Workflow permissions 設定為 "Read and write"
- [ ] workflow 檔案中包含 `packages: write` 權限
- [ ] Repository 是 public 或您有 packages 權限

## 🔍 驗證設定

設定完成後，推送一個測試 commit：

```bash
git commit --allow-empty -m "test: trigger workflow"
git push origin production
```

前往 Actions 頁面查看是否成功。

## 📊 Workflow 權限配置

您的 workflow 檔案應該包含：

```yaml
# 全域權限
permissions:
  contents: read
  packages: write
  id-token: write

jobs:
  build-and-push:
    permissions:
      contents: read
      packages: write
      id-token: write
```

## 🎯 常見問題

### Q: 為什麼需要 "Read and write" 權限？
A: 寫入 GHCR 需要 `packages: write` 權限，這只有在 workflow 權限設定為 "Read and write" 時才會生效。

### Q: 我的 Repository 是 private，有影響嗎？
A: Private repository 也可以使用 GHCR，但需要確保：
- Workflow permissions 設定正確
- GITHUB_TOKEN 有足夠權限

### Q: 如何確認權限設定成功？
A: 查看 workflow 日誌，如果看到 "Login Succeeded" 並且能夠 push image，就表示成功了。

## 📚 參考資料

- [GitHub Actions Permissions](https://docs.github.com/en/actions/security-guides/automatic-token-authentication#permissions-for-the-github_token)
- [Publishing Docker Images](https://docs.github.com/en/actions/publishing-packages/publishing-docker-images)
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)

---

## ✅ 設定完成後

權限配置完成後，您的 CI/CD 流程將自動：

1. 🏗️ 在 GitHub Actions 中構建 Docker 映像
2. 📦 推送映像到 GHCR
3. 🚀 SSH 到服務器並部署

**部署時間：約 5 分鐘**（構建 3-4 分鐘 + 部署 30 秒）

