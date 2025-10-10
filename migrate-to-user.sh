#!/bin/bash

# ========================================
# 將 Heart Whisper Town 從 root 遷移到用戶目錄
# ========================================

set -e

echo "🔄 開始遷移專案到用戶目錄"
echo "=========================================="

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 檢查是否為 root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ 請使用 sudo 執行此腳本${NC}"
    exit 1
fi

# 獲取目標用戶
TARGET_USER="${1:-jesse}"
echo -e "${YELLOW}目標用戶: $TARGET_USER${NC}"

# 確認用戶存在
if ! id "$TARGET_USER" &>/dev/null; then
    echo -e "${RED}❌ 用戶 $TARGET_USER 不存在${NC}"
    exit 1
fi

OLD_PROJECT_DIR="/opt/heart-whisper-town"
NEW_PROJECT_DIR="/home/$TARGET_USER/heart-whisper-town"

# 顯示初始磁碟使用情況
echo -e "${YELLOW}📊 初始磁碟使用情況：${NC}"
df -h / | grep -E 'Filesystem|/$'
echo ""

# 步驟 1: 停止並移除舊的 Docker 容器
echo -e "${YELLOW}📦 步驟 1/5: 停止 Docker 容器...${NC}"
if [ -d "$OLD_PROJECT_DIR" ]; then
    cd "$OLD_PROJECT_DIR"
    if [ -f "docker-compose.production.yml" ]; then
        docker-compose -f docker-compose.production.yml down -v
        echo -e "${GREEN}✅ Docker 容器已停止並移除${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  舊專案目錄不存在，跳過此步驟${NC}"
fi

# 步驟 2: 清理 Docker 資源（節省空間）
echo -e "${YELLOW}🧹 步驟 2/5: 清理 Docker 資源...${NC}"
echo -e "${YELLOW}當前 Docker 資源使用情況：${NC}"
docker system df

echo ""
echo -e "${YELLOW}開始清理...${NC}"
echo -e "${YELLOW}停止所有運行中的容器...${NC}"
docker stop $(docker ps -aq) 2>/dev/null || true

echo -e "${YELLOW}刪除所有容器...${NC}"
docker rm $(docker ps -aq) 2>/dev/null || true

echo -e "${YELLOW}刪除所有映像...${NC}"
docker rmi $(docker images -q) -f 2>/dev/null || true

echo -e "${YELLOW}清理所有卷（包括命名卷）...${NC}"
docker volume rm $(docker volume ls -q) 2>/dev/null || true

echo -e "${YELLOW}清理所有網絡...${NC}"
docker network prune -f

echo -e "${YELLOW}執行系統級清理...${NC}"
docker system prune -af --volumes

echo ""
echo -e "${GREEN}✅ Docker 資源清理完成${NC}"
echo -e "${YELLOW}清理後 Docker 資源使用情況：${NC}"
docker system df

# 步驟 3: 移動或複製專案（如果存在）
echo -e "${YELLOW}📂 步驟 3/5: 遷移專案文件...${NC}"
if [ -d "$OLD_PROJECT_DIR" ]; then
    # 檢查新目錄是否已存在
    if [ -d "$NEW_PROJECT_DIR" ]; then
        echo -e "${YELLOW}⚠️  目標目錄已存在，備份舊目錄...${NC}"
        mv "$NEW_PROJECT_DIR" "$NEW_PROJECT_DIR.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    # 移動專案
    echo -e "${YELLOW}移動 $OLD_PROJECT_DIR 到 $NEW_PROJECT_DIR...${NC}"
    mv "$OLD_PROJECT_DIR" "$NEW_PROJECT_DIR"
    
    # 修改所有權
    chown -R $TARGET_USER:$TARGET_USER "$NEW_PROJECT_DIR"
    
    echo -e "${GREEN}✅ 專案已遷移到 $NEW_PROJECT_DIR${NC}"
else
    echo -e "${YELLOW}⚠️  舊專案不存在，將在新位置克隆專案${NC}"
    echo "請輸入 GitHub 專案 URL (或按 Enter 跳過):"
    read REPO_URL
    
    if [ -n "$REPO_URL" ]; then
        su - $TARGET_USER -c "git clone -b production $REPO_URL $NEW_PROJECT_DIR"
        echo -e "${GREEN}✅ 專案已克隆到 $NEW_PROJECT_DIR${NC}"
    fi
