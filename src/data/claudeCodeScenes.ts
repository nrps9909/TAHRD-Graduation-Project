// Claude Code Adventure - 場景資料
// 6 個主要關卡，每關 3 個子場景

export interface ClaudeCodeScene {
  id: string
  level: number
  title: string
  description: string
  type: 'tutorial' | 'challenge' | 'interactive' | 'boss'
  content: {
    missionObjective: string
    instructions: string[]
    promptTemplates?: PromptTemplate[]
    simulatedOutput?: SimulatedOutput
    quiz?: Quiz
    example?: string
    tips?: string[]
    requirements?: string[]
    starter?: string
  }
  nextScene?: string
  previousScene?: string
  points: number
  unlockCards?: string[] // 完成後解鎖的 Prompt Cards
  unlockNPC?: string // 完成後解鎖的 NPC
}

export interface PromptTemplate {
  id: string
  name: string
  template: string
  description: string
}

export interface SimulatedOutput {
  userInput: string
  claudeResponse: string
  codeOutput?: string
  explanation?: string
}

export interface Quiz {
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
}

// =====================================================
// Level 1: 認識 Vibe Coding
// =====================================================

const level1Scenes: Record<string, ClaudeCodeScene> = {
  'cc-1-1': {
    id: 'cc-1-1',
    level: 1,
    title: '什麼是 Vibe Coding？',
    description: '了解用自然語言寫程式的革命性方法',
    type: 'tutorial',
    content: {
      missionObjective: '理解 Vibe Coding 的核心概念，準備開始你的 AI 程式設計之旅',
      instructions: [
        '歡迎來到 Claude Code Adventure！',
        'Vibe Coding 是一種全新的程式設計方式',
        '你不需要記住複雜的語法，只要用自然語言描述你想要什麼',
        'Claude 會理解你的意圖，並幫你寫出程式碼',
        '就像和一位超級聰明的程式設計師對話一樣！',
      ],
      example: `想像你要做一個計算機：

傳統方式：需要學習 HTML、CSS、JavaScript 語法
Vibe Coding：「幫我做一個簡單的計算機，可以加減乘除」

Claude 會幫你：
✅ 設計介面
✅ 撰寫程式邏輯
✅ 處理錯誤情況
✅ 加上漂亮的樣式`,
      tips: [
        '你是創意總監，Claude 是你的程式設計師',
        '描述越清楚，結果越好',
        '不用擔心技術細節，專注在你想要什麼',
      ],
      quiz: {
        question: 'Vibe Coding 的核心理念是什麼？',
        options: [
          '背誦所有程式語法',
          '用自然語言描述需求，讓 AI 幫你寫程式',
          '只能用英文寫程式',
          '需要十年程式經驗',
        ],
        correctAnswer: 1,
        explanation:
          'Vibe Coding 讓你用自然語言（甚至中文！）描述需求，Claude 會幫你轉化成程式碼。',
      },
    },
    nextScene: 'cc-1-2',
    points: 50,
  },

  'cc-1-2': {
    id: 'cc-1-2',
    level: 1,
    title: '第一次對話：Hello World',
    description: '用自然語言讓 Claude 幫你寫出第一個程式',
    type: 'interactive',
    content: {
      missionObjective: '請 Claude 幫你寫一個會顯示「Hello World」的程式',
      instructions: [
        '現在來試試你的第一次 Vibe Coding！',
        '在下方的模擬器中，輸入你的請求',
        '觀察 Claude 如何理解並回應你',
      ],
      promptTemplates: [
        {
          id: 'hello-basic',
          name: '基本請求',
          template: '幫我寫一個會顯示 Hello World 的程式',
          description: '最簡單的方式請求 Hello World',
        },
        {
          id: 'hello-detailed',
          name: '詳細請求',
          template:
            '請幫我用 JavaScript 寫一個程式，在網頁上顯示「Hello World」，要用漂亮的大字體',
          description: '更具體的請求，包含樣式要求',
        },
      ],
      simulatedOutput: {
        userInput: '幫我寫一個會顯示 Hello World 的程式',
        claudeResponse: `好的！我來幫你寫一個 Hello World 程式。

這是最經典的入門程式，我會用 HTML 和 JavaScript 來實現：`,
        codeOutput: `<!DOCTYPE html>
<html>
<head>
  <title>Hello World</title>
  <style>
    body {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      font-family: Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    h1 {
      color: white;
      font-size: 4rem;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }
  </style>
</head>
<body>
  <h1>Hello World!</h1>
</body>
</html>`,
        explanation:
          '看！只要一句話，Claude 就幫你寫出了一個漂亮的 Hello World 頁面，還加上了漸層背景和陰影效果！',
      },
      tips: [
        '不用擔心語法，用你習慣的方式說就好',
        '可以用中文或英文',
        '如果結果不滿意，可以要求修改',
      ],
    },
    previousScene: 'cc-1-1',
    nextScene: 'cc-1-3',
    points: 100,
    unlockCards: ['card-hello-world'],
  },

  'cc-1-3': {
    id: 'cc-1-3',
    level: 1,
    title: '觀察與學習：理解 AI 的回應',
    description: '學會如何閱讀和理解 Claude 產生的程式碼',
    type: 'tutorial',
    content: {
      missionObjective: '學會識別程式碼的基本結構：HTML、CSS、JavaScript',
      instructions: [
        'Claude 產生的程式碼通常包含三個部分',
        'HTML：定義網頁的結構（像房子的骨架）',
        'CSS：定義外觀樣式（像房子的裝潢）',
        'JavaScript：定義互動行為（像房子的電器）',
        '你不需要完全理解每一行，但要能認出這三個部分',
      ],
      example: `📦 HTML（結構）
<h1>Hello World</h1>
→ 這是一個大標題

🎨 CSS（樣式）
color: white;
font-size: 4rem;
→ 白色文字，超大字體

⚡ JavaScript（互動）
document.querySelector('button').onclick = function() { ... }
→ 當按鈕被點擊時執行某個動作`,
      quiz: {
        question: '「color: blue;」這段程式碼屬於哪個部分？',
        options: ['HTML（結構）', 'CSS（樣式）', 'JavaScript（互動）', '以上皆非'],
        correctAnswer: 1,
        explanation: 'color 是 CSS 屬性，用來設定顏色。CSS 負責所有外觀相關的設定！',
      },
      tips: [
        'HTML 標籤通常用 < > 包住',
        'CSS 通常是「屬性: 值;」的格式',
        'JavaScript 有很多 function 和 { }',
      ],
    },
    previousScene: 'cc-1-2',
    nextScene: 'cc-2-1',
    points: 100,
    unlockNPC: 'npc-code-cat',
  },
}

