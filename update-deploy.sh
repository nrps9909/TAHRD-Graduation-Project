#!/bin/bash
# Heart Whisper Town - 生产环境更新部署脚本
# 使用方法: ./update-deploy.sh [deploy|rollback|logs|status|clean]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
PROJECT_DIR="$(pwd)"
BACKUP_DIR="$PROJECT_DIR/backups"
COMPOSE_FILE="docker-compose.production.yml"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 日志函数
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 创建备份
create_backup() {
    log_info "创建备份..."
    mkdir -p "$BACKUP_DIR"

    # 备份当前运行的镜像信息
    docker-compose -f "$COMPOSE_FILE" images > "$BACKUP_DIR/images_$TIMESTAMP.txt" 2>/dev/null || true

    # 备份环境变量
    [ -f .env.production ] && cp .env.production "$BACKUP_DIR/.env.production_$TIMESTAMP"

    # 备份 Nginx 配置
    [ -d nginx ] && tar -czf "$BACKUP_DIR/nginx_config_$TIMESTAMP.tar.gz" nginx/ 2>/dev/null || true

    log_success "备份已创建: $BACKUP_DIR/*_$TIMESTAMP"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."

    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        # 尝试 HTTPS
        if curl -sf https://jesse-chen.com/health > /dev/null 2>&1; then
            log_success "健康检查通过 (HTTPS)"
            return 0
        fi

        # 尝试 HTTP
        if curl -sf http://localhost/health > /dev/null 2>&1; then
            log_success "健康检查通过 (HTTP)"
            return 0
        fi

        log_warning "等待服务启动... ($attempt/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    done

    log_error "健康检查失败"
    return 1
}

# 部署函数
deploy() {
    echo -e "${BLUE}======================================"
    echo "🚀 Heart Whisper Town - 生产环境部署"
    echo -e "======================================${NC}"

    # 检查是否在正确的目录
    if [ ! -f "$COMPOSE_FILE" ]; then
        log_error "找不到 $COMPOSE_FILE，请确认在项目根目录执行"
        exit 1
    fi

    # 创建备份
    create_backup

    # 拉取最新代码（可选）
    log_info "拉取最新代码..."
    if git rev-parse --git-dir > /dev/null 2>&1; then
        CURRENT_BRANCH=$(git branch --show-current)
        git pull origin "$CURRENT_BRANCH" || {
            log_warning "代码拉取失败，使用本地代码继续"
        }
        log_success "代码更新完成"
    else
        log_warning "不是 Git 仓库，跳过代码拉取"
    fi

    # 停止旧容器
    log_info "停止旧容器..."
    docker-compose -f "$COMPOSE_FILE" down || {
        log_warning "停止容器失败，可能没有运行中的容器"
    }

    # 构建新镜像
    log_info "构建新镜像..."
    docker-compose -f "$COMPOSE_FILE" build --no-cache || {
        log_error "镜像构建失败"
        exit 1
    }

    # 启动服务
    log_info "启动服务..."
    docker-compose -f "$COMPOSE_FILE" up -d

    # 等待服务启动
    sleep 10

    # 健康检查
    if health_check; then
        # 清理旧镜像
        log_info "清理未使用的镜像..."
        docker image prune -f

        echo ""
        log_success "======================================"
        log_success "🎉 部署成功！"
        log_success "======================================"
        echo ""
        log_info "访问: https://jesse-chen.com"
        log_info "查看日志: ./update-deploy.sh logs"
    else
        log_error "部署失败，开始回滚..."
        rollback
        exit 1
    fi
}

# 回滚函数
rollback() {
    log_warning "======================================"
    log_warning "🔄 开始回滚到上一个版本"
    log_warning "======================================"

    # 查找最近的备份
    latest_backup=$(ls -t "$BACKUP_DIR"/.env.production_* 2>/dev/null | head -1)

    if [ -z "$latest_backup" ]; then
        log_error "找不到备份文件"
        exit 1
    fi

    # 恢复环境变量
    log_info "恢复环境变量..."
    cp "$latest_backup" .env.production

    # 恢复 Nginx 配置
    latest_nginx_backup=$(ls -t "$BACKUP_DIR"/nginx_config_*.tar.gz 2>/dev/null | head -1)
    if [ -n "$latest_nginx_backup" ]; then
        log_info "恢复 Nginx 配置..."
        tar -xzf "$latest_nginx_backup" -C "$PROJECT_DIR"
    fi

    # 重启服务
    log_info "重启服务..."
    docker-compose -f "$COMPOSE_FILE" down
    docker-compose -f "$COMPOSE_FILE" up -d

    sleep 10

    if health_check; then
        log_success "回滚成功"
    else
        log_error "回滚失败，请手动检查"
        exit 1
    fi
}

