export interface Scene {
  id: string;
  title: string;
  description: string;
  type: 'tutorial' | 'challenge' | 'interactive';
  content: any;
  nextScene?: string;
  previousScene?: string;
  points: number;
}

export const scenes: Record<string, Scene> = {
  'intro': {
    id: 'intro',
    title: '🐱 歡迎來到 AI 程式設計大冒險！',
    description: '讓我們一起學習如何用 AI 來寫程式吧！',
    type: 'tutorial',
    content: {
      instructions: [
        '👋 歡迎來到神奇的 AI 程式設計世界！',
        '🐱 我是你的可愛貓咪助手',
        '📚 我們將一起學習如何與 AI 協作寫程式',
        '🚀 準備好開始這個有趣的旅程了嗎？',
      ],
      example: `🌟 AI 程式設計的魅力：

你說：「我想做一個計算機」
AI：立刻幫你寫好完整的計算機程式！

你說：「幫我做個網站」
AI：馬上生成漂亮的網站代碼！

這就是 AI 程式設計的威力 ✨`,
      tips: [
        '不需要背程式語法，只要會說話就能寫程式',
        'AI 是你最好的程式設計夥伴',
        '創意比技術更重要',
        '每個人都能成為程式設計師！'
      ]
    },
    nextScene: 'tutorial-1',
    points: 10
  },
  'tutorial-1': {
    id: 'tutorial-1',
    title: '第一章：AI 是你的程式設計師',
    description: '認識 AI 如何幫你寫程式',
    type: 'tutorial',
    content: {
      instructions: [
        '👋 歡迎來到 Vibe Coding 的世界！',
        '你不需要學習複雜的程式語法',
        '只要學會如何與 AI 溝通，就能創造程式',
        '試著對 AI 說："你好！我想學習用 AI 來寫程式"',
      ],
      example: `> 你好！我想學習用 AI 來寫程式

喵～歡迎！我是你的 AI 程式設計師貓咪！🐱

你不需要背程式語法，只要：
1. 告訴我你想做什麼
2. 我會幫你寫程式碼
3. 一起調整到滿意為止

就像指揮樂團，你是指揮家，我是樂手！`,
      tips: [
        '💡 用自然語言描述你的需求',
        '💡 AI 會幫你處理技術細節',
        '💡 重點是清楚的溝通',
      ],
    },
    previousScene: 'intro',
    nextScene: 'tutorial-2',
    points: 100,
  },

  'tutorial-2': {
    id: 'tutorial-2',
    title: '第二章：提示詞的藝術',
    description: '學習如何清楚地向 AI 描述需求',
    type: 'tutorial',
    content: {
      instructions: [
        '🎯 好的提示詞 = 好的程式',
        '試著比較不同的提示方式',
        '問 AI："做一個網站"',
        '再問："做一個展示貓咪照片的網站，要有上傳和按讚功能"',
      ],
      example: `> 做一個展示貓咪照片的網站，要有上傳和按讚功能

喵～收到！我來幫你做一個貓咪照片網站！

功能包括：
📷 照片上傳功能
❤️ 按讚功能
🖼️ 照片展示牆

[AI 會提供完整的程式碼...]

看！具體的描述讓我知道你要什麼！`,
      tips: [
        '💡 要具體描述功能',
        '💡 給予背景和限制',
        '💡 一步步增加需求',
      ],
    },
    nextScene: 'challenge-1',
    previousScene: 'tutorial-1',
    points: 150,
  },

  'challenge-1': {
    id: 'challenge-1',
    title: '🎮 挑戰：你的第一個程式',
    description: '請 AI 幫你做一個簡單的程式',
    type: 'challenge',
    content: {
      task: '練習用不同方式請 AI 幫你寫程式',
      requirements: [
        '📝 請 AI 做一個會說早安的程式',
        '📝 改進：根據時間顯示不同問候',
        '📝 再改進：加上可愛的圖案',
      ],
      example: `> 幫我做一個會說早安的程式，根據時間顯示不同問候語

喵～來做個智慧問候程式！

[HTML + JavaScript 程式碼]

現在它會：
🌅 早上說「早安」
☀️ 下午說「午安」
🌙 晚上說「晚安」

試試看，然後告訴我想怎麼改進！`,
      hints: [
        '💡 先從簡單功能開始',
        '💡 逐步增加細節',
        '💡 描述你想要的效果',
      ],
    },
    nextScene: 'tutorial-3',
    previousScene: 'tutorial-2',
    points: 200,
  },

  'tutorial-3': {
    id: 'tutorial-3',
    title: '第三章：迭代開發的魔法',
    description: '學習如何逐步改進 AI 的輸出',
    type: 'tutorial',
    content: {
      instructions: [
        '📦 程式很少一次就完美！',
        '學習如何一步步優化',
        '對 AI 說："做一個按鈕"',
        '然後說："把按鈕改成藍色，加上圓角"',
        '最後說："加上點擊動畫效果"',
      ],
      example: `> 做一個按鈕
[AI 提供基本按鈕]

> 把按鈕改成藍色，加上圓角
[AI 更新樣式]

> 加上點擊動畫效果
喵～好的！我加上了：
✨ 點擊縮放效果
🎨 顏色漸變
💫 陰影變化

看！逐步改進讓程式越來越好！`,
      tips: [
        '💡 一次改一個地方',
        '💡 保留好的部分',
        '💡 具體說明要改什麼',
      ],
    },
    nextScene: 'tutorial-4',
    previousScene: 'challenge-1',
    points: 150,
  },

  'tutorial-4': {
    id: 'tutorial-4',
    title: '第四章：理解 AI 的輸出',
    description: '學習如何閱讀和測試程式碼',
    type: 'tutorial',
    content: {
      instructions: [
        '💻 你不需要會寫，但要能理解大概',
        '請 AI："做一個計算機，並解釋每個部分"',
        'AI 會標註：HTML（結構）、CSS（外觀）、JS（功能）',
        '學習識別這三個部分',
      ],
      example: `> 做一個計算機，並解釋每個部分

喵～我來做個計算機並解釋！

📦 HTML（網頁結構）：
<button> = 按鈕
<div> = 容器
<input> = 輸入框

🎨 CSS（外觀樣式）：
color: blue = 藍色文字
font-size: 20px = 文字大小

⚡ JavaScript（互動功能）：
onclick = 點擊時執行
function = 定義動作`,
      tips: [
        '💡 HTML 像房子結構',
        '💡 CSS 像裝潢油漆',
        '💡 JS 像電器開關',
      ],
    },
    nextScene: 'tutorial-5',
    previousScene: 'tutorial-3',
    points: 150,
  },

  'tutorial-5': {
    id: 'tutorial-5',
    title: '第五章：除錯的對話技巧',
    description: '學習如何請 AI 幫你解決問題',
    type: 'tutorial',
    content: {
      instructions: [
        '📦 程式出錯很正常！重點是如何描述',
        '練習描述問題給 AI',
        '說："按鈕點擊沒反應"（太模糊）',
        '改成："按鈕點擊沒反應，Console 顯示 button is null"',
      ],
      example: `> 按鈕點擊沒反應，Console 顯示 button is null

喵～我知道問題了！

"button is null" 表示找不到按鈕
可能原因：
1. 按鈕 ID 打錯了
2. JavaScript 在按鈕載入前執行

解決方法：
[提供修正的程式碼]

看！具體的錯誤訊息幫助我快速解決！`,
      tips: [
        '💡 複製錯誤訊息給 AI',
        '💡 說明你期望的結果',
        '💡 描述重現步驟',
      ],
    },
    nextScene: 'challenge-2',
    previousScene: 'tutorial-4',
    points: 150,
  },

  'challenge-2': {
    id: 'challenge-2',
    title: '🎮 挑戰：打造待辦清單',
    description: '用迭代方式請 AI 幫你做待辦清單',
    type: 'challenge',
    content: {
      task: '練習迭代開發，逐步完成待辦清單',
      requirements: [
        '📝 第一步：請 AI 做基本待辦清單',
        '📝 第二步：加入刪除功能',
        '📝 第三步：加入完成打勾功能',
        '📝 第四步：美化介面',
      ],
      example: `> 做一個簡單的待辦清單
[AI 提供基本版本]

> 很好！加上刪除按鈕
[AI 加入刪除功能]

> 加上打勾完成的功能
[AI 加入checkbox]

> 美化一下，用柔和的顏色
喵～來個可愛風格！
[AI 美化介面]`,
      hints: [
        '💡 從最簡單開始',
        '💡 每次只改一個功能',
        '💡 測試後再繼續',
      ],
    },
    nextScene: 'tutorial-6',
    previousScene: 'tutorial-5',
    points: 200,
  },

  'tutorial-6': {
    id: 'tutorial-6',
    title: '第六章：常見應用模式',
    description: '了解可以請 AI 做什麼類型的程式',
    type: 'tutorial',
    content: {
      instructions: [
        '🎭 AI 可以幫你做各種程式！',
        '試著請 AI："做一個 BMI 計算器"',
        '或者："做一個倒數計時器"',
        '或者："做一個猜數字遊戲"',
        '看看 AI 如何實現不同類型的程式',
      ],
      example: `> 做一個猜數字遊戲

喵～來做個有趣的猜數字遊戲！

功能包括：
🎲 隨機產生 1-100 的數字
🤔 玩家輸入猜測
📊 提示太大或太小
🎉 猜對時慶祝

[提供完整的遊戲程式碼]

試玩看看，想加什麼功能告訴我！`,
      tips: [
        '💡 網頁工具最容易',
        '💡 小遊戲很有趣',
        '💡 資料處理很實用',
      ],
    },
    nextScene: 'tutorial-7',
    previousScene: 'challenge-2',
    points: 150,
  },

  'tutorial-7': {
    id: 'tutorial-7',
    title: '第七章：專案規劃技巧',
    description: '學習如何規劃一個完整專案',
    type: 'tutorial',
    content: {
      instructions: [
        '🚦 大專案需要分階段完成！',
        '練習描述專案給 AI',
        '說："我想做一個記帳本"',
        '然後分階段：',
        '階段1：基本記錄功能',
        '階段2：分類統計',
        '階段3：圖表顯示',
      ],
      example: `> 我想做記帳本，先做基本記錄功能

喵～好的！第一階段：
📝 新增收支記錄
💰 顯示總額
📋 列出所有記錄

[提供基本版程式]

完成後我們再加統計功能！

> 很好！現在加入分類功能

[AI 逐步擴充功能]`,
      tips: [
        '💡 分階段開發',
        '💡 先核心後附加',
        '💡 每階段都要測試',
      ],
    },
    nextScene: 'challenge-3',
    previousScene: 'tutorial-6',
    points: 150,
  },

  'challenge-3': {
    id: 'challenge-3',
    title: '🎮 挑戰：製作個人網站',
    description: '完整的專案開發練習',
    type: 'challenge',
    content: {
      task: '用三個階段請 AI 幫你做個人網站',
      requirements: [
        '📝 階段1：自我介紹頁面',
        '📝 階段2：加入作品展示區',
        '📝 階段3：加入聯絡表單',
        '📝 階段4：美化和動畫',
      ],
      example: `> 幫我做個人網站，先做自我介紹頁

喵～開始打造你的個人網站！

第一階段完成：
✅ 大頭照區域
✅ 自我介紹文字
✅ 基本樣式

[提供程式碼]

準備好進入第二階段了嗎？`,
      hints: [
        '💡 明確說出每階段目標',
        '💡 提供個人資訊',
        '💡 參考喜歡的網站風格',
      ],
    },
    nextScene: 'tutorial-8',
    previousScene: 'tutorial-7',
    points: 300,
  },

  'tutorial-8': {
    id: 'tutorial-8',
    title: '第八章：進階提示技巧',
    description: '掌握高級的 AI 溝通技巧',
    type: 'tutorial',
    content: {
      instructions: [
        '🔄 學習專業的提示技巧！',
        '試試角色設定："你是經驗豐富的網頁設計師，幫我設計..."',
        '試試範例引導："像 Airbnb 那樣的日期選擇器"',
        '試試限制框架："只用 HTML 和 CSS，不要 JavaScript"',
      ],
      example: `> 你是經驗豐富的網頁設計師，幫我設計一個老年人友善的表單

喵～作為資深設計師，我會注意：

👴 老年人友善設計：
• 大字體（至少 18px）
• 高對比顏色
• 大按鈕（易點擊）
• 清楚的說明文字
• 簡化的流程

[提供專業的無障礙設計]`,
      tips: [
        '💡 設定 AI 角色',
        '💡 提供參考範例',
        '💡 給予明確限制',
      ],
    },
    nextScene: 'tutorial-9',
    previousScene: 'challenge-3',
    points: 150,
  },

  'tutorial-9': {
    id: 'tutorial-9',
    title: '第九章：AI 協作最佳實踐',
    description: '成為 Vibe Coding 高手的秘訣',
    type: 'tutorial',
    content: {
      instructions: [
        '📚 恭喜你來到最後一課！',
        '記住這些原則：',
        '1. 你是創意總監，AI 是程式設計師',
        '2. 清楚的溝通帶來好結果',
        '3. 迭代開發，逐步完善',
        '4. 保持好奇，持續探索',
      ],
      example: `> 總結一下 Vibe Coding 的精髓

喵～Vibe Coding 的核心精神：

🎨 創意為王
你負責想像，AI 負責實現

💬 溝通是橋樑
好的描述 = 好的程式

🔄 迭代出完美
沒有一步登天，只有持續改進

🚀 人人都能創造
程式設計不再是少數人的專利！`,
      tips: [
        '💡 建立提示詞模板庫',
        '💡 記錄成功的對話',
        '💡 分享你的創作',
      ],
    },
    nextScene: 'final-challenge',
    previousScene: 'tutorial-8',
    points: 150,
  },

  'final-challenge': {
    id: 'final-challenge',
    title: '🏆 最終挑戰：你的夢想專案',
    description: '運用所學，創造屬於你的應用',
    type: 'challenge',
    content: {
      task: '規劃並請 AI 幫你實現一個完整專案',
      requirements: [
        '📝 定義你的專案目標',
        '📝 列出核心功能（3-5個）',
        '📝 分成3-4個開發階段',
        '📝 與 AI 協作完成每個階段',
        '📝 持續測試和優化',
      ],
      starter: `專案規劃模板：

專案名稱：[你的創意]
目標使用者：[誰會用]
解決問題：[什麼問題]

核心功能：
1. [功能1]
2. [功能2]
3. [功能3]

開發階段：
階段1：[基本功能]
階段2：[進階功能]
階段3：[優化體驗]`,
      hints: [
        '💡 選擇你有熱情的主題',
        '💡 從簡單版本開始',
        '💡 每個階段都要能運作',
        '💡 記錄學到的經驗',
      ],
    },
    nextScene: 'completion',
    previousScene: 'tutorial-9',
    points: 500,
  },

  'completion': {
    id: 'completion',
    title: '🎉 恭喜成為 Vibe Coding 大師！',
    description: '你已經掌握用 AI 寫程式的能力了！',
    type: 'tutorial',
    content: {
      instructions: [
        '🎊 太棒了！你完成了 Vibe Coding 訓練！',
        '你已經學會了：',
        '✅ 清楚描述需求給 AI',
        '✅ 迭代優化程式',
        '✅ 除錯溝通技巧',
        '✅ 專案規劃思維',
        '',
        '現在你可以用 AI 創造任何程式！',
        '記住：你是創意總監，AI 是你的程式設計師！',
      ],
      tips: [
        '💡 持續創造新專案',
        '💡 分享你的作品',
        '💡 幫助其他學習者',
        '💡 探索 AI 的無限可能',
      ],
    },
    previousScene: 'final-challenge',
    points: 0,
  },
};