// =====================================================
// Level 2: 函式生成訓練
// =====================================================

const level2Scenes: Record<string, ClaudeCodeScene> = {
  'cc-2-1': {
    id: 'cc-2-1',
    level: 2,
    title: '描述函式功能',
    description: '學會如何清楚地向 Claude 描述你需要的功能',
    type: 'tutorial',
    content: {
      missionObjective: '掌握描述函式需求的技巧，讓 Claude 產生更精準的程式碼',
      instructions: [
        '函式是程式的基本單位，就像一台小機器',
        '輸入一些東西 → 處理 → 輸出結果',
        '好的描述應該包含：功能是什麼、輸入是什麼、輸出是什麼',
      ],
      promptTemplates: [
        {
          id: 'func-basic',
          name: '基本描述',
          template: '幫我寫一個計算兩個數字相加的函式',
          description: '簡單但可能不夠清楚',
        },
        {
          id: 'func-detailed',
          name: '完整描述',
          template:
            '幫我寫一個 JavaScript 函式，接受兩個數字參數，回傳它們的總和。如果輸入不是數字要回傳錯誤訊息。',
          description: '清楚指定輸入、輸出和錯誤處理',
        },
      ],
      example: `❌ 模糊的描述：
「幫我寫一個函式」
→ Claude 不知道你要什麼功能

✅ 清楚的描述：
「幫我寫一個函式，輸入使用者的生日（年月日），計算並回傳他們的年齡」
→ Claude 知道：輸入是生日，輸出是年齡，功能是計算`,
      tips: [
        '說明輸入：這個函式接收什麼？',
        '說明輸出：這個函式要回傳什麼？',
        '說明特殊情況：錯誤要怎麼處理？',
      ],
    },
    previousScene: 'cc-1-3',
    nextScene: 'cc-2-2',
    points: 100,
  },

  'cc-2-2': {
    id: 'cc-2-2',
    level: 2,
    title: '實戰：建立實用函式',
    description: '動手請 Claude 幫你寫出實用的函式',
    type: 'interactive',
    content: {
      missionObjective: '請 Claude 幫你寫一個計算 BMI 的函式',
      instructions: [
        '現在來實際練習！',
        'BMI = 體重(kg) / 身高(m)²',
        '試著用完整的描述請 Claude 幫你寫這個函式',
      ],
      promptTemplates: [
        {
          id: 'bmi-basic',
          name: '基本版',
          template: '幫我寫一個計算 BMI 的函式',
          description: '最簡單的請求',
        },
        {
          id: 'bmi-pro',
          name: '進階版',
          template:
            '幫我寫一個 JavaScript 函式計算 BMI，輸入體重（公斤）和身高（公分），回傳 BMI 值和健康狀態（過輕/正常/過重/肥胖）',
          description: '包含額外的健康狀態判斷',
        },
      ],
      simulatedOutput: {
        userInput:
          '幫我寫一個 JavaScript 函式計算 BMI，輸入體重（公斤）和身高（公分），回傳 BMI 值和健康狀態',
        claudeResponse: '好的！我來幫你寫一個完整的 BMI 計算函式，包含健康狀態判斷：',
        codeOutput: `function calculateBMI(weightKg, heightCm) {
  // 驗證輸入
  if (weightKg <= 0 || heightCm <= 0) {
    return { error: '體重和身高必須大於 0' };
  }

  // 將身高轉換為公尺
  const heightM = heightCm / 100;

  // 計算 BMI
  const bmi = weightKg / (heightM * heightM);
  const roundedBMI = Math.round(bmi * 10) / 10;

  // 判斷健康狀態
  let status;
  if (bmi < 18.5) {
    status = '過輕';
  } else if (bmi < 24) {
    status = '正常';
  } else if (bmi < 27) {
    status = '過重';
  } else {
    status = '肥胖';
  }

  return {
    bmi: roundedBMI,
    status: status,
    message: \`您的 BMI 是 \${roundedBMI}，屬於「\${status}」範圍\`
  };
}

// 使用範例
console.log(calculateBMI(70, 175));
// { bmi: 22.9, status: '正常', message: '您的 BMI 是 22.9，屬於「正常」範圍' }`,
        explanation:
          '看！Claude 不只寫了基本功能，還加上了輸入驗證、單位轉換、健康狀態判斷，甚至還有使用範例！',
      },
      tips: [
        '具體說明數值的單位',
        '描述期望的回傳格式',
        '提到需要處理的特殊情況',
      ],
    },
    previousScene: 'cc-2-1',
    nextScene: 'cc-2-3',
    points: 150,
    unlockCards: ['card-function-template'],
  },

  'cc-2-3': {
    id: 'cc-2-3',
    level: 2,
    title: '挑戰：最佳實踐版本',
    description: '學會要求 Claude 提供「最佳實踐」版本的程式碼',
    type: 'challenge',
    content: {
      missionObjective: '請 Claude 用最佳實踐改進你的函式',
      instructions: [
        '程式碼可以「能用」，也可以「好用」',
        '最佳實踐包含：錯誤處理、型別檢查、清楚的註解、優雅的結構',
        '你可以直接要求 Claude 提供最佳實踐版本！',
      ],
      requirements: [
        '請 Claude 改進 BMI 函式',
        '要求加入完整的錯誤處理',
        '要求加入 JSDoc 註解',
        '要求符合 Clean Code 原則',
      ],
      promptTemplates: [
        {
          id: 'best-practice',
          name: '最佳實踐請求',
          template:
            '請用 JavaScript 最佳實踐重寫這個 BMI 函式，包含：TypeScript 風格的 JSDoc 註解、完整的輸入驗證、清楚的錯誤訊息、單一職責原則',
          description: '直接要求專業級的程式碼品質',
        },
      ],
      starter: `// 你目前的 BMI 函式
function calculateBMI(weight, height) {
  return weight / (height * height);
}`,
      tips: [
        '直接說「用最佳實踐」',
        '可以指定要遵循的標準（如 Clean Code）',
        'Claude 會自動加上註解和文件',
      ],
    },
    previousScene: 'cc-2-2',
    nextScene: 'cc-3-1',
    points: 200,
    unlockNPC: 'npc-prompt-master',
  },
}

