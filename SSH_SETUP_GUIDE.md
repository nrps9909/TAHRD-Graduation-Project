# 🔐 SSH 密鑰設定指南

## 問題：ssh: no key found

如果您在 GitHub Actions 中看到以下錯誤：
```
ssh: no key found
ssh: handshake failed: ssh: unable to authenticate
```

這表示需要設定 SSH 密鑰來讓 GitHub Actions 連接到您的服務器。

---

## 📋 完整設定步驟

### 步驟 1: 生成 SSH 密鑰對

**在您的本地電腦上執行：**

```bash
# 使用 ED25519 算法（推薦）
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy

# 或使用 RSA 算法
ssh-keygen -t rsa -b 4096 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy
```

**重要提示：**
- 當詢問 passphrase 時，**直接按 Enter 兩次**（不要設定密碼）
- 這會生成兩個檔案：
  - `~/.ssh/github_actions_deploy` - 私鑰 🔑（保密！）
  - `~/.ssh/github_actions_deploy.pub` - 公鑰 🔓（可以公開）

---

### 步驟 2: 將公鑰添加到服務器

#### 方法 A: 自動添加（推薦）

```bash
# 將公鑰複製到服務器
ssh-copy-id -i ~/.ssh/github_actions_deploy.pub root@152.42.204.18
```

#### 方法 B: 手動添加

```bash
# 1. 顯示公鑰內容
cat ~/.ssh/github_actions_deploy.pub

# 複製輸出的內容，類似：
# ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIxxx... github-actions-deploy

# 2. SSH 連接到服務器
ssh root@152.42.204.18

# 3. 創建 .ssh 目錄（如果不存在）
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# 4. 編輯 authorized_keys
nano ~/.ssh/authorized_keys

# 5. 貼上公鑰內容（新的一行）

# 6. 保存並退出（Ctrl+X, 然後 Y, 然後 Enter）

# 7. 設定正確權限
chmod 600 ~/.ssh/authorized_keys

# 8. 退出服務器
exit
```

---

### 步驟 3: 測試 SSH 連接

```bash
# 使用新密鑰測試連接
ssh -i ~/.ssh/github_actions_deploy root@152.42.204.18

# 如果成功，您應該能夠無密碼登入服務器
# 如果失敗，請檢查上面的步驟
```

---

### 步驟 4: 獲取私鑰內容

```bash
# 顯示私鑰完整內容
cat ~/.ssh/github_actions_deploy
```

**複製完整的輸出**，包括開頭和結尾的標記：

```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
...（所有行都要複製）...
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx=
-----END OPENSSH PRIVATE KEY-----
```

**⚠️ 警告：** 私鑰是機密資料，不要洩露或提交到 Git！

---

### 步驟 5: 在 GitHub 設定 Secrets

#### 5.1 前往 Secrets 設定頁面

**直接連結：**
```
https://github.com/nrps9909/TAHRD-Graduation-Project/settings/secrets/actions
```

或者：
1. 進入您的 GitHub Repository
2. 點擊 **Settings**
3. 左側選單選擇 **Secrets and variables** → **Actions**

#### 5.2 添加必要的 Secrets

需要設定以下 3 個 Secrets：

---

**① SSH_PRIVATE_KEY** 🔑

- 點擊 **"New repository secret"**
- **Name**: `SSH_PRIVATE_KEY`
- **Value**: 貼上步驟 4 複製的**完整私鑰內容**
  ```
  -----BEGIN OPENSSH PRIVATE KEY-----
  ... (所有內容) ...
  -----END OPENSSH PRIVATE KEY-----
  ```
- 點擊 **"Add secret"**

---

**② SERVER_HOST** 🌐

- 點擊 **"New repository secret"**
- **Name**: `SERVER_HOST`
- **Value**: `152.42.204.18` (您的服務器 IP 地址)
- 點擊 **"Add secret"**

---

**③ SERVER_USER** 👤

- 點擊 **"New repository secret"**
- **Name**: `SERVER_USER`
- **Value**: `root` (或您的 SSH 用戶名)
- 點擊 **"Add secret"**

---

### 步驟 6: 驗證設定

#### 6.1 檢查 Secrets 清單

確認您已設定以下 3 個 Secrets：
- ✅ SSH_PRIVATE_KEY
- ✅ SERVER_HOST
- ✅ SERVER_USER

#### 6.2 重新運行 GitHub Actions

