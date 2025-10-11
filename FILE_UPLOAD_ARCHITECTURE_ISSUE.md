# ⚠️ 文件上傳架構問題 - 緊急修復需求

## 優化時間
2025年10月11日

## 🔴 問題描述

### 發現的問題
在優化 `multimodalProcessor.ts` 使用 Gemini CLI `@` 語法後，發現了一個**關鍵的架構問題**：

**前端上傳的檔案只存在於瀏覽器記憶體中，後端無法存取！**

---

## 📊 問題分析

### 1. 當前檔案上傳流程

**前端** (`TororoKnowledgeAssistant.tsx:464-468`):
```typescript
files: uploadedFiles.map(file => ({
  url: URL.createObjectURL(file),  // ❌ 問題在這裡！
  name: file.name,
  type: file.type.startsWith('image/') ? 'image' : 'file',
}))
```

**後端** (`multimodalProcessor.ts:58`):
```typescript
const prompt = `分析这张图片 @${imageUrl}` // imageUrl = "blob:http://localhost:5173/abc123"
```

**Gemini CLI**:
```bash
gemini -p "分析这张图片 @blob:http://localhost:5173/abc123"
# ❌ Gemini CLI 無法存取這個 blob URL！
```

### 2. 為什麼會失敗？

| 項目 | 說明 | 問題 |
|------|------|------|
| `URL.createObjectURL()` | 建立瀏覽器本地 blob URL | **只存在於瀏覽器記憶體** |
| Blob URL 格式 | `blob:http://localhost:5173/abc123` | **無法從外部存取** |
| 後端存取 | 後端伺服器嘗試存取 | **403 Forbidden 或 404 Not Found** |
| Gemini CLI | CLI 嘗試讀取檔案 | **無法存取瀏覽器記憶體** |

---

## 🛠️ 解決方案

### ✅ 方案 1：本地檔案上傳 (推薦 - 快速實施)

**優點**:
- 實施快速（1-2 小時）
- 無需第三方服務
- 完全掌控檔案
- 無額外成本

**缺點**:
- 需要伺服器儲存空間
- 需要定期清理

**實施步驟**:

#### 1.1 安裝依賴
```bash
cd backend
npm install multer
```

#### 1.2 建立上傳資料夾
```bash
mkdir -p backend/uploads
echo "backend/uploads/*" >> .gitignore
```

#### 1.3 新增檔案上傳 REST Endpoint

**新檔案**: `backend/src/routes/upload.ts`
```typescript
import express from 'express'
import multer from 'multer'
import path from 'path'

const router = express.Router()

// 設定 multer 儲存
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/')
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.random().toString(36).substr(2, 9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB 限制
})

// 上傳單個檔案
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '未上傳檔案' })
  }

  // 返回可存取的 URL
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`

  res.json({
    url: fileUrl,
    filename: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype
  })
})

// 上傳多個檔案
router.post('/upload-multiple', upload.array('files', 10), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: '未上傳檔案' })
  }

  const files = (req.files as Express.Multer.File[]).map(file => ({
    url: `${req.protocol}://${req.get('host')}/uploads/${file.filename}`,
    filename: file.originalname,
    size: file.size,
    mimetype: file.mimetype
  }))

  res.json({ files })
})

export default router
```

#### 1.4 註冊路由

**修改**: `backend/src/index.ts`
```typescript
import uploadRouter from './routes/upload'

// 靜態檔案服務
app.use('/uploads', express.static('uploads'))

