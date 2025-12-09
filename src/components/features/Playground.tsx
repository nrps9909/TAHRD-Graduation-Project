import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, BookOpen, Lightbulb, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import ClaudeSimulator from './ClaudeSimulator'
import { categoryInfo, PromptCardCategory } from '@/data/claudePromptCards'

// 預設的模擬回應
const simulatedResponses: Record<
  string,
  { userInput: string; claudeResponse: string; codeOutput?: string }
> = {
  'hello-world': {
    userInput: '幫我寫一個 JavaScript 程式，在網頁上顯示 Hello World',
    claudeResponse:
      '好的！我來幫你寫一個漂亮的 Hello World 網頁。我會加上一些樣式讓它更好看：',
    codeOutput: `<!DOCTYPE html>
<html>
<head>
  <title>Hello World</title>
  <style>
    body {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      font-family: 'Segoe UI', sans-serif;
    }
    .greeting {
      color: white;
      font-size: 4rem;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
      animation: fadeIn 1s ease-in;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>
<body>
  <h1 class="greeting">Hello World!</h1>
</body>
</html>`,
  },
  calculator: {
    userInput: '幫我做一個簡單的計算機，可以加減乘除',
    claudeResponse:
      '沒問題！我來幫你做一個功能完整的計算機，有漂亮的介面和基本的運算功能：',
    codeOutput: `function Calculator() {
  let display = '0';
  let currentValue = null;
  let operation = null;

  const operations = {
    '+': (a, b) => a + b,
    '-': (a, b) => a - b,
    '*': (a, b) => a * b,
    '/': (a, b) => b !== 0 ? a / b : 'Error'
  };

  function inputNumber(num) {
    display = display === '0' ? num : display + num;
    updateDisplay();
  }

  function setOperation(op) {
    currentValue = parseFloat(display);
    operation = op;
    display = '0';
  }

  function calculate() {
    if (currentValue !== null && operation) {
      const result = operations[operation](
        currentValue,
        parseFloat(display)
      );
      display = String(result);
      currentValue = null;
      operation = null;
      updateDisplay();
    }
  }

  function clear() {
    display = '0';
    currentValue = null;
    operation = null;
    updateDisplay();
  }

  return { inputNumber, setOperation, calculate, clear };
}`,
  },
  'todo-app': {
    userInput: '幫我做一個待辦事項 App，要能新增、刪除和標記完成',
    claudeResponse:
      '好的！我來做一個功能完整的待辦事項 App，包含你需要的所有功能：',
    codeOutput: `// 待辦事項 App
const TodoApp = {
  todos: [],

  // 新增待辦事項
  addTodo(text) {
    const todo = {
      id: Date.now(),
      text: text,
      completed: false,
      createdAt: new Date()
    };
    this.todos.push(todo);
    this.render();
    return todo;
  },

  // 刪除待辦事項
  deleteTodo(id) {
    this.todos = this.todos.filter(todo => todo.id !== id);
    this.render();
  },

  // 標記完成/未完成
  toggleComplete(id) {
    const todo = this.todos.find(t => t.id === id);
    if (todo) {
      todo.completed = !todo.completed;
      this.render();
    }
  },

  // 清除已完成
  clearCompleted() {
    this.todos = this.todos.filter(todo => !todo.completed);
    this.render();
  },

  // 渲染畫面
  render() {
    // 更新 UI...
    console.log('Todos:', this.todos);
  }
};

// 使用範例
TodoApp.addTodo('學習 Vibe Coding');
TodoApp.addTodo('完成專案');
TodoApp.toggleComplete(TodoApp.todos[0].id);`,
  },
}

