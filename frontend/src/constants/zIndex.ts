/**
 * Z-Index 圖層管理系統
 *
 * 統一管理所有 UI 組件的 z-index，確保圖層順序清晰
 * 數值越大，圖層越在上方
 */

export const Z_INDEX = {
  // 0-10: 背景和裝飾層
  BACKGROUND: 0,
  DECORATION: 5,
  CANVAS_3D: 10,

  // 10-30: 基礎內容和標籤
  CONTENT: 10,
  LABEL: 20,
  OVERLAY: 25,

  // 30-40: 批量操作和懸浮工具
  BULK_ACTIONS: 30,
  FLOATING_TOOLS: 35,

  // 40-50: 固定 UI 面板（可以多個同時顯示）
  FIXED_PANEL: 40,          // IslandStatusCard, IslandInfoPanel
  NAVIGATION: 45,           // IslandNavigator
  MINIMAP: 48,              // MiniMap

  // 50-60: 半模態彈窗（側邊欄等，會覆蓋固定面板）
  SIDEBAR: 50,              // SettingsMenu
  PANEL_MODAL: 52,          // TororoKnowledgePanel

  // 60-70: 全屏模態彈窗（一次只能打開一個）
  MODAL_BACKDROP: 60,       // 彈窗背景遮罩
  MODAL: 65,                // MemoryDetailModal, ConfirmDialog
  FULLSCREEN_CHAT: 68,      // Live2DCat, TororoKnowledgeAssistant

  // 70-80: 通知和臨時提示（最高優先級）
  TOAST: 70,                // Toast 通知
  TOOLTIP: 75,              // 工具提示
  LOADING: 80,              // 全屏載入動畫

  // 90+: 調試工具（開發環境）
  DEBUG: 90
} as const

/**
 * Tailwind CSS z-index 類名映射
 * 用於快速轉換為 Tailwind 類名
 */
export const Z_INDEX_CLASSES = {
  BACKGROUND: 'z-0',
  DECORATION: 'z-[5]',
  CANVAS_3D: 'z-10',
  CONTENT: 'z-10',
  LABEL: 'z-20',
  OVERLAY: 'z-[25]',
  BULK_ACTIONS: 'z-30',
  FLOATING_TOOLS: 'z-[35]',
  FIXED_PANEL: 'z-40',
  NAVIGATION: 'z-[45]',
  MINIMAP: 'z-[48]',
  SIDEBAR: 'z-50',
  PANEL_MODAL: 'z-[52]',
  MODAL_BACKDROP: 'z-[60]',
  MODAL: 'z-[65]',
  FULLSCREEN_CHAT: 'z-[68]',
  TOAST: 'z-[70]',
  TOOLTIP: 'z-[75]',
  LOADING: 'z-[80]',
  DEBUG: 'z-[90]'
} as const

/**
 * 圖層使用指南：
 *
 * 1. FIXED_PANEL (z-40): 用於左上角的島嶼狀態卡、右上角的資訊面板等
 *    - 這些面板可以同時顯示
 *    - 不會互相遮擋
 *
 * 2. SIDEBAR (z-50): 用於側邊欄，如設定選單
 *    - 會覆蓋 FIXED_PANEL
 *    - 有背景遮罩，但不會完全覆蓋整個畫面
 *
 * 3. MODAL (z-65): 用於模態彈窗，如記憶詳情彈窗
 *    - 會覆蓋所有下層內容
 *    - 有完整的背景遮罩
 *    - 一次只應該打開一個
 *
 * 4. FULLSCREEN_CHAT (z-68): 用於全屏聊天界面（Live2DCat、TororoKnowledgeAssistant）
 *    - 優先級高於普通模態彈窗
 *    - 完全覆蓋畫面
 *    - 點擊島嶼標籤或貓貓標籤時打開
 *
 * 5. TOAST (z-70): 用於通知提示
 *    - 最高優先級的 UI 元素
 *    - 不會被其他元素遮擋
 *
 * 注意：3D 場景中的 HTML 元素（如島嶼標籤、貓貓標籤）使用 zIndexRange 屬性
 * 這是 @react-three/drei 的 Html 組件特有的屬性，與 CSS z-index 不同
 *
 * 當前設定：
 * - 島嶼標籤 (IslandLabel): zIndexRange={[15, 0]} - 低於固定面板
 * - 貓咪標籤 (AnimatedCat): zIndexRange={[10, 0]} - 最底層
 * - 固定 UI 面板 (IslandInfoPanel等): z-40 - 確保不被 3D 元素遮擋
 */
