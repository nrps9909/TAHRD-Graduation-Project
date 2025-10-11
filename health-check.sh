#!/bin/bash
# Heart Whisper Town - 健康檢查腳本

HEALTH_URL="http://localhost/health"
LOG_FILE="/home/jesse/heart-whisper-town/logs/health-check.log"

# 檢查服務健康狀態
response=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL")

if [ "$response" = "200" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ 服務正常" >> "$LOG_FILE"
    exit 0
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ 服務異常 (HTTP $response)" >> "$LOG_FILE"

    # 嘗試重啟服務
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🔄 嘗試重啟服務..." >> "$LOG_FILE"
    cd /home/jesse/heart-whisper-town
    docker-compose -f docker-compose.production.yml restart

    exit 1
fi
