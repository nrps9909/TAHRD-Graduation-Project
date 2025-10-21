/**
 * 輸入驗證中間件
 * 使用 express-validator 進行資料驗證
 */

import { body, validationResult } from 'express-validator'
import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

/**
 * 驗證錯誤處理中間件
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    logger.warn(`[Validation] 驗證失敗: ${JSON.stringify(errors.array())}`)
    return res.status(400).json({
      error: 'Validation failed',
      errors: errors.array()
    })
  }

  next()
}

/**
 * 註冊驗證規則
 */
export const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('用戶名必須在 3-30 字元之間')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('用戶名只能包含字母、數字和下劃線'),

  body('email')
    .trim()
    .isEmail()
    .withMessage('請提供有效的電子郵件地址')
    .normalizeEmail(),

  body('password')
    .isLength({ min: 6, max: 100 })
    .withMessage('密碼必須在 6-100 字元之間')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('密碼必須包含大寫字母、小寫字母和數字'),

  body('displayName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('顯示名稱不能超過 50 字元'),

  handleValidationErrors
]

/**
 * 登入驗證規則
 */
export const loginValidation = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('請提供有效的電子郵件地址')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('密碼不能為空'),

  handleValidationErrors
]

/**
 * 文件上傳驗證
 */
export const uploadValidation = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

  if (!req.file && !req.files) {
    return res.status(400).json({
      error: 'No file uploaded'
    })
  }

  const files = req.file ? [req.file] : (req.files as Express.Multer.File[])

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      logger.warn(`[Validation] 文件過大: ${file.originalname} (${file.size} bytes)`)
      return res.status(400).json({
        error: 'File too large',
        message: `文件 ${file.originalname} 超過 10MB 限制`
      })
    }
  }

  next()
}

/**
 * 音頻資料驗證
 */
export const audioDataValidation = [
  body('audioData')
    .notEmpty()
    .withMessage('音頻資料不能為空')
    .isBase64()
    .withMessage('音頻資料必須是 Base64 格式'),

  body('mimeType')
    .optional()
    .isIn(['audio/webm', 'audio/mp3', 'audio/wav', 'audio/ogg'])
    .withMessage('不支援的音頻格式'),

  handleValidationErrors
]

/**
 * ID 驗證 (防止 NoSQL 注入)
 */
export const validateId = (paramName: string = 'id') => {
  return [
    body(paramName)
      .trim()
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('無效的 ID 格式'),
    handleValidationErrors
  ]
}

/**
 * 清理 HTML (防止 XSS)
 */
export const sanitizeHtml = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 簡單的 XSS 防護：移除常見的 HTML 標籤
  const dangerousPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=\s*["'][^"']*["']/gi, // 移除 event handlers
  ]

  const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
      let sanitized = value
      dangerousPatterns.forEach(pattern => {
        sanitized = sanitized.replace(pattern, '')
      })
      return sanitized
    }
    if (typeof value === 'object' && value !== null) {
      const sanitized: any = Array.isArray(value) ? [] : {}
      for (const key in value) {
        sanitized[key] = sanitizeValue(value[key])
      }
      return sanitized
    }
    return value
  }

  req.body = sanitizeValue(req.body)
  req.query = sanitizeValue(req.query)
  req.params = sanitizeValue(req.params)

  next()
}
