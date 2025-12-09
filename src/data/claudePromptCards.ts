// Claude Code Adventure - Prompt 卡片收集系統
// 玩家在遊戲中解鎖並收集的 Prompt 模板

export interface PromptCard {
  id: string
  category: 'basic' | 'function' | 'refactor' | 'debug' | 'project'
  title: string
  description: string
  template: string
  example: {
    input: string
    output: string
  }
  tips: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  icon: string
  unlockedBy?: string // 哪個場景解鎖
}

export type PromptCardCategory = PromptCard['category']

export const categoryInfo: Record<
  PromptCardCategory,
  { name: string; icon: string; color: string }
> = {
  basic: { name: '基礎技巧', icon: '🌱', color: 'bg-green-500' },
  function: { name: '函式生成', icon: '⚡', color: 'bg-yellow-500' },
  refactor: { name: '重構優化', icon: '🔧', color: 'bg-blue-500' },
  debug: { name: '除錯技巧', icon: '🐛', color: 'bg-red-500' },
  project: { name: '專案開發', icon: '🚀', color: 'bg-purple-500' },
}

export const promptCards: PromptCard[] = [
  // =====================================================
  // 基礎技巧 (Basic)
  // =====================================================
  {
    id: 'card-hello-world',
    category: 'basic',
    title: 'Hello World',
    description: '最基本的程式請求',
    template: '幫我寫一個 [語言] 程式，功能是 [描述功能]',
    example: {
      input: '幫我寫一個 JavaScript 程式，功能是在網頁上顯示 Hello World',
      output: '一個帶有基本樣式的 HTML 頁面，顯示 Hello World',
    },
    tips: ['指定程式語言會更精準', '描述你想要的呈現方式'],
    difficulty: 'beginner',
    icon: '👋',
    unlockedBy: 'cc-1-2',
  },
  {
    id: 'card-explain-code',
    category: 'basic',
    title: '程式碼解釋',
    description: '請 Claude 解釋程式碼',
    template: '請解釋這段程式碼的功能：\n```\n[貼上程式碼]\n```',
    example: {
      input: '請解釋這段程式碼：array.map(x => x * 2)',
      output: '詳細解釋 map 方法和箭頭函式的運作方式',
    },
    tips: ['可以要求用更簡單的方式解釋', '可以問特定的程式碼片段'],
    difficulty: 'beginner',
    icon: '📖',
  },
  {
    id: 'card-translate-code',
    category: 'basic',
    title: '語言轉換',
    description: '將程式碼轉換為其他語言',
    template: '請將這段 [原語言] 程式碼轉換為 [目標語言]：\n```\n[程式碼]\n```',
    example: {
      input: '請將這段 Python 程式碼轉換為 JavaScript',
      output: '功能相同但使用 JavaScript 語法的程式碼',
    },
    tips: ['指定要保持相同的功能', '可以要求解釋語言之間的差異'],
    difficulty: 'beginner',
    icon: '🔄',
  },
  {
    id: 'card-simple-request',
    category: 'basic',
    title: '簡單需求',
    description: '快速實作小功能',
    template: '幫我寫一個 [功能描述]，要能 [具體要求]',
    example: {
      input: '幫我寫一個計算器，要能做加減乘除',
      output: '完整的計算器程式碼',
    },
    tips: ['越具體越好', '分步驟描述複雜需求'],
    difficulty: 'beginner',
    icon: '✨',
  },

  // =====================================================
  // 函式生成 (Function)
  // =====================================================
  {
    id: 'card-function-template',
    category: 'function',
    title: '函式模板',
    description: '完整描述函式需求',
    template: `請幫我寫一個函式：
- 函式名稱：[名稱]
- 功能：[描述]
- 輸入參數：[參數1], [參數2]
- 回傳值：[描述回傳內容]
- 錯誤處理：[如何處理異常情況]`,
    example: {
      input: `請幫我寫一個函式：
- 函式名稱：calculateAge
- 功能：計算年齡
- 輸入參數：生日（Date 物件）
- 回傳值：年齡（數字）
- 錯誤處理：生日不是有效日期時回傳 -1`,
      output: '完整的函式，包含輸入驗證和錯誤處理',
    },
    tips: ['詳細描述每個參數的型別', '說明邊界情況的處理方式'],
    difficulty: 'intermediate',
    icon: '🔧',
    unlockedBy: 'cc-2-2',
  },
  {
    id: 'card-validation-function',
    category: 'function',
    title: '驗證函式',
    description: '建立資料驗證函式',
    template:
      '幫我寫一個驗證 [資料類型] 的函式，檢查條件：[條件1], [條件2]，回傳驗證結果和錯誤訊息',
    example: {
      input: '幫我寫一個驗證 email 的函式，檢查格式是否正確，回傳 true/false 和錯誤訊息',
      output: '完整的 email 驗證函式，包含正規表達式',
    },
    tips: ['列出所有需要檢查的條件', '考慮各種邊界情況'],
    difficulty: 'intermediate',
    icon: '✅',
  },
  {
    id: 'card-array-function',
    category: 'function',
    title: '陣列處理',
    description: '處理陣列資料的函式',
    template: '幫我寫一個函式，對陣列進行 [操作]，例如 [具體描述]',
    example: {
      input: '幫我寫一個函式，找出陣列中的最大值和最小值',
      output: '回傳 {max, min} 的函式',
    },
    tips: ['描述輸入陣列的內容類型', '說明期望的輸出格式'],
    difficulty: 'intermediate',
    icon: '📊',
  },
  {
    id: 'card-async-function',
    category: 'function',
    title: '非同步函式',
    description: '建立 async/await 函式',
    template: '幫我寫一個 async 函式來 [操作]，要處理 [錯誤情況]',
    example: {
      input: '幫我寫一個 async 函式來呼叫 API 並回傳資料，要處理網路錯誤',
      output: '包含 try-catch 的非同步函式',
    },
    tips: ['明確說明要等待什麼操作', '指定錯誤處理方式'],
    difficulty: 'advanced',
    icon: '⏳',
  },

  // =====================================================
  // 重構優化 (Refactor)
  // =====================================================
  {
    id: 'card-refactor-template',
    category: 'refactor',
    title: '重構請求',
    description: '請求程式碼重構',
    template: `請重構這段程式碼：
\`\`\`
[程式碼]
\`\`\`
改進目標：
- [目標1]
- [目標2]`,
    example: {
      input: '請重構這段程式碼，改進目標：使用有意義的變數名、減少巢狀結構',
      output: '重構後的程式碼，附帶改進說明',
    },
    tips: ['先說明問題所在', '指定具體的改進方向'],
    difficulty: 'intermediate',
    icon: '🔄',
    unlockedBy: 'cc-3-2',
  },
  {
    id: 'card-add-comments',
    category: 'refactor',
    title: '添加註解',
    description: '為程式碼添加文件註解',
    template: '請為這段程式碼添加 [JSDoc/TSDoc] 格式的註解，包含 [功能說明/參數說明/使用範例]',
    example: {
      input: '請為這個函式添加 JSDoc 註解，包含功能說明和參數說明',
      output: '帶有完整 JSDoc 註解的程式碼',
    },
    tips: ['指定註解格式', '要求包含使用範例'],
    difficulty: 'intermediate',
    icon: '📝',
  },
  {
    id: 'card-clean-code',
    category: 'refactor',
    title: 'Clean Code',
    description: '套用 Clean Code 原則',
    template: '請用 Clean Code 原則重寫這段程式碼，特別注意 [原則1], [原則2]',
    example: {
      input: '請用 Clean Code 原則重寫，特別注意單一職責和函式長度',
      output: '符合 Clean Code 原則的程式碼',
    },
    tips: ['指定要強調的原則', 'Claude 會解釋改動原因'],
    difficulty: 'advanced',
    icon: '✨',
  },
  {
    id: 'card-performance',
    category: 'refactor',
    title: '效能優化',
    description: '優化程式碼效能',
    template: '請優化這段程式碼的效能，目前的問題是 [問題描述]',
    example: {
      input: '請優化這段程式碼的效能，目前迴圈執行太慢',
      output: '效能更好的實作方式，附帶時間複雜度分析',
    },
    tips: ['描述效能問題的現象', '說明資料規模'],
    difficulty: 'advanced',
    icon: '⚡',
  },

  // =====================================================
  // 除錯技巧 (Debug)
  // =====================================================
  {
    id: 'card-debug-template',
    category: 'debug',
    title: 'Bug 報告模板',
    description: '完整描述 bug 的模板',
    template: `我遇到一個 bug：

【我做了什麼】
[描述操作步驟]

【預期結果】
[應該發生什麼]

【實際結果】
[實際發生什麼]

【錯誤訊息】
\`\`\`
[Console 錯誤訊息]
\`\`\`

【相關程式碼】
\`\`\`
[程式碼片段]
\`\`\``,
    example: {
      input: '使用完整的 bug 報告模板描述問題',
      output: 'Claude 會快速定位問題並提供解決方案',
    },
    tips: ['複製完整的錯誤訊息', '描述重現步驟'],
    difficulty: 'intermediate',
    icon: '🐛',
    unlockedBy: 'cc-4-2',
  },
  {
    id: 'card-error-analysis',
    category: 'debug',
    title: '錯誤分析',
    description: '分析錯誤訊息',
    template:
      '這個錯誤是什麼意思？如何解決？\n```\n[錯誤訊息]\n```\n相關程式碼：\n```\n[程式碼]\n```',
    example: {
      input: 'TypeError: Cannot read property "map" of undefined',
      output: '錯誤原因解釋和多種解決方案',
    },
    tips: ['包含完整的錯誤堆疊', '附上相關程式碼'],
    difficulty: 'intermediate',
    icon: '🔍',
  },
  {
    id: 'card-logic-debug',
    category: 'debug',
    title: '邏輯除錯',
    description: '找出邏輯錯誤',
    template: '這段程式碼的結果不對，預期是 [預期結果]，實際是 [實際結果]：\n```\n[程式碼]\n```',
    example: {
      input: '這個排序函式結果不對，預期是升序，實際是降序',
      output: '找出邏輯錯誤並修正',
    },
    tips: ['提供具體的輸入輸出範例', '說明哪裡不符合預期'],
    difficulty: 'intermediate',
    icon: '🧩',
  },
  {
    id: 'card-prevent-bugs',
    category: 'debug',
    title: '預防性檢查',
    description: '添加防錯程式碼',
    template: '請幫這段程式碼添加防錯檢查，防止 [可能的錯誤情況]',
    example: {
      input: '請添加防錯檢查，防止 null/undefined 錯誤',
      output: '加入適當檢查的安全程式碼',
    },
    tips: ['列出可能的異常情況', '指定錯誤處理方式'],
    difficulty: 'advanced',
    icon: '🛡️',
  },

  // =====================================================
  // 專案開發 (Project)
  // =====================================================
  {
    id: 'card-project-planning',
    category: 'project',
    title: '專案規劃',
    description: '規劃專案架構',
    template: `我要做一個 [專案名稱]：

【目標】
[解決什麼問題]

【主要功能】
1. [功能1]
2. [功能2]
3. [功能3]

請幫我：
- 建議檔案結構
- 設計資料格式
- 規劃實作順序`,
    example: {
      input: '規劃一個待辦事項 App 的專案結構',
      output: '完整的專案架構建議',
    },
    tips: ['先列出核心功能', '考慮未來擴展性'],
    difficulty: 'intermediate',
    icon: '📋',
    unlockedBy: 'cc-5-2',
  },
  {
    id: 'card-step-by-step',
    category: 'project',
    title: '分步實作',
    description: '請求逐步實作',
    template: '請幫我實作 [功能名稱]，這是第 [N] 步，基於之前的程式碼：\n```\n[現有程式碼]\n```',
    example: {
      input: '請幫我實作刪除功能，這是第 3 步，基於之前的待辦清單',
      output: '在現有基礎上添加新功能',
    },
    tips: ['保持程式碼連續性', '每步都測試'],
    difficulty: 'intermediate',
    icon: '👣',
  },
  {
    id: 'card-full-feature',
    category: 'project',
    title: '完整功能',
    description: '請求完整功能實作',
    template: `請幫我實作一個完整的 [功能名稱]：

【功能需求】
[詳細描述]

【技術要求】
- 使用 [技術/框架]
- 資料儲存在 [localStorage/API]
- UI 風格：[描述]`,
    example: {
      input: '請實作完整的登入功能，使用 localStorage 保存狀態',
      output: '完整的登入功能實作',
    },
    tips: ['一次描述清楚所有需求', '指定技術棧'],
    difficulty: 'advanced',
    icon: '🎯',
  },
  {
    id: 'card-integration',
    category: 'project',
    title: '功能整合',
    description: '整合多個功能',
    template: '請幫我整合以下功能到現有專案：\n[功能列表]\n\n現有程式碼：\n```\n[程式碼]\n```',
    example: {
      input: '請整合搜尋和篩選功能到現有的清單元件',
      output: '整合後的完整程式碼',
    },
    tips: ['確保功能之間不衝突', '保持程式碼一致性'],
    difficulty: 'advanced',
    icon: '🔗',
  },
]

// 根據類別取得卡片
export const getCardsByCategory = (category: PromptCardCategory): PromptCard[] => {
  return promptCards.filter(card => card.category === category)
}

// 根據難度取得卡片
export const getCardsByDifficulty = (
  difficulty: PromptCard['difficulty']
): PromptCard[] => {
  return promptCards.filter(card => card.difficulty === difficulty)
}

// 根據 ID 取得卡片
export const getCardById = (id: string): PromptCard | undefined => {
  return promptCards.find(card => card.id === id)
}

// 取得所有可解鎖的卡片 ID
export const getUnlockableCardIds = (): string[] => {
  return promptCards.filter(card => card.unlockedBy).map(card => card.id)
}
