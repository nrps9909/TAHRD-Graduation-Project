import { motion } from 'framer-motion';
import { Monitor, Apple, ChevronRight } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { useNavigate } from 'react-router-dom';

interface OSSelectionProps {
  triggerFeedback?: any;
}

const OSSelection = ({ }: OSSelectionProps) => {
  const { setOS, playerName } = useGameStore();
  const navigate = useNavigate();

  const handleOSSelection = (os: 'windows' | 'mac') => {
    setOS(os);
    navigate('/game');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col items-center justify-center p-8 bg-retro-bg"
    >
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-chinese text-retro-green mb-4">
          選擇你的作業系統
        </h1>
        <p className="text-lg font-chinese text-retro-cyan">
          我們將提供對應系統的專屬教學內容
        </p>
        {playerName && (
          <p className="text-sm font-chinese text-retro-amber mt-2">
            歡迎, {playerName}！
          </p>
        )}
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
        {/* Windows 選項 */}
        <motion.div
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleOSSelection('windows')}
          className="cursor-pointer group"
        >
          <div className="terminal-window hover:border-retro-amber transition-all duration-300">
            <div className="flex flex-col items-center py-8 px-6">
              <Monitor className="w-24 h-24 text-retro-amber mb-4 group-hover:animate-pulse" />
              <h2 className="text-2xl font-cute text-retro-amber mb-3">
                Windows
              </h2>
              <div className="space-y-2 text-left w-full">
                <p className="text-sm font-chinese text-terminal-text">
                  ✓ WSL2 完整安裝指南
                </p>
                <p className="text-sm font-chinese text-terminal-text">
                  ✓ Windows Terminal 設置
                </p>
                <p className="text-sm font-chinese text-terminal-text">
                  ✓ Cursor 與 WSL 整合
                </p>
                <p className="text-sm font-chinese text-terminal-text">
                  ✓ PowerShell 指令教學
                </p>
                <p className="text-sm font-chinese text-terminal-text">
                  ✓ Windows 專屬優化技巧
                </p>
              </div>
              <div className="mt-6 flex items-center gap-2 text-retro-amber">
                <span className="font-chinese text-sm">開始 Windows 教學</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* macOS 選項 */}
        <motion.div
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleOSSelection('mac')}
          className="cursor-pointer group"
        >
          <div className="terminal-window hover:border-retro-cyan transition-all duration-300">
            <div className="flex flex-col items-center py-8 px-6">
              <Apple className="w-24 h-24 text-retro-cyan mb-4 group-hover:animate-pulse" />
              <h2 className="text-2xl font-cute text-retro-cyan mb-3">
                macOS
              </h2>
              <div className="space-y-2 text-left w-full">
                <p className="text-sm font-chinese text-terminal-text">
                  ✓ Homebrew 套件管理
                </p>
                <p className="text-sm font-chinese text-terminal-text">
                  ✓ iTerm2 + Oh My Zsh
                </p>
                <p className="text-sm font-chinese text-terminal-text">
                  ✓ Cursor 原生整合
                </p>
                <p className="text-sm font-chinese text-terminal-text">
                  ✓ macOS 終端機指令
                </p>
                <p className="text-sm font-chinese text-terminal-text">
                  ✓ 開發環境最佳化
                </p>
              </div>
              <div className="mt-6 flex items-center gap-2 text-retro-cyan">
                <span className="font-chinese text-sm">開始 macOS 教學</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 說明文字 */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-12 text-center max-w-2xl"
      >
        <div className="terminal-window bg-opacity-50 p-6">
          <h3 className="text-sm font-chinese text-retro-green mb-3">
            為什麼需要選擇作業系統？
          </h3>
          <p className="text-xs font-chinese text-gray-400 mb-2">
            不同作業系統的開發環境設置方式有很大差異。
          </p>
          <p className="text-xs font-chinese text-gray-400 mb-2">
            Windows 使用者需要設置 WSL2 來獲得 Linux 環境。
          </p>
          <p className="text-xs font-mono text-gray-400">
            macOS 使用者則可以直接使用原生的 Unix 環境。
          </p>
        </div>
      </motion.div>

      {/* 返回按鈕 */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        onClick={() => navigate('/')}
        className="mt-8 text-sm font-chinese text-gray-500 hover:text-amber-500 transition-colors"
      >
        ← 返回首頁
      </motion.button>
    </motion.div>
  );
};

export default OSSelection;