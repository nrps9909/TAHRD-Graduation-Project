# 🔒 安全改進總結

> 本文件記錄所有已實施的安全改進措施和建議

**更新日期**: 2025-10-21
**狀態**: ✅ 已完成

---

## 📊 安全改進總覽

| 項目 | 嚴重性 | 狀態 | 影響範圍 |
|------|--------|------|----------|
| JWT Secret 默認值 | 🔴 CRITICAL | ✅ 已修復 | 認證系統 |
| API Key 前端暴露 | 🔴 CRITICAL | ✅ 已修復 | Gemini API |
| 缺少速率限制 | 🟠 HIGH | ✅ 已修復 | 所有 API |
| 缺少安全標頭 | 🟠 HIGH | ✅ 已修復 | HTTP 響應 |
| 缺少輸入驗證 | 🟠 HIGH | ✅ 已修復 | 所有輸入 |
| 生產環境自動創建用戶 | 🟡 MEDIUM | ✅ 已修復 | 認證系統 |
| XSS 攻擊風險 | 🟡 MEDIUM | ✅ 已修復 | 用戶輸入 |

---

## 🎯 1. JWT Secret 安全加固

### 問題
- **發現**: 3 個文件使用默認 JWT Secret `'default-secret'`
- **風險**: 攻擊者可以偽造 JWT token，完全繞過認證系統
- **嚴重性**: 🔴 CRITICAL

### 解決方案

#### 1.1 創建配置驗證系統

**文件**: `backend/src/utils/config.ts`

```typescript
export function validateConfig(): AppConfig {
  const errors: string[] = []

  // 必要變數檢查
  const requiredVars = {
    JWT_SECRET: process.env.JWT_SECRET,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
  }

  for (const [key, value] of Object.entries(requiredVars)) {
    if (!value || value.trim() === '') {
      errors.push(`❌ Missing required environment variable: ${key}`)
    }
  }

  // JWT_SECRET 安全性檢查
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    errors.push('❌ JWT_SECRET must be at least 32 characters long for security')
  }

  // 如果有錯誤，記錄並拒絕啟動
  if (errors.length > 0) {
    logger.error('🔒 Configuration validation failed:')
    errors.forEach(err => logger.error(err))
    process.exit(1)  // 🔒 安全優先：配置錯誤時拒絕啟動
  }

  return config
}
```

**關鍵特性**:
- ✅ 啟動時驗證所有必要環境變數
- ✅ JWT_SECRET 長度檢查（最少 32 字元）
- ✅ 配置錯誤時拒絕啟動服務器
- ✅ 詳細的錯誤日誌

#### 1.2 修復默認值使用

**修改文件**:
1. `backend/src/resolvers/authResolvers.ts`
2. `backend/src/context.ts`
3. `backend/src/routes/upload.ts`

**之前**:
```typescript
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret'  // ❌ 危險！
```

**現在**:
```typescript
import { getConfig } from '../utils/config'
const config = getConfig()
const JWT_SECRET = config.jwtSecret  // ✅ 已驗證的配置
```

#### 1.3 集成到啟動流程

**文件**: `backend/src/index.ts`

```typescript
// 首先驗證配置（包含 JWT_SECRET 等敏感資訊）
import { getConfig } from './utils/config'
const config = getConfig()  // 如果配置無效，這裡會拒絕啟動

const PORT = config.port
```

**效果**: 服務器啟動前必須通過配置驗證，否則會顯示錯誤訊息並終止

---

## 🛡️ 2. API Key 暴露防護

### 問題
- **發現**: 前端直接調用 Gemini API，暴露 `VITE_GEMINI_API_KEY`
- **風險**: 攻擊者可以從瀏覽器開發者工具獲取 API Key，無限制調用 API
- **嚴重性**: 🔴 CRITICAL

### 解決方案

#### 2.1 創建後端 API 代理

**文件**: `backend/src/routes/upload.ts`

新增 2 個代理端點:

```typescript
// 語音轉文字 API（隱藏 API Key）
router.post('/speech-to-text', authenticate, async (req, res) => {
  const { audioData, mimeType = 'audio/webm' } = req.body
  const apiKey = process.env.GEMINI_API_KEY  // 僅後端可訪問

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    { /* ... */ }
  )

  return res.json({ success: true, text: transcribedText })
})

// 語音對話 API（隱藏 API Key）
router.post('/audio-dialog', authenticate, async (req, res) => {
  // 類似實現
})
```

