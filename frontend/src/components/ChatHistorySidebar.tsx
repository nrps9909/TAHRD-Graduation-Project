/**
 * ChatHistorySidebar - 對話歷史記錄側邊欄組件
 * 類似 GPT 的對話歷史側邊欄
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiTrash2, FiMessageSquare, FiPlus } from 'react-icons/fi';

interface ChatSession {
  id: string;
  sessionId: string;
  title: string;
  lastActiveAt: string;
  totalMessages?: number;
  totalQueries?: number;
}

interface ChatHistorySidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onNewChat: () => void;
  isOpen: boolean;
  onToggle: () => void;
  color?: 'hijiki' | 'tororo'; // 黑噗噗或白噗噗主題色
  loading?: boolean; // 加載狀態
  error?: Error | null; // 錯誤狀態
}

export const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onDeleteSession,
  onNewChat,
  isOpen,
  onToggle,
  color = 'hijiki',
  loading = false,
  error = null,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const themeColors = {
    hijiki: {
      bg: 'bg-gray-900/95',
      hover: 'hover:bg-gray-800',
      active: 'bg-gray-700',
      text: 'text-white',
      textDim: 'text-gray-400',
      border: 'border-gray-700',
      accent: 'text-purple-400',
    },
    tororo: {
      bg: 'bg-white/95',
      hover: 'hover:bg-gray-100',
      active: 'bg-blue-50',
      text: 'text-gray-900',
      textDim: 'text-gray-600',
      border: 'border-gray-200',
      accent: 'text-blue-500',
    },
  };

  const theme = themeColors[color];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();

    // 正確計算日期差異：將時間歸零到當天 00:00:00
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.floor((today.getTime() - compareDate.getTime()) / (1000 * 60 * 60 * 24));

    // 格式化時間 (HH:MM)
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const time = `${hours}:${minutes}`;

    // 今天：顯示「今天 HH:MM」
    if (diffDays === 0) {
      return `今天 ${time}`;
    }

    // 昨天：顯示「昨天 HH:MM」
    if (diffDays === 1) {
      return `昨天 ${time}`;
    }

    // 7天內：顯示「X天前 HH:MM」
    if (diffDays < 7) {
      return `${diffDays}天前 ${time}`;
    }

    // 今年：顯示「M月D日 HH:MM」
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    const currentYear = now.getFullYear();

    if (year === currentYear) {
      return `${month}月${day}日 ${time}`;
    }

    // 其他：顯示「YYYY/M/D HH:MM」
    return `${year}/${month}/${day} ${time}`;
  };

  return (
    <>
      {/* Toggle Button */}
      {!isOpen && (
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={onToggle}
          className={`fixed left-4 top-20 z-40 p-3 rounded-full ${theme.bg} ${theme.text} shadow-lg ${theme.hover} transition-all`}
        >
          <FiMessageSquare size={20} />
        </motion.button>
      )}

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed left-0 top-0 h-full w-80 ${theme.bg} backdrop-blur-md shadow-2xl z-50 flex flex-col border-r ${theme.border}`}
          >
            {/* Header */}
            <div className={`p-4 border-b ${theme.border} flex items-center justify-between`}>
              <h2 className={`text-lg font-bold ${theme.text}`}>對話歷史</h2>
              <button
                onClick={onToggle}
                className={`${theme.textDim} ${theme.hover} p-2 rounded-lg transition-colors`}
              >
                ✕
              </button>
            </div>

            {/* New Chat Button */}
            <div className="p-4">
              <button
                onClick={onNewChat}
                className={`w-full flex items-center justify-center gap-2 p-3 ${theme.hover} rounded-lg transition-all ${theme.text} border ${theme.border}`}
              >
                <FiPlus size={18} />
                <span className="font-medium">新對話</span>
              </button>
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
              {loading ? (
                <div className={`text-center py-8 ${theme.textDim}`}>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current mx-auto mb-2"></div>
                  <p>載入中...</p>
                </div>
              ) : error ? (
                <div className={`text-center py-8 text-red-400`}>
                  <p>載入失敗</p>
                  <p className="text-xs mt-2">{error.message}</p>
                </div>
              ) : sessions.length === 0 ? (
                <div className={`text-center py-8 ${theme.textDim}`}>
                  <FiMessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                  <p>還沒有對話記錄</p>
                  <p className="text-xs mt-2">開始一段新對話吧！</p>
                </div>
              ) : (
                sessions.map((session) => {
                  const isActive = session.sessionId === currentSessionId;
                  const isHovered = hoveredId === session.id;

                  return (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      onMouseEnter={() => setHoveredId(session.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={() => onSelectSession(session.sessionId)}
                      className={`
                        relative px-2.5 py-1.5 rounded-lg cursor-pointer transition-all group hover:scale-[1.01]
                        ${isActive ? theme.active : theme.hover}
                        ${theme.text}
                      `}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-xs truncate">
                            {session.title}
                          </h3>
                          <div className={`text-[10px] ${theme.textDim} flex items-center gap-1.5 mt-0.5 opacity-70`}>
                            <span>{formatDate(session.lastActiveAt)}</span>
                            {(session.totalMessages || session.totalQueries) && (
                              <>
                                <span>•</span>
                                <span>{session.totalMessages || session.totalQueries} 則</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Delete Button */}
                        <AnimatePresence>
                          {isHovered && (
                            <motion.button
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteSession(session.sessionId);
                              }}
                              className="p-1 hover:bg-red-500/20 rounded transition-colors text-red-500"
                            >
                              <FiTrash2 size={12} />
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onToggle}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>
    </>
  );
};
