// Vibe Coding 提示詞模板和範例

export interface PromptTemplate {
  id: string;
  category: string;
  title: string;
  description: string;
  template: string;
  example: string;
  tips: string[];
}

export const promptTemplates: PromptTemplate[] = [
  {
    id: 'basic-description',
    category: '基礎描述',
    title: '清楚描述需求',
    description: '學習如何具體描述你想要的程式',
    template: `我想做一個 [應用類型]
功能需求：
1. [功能1]
2. [功能2]
3. [功能3]
目標使用者：[誰會使用]
風格偏好：[簡約/可愛/專業]`,
    example: `我想做一個待辦事項應用
功能需求：
1. 可以新增待辦事項
2. 可以標記完成
3. 可以刪除事項
目標使用者：學生和上班族
風格偏好：簡約現代`,
    tips: [
      '具體說明每個功能',
      '描述目標使用者',
      '說明視覺風格偏好'
    ]
  },
  {
    id: 'iterative-improvement',
    category: '迭代開發',
    title: '逐步改進程式',
    description: '如何一步步優化你的程式',
    template: `基礎版：「做一個 [基本功能]」
改進1：「加上 [新功能]」
改進2：「改善 [使用體驗]」
美化：「使用 [風格] 的設計」`,
    example: `基礎版：「做一個計算機」
改進1：「加上開根號和百分比功能」
改進2：「加上歷史記錄功能」
美化：「使用圓形按鈕和柔和色彩」`,
    tips: [
      '從最簡單開始',
      '每次只改一個方向',
      '測試後再繼續'
    ]
  },
  {
    id: 'debugging',
    category: '除錯溝通',
    title: '描述問題給 AI',
    description: '如何清楚地報告錯誤',
    template: `現象：[發生了什麼]
期望：[應該要怎樣]
錯誤訊息：[如果有的話]
重現步驟：
1. [步驟1]
2. [步驟2]
環境：[瀏覽器/裝置]`,
    example: `現象：按鈕點擊沒反應
期望：應該要彈出提示視窗
錯誤訊息：Console顯示"button is null"
重現步驟：
1. 開啟網頁
2. 點擊提交按鈕
環境：Chrome瀏覽器`,
    tips: [
      '複製完整錯誤訊息',
      '說明期望的結果',
      '描述如何重現問題'
    ]
  },
  {
    id: 'role-setting',
    category: '進階技巧',
    title: '角色設定法',
    description: '讓 AI 扮演特定角色',
    template: `你是一位 [專業角色]
專長是 [特定領域]
請幫我 [具體任務]
要求：[特殊需求]`,
    example: `你是一位經驗豐富的UI設計師
專長是使用者體驗設計
請幫我設計一個老年人友善的掛號系統
要求：大字體、高對比、簡單流程`,
    tips: [
      '設定專業角色',
      '說明特定需求',
      '提供背景資訊'
    ]
  },
  {
    id: 'example-driven',
    category: '進階技巧',
    title: '範例引導法',
    description: '用現有例子說明需求',
    template: `像 [知名應用] 的 [功能]
但是要 [你的調整]
目標是 [使用目的]`,
    example: `像 Instagram 的圖片上傳功能
但是要專門用於寵物照片
目標是建立寵物社群`,
    tips: [
      '參考知名應用',
      '說明差異之處',
      '解釋使用目的'
    ]
  },
  {
    id: 'constraint-based',
    category: '進階技巧',
    title: '限制框架法',
    description: '在特定限制下開發',
    template: `使用 [技術限制]
不要使用 [排除項目]
必須支援 [相容需求]
效能要求：[特定要求]`,
    example: `使用純HTML和CSS
不要使用JavaScript
必須支援手機瀏覽
效能要求：載入時間小於2秒`,
    tips: [
      '明確技術限制',
      '說明相容需求',
      '設定效能目標'
    ]
  },
  {
    id: 'project-planning',
    category: '專案規劃',
    title: '完整專案模板',
    description: '規劃大型專案',
    template: `專案名稱：[名稱]
目標：[要解決的問題]

核心功能：
- [功能1]
- [功能2]
- [功能3]

開發階段：
階段1：[基礎功能]
階段2：[進階功能]
階段3：[優化體驗]

技術需求：
- 平台：[網頁/手機/桌面]
- 資料：[需要儲存什麼]`,
    example: `專案名稱：智慧記帳本
目標：幫助家庭管理開支

核心功能：
- 記錄收支
- 分類統計
- 預算提醒

開發階段：
階段1：基本記帳功能
階段2：分類和報表
階段3：圖表視覺化

技術需求：
- 平台：手機網頁
- 資料：交易記錄、分類`,
    tips: [
      '分階段開發',
      '列出核心功能',
      '考慮技術需求'
    ]
  },
  {
    id: 'ui-design',
    category: '介面設計',
    title: '介面設計需求',
    description: '描述使用者介面',
    template: `介面類型：[表單/列表/儀表板]
視覺風格：[現代/復古/極簡]
色彩方案：[主色/輔色]
互動方式：[點擊/滑動/拖曳]
響應式：[手機/平板/桌面]`,
    example: `介面類型：商品展示列表
視覺風格：現代極簡
色彩方案：白底配藍色重點
互動方式：點擊查看詳情
響應式：優先手機體驗`,
    tips: [
      '描述視覺風格',
      '說明互動方式',
      '考慮不同裝置'
    ]
  }
];

// 快速提示詞範例
export const quickPrompts = [
  '做一個會說早安的程式，根據時間顯示不同問候',
  '做一個BMI計算器，要有友善的健康建議',
  '做一個番茄鐘，25分鐘工作，5分鐘休息',
  '做一個猜數字遊戲，1到100，給提示',
  '做一個顏色選擇器，可以複製色碼',
  '做一個待辦清單，可以打勾和刪除',
  '做一個倒數計時器，可以自訂時間',
  '做一個擲骰子應用，有動畫效果',
  '做一個隨機密碼產生器，可選長度和複雜度',
  '做一個單位轉換器，支援長度重量溫度'
];

// 常見錯誤描述模板
export const errorTemplates = [
  {
    error: '按鈕沒反應',
    template: '按鈕點擊沒反應，Console顯示[錯誤訊息]，期望是[預期行為]'
  },
  {
    error: '顯示不正常',
    template: '[元素]顯示不正常，應該要[正確顯示]，但現在[錯誤顯示]'
  },
  {
    error: '功能失效',
    template: '[功能名稱]無法使用，操作[具體操作]後，沒有[預期結果]'
  },
  {
    error: '資料錯誤',
    template: '輸入[輸入值]，顯示[錯誤結果]，應該要顯示[正確結果]'
  }
];

// 專案階段模板
export const projectStages = [
  {
    stage: 1,
    name: '基礎架構',
    focus: '建立核心功能',
    deliverables: ['基本介面', '主要功能', '資料結構']
  },
  {
    stage: 2,
    name: '功能擴充',
    focus: '加入更多功能',
    deliverables: ['次要功能', '使用者互動', '資料處理']
  },
  {
    stage: 3,
    name: '優化體驗',
    focus: '改善使用體驗',
    deliverables: ['介面美化', '動畫效果', '錯誤處理']
  },
  {
    stage: 4,
    name: '完善發布',
    focus: '準備上線',
    deliverables: ['效能優化', '相容性', '使用說明']
  }
];