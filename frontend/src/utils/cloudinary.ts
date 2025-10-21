/**
 * Cloudinary 圖片優化工具
 */

export interface CloudinaryTransformOptions {
  width?: number
  height?: number
  quality?: 'auto' | number
  format?: 'auto' | 'jpg' | 'png' | 'webp' | 'avif'
  crop?: 'fill' | 'fit' | 'scale' | 'limit'
}

/**
 * 優化 Cloudinary URL
 * 添加轉換參數以減少圖片大小並提升載入速度
 *
 * @example
 * const url = 'https://res.cloudinary.com/demo/image/upload/sample.jpg'
 * const optimized = optimizeCloudinaryUrl(url, { width: 800, quality: 'auto' })
 * // 'https://res.cloudinary.com/demo/image/upload/w_800,q_auto,f_auto/sample.jpg'
 */
export function optimizeCloudinaryUrl(
  url: string,
  options: CloudinaryTransformOptions = {}
): string {
  // 如果不是 Cloudinary URL，直接返回
  if (!url.includes('res.cloudinary.com')) {
    return url
  }

  // 默認選項
  const {
    width,
    height,
    quality = 'auto',
    format = 'auto',
    crop = 'limit'
  } = options

  // 構建轉換參數
  const transformations: string[] = []

  if (width) transformations.push(`w_${width}`)
  if (height) transformations.push(`h_${height}`)
  if (quality) transformations.push(`q_${quality}`)
  if (format) transformations.push(`f_${format}`)
  if (crop && (width || height)) transformations.push(`c_${crop}`)

  // 如果沒有任何轉換，直接返回
  if (transformations.length === 0) {
    return url
  }

  // 插入轉換參數到 URL
  // Cloudinary URL 格式: https://res.cloudinary.com/{cloud_name}/{resource_type}/{type}/{transformations}/{public_id}
  const uploadIndex = url.indexOf('/upload/')
  if (uploadIndex === -1) {
    return url // 不是標準的 upload URL
  }

  const transformString = transformations.join(',')
  const before = url.substring(0, uploadIndex + 8) // 包含 '/upload/'
  const after = url.substring(uploadIndex + 8)

  return `${before}${transformString}/${after}`
}

/**
 * 為縮圖優化 Cloudinary URL
 */
export function optimizeForThumbnail(url: string): string {
  return optimizeCloudinaryUrl(url, {
    width: 300,
    quality: 'auto',
    format: 'auto',
    crop: 'fill'
  })
}

/**
 * 為列表頁面優化 Cloudinary URL
 */
export function optimizeForList(url: string): string {
  return optimizeCloudinaryUrl(url, {
    width: 400,
    quality: 'auto',
    format: 'auto'
  })
}

/**
 * 為詳情頁面優化 Cloudinary URL
 */
export function optimizeForDetail(url: string): string {
  return optimizeCloudinaryUrl(url, {
    width: 1200,
    quality: 'auto',
    format: 'auto'
  })
}

/**
 * 批量優化 URLs
 */
export function optimizeUrls(
  urls: string[],
  options?: CloudinaryTransformOptions
): string[] {
  return urls.map(url => optimizeCloudinaryUrl(url, options))
}
