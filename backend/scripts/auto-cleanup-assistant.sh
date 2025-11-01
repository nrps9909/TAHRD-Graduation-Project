#!/bin/bash

# 自動清理 Assistant 系統的腳本
# 警告：此腳本會直接修改代碼文件

echo "=========================================="
echo "🧹 自動清理 Assistant 系統"
echo "=========================================="
echo ""

cd /home/jesse/Project/TAHRD-Graduation-Project/backend

# 備份當前狀態
echo "📦 創建備份..."
git add .
git stash push -m "backup-before-assistant-cleanup-$(date +%Y%m%d-%H%M%S)"
echo "✅ 備份完成（使用 git stash list 查看）"
echo ""

# 1. 刪除 assistantService.ts
echo "🗑️  刪除 assistantService.ts..."
if [ -f "src/services/assistantService.ts" ]; then
    rm src/services/assistantService.ts
    echo "✅ 已刪除"
else
    echo "⏭️  文件不存在，跳過"
fi
echo ""

# 2. 刪除 assistantResolvers.ts
echo "🗑️  刪除 assistantResolvers.ts..."
if [ -f "src/resolvers/assistantResolvers.ts" ]; then
    rm src/resolvers/assistantResolvers.ts
    echo "✅ 已刪除"
else
    echo "⏭️  文件不存在，跳過"
fi
echo ""

echo "=========================================="
echo "✅ 自動清理完成"
echo "=========================================="
echo ""
echo "下一步："
echo "  1. 手動編輯剩餘文件（參考 CLEANUP_ASSISTANT_GUIDE.md）"
echo "  2. 運行: npx tsc --noEmit"
echo "  3. 如需恢復: git stash pop"
echo ""