// =====================================================
// Level 3: 程式碼重構
// =====================================================

const level3Scenes: Record<string, ClaudeCodeScene> = {
  'cc-3-1': {
    id: 'cc-3-1',
    level: 3,
    title: '識別程式碼問題',
    description: '學會辨識需要重構的程式碼',
    type: 'tutorial',
    content: {
      missionObjective: '了解什麼是「Code Smell」，學會識別需要改進的程式碼',
      instructions: [
        'Code Smell 是指程式碼中的壞味道',
        '它不一定是 bug，但會讓程式難以維護',
        '常見的 Code Smell 包含：',
        '• 重複的程式碼',
        '• 過長的函式',
        '• 神秘的變數名稱',
        '• 過度嵌套的 if-else',
      ],
      example: `❌ 有問題的程式碼：
function calc(a, b, c) {
  if (c == 1) {
    return a + b;
  } else if (c == 2) {
    return a - b;
  } else if (c == 3) {
    return a * b;
  } else if (c == 4) {
    return a / b;
  }
}

問題在哪？
• calc 是什麼意思？
• a, b, c 代表什麼？
• c 的數字代表什麼操作？
• 沒有錯誤處理`,
      quiz: {
        question: '以下哪個是 Code Smell？',
        options: [
          '有清楚的註解',
          '變數命名為 x, y, z',
          '函式只做一件事',
          '有完整的錯誤處理',
        ],
        correctAnswer: 1,
        explanation:
          '變數命名為 x, y, z 是「神秘命名」的 Code Smell，讓人無法理解變數的用途。',
      },
      tips: [
        '如果你看不懂自己三個月前寫的程式碼，那就是 Code Smell',
        '如果一個函式超過 20 行，考慮拆分',
        '如果要複製貼上，考慮抽成函式',
      ],
    },
    previousScene: 'cc-2-3',
    nextScene: 'cc-3-2',
    points: 100,
  },

  'cc-3-2': {
    id: 'cc-3-2',
    level: 3,
    title: '請求重構',
    description: '學會如何請 Claude 幫你重構程式碼',
    type: 'interactive',
    content: {
      missionObjective: '用 Claude 重構一段混亂的程式碼',
      instructions: [
        '把有問題的程式碼貼給 Claude',
        '說明你想要改進什麼',
        'Claude 會幫你重寫成更好的版本',
      ],
      promptTemplates: [
        {
          id: 'refactor-basic',
          name: '基本重構',
          template: '請幫我重構這段程式碼，讓它更易讀',
          description: '簡單的重構請求',
        },
        {
          id: 'refactor-detailed',
          name: '詳細重構',
          template:
            '請重構這段程式碼：1. 使用有意義的變數名稱 2. 分離關注點 3. 加入錯誤處理 4. 加上註解說明',
          description: '指定具體的重構方向',
        },
      ],
      simulatedOutput: {
        userInput: `請幫我重構這段程式碼，讓它更易讀和可維護：

function calc(a, b, c) {
  if (c == 1) return a + b;
  else if (c == 2) return a - b;
  else if (c == 3) return a * b;
  else if (c == 4) return a / b;
}`,
        claudeResponse:
          '我來幫你重構這段計算機程式碼，讓它更清晰、可維護！',
        codeOutput: `/**
 * 計算器 - 執行基本數學運算
 */
const Calculator = {
  // 運算類型常數
  OPERATIONS: {
    ADD: 'add',
    SUBTRACT: 'subtract',
    MULTIPLY: 'multiply',
    DIVIDE: 'divide'
  },

  /**
   * 執行數學運算
   * @param {number} num1 - 第一個數字
   * @param {number} num2 - 第二個數字
   * @param {string} operation - 運算類型
   * @returns {number|string} 運算結果或錯誤訊息
   */
  calculate(num1, num2, operation) {
    // 驗證輸入
    if (typeof num1 !== 'number' || typeof num2 !== 'number') {
      return '錯誤：請輸入有效的數字';
    }

    // 執行對應的運算
    switch (operation) {
      case this.OPERATIONS.ADD:
        return num1 + num2;

      case this.OPERATIONS.SUBTRACT:
        return num1 - num2;

      case this.OPERATIONS.MULTIPLY:
        return num1 * num2;

      case this.OPERATIONS.DIVIDE:
        if (num2 === 0) {
          return '錯誤：不能除以零';
        }
        return num1 / num2;

      default:
        return '錯誤：未知的運算類型';
    }
  }
};

// 使用範例
Calculator.calculate(10, 5, Calculator.OPERATIONS.ADD);      // 15
Calculator.calculate(10, 5, Calculator.OPERATIONS.DIVIDE);   // 2`,
        explanation: `重構後的改進：
✅ 有意義的命名（Calculator, calculate, num1, num2）
✅ 使用常數定義運算類型
✅ 完整的輸入驗證
✅ 除以零的錯誤處理
✅ 清楚的 JSDoc 註解
✅ 使用 switch 取代多重 if-else`,
      },
      tips: [
        '先貼程式碼，再說明問題',
        '指定想要的改進方向',
        'Claude 通常會解釋改了什麼',
      ],
    },
    previousScene: 'cc-3-1',
    nextScene: 'cc-3-3',
    points: 150,
    unlockCards: ['card-refactor-template'],
  },

  'cc-3-3': {
    id: 'cc-3-3',
    level: 3,
    title: '挑戰：添加註解與文件',
    description: '讓 Claude 幫你的程式碼加上專業的文件',
    type: 'challenge',
    content: {
      missionObjective: '請 Claude 為一段程式碼添加完整的 JSDoc 註解',
      instructions: [
        '好的註解讓程式碼更容易理解',
        'JSDoc 是 JavaScript 的標準註解格式',
        '它可以描述函式的用途、參數和回傳值',
      ],
      requirements: [
        '提供一段沒有註解的程式碼',
        '請 Claude 加上 JSDoc 格式註解',
        '要包含：功能說明、參數說明、回傳值說明、使用範例',
      ],
      starter: `function formatDate(date, format) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day);
}`,
      tips: [
        '要求「JSDoc 格式」或「TSDoc 格式」',
        '可以要求包含 @example',
        '可以要求說明可能的錯誤情況',
      ],
    },
    previousScene: 'cc-3-2',
    nextScene: 'cc-4-1',
    points: 200,
    unlockNPC: 'npc-refactor-craftsman',
  },
}

