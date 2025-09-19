#!/bin/bash

echo "🚀 推送 CCAdventure 到 GitHub"
echo "============================="

# 確保在正確目錄
cd /home/jesse/Project/ccadventure

# 顯示當前狀態
echo "當前目錄: $(pwd)"
echo "Git 狀態:"
git status --short

echo ""
echo "提交歷史:"
git log --oneline

echo ""
echo "遠程倉庫:"
git remote -v

echo ""
echo "準備推送到 GitHub..."
echo "執行命令: git push -u origin main"
echo ""

# 提示用戶
echo "注意: 由於需要身份驗證，此腳本將顯示命令但不會執行推送。"
echo "請在你的本地機器上運行以下命令:"
echo ""
echo "cd /path/to/your/local/ccadventure"
echo "git push -u origin main"
echo ""

echo "或者，如果你有 GitHub CLI，可以運行:"
echo "gh auth login"
echo "git push -u origin main"