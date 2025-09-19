import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { usePageStatePersistence } from '../hooks/usePageStatePersistence';
import WebPreview from './WebPreview';
import QuickProjectCreator from './QuickProjectCreator';
import { Achievement } from './AchievementNotification';

interface ChatMessage {
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  files?: Array<{
    filename: string;
    created: boolean;
  }>;
}

interface TriggerFeedback {
  showPoints: (points: number, position?: { x: number; y: number }) => void;
  showProgress: (message: string, position?: { x: number; y: number }) => void;
  showSkill: (skillName: string, position?: { x: number; y: number }) => void;
  showEncouragement: (message: string, position?: { x: number; y: number }) => void;
  showCombo: (count: number, position?: { x: number; y: number }) => void;
  showPerfect: (message?: string, position?: { x: number; y: number }) => void;
  showAchievement: (achievement: Achievement) => void;
}

interface GeminiCLIProps {
  triggerFeedback?: TriggerFeedback;
}

// 聊天記錄持久化函數
const saveChatToStorage = (messages: ChatMessage[]) => {
  try {
    localStorage.setItem('claude-code-adventure-chat', JSON.stringify(messages));
  } catch (error) {
    console.warn('無法保存聊天記錄到本地存儲:', error);
  }
};

const loadChatFromStorage = (): ChatMessage[] => {
  try {
    const saved = localStorage.getItem('claude-code-adventure-chat');
    if (saved) {
      const parsed = JSON.parse(saved);
      // 轉換時間戳字符串回 Date 對象
      return parsed.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
    }
  } catch (error) {
    console.warn('無法從本地存儲加載聊天記錄:', error);
  }

  // 返回預設的歡迎訊息
  return [
    {
      type: 'assistant',
      content: '🐱 喵！歡迎來到貓咪AI助手！我是你的可愛程式學習夥伴～\n\n我可以幫你學習Git和程式設計！有什麼想問的嗎？',
      timestamp: new Date()
    },
  ];
};