// =====================================================
// Level 4: 除錯技巧
// =====================================================

const level4Scenes: Record<string, ClaudeCodeScene> = {
  'cc-4-1': {
    id: 'cc-4-1',
    level: 4,
    title: '複製錯誤訊息',
    description: '學會正確地向 Claude 描述程式錯誤',
    type: 'tutorial',
    content: {
      missionObjective: '了解如何有效地把錯誤訊息提供給 Claude',
      instructions: [
        '當程式出錯，Console 會顯示錯誤訊息',
        '這些訊息是 Claude 除錯的關鍵線索',
        '完整複製錯誤訊息，包含：',
        '• 錯誤類型（如 TypeError, ReferenceError）',
        '• 錯誤訊息內容',
        '• 發生錯誤的檔案和行數',
      ],
      example: `❌ 不好的描述：
「我的程式壞了」
「跑不動」
「出現紅字」

✅ 好的描述：
「執行時出現錯誤：
TypeError: Cannot read property 'map' of undefined
    at App.js:15:23

我的程式碼是：
const items = data.items.map(item => item.name);

我期望 data.items 是一個陣列」`,
      quiz: {
        question: '以下哪種錯誤描述最有幫助？',
        options: [
          '程式壞掉了，幫我看看',
          'console.log 沒有輸出',
          'TypeError: x is not a function at line 42，程式碼是：x()',
          '網頁一片空白',
        ],
        correctAnswer: 2,
        explanation:
          '提供錯誤類型、訊息和程式碼是最有效的描述，讓 Claude 能快速定位問題。',
      },
      tips: [
        '按 F12 打開瀏覽器的開發者工具',
        '切換到 Console 標籤查看錯誤',
        '錯誤訊息通常是紅色的',
      ],
    },
    previousScene: 'cc-3-3',
    nextScene: 'cc-4-2',
    points: 100,
  },

  'cc-4-2': {
    id: 'cc-4-2',
    level: 4,
    title: '描述預期行為',
    description: '說明程式應該做什麼 vs 實際做了什麼',
    type: 'interactive',
    content: {
      missionObjective: '學會用「預期 vs 實際」的格式描述 bug',
      instructions: [
        '除了錯誤訊息，Claude 還需要知道：',
        '1. 你期望程式做什麼？',
        '2. 程式實際做了什麼？',
        '3. 你做了什麼操作導致這個結果？',
      ],
      promptTemplates: [
        {
          id: 'debug-template',
          name: 'Bug 報告模板',
          template: `我遇到一個 bug：

【我做了什麼】
點擊「提交」按鈕

【預期結果】
表單資料應該被送出，顯示成功訊息

【實際結果】
沒有反應，Console 顯示：
TypeError: Cannot read property 'value' of null

【相關程式碼】
document.getElementById('email').value`,
          description: '完整的 bug 報告格式',
        },
      ],
      simulatedOutput: {
        userInput: `我遇到 bug：點擊按鈕沒反應
Console 顯示：TypeError: Cannot read property 'value' of null
程式碼：document.getElementById('emial').value`,
        claudeResponse: `我找到問題了！

問題出在 getElementById 的參數。你寫的是 'emial'，但應該是 'email'（少了一個 'l' 打成了 'i'）。

這是一個很常見的拼寫錯誤！當 getElementById 找不到對應的元素時，會回傳 null，然後你嘗試讀取 null 的 value 屬性就會報錯。`,
        codeOutput: `// ❌ 錯誤的寫法
document.getElementById('emial').value  // 'emial' 拼錯了

// ✅ 正確的寫法
document.getElementById('email').value  // 'email' 才對

// 💡 更安全的寫法（加上檢查）
const emailInput = document.getElementById('email');
if (emailInput) {
  const value = emailInput.value;
} else {
  console.error('找不到 email 輸入框');
}`,
        explanation:
          '看！Claude 不只找出了拼寫錯誤，還建議了更安全的寫法來避免類似問題。',
      },
      tips: [
        '提供重現步驟讓 Claude 理解情境',
        '說明預期結果和實際結果的差異',
        '附上相關的程式碼片段',
      ],
    },
    previousScene: 'cc-4-1',
    nextScene: 'cc-4-3',
    points: 150,
    unlockCards: ['card-debug-template'],
  },

  'cc-4-3': {
    id: 'cc-4-3',
    level: 4,
    title: '挑戰：修復真實 Bug',
    description: '實際練習使用 Claude 除錯',
    type: 'challenge',
    content: {
      missionObjective: '找出以下程式碼的 bug 並請 Claude 修復',
      instructions: [
        '以下是一段有 bug 的程式碼',
        '它應該要計算陣列中所有數字的總和',
        '但結果不正確',
        '請找出問題並請 Claude 修復',
      ],
      requirements: [
        '複製程式碼給 Claude',
        '描述預期結果（應該是 15）',
        '描述實際結果',
        '請 Claude 找出並修復 bug',
      ],
      starter: `function sumArray(numbers) {
  let total = 0;
  for (let i = 1; i <= numbers.length; i++) {
    total += numbers[i];
  }
  return total;
}

// 測試
const nums = [1, 2, 3, 4, 5];
console.log(sumArray(nums));  // 應該要是 15，但結果不對`,
      tips: [
        '仔細看 for 迴圈的起始值和結束條件',
        '陣列的索引是從 0 開始的',
        '把實際輸出結果也告訴 Claude',
      ],
    },
    previousScene: 'cc-4-2',
    nextScene: 'cc-5-1',
    points: 200,
    unlockNPC: 'npc-debug-sage',
  },
}

