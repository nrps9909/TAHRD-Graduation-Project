#!/bin/bash

# 部署故障排查腳本

echo "🔍 心語小鎮 - 部署故障排查"
echo "=========================================="
echo ""

cd /home/jesse/heart-whisper-town

echo "📊 步驟 1: 檢查容器狀態"
echo "----------------------------------------"
docker-compose -f docker-compose.production-prebuilt.yml ps
echo ""

echo "📝 步驟 2: 查看後端日誌 (最後 50 行)"
echo "----------------------------------------"
docker-compose -f docker-compose.production-prebuilt.yml logs --tail=50 backend
echo ""

echo "🔍 步驟 3: 檢查後端容器詳細資訊"
echo "----------------------------------------"
docker inspect heart-whisper-backend --format='{{.State.Health.Status}}: {{range .State.Health.Log}}{{.Output}}{{end}}'
echo ""

echo "🌐 步驟 4: 檢查網路連接"
echo "----------------------------------------"
docker-compose -f docker-compose.production-prebuilt.yml exec backend curl -f http://localhost:4000/health || echo "健康檢查失敗"
echo ""

echo "📋 步驟 5: 檢查環境變數"
echo "----------------------------------------"
echo "檢查 .env.production 是否存在："
ls -la .env.production
echo ""

echo "🔄 建議的修復步驟："
echo "1. 檢查上面的日誌找出錯誤原因"
echo "2. 常見問題："
echo "   - 缺少環境變數 (.env.production)"
echo "   - 數據庫連接問題"
echo "   - 端口被占用"
echo "   - API 金鑰配置錯誤"
echo ""

