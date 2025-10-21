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

// 語音轉文字 API (代理 Gemini API，避免前端暴露 API Key)
router.post('/speech-to-text', authenticate, async (req: any, res: Response) => {
  try {
    const { audioData, mimeType = 'audio/webm' } = req.body

    if (!audioData) {
      return res.status(400).json({ error: '缺少音頻數據' })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      logger.error('[SpeechToText] GEMINI_API_KEY 未設置')
      return res.status(500).json({ error: 'API 配置錯誤' })
    }

    logger.info(`[SpeechToText] 用戶 ${req.userId} 請求語音轉文字`)

    // 調用 Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: '請將這段語音轉換成文字。如果是中文請用繁體中文輸出，如果是英文請直接輸出英文。只輸出轉錄的文字內容，不要加任何說明。',
                },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: audioData,
                  },
                },
              ],
            },
          ],
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('[SpeechToText] Gemini API 錯誤:', errorText)
      return res.status(response.status).json({
        error: '語音識別失敗',
        details: errorText
      })
    }

    const data = await response.json()
    const transcribedText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    logger.info(`[SpeechToText] 轉換成功，文字長度: ${transcribedText.length}`)

    return res.json({
      success: true,
      text: transcribedText,
    })
  } catch (error: any) {
    logger.error('[SpeechToText] 處理失敗:', error)
    return res.status(500).json({
      error: '語音轉文字失敗',
      message: error.message,
    })
  }
})

// 語音對話 API (代理 Gemini 音頻對話 API)
router.post('/audio-dialog', authenticate, async (req: any, res: Response) => {
  try {
    const { audioData, mimeType = 'audio/webm', systemPrompt } = req.body

    if (!audioData) {
      return res.status(400).json({ error: '缺少音頻數據' })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      logger.error('[AudioDialog] GEMINI_API_KEY 未設置')
      return res.status(500).json({ error: 'API 配置錯誤' })
    }

    logger.info(`[AudioDialog] 用戶 ${req.userId} 請求語音對話`)

    const defaultPrompt = '你是白噗噗，一隻溫柔貼心的白貓知識助手。請仔細聆聽用戶的語音，理解他們的情緒和語氣，並給予溫暖、貼心的回應。'

    // 調用 Gemini Audio Dialog API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: systemPrompt || defaultPrompt,
                },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: audioData,
                  },
                },
              ],
            },
          ],
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('[AudioDialog] Gemini API 錯誤:', errorText)
      return res.status(response.status).json({
        error: '語音對話失敗',
        details: errorText
      })
    }

    const data = await response.json()
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    logger.info(`[AudioDialog] 對話成功，回應長度: ${responseText.length}`)

    return res.json({
      success: true,
      text: responseText,
    })
  } catch (error: any) {
    logger.error('[AudioDialog] 處理失敗:', error)
    return res.status(500).json({
      error: '語音對話失敗',
      message: error.message,
    })
  }
})

export default router
