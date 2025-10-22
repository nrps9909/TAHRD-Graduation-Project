/**
 * CatChat - Constants and theme configurations
 */

// 動物森友會風格配色
export const AC_COLORS = {
  tororo: {
    // 白天模式 - 溫暖黃色系
    name: '白噗噗',
    emoji: '☁️',
    description: '知識園丁',
    // 主背景
    background: 'linear-gradient(135deg, rgba(255, 248, 231, 0.95) 0%, rgba(255, 243, 224, 0.95) 100%)',
    backdropFilter: 'blur(24px) saturate(180%)',
    border: '3px solid rgba(251, 191, 36, 0.4)',
    boxShadow: '0 8px 32px 0 rgba(251, 191, 36, 0.3), inset 0 1px 0 0 rgba(255, 255, 255, 0.8)',
    // 頭部
    headerBg: 'linear-gradient(135deg, rgba(251, 191, 36, 0.4) 0%, rgba(245, 158, 11, 0.3) 100%)',
    headerText: '#8B5C2E',
    headerTextSecondary: '#A67C52',
    // 訊息氣泡
    userBubbleBg: 'linear-gradient(135deg, rgba(251, 191, 36, 0.5) 0%, rgba(245, 158, 11, 0.4) 100%)',
    userBubbleText: '#5D3A1A',
    catBubbleBg: 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(254, 252, 247, 0.7) 100%)',
    catBubbleText: '#5D3A1A',
    // 按鈕
    buttonBg: 'linear-gradient(135deg, rgba(251, 191, 36, 0.3) 0%, rgba(245, 158, 11, 0.25) 100%)',
    buttonHoverBg: 'linear-gradient(135deg, rgba(251, 191, 36, 0.5) 0%, rgba(245, 158, 11, 0.4) 100%)',
    buttonText: '#8B5C2E',
    // 輸入框
    inputBorder: 'rgba(251, 191, 36, 0.4)',
    inputFocusBorder: 'rgba(245, 158, 11, 0.6)',
    inputBg: 'rgba(255, 255, 255, 0.9)',
    // 分隔線
    divider: 'linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.3), transparent)',
  },
  hijiki: {
    // 夜間模式 - 紫藍色系
    name: '黑噗噗',
    emoji: '🌙',
    description: '知識管理員',
    // 主背景
    background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.95) 0%, rgba(45, 42, 95, 0.95) 100%)',
    backdropFilter: 'blur(24px) saturate(180%)',
    border: '3px solid rgba(139, 92, 246, 0.4)',
    boxShadow: '0 8px 32px 0 rgba(139, 92, 246, 0.3), inset 0 1px 0 0 rgba(167, 139, 250, 0.3)',
    // 頭部
    headerBg: 'linear-gradient(135deg, rgba(139, 92, 246, 0.4) 0%, rgba(99, 102, 241, 0.3) 100%)',
    headerText: '#FFFFFF',
    headerTextSecondary: '#FFFFFF',
    // 訊息氣泡
    userBubbleBg: 'linear-gradient(135deg, rgba(139, 92, 246, 0.5) 0%, rgba(99, 102, 241, 0.4) 100%)',
    userBubbleText: '#FFFFFF',
    catBubbleBg: 'linear-gradient(135deg, rgba(67, 56, 202, 0.4) 0%, rgba(79, 70, 229, 0.3) 100%)',
    catBubbleText: '#FFFFFF',
    // 按鈕
    buttonBg: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(99, 102, 241, 0.25) 100%)',
    buttonHoverBg: 'linear-gradient(135deg, rgba(139, 92, 246, 0.5) 0%, rgba(99, 102, 241, 0.4) 100%)',
    buttonText: '#FFFFFF',
    // 輸入框
    inputBorder: 'rgba(139, 92, 246, 0.4)',
    inputFocusBorder: 'rgba(99, 102, 241, 0.6)',
    inputBg: 'rgba(67, 56, 202, 0.2)',
    // 分隔線
    divider: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.4), transparent)',
  }
} as const

export type ThemeColors = typeof AC_COLORS[keyof typeof AC_COLORS]
