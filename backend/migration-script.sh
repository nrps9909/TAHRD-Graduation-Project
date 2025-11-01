#!/bin/bash

# Assistant to Island Migration Script
# 自動執行所有代碼遷移

set -e

echo "🚀 開始 Assistant 到 Island 完整遷移..."
echo ""

# Phase 3: Backend Services
echo "📦 Phase 3: 更新 Backend Services..."

# 刪除 assistantService.ts
if [ -f "src/services/assistantService.ts" ]; then
  echo "  ❌ 刪除 assistantService.ts"
  rm src/services/assistantService.ts
fi

# 更新所有引用 AssistantType 為 CategoryType
echo "  🔄 更新所有 AssistantType 引用為 CategoryType..."
find src -type f -name "*.ts" -exec sed -i.bak "s/AssistantType/CategoryType/g" {} \;
find src -type f -name "*.ts" -exec sed -i.bak "s/assistant_type/category_type/g" {} \;

# 清理備份文件
find src -name "*.bak" -delete

echo "  ✅ Backend Services 基礎更新完成"
echo ""

# Phase 4: GraphQL Schema
echo "📡 Phase 4: 更新 GraphQL Schema..."
echo "  ⚠️  需要手動處理複雜的 GraphQL 變更"
echo ""

echo "✅ 自動遷移腳本執行完成！"
echo ""
echo "⚠️  接下來需要手動處理："
echo "  1. 檢查編譯錯誤：npm run build"
echo "  2. 修復函數簽名（assistantId → islandId）"
echo "  3. 更新 GraphQL Schema"
echo "  4. 更新 Frontend"
echo ""

