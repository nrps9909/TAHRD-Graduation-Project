#!/bin/bash

# 檢查剩餘的 Assistant 系統引用

echo "=========================================="
echo "🔍 檢查剩餘的 Assistant 系統引用"
echo "=========================================="
echo ""

echo "1️⃣  檢查 assistantService 導入..."
echo ""
grep -rn "from.*assistantService" src/ --include="*.ts" --color=always | head -20
echo ""

echo "2️⃣  檢查 assistantService 使用..."
echo ""
grep -rn "assistantService\." src/ --include="*.ts" --color=always | head -30
echo ""

echo "3️⃣  檢查 assistantId 參數..."
echo ""
grep -rn "assistantId:" src/ --include="*.ts" --color=always | head -20
echo ""

echo "4️⃣  檢查 assistantId 變量..."
echo ""
grep -rn "assistantId" src/ --include="*.ts" | grep -v "//.*assistantId" | grep -v "node_modules" | wc -l
echo " 個引用找到"
echo ""

echo "5️⃣  檢查 Assistant 類型導入..."
echo ""
grep -rn "Assistant\?" src/ --include="*.ts" --color=always | head -10
echo ""

echo "=========================================="
echo "✅ 檢查完成"
echo "=========================================="
echo ""
echo "建議："
echo "  1. 手動修改上述文件"
echo "  2. 參考 CLEANUP_ASSISTANT_GUIDE.md"
echo "  3. 每修改一個文件後執行: npx tsc --noEmit"
echo ""
