import express, { Request, Response, NextFunction } from 'express'
import multer from 'multer'
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import { logger } from '../utils/logger'
import * as jwt from 'jsonwebtoken'

const router = express.Router()

// JWT 身份驗證中間件
const authenticate = (req: any, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    logger.warn('[Upload Auth] 缺少 Authorization 標頭')
    res.status(401).json({
      error: '需要身份驗證',
      message: '請提供有效的 JWT token'
    })
    return
  }

  const token = authHeader.replace('Bearer ', '')

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as any
    req.userId = decoded.userId

    if (!req.userId) {
      logger.warn('[Upload Auth] Token 中缺少 userId')
      res.status(401).json({
        error: '無效的 token',
        message: 'Token 中缺少用戶信息'
      })
      return
    }

    logger.info(`[Upload Auth] 用戶已驗證: ${req.userId}`)
    next()
  } catch (error: any) {
    logger.warn('[Upload Auth] Token 驗證失敗:', error.message)
    res.status(401).json({
      error: '無效或過期的 token',
      message: '請重新登入'
    })
    return
  }
}

// 配置 Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

// 驗證 Cloudinary 配置
const validateCloudinaryConfig = () => {
  if (!process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET) {
    logger.error('[Upload] Cloudinary 配置缺失！請檢查環境變數')
    return false
  }
  return true
}

// 配置 Cloudinary 儲存
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req: any, file: any) => {
    // 根據檔案類型選擇資源類型
    let resourceType: 'image' | 'raw' | 'video' | 'auto' = 'auto'

    if (file.mimetype.startsWith('image/')) {
      resourceType = 'image'
    } else if (file.mimetype.startsWith('video/')) {
      resourceType = 'video'
    } else {
      resourceType = 'raw'
    }

    return {
      folder: 'tororo-knowledge',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'txt', 'csv', 'json', 'md'],
      resource_type: resourceType,
      // 為非圖片檔案生成唯一檔名
      public_id: resourceType !== 'image'
        ? `${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, '')}`
        : undefined
    } as any
  }
}) as any

// 配置 multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB 限制
  },
  fileFilter: (req: any, file: any, cb: any) => {
    // 允許的檔案類型
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv',
      'application/json',
      'text/markdown'
    ]

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`不支援的檔案類型: ${file.mimetype}`))
    }
  }
})

// 上傳單個檔案（需要身份驗證）
router.post('/upload', authenticate, upload.single('file'), (req: any, res: Response) => {
  try {
    if (!validateCloudinaryConfig()) {
      return res.status(500).json({ error: 'Cloudinary 配置錯誤' })
    }

    if (!req.file) {
      return res.status(400).json({ error: '未上傳檔案' })
    }

    const uploadedFile = req.file as any

    logger.info(`[Upload] 檔案上傳成功: ${uploadedFile.originalname}`)

    return res.json({
      success: true,
      url: uploadedFile.path, // Cloudinary URL
      filename: uploadedFile.originalname,
      size: uploadedFile.size,
      mimetype: uploadedFile.mimetype
    })
  } catch (error: any) {
    logger.error('[Upload] 檔案上傳失敗:', error)
    return res.status(500).json({
      error: '檔案上傳失敗',
      message: error.message
    })
  }
})

// 上傳多個檔案（需要身份驗證）
router.post('/upload-multiple', authenticate, upload.array('files', 10), (req: any, res: Response) => {
  try {
    if (!validateCloudinaryConfig()) {
      return res.status(500).json({ error: 'Cloudinary 配置錯誤' })
    }

    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: '未上傳檔案' })
    }

    const uploadedFiles = (req.files as any[]).map((file: any) => ({
      url: file.path, // Cloudinary URL
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype
    }))

    logger.info(`[Upload] 成功上傳 ${uploadedFiles.length} 個檔案`)

    return res.json({
      success: true,
      files: uploadedFiles,
      count: uploadedFiles.length
    })
  } catch (error: any) {
    logger.error('[Upload] 多檔案上傳失敗:', error)
    return res.status(500).json({
      error: '檔案上傳失敗',
      message: error.message
    })
  }
})

// 測試 Cloudinary 連接
router.get('/test-cloudinary', async (req: Request, res: Response) => {
  try {
    if (!validateCloudinaryConfig()) {
      return res.status(500).json({
        success: false,
        error: 'Cloudinary 配置缺失'
      })
    }

    // 嘗試獲取 Cloudinary 帳戶信息
    const result = await cloudinary.api.ping()

    return res.json({
      success: true,
      message: 'Cloudinary 連接成功',
      config: {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key_configured: !!process.env.CLOUDINARY_API_KEY,
        api_secret_configured: !!process.env.CLOUDINARY_API_SECRET
      },
      status: result.status
    })
  } catch (error: any) {
    logger.error('[Upload] Cloudinary 連接測試失敗:', error)
    return res.status(500).json({
      success: false,
      error: 'Cloudinary 連接失敗',
      message: error.message
    })
  }
})

export default router
