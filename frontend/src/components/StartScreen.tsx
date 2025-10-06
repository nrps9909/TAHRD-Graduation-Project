import React from 'react'

interface StartScreenProps {
  onStartGame: () => void
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStartGame }) => {
  const showInstructions = () => {
    const modal = document.getElementById('instructionsModal')
    if (modal) {
      modal.style.display = 'block'
      document.body.style.overflow = 'hidden'
    }
  }

  const closeInstructions = () => {
    const modal = document.getElementById('instructionsModal')
    if (modal) {
      modal.style.display = 'none'
      document.body.style.overflow = 'auto'
    }
  }

  const handleStartGame = () => {
    // 創建載入效果
    const loadingDiv = document.createElement('div')
    loadingDiv.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(76, 175, 80, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        color: white;
        font-size: 1.5rem;
        flex-direction: column;
      ">
        <div style="margin-bottom: 20px; font-size: 3rem;">🌊</div>
        <div>正在載入心語小鎮...</div>
        <div style="margin-top: 10px; font-size: 1rem; opacity: 0.8;">請稍候片刻</div>
      </div>
    `
    document.body.appendChild(loadingDiv)
    
    // 2秒後調用回調函數進入遊戲
    setTimeout(() => {
      document.body.removeChild(loadingDiv)
      onStartGame()
    }, 2000)
  }

  React.useEffect(() => {
    // 鍵盤快捷鍵
    const handleKeyDown = (e: KeyboardEvent) => {
      switch(e.key) {
        case 'Enter':
          e.preventDefault()
          handleStartGame()
          break
        case 'h':
        case 'H':
        case '?':
          e.preventDefault()
          showInstructions()
          break
        case 'Escape':
          e.preventDefault()
          closeInstructions()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  React.useEffect(() => {
    // 點擊彈窗外部關閉
    const handleModalClick = (event: MouseEvent) => {
      const modal = document.getElementById('instructionsModal')
      if (event.target === modal) {
        closeInstructions()
      }
    }

    window.addEventListener('click', handleModalClick)
    return () => window.removeEventListener('click', handleModalClick)
  }, [])

  return (
    <div className="start-screen-container">
      <style>{`
        .start-screen-container {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 25%, #f1f8e9 50%, #fff3e0 75%, #fce4ec 100%);
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          position: relative;
        }

        /* 浮島動畫背景 */
        .floating-islands {
          position: absolute;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1;
        }

        .island {
          position: absolute;
          animation: float-island 4s ease-in-out infinite;
          opacity: 0.6;
        }

        .island-base {
          width: clamp(50px, 8vw, 80px);
          height: clamp(25px, 4vw, 40px);
          background: linear-gradient(145deg, #8BC34A, #4CAF50);
          border-radius: clamp(25px, 5vw, 50px) clamp(25px, 5vw, 50px) clamp(10px, 2vw, 20px) clamp(10px, 2vw, 20px);
          position: relative;
        }

        .island-base::before {
          content: '';
          position: absolute;
          bottom: clamp(-12px, -2vw, -20px);
          left: clamp(6px, 1vw, 10px);
          width: clamp(40px, 6vw, 60px);
          height: clamp(20px, 3vw, 30px);
          background: linear-gradient(145deg, #795548, #5D4037);
          border-radius: 0 0 clamp(18px, 3vw, 30px) clamp(18px, 3vw, 30px);
        }

        .mini-tree {
          position: absolute;
          top: clamp(-10px, -1.5vw, -15px);
          left: 50%;
          transform: translateX(-50%);
          width: clamp(5px, 0.8vw, 8px);
          height: clamp(12px, 2vw, 20px);
          background: #5D4037;
          border-radius: clamp(2px, 0.4vw, 4px);
        }

        .mini-tree::before {
          content: '';
          position: absolute;
          top: clamp(-6px, -1vw, -10px);
          left: clamp(-4px, -0.6vw, -6px);
          width: clamp(12px, 2vw, 20px);
          height: clamp(12px, 2vw, 20px);
          background: #4CAF50;
          border-radius: 50%;
        }

        .island:nth-child(1) {
          top: 15%;
          left: 10%;
          animation-delay: 0s;
        }

        .island:nth-child(2) {
          top: 25%;
          right: 15%;
          animation-delay: 1s;
          transform: scale(0.8);
        }

        .island:nth-child(3) {
          top: 60%;
          left: 20%;
          animation-delay: 2s;
          transform: scale(1.2);
        }

        .island:nth-child(4) {
          top: 70%;
          right: 25%;
          animation-delay: 3s;
          transform: scale(0.9);
        }

        @keyframes float-island {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-8px) rotate(1deg); }
          50% { transform: translateY(-15px) rotate(0deg); }
          75% { transform: translateY(-8px) rotate(-1deg); }
        }

        /* 對話泡泡裝飾 */
        .chat-bubbles {
          position: absolute;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 2;
        }

        .bubble {
          position: absolute;
          background: rgba(255, 255, 255, 0.8);
          border-radius: clamp(10px, 2vw, 20px);
          padding: clamp(6px, 0.8vw, 8px) clamp(8px, 1.2vw, 12px);
          font-size: clamp(10px, 1.2vw, 12px);
          color: #666;
          animation: bubble-float 6s ease-in-out infinite;
          box-shadow: 0 clamp(2px, 0.4vw, 4px) clamp(6px, 1vw, 10px) rgba(0,0,0,0.1);
        }

        .bubble::after {
          content: '';
          position: absolute;
          bottom: clamp(-6px, -0.8vw, -8px);
          left: clamp(12px, 2vw, 20px);
          width: 0;
          height: 0;
          border-left: clamp(6px, 0.8vw, 8px) solid transparent;
          border-right: clamp(6px, 0.8vw, 8px) solid transparent;
          border-top: clamp(6px, 0.8vw, 8px) solid rgba(255, 255, 255, 0.8);
        }

        .bubble:nth-child(1) {
          top: 20%;
          left: 25%;
          animation-delay: 0s;
        }

        .bubble:nth-child(2) {
          top: 35%;
          right: 20%;
          animation-delay: 2s;
        }

        .bubble:nth-child(3) {
          bottom: 30%;
          left: 15%;
          animation-delay: 4s;
        }

        @keyframes bubble-float {
          0%, 100% { 
            transform: translateY(0px) scale(1); 
            opacity: 0.6; 
          }
          50% { 
            transform: translateY(-20px) scale(1.05); 
            opacity: 1; 
          }
        }

        /* 主選單容器 */
        .main-container {
          position: relative;
          z-index: 100;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        /* Logo 區域 */
        .logo-section {
          margin-bottom: clamp(15px, 2vh, 25px);
          text-align: center;
          animation: gentle-bounce 3s ease-in-out infinite;
          background: radial-gradient(circle at center, rgba(76, 175, 80, 0.1) 0%, transparent 70%);
          border-radius: 50%;
          padding: clamp(8px, 1.5vw, 15px);
        }

        .game-logo {
          width: clamp(150px, 25vw, 280px);
          height: clamp(150px, 25vw, 280px);
          margin: 0 auto clamp(15px, 2vh, 25px);
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logo-image {
          width: 90%;
          height: 90%;
          background-image: url('./photo/logo.png');
          background-size: cover;
          background-repeat: no-repeat;
          background-position: center;
          border-radius: clamp(15px, 2vw, 30px);
          filter: drop-shadow(0 15px 35px rgba(0,0,0,0.25));
          animation: logo-glow 4s ease-in-out infinite;
          border: clamp(3px, 0.5vw, 6px) solid rgba(76, 175, 80, 0.8);
          box-shadow:
            0 0 0 clamp(2px, 0.3vw, 3px) rgba(255, 255, 255, 0.3),
            0 clamp(10px, 2vh, 20px) clamp(20px, 3vh, 40px) rgba(76, 175, 80, 0.2),
            inset 0 2px 0 rgba(255, 255, 255, 0.2);
          transition: all 0.3s ease;
        }

        .logo-image:hover {
          transform: scale(1.05);
          filter: drop-shadow(0 20px 45px rgba(0,0,0,0.3));
          border-color: rgba(76, 175, 80, 1);
        }

        @keyframes logo-glow {
          0%, 100% { 
            filter: drop-shadow(0 15px 35px rgba(0,0,0,0.25));
            box-shadow: 
              0 0 0 3px rgba(255, 255, 255, 0.3),
              0 20px 40px rgba(76, 175, 80, 0.2),
              inset 0 2px 0 rgba(255, 255, 255, 0.2);
          }
          50% { 
            filter: drop-shadow(0 20px 45px rgba(76, 175, 80, 0.4));
            box-shadow: 
              0 0 0 3px rgba(255, 255, 255, 0.5),
              0 25px 50px rgba(76, 175, 80, 0.35),
              inset 0 2px 0 rgba(255, 255, 255, 0.3);
          }
        }

        .game-title {
          font-size: clamp(1.8rem, 5vw, 3.2rem);
          font-weight: bold;
          background: linear-gradient(135deg, #4A7C59 0%, #2E7D32 50%, #1B5E20 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
          letter-spacing: clamp(1px, 0.4vw, 2px);
          margin: 0;
        }

        @keyframes gentle-bounce {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        /* 選單按鈕 */
        .menu-buttons {
          display: flex;
          flex-direction: column;
          gap: clamp(12px, 2vh, 20px);
          align-items: center;
        }

        .menu-btn {
          background: linear-gradient(145deg, #81C784 0%, #66BB6A 50%, #4CAF50 100%);
          border: clamp(2px, 0.3vw, 3px) solid #2E7D32;
          border-radius: clamp(25px, 4vw, 50px);
          padding: clamp(10px, 1.5vh, 15px) clamp(25px, 3.5vw, 40px);
          font-size: clamp(1.1rem, 1.8vw, 1.4rem);
          font-weight: bold;
          color: white;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 clamp(3px, 0.8vh, 6px) clamp(8px, 1.5vh, 15px) rgba(76, 175, 80, 0.3), inset 0 2px 0 rgba(255,255,255,0.2);
          font-family: inherit;
          min-width: clamp(180px, 25vw, 260px);
          position: relative;
          overflow: hidden;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
        }

        .menu-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          transition: left 0.6s ease;
        }

        .menu-btn:hover::before {
          left: 100%;
        }

        .menu-btn:hover {
          transform: translateY(clamp(-2px, -0.4vh, -3px)) scale(1.03);
          box-shadow: 0 clamp(6px, 1.2vh, 10px) clamp(15px, 2.5vh, 25px) rgba(76, 175, 80, 0.4), inset 0 2px 0 rgba(255,255,255,0.3);
          border-color: #1B5E20;
        }

        .menu-btn:active {
          transform: translateY(clamp(-1px, -0.2vh, -1px)) scale(1.01);
          box-shadow: 0 clamp(3px, 0.6vh, 5px) clamp(8px, 1.2vh, 12px) rgba(76, 175, 80, 0.3);
        }

        .btn-icon {
          margin-right: clamp(6px, 0.8vw, 10px);
          font-size: clamp(1em, 1.3vw, 1.15em);
          vertical-align: middle;
        }

        /* 遊戲說明彈窗 */
        .modal {
          display: none;
          position: fixed;
          z-index: 1000;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(8px);
        }

        .modal-content {
          position: relative;
          background: linear-gradient(145deg, #F1F8E9 0%, #E8F5E8 100%);
          margin: 2vh auto;
          padding: clamp(18px, 3vw, 30px);
          width: 90%;
          max-width: 800px;
          max-height: 85vh;
          border-radius: clamp(12px, 2.5vw, 25px);
          box-shadow: 0 clamp(12px, 2vh, 20px) clamp(25px, 4vh, 40px) rgba(0, 0, 0, 0.3);
          border: clamp(2px, 0.3vw, 3px) solid #4CAF50;
          animation: modalSlideIn 0.4s ease;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: #4CAF50 rgba(76, 175, 80, 0.1);
        }

        .modal-content::-webkit-scrollbar {
          width: 8px;
        }

        .modal-content::-webkit-scrollbar-track {
          background: rgba(76, 175, 80, 0.1);
          border-radius: 10px;
        }

        .modal-content::-webkit-scrollbar-thumb {
          background: #4CAF50;
          border-radius: 10px;
        }

        .modal-content::-webkit-scrollbar-thumb:hover {
          background: #2E7D32;
        }

        @keyframes modalSlideIn {
          from { opacity: 0; transform: translateY(-50px) scale(0.9); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .close {
          position: absolute;
          top: clamp(15px, 2vh, 20px);
          right: clamp(20px, 2.5vw, 25px);
          color: #2E7D32;
          font-size: clamp(24px, 3vw, 32px);
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          width: clamp(35px, 4.5vw, 45px);
          height: clamp(35px, 4.5vw, 45px);
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }

        .close:hover {
          background: rgba(46, 125, 50, 0.1);
          transform: scale(1.1);
        }

        .modal h2 {
          color: #2E7D32;
          margin-bottom: clamp(12px, 2vh, 20px);
          font-size: clamp(1.4rem, 2.2vw, 2rem);
          text-align: center;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
        }

        .modal p {
          color: #388E3C;
          line-height: 1.6;
          margin-bottom: clamp(10px, 1.5vh, 15px);
          font-size: clamp(0.85rem, 1.1vw, 1rem);
        }

        .modal ul {
          color: #388E3C;
          margin-left: clamp(12px, 2vw, 20px);
          margin-bottom: clamp(12px, 1.8vh, 18px);
        }

        .modal li {
          margin-bottom: clamp(6px, 0.8vh, 8px);
          line-height: 1.5;
          font-size: clamp(0.8rem, 1vw, 0.95rem);
        }

        .modal strong {
          color: #1B5E20;
        }
      `}</style>

      {/* 浮島背景 */}
      <div className="floating-islands">
        <div className="island">
          <div className="island-base">
            <div className="mini-tree"></div>
          </div>
        </div>
        <div className="island">
          <div className="island-base">
            <div className="mini-tree"></div>
          </div>
        </div>
        <div className="island">
          <div className="island-base">
            <div className="mini-tree"></div>
          </div>
        </div>
        <div className="island">
          <div className="island-base">
            <div className="mini-tree"></div>
          </div>
        </div>
      </div>

      {/* 對話泡泡裝飾 */}
      <div className="chat-bubbles">
        <div className="bubble">Hello!</div>
        <div className="bubble">Welcome</div>
        <div className="bubble">Let's chat!</div>
      </div>

      {/* 主容器 */}
      <div className="main-container">
        {/* Logo 區域 */}
        <div className="logo-section">
          <div className="game-logo">
            <div className="logo-image"></div>
          </div>
          <h1 className="game-title">心語小鎮</h1>
        </div>
        
        {/* 選單按鈕 */}
        <div className="menu-buttons">
          <button className="menu-btn" onClick={handleStartGame}>
            <span className="btn-icon">🚀</span>
            開始遊戲
          </button>
          
          <button className="menu-btn" onClick={showInstructions}>
            <span className="btn-icon">📖</span>
            遊戲說明
          </button>
        </div>
      </div>

      {/* 遊戲說明彈窗 */}
      <div id="instructionsModal" className="modal">
        <div className="modal-content">
          <span className="close" onClick={closeInstructions}>&times;</span>
          <h2>🌟 心語小鎮 遊戲指南</h2>
          
          <p><strong>歡迎來到心語小鎮！在這個充滿溫暖的AI驅動世界中，你將體驗前所未有的治癒冒險。</strong></p>
          
          <p><strong>🎯 遊戲目標：</strong></p>
          <ul>
            <li>與智慧AI NPC建立深度情感連結</li>
            <li>探索美麗的3D島嶼世界</li>
            <li>透過對話獲得內心治癒和成長</li>
            <li>收集回憶花朵，記錄珍貴的友誼時光</li>
          </ul>
          
          <p><strong>🎮 操作方式：</strong></p>
          <ul>
            <li><strong>WASD鍵</strong> - 角色移動</li>
            <li><strong>滑鼠</strong> - 控制視角</li>
            <li><strong>空白鍵</strong> - 與NPC互動對話</li>
            <li><strong>G鍵</strong> - 遊戲模式選單</li>
            <li><strong>X鍵</strong> - 探索世界選單</li>
            <li><strong>C鍵</strong> - 社交功能選單（AI聊天室）</li>
            <li><strong>Z鍵</strong> - 遊戲設定選單</li>
            <li><strong>ESC鍵</strong> - 關閉選單或退出對話</li>
            <li><strong>Tab鍵</strong> - 關閉所有選單</li>
          </ul>
          
          <p><strong>💕 情感治癒系統：</strong></p>
          <ul>
            <li>每個NPC都有獨特的個性和記憶</li>
            <li>真誠的對話會增進彼此的友誼</li>
            <li>分享你的感受，獲得溫暖的回應</li>
            <li>建立持久的友誼關係，體驗成長的喜悅</li>
          </ul>
          
          <p><strong>準備好開始你的心語小鎮治癒之旅了嗎？</strong> 💖✨</p>
        </div>
      </div>
    </div>
  )
}