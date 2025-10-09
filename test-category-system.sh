#!/bin/bash

echo "🧪 測試自訂分類系統"
echo "===================="
echo ""

# 顏色定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 測試計數器
PASSED=0
FAILED=0

# 測試函數
test_query() {
    local name=$1
    local query=$2
    local expected=$3

    echo -n "Testing: $name... "

    result=$(curl -s http://localhost:4000/graphql \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"$query\"}" | jq -r "$expected")

    if [ "$result" != "null" ] && [ "$result" != "" ]; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        echo "  Expected: non-null/non-empty"
        echo "  Got: $result"
        ((FAILED++))
        return 1
    fi
}

echo "📊 1. 檢查 GraphQL Schema"
echo "------------------------"

# 檢查 Island 類型
test_query "Island type exists" \
    "query { __type(name: \"Island\") { name } }" \
    ".data.__type.name"

# 檢查 Subcategory 類型
test_query "Subcategory type exists" \
    "query { __type(name: \"Subcategory\") { name } }" \
    ".data.__type.name"

# 檢查 CategoryStats 類型
test_query "CategoryStats type exists" \
    "query { __type(name: \"CategoryStats\") { name } }" \
    ".data.__type.name"

echo ""
echo "🔍 2. 檢查 Query 操作"
echo "--------------------"

# 檢查 islands query
test_query "islands query exists" \
    "query { __type(name: \"Query\") { fields { name } } }" \
    ".data.__type.fields[] | select(.name == \"islands\") | .name"

# 檢查 subcategories query
test_query "subcategories query exists" \
    "query { __type(name: \"Query\") { fields { name } } }" \
    ".data.__type.fields[] | select(.name == \"subcategories\") | .name"

# 檢查 categoryStats query
test_query "categoryStats query exists" \
    "query { __type(name: \"Query\") { fields { name } } }" \
    ".data.__type.fields[] | select(.name == \"categoryStats\") | .name"

echo ""
echo "✏️ 3. 檢查 Mutation 操作"
echo "----------------------"

# 檢查 createIsland mutation
test_query "createIsland mutation exists" \
    "query { __type(name: \"Mutation\") { fields { name } } }" \
    ".data.__type.fields[] | select(.name == \"createIsland\") | .name"

# 檢查 createSubcategory mutation
test_query "createSubcategory mutation exists" \
    "query { __type(name: \"Mutation\") { fields { name } } }" \
    ".data.__type.fields[] | select(.name == \"createSubcategory\") | .name"

# 檢查 updateIsland mutation
test_query "updateIsland mutation exists" \
    "query { __type(name: \"Mutation\") { fields { name } } }" \
    ".data.__type.fields[] | select(.name == \"updateIsland\") | .name"

# 檢查 deleteIsland mutation
test_query "deleteIsland mutation exists" \
    "query { __type(name: \"Mutation\") { fields { name } } }" \
    ".data.__type.fields[] | select(.name == \"deleteIsland\") | .name"

# 檢查 initializeCategories mutation
test_query "initializeCategories mutation exists" \
    "query { __type(name: \"Mutation\") { fields { name } } }" \
    ".data.__type.fields[] | select(.name == \"initializeCategories\") | .name"

echo ""
echo "📝 4. 檢查 Input 類型"
echo "-------------------"

# 檢查 CreateIslandInput
test_query "CreateIslandInput type exists" \
    "query { __type(name: \"CreateIslandInput\") { name } }" \
    ".data.__type.name"

# 檢查 CreateSubcategoryInput
test_query "CreateSubcategoryInput type exists" \
    "query { __type(name: \"CreateSubcategoryInput\") { name } }" \
    ".data.__type.name"

echo ""
echo "🌐 5. 檢查前端文件"
echo "----------------"

if [ -f "/home/jesse/Project/TAHRD-Graduation-Project/frontend/src/graphql/category.ts" ]; then
    echo -e "${GREEN}✓ PASS${NC} category.ts exists"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC} category.ts missing"
    ((FAILED++))
fi

if [ -f "/home/jesse/Project/TAHRD-Graduation-Project/frontend/src/components/CategoryManagementModal.tsx" ]; then
    echo -e "${GREEN}✓ PASS${NC} CategoryManagementModal.tsx exists"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC} CategoryManagementModal.tsx missing"
    ((FAILED++))
fi

echo ""
echo "🔧 6. 檢查後端文件"
echo "----------------"

if [ -f "/home/jesse/Project/TAHRD-Graduation-Project/backend/src/schema/categorySchema.ts" ]; then
    echo -e "${GREEN}✓ PASS${NC} categorySchema.ts exists"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC} categorySchema.ts missing"
    ((FAILED++))
fi

if [ -f "/home/jesse/Project/TAHRD-Graduation-Project/backend/src/resolvers/categoryResolvers.ts" ]; then
    echo -e "${GREEN}✓ PASS${NC} categoryResolvers.ts exists"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC} categoryResolvers.ts missing"
    ((FAILED++))
fi

if [ -f "/home/jesse/Project/TAHRD-Graduation-Project/backend/src/services/categoryService.ts" ]; then
    echo -e "${GREEN}✓ PASS${NC} categoryService.ts exists"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC} categoryService.ts missing"
    ((FAILED++))
fi

if [ -f "/home/jesse/Project/TAHRD-Graduation-Project/backend/src/services/categoryInitService.ts" ]; then
    echo -e "${GREEN}✓ PASS${NC} categoryInitService.ts exists"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC} categoryInitService.ts missing"
    ((FAILED++))
fi

echo ""
echo "📊 測試結果"
echo "=========="
echo -e "通過: ${GREEN}$PASSED${NC}"
echo -e "失敗: ${RED}$FAILED${NC}"
echo -e "總計: $((PASSED + FAILED))"

if [ $FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 所有測試通過！自訂分類系統正常運作！${NC}"
    exit 0
else
    echo ""
    echo -e "${YELLOW}⚠️ 有 $FAILED 個測試失敗，請檢查上面的錯誤訊息${NC}"
    exit 1
fi
