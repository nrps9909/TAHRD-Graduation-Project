/**
 * 島嶼/資料庫類型定義
 *
 * 新架構（與資料庫 schema 一致）：
 * - Island = 用戶自定義的主要知識領域（大類別，如：工作島、學習島）
 * - Subcategory = 島嶼下的小類別（SubAgent）
 * - Memory = 屬於某個 Subcategory 的記憶
 */

// 記憶類別（對應資料庫的 AssistantType/MemoryCategory）
export type IslandCategory =
  | 'LEARNING'
  | 'INSPIRATION'
  | 'WORK'
  | 'SOCIAL'
  | 'LIFE'
  | 'GOALS'
  | 'RESOURCES'
  | 'MISC' // 雜項 - 不屬於其他類別的知識

// 記憶數據結構
export interface Memory {
  id: string
  title: string | null
  importance: number // @deprecated 已移除，固定為 5。樹的顏色由 subcategory 決定
  category: IslandCategory // 傳統記憶類別（向後兼容）
  content?: string
  tags?: string[]
  createdAt: Date
  position: [number, number, number] // 3D 空間中的位置

  // UI 顯示相關
  emoji?: string
  summary?: string | null
  color?: string // 樹的顏色（從 subcategory.color 獲取）

  // 新增：關聯到自訂小類別
  subcategoryId?: string | null
  subcategory?: Subcategory | null
}

// 小類別（SubAgent）- 與資料庫 schema 一致
export interface Subcategory {
  id: string
  userId: string
  islandId: string
  position: number

  // 自訂資訊
  name: string | null
  nameChinese: string
  emoji: string
  color: string
  description?: string | null

  // AI 設定
  systemPrompt: string
  personality: string
  chatStyle: string
  keywords: string[]

  // 統計
  memoryCount: number
  chatCount: number

  // 狀態
  isActive: boolean

  // Timestamps
  createdAt: string
  updatedAt: string

  // Relations
  memories?: Memory[]
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
  subcategoryCount: number
  memoryCount: number

  // 狀態
  isActive: boolean

  // Timestamps
  createdAt: string
  updatedAt: string

  // Relations
  subcategories?: Subcategory[]

  // 記憶列表（從所有 subcategories 中的記憶聚合而來）
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
 * 注意：預設島嶼和小類別現在由資料庫管理
 * 使用 GET_ISLANDS GraphQL query 來獲取用戶的島嶼資料
 * 首次登入時，backend 會自動初始化預設的島嶼和小類別
 */