const GeminiCLI: React.FC<GeminiCLIProps> = ({ triggerFeedback }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadChatFromStorage());
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // 使用持久化狀態來追蹤 AI 請求狀態，防止切換視窗時中斷
  const [aiState, setAiState] = usePageStatePersistence('geminiCLI_aiState', {
    isLoading: false,
    currentRequestId: null as string | null,
    lastRequestTime: null as number | null
  });

  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { addTerminalCommand, unlockAchievement, setAIResponseReceived, waitingForAI } = useGameStore();

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  // 頁面可見性保護 - 防止切換視窗中斷AI思考
  useEffect(() => {
    const handleVisibilityChange = () => {
      // 如果頁面變為隱藏且正在載入中，保持請求繼續執行
      if (document.hidden && aiState.isLoading) {
        console.log('🐱 頁面隱藏中，但AI正在思考，保持連接...');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [aiState.isLoading]);

  // 自動保存聊天記錄
  useEffect(() => {
    saveChatToStorage(messages);
  }, [messages]);

  // 組件重新掛載時檢查是否有進行中的請求
  useEffect(() => {
    if (aiState.isLoading && aiState.lastRequestTime) {
      const timeSinceRequest = Date.now() - aiState.lastRequestTime;
      // 如果請求超過 30 秒，認為可能已經失敗
      if (timeSinceRequest > 30000) {
        console.log('🐱 檢測到過期的 AI 請求，重置狀態');
        setAiState(prev => ({
          ...prev,
          isLoading: false,
          currentRequestId: null
        }));
      } else {
        console.log('🐱 恢復進行中的 AI 請求狀態');
      }
    }
  }, []); // 只在組件掛載時執行一次

  // 組件卸載時的清理邏輯 - 保持請求繼續進行
  useEffect(() => {
    return () => {
      // 不取消 AbortController，讓請求繼續在背景執行
      if (aiState.isLoading) {
        console.log('🐱 組件卸載，但保持 AI 請求繼續執行');
      }
    };
  }, [aiState.isLoading]);

  const processMarkdown = (text: string): string => {
    // Remove code block formatting
    let processed = text.replace(/```[\w]*\n/g, '').replace(/```/g, '');

    // Convert **bold** to just the text
    processed = processed.replace(/\*\*(.*?)\*\*/g, '$1');

    // Convert *italic* to just the text
    processed = processed.replace(/\*(.*?)\*/g, '$1');

    // Remove other markdown symbols
    processed = processed.replace(/#{1,6}\s/g, '');

    return processed;
  };

  const executeGeminiCommand = async (userPrompt: string): Promise<{ text: string; files?: any[] }> => {
    const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3002';
    try {
      // 創建新的 AbortController 用於此次請求
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Prepare conversation history for context
      const conversationHistory = messages
        .filter(msg => msg.type !== 'system') // Exclude system messages
        .slice(-6) // Keep last 6 messages for context (3 exchanges)
        .map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content.replace(/📁 \*\*已創建檔案：\*\*[\s\S]*?$/, '').trim() // Clean file notifications from history
        }))
        .filter(msg => msg.content.length > 0); // Remove empty messages

      // Call Gemini CLI with conversation history
      const response = await fetch(`${API_BASE}/api/gemini`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: userPrompt,
          history: conversationHistory
        }),
        signal: controller.signal, // 添加 AbortController signal
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 504) {
          return { text: '🐱 喵嗚～這個問題有點複雜，我思考太久了！請試試簡單一點的問題？' };
        } else if (response.status === 503) {
          return { text: '🐱 喵嗚～Gemini CLI 沒有安裝好喔！請確認安裝狀態。' };
        } else {
          throw new Error(data.error || 'Gemini API request failed');
        }
      }

      const rawResponse = data.response || '無法獲取回應';

      // Check if files were created
      let fileNotification = '';
      if (data.files && data.files.length > 0) {
        const createdFiles = data.files.filter((f: any) => f.created);
        if (createdFiles.length > 0) {
          fileNotification = '\n\n📁 **已創建檔案：**\n';
          createdFiles.forEach((file: any) => {
            fileNotification += `✅ ${file.filename}\n`;
          });
        }
      }

      // Process the response to remove technical markdown
      return {
        text: processMarkdown(rawResponse) + fileNotification,
        files: data.files
      };
    } catch (error) {
      // 檢查是否為用戶主動取消的請求
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('🐱 AI請求被主動取消');
        return { text: '🐱 喵～請求已取消' };
      }
      console.error('Gemini CLI Error:', error);
      return { text: '🐱 喵嗚～連接有問題！請確保服務正在運行。\n錯誤訊息：' + (error as Error).message };
    } finally {
      // 清理 AbortController 引用
      abortControllerRef.current = null;
    }
  };

  const handleLocalCommand = (cmd: string): string | null => {
    const trimmedCmd = cmd.trim().toLowerCase();

    switch (trimmedCmd) {
      case 'help':
        unlockAchievement('help-used');
        return '🐱 貓咪助手使用說明 🐾\n\n' +
               '• 直接輸入任何問題跟我聊天！\n' +
               '• 問我程式設計和Git相關問題\n' +
               '• 輸入 "clear" 清除對話記錄\n' +
               '• 輸入 "history" 查看歷史記錄\n\n' +
               '範例問題：\n' +
               '• "什麼是Git？"\n' +
               '• "如何寫Python函數？"\n' +
               '• "git commit是什麼意思？"';

      case 'clear':
        unlockAchievement('clear-screen');
        setMessages([{
          type: 'assistant',
          content: '🐱 喵！聊天記錄已清除～有什麼新問題要問我嗎？',
          timestamp: new Date()
        }]);
        return null;

      case 'history':
        if (history.length === 0) {
          return '🐱 還沒有歷史記錄喔～';
        }
        return '🐱 歷史記錄：\n\n' + history.map((cmd, idx) => `${idx + 1}. ${cmd}`).join('\n');

      case 'about':
        return '🐱 關於貓咪AI助手\n\n' +
               '版本：2.0.0 (可愛貓咪版)\n' +
               '我是你的程式學習夥伴！\n' +
               '專門幫助學習Git和程式設計\n' +
               '用可愛的方式回答你的問題～ 🐾';

      default:
        return null;
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage = message.trim();

    // Add user message to chat
    const userChatMessage: ChatMessage = {
      type: 'user',
      content: userMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userChatMessage]);
    setHistory(prev => [...prev, userMessage]);
    addTerminalCommand(userMessage);
    setMessage('');
    setHistoryIndex(-1);

    // Check for local commands first
    const localResponse = handleLocalCommand(userMessage);
    if (localResponse) {
      const assistantMessage: ChatMessage = {
        type: 'assistant',
        content: localResponse,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      return;
    }

    // Show loading state with unique request ID
    const requestId = Date.now().toString();
    setAiState(prev => ({
      ...prev,
      isLoading: true,
      currentRequestId: requestId,
      lastRequestTime: Date.now()
    }));

    try {
      // Execute Gemini command
      const response = await executeGeminiCommand(userMessage);

      // Add assistant response
      const assistantMessage: ChatMessage = {
        type: 'assistant',
        content: response.text,
        timestamp: new Date(),
        files: response.files
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Mark that AI response has been received
      setAIResponseReceived(true);

      // 即時回饋 - 每次AI回應
      triggerFeedback?.showProgress('✨ AI 回應完成！', { x: window.innerWidth - 200, y: 100 });

      // 如果有檔案被創建，給額外回饋
      if (response.files && response.files.length > 0) {
        const createdFiles = response.files.filter((f: any) => f.created);
        if (createdFiles.length > 0) {
          triggerFeedback?.showSkill(`創建了 ${createdFiles.length} 個檔案`, { x: window.innerWidth - 200, y: 150 });
          triggerFeedback?.showPoints(createdFiles.length * 10, { x: window.innerWidth - 200, y: 200 });
        }
      }

      // Unlock achievements
      if (history.length === 0) {
        unlockAchievement('first-question');
        triggerFeedback?.showAchievement({
          id: 'first-question',
          title: '初次對話',
          description: '與 AI 助手的第一次互動！',
          icon: '💬',
          type: 'milestone',
          points: 25,
          rarity: 'common'
        });
      }
      if (history.length === 9) {
        unlockAchievement('ten-questions');
        triggerFeedback?.showAchievement({
          id: 'ten-questions',
          title: '好奇寶寶',
          description: '已經問了 10 個問題！學習態度超棒！',
          icon: '🤔',
          type: 'streak',
          points: 100,
          rarity: 'rare'
        });
      }
      if (history.length === 19) {
        unlockAchievement('ai-helper');
        triggerFeedback?.showAchievement({
          id: 'ai-helper',
          title: 'AI 協作大師',
          description: '成功與 AI 進行了 20 次對話！',
          icon: '🤖',
          type: 'skill',
          points: 200,
          rarity: 'epic'
        });
      }

      // Check for Git-related questions
      const lowerPrompt = userMessage.toLowerCase();
      if (lowerPrompt.includes('git init')) {
        unlockAchievement('git-init-learned');
      }
      if (lowerPrompt.includes('git status')) {
        unlockAchievement('git-status-learned');
      }
      if (lowerPrompt.includes('git add')) {
        unlockAchievement('git-add-learned');
      }
      if (lowerPrompt.includes('git log')) {
        unlockAchievement('git-log-learned');
      }
      if (lowerPrompt.includes('commit')) {
        unlockAchievement('first-commit');
      }
      if (lowerPrompt.includes('branch')) {
        unlockAchievement('branch-master');
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        type: 'assistant',
        content: '🐱 喵嗚～出了點小問題，請再試一次！',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      // Only clear loading if this is the current request
      setAiState(prev => ({
        ...prev,
        isLoading: false,
        currentRequestId: null
      }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setMessage(history[history.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setMessage(history[history.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setMessage('');
      }
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderMessage = (msg: ChatMessage, index: number) => {
    const isUser = msg.type === 'user';
    const isAssistant = msg.type === 'assistant';

    return (
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.1 }}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div className={`flex items-start gap-3 max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          {/* Avatar */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.1 + 0.2 }}
            className="flex-shrink-0"
          >
            {isUser ? (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-lg font-bold shadow-lg">
                👤
              </div>
            ) : (
              <motion.div
                animate={{
                  rotate: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatType: 'reverse'
                }}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-cat-pink to-cat-purple flex items-center justify-center text-white text-lg shadow-lg"
              >
                🐱
              </motion.div>
            )}
          </motion.div>

          {/* Message Bubble */}
          <div className="flex flex-col">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1 + 0.3 }}
              className={`
                px-4 py-3 rounded-2xl shadow-lg
                ${isUser
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                  : 'bg-white text-gray-800 border border-pink-200'
                }
                ${isUser ? 'rounded-br-md' : 'rounded-bl-md'}
              `}
            >
              <div className="whitespace-pre-wrap font-chinese text-sm leading-relaxed">
                {msg.content}
              </div>
            </motion.div>

            {/* Timestamp */}
            <div className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
              {formatTime(msg.timestamp)}
            </div>

            {/* Web Preview Button for assistant messages with files */}
            {isAssistant && msg.files && msg.files.length > 0 && (
              <WebPreview files={msg.files} message={msg.content} />
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <motion.div
      className={`h-full flex flex-col bg-gradient-to-br from-pink-50 to-purple-50 relative ${waitingForAI ? 'ring-2 ring-cat-purple ring-opacity-50' : ''}`}
      animate={waitingForAI ? {
        boxShadow: [
          '0 0 20px rgba(219, 112, 147, 0.3)',
          '0 0 40px rgba(219, 112, 147, 0.5)',
          '0 0 20px rgba(219, 112, 147, 0.3)',
        ]
      } : {}}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <AnimatePresence>
        {waitingForAI && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-cat-pink to-cat-purple text-white px-6 py-3 rounded-full text-sm font-medium z-10 chinese-text shadow-lg"
          >
            <motion.span
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-block mr-2"
            >
              🐱
            </motion.span>
            喵～來跟我聊天吧！
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-gradient-to-r from-cat-pink to-cat-purple text-white p-4 shadow-lg"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ duration: 3, repeat: Infinity }}
              className="text-2xl"
            >
              🐱
            </motion.div>
            <div>
              <h2 className="font-chinese text-lg font-bold">貓咪AI助手</h2>
              <p className="font-chinese text-sm opacity-90">你的可愛程式學習夥伴</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* 自動保存指示器 */}
            {messages.length > 1 && (
              <div className="flex items-center gap-2">
                <div className="bg-white bg-opacity-20 text-white px-2 py-1 rounded-full text-xs font-chinese flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  已保存
                </div>
                <button
                  onClick={() => {
                    const defaultMessage = {
                      type: 'assistant' as const,
                      content: '🐱 喵！歡迎來到貓咪AI助手！我是你的可愛程式學習夥伴～\n\n我可以幫你學習Git和程式設計！有什麼想問的嗎？',
                      timestamp: new Date()
                    };
                    setMessages([defaultMessage]);
                    triggerFeedback?.showProgress('💬 聊天記錄已清除', { x: window.innerWidth / 2, y: 100 });
                  }}
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-3 py-1 rounded-full text-xs font-chinese transition-all"
                  title="清除聊天記錄"
                >
                  🗑️ 清除
                </button>
              </div>
            )}
            {aiState.isLoading && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="text-2xl"
              >
                🌸
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Chat Messages */}
      <div
        ref={chatRef}
        className="flex-1 overflow-y-auto p-4 space-y-2"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fce7f3' fill-opacity='0.3'%3E%3Ccircle cx='3' cy='3' r='1'/%3E%3C/g%3E%3C/svg%3E")`,
        }}
      >
        {/* Quick Project Creator - show when no conversation started */}
        {messages.length <= 1 && !aiState.isLoading && (
          <QuickProjectCreator
            onCreateProject={(prompt) => {
              setMessage(prompt);
              // Auto-submit the message
              setTimeout(() => {
                const form = document.querySelector('form');
                if (form) {
                  const event = new Event('submit', { bubbles: true, cancelable: true });
                  form.dispatchEvent(event);
                }
              }, 100);
            }}
          />
        )}

        {messages.map((msg, index) => renderMessage(msg, index))}

        {/* Loading indicator */}
        {aiState.isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start mb-4"
          >
            <div className="flex items-start gap-3 max-w-[80%]">
              <motion.div
                animate={{
                  rotate: [0, 5, -5, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-cat-pink to-cat-purple flex items-center justify-center text-white text-lg shadow-lg"
              >
                🐱
              </motion.div>
              <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-lg border border-pink-200">
                <div className="flex items-center gap-1">
                  <motion.div
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                    className="w-2 h-2 bg-cat-pink rounded-full"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                    className="w-2 h-2 bg-cat-purple rounded-full"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                    className="w-2 h-2 bg-cat-pink rounded-full"
                  />
                  <span className="ml-2 font-chinese text-sm text-gray-600">貓咪正在思考中...</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input Area */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white border-t border-pink-200 p-4 shadow-lg"
      >
        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-full outline-none font-chinese text-sm focus:border-cat-pink focus:bg-white transition-all duration-200"
              placeholder="輸入訊息跟貓咪聊天... 🐾"
              disabled={aiState.isLoading}
            />
          </div>
          <motion.button
            type="submit"
            disabled={aiState.isLoading || !message.trim()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-12 h-12 bg-gradient-to-r from-cat-pink to-cat-purple text-white rounded-full flex items-center justify-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {aiState.isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                ⏳
              </motion.div>
            ) : (
              <motion.span
                whileHover={{ scale: 1.2 }}
                className="text-lg"
              >
                💌
              </motion.span>
            )}
          </motion.button>
        </form>
        <div className="mt-2 text-center">
          <p className="font-chinese text-xs text-gray-500">
            💡 提示：輸入 "help" 查看更多功能
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default GeminiCLI;