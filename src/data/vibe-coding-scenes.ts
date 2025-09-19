// Vibe Coding 課程 - 整合 Git、Cursor、Claude Code

export interface Scene {
  id: string;
  title: string;
  description: string;
  type: 'tutorial' | 'challenge' | 'interactive' | 'setup';
  content: any;
  nextScene?: string;
  previousScene?: string;
  points: number;
}

export const vibeCodingScenes: Record<string, Scene> = {
  'intro': {
    id: 'intro',
    title: '🚀 Vibe Coding 三大神器',
    description: '認識 Git、Cursor 和 Claude Code',
    type: 'tutorial',
    content: {
      instructions: [
        '👋 歡迎來到 Vibe Coding 的世界！',
        '你不需要學複雜的程式語法',
        '只需要掌握三個強大的工具：',
        '',
        '📝 **Cursor** - AI 優先的程式編輯器',
        '🤖 **Claude Code** - 最強大的 AI 編程助手',
        '📦 **Git** - 保存你的每一步進度',
      ],
      overview: `Vibe Coding 三大工具：

📝 **Cursor 編輯器**
• 內建 AI 助手（GPT-4、Claude）
• Cmd+K 直接修改程式碼
• Cmd+L 開啟 AI 對話
• @ 符號引用檔案給 AI

🤖 **Claude Code**
• Anthropic 官方 VS Code 擴充套件
• 理解整個專案的上下文
• 提供智慧建議和程式碼生成
• 可以重構和優化程式碼

📦 **Git 版本控制**
• 保存每次修改的歷史
• 隨時回到之前的版本
• 與團隊協作開發
• 像遊戲存檔一樣簡單`,
      tips: [
        '💡 這三個工具組合就是你的超能力',
        '💡 不需要記程式語法，只要會描述',
        '💡 AI 是你的程式設計師，你是創意總監',
      ],
    },
    nextScene: 'cursor-setup',
    points: 100,
  },

  'cursor-setup': {
    id: 'cursor-setup',
    title: '第一章：安裝 Cursor 編輯器',
    description: '設置你的 AI 程式編輯器',
    type: 'setup',
    content: {
      instructions: [
        '讓我們開始安裝 Cursor！',
        'Cursor 是專為 AI 設計的程式編輯器',
        '它內建了強大的 AI 功能',
      ],
      steps: `安裝 Cursor 步驟：

1️⃣ **下載 Cursor**
• 前往 https://cursor.sh
• 點擊 Download
• 選擇你的作業系統版本

2️⃣ **安裝設定**
• 執行下載的安裝檔
• 選擇安裝位置
• 完成安裝

3️⃣ **首次啟動**
• 開啟 Cursor
• 登入或註冊帳號
• 選擇 AI 模型（可用免費版）

4️⃣ **基本設定**
• 選擇主題（深色/淺色）
• 設定字體大小
• 安裝中文語言包（選擇性）`,
      shortcuts: `Cursor 必學快捷鍵：

⌨️ **Cmd+K（編輯模式）**
• 選擇程式碼
• 按 Cmd+K
• 輸入指令（例：「改成 TypeScript」）
• AI 直接修改選中的程式碼

💬 **Cmd+L（對話模式）**
• 按 Cmd+L 開啟聊天
• 問問題（例：「這段程式在做什麼？」）
• AI 會解釋並提供建議

📎 **@ 引用檔案**
• 在對話中輸入 @
• 選擇要引用的檔案
• AI 會參考這些檔案內容

🔄 **Cmd+Shift+K（生成程式碼）**
• 在空白處按 Cmd+Shift+K
• 描述你要的功能
• AI 生成完整程式碼`,
      tips: [
        '💡 免費版每月有使用限制但足夠學習',
        '💡 可以同時使用多個 AI 模型',
        '💡 支援所有主流程式語言',
      ],
    },
    nextScene: 'cursor-practice',
    previousScene: 'intro',
    points: 150,
  },

  'cursor-practice': {
    id: 'cursor-practice',
    title: '第二章：Cursor AI 功能實戰',
    description: '練習使用 Cursor 的 AI 功能',
    type: 'challenge',
    content: {
      task: '用 Cursor 的 AI 功能完成你的第一個程式',
      requirements: [
        '📝 使用 Cmd+K 生成一個 HTML 頁面',
        '📝 使用 Cmd+L 詢問如何加入 CSS 樣式',
        '📝 使用 @ 引用檔案並請 AI 改進',
      ],
      practice: `Cursor 實戰練習：

練習 1：生成基礎程式
1. 新建檔案 index.html
2. 按 Cmd+K
3. 輸入：「創建一個簡單的個人介紹網頁」
4. 看 AI 生成程式碼

練習 2：修改程式碼
1. 選擇標題部分
2. 按 Cmd+K
3. 輸入：「把標題改成漸層色」
4. AI 會修改選中的部分

練習 3：詢問建議
1. 按 Cmd+L 開啟對話
2. 問：「如何讓這個網頁支援手機瀏覽？」
3. AI 會提供詳細建議

練習 4：引用檔案
1. 在對話中輸入 @index.html
2. 問：「幫我優化這個檔案的結構」
3. AI 會根據檔案內容給建議`,
      examples: `常用的 Cursor 提示詞：

✨ 生成程式碼：
• 「創建一個待辦清單應用」
• 「做一個計算機介面」
• 「生成一個登入表單」

🔧 修改程式碼：
• 「改成深色主題」
• 「加上動畫效果」
• 「優化這段程式碼」

❓ 詢問問題：
• 「這個函式在做什麼？」
• 「有什麼 bug 嗎？」
• 「如何改進效能？」`,
      tips: [
        '💡 描述越具體，AI 生成越準確',
        '💡 可以多次迭代改進',
        '💡 善用 @ 引用相關檔案',
      ],
    },
    nextScene: 'claude-code-setup',
    previousScene: 'cursor-setup',
    points: 200,
  },

  'claude-code-setup': {
    id: 'claude-code-setup',
    title: '第三章：安裝 Claude Code',
    description: 'VS Code 中的 Claude AI 助手',
    type: 'setup',
    content: {
      instructions: [
        'Claude Code 是 Anthropic 的官方擴充套件',
        '它能理解整個專案的上下文',
        '提供更智慧的程式碼建議',
      ],
      steps: `安裝 Claude Code：

1️⃣ **在 VS Code 中安裝**
• 開啟 VS Code
• 按 Cmd+Shift+X 開啟 Extensions
• 搜尋「Claude Code」
• 點擊 Install

2️⃣ **取得 API Key**
• 前往 https://claude.ai
• 註冊或登入帳號
• 前往 API Settings
• 生成 API Key

3️⃣ **設定 API Key**
• 在 VS Code 按 Cmd+Shift+P
• 輸入「Claude: Set API Key」
• 貼上你的 API Key

4️⃣ **開始使用**
• 按 Cmd+Shift+P
• 輸入「Claude: Chat」
• 開始與 Claude 對話`,
      features: `Claude Code 強大功能：

🧠 **專案理解**
• 自動分析整個專案結構
• 理解檔案之間的關係
• 提供符合專案風格的建議

💡 **智慧建議**
• 自動完成程式碼
• 偵測潛在問題
• 提供最佳實踐建議

🔨 **程式碼重構**
• 優化程式碼結構
• 改善可讀性
• 提升效能

🐛 **除錯助手**
• 解釋錯誤訊息
• 找出 bug 原因
• 提供修復方案`,
      comparison: `Cursor vs Claude Code：

**Cursor**
• 獨立的編輯器
• 內建多種 AI 模型
• 快捷鍵操作方便
• 適合快速編輯

**Claude Code**
• VS Code 擴充套件
• 專注於 Claude AI
• 深度專案理解
• 適合複雜專案

💡 建議：兩個都用！
• 用 Cursor 快速生成和編輯
• 用 Claude Code 深度分析和優化`,
      tips: [
        '💡 免費 API 有使用限制',
        '💡 可以同時使用 Cursor 和 Claude Code',
        '💡 適合處理複雜的程式邏輯',
      ],
    },
    nextScene: 'git-basics',
    previousScene: 'cursor-practice',
    points: 150,
  },

  'git-basics': {
    id: 'git-basics',
    title: '第四章：Git 基礎 - 保存你的進度',
    description: '學習版本控制的基本概念',
    type: 'tutorial',
    content: {
      instructions: [
        'Git 就像遊戲的存檔系統',
        '每次修改都可以保存一個版本',
        '隨時可以回到之前的版本',
      ],
      concepts: `Git 核心概念：

🎮 **想像成遊戲存檔**
• Repository（倉庫）= 遊戲資料夾
• Commit（提交）= 存檔點
• Branch（分支）= 不同的遊戲路線
• Merge（合併）= 合併不同路線

📦 **基本流程**
1. 修改檔案（玩遊戲）
2. git add（選擇要存的進度）
3. git commit（存檔）
4. git push（上傳到雲端）`,
      commands: `必學的 Git 指令：

🔰 **初始化**
git init
→ 開始追蹤這個資料夾

➕ **加入修改**
git add .
→ 把所有修改加入暫存區

💾 **存檔（提交）**
git commit -m "說明文字"
→ 保存這次的修改

🔍 **查看狀態**
git status
→ 看看有什麼檔案被修改

📜 **查看歷史**
git log --oneline
→ 看所有的存檔記錄

↩️ **回到之前版本**
git checkout [commit-id]
→ 回到特定的存檔點`,
      vscode_integration: `在 VS Code/Cursor 中使用 Git：

🎯 **圖形化介面**
• 按 Cmd+Shift+G 開啟 Source Control
• 可以看到所有修改的檔案
• 點擊 + 加入暫存區
• 輸入訊息後按 ✓ 提交

🌟 **更直覺的操作**
• 綠色 = 新增的內容
• 紅色 = 刪除的內容
• 藍色 = 修改的內容

💡 **配合 AI 使用**
• 請 AI 幫你寫 commit 訊息
• 例：「幫我寫這次修改的 commit 訊息」`,
      tips: [
        '💡 養成經常 commit 的習慣',
        '💡 commit 訊息要清楚描述改了什麼',
        '💡 使用圖形介面更容易上手',
      ],
    },
    nextScene: 'prompt-engineering',
    previousScene: 'claude-code-setup',
    points: 200,
  },

  'prompt-engineering': {
    id: 'prompt-engineering',
    title: '第五章：提示詞的藝術',
    description: '寫出更好的 AI 提示詞',
    type: 'tutorial',
    content: {
      instructions: [
        '好的提示詞 = 好的程式碼',
        '學習如何清楚地描述需求',
        '掌握與 AI 溝通的技巧',
      ],
      principles: `提示詞黃金法則：

1️⃣ **要具體**
❌ 模糊：「做一個網站」
✅ 具體：「做一個展示產品的電商網站，要有購物車功能」

2️⃣ **給背景**
❌ 沒背景：「寫一個函式」
✅ 有背景：「我在做記帳APP，需要計算月支出的函式」

3️⃣ **說限制**
❌ 無限制：「優化程式碼」
✅ 有限制：「優化載入速度，目標是2秒內」

4️⃣ **分階段**
❌ 一次全要：「做完整的社交網站」
✅ 分階段：「先做登入功能，再加好友系統」`,
      templates: `實用提示詞模板：

📝 **基礎模板**
「我想做一個 [應用類型]
主要功能：
1. [功能1]
2. [功能2]
使用者：[目標用戶]
風格：[視覺風格]」

🎯 **除錯模板**
「問題：[發生什麼事]
預期：[應該怎樣]
錯誤：[錯誤訊息]
已試：[試過的方法]」

🚀 **優化模板**
「請優化這段程式碼
目標：[優化目標]
限制：[技術限制]
保留：[要保留的功能]」

🎨 **設計模板**
「設計一個 [介面類型]
風格：[視覺風格]
色彩：[顏色方案]
裝置：[響應式需求]」`,
      examples: `實際範例對比：

❌ **差的提示詞**
「幫我寫程式」
「修bug」
「做網站」

✅ **好的提示詞**
「幫我寫一個 React 的待辦清單元件，要能新增、刪除、標記完成」
「按鈕點擊沒反應，Console 顯示 'undefined'，應該要彈出提示」
「做一個個人作品集網站，展示設計作品，要響應式設計」

🌟 **進階提示詞**
「你是資深前端工程師，請用 Vue 3 和 TypeScript 寫一個可重用的表單驗證元件，要支援自訂規則」`,
      tips: [
        '💡 從簡單開始，逐步增加複雜度',
        '💡 提供範例有助於 AI 理解',
        '💡 不要怕問太多，AI 不會累',
      ],
    },
    nextScene: 'iterative-development',
    previousScene: 'git-basics',
    points: 200,
  },

  'iterative-development': {
    id: 'iterative-development',
    title: '第六章：迭代開發工作流',
    description: '用 AI 工具逐步完善程式',
    type: 'tutorial',
    content: {
      instructions: [
        '程式很少一次就完美',
        '學習迭代開發的流程',
        '結合三大工具的威力',
      ],
      workflow: `完整的 Vibe Coding 工作流：

🔄 **迭代開發循環**

1️⃣ **構思階段**（Cursor）
• Cmd+K：「做一個 [基本功能]」
• 生成初始版本

2️⃣ **測試階段**
• 在瀏覽器測試
• 找出問題和不足

3️⃣ **改進階段**（Cursor + Claude）
• Cmd+K：「加入 [新功能]」
• Cmd+L：詢問改進建議
• Claude Code：深度優化

4️⃣ **保存階段**（Git）
• git add .
• git commit -m "完成 [功能]"

5️⃣ **重複循環**
• 回到步驟 1
• 持續改進`,
      example_project: `實戰案例：待辦清單 App

🚀 **第一輪：基本功能**
Cursor Cmd+K：
「創建待辦清單，可以新增項目」
Git：commit -m "初始版本"

🚀 **第二輪：刪除功能**
Cursor Cmd+K：
「每個項目加刪除按鈕」
Git：commit -m "加入刪除功能"

🚀 **第三輪：完成狀態**
Cursor Cmd+K：
「加入 checkbox 標記完成」
Git：commit -m "加入完成狀態"

🚀 **第四輪：美化介面**
Claude Code：
「優化 UI 設計，使用現代風格」
Git：commit -m "美化介面"

🚀 **第五輪：本地儲存**
Cursor Cmd+L：
「如何保存資料到 localStorage？」
實作建議
Git：commit -m "加入本地儲存"`,
      best_practices: `最佳實踐：

✅ **Do's（要做）**
• 每個功能都 commit
• 經常測試
• 保持程式碼簡單
• 記錄重要決定

❌ **Don'ts（不要）**
• 一次改太多東西
• 忽略錯誤訊息
• 不測試就 commit
• 刪除可能有用的程式碼

🎯 **黃金原則**
• Make it work（先能動）
• Make it right（再正確）
• Make it fast（最後優化）`,
      tips: [
        '💡 小步快跑，頻繁提交',
        '💡 每次只專注一個改進',
        '💡 善用 AI 的建議但要測試',
      ],
    },
    nextScene: 'debugging',
    previousScene: 'prompt-engineering',
    points: 250,
  },

  'debugging': {
    id: 'debugging',
    title: '第七章：用 AI 除錯',
    description: '快速找出並修復問題',
    type: 'tutorial',
    content: {
      instructions: [
        '錯誤是學習的機會',
        '學習如何描述問題',
        'AI 是你的除錯夥伴',
      ],
      debugging_process: `AI 除錯流程：

🔍 **步驟一：收集資訊**
1. 打開瀏覽器 Console（F12）
2. 截圖錯誤訊息
3. 記錄操作步驟

🤖 **步驟二：詢問 AI**
Cursor Cmd+L 或 Claude Code：
「錯誤：[貼上錯誤訊息]
操作：[描述你做了什麼]
預期：[應該發生什麼]
實際：[實際發生什麼]」

🔧 **步驟三：應用修復**
1. AI 提供解決方案
2. Cmd+K 直接修改
3. 測試是否解決

✅ **步驟四：確認修復**
1. 重現原始問題步驟
2. 確認已經修復
3. git commit 保存`,
      common_errors: `常見錯誤和解法：

🐛 **「undefined」錯誤**
問 AI：「變數顯示 undefined，怎麼修？」
常見原因：
• 變數名拼錯
• 忘記初始化
• 非同步問題

🐛 **「is not a function」**
問 AI：「[函式名] is not a function」
常見原因：
• 函式名拼錯
• 忘記 import
• this 綁定問題

🐛 **樣式沒有生效**
問 AI：「CSS 不生效，檢查這段程式碼」
常見原因：
• 選擇器錯誤
• 優先級問題
• 拼字錯誤

🐛 **點擊沒反應**
問 AI：「按鈕點擊沒反應，幫我檢查」
常見原因：
• 事件沒綁定
• 選擇器錯誤
• JavaScript 錯誤`,
      debugging_prompts: `除錯提示詞範例：

📝 **基本除錯**
「這段程式碼有什麼問題？
[貼上程式碼]
錯誤：[錯誤訊息]」

📝 **效能問題**
「網頁載入很慢，如何優化？
[貼上相關程式碼]」

📝 **邏輯錯誤**
「計算結果不對
輸入：[輸入值]
預期輸出：[預期結果]
實際輸出：[實際結果]」

📝 **相容性問題**
「在 [瀏覽器] 上不能運作
錯誤：[錯誤訊息]
在 [其他瀏覽器] 正常」`,
      tips: [
        '💡 錯誤訊息是線索，要完整複製',
        '💡 描述清楚重現步驟',
        '💡 一次解決一個問題',
      ],
    },
    nextScene: 'project-practice',
    previousScene: 'iterative-development',
    points: 250,
  },

  'project-practice': {
    id: 'project-practice',
    title: '第八章：實戰專案',
    description: '運用所學完成一個完整專案',
    type: 'challenge',
    content: {
      task: '使用三大工具完成你的第一個完整專案',
      project_ideas: `專案點子：

🎯 **入門專案**
1. 個人名片網站
2. 簡單計算機
3. 待辦事項清單
4. 倒數計時器

🚀 **進階專案**
1. 部落格網站
2. 天氣查詢 App
3. 記帳本應用
4. 圖片畫廊

🌟 **挑戰專案**
1. 聊天室應用
2. 遊戲（猜數字、井字遊戲）
3. 音樂播放器
4. 筆記應用`,
      project_steps: `專案開發步驟：

📋 **第一階段：規劃**
1. 選擇專案類型
2. 列出核心功能（3-5個）
3. 畫出簡單草圖

🏗️ **第二階段：基礎建設**
1. Cursor Cmd+K：建立基本結構
2. Git init：初始化版本控制
3. 第一個 commit

⚙️ **第三階段：核心功能**
1. 實作功能 1 → commit
2. 實作功能 2 → commit
3. 實作功能 3 → commit

🎨 **第四階段：優化美化**
1. Claude Code：優化程式碼
2. Cursor：美化介面
3. 加入動畫效果

🧪 **第五階段：測試修復**
1. 完整測試所有功能
2. 用 AI 除錯
3. 最終 commit`,
      example_timeline: `範例：個人作品集網站

⏱️ **時間規劃（約 2 小時）**

0-20 分鐘：規劃與設計
• 決定要展示什麼
• 選擇配色方案
• 準備內容素材

20-60 分鐘：基礎開發
• Cursor：生成 HTML 結構
• Cursor：加入 CSS 樣式
• Git：初始 commit

60-90 分鐘：功能實作
• 加入作品展示區
• 加入聯絡表單
• 加入響應式設計

90-110 分鐘：優化調整
• Claude Code：優化程式碼
• 調整細節
• 加入動畫

110-120 分鐘：最終測試
• 手機/電腦測試
• 修復問題
• 最終 commit`,
      tips: [
        '💡 選擇你有興趣的專案',
        '💡 從小專案開始建立信心',
        '💡 完成比完美更重要',
      ],
    },
    nextScene: 'best-practices',
    previousScene: 'debugging',
    points: 500,
  },

  'best-practices': {
    id: 'best-practices',
    title: '第九章：Vibe Coding 最佳實踐',
    description: '成為 AI 程式設計大師',
    type: 'tutorial',
    content: {
      instructions: [
        '恭喜你來到最後一章！',
        '總結所有技巧和經驗',
        '成為真正的 Vibe Coding 大師',
      ],
      principles: `Vibe Coding 核心理念：

🌟 **黃金原則**
1. 你是創意總監，AI 是程式設計師
2. 清楚的溝通帶來好的結果
3. 迭代開發，持續改進
4. 每個人都能創造程式

🎯 **工作哲學**
• Think big, start small（大處著想，小處著手）
• Make it work, then make it better（先求有，再求好）
• Learn by doing（做中學）
• Embrace mistakes（擁抱錯誤）`,
      workflow_summary: `完美的工作流程：

1️⃣ **構思**（5分鐘）
• 明確目標
• 列出功能
• 選擇工具

2️⃣ **初始化**（5分鐘）
• Cursor 新專案
• Git init
• 第一個 commit

3️⃣ **快速原型**（20分鐘）
• Cursor Cmd+K 生成基礎
• 測試基本功能
• Commit 保存

4️⃣ **迭代改進**（30分鐘）
• 逐個加入功能
• 每個功能都 commit
• 用 AI 解決問題

5️⃣ **優化完善**（20分鐘）
• Claude Code 優化
• 美化介面
• 加入細節

6️⃣ **最終測試**（10分鐘）
• 完整測試
• 修復問題
• 最終 commit`,
      tool_mastery: `工具精通指南：

🎹 **Cursor 精通**
• 記住快捷鍵（Cmd+K, Cmd+L）
• 建立提示詞模板庫
• 善用 @ 引用
• 嘗試不同 AI 模型

🤖 **Claude Code 精通**
• 用於深度分析
• 程式碼審查
• 架構設計
• 效能優化

📦 **Git 精通**
• 頻繁 commit（每小時 5-10 次）
• 寫清楚的 commit 訊息
• 善用分支（branch）
• 定期推送到 GitHub`,
      growth_path: `持續成長之路：

📈 **技能提升路徑**
第 1 個月：掌握基本工具使用
第 2 個月：完成 5 個小專案
第 3 個月：挑戰中型專案
第 6 個月：能獨立完成任何想法

🎓 **學習資源**
• Cursor 官方文件
• Claude API 文件
• GitHub 教學
• 線上程式社群

🌍 **加入社群**
• 分享你的作品
• 幫助其他學習者
• 參與開源專案
• 建立作品集`,
      final_tips: `最後的建議：

💡 **記住這些**
• 不要怕犯錯，錯誤是學習的機會
• 保持好奇心，嘗試新事物
• 完成比完美更重要
• 享受創造的過程

🚀 **你現在可以**
• 把任何想法變成程式
• 不需要背程式語法
• 用 AI 解決任何問題
• 創造屬於你的作品

🎉 **恭喜你！**
你已經掌握了 Vibe Coding
三大工具：Cursor、Claude Code、Git
現在，去創造令人驚艷的作品吧！

Remember：
「程式設計不再是少數人的專利，
有了 AI，人人都能實現創意！」`,
      tips: [
        '💡 持續練習，每天寫一點',
        '💡 建立自己的程式碼片段庫',
        '💡 記錄學習筆記和心得',
      ],
    },
    nextScene: 'completion',
    previousScene: 'project-practice',
    points: 300,
  },

  'completion': {
    id: 'completion',
    title: '🎉 恭喜完成 Vibe Coding 課程！',
    description: '你已經是 AI 程式設計大師了！',
    type: 'tutorial',
    content: {
      message: `🎊 太棒了！你完成了所有課程！

你已經掌握了：
✅ Cursor - AI 程式編輯器
✅ Claude Code - 智慧程式助手
✅ Git - 版本控制系統
✅ 提示詞工程
✅ 迭代開發流程
✅ AI 除錯技巧

現在你可以：
🚀 將任何想法變成程式
🚀 不需要記程式語法
🚀 用 AI 解決程式問題
🚀 建立自己的專案

下一步：
1. 每天練習一個小專案
2. 分享你的作品
3. 幫助其他學習者
4. 探索更多可能性

記住：你是創意總監，AI 是你的團隊！
一起創造奇蹟吧！🚀`,
      celebration: '🎉🎊✨🌟💫🎈🎆🏆',
    },
    previousScene: 'best-practices',
    points: 1000,
  },
};