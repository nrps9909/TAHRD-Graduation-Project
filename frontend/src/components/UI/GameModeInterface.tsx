import React from 'react'
import { useGameStore } from '@/stores/gameStore'

export const GameModeInterface: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { setGameMode } = useGameStore()

  const handleModeSelect = (modeId: string) => {
    setGameMode(modeId as any)
    onClose()
    
    const modeNames = {
      'single': '單人模式',
      'multiplayer': '多人模式',
      'challenge': '挑戰模式',
      'tutorial': '教學模式'
    }
    
    const descriptions = {
      'single': '開始你的個人冒險，在心語小鎮自由探索，與NPC建立深度友誼。',
      'multiplayer': '邀請好友一起遊玩，共同體驗這個溫暖的世界，分享美好時光。',
      'challenge': '挑戰各種任務和謎題，測試你的技能，獲得獨特的成就獎勵。',
      'tutorial': '新手教學模式，通過互動式指導快速掌握遊戲的各種玩法。'
    }
    
    const name = modeNames[modeId as keyof typeof modeNames]
    const desc = descriptions[modeId as keyof typeof descriptions]
    
    setTimeout(() => {
      const confirmed = confirm(`${desc}\n\n確定要開始 ${name} 嗎？`)
      if (confirmed) {
        alert(`正在啟動 ${name}...`)
      }
    }, 300)
  }

  const gameModes = [
    { id: 'single', icon: '🎮', title: '單人模式', desc: '開始個人冒險' },
    { id: 'multiplayer', icon: '👥', title: '多人模式', desc: '與朋友同樂', isSpecial: true },
    { id: 'challenge', icon: '🏆', title: '挑戰模式', desc: '測試你的技能' },
    { id: 'tutorial', icon: '📚', title: '教學模式', desc: '學習遊戲基礎' }
  ]

  return (
    <>
      {/* Full page container with gradient background */}
      <div 
        className="fixed inset-0 z-50"
        style={{
          fontFamily: 'Arial, sans-serif',
          background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)', // Purple theme
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          width: '100vw',
          position: 'fixed',
          top: 0,
          left: 0
        }}
        onClick={onClose}
      >
        {/* Menu Container */}
        <div 
          className="gamemode-menu-container"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sparkles */}
          <div className="sparkles">
            <div className="sparkle">🎮</div>
            <div className="sparkle">✨</div>
            <div className="sparkle">🎮</div>
            <div className="sparkle">✨</div>
          </div>
          
          {/* Menu Items */}
          {gameModes.map((mode) => (
            <div
              key={mode.id}
              className={`gamemode-menu-item ${mode.isSpecial ? 'special' : ''}`}
              onClick={() => handleModeSelect(mode.id)}
            >
              <div className="icon">{mode.icon}</div>
              <h3>{mode.title}</h3>
              <p>{mode.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Game mode menu specific CSS */}
      <style>{`
        .gamemode-menu-container {
          width: 800px;
          height: 600px;
          background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
          border-radius: 20px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: 1fr 1fr;
          gap: 40px;
          padding: 60px;
          position: relative;
          overflow: hidden;
        }

        .gamemode-menu-container::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          pointer-events: none;
        }

        .gamemode-menu-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: white;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 8px 25px rgba(0,0,0,0.08);
          position: relative;
          overflow: hidden;
          text-align: center;
        }

        .gamemode-menu-item::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(45deg, transparent, rgba(255,255,255,0.3), transparent);
          transform: translateX(-100%);
          transition: transform 0.6s ease;
        }

        .gamemode-menu-item:hover::before {
          transform: translateX(100%);
        }

        .gamemode-menu-item:hover {
          transform: translateY(-8px) scale(1.05);
          box-shadow: 0 15px 35px rgba(0,0,0,0.15);
        }

        .gamemode-menu-item:active {
          transform: translateY(-4px) scale(1.02);
        }

        .gamemode-menu-item.special {
          background: linear-gradient(135deg, #fff9c4 0%, #fef08a 50%, #facc15 100%);
          border: 2px solid #eab308;
          position: relative;
        }

        .gamemode-menu-item.special::after {
          content: '✨';
          position: absolute;
          top: 15px;
          right: 15px;
          font-size: 1.5rem;
          animation: sparkle 2s infinite ease-in-out;
        }

        .gamemode-menu-item .icon {
          font-size: 4rem;
          margin-bottom: 15px;
          transition: transform 0.3s ease;
        }

        .gamemode-menu-item:hover .icon {
          transform: scale(1.1) rotate(5deg);
        }

        .gamemode-menu-item h3 {
          font-size: 1.5rem;
          font-weight: bold;
          color: #7c3aed;
          margin: 0 0 8px 0;
          letter-spacing: 1px;
        }

        .gamemode-menu-item.special h3 {
          color: #92400e;
        }

        .gamemode-menu-item p {
          font-size: 1rem;
          color: #8b5cf6;
          margin: 0;
          line-height: 1.4;
        }

        .gamemode-menu-item.special p {
          color: #a16207;
        }

        .gamemode-menu-container .sparkles {
          position: absolute;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .gamemode-menu-container .sparkle {
          position: absolute;
          color: #8b5cf6;
          font-size: 12px;
          animation: sparkle-bg 2s infinite ease-in-out;
        }

        .gamemode-menu-container .sparkle:nth-child(1) { top: 10%; left: 15%; animation-delay: 0s; }
        .gamemode-menu-container .sparkle:nth-child(2) { top: 20%; right: 20%; animation-delay: 0.5s; }
        .gamemode-menu-container .sparkle:nth-child(3) { bottom: 15%; left: 25%; animation-delay: 1s; }
        .gamemode-menu-container .sparkle:nth-child(4) { bottom: 25%; right: 15%; animation-delay: 1.5s; }

        @keyframes sparkle {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }

        @keyframes sparkle-bg {
          0%, 100% { opacity: 0.6; transform: translateY(0px); }
          50% { opacity: 1; transform: translateY(-5px); }
        }

        @media (max-width: 900px) {
          .gamemode-menu-container {
            width: 90vw;
            height: 67.5vw;
            padding: 40px;
            gap: 30px;
          }
          
          .gamemode-menu-item .icon {
            font-size: 3rem;
          }
          
          .gamemode-menu-item h3 {
            font-size: 1.3rem;
          }

          .gamemode-menu-item p {
            font-size: 0.9rem;
          }
        }
      `}</style>
    </>
  )
}