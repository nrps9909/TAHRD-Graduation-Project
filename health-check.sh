#!/bin/bash
# Heart Whisper Town - 健康檢查腳本

LOG_FILE="/home/jesse/heart-whisper-town/logs/health-check.log"
COMPOSE_FILE="/home/jesse/heart-whisper-town/docker-compose.production-prebuilt.yml"

# 檢查後端容器健康狀態（通過 Docker healthcheck）
backend_health=$(docker inspect --format='{{.State.Health.Status}}' heart-whisper-backend 2>/dev/null)

if [ "$backend_health" = "healthy" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ 服務正常" >> "$LOG_FILE"
    exit 0
elif [ "$backend_health" = "starting" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⏳ 服務啟動中，跳過本次檢查" >> "$LOG_FILE"
    exit 0
elif [ -z "$backend_health" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ 後端容器不存在" >> "$LOG_FILE"

    # 嘗試重啟服務
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🔄 嘗試重啟服務..." >> "$LOG_FILE"
    cd /home/jesse/heart-whisper-town
    docker-compose -f "$COMPOSE_FILE" up -d

    exit 1
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ 服務異常 (狀態: $backend_health)" >> "$LOG_FILE"

    # 嘗試重啟僅後端服務（避免影響其他服務）
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🔄 嘗試重啟後端服務..." >> "$LOG_FILE"
    cd /home/jesse/heart-whisper-town
    docker-compose -f "$COMPOSE_FILE" restart backend

    exit 1
fi
