#!/bin/bash

# ========================================
# 遠程遷移執行腳本
# 自動上傳並執行遷移腳本
# ========================================

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🌸 心語小鎮 - 遠程遷移助手${NC}"
echo "=========================================="

# 檢查配置
SSH_CONFIG="$HOME/.ssh/config"
SSH_HOST="heart-whisper-town"
SSH_USER="jesse"
SSH_IP=""

# 從 SSH config 讀取配置
if [ -f "$SSH_CONFIG" ]; then
    SSH_IP=$(grep -A 3 "Host $SSH_HOST" "$SSH_CONFIG" | grep "HostName" | awk '{print $2}')
    SSH_USER=$(grep -A 3 "Host $SSH_HOST" "$SSH_CONFIG" | grep "User" | awk '{print $2}')
fi

# 如果沒有找到配置，要求用戶輸入
if [ -z "$SSH_IP" ]; then
    echo -e "${YELLOW}未找到 SSH 配置${NC}"
    read -p "請輸入服務器 IP 地址: " SSH_IP
    read -p "請輸入用戶名 [jesse]: " INPUT_USER
    SSH_USER="${INPUT_USER:-jesse}"
else
    echo -e "${GREEN}✅ 找到 SSH 配置${NC}"
    echo "   主機: $SSH_HOST"
    echo "   IP: $SSH_IP"
    echo "   用戶: $SSH_USER"
    echo ""
    read -p "是否使用此配置？(Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]?$ ]]; then
        read -p "請輸入服務器 IP 地址: " SSH_IP
        read -p "請輸入用戶名 [jesse]: " INPUT_USER
        SSH_USER="${INPUT_USER:-jesse}"
    fi
fi

# 設置 SSH 連接
if [ -f "$SSH_CONFIG" ] && grep -q "Host $SSH_HOST" "$SSH_CONFIG"; then
    SSH_TARGET="$SSH_HOST"
else
    SSH_TARGET="$SSH_USER@$SSH_IP"
fi

echo ""
echo -e "${YELLOW}📡 準備連接到: $SSH_TARGET${NC}"
echo ""

# 步驟 1: 測試連接
echo -e "${YELLOW}步驟 1/5: 測試 SSH 連接...${NC}"
if ssh -o ConnectTimeout=5 -o BatchMode=yes "$SSH_TARGET" "echo '連接成功'" 2>/dev/null; then
    echo -e "${GREEN}✅ SSH 連接測試成功${NC}"
else
    echo -e "${YELLOW}⚠️  需要密碼驗證${NC}"
    if ! ssh -o ConnectTimeout=5 "$SSH_TARGET" "echo '連接成功'" 2>/dev/null; then
        echo -e "${RED}❌ 無法連接到服務器${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ SSH 連接成功${NC}"
fi

# 步驟 2: 上傳遷移腳本
echo ""
echo -e "${YELLOW}步驟 2/5: 上傳遷移腳本...${NC}"
SCRIPT_PATH="$(dirname "$0")/migrate-to-user.sh"

if [ ! -f "$SCRIPT_PATH" ]; then
    echo -e "${RED}❌ 找不到遷移腳本: $SCRIPT_PATH${NC}"
    exit 1
fi

if scp "$SCRIPT_PATH" "$SSH_TARGET:/tmp/migrate-to-user.sh"; then
    echo -e "${GREEN}✅ 腳本上傳成功${NC}"
else
    echo -e "${RED}❌ 腳本上傳失敗${NC}"
    exit 1
fi

# 步驟 3: 顯示遷移前狀態
echo ""
echo -e "${YELLOW}步驟 3/5: 檢查服務器狀態...${NC}"
ssh "$SSH_TARGET" "df -h / | grep -E 'Filesystem|/$'"

# 步驟 4: 執行遷移
echo ""
echo -e "${YELLOW}步驟 4/5: 執行遷移（這可能需要幾分鐘）...${NC}"
echo -e "${RED}⚠️  此操作將：${NC}"
echo "   - 停止所有 Docker 容器"
echo "   - 清理所有 Docker 資源（映像、容器、卷）"
echo "   - 移動專案從 /opt/heart-whisper-town 到 /home/$SSH_USER/heart-whisper-town"
echo "   - 刪除舊專案目錄"
echo "   - 清理系統緩存和臨時文件"
echo ""
read -p "確認要繼續嗎？(yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}❌ 已取消遷移${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}開始遷移...${NC}"
if ssh -t "$SSH_TARGET" "sudo bash /tmp/migrate-to-user.sh $SSH_USER"; then
    echo -e "${GREEN}✅ 遷移執行完成${NC}"
else
    echo -e "${RED}❌ 遷移執行失敗${NC}"
    exit 1
fi

# 步驟 5: 提供後續指令
echo ""
echo -e "${GREEN}=========================================="
echo "🎉 遷移腳本執行完成！"
echo "==========================================${NC}"
echo ""
echo -e "${BLUE}📍 下一步操作：${NC}"
echo ""
echo "1. 重新連接到服務器以刷新用戶群組："
echo -e "   ${YELLOW}ssh $SSH_TARGET${NC}"
echo ""
echo "2. 進入專案目錄："
echo -e "   ${YELLOW}cd ~/heart-whisper-town${NC}"
echo ""
echo "3. 檢查 .env.production 配置："
echo -e "   ${YELLOW}cat .env.production${NC}"
echo ""
echo "4. 啟動服務："
echo -e "   ${YELLOW}docker-compose -f docker-compose.production.yml up -d --build${NC}"
echo ""
echo "5. 監控啟動狀態："
echo -e "   ${YELLOW}docker-compose -f docker-compose.production.yml logs -f${NC}"
echo ""
echo -e "${GREEN}💡 想要現在立即連接到服務器？${NC}"
read -p "按 Enter 連接，或 Ctrl+C 退出... "

# 自動連接
echo ""
echo -e "${YELLOW}正在連接到服務器...${NC}"
ssh "$SSH_TARGET"
