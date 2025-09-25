import React, { useState, useCallback } from 'react';
import '../styles/menu.css';
import '../styles/click-effects.css';
import { useClickSound } from './ClickEffects';

interface MenuOption {
  id: string;
  title: string;
  iconPath: string;
}

const MainMenu: React.FC = () => {
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);
  const [clickedOption, setClickedOption] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [activeView, setActiveView] = useState<string>('menu'); // 'menu' | 'game' | 'world' | 'social' | 'settings'
  const [clickEffects, setClickEffects] = useState<{id: number; x: number; y: number; type: string}[]>([]);
  const { playClickSound, playHoverSound } = useClickSound();

  const menuOptions: MenuOption[] = [
    {
      id: 'game',
      title: 'Game',
      iconPath: '/icons/game-icon.png'
    },
    {
      id: 'world',
      title: 'World',
      iconPath: '/icons/world-icon.png'
    },
    {
      id: 'social',
      title: 'Social',
      iconPath: '/icons/social-icon.png'
    },
    {
      id: 'settings',
      title: 'Settings',
      iconPath: '/icons/settings-icon.png'
    }
  ];

  const handleOptionClick = (optionId: string, event?: React.MouseEvent) => {
    playClickSound();
    setClickedOption(optionId);
    
    // Add visual effect at click position
    if (event) {
      const rect = event.currentTarget.getBoundingClientRect();
      const effect = {
        id: Date.now(),
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        type: 'success'
      };
      setClickEffects(prev => [...prev, effect]);
      
      // Remove effect after animation
      setTimeout(() => {
        setClickEffects(prev => prev.filter(e => e.id !== effect.id));
      }, 1000);
    }
    
    setTimeout(() => {
      setClickedOption(null);
      setActiveView(optionId); // Switch to selected view
    }, 300);
  };

  const handleHover = useCallback((optionId: string | null) => {
    if (optionId && optionId !== hoveredOption) {
      playHoverSound();
    }
    setHoveredOption(optionId);
  }, [hoveredOption, playHoverSound]);

  const handleBackToMenu = () => {
    playClickSound();
    setActiveView('menu');
  };

  // Keyboard navigation support
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If not in menu view, ESC goes back to menu
      if (activeView !== 'menu' && e.key === 'Escape') {
        e.preventDefault();
        handleBackToMenu();
        return;
      }

      // Menu navigation only works in menu view
      if (activeView !== 'menu') return;

      const menuItemsCount = menuOptions.length;
      let currentIndex = focusedIndex === -1 ? 0 : focusedIndex;
      
      switch(e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (currentIndex > 1) currentIndex -= 2;
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (currentIndex < 2) currentIndex += 2;
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (currentIndex % 2 !== 0) currentIndex -= 1;
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (currentIndex % 2 === 0 && currentIndex < 3) currentIndex += 1;
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (currentIndex >= 0 && currentIndex < menuItemsCount) {
            handleOptionClick(menuOptions[currentIndex].id, undefined);
          }
          return;
        case 'Escape':
        case 'q':
        case 'Q':
          // Close menu on escape or Q
          return;
      }
      
      setFocusedIndex(currentIndex);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex, menuOptions, activeView]);

  // Content views for each menu option
  const renderContent = () => {
    switch(activeView) {
      case 'game':
        return (
          <div className="content-view">
            <button onClick={handleBackToMenu} className="back-button">← 返回</button>
            <h2>遊戲模式</h2>
            <div className="content-grid">
              <div className="content-card">
                <h3>🎮 單人模式</h3>
                <p>開始你的個人冒險</p>
              </div>
              <div className="content-card">
                <h3>👥 多人模式</h3>
                <p>與朋友一起遊玩</p>
              </div>
              <div className="content-card">
                <h3>🏆 挑戰模式</h3>
                <p>測試你的技能</p>
              </div>
              <div className="content-card">
                <h3>📚 教學模式</h3>
                <p>學習遊戲基礎</p>
              </div>
            </div>
          </div>
        );
      
      case 'world':
        return (
          <div className="content-view">
            <button onClick={handleBackToMenu} className="back-button">← 返回</button>
            <h2>探索世界</h2>
            <div className="content-grid">
              <div className="content-card">
                <h3>🏝️ 我的島嶼</h3>
                <p>管理你的家園</p>
              </div>
              <div className="content-card">
                <h3>✈️ 拜訪朋友</h3>
                <p>探索其他島嶼</p>
              </div>
              <div className="content-card">
                <h3>🗺️ 世界地圖</h3>
                <p>查看所有地點</p>
              </div>
              <div className="content-card">
                <h3>🌟 特殊活動</h3>
                <p>參加限時活動</p>
              </div>
            </div>
          </div>
        );
      
      case 'social':
        return (
          <div className="content-view">
            <button onClick={handleBackToMenu} className="back-button">← 返回</button>
            <h2>社交功能</h2>
            <div className="content-grid">
              <div className="content-card">
                <h3>👫 好友列表</h3>
                <p>查看線上好友</p>
              </div>
              <div className="content-card">
                <h3>💬 聊天室</h3>
                <p>與朋友交流</p>
              </div>
              <div className="content-card">
                <h3>📮 郵件系統</h3>
                <p>收發禮物和信件</p>
              </div>
              <div className="content-card">
                <h3>🎉 社區活動</h3>
                <p>參與社區互動</p>
              </div>
            </div>
          </div>
        );
      
      case 'settings':
        return (
          <div className="content-view">
            <button onClick={handleBackToMenu} className="back-button">← 返回</button>
            <h2>遊戲設定</h2>
            <div className="settings-list">
              <div className="setting-item">
                <span>🔊 音量</span>
                <input type="range" min="0" max="100" defaultValue="50" />
              </div>
              <div className="setting-item">
                <span>🎵 背景音樂</span>
                <label className="toggle">
                  <input type="checkbox" defaultChecked />
                  <span className="slider"></span>
                </label>
              </div>
              <div className="setting-item">
                <span>🔔 音效</span>
                <label className="toggle">
                  <input type="checkbox" defaultChecked />
                  <span className="slider"></span>
                </label>
              </div>
              <div className="setting-item">
                <span>🌐 語言</span>
                <select>
                  <option>繁體中文</option>
                  <option>English</option>
                  <option>日本語</option>
                </select>
              </div>
              <div className="setting-item">
                <span>🎮 控制方式</span>
                <select>
                  <option>鍵盤</option>
                  <option>手把</option>
                  <option>觸控</option>
                </select>
              </div>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="menu-grid">
            {menuOptions.map((option, index) => (
              <div
                key={option.id}
                className={`menu-item ${clickedOption === option.id ? 'clicked pressed' : ''} ${
                  hoveredOption === option.id || focusedIndex === index ? 'hovered glow' : ''
                } ${focusedIndex === index ? 'focused' : ''}`}
                onMouseEnter={() => handleHover(option.id)}
                onMouseLeave={() => handleHover(null)}
                onClick={(e) => handleOptionClick(option.id, e)}
              >
                <div 
                  className="icon"
                  style={{
                    backgroundImage: `url('${option.iconPath}')`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center'
                  }}
                />
                <h3>{option.title}</h3>
              </div>
            ))}
          </div>
        );
    }
  };

  return (
    <div className="menu-overlay">
      <div className="menu-container">
        {/* Sparkle effects */}
        <div className="sparkles">
          <div className="sparkle">✨</div>
          <div className="sparkle">⭐</div>
          <div className="sparkle">✨</div>
          <div className="sparkle">⭐</div>
        </div>
        
        {renderContent()}
        
        {/* Click effects */}
        {clickEffects.map(effect => (
          <div
            key={effect.id}
            className="success-check"
            style={{
              left: effect.x,
              top: effect.y,
              transform: 'translate(-50%, -50%)'
            }}
          >
            ✨
          </div>
        ))}
      </div>
    </div>
  );
};

export default MainMenu;