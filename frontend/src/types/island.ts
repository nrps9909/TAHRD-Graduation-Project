/**
 * 島嶼/資料庫類型定義
 *
 * 新架構（與資料庫 schema 一致）：
 * - Island = 用戶自定義的主要知識領域（大類別，如：工作島、學習島）
 * - Memory = 屬於某個 Island 的記憶
 */

// 記憶數據結構
export interface Memory {
  id: string
  title: string | null
  importance: number // @deprecated 已移除，固定為 5
  content?: string
  tags?: string[]
  createdAt: Date
  position: [number, number, number] // 3D 空間中的位置

  // UI 顯示相關
  emoji?: string
  summary?: string | null
  color?: string

  // AI 深度分析
  detailedSummary?: string
  actionableAdvice?: string

  // 社交成長紀錄專用字段（針對人際關係分類）
  socialContext?: string  // [情境] 簡述當下發生什麼
  userReaction?: string  // [使用者反應] 情緒或行為反應
  aiFeedback?: string  // [AI 回饋] 建議或安撫
  socialSkillTags?: string[]  // [社交能力標籤]
  progressChange?: number  // [進度變化] +1/0/-1
}

// 島嶼（大類別）- 與資料庫 schema 一致
export interface Island {
  id: string
  userId: string
  position: number

  // 自訂資訊
  name: string
  nameChinese: string
  emoji: string
  color: string
  description?: string | null

  // 3D 位置
  positionX: number
  positionY: number
  positionZ: number

  // 統計
  memoryCount: number

  // 狀態
  isActive: boolean

  // Timestamps
  createdAt: string
  updatedAt: string

  // 記憶列表
  memories: Memory[]

  // 自訂形狀和 3D 配置（可選）
  customShapeData?: string | null // JSON 字串，儲存自訂繪製的形狀點
  islandHeight?: number | null // 島嶼高度（0.5-5.0）
  islandBevel?: number | null // 島嶼邊緣斜率（0-2.0）
  shape?: string | null // 預設形狀類型
  textureId?: string | null // 紋理 ID
  modelUrl?: string | null // 自訂 3D 模型 URL
}

/**
 * 注意：預設島嶼現在由資料庫管理
 * 使用 GET_ISLANDS GraphQL query 來獲取用戶的島嶼資料
 * 首次登入時，backend 會自動初始化預設的島嶼
 */
