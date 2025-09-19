import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, X, Loader } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const GeminiAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '👋 嗨！我是 Gemini 助手，可以幫你解決環境設置的任何問題。有什麼可以幫助你的嗎？',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 模擬 Gemini API 回應（實際使用時需要真實 API）
  const simulateGeminiResponse = async (query: string): Promise<string> => {
    // 模擬延遲
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 根據問題類型返回不同回應
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('wsl') || lowerQuery.includes('ubuntu')) {
      return `關於 WSL 的問題，這是我的建議：

1. **檢查 WSL 版本**
   \`\`\`bash
   wsl --version
   wsl -l -v
   \`\`\`

2. **常見 WSL 問題解決**
   - 如果 WSL 無法啟動，試試：\`wsl --shutdown\` 然後重新啟動
   - 更新 WSL：\`wsl --update\`
   - 確認虛擬化已啟用（在 BIOS 中）

3. **優化建議**
   - 將專案放在 WSL 檔案系統中：\`/home/username/projects\`
   - 避免跨檔案系統操作（Windows ↔ Linux）

需要更詳細的說明嗎？`;
    }

    if (lowerQuery.includes('cursor')) {
      return `Cursor 編輯器相關建議：

1. **快捷鍵**
   - \`Cmd/Ctrl + K\`：AI 快速編輯
   - \`Cmd/Ctrl + L\`：開啟 AI 聊天
   - \`@codebase\`：讓 AI 理解整個專案

2. **在 WSL 中使用 Cursor**
   \`\`\`bash
   # 安裝命令
   cursor .
   # 或指定檔案
   cursor filename.js
   \`\`\`

3. **進階技巧**
   - 創建 \`.cursorrules\` 檔案定義專案規則
   - 使用 Composer 進行多檔案編輯
   - 自訂 AI 提示模板

還有其他 Cursor 問題嗎？`;
    }

    if (lowerQuery.includes('claude') || lowerQuery.includes('api')) {
      return `Claude API 設定指南：

1. **取得 API 金鑰**
   - 訪問：https://console.anthropic.com
   - 創建新的 API 金鑰

2. **設定環境變數**
   \`\`\`bash
   export ANTHROPIC_API_KEY="your-key-here"
   echo 'export ANTHROPIC_API_KEY="your-key"' >> ~/.bashrc
   source ~/.bashrc
   \`\`\`

3. **測試連接**
   \`\`\`bash
   claude "Hello, Claude!"
   \`\`\`

4. **配額管理**
   - 免費方案：有請求限制
   - 監控使用量：檢查控制台

需要協助設定嗎？`;
    }

    if (lowerQuery.includes('error') || lowerQuery.includes('問題')) {
      return `我來幫你診斷問題：

1. **收集錯誤資訊**
   \`\`\`bash
   # 查看系統狀態
   wsl --status

   # 檢查環境變數
   env | grep -E "(API|PATH)"

   # 查看錯誤日誌
   tail -n 50 ~/.bash_history
   \`\`\`

2. **常見錯誤解決**
   - 權限問題：使用 \`sudo\` 或檢查檔案權限
   - 找不到命令：確認 PATH 設定正確
   - API 錯誤：檢查金鑰和網路連接

3. **取得更多幫助**
   - 提供完整錯誤訊息
   - 說明重現步驟
   - 檢查版本相容性

請提供具體的錯誤訊息，我可以給出更精確的解決方案！`;
    }

    if (lowerQuery.includes('install') || lowerQuery.includes('安裝')) {
      return `安裝指南：

1. **基礎環境**
   \`\`\`bash
   # 更新系統
   sudo apt update && sudo apt upgrade -y

   # 安裝必要工具
   sudo apt install build-essential curl git -y
   \`\`\`

2. **Node.js (使用 nvm)**
   \`\`\`bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   source ~/.bashrc
   nvm install --lts
   \`\`\`

3. **Python 環境**
   \`\`\`bash
   sudo apt install python3 python3-pip
   pip install --upgrade pip
   \`\`\`

需要安裝特定的工具嗎？`;
    }

    // 預設回應
    return `我理解你的問題。讓我為你提供一些建議：

1. 首先，請確認你的環境設置正確
2. 檢查所有必要的工具是否已安裝
3. 查看相關文檔和教程

如果你能提供更具體的問題描述，我可以給出更精確的幫助。例如：
- 你遇到了什麼錯誤訊息？
- 你正在嘗試做什麼？
- 你的系統環境是什麼？

請告訴我更多細節！`;
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await simulateGeminiResponse(input);
      const assistantMessage: Message = {
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: '抱歉，我遇到了一些問題。請稍後再試。',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickQuestions = [
    'WSL 無法啟動怎麼辦？',
    '如何在 WSL 中使用 Cursor？',
    '設定 Claude API 金鑰',
    '安裝 Node.js 最佳方式',
  ];

  return (
    <>
      {/* 浮動按鈕 */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg z-40 ${
          isOpen ? 'hidden' : ''
        }`}
      >
        <Sparkles className="w-7 h-7 text-white" />
      </motion.button>

      {/* 助手對話框 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 w-96 h-[600px] bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-50 flex flex-col"
          >
            {/* 標題列 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-400" />
                <span className="font-semibold text-white">Gemini 助手</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 訊息區域 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-100'
                    }`}
                  >
                    <div className="text-sm whitespace-pre-wrap break-words">
                      {message.content}
                    </div>
                    <div className="text-xs opacity-50 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 p-3 rounded-lg">
                    <Loader className="w-5 h-5 text-blue-400 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 快速問題 */}
            {messages.length === 1 && (
              <div className="px-4 py-2 border-t border-gray-700">
                <p className="text-xs text-gray-400 mb-2">快速問題：</p>
                <div className="flex flex-wrap gap-2">
                  {quickQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => setInput(question)}
                      className="text-xs px-2 py-1 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 輸入區域 */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-4 border-t border-gray-700"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="問我任何問題..."
                  className="flex-1 px-3 py-2 bg-gray-800 text-white rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default GeminiAssistant;