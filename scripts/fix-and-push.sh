#!/bin/bash

# CCAdventure Git 修復和推送腳本
echo "🐱 CCAdventure Git 修復和推送腳本"
echo "================================"

# 檢查當前目錄
echo "當前目錄: $(pwd)"

# 檢查 git 狀態
echo "檢查 Git 狀態..."
git status

# 檢查分支
echo "檢查分支..."
git branch -a

# 檢查提交
echo "檢查提交..."
git log --oneline

# 檢查遠程配置
echo "檢查遠程配置..."
git remote -v

# 方法1: 強制推送 (如果你確定要覆蓋遠程倉庫)
echo ""
echo "方法1: 強制推送到 GitHub"
echo "警告: 這將覆蓋遠程倉庫的任何現有內容"
echo "運行命令: git push --force-with-lease origin main"
echo ""

# 方法2: 重新設置分支
echo "方法2: 重新設置分支"
echo "如果上述方法失敗，運行以下命令:"
echo "git branch -M main"  # 確保分支名稱正確
echo "git push -u origin main"
echo ""

# 方法3: 檢查並修復HEAD
echo "方法3: 檢查並修復 HEAD"
echo "git symbolic-ref HEAD refs/heads/main"
echo "git push -u origin main"
echo ""

# 方法4: 重建倉庫關聯
echo "方法4: 重建倉庫關聯"
echo "git remote remove origin"
echo "git remote add origin https://github.com/nrps9909/vibecoding4fun.git"
echo "git push -u origin main"
echo ""

echo "================================"
echo "請選擇一個方法執行，或將整個專案複製到本地機器推送"
echo "你的專案已完全準備好！🚀"