# 查看日志
view_logs() {
    echo -e "${BLUE}======================================"
    echo "📋 服务日志"
    echo -e "======================================${NC}"

    if [ -n "$1" ]; then
        docker-compose -f "$COMPOSE_FILE" logs -f --tail=100 "$1"
    else
        docker-compose -f "$COMPOSE_FILE" logs -f --tail=100
    fi
}

# 查看状态
view_status() {
    echo -e "${BLUE}======================================"
    echo "📊 服务状态"
    echo -e "======================================${NC}"

    docker-compose -f "$COMPOSE_FILE" ps

    echo ""
    echo -e "${BLUE}======================================"
    echo "🌐 服务健康状态"
    echo -e "======================================${NC}"

    # 检查主服务（HTTPS）
    if curl -sf https://jesse-chen.com/health > /dev/null 2>&1; then
        log_success "主服务 (HTTPS): 运行正常"
    else
        log_error "主服务 (HTTPS): 无响应"
    fi

    # 检查 SSL
    if curl -sfI https://jesse-chen.com 2>/dev/null | grep -q "HTTP/2"; then
        log_success "SSL/HTTPS: 配置正确 (HTTP/2)"
    else
        log_warning "SSL/HTTPS: 可能存在问题"
    fi

    # 检查 GraphQL
    if curl -sf https://jesse-chen.com/graphql -H "Content-Type: application/json" -d '{"query":"{__typename}"}' > /dev/null 2>&1; then
        log_success "GraphQL API: 运行正常"
    else
        log_warning "GraphQL API: 可能存在问题"
    fi

    echo ""
    echo -e "${BLUE}======================================"
    echo "💾 磁盘使用情况"
    echo -e "======================================${NC}"
    df -h | grep -E "Filesystem|/$"

    echo ""
    echo -e "${BLUE}======================================"
    echo "🐳 Docker 资源使用"
    echo -e "======================================${NC}"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
}

# 清理函数
clean() {
    log_warning "======================================"
    log_warning "🧹 清理未使用的 Docker 资源"
    log_warning "======================================"

    read -p "确认要清理吗? (y/N) " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "清理未使用的容器..."
        docker container prune -f

        log_info "清理未使用的镜像..."
        docker image prune -a -f

        log_info "清理未使用的卷..."
        docker volume prune -f

        log_info "清理未使用的网络..."
        docker network prune -f

        log_info "清理旧备份 (保留最近 5 个)..."
        if [ -d "$BACKUP_DIR" ]; then
            cd "$BACKUP_DIR"
            ls -t .env.production_* 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true
            ls -t nginx_config_*.tar.gz 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true
            ls -t images_*.txt 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true
            cd "$PROJECT_DIR"
        fi

        log_success "清理完成"
    else
        log_info "已取消清理"
    fi
}

# 主函数
main() {
    case "${1:-deploy}" in
        deploy)
            deploy
            ;;
        rollback)
            rollback
            ;;
        logs)
            view_logs "$2"
            ;;
        status)
            view_status
            ;;
        clean)
            clean
            ;;
        *)
            echo "用法: $0 {deploy|rollback|logs|status|clean}"
            echo ""
            echo "命令说明:"
            echo "  deploy   - 部署到生产环境（默认）"
            echo "  rollback - 回滚到上一个版本"
            echo "  logs     - 查看服务日志 (可选: 指定服务名)"
            echo "  status   - 查看服务状态和健康检查"
            echo "  clean    - 清理未使用的 Docker 资源"
            echo ""
            echo "示例:"
            echo "  $0 deploy              # 部署"
            echo "  $0 logs nginx          # 查看 nginx 日志"
            echo "  $0 status              # 查看状态"
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