// =====================================================
// Level 5: 小型專案開發
// =====================================================

const level5Scenes: Record<string, ClaudeCodeScene> = {
  'cc-5-1': {
    id: 'cc-5-1',
    level: 5,
    title: '規劃專案架構',
    description: '學會如何向 Claude 描述一個完整專案',
    type: 'tutorial',
    content: {
      missionObjective: '學會用系統化的方式規劃專案需求',
      instructions: [
        '做專案之前，先想清楚：',
        '1. 這個專案要解決什麼問題？',
        '2. 主要功能有哪些？',
        '3. 使用者會怎麼操作？',
        '把這些告訴 Claude，它會幫你規劃架構',
      ],
      example: `專案規劃範例：待辦事項 App

【解決問題】
幫助使用者管理日常待辦事項

【主要功能】
1. 新增待辦事項
2. 標記完成
3. 刪除事項
4. 清除已完成

【使用者操作流程】
1. 在輸入框輸入事項
2. 按 Enter 或點擊按鈕新增
3. 點擊事項可以標記完成
4. 滑鼠移到事項上顯示刪除按鈕`,
      tips: [
        '從使用者角度思考功能',
        '先列出核心功能，再考慮附加功能',
        '每個功能都要能清楚描述',
      ],
    },
    previousScene: 'cc-4-3',
    nextScene: 'cc-5-2',
    points: 100,
  },

  'cc-5-2': {
    id: 'cc-5-2',
    level: 5,
    title: '逐步實作功能',
    description: '一步一步請 Claude 完成每個功能',
    type: 'interactive',
    content: {
      missionObjective: '用迭代方式完成待辦事項 App',
      instructions: [
        '不要一次要求所有功能',
        '分階段請 Claude 幫你實作',
        '每完成一個功能就測試',
      ],
      promptTemplates: [
        {
          id: 'todo-step1',
          name: '第一步：基本架構',
          template: '幫我建立一個待辦事項 App 的基本 HTML 結構，包含標題、輸入框和待辦清單區域',
          description: '先建立基本框架',
        },
        {
          id: 'todo-step2',
          name: '第二步：新增功能',
          template: '在上面的基礎上，加入新增待辦事項的 JavaScript 功能',
          description: '加入核心功能',
        },
        {
          id: 'todo-step3',
          name: '第三步：完成功能',
          template: '加入點擊事項可以標記完成的功能，完成的事項要有刪除線',
          description: '加入完成標記',
        },
      ],
      simulatedOutput: {
        userInput: '幫我建立一個待辦事項 App 的基本 HTML 結構',
        claudeResponse: '好的！我先幫你建立基本的 HTML 結構：',
        codeOutput: `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <title>待辦事項 App</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Noto Sans TC', sans-serif;
      max-width: 500px;
      margin: 50px auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      text-align: center;
      color: #333;
    }
    .input-group {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }
    input {
      flex: 1;
      padding: 12px;
      border: 2px solid #ddd;
      border-radius: 6px;
      font-size: 16px;
    }
    button {
      padding: 12px 24px;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 16px;
    }
    button:hover { background: #45a049; }
    #todoList {
      list-style: none;
      padding: 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>待辦事項</h1>
    <div class="input-group">
      <input type="text" id="todoInput" placeholder="輸入待辦事項...">
      <button id="addBtn">新增</button>
    </div>
    <ul id="todoList">
      <!-- 待辦事項會顯示在這裡 -->
    </ul>
  </div>
</body>
</html>`,
        explanation: '基本架構完成！接下來我們可以加入 JavaScript 讓它真正能運作。',
      },
      tips: [
        '每一步都要測試確認可以運作',
        '遇到問題立即修復再繼續',
        '可以隨時調整之前的程式碼',
      ],
    },
    previousScene: 'cc-5-1',
    nextScene: 'cc-5-3',
    points: 150,
    unlockCards: ['card-project-planning'],
  },

  'cc-5-3': {
    id: 'cc-5-3',
    level: 5,
    title: '挑戰：完成完整專案',
    description: '整合所有功能，完成待辦事項 App',
    type: 'challenge',
    content: {
      missionObjective: '請 Claude 幫你完成一個功能完整的待辦事項 App',
      instructions: [
        '綜合前面學到的技巧',
        '完成一個具備以下功能的待辦事項 App',
      ],
      requirements: [
        '可以新增待辦事項',
        '可以標記完成（顯示刪除線）',
        '可以刪除單一事項',
        '可以清除所有已完成事項',
        '資料要能保存在瀏覽器中（localStorage）',
      ],
      tips: [
        '可以要求 Claude 一次完成所有功能',
        '或分步驟逐一實作',
        '記得要求加入 localStorage 保存功能',
      ],
    },
    previousScene: 'cc-5-2',
    nextScene: 'cc-6-1',
    points: 300,
    unlockNPC: 'npc-project-master',
  },
}

