#!/bin/bash
# Heart Whisper Town - 備份腳本

BACKUP_DIR="/home/jesse/backups"
DATE=$(date +%Y%m%d_%H%M%S)
PROJECT_DIR="/home/jesse/heart-whisper-town"

echo "🗂️  開始備份 Heart Whisper Town..."

# 創建備份目錄
mkdir -p "$BACKUP_DIR"

# 備份配置文件
echo "📋 備份配置文件..."
tar -czf "$BACKUP_DIR/config_$DATE.tar.gz" \
    "$PROJECT_DIR/.env.production" \
    "$PROJECT_DIR/docker-compose.production.yml" \
    "$PROJECT_DIR/nginx/" \
    2>/dev/null

# 備份記憶數據
echo "💾 備份記憶數據..."
tar -czf "$BACKUP_DIR/memories_$DATE.tar.gz" \
    "$PROJECT_DIR/backend/memories/" \
    2>/dev/null

# 備份資料庫（Redis 數據）
echo "💿 備份 Redis 數據..."
docker exec heart-whisper-redis redis-cli SAVE > /dev/null 2>&1
docker cp heart-whisper-redis:/data/dump.rdb "$BACKUP_DIR/redis_$DATE.rdb" 2>/dev/null

# 清理舊備份（保留最近 7 天）
echo "🧹 清理舊備份..."
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete
find "$BACKUP_DIR" -name "*.rdb" -mtime +7 -delete

# 顯示備份信息
echo ""
echo "✅ 備份完成！"
echo "備份位置: $BACKUP_DIR"
echo "備份文件："
ls -lh "$BACKUP_DIR" | grep "$DATE"
echo ""
echo "磁碟使用："
du -sh "$BACKUP_DIR"
