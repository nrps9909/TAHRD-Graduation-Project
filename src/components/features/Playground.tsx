import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, BookOpen, Lightbulb, ArrowLeft, Code, Zap, Layers } from 'lucide-react'
import { Link } from 'react-router-dom'
import ClaudeSimulator from './ClaudeSimulator'

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

const examples = [
  {
    id: 'hello-world',
    title: 'Hello World',
    description: '基礎網頁程式',
    icon: Code,
    category: 'basic',
  },
  {
    id: 'calculator',
    title: '計算機',
    description: '加減乘除功能',
    icon: Zap,
    category: 'function',
  },
  {
    id: 'todo-app',
    title: '待辦事項 App',
    description: '新增、刪除、標記完成',
    icon: Layers,
    category: 'project',
  },
]

const Playground: React.FC = () => {
  const [selectedExample, setSelectedExample] = useState<string | null>(null)
  const [customInput, setCustomInput] = useState('')

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
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* 背景光暈效果 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-emerald-500/3 rounded-full blur-[100px]" />
      </div>

      {/* 導航列 */}
      <nav className="relative z-10 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-gray-400 hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm chinese-text">返回冒險地圖</span>
          </Link>
          <h1 className="text-lg font-semibold text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            Claude Playground
          </h1>
          <div className="w-24"></div>
        </div>
      </nav>

      <div className="relative z-10 max-w-7xl mx-auto p-6">
        <div className="grid lg:grid-cols-12 gap-6">
          {/* 左側：範例選擇 */}
          <div className="lg:col-span-4 space-y-5">
            {/* 說明卡片 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-[#111111] to-[#0d0d0d] border border-white/5 rounded-2xl p-6"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white mb-2">
                    什麼是 Playground？
                  </h2>
                  <p className="text-gray-500 text-sm leading-relaxed chinese-text">
                    這是一個模擬環境，讓你體驗用自然語言請求程式碼的感覺。選擇範例或輸入你的需求，看看
                    Claude 會如何回應！
                  </p>
                </div>
              </div>
            </motion.div>

            {/* 範例選擇 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[#111111] border border-white/5 rounded-2xl p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-white">選擇範例</h2>
              </div>

              {/* 範例按鈕 */}
              <div className="space-y-2">
                {examples.map((example) => {
                  const Icon = example.icon
                  const isSelected = selectedExample === example.id
                  return (
                    <button
                      key={example.id}
                      onClick={() => handleExampleSelect(example.id)}
                      className={`w-full p-4 rounded-xl text-left transition-all duration-200 group ${
                        isSelected
                          ? 'bg-emerald-500/10 border border-emerald-500/30'
                          : 'bg-white/[0.02] border border-transparent hover:bg-white/[0.04] hover:border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-emerald-500/20'
                            : 'bg-white/5 group-hover:bg-white/10'
                        }`}>
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'text-gray-400'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium text-sm ${isSelected ? 'text-emerald-400' : 'text-gray-200'}`}>
                            {example.title}
                          </div>
                          <div className="text-xs text-gray-500 chinese-text truncate">
                            {example.description}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </motion.div>

            {/* 自訂輸入 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-[#111111] border border-white/5 rounded-2xl p-5"
            >
              <h2 className="text-sm font-semibold text-white mb-3">
                或是輸入你的需求
              </h2>
              <textarea
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                placeholder="例如：幫我做一個倒數計時器..."
                className="w-full h-28 bg-[#0a0a0a] text-gray-200 rounded-xl p-4 text-sm placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 resize-none border border-white/5 transition-all"
              />
              <button
                onClick={handleCustomSubmit}
                disabled={!customInput.trim()}
                className="mt-3 w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl font-medium hover:from-emerald-500 hover:to-emerald-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-emerald-600 disabled:hover:to-emerald-500 chinese-text text-sm"
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
            className="lg:col-span-8"
          >
            <ClaudeSimulator
              {...(currentSimulation ? { simulatedOutput: currentSimulation } : {})}
              readOnly={false}
              showTypingEffect={true}
              placeholder="選擇左側的範例或輸入你的需求..."
              useRealApi={true}
            />

            {/* 提示 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-4 p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/10"
            >
              <p className="text-gray-400 text-sm chinese-text">
                <span className="text-emerald-400">Tip:</span>{' '}
                這是模擬環境，使用預設的回應。想要學習完整的 Vibe Coding 技巧，請前往{' '}
                <Link
                  to="/"
                  className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors"
                >
                  冒險地圖
                </Link>{' '}
                開始你的學習之旅！
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default Playground