// =====================================================
// Level 5.5 (Bonus): 快速架環境
// =====================================================

const level5BonusScenes: Record<string, ClaudeCodeScene> = {
  'cc-5-bonus-1': {
    id: 'cc-5-bonus-1',
    level: 5,
    title: '🚀 超能力：用 Claude 快速架環境',
    description: '學會用 Claude Code 快速從 GitHub Clone 專案並跑起來',
    type: 'tutorial',
    content: {
      missionObjective: '掌握用 Claude Code 快速架設任何專案環境的技巧',
      instructions: [
        '這是 Claude Code 最強大的功能之一！',
        '當你看到一個有趣的 GitHub 專案，想要快速跑起來：',
        '',
        '傳統方式：',
        '1. 閱讀 README（可能是英文）',
        '2. 安裝各種依賴',
        '3. 設定環境變數',
        '4. 解決版本衝突...',
        '5. 花費 30 分鐘到數小時',
        '',
        'Claude Code 方式：',
        '1. 給 Claude 一個 GitHub URL',
        '2. Claude 自動分析、Clone、安裝、啟動',
        '3. 幾分鐘搞定！',
      ],
      example: `實際對話範例：

你：幫我 clone 這個專案並跑起來
https://github.com/someone/cool-project

Claude：好的！讓我幫你處理...

正在 clone 專案...
✅ Clone 完成

分析 package.json...
發現這是一個 React + Vite 專案
需要 Node.js 18+

正在安裝依賴...
✅ npm install 完成

檢查環境設定...
發現需要 .env 檔案
已自動建立 .env（使用預設值）

正在啟動開發伺服器...
✅ 專案已在 http://localhost:5173 啟動

【專案說明】
這是一個 XXX 功能的應用...`,
      tips: [
        '直接貼 GitHub URL 給 Claude',
        'Claude 會自動讀 README 和 package.json',
        '如果需要 API Key，Claude 會告訴你',
        '遇到錯誤 Claude 也會自動修復',
      ],
    },
    previousScene: 'cc-5-3',
    nextScene: 'cc-5-bonus-2',
    points: 150,
  },

  'cc-5-bonus-2': {
    id: 'cc-5-bonus-2',
    level: 5,
    title: '實戰：Clone 並分析專案',
    description: '練習用 Claude Code 分析陌生的程式碼庫',
    type: 'interactive',
    content: {
      missionObjective: '學會讓 Claude 幫你理解陌生的專案結構',
      instructions: [
        '除了架環境，Claude 還能幫你快速理解程式碼！',
        '',
        '常用的分析指令：',
      ],
      promptTemplates: [
        {
          id: 'clone-and-run',
          name: 'Clone 並啟動',
          template: '幫我 clone 這個專案並跑起來：[GitHub URL]',
          description: '最簡單的方式，Claude 會自動處理一切',
        },
        {
          id: 'analyze-structure',
          name: '分析專案結構',
          template: '分析這個專案的架構，告訴我主要的檔案和功能模組',
          description: '快速了解專案組成',
        },
        {
          id: 'find-entry',
          name: '找到入口點',
          template: '這個專案的入口點在哪？主要邏輯從哪裡開始？',
          description: '找到程式碼的起點',
        },
        {
          id: 'explain-flow',
          name: '解釋流程',
          template: '解釋這個專案的資料流程，從使用者操作到資料處理',
          description: '理解程式如何運作',
        },
      ],
      simulatedOutput: {
        userInput: '幫我 clone 這個專案並告訴我怎麼跑：https://github.com/example/todo-app',
        claudeResponse: `好的！讓我幫你處理這個專案。

**正在執行...**
\`\`\`bash
git clone https://github.com/example/todo-app
cd todo-app
\`\`\`

**專案分析結果：**

📁 **專案類型**: React + TypeScript + Vite
📦 **套件管理**: npm (發現 package-lock.json)
🔧 **Node 版本**: 需要 18.0+

**檔案結構：**
\`\`\`
todo-app/
├── src/
│   ├── App.tsx          # 主要組件
│   ├── components/      # UI 組件
│   ├── hooks/           # 自定義 Hooks
│   └── store/           # 狀態管理
├── package.json
└── vite.config.ts
\`\`\`

**啟動步驟：**
\`\`\`bash
npm install    # 安裝依賴
npm run dev    # 啟動開發伺服器
\`\`\`

已自動執行上述指令...
✅ 專案已在 http://localhost:5173 啟動！

**這個專案的功能：**
這是一個待辦事項 App，支援：
- 新增/刪除待辦事項
- 標記完成狀態
- 本地儲存 (localStorage)`,
        explanation: '看！Claude 不只幫你架好環境，還分析了整個專案結構，讓你立刻知道這是什麼、怎麼用！',
      },
      tips: [
        'Clone 後可以繼續問 Claude 關於程式碼的問題',
        'Claude 可以解釋任何你不懂的程式碼',
        '想修改功能？直接告訴 Claude 你想改什麼',
      ],
    },
    previousScene: 'cc-5-bonus-1',
    nextScene: 'cc-5-bonus-3',
    points: 200,
    unlockCards: ['card-quick-setup'],
  },

  'cc-5-bonus-3': {
    id: 'cc-5-bonus-3',
    level: 5,
    title: '進階技巧：環境問題排解',
    description: '當環境出問題時，讓 Claude 幫你解決',
    type: 'challenge',
    content: {
      missionObjective: '學會用 Claude 解決常見的環境設定問題',
      instructions: [
        '架環境時常遇到的問題：',
        '• Node 版本不對',
        '• 缺少系統依賴',
        '• Port 被佔用',
        '• 環境變數沒設定',
        '',
        'Claude 都能幫你解決！',
      ],
      requirements: [
        '學會描述環境錯誤給 Claude',
        '讓 Claude 自動修復問題',
        '了解常見問題的解決方式',
      ],
      promptTemplates: [
        {
          id: 'fix-error',
          name: '修復錯誤',
          template: `npm install 時出現這個錯誤：
[貼上錯誤訊息]
請幫我解決`,
          description: '讓 Claude 分析並修復安裝錯誤',
        },
        {
          id: 'check-requirements',
          name: '檢查需求',
          template: '這個專案需要什麼環境？我的電腦少了什麼？',
          description: '讓 Claude 檢查環境需求',
        },
        {
          id: 'port-conflict',
          name: 'Port 衝突',
          template: '3000 port 被佔用了，怎麼辦？',
          description: '解決 port 衝突問題',
        },
      ],
      example: `常見問題解決範例：

❌ 問題：npm install 失敗
你：npm install 出現 ERESOLVE 錯誤

Claude：這是依賴版本衝突，讓我幫你解決：
\`\`\`bash
npm install --legacy-peer-deps
\`\`\`
已修復！

❌ 問題：Node 版本太舊
你：出現 SyntaxError: Unexpected token '?'

Claude：這表示 Node.js 版本太舊，需要升級：
\`\`\`bash
nvm install 20
nvm use 20
npm install
\`\`\`

❌ 問題：缺少環境變數
你：啟動時出現 "API_KEY is not defined"

Claude：這個專案需要 API Key。讓我幫你：
1. 建立 .env 檔案
2. 加入 API_KEY=your_key_here
（如果是測試用，我可以先用假的值讓專案跑起來）`,
      tips: [
        '直接貼錯誤訊息給 Claude',
        'Claude 會解釋問題原因',
        '大部分問題 Claude 都能自動修復',
        '不確定的話，讓 Claude 檢查整個環境',
      ],
    },
    previousScene: 'cc-5-bonus-2',
    nextScene: 'cc-6-1',
    points: 250,
  },
}

