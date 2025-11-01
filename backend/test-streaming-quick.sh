#!/bin/bash

# 快速測試 Streaming 功能的腳本
# 使用方法：
# 1. chmod +x test-streaming-quick.sh
# 2. ./test-streaming-quick.sh YOUR_TOKEN

TOKEN="$1"

if [ -z "$TOKEN" ]; then
  echo "❌ 請提供 token"
  echo ""
  echo "使用方法："
  echo "  ./test-streaming-quick.sh YOUR_TOKEN"
  echo ""
  echo "💡 如何獲取 token:"
  echo "  1. 打開前端應用並登入"
  echo "  2. 打開瀏覽器開發者工具 (F12)"
  echo "  3. 到 Application/Storage -> Local Storage"
  echo "  4. 找到 'token' 或 'authToken' 欄位"
  echo "  5. 複製 token 值"
  exit 1
fi

echo "============================================================"
echo "🧪 Streaming 知識上傳測試"
echo "============================================================"
echo ""
echo "📝 測試內容: 今天學習了 React hooks，感覺很有收穫！"
echo ""
echo "⏳ 開始測試..."
echo ""

curl -X POST http://localhost:4000/api/knowledge/upload-stream \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"今天學習了 React hooks，特別是 useState 和 useEffect 的用法，感覺很有收穫！","files":[],"links":[]}' \
  --no-buffer \
  -w "\n\n⏱️  總時間: %{time_total}s\n" \
  2>&1

echo ""
echo "============================================================"
echo "✅ 測試完成"
echo "============================================================"
