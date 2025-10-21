/**
 * API 配置
 * 集中管理所有 API 端點配置
 */

// 後端 API Base URL
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

// API 端點
export const API_ENDPOINTS = {
  // 文件上傳
  UPLOAD_SINGLE: `${API_BASE_URL}/api/upload`,
  UPLOAD_MULTIPLE: `${API_BASE_URL}/api/upload-multiple`,

  // 語音相關
  SPEECH_TO_TEXT: `${API_BASE_URL}/api/speech-to-text`,
  AUDIO_DIALOG: `${API_BASE_URL}/api/audio-dialog`,

  // Cloudinary 測試
  TEST_CLOUDINARY: `${API_BASE_URL}/api/test-cloudinary`,
} as const

// GraphQL URL
export const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL || `${API_BASE_URL}/graphql`

// WebSocket URL
export const WS_URL = import.meta.env.VITE_WS_URL || `${API_BASE_URL}`

// 文件大小限制
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// 支援的文件類型
export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
export const SUPPORTED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
  'application/json',
  'text/markdown',
]

export const SUPPORTED_FILE_TYPES = [
  ...SUPPORTED_IMAGE_TYPES,
  ...SUPPORTED_DOCUMENT_TYPES,
]
