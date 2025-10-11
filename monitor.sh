#!/bin/bash
# Heart Whisper Town - 監控腳本

echo "==================================="
echo "Heart Whisper Town 服務監控"
echo "時間: $(date '+%Y-%m-%d %H:%M:%S')"
echo "==================================="
echo ""

# 檢查容器狀態
echo "📦 容器狀態："
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep heart-whisper

echo ""
echo "💾 磁碟使用："
df -h / | grep -E 'Filesystem|/$'

echo ""
echo "🧠 內存使用："
free -h | grep -E 'Mem:|Swap:'

echo ""
echo "🐳 Docker 資源："
docker system df

echo ""
echo "📊 容器資源使用（最近 5 秒平均）："
timeout 6 docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep heart-whisper

echo ""
echo "==================================="
