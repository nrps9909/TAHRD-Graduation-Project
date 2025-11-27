/**
 * 新手教學步驟配置
 * 心語小鎮 - 治癒系互動式引導（完整版 8 步）
 *
 * 設計理念：
 * - 完整介紹：8 步涵蓋所有核心功能
 * - 強制完成：確保用戶了解系統
 * - 動態 UI：提示框位置智能調整
 * - 白噗噗導覽：親切的引導角色
 */

export interface OnboardingStep {
  id: number
  title: string
  description: string
  target?: string // CSS 選擇器，用於聚焦高亮
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center' | 'auto'
  action?: 'click' | 'none' | 'custom'
  actionLabel?: string
  tips?: string[]
  nextButtonText?: string
  skipEnabled?: boolean
  canSkipAction?: boolean // 是否可以跳過互動（「稍後再試」）
  mascotMood?: 'happy' | 'excited' | 'thinking' | 'waving' // 白噗噗表情
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  // ========== 步驟 0：歡迎 ==========
  {
    id: 0,
    title: '歡迎來到心語小鎮！',
    description: `這是你的**個人知識小鎮** 🏝️

小鎮有 5 個島嶼幫你分類記憶：
📚 學習島 · 🌱 生活島 · 💼 工作島 · 👥 社交島 · 🎯 目標島

讓我帶你快速認識這裡～`,
    position: 'center',
    action: 'none',
    nextButtonText: '開始探索',
    skipEnabled: true,
    mascotMood: 'waving'
  },

  // ========== 步驟 1：白噗噗（知識上傳） ==========
  {
    id: 1,
    title: '認識白噗噗 🐱',
    description: `我是**白噗噗**，你的知識管理助手！

我可以幫你記錄任何想法、學習筆記或靈感 ✨

**👉 點擊場景中的白貓，輸入任意文字送出試試！**

例如：「今天學了新東西」`,
    target: 'canvas',
    position: 'auto',
    action: 'custom',
    actionLabel: '發送訊息給白噗噗',
    nextButtonText: '繼續',
    skipEnabled: false,
    canSkipAction: false,
    mascotMood: 'happy'
  },

  // ========== 步驟 2：黑噗噗（知識搜尋） ==========
  {
    id: 2,
    title: '認識黑噗噗 🐈‍⬛',
    description: `這是**黑噗噗**，知識搜尋專家！

你可以用自然語言向他提問，他會從你的記憶中搜尋答案 🔍

**👉 點擊場景中的黑貓，輸入任意問題送出！**

例如：「我記了什麼？」`,
    target: 'canvas',
    position: 'auto',
    action: 'custom',
    actionLabel: '發送問題給黑噗噗',
    nextButtonText: '繼續',
    skipEnabled: false,
    canSkipAction: false,
    mascotMood: 'thinking'
  },

  // ========== 步驟 3：探索 3D 場景 ==========
  {
    id: 3,
    title: '探索你的小鎮 🌟',
    description: `這個 3D 小鎮就是你的知識空間！

🖱️ **拖動滑鼠** - 旋轉視角
🔍 **滾輪縮放** - 放大縮小
🏝️ **點擊島嶼** - 查看該分類的記憶

島嶼上的**花朵**就是你的知識，越多越繁茂！`,
    target: 'canvas',
    position: 'auto',
    action: 'none',
    nextButtonText: '了解了',
    skipEnabled: true,
    mascotMood: 'excited'
  },

  // ========== 步驟 4：知識寶庫 ==========
  {
    id: 4,
    title: '知識寶庫 📚',
    description: `看到場景中央**發光的水晶球**了嗎？ 🔮

那是**知識寶庫**的入口，你可以：
📝 瀏覽和編輯所有記憶
🔍 進階搜尋和篩選
📊 查看知識統計分佈

**👉 點擊水晶球進入看看！**`,
    target: 'canvas',
    position: 'auto',
    action: 'custom',
    actionLabel: '點擊水晶球',
    nextButtonText: '繼續',
    skipEnabled: true,
    canSkipAction: true,
    mascotMood: 'excited'
  },

  // ========== 步驟 5：小地圖功能（互動式） ==========
  {
    id: 5,
    title: '小地圖導覽 🗺️',
    description: `看到右下角的**小地圖**了嗎？

它可以幫你快速導航到各個島嶼！

**👉 試試點擊小地圖中的任一島嶼！**`,
    position: 'center',
    action: 'custom',
    actionLabel: '點擊小地圖島嶼',
    nextButtonText: '繼續',
    skipEnabled: false,
    canSkipAction: false,
    mascotMood: 'happy'
  },

  // ========== 步驟 6：設定功能 ==========
  {
    id: 6,
    title: '個人設定 ⚙️',
    description: `點擊右上角的**設定按鈕**可以：

🎨 切換主題和語言
🏝️ 自訂島嶼名稱和分類
📊 查看使用統計
🔄 重新開始新手教學

打造屬於你的心語小鎮！`,
    position: 'center',
    action: 'none',
    nextButtonText: '了解了',
    skipEnabled: false,
    mascotMood: 'thinking'
  },

  // ========== 步驟 7：完成 ==========
  {
    id: 7,
    title: '準備好了！🎉',
    description: `恭喜你完成新手教學！

現在你可以：
🐱 **白噗噗** - 隨時記錄知識
🐈‍⬛ **黑噗噗** - 搜尋和提問
🔮 **知識寶庫** - 管理所有記憶
🗺️ **小地圖** - 快速導覽

祝你在心語小鎮度過美好時光！💖`,
    position: 'center',
    action: 'none',
    nextButtonText: '開始使用',
    skipEnabled: false,
    mascotMood: 'happy'
  }
]

/**
 * 獲取特定步驟
 */
export const getOnboardingStep = (stepId: number): OnboardingStep | undefined => {
  return ONBOARDING_STEPS.find(step => step.id === stepId)
}

/**
 * 獲取下一步驟
 */
export const getNextStep = (currentStep: number): OnboardingStep | undefined => {
  return ONBOARDING_STEPS.find(step => step.id === currentStep + 1)
}

/**
 * 獲取上一步驟
 */
export const getPreviousStep = (currentStep: number): OnboardingStep | undefined => {
  return ONBOARDING_STEPS.find(step => step.id === currentStep - 1)
}

/**
 * 檢查是否為最後一步
 */
export const isLastStep = (stepId: number): boolean => {
  return stepId === ONBOARDING_STEPS.length - 1
}

/**
 * 檢查是否為第一步
 */
export const isFirstStep = (stepId: number): boolean => {
  return stepId === 0
}

/**
 * 獲取總步驟數
 */
export const getTotalSteps = (): number => {
  return ONBOARDING_STEPS.length
}
