# Cloudflare Page Rules 配置指南

Cloudflare 免费账户提供 **3 个 Page Rules**。以下是推荐配置：

## 📝 推荐的 3 个 Page Rules

### Page Rule 1: www 重定向到非 www (优先级 1)

**URL 匹配**: `www.jesse-chen.com/*`

**设置**:
- **Forwarding URL**: `301 - Permanent Redirect`
- **目标 URL**: `https://jesse-chen.com/$1`

**作用**: 将所有 www 流量重定向到非 www 版本

---

### Page Rule 2: 静态资源缓存 (优先级 2)

**URL 匹配**: `jesse-chen.com/*.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot|webp)`

**设置**:
- **Cache Level**: `Cache Everything`
- **Edge Cache TTL**: `a month` (1 个月)
- **Browser Cache TTL**: `a year` (1 年)

**作用**: 对静态资源启用强缓存

---

### Page Rule 3: API 路由绕过缓存 (优先级 3)

**URL 匹配**: `jesse-chen.com/graphql*`

**设置**:
- **Cache Level**: `Bypass`

**作用**: 确保 GraphQL API 请求不被缓存

---

## 🚀 配置步骤

1. 登录 **Cloudflare Dashboard**: https://dash.cloudflare.com
2. 选择域名 **jesse-chen.com**
3. 点击左侧菜单 **Rules** → **Page Rules**
4. 点击 **Create Page Rule**
5. 按照上面的配置依次创建 3 个规则

## ⚙️ 替代方案（免费）

如果不想使用 Page Rules，可以使用 **Cache Rules**（新功能）：

### 使用 Cache Rules

1. 进入 **Caching** → **Cache Rules**
2. 创建规则：

**静态资源缓存规则**:
- **When incoming requests match**: 
  - File extension is in `(css|js|jpg|png|gif|svg|woff|woff2|ttf|ico|webp)`
- **Then**:
  - Cache eligibility: Eligible for cache
  - Browser Cache TTL: 1 year
  - Edge Cache TTL: 1 month

**API 绕过规则**:
- **When incoming requests match**:
  - URI Path equals `/graphql`
- **Then**:
  - Cache eligibility: Bypass cache

---

## ✅ 验证配置

配置完成后，使用以下命令验证：

```bash
# 测试静态资源缓存
curl -I https://jesse-chen.com/assets/logo.png
# 应该看到: cf-cache-status: HIT

# 测试 API 不缓存
curl -I https://jesse-chen.com/graphql
# 应该看到: cf-cache-status: BYPASS 或 DYNAMIC
```

---

## 📊 Page Rules vs Cache Rules

| 特性 | Page Rules | Cache Rules |
|-----|-----------|-------------|
| 免费账户限制 | 3 个 | 10 个 |
| 灵活性 | 中等 | 高 |
| 推荐使用 | 旧项目 | 新项目 ✅ |

**建议**: 优先使用 **Cache Rules**，更灵活且限制更少。

---

**需要帮助?** 参考 Cloudflare 官方文档: https://developers.cloudflare.com/cache/
