#!/bin/bash

# Git & Claude Code 互動教學平台啟動腳本

echo "🚀 Git & Claude Code 互動教學平台"
echo "=================================="
echo ""

# 檢查 Node.js 是否安裝
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安裝"
    echo "請先安裝 Node.js："
    echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
    echo "  source ~/.bashrc"
    echo "  nvm install --lts"
    exit 1
fi

echo "✅ Node.js 版本: $(node --version)"
echo ""

# 檢查是否在 WSL 環境
if grep -qi microsoft /proc/version; then
    echo "✅ 檢測到 WSL 環境"
    echo ""
fi

# 檢查專案目錄
if [ ! -f "package.json" ]; then
    echo "❌ 請在專案根目錄執行此腳本"
    exit 1
fi

echo "📦 安裝相依套件..."
echo "=================================="
npm install

if [ $? -ne 0 ]; then
    echo "❌ 套件安裝失敗"
    exit 1
fi

echo ""
echo "🎮 啟動開發伺服器..."
echo "=================================="
echo ""
echo "應用程式將在以下位址啟動："
echo "  📍 本地: http://localhost:5173/"
echo ""
echo "按 Ctrl+C 停止伺服器"
echo "=================================="
echo ""

# 啟動開發伺服器
npm run dev