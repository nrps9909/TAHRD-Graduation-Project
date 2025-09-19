import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';

export const useKeyboardShortcuts = () => {
  const navigate = useNavigate();
  const { resetGame } = useGameStore();

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // 忽略在輸入框中的按鍵
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl/Cmd + 組合鍵
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'h':
            // 回到首頁
            e.preventDefault();
            navigate('/');
            break;
          case 'r':
            // 重置遊戲（需要確認）
            e.preventDefault();
            if (window.confirm('確定要重置所有進度嗎？')) {
              resetGame();
              navigate('/');
            }
            break;
          case 's':
            // 保存進度（自動保存，顯示提示）
            e.preventDefault();
            showSaveNotification();
            break;
          case '/':
            // 顯示快捷鍵幫助
            e.preventDefault();
            showShortcutHelp();
            break;
        }
      }

      // 單鍵快捷鍵
      switch (e.key.toLowerCase()) {
        case '?':
          // 顯示幫助
          if (!e.ctrlKey && !e.metaKey) {
            showShortcutHelp();
          }
          break;
        case 'escape':
          // 關閉彈窗或返回
          handleEscape();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [navigate, resetGame]);
};

// 顯示保存通知
const showSaveNotification = () => {
  const notification = document.createElement('div');
  notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-full shadow-lg z-50 animate-slide-in';
  notification.innerHTML = '✅ 進度已自動保存！';
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('animate-fade-out');
    setTimeout(() => notification.remove(), 300);
  }, 2000);
};

// 顯示快捷鍵幫助
const showShortcutHelp = () => {
  const helpModal = document.getElementById('shortcut-help');
  if (helpModal) {
    helpModal.classList.toggle('hidden');
  } else {
    createHelpModal();
  }
};

// 處理 Escape 鍵
const handleEscape = () => {
  const helpModal = document.getElementById('shortcut-help');
  if (helpModal && !helpModal.classList.contains('hidden')) {
    helpModal.classList.add('hidden');
  }
};

// 創建幫助模態框
const createHelpModal = () => {
  const modal = document.createElement('div');
  modal.id = 'shortcut-help';
  modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-white rounded-3xl p-8 max-w-md shadow-2xl">
      <h3 class="text-2xl font-bold text-cat-purple mb-4 chinese-text">
        🎹 鍵盤快捷鍵
      </h3>
      <div class="space-y-2 text-gray-700">
        <div class="flex justify-between">
          <span class="chinese-text">回到首頁</span>
          <kbd class="px-2 py-1 bg-gray-100 rounded">Ctrl+H</kbd>
        </div>
        <div class="flex justify-between">
          <span class="chinese-text">重置遊戲</span>
          <kbd class="px-2 py-1 bg-gray-100 rounded">Ctrl+R</kbd>
        </div>
        <div class="flex justify-between">
          <span class="chinese-text">保存進度</span>
          <kbd class="px-2 py-1 bg-gray-100 rounded">Ctrl+S</kbd>
        </div>
        <div class="flex justify-between">
          <span class="chinese-text">顯示幫助</span>
          <kbd class="px-2 py-1 bg-gray-100 rounded">?</kbd>
        </div>
        <div class="flex justify-between">
          <span class="chinese-text">關閉彈窗</span>
          <kbd class="px-2 py-1 bg-gray-100 rounded">ESC</kbd>
        </div>
      </div>
      <button
        onclick="this.closest('#shortcut-help').classList.add('hidden')"
        class="mt-6 w-full px-4 py-2 bg-gradient-to-r from-cat-pink to-cat-purple text-white rounded-full font-bold hover:scale-105 transition-transform"
      >
        關閉
      </button>
    </div>
  `;
  document.body.appendChild(modal);

  // 點擊背景關閉
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
    }
  });
};