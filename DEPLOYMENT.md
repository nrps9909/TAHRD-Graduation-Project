# 🚀 Heart Whisper Town - 生产环境部署指南

## 📋 已完成的优化配置

### ✅ Cloudflare 配置

1. **DNS 记录**
   - `jesse-chen.com` → `152.42.204.18` (A 记录，已代理)
   - `www.jesse-chen.com` → `152.42.204.18` (A 记录，已代理)

2. **SSL/TLS 设置**
   - SSL 模式: Full (strict)
   - 最小 TLS 版本: 1.2
   - TLS 1.3: 已启用
   - 0-RTT: 已启用
   - Always Use HTTPS: 已启用
   - Automatic HTTPS Rewrites: 已启用

3. **性能优化**
   - ✅ HTTP/2: 已启用
   - ✅ HTTP/3 (QUIC): 已启用
   - ✅ Brotli 压缩: 已启用
   - ✅ Rocket Loader: 已启用（异步 JS 加载）
   - ✅ Mirage: 已启用（图片优化）
   - ✅ Polish: 已启用（图片压缩，无损）
   - ✅ Early Hints: 已启用
   - ✅ 缓存级别: Aggressive
   - ✅ 浏览器缓存 TTL: 1 年
   - ✅ Opportunistic Encryption: 已启用
   - ✅ IP Geolocation: 已启用

### ✅ Nginx 优化配置

1. **SSL/HTTPS**
   - Cloudflare Origin Certificate 已安装
   - HTTP 自动重定向到 HTTPS
   - HSTS 已启用 (max-age=31536000)
   - OCSP Stapling 已配置

2. **缓存系统**
   - 静态资源缓存: 1 年 (immutable)
   - Proxy 缓存: 已配置 (100MB 静态, 50MB API)
   - 缓存验证和过期策略: 已优化

3. **性能优化**
   - Keepalive 连接: 已启用
   - Gzip 压缩: 级别 6
   - Proxy buffering: 已优化
   - 连接复用: 32 个 keepalive 连接

4. **安全防护**
   - API 限流: 10 请求/秒 (burst 5)
   - 通用限流: 50 请求/秒 (burst 20)
   - 连接限制: 10 并发/IP
   - 安全头: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection

## 🚀 部署步骤

### 1. SSH 连接到服务器

```bash
ssh root@152.42.204.18
```

### 2. 进入项目目录

```bash
cd /path/to/TAHRD-Graduation-Project
```

### 3. 拉取最新配置

```bash
git pull origin main
```

### 4. 使用部署脚本

```bash
# 赋予执行权限
chmod +x update-deploy.sh

# 执行部署
./update-deploy.sh deploy
```

## 📝 常用命令

### 部署相关

```bash
# 部署到生产环境
./update-deploy.sh deploy

# 查看服务状态
./update-deploy.sh status

# 查看日志
./update-deploy.sh logs

# 查看特定服务日志
./update-deploy.sh logs nginx
./update-deploy.sh logs backend
./update-deploy.sh logs frontend

# 回滚到上一个版本
./update-deploy.sh rollback

# 清理未使用的资源
./update-deploy.sh clean
```

### Docker 相关

```bash
# 查看运行中的容器
docker-compose -f docker-compose.production.yml ps

# 重启特定服务
docker-compose -f docker-compose.production.yml restart nginx

# 查看实时日志
docker-compose -f docker-compose.production.yml logs -f

# 停止所有服务
docker-compose -f docker-compose.production.yml down

# 重新构建并启动
docker-compose -f docker-compose.production.yml up -d --build
```

## 🧪 验证清单

部署完成后，请验证以下项目：