// =====================================================
// Level 6 (Boss): 完整專案構建
// =====================================================

const level6Scenes: Record<string, ClaudeCodeScene> = {
  'cc-6-1': {
    id: 'cc-6-1',
    level: 6,
    title: 'Boss 關卡：需求分析',
    description: '從零開始規劃一個完整專案',
    type: 'boss',
    content: {
      missionObjective: '選擇一個專案主題，進行完整的需求分析',
      instructions: [
        '歡迎來到最終挑戰！',
        '你將獨立完成一個完整的網頁專案',
        '可選擇的專案類型：',
        '• 個人記帳本',
        '• 天氣查詢 App',
        '• 番茄鐘計時器',
        '• 隨機名言產生器',
      ],
      example: `需求分析範例：個人記帳本

【目標使用者】
想要追蹤日常開銷的個人

【核心問題】
不知道錢花到哪裡去了

【主要功能】
1. 記錄收入/支出
2. 分類管理（餐飲、交通、娛樂等）
3. 查看統計圖表
4. 匯出報表

【技術需求】
- 前端：HTML + CSS + JavaScript
- 資料儲存：localStorage
- 圖表：Chart.js（可選）`,
      tips: [
        '選擇你真正有興趣的主題',
        '先列出核心功能，不要貪多',
        '考慮使用者的實際使用情境',
      ],
    },
    previousScene: 'cc-5-3',
    nextScene: 'cc-6-2',
    points: 200,
  },

  'cc-6-2': {
    id: 'cc-6-2',
    level: 6,
    title: 'Boss 關卡：架構設計',
    description: '請 Claude 幫你設計專案架構',
    type: 'boss',
    content: {
      missionObjective: '與 Claude 協作，設計專案的技術架構',
      instructions: [
        '把你的需求分析告訴 Claude',
        '請它幫你設計：',
        '• 檔案結構',
        '• 資料格式',
        '• 功能模組',
      ],
      promptTemplates: [
        {
          id: 'architecture-request',
          name: '架構設計請求',
          template: `我要做一個 [專案名稱]，功能包括：
1. [功能1]
2. [功能2]
3. [功能3]

請幫我設計：
- 建議的檔案結構
- 資料要怎麼存（格式和結構）
- 主要的功能模組劃分`,
          description: '請求完整的架構設計',
        },
      ],
      tips: [
        '讓 Claude 解釋每個設計決策的原因',
        '如果不懂可以追問',
        '架構可以隨著開發調整',
      ],
    },
    previousScene: 'cc-6-1',
    nextScene: 'cc-6-3',
    points: 250,
  },

  'cc-6-3': {
    id: 'cc-6-3',
    level: 6,
    title: 'Boss 關卡：實作與完成',
    description: '完成你的專案並慶祝！',
    type: 'boss',
    content: {
      missionObjective: '根據設計，與 Claude 協作完成專案',
      instructions: [
        '按照架構設計，分階段實作：',
        '階段 1：基本 UI 和結構',
        '階段 2：核心功能實作',
        '階段 3：資料儲存功能',
        '階段 4：優化和美化',
      ],
      requirements: [
        '完成所有核心功能',
        '程式碼有適當的註解',
        '介面美觀易用',
        '資料可以保存',
      ],
      tips: [
        '遇到困難就問 Claude',
        '每完成一個階段就測試',
        '不完美沒關係，完成比完美更重要',
        '這是你的作品，為自己感到驕傲！',
      ],
    },
    previousScene: 'cc-6-2',
    nextScene: 'cc-completion',
    points: 500,
  },

  'cc-completion': {
    id: 'cc-completion',
    level: 6,
    title: '恭喜成為 Vibe Coding 大師！',
    description: '你已經掌握了用 AI 寫程式的超能力',
    type: 'tutorial',
    content: {
      missionObjective: '回顧你的學習旅程',
      instructions: [
        '🎉 恭喜你完成 Claude Code Adventure！',
        '',
        '你已經學會了：',
        '✅ 用自然語言向 AI 描述需求',
        '✅ 請 AI 生成函式和程式碼',
        '✅ 重構和優化程式碼',
        '✅ 有效地除錯和解決問題',
        '✅ 規劃和完成完整專案',
        '',
        '你現在是一位 Vibe Coding 大師了！',
        '繼續創造，繼續探索，繼續成長！',
      ],
      tips: [
        '持續練習，技能會越來越強',
        '嘗試更複雜的專案',
        '分享你的作品和經驗',
        '幫助其他學習者',
      ],
    },
    previousScene: 'cc-6-3',
    points: 0,
  },
}