**方法 A: 重新運行失敗的 workflow**
1. 前往 [Actions 頁面](https://github.com/nrps9909/TAHRD-Graduation-Project/actions)
2. 點擊最新的失敗 workflow
3. 點擊 **"Re-run failed jobs"**

**方法 B: 推送新的 commit**
```bash
git commit --allow-empty -m "ci: test SSH connection"
git push origin production
```

---

## 🐛 故障排查

### 問題 1: "Permission denied (publickey)"

**原因：** 公鑰未正確添加到服務器

**解決：**
```bash
# 在服務器上檢查
cat ~/.ssh/authorized_keys

# 確保包含您的公鑰
# 檢查權限
ls -la ~/.ssh/
# 應該是：drwx------ (700) 對於 .ssh/
# 應該是：-rw------- (600) 對於 authorized_keys

# 修正權限
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

---

### 問題 2: "ssh: no key found"

**原因：** 私鑰內容不完整或格式錯誤

**解決：**
1. 重新複製私鑰內容，確保包含：
   - 開頭的 `-----BEGIN...-----`
   - 所有中間行（不要漏掉任何一行）
   - 結尾的 `-----END...-----`

2. 確保沒有多餘的空格或換行

3. 在 GitHub Secrets 中**更新** SSH_PRIVATE_KEY

---

### 問題 3: "Host key verification failed"

**原因：** 服務器的 host key 未被信任

**解決方法 1：在本地先連接一次**
```bash
ssh -i ~/.ssh/github_actions_deploy root@152.42.204.18
# 輸入 'yes' 接受 host key
```

**解決方法 2：修改 workflow**
在 workflow 檔案中添加：
```yaml
- name: Deploy to production server
  uses: appleboy/ssh-action@v1.0.0
  with:
    host: ${{ secrets.SERVER_HOST }}
    username: ${{ secrets.SERVER_USER }}
    key: ${{ secrets.SSH_PRIVATE_KEY }}
    # 添加這行來跳過 host key 驗證（僅限內部網路）
    script_stop: false
```

---

### 問題 4: 使用現有的 SSH 密鑰

如果您已經有 SSH 密鑰（例如 `~/.ssh/id_rsa`）：

```bash
# 查看現有密鑰
ls -la ~/.ssh/

# 使用現有私鑰
cat ~/.ssh/id_rsa

# 確保對應的公鑰在服務器上
cat ~/.ssh/id_rsa.pub
```

然後在 GitHub Secrets 中使用現有的私鑰內容。

---

## 🔒 安全最佳實踐

### ✅ 推薦做法

1. **為 CI/CD 使用專用密鑰**
   - 不要使用您的個人 SSH 密鑰
   - 為 GitHub Actions 生成單獨的密鑰對

2. **不要設定 passphrase**
   - CI/CD 需要無密碼認證
   - 通過限制密鑰權限來保護安全

3. **限制服務器上的權限**
   ```bash
   # 在服務器上，為 CI/CD 創建專用用戶（可選）
   useradd -m -s /bin/bash deploy
   # 將公鑰添加到 deploy 用戶
   # 使用 sudo 來執行需要權限的命令
   ```

4. **定期輪換密鑰**
   - 每 3-6 個月更換一次 SSH 密鑰
   - 移除不再使用的舊密鑰

### ❌ 避免做法

1. ❌ 不要將私鑰提交到 Git
2. ❌ 不要在日誌中顯示私鑰
3. ❌ 不要使用弱密鑰（使用至少 2048 位元的 RSA 或 ED25519）
4. ❌ 不要共享私鑰

---

## 📚 參考資料

- [SSH 密鑰生成教學](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent)
- [GitHub Actions SSH Action](https://github.com/appleboy/ssh-action)
- [GitHub Secrets 管理](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

---

## ✅ 完成檢查清單

設定完成前，請確認：

- [ ] 已生成 SSH 密鑰對（或使用現有的）
- [ ] 公鑰已添加到服務器的 `~/.ssh/authorized_keys`
- [ ] 服務器上的 SSH 目錄權限正確（700 和 600）
- [ ] 本地測試 SSH 連接成功
- [ ] 在 GitHub 設定了 `SSH_PRIVATE_KEY` secret
- [ ] 在 GitHub 設定了 `SERVER_HOST` secret
- [ ] 在 GitHub 設定了 `SERVER_USER` secret
- [ ] 重新運行 GitHub Actions workflow

---

🎉 **設定完成後，您的 CI/CD 就能自動部署了！**