- [ ] **HTTPS 访问**: https://jesse-chen.com 可以正常访问
- [ ] **HTTP 重定向**: http://jesse-chen.com 自动跳转到 HTTPS
- [ ] **www 重定向**: www.jesse-chen.com 访问正常
- [ ] **SSL 证书**: 浏览器显示绿色锁图标，无警告
- [ ] **GraphQL API**: https://jesse-chen.com/graphql 可访问
- [ ] **健康检查**: https://jesse-chen.com/health 返回正常
- [ ] **WebSocket**: 实时功能正常（聊天、通知等）
- [ ] **静态资源**: 图片、CSS、JS 正常加载
- [ ] **缓存头**: 检查 Cache-Control 头是否正确
- [ ] **压缩**: 响应头包含 Content-Encoding: br 或 gzip
- [ ] **HTTP/2**: 响应头显示 HTTP/2

## 🔍 性能测试

### 使用 curl 测试

```bash
# 测试 HTTPS
curl -I https://jesse-chen.com

# 测试健康检查
curl https://jesse-chen.com/health

# 测试 GraphQL
curl -X POST https://jesse-chen.com/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{__typename}"}'

# 测试缓存头
curl -I https://jesse-chen.com/static/some-file.js
```

### 在线工具

1. **SSL Labs**: https://www.ssllabs.com/ssltest/analyze.html?d=jesse-chen.com
   - 目标评分: A+ 

2. **WebPageTest**: https://www.webpagetest.org/
   - 测试加载速度和性能指标

3. **GTmetrix**: https://gtmetrix.com/
   - 综合性能分析

4. **Cloudflare Analytics**: 
   - 登录 Cloudflare Dashboard 查看实时流量和性能数据

## 📊 监控和维护

### 日志位置

```
# Nginx 日志
./nginx/logs/access.log
./nginx/logs/error.log

# 应用日志（Docker）
docker-compose -f docker-compose.production.yml logs

# 系统日志
/var/log/syslog
```

### 定期维护任务

1. **每周**
   - 检查服务状态: `./update-deploy.sh status`
   - 检查磁盘空间: `df -h`
   - 清理旧备份: `./update-deploy.sh clean`

2. **每月**
   - 更新 Docker 镜像
   - 检查 SSL 证书有效期
   - 审查访问日志

3. **按需**
   - 代码更新后部署: `./update-deploy.sh deploy`
   - 出现问题时回滚: `./update-deploy.sh rollback`

## 🛠️ 故障排查

### 问题: 无法访问 HTTPS

```bash
# 1. 检查 Nginx 配置
docker-compose -f docker-compose.production.yml exec nginx nginx -t

# 2. 检查 SSL 证书
ls -la nginx/ssl/

# 3. 查看 Nginx 日志
docker-compose -f docker-compose.production.yml logs nginx

# 4. 重启 Nginx
docker-compose -f docker-compose.production.yml restart nginx
```

### 问题: 502 Bad Gateway

```bash
# 1. 检查后端服务状态
docker-compose -f docker-compose.production.yml ps backend

# 2. 查看后端日志
docker-compose -f docker-compose.production.yml logs backend

# 3. 重启后端服务
docker-compose -f docker-compose.production.yml restart backend
```

### 问题: 静态资源 404

```bash
# 1. 检查前端容器
docker-compose -f docker-compose.production.yml ps frontend

# 2. 检查 Nginx 配置
docker-compose -f docker-compose.production.yml exec nginx cat /etc/nginx/conf.d/ssl.conf

# 3. 重新构建前端
docker-compose -f docker-compose.production.yml up -d --build frontend
```

## 📞 支持和联系

如遇到问题，请：

1. 检查日志: `./update-deploy.sh logs`
2. 查看状态: `./update-deploy.sh status`
3. 尝试重启服务
4. 如需回滚: `./update-deploy.sh rollback`

## 🎯 下一步优化建议

- [ ] 配置 CDN 缓存规则（Cloudflare Workers）
- [ ] 设置监控告警（Uptime Robot, StatusCake）
- [ ] 配置自动备份（数据库、文件）
- [ ] 实施 CI/CD 自动部署
- [ ] 添加性能监控（New Relic, DataDog）
- [ ] 配置日志聚合（ELK Stack）

---

**最后更新**: 2025-10-10
**维护者**: Heart Whisper Town Team
