// 應用程式配置
export const APP_CONFIG = {
  // API 端點
  api: {
    baseUrl: process.env.NODE_ENV === 'production'
      ? 'https://api.ccadventure.com'
      : '',
    endpoints: {
      auth: {
        login: '/api/auth/login',
        register: '/api/auth/register',
        logout: '/api/auth/logout',
      },
      users: {
        count: '/api/users/count',
        profile: '/api/users/profile',
      },
      gemini: {
        assistant: '/api/assistant',
      },
    },
  },

  // 應用程式設定
  app: {
    name: '貓咪老師教你 3分鐘學會AI寫程式',
    version: '1.0.0',
    defaultLanguage: 'zh-TW',
  },

  // 功能開關
  features: {
    live2d: true,
    authentication: true,
    achievements: true,
    soundEffects: true,
    analytics: false,
  },

  // Live2D 模型配置
  live2d: {
    models: {
      tororo: {
        white: '/models/tororo_white/tororo.model3.json',
        fallback: '/models/tororo_white/tororo.2048/texture_00.png',
      },
    },
    // 不同頁面的貓咪大小配置（基礎值，會根據螢幕動態調整）
    sizes: {
      intro: {
        width: 280,  // 降低基礎寬度
        height: 280,  // 降低基礎高度
        scale: 0.12,  // 降低基礎縮放
      },
      game: {
        width: 200,  // 更小的遊戲頁面貓咪
        height: 200,
        scale: 0.08,
      },
      tutorial: {
        width: 240,
        height: 240,
        scale: 0.10,
      },
    },
    // 默認配置（用於舊代碼兼容）
    defaultScale: 0.10,
    defaultWidth: 240,
    defaultHeight: 240,
  },

  // 動畫配置
  animation: {
    duration: {
      short: 200,
      medium: 400,
      long: 600,
    },
    easing: 'easeInOut',
  },
} as const;

export type AppConfig = typeof APP_CONFIG;