**關鍵特性**:
- ✅ API Key 僅在後端使用，永不暴露給前端
- ✅ 需要 JWT 認證（`authenticate` 中間件）
- ✅ 適當的錯誤處理

#### 2.2 前端移除 API Key

**文件**: `frontend/src/components/TororoKnowledgeAssistant.tsx`

**之前**:
```typescript
const url = `https://generativelanguage.googleapis.com/.../gemini-2.0-flash-exp?key=${import.meta.env.VITE_GEMINI_API_KEY}`
// ❌ API Key 暴露在瀏覽器中！
```

**現在**:
```typescript
import { API_ENDPOINTS } from '../config/api'

const response = await fetch(API_ENDPOINTS.SPEECH_TO_TEXT, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  },
  body: JSON.stringify({ audioData: base64Audio, mimeType: 'audio/webm' })
})
// ✅ 通過後端代理，API Key 安全
```

#### 2.3 創建 API 配置管理

**文件**: `frontend/src/config/api.ts`

```typescript
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export const API_ENDPOINTS = {
  UPLOAD_MULTIPLE: `${API_BASE_URL}/api/upload-multiple`,
  SPEECH_TO_TEXT: `${API_BASE_URL}/api/speech-to-text`,
  AUDIO_DIALOG: `${API_BASE_URL}/api/audio-dialog`,
} as const
```

**好處**:
- ✅ 集中管理所有 API 端點
- ✅ 消除硬編碼的 localhost:4000
- ✅ 支持環境變數配置

---

## 🚦 3. 速率限制保護

### 問題
- **發現**: 沒有任何速率限制機制
- **風險**:
  - DoS 攻擊（大量請求導致服務癱瘓）
  - 暴力破解登入
  - API 費用濫用
- **嚴重性**: 🟠 HIGH

### 解決方案

#### 3.1 創建速率限制中間件

**文件**: `backend/src/middleware/security.ts`

實現 5 種速率限制器:

```typescript
// 1. 全局速率限制（防止 DoS）
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 分鐘
  max: 100,                  // 最多 100 個請求
  message: '請求過於頻繁，請稍後再試'
})

// 2. 認證 API 速率限制（防止暴力破解）
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,                    // 最多 5 次登入嘗試
  skipSuccessfulRequests: true,
  message: '登入嘗試次數過多，請 15 分鐘後再試'
})

// 3. 文件上傳速率限制
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 小時
  max: 50,                   // 最多 50 次上傳
  message: '上傳次數過多，請 1 小時後再試'
})

// 4. AI API 速率限制（防止費用濫用）
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,                  // 最多 100 次 AI 調用
  message: 'AI 調用次數過多，請 1 小時後再試'
})

// 5. GraphQL 速率限制
export const graphqlLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,   // 1 分鐘
  max: 60,                   // 最多 60 個 GraphQL 請求
  message: 'GraphQL 請求過於頻繁'
})
```

#### 3.2 應用速率限制

**文件**: `backend/src/index.ts`

```typescript
// GraphQL endpoint（帶速率限制）
app.use('/graphql', graphqlLimiter, expressMiddleware(server, {
  context: ({ req }) => createContext({ req, prisma, redis, io })
}))

// 檔案上傳路由（帶速率限制）
app.use('/api/upload-multiple', uploadLimiter)
app.use('/api/speech-to-text', aiLimiter)
app.use('/api/audio-dialog', aiLimiter)
```

**保護層級**:
- ✅ GraphQL API: 60 requests/minute
- ✅ 文件上傳: 50 uploads/hour
- ✅ AI 調用: 100 requests/hour
- ✅ 登入嘗試: 5 attempts/15 minutes

---

## 🛡️ 4. HTTP 安全標頭

### 問題
- **發現**: 缺少基本的 HTTP 安全標頭
- **風險**:
  - XSS 攻擊
  - Clickjacking
  - MIME 類型嗅探
  - 不安全的協議降級
- **嚴重性**: 🟠 HIGH

### 解決方案

#### 4.1 集成 Helmet 中間件

**文件**: `backend/src/index.ts`

```typescript
import helmet from 'helmet'