const Playground: React.FC = () => {
  const [selectedCategory, setSelectedCategory] =
    useState<PromptCardCategory | null>(null)
  const [selectedExample, setSelectedExample] = useState<string | null>(null)
  const [customInput, setCustomInput] = useState('')

  const categories = Object.keys(categoryInfo) as PromptCardCategory[]

  const currentSimulation = selectedExample
    ? simulatedResponses[selectedExample]
    : customInput
      ? {
          userInput: customInput,
          claudeResponse:
            '這是一個模擬環境。在實際的 Claude Code 中，我會根據你的需求生成真實的程式碼！',
          codeOutput: `// 你的需求：${customInput}
//
// 在實際環境中，Claude 會：
// 1. 分析你的需求
// 2. 選擇最適合的技術
// 3. 生成完整的程式碼
// 4. 提供使用說明
//
// 試著在 Claude Code Adventure 中學習更多技巧！`,
        }
      : null

  const handleExampleSelect = (exampleId: string) => {
    setSelectedExample(exampleId)
    setCustomInput('')
  }

  const handleCustomSubmit = () => {
    if (customInput.trim()) {
      setSelectedExample(null)
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* 導航列 */}
      <nav className="bg-bg-secondary border-b border-border-primary px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-text-primary hover:text-accent transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="chinese-text">返回冒險地圖</span>
          </Link>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-accent" />
            Claude Playground
          </h1>
          <div className="w-24"></div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* 左側：範例選擇 */}
          <div className="lg:col-span-1 space-y-6">
            {/* 說明卡片 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-bg-tertiary border border-border-primary rounded-xl p-6"
            >
              <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-accent" />
                什麼是 Playground？
              </h2>
              <p className="text-text-secondary text-sm leading-relaxed chinese-text">
                這是一個模擬環境，讓你體驗用自然語言請求程式碼的感覺。選擇範例或輸入你的需求，看看
                Claude 會如何回應！
              </p>
            </motion.div>

            {/* 範例類別 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-bg-tertiary border border-border-primary rounded-xl p-6"
            >
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-accent" />
                選擇範例
              </h2>

              {/* 類別標籤 */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedCategory === null
                      ? 'bg-accent text-white'
                      : 'bg-bg-hover text-text-secondary hover:text-text-primary'
                  }`}
                >
                  全部
                </button>
                {categories.slice(0, 3).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedCategory === cat
                        ? 'bg-accent text-white'
                        : 'bg-bg-hover text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {categoryInfo[cat].icon} {categoryInfo[cat].name}
                  </button>
                ))}
              </div>

              {/* 範例按鈕 */}
              <div className="space-y-2">
                <button
                  onClick={() => handleExampleSelect('hello-world')}
                  className={`w-full p-3 rounded-lg text-left transition-all ${
                    selectedExample === 'hello-world'
                      ? 'bg-accent text-white'
                      : 'bg-bg-hover text-text-primary hover:bg-bg-secondary'
                  }`}
                >
                  <div className="font-semibold">Hello World</div>
                  <div className="text-sm opacity-70 chinese-text">
                    基礎網頁程式
                  </div>
                </button>
                <button
                  onClick={() => handleExampleSelect('calculator')}
                  className={`w-full p-3 rounded-lg text-left transition-all ${
                    selectedExample === 'calculator'
                      ? 'bg-accent text-white'
                      : 'bg-bg-hover text-text-primary hover:bg-bg-secondary'
                  }`}
                >
                  <div className="font-semibold">計算機</div>
                  <div className="text-sm opacity-70 chinese-text">
                    加減乘除功能
                  </div>
                </button>
                <button
                  onClick={() => handleExampleSelect('todo-app')}
                  className={`w-full p-3 rounded-lg text-left transition-all ${
                    selectedExample === 'todo-app'
                      ? 'bg-accent text-white'
                      : 'bg-bg-hover text-text-primary hover:bg-bg-secondary'
                  }`}
                >
                  <div className="font-semibold">待辦事項 App</div>
                  <div className="text-sm opacity-70 chinese-text">
                    新增、刪除、標記完成
                  </div>
                </button>
              </div>
            </motion.div>

            {/* 自訂輸入 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-bg-tertiary border border-border-primary rounded-xl p-6"
            >
              <h2 className="text-lg font-bold text-white mb-4">
                或是輸入你的需求
              </h2>
              <textarea
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                placeholder="例如：幫我做一個倒數計時器..."
                className="w-full h-24 bg-bg-hover text-text-primary rounded-lg p-3 text-sm placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent resize-none border border-border-primary"
              />
              <button
                onClick={handleCustomSubmit}
                disabled={!customInput.trim()}
                className="mt-3 w-full py-2 bg-accent text-white rounded-lg font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed chinese-text"
              >
                送出請求
              </button>
            </motion.div>
          </div>

          {/* 右側：模擬器 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2"
          >
            <ClaudeSimulator
              {...(currentSimulation ? { simulatedOutput: currentSimulation } : {})}
              readOnly={true}
              showTypingEffect={true}
              placeholder="選擇左側的範例或輸入你的需求..."
            />

            {/* 提示 */}
            <div className="mt-4 p-4 bg-accent/20 rounded-xl border border-accent/30">
              <p className="text-text-primary text-sm chinese-text">
                💡
                這是模擬環境，使用預設的回應。想要學習完整的 Vibe Coding 技巧，請前往{' '}
                <Link
                  to="/"
                  className="underline text-accent hover:text-accent-hover"
                >
                  冒險地圖
                </Link>{' '}
                開始你的學習之旅！
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default Playground