// =====================================================
// 匯出所有場景
// =====================================================

export const claudeCodeScenes: Record<string, ClaudeCodeScene> = {
  ...level1Scenes,
  ...level2Scenes,
  ...level3Scenes,
  ...level4Scenes,
  ...level5Scenes,
  ...level5BonusScenes,
  ...level6Scenes,
}

// 取得關卡資訊
export const claudeCodeLevels = [
  {
    level: 1,
    title: '認識 Vibe Coding',
    description: '了解用自然語言寫程式的革命性方法',
    icon: '🌟',
    scenes: ['cc-1-1', 'cc-1-2', 'cc-1-3'],
    badge: 'Vibe Coding 新手',
  },
  {
    level: 2,
    title: '函式生成訓練',
    description: '學會描述 function 需求',
    icon: '⚡',
    scenes: ['cc-2-1', 'cc-2-2', 'cc-2-3'],
    badge: '函式大師',
  },
  {
    level: 3,
    title: '程式碼重構',
    description: '使用 Claude 重寫程式碼',
    icon: '🔧',
    scenes: ['cc-3-1', 'cc-3-2', 'cc-3-3'],
    badge: 'Refactor 工匠',
  },
  {
    level: 4,
    title: '除錯技巧',
    description: '學會描述 bug 給 Claude',
    icon: '🐛',
    scenes: ['cc-4-1', 'cc-4-2', 'cc-4-3'],
    badge: 'Debug 仙人',
  },
  {
    level: 5,
    title: '小型專案開發',
    description: '完成 Todo App 並學會快速架環境',
    icon: '🚀',
    scenes: ['cc-5-1', 'cc-5-2', 'cc-5-3', 'cc-5-bonus-1', 'cc-5-bonus-2', 'cc-5-bonus-3'],
    badge: '專案建造者',
  },
  {
    level: 6,
    title: '完整專案構建',
    description: '獨立完成專案',
    icon: '👑',
    scenes: ['cc-6-1', 'cc-6-2', 'cc-6-3', 'cc-completion'],
    badge: 'Vibe Coding 大師',
    isBoss: true,
  },
]