// 檔案上傳路由
app.use('/api', uploadRouter)
```

#### 1.5 修改前端上傳邏輯

**修改**: `frontend/src/components/TororoKnowledgeAssistant.tsx:431-472`

```typescript
const handleSubmit = useCallback(async () => {
  if (!inputText.trim() && uploadedFiles.length === 0) return

  setIsSubmitting(true)
  setViewMode('processing')
  play('message_sent')

  try {
    // 1️⃣ 先上傳檔案到伺服器（如果有檔案）
    let uploadedFileUrls: { url: string; name: string; type: string }[] = []

    if (uploadedFiles.length > 0) {
      const formData = new FormData()
      uploadedFiles.forEach(file => {
        formData.append('files', file)
      })

      const uploadResponse = await fetch('http://localhost:4000/api/upload-multiple', {
        method: 'POST',
        body: formData
      })

      const uploadResult = await uploadResponse.json()

      uploadedFileUrls = uploadResult.files.map((f: any) => ({
        url: f.url,  // ✅ 現在是真實的 HTTP URL
        name: f.filename,
        type: f.mimetype.startsWith('image/') ? 'image' : 'file'
      }))
    }

    // 2️⃣ 處理連結
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const foundUrls = inputText.match(urlRegex) || []
    const textWithoutUrls = inputText.replace(urlRegex, '').trim()
    const links = foundUrls.map(url => ({
      url: url,
      title: url.includes('youtube.com') || url.includes('youtu.be') ? 'YouTube 影片' : '連結'
    }))

    // 3️⃣ 呼叫 GraphQL mutation
    const input: UploadKnowledgeInput = {
      content: textWithoutUrls || (links.length > 0 ? '分享連結' : '快速記錄'),
      files: uploadedFileUrls,  // ✅ 使用伺服器 URL
      links: links.length > 0 ? links : undefined,
      contentType: uploadedFileUrls.some(f => f.type === 'image')
        ? 'IMAGE'
        : uploadedFileUrls.length > 0
        ? 'DOCUMENT'
        : links.length > 0
        ? 'LINK'
        : 'TEXT',
    }

    const { data } = await uploadKnowledge({ variables: { input } })

    // ... 後續處理
  } catch (error) {
    console.error('上傳失敗:', error)
    alert('上傳失敗，請稍後再試')
    setViewMode('main')
  } finally {
    setIsSubmitting(false)
  }
}, [inputText, uploadedFiles, uploadKnowledge, play, predictCategory, saveToHistory, playRandomMeow, isSubmitting])
```

#### 1.6 新增檔案清理定時任務

**新檔案**: `backend/src/utils/cleanupFiles.ts`
```typescript
import fs from 'fs'
import path from 'path'
import { logger } from './logger'

const UPLOADS_DIR = path.join(__dirname, '../../uploads')
const MAX_AGE_HOURS = 24 // 24 小時後刪除

export function startFileCleanup() {
  // 每小時執行一次
  setInterval(() => {
    try {
      const files = fs.readdirSync(UPLOADS_DIR)
      const now = Date.now()

      files.forEach(file => {
        const filePath = path.join(UPLOADS_DIR, file)
        const stats = fs.statSync(filePath)
        const age = (now - stats.mtimeMs) / 1000 / 60 / 60 // 小時

        if (age > MAX_AGE_HOURS) {
          fs.unlinkSync(filePath)
          logger.info(`[FileCleanup] 已刪除過期檔案: ${file}`)
        }
      })

      logger.info(`[FileCleanup] 檔案清理完成`)
    } catch (error) {
      logger.error('[FileCleanup] 檔案清理失敗:', error)
    }
  }, 60 * 60 * 1000) // 每小時
}
```

**修改**: `backend/src/index.ts`
```typescript
import { startFileCleanup } from './utils/cleanupFiles'

// 啟動檔案清理
startFileCleanup()
```

---

### ✅ 方案 2：雲端儲存 (推薦 - 生產環境)

**優點**:
- 可擴展
- 無需管理伺服器空間
- CDN 加速
- 自動備份

**缺點**:
- 需要註冊雲端服務
- 可能有成本（Cloudinary 免費額度：25GB）

**實施步驟** (以 Cloudinary 為例):

#### 2.1 註冊 Cloudinary
```bash
# https://cloudinary.com/
# 免費方案：25GB 儲存 + 25GB 流量/月
```

#### 2.2 安裝依賴
```bash
cd backend
npm install cloudinary multer-storage-cloudinary
```

#### 2.3 設定環境變數

**修改**: `backend/.env`
```bash
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

#### 2.4 建立 Cloudinary 上傳服務

**新檔案**: `backend/src/routes/cloudinaryUpload.ts`
```typescript
import express from 'express'
import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'
import { CloudinaryStorage } from 'multer-storage-cloudinary'

const router = express.Router()

// 設定 Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

// 設定 Cloudinary 儲存
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'tororo-knowledge',
    allowed_formats: ['jpg', 'png', 'pdf', 'doc', 'docx'],
    resource_type: 'auto'
  } as any
})

const upload = multer({ storage })

// 上傳多個檔案
router.post('/upload-cloud', upload.array('files', 10), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: '未上傳檔案' })
  }

  const files = (req.files as any[]).map(file => ({
    url: file.path,  // Cloudinary URL
    filename: file.originalname,
    size: file.size,
    mimetype: file.mimetype
  }))

  res.json({ files })
})

export default router
```

#### 2.5 註冊雲端路由

**修改**: `backend/src/index.ts`
```typescript
import cloudinaryUploadRouter from './routes/cloudinaryUpload'

app.use('/api', cloudinaryUploadRouter)
```

#### 2.6 修改前端上傳邏輯

