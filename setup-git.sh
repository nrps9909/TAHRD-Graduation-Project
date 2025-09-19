#!/bin/bash

# 設置 ccadventure 主目錄的 git 倉庫
echo "🐱 設置 CCAdventure Git 倉庫"
echo "=============================="

# 確保在正確的目錄
cd /home/jesse/Project/ccadventure

# 設置 git 用戶
git config user.email "ccadventure@example.com"
git config user.name "CCAdventure Team"

# 創建 .gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/
*.local

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Database files
*.sqlite
*.sqlite3
*.db
database.sqlite

# Workspace (generated files)
workspace/

# Cache
.cache
.npm
.eslintcache
*.tsbuildinfo

# OS generated files
.DS_Store
.DS_Store?
._*
Thumbs.db
*:Zone.Identifier

# Logs
*.log
logs/

# Temporary
tmp/
temp/
EOF

# 添加所有文件
git add .

# 創建初始提交
git commit -m "初始化 CCAdventure 完整專案

- ccadventure-game/: 完整的教育遊戲應用
- src/: 源代碼文件
- 包含 Live2D 貓咪老師整合
- Gemini AI 助手支援
- 黃金比例登錄界面設計
- 完整的前後端架構

🐱 Generated with CCAdventure Development Team"

echo "Git 設置完成！"
echo "現在可以設置遠程倉庫並推送："
echo "git remote add origin https://github.com/nrps9909/vibecoding4fun.git"
echo "git push -u origin main"