fi

# 步驟 4: 將用戶加入 docker 群組
echo -e "${YELLOW}🐳 步驟 4/5: 配置 Docker 權限...${NC}"
usermod -aG docker $TARGET_USER
echo -e "${GREEN}✅ $TARGET_USER 已加入 docker 群組${NC}"
echo -e "${YELLOW}⚠️  注意: $TARGET_USER 需要登出後重新登入才能使用 docker${NC}"

# 步驟 5: 設置環境文件權限
echo -e "${YELLOW}⚙️  步驟 5/5: 檢查環境配置...${NC}"
if [ -d "$NEW_PROJECT_DIR" ]; then
    cd "$NEW_PROJECT_DIR"
    
    if [ -f ".env.production" ]; then
        chown $TARGET_USER:$TARGET_USER .env.production
        chmod 600 .env.production
        echo -e "${GREEN}✅ .env.production 權限已設置${NC}"
    else
        echo -e "${YELLOW}⚠️  .env.production 不存在，請記得創建${NC}"
    fi
fi

# 清理舊的專案目錄（如果還存在）
if [ -d "$OLD_PROJECT_DIR" ]; then
    echo -e "${YELLOW}🗑️  移除舊專案目錄 $OLD_PROJECT_DIR...${NC}"
    rm -rf "$OLD_PROJECT_DIR"
    echo -e "${GREEN}✅ 舊專案目錄已移除${NC}"
fi

# 清理額外的資源
echo -e "${YELLOW}🧹 清理額外的資源...${NC}"

# 清理 Docker 構建緩存
echo -e "${YELLOW}清理 Docker 構建緩存...${NC}"
docker builder prune -af 2>/dev/null || true

# 清理 npm 緩存（如果存在）
if [ -d "/root/.npm" ]; then
    echo -e "${YELLOW}清理 root 的 npm 緩存...${NC}"
    rm -rf /root/.npm
fi

# 清理臨時文件
echo -e "${YELLOW}清理系統臨時文件...${NC}"
rm -rf /tmp/heart-whisper-town* 2>/dev/null || true
rm -rf /tmp/docker-* 2>/dev/null || true

# 清理日誌文件（保留最近的）
if [ -d "/var/log/heart-whisper-town" ]; then
    echo -e "${YELLOW}清理舊日誌文件...${NC}"
    find /var/log/heart-whisper-town -name "*.log" -mtime +7 -delete 2>/dev/null || true
fi

# 清理 apt 緩存
echo -e "${YELLOW}清理 apt 緩存...${NC}"
apt-get clean 2>/dev/null || true
apt-get autoremove -y 2>/dev/null || true

echo -e "${GREEN}✅ 額外資源清理完成${NC}"

# 顯示最終磁碟使用情況
echo ""
echo -e "${GREEN}=========================================="
echo "📊 最終磁碟使用情況："
echo "==========================================${NC}"
df -h / | grep -E 'Filesystem|/$'

echo ""
echo -e "${GREEN}📊 空間釋放統計：${NC}"
echo "Docker 系統："
docker system df

echo ""
echo -e "${GREEN}=========================================="
echo "🎉 遷移完成！"
echo "==========================================${NC}"
echo ""
echo -e "${YELLOW}下一步操作：${NC}"
echo ""
echo "1. 切換到 $TARGET_USER 用戶："
echo "   su - $TARGET_USER"
echo ""
echo "2. 進入專案目錄："
echo "   cd ~/heart-whisper-town"
echo ""
echo "3. 檢查/編輯環境配置："
echo "   nano .env.production"
echo ""
echo "4. 啟動服務："
echo "   docker-compose -f docker-compose.production.yml up -d --build"
echo ""
echo "5. 查看服務狀態："
echo "   docker-compose -f docker-compose.production.yml ps"
echo ""
echo "6. 查看日誌："
echo "   docker-compose -f docker-compose.production.yml logs -f"
echo ""
echo -e "${YELLOW}💡 提示: 如果 docker 命令報權限錯誤，請登出後重新登入${NC}"
echo ""

