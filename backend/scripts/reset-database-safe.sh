#!/bin/bash

# 安全的資料庫重置腳本
# 會先詢問確認才執行

echo ""
echo "=========================================="
echo "⚠️  資料庫完全重置"
echo "=========================================="
echo ""
echo "此操作將刪除所有數據，包括："
echo "  ❌ 所有用戶帳號"
echo "  ❌ 所有記憶 (Memory)"
echo "  ❌ 所有島嶼 (Island)"
echo "  ❌ 所有助手 (Assistant)"
echo "  ❌ 所有聊天記錄"
echo "  ❌ 所有知識分發記錄"
echo ""
echo "⚠️  此操作無法復原！"
echo ""
read -p "確定要繼續嗎？輸入 'YES' 確認: " confirm

if [ "$confirm" != "YES" ]; then
    echo ""
    echo "❌ 操作已取消"
    echo ""
    exit 1
fi

echo ""
echo "開始執行資料庫重置..."
echo ""

# 執行 TypeScript 腳本
npx ts-node scripts/reset-database-completely.ts

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✅ 資料庫重置完成"
    echo "=========================================="
    echo ""
    echo "下一步："
    echo "  1. 重新啟動後端服務"
    echo "  2. 系統會自動創建基礎數據"
    echo ""
else
    echo ""
    echo "❌ 重置失敗，請檢查錯誤訊息"
    echo ""
    exit 1
fi