// 安全中間件設置
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: false,
}))
```

**自動添加的安全標頭**:
```http
X-DNS-Prefetch-Control: off
X-Frame-Options: SAMEORIGIN
Strict-Transport-Security: max-age=15552000; includeSubDomains
X-Download-Options: noopen
X-Content-Type-Options: nosniff
X-XSS-Protection: 0
```

**防護效果**:
- ✅ 防止 Clickjacking (X-Frame-Options)
- ✅ 防止 MIME 類型嗅探 (X-Content-Type-Options)
- ✅ 強制 HTTPS (Strict-Transport-Security)
- ✅ 防止 XSS (Content-Security-Policy)

---

## 🔍 5. 輸入驗證與消毒

### 問題
- **發現**: 缺少系統性的輸入驗證
- **風險**:
  - SQL 注入
  - XSS 攻擊
  - NoSQL 注入
  - 惡意文件上傳
- **嚴重性**: 🟠 HIGH

### 解決方案

#### 5.1 創建驗證中間件

**文件**: `backend/src/middleware/validation.ts`

##### 註冊驗證
```typescript
export const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('用戶名只能包含字母、數字和下劃線'),

  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('請提供有效的郵箱地址'),

  body('password')
    .isLength({ min: 6, max: 100 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('密碼必須包含大寫字母、小寫字母和數字'),

  handleValidationErrors
]
```

##### HTML 消毒（防 XSS）
```typescript
export const sanitizeHtml = (req: any, res: any, next: any) => {
  const dangerousPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=\s*["'][^"']*["']/gi  // onclick, onerror, etc.
  ]

  const sanitizeObject = (obj: any) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        for (const pattern of dangerousPatterns) {
          if (pattern.test(obj[key])) {
            logger.warn(`[Security] Blocked potential XSS in ${key}:`, obj[key])
            obj[key] = obj[key].replace(pattern, '')
          }
        }
      }
    }
  }

  sanitizeObject(req.body)
  sanitizeObject(req.query)
  sanitizeObject(req.params)

  next()
}
```

##### 文件上傳驗證
```typescript
export const fileUploadValidation = [
  body('files').custom((value, { req }) => {
    if (!req.files || req.files.length === 0) {
      throw new Error('至少需要上傳一個文件')
    }

    const allowedMimeTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'text/markdown'
    ]

    const maxSize = 10 * 1024 * 1024  // 10MB

    for (const file of req.files) {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new Error(`不支持的文件類型: ${file.mimetype}`)
      }
      if (file.size > maxSize) {
        throw new Error(`文件 ${file.originalname} 超過 10MB 限制`)
      }
    }

    return true
  }),
  handleValidationErrors
]
```

#### 5.2 應用驗證中間件

**文件**: `backend/src/index.ts`

```typescript
// HTML 消毒中間件（防止 XSS 攻擊）
app.use(sanitizeHtml)
```

**保護範圍**:
- ✅ 所有 POST/PUT 請求的 body
- ✅ 所有查詢參數 (query)
- ✅ 所有路由參數 (params)

---

## 🔐 6. 生產環境安全加固

### 問題
- **發現**: 開發環境會自動創建測試用戶，可能在生產環境誤觸發
- **風險**: 生產環境創建不安全的測試帳號
- **嚴重性**: 🟡 MEDIUM

### 解決方案

#### 6.1 環境隔離

**文件**: `backend/src/context.ts`

**之前**:
```typescript
if (process.env.NODE_ENV === 'development' && !userId) {
  // 創建測試用戶
}
```

**現在**:
```typescript
if (config.nodeEnv === 'development' && !userId) {
  // 創建測試用戶
  logger.info('🔧 [DEV] Creating test user...')
} else if (config.nodeEnv === 'production' && !userId) {
  // 生產環境：確保沒有自動創建用戶
  logger.debug('[PROD] No authentication token provided')
}
```

**改進**:
- ✅ 使用驗證過的配置（`config.nodeEnv`）
- ✅ 明確的生產環境檢查
- ✅ 適當的日誌記錄

---

## 📋 7. 文件大小限制

### 問題
- **發現**: 前端缺少文件大小驗證
- **風險**:
  - 上傳超大文件導致服務器內存耗盡
  - Cloudinary 費用濫用
  - 帶寬消耗
- **嚴重性**: 🟡 MEDIUM

### 解決方案

#### 7.1 前端驗證

**文件**: `frontend/src/components/TororoKnowledgeAssistant.tsx`

```typescript
import { MAX_FILE_SIZE } from '../config/api'

const newFiles = Array.from(files).map(file => {
  if (file.size > MAX_FILE_SIZE) {
    alert(`檔案 "${file.name}" 過大，最大限制 10MB`)
    return { ...file, status: 'error' as const }
  }
  return { ...file, status: 'uploading' as const }
})
```

#### 7.2 後端驗證

**文件**: `backend/src/middleware/validation.ts`

```typescript
const maxSize = 10 * 1024 * 1024  // 10MB