**修改**: `frontend/src/components/TororoKnowledgeAssistant.tsx`
```typescript
// 將 fetch URL 改為
const uploadResponse = await fetch('http://localhost:4000/api/upload-cloud', {
  method: 'POST',
  body: formData
})
```

---

### ✅ 方案 3：Base64 內嵌 (僅適用小檔案)

**優點**:
- 無需額外儲存
- 實施最簡單

**缺點**:
- 增大 payload 33%
- 僅適用小於 1MB 檔案
- 可能超過 Gemini 輸入限制

**實施步驟**:

**修改**: `frontend/src/components/TororoKnowledgeAssistant.tsx:431-472`
```typescript
const handleSubmit = useCallback(async () => {
  // ...

  const files = await Promise.all(
    uploadedFiles.map(async (file) => {
      return new Promise<FileInput>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          resolve({
            url: reader.result as string,  // data:image/png;base64,iVBORw0K...
            name: file.name,
            type: file.type.startsWith('image/') ? 'image' : 'file'
          })
        }
        reader.readAsDataURL(file)
      })
    })
  )

  const input: UploadKnowledgeInput = {
    content: textWithoutUrls || '快速記錄',
    files,  // Base64 URLs
    // ...
  }

  // ...
}, [])
```

**修改**: `backend/src/services/multimodalProcessor.ts`

需要處理 Base64 URL:
```typescript
async processImage(imageUrl: string, context?: string): Promise<ImageAnalysis> {
  // 如果是 Base64，先儲存為臨時檔案
  if (imageUrl.startsWith('data:')) {
    const base64Data = imageUrl.split(',')[1]
    const tmpPath = `/tmp/${Date.now()}.jpg`
    fs.writeFileSync(tmpPath, base64Data, 'base64')
    imageUrl = tmpPath
  }

  const prompt = `分析这张图片 @${imageUrl}`
  // ...
}
```

---

## 📋 推薦實施順序

### 第一階段：快速修復（1-2 小時）
1. ✅ 實施**方案 1（本地上傳）**
2. 測試圖片、PDF、檔案上傳
3. 確認 Gemini CLI 可以存取

### 第二階段：生產優化（可選，1-2 天）
1. 評估檔案儲存需求
2. 如需長期儲存，遷移到**方案 2（Cloudinary）**
3. 設定 CDN 加速

---

## 🧪 測試計畫

### 測試案例 1：圖片上傳
```bash
# 1. 前端上傳圖片
# 2. 檢查 Network 面板，確認上傳成功
# 3. 檢查返回的 URL 格式
# 4. 確認後端可以存取 URL
# 5. 確認 Gemini 分析成功
```

### 測試案例 2：PDF 上傳
```bash
# 1. 前端上傳 PDF
# 2. 確認檔案成功上傳到伺服器
# 3. 確認 Gemini CLI 可以讀取 PDF
# 4. 檢查分析結果
```

### 測試案例 3：多檔案上傳
```bash
# 1. 同時上傳 3 張圖片 + 1 個 PDF
# 2. 確認並行處理正常
# 3. 確認所有檔案都能被 Gemini 分析
```

---

## ⏱️ 預估時間

| 方案 | 開發時間 | 測試時間 | 總計 |
|------|---------|---------|------|
| 方案 1 - 本地上傳 | 1 小時 | 30 分鐘 | 1.5 小時 |
| 方案 2 - Cloudinary | 2 小時 | 30 分鐘 | 2.5 小時 |
| 方案 3 - Base64 | 30 分鐘 | 30 分鐘 | 1 小時 |

---

## 🚨 緊急程度

**優先級：🔴 高**

**原因**:
1. 目前檔案上傳功能**完全無法運作**
2. Gemini CLI 優化**無法發揮作用**
3. 用戶上傳檔案會**直接失敗**

**建議**:
- **立即實施方案 1**（本地上傳）
- 修復後再考慮遷移到雲端

---

## 📝 總結

### 問題核心
- 前端使用 `URL.createObjectURL()` 建立的 blob URL 只存在於瀏覽器記憶體
- 後端和 Gemini CLI 無法存取這些 URL
- 導致所有檔案分析功能失效

### 解決方向
1. **短期**：本地檔案上傳（1.5 小時）
2. **長期**：雲端儲存（Cloudinary）

### 下一步
1. 選擇方案（推薦：方案 1 → 方案 2）
2. 實施檔案上傳
3. 測試完整流程
4. 部署到生產環境

---

**優化完成後，整個知識上傳系統將能夠**:
- ✅ 正確處理圖片、PDF、檔案上傳
- ✅ Gemini CLI 直接讀取檔案
- ✅ 並行處理多個檔案（性能提升 60-70%）
- ✅ 完整的多模態知識系統 ☁️✨