for (const file of req.files) {
  if (file.size > maxSize) {
    throw new Error(`文件 ${file.originalname} 超過 10MB 限制`)
  }
}
```

**雙重保護**:
- ✅ 前端：即時提示用戶
- ✅ 後端：強制限制，防止繞過

---

## 🎯 8. Gemini 模型版本更新

### 變更
- **從**: `gemini-2.0-flash-exp` (實驗版)
- **到**: `gemini-2.5-flash` (穩定版)

### 影響範圍
1. `backend/src/routes/upload.ts` - 語音轉文字 API
2. `backend/src/routes/upload.ts` - 語音對話 API

### 好處
- ✅ 更穩定的 API 響應
- ✅ 更好的性能
- ✅ 生產環境推薦版本

---

## 📦 新增依賴

### backend/package.json

```json
{
  "dependencies": {
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "express-validator": "^7.0.1"
  }
}
```

**用途**:
- `helmet`: HTTP 安全標頭
- `express-rate-limit`: 速率限制
- `express-validator`: 輸入驗證

---

## 🚀 部署說明

### CI/CD 自動部署

所有安全改進會通過 GitHub Actions 自動部署：

```bash
git push origin production
```

### 手動部署步驟

如需手動部署：

```bash
# 1. 拉取最新代碼
git pull origin production

# 2. 安裝新依賴
cd backend && npm install

# 3. 重新構建
npm run build

# 4. 重啟服務
docker compose -f docker-compose.production-prebuilt.yml restart backend

# 5. 驗證
docker compose logs backend --tail=50
```

### 環境變數檢查

確保 `.env` 包含：

```bash
# 🔒 必須設置（否則啟動失敗）
JWT_SECRET=<至少 32 字元的隨機字符串>
GEMINI_API_KEY=<你的 Gemini API Key>
DATABASE_URL=<資料庫連接字符串>

# 可選（有默認值）
PORT=4000
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://jesse-chen.com
REDIS_URL=redis://localhost:6379
```

**生成安全的 JWT_SECRET**:
```bash
openssl rand -base64 32
```

---

## ✅ 驗證清單

部署後請驗證：

### 1. 配置驗證
- [ ] 服務器啟動時顯示 "✅ Configuration validated successfully"
- [ ] 如果 JWT_SECRET 缺失，服務器拒絕啟動

### 2. 速率限制
- [ ] 15 分鐘內嘗試登入 6 次，第 6 次被阻擋
- [ ] GraphQL 查詢每分鐘超過 60 次時被限制

### 3. API Key 保護
- [ ] 前端代碼中找不到 `VITE_GEMINI_API_KEY`
- [ ] 瀏覽器 Network 標籤看不到 Gemini API 調用
- [ ] `/api/speech-to-text` 需要 Authorization header

### 4. 安全標頭
```bash
curl -I https://jesse-chen.com/api/health
```
應該看到：
```http
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=15552000
```

### 5. 輸入驗證
- [ ] 註冊時使用弱密碼（如 "123456"）被拒絕
- [ ] 上傳超過 10MB 文件被拒絕
- [ ] 提交包含 `<script>` 的輸入被消毒

---

## 🔮 後續建議

雖然已完成主要安全改進，但仍可考慮：

### 短期（可選）
1. **CSRF 保護** - 添加 CSRF token 驗證
2. **日誌監控** - 整合 Winston + ELK Stack
3. **會話管理** - Redis session store with TTL

### 中期（可選）
1. **WAF 整合** - Cloudflare WAF 或 AWS WAF
2. **安全掃描** - 整合 OWASP ZAP 自動掃描
3. **依賴審計** - `npm audit` 自動化檢查

### 長期（可選）
1. **多因素認證** - 2FA/TOTP 支持
2. **IP 白名單** - 管理員功能限制 IP
3. **滲透測試** - 定期第三方安全審計

---

## 📚 相關文檔

- [CI/CD 部署指南](./CICD-IMPROVEMENT-GUIDE.md)
- [性能優化總結](./PERFORMANCE_OPTIMIZATION_SUMMARY.md)
- [Claude Code 開發記錄](./CLAUDE.md)

---

## 🤖 AI 協作記錄

本次安全改進由 **Claude Code** 完成，遵循 OWASP Top 10 和業界最佳實踐。

**最後更新**: 2025-10-21
**更新者**: Claude Code
