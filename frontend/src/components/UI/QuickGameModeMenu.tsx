import React, { useEffect, useRef, useState } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { GameModeInterface } from './GameModeInterface'

export const QuickGameModeMenu: React.FC = () => {
  const { 
    showQuickGameModeMenu,
    setShowQuickGameModeMenu,
    setGameMode
  } = useGameStore()

  const menuRef = useRef<HTMLDivElement>(null)
  const [showGameModeInterface, setShowGameModeInterface] = useState(false)

  const selectGameMode = (mode: 'single' | 'multiplayer' | 'exploration' | 'social', event: React.MouseEvent) => {
    const menuItem = event.currentTarget as HTMLElement
    
    // Add click animation
    menuItem.classList.add('clicked')
    setTimeout(() => {
      menuItem.classList.remove('clicked')
    }, 300)
    
    setShowQuickGameModeMenu(false)
    setShowGameModeInterface(true)
  }

  const menuItems = [
    {
      id: 'single',
      title: '單人模式',
      icon: '🎮',
      description: '開始你的個人冒險',
      action: (e: React.MouseEvent) => selectGameMode('single', e)
    },
    {
      id: 'multi',
      title: '多人模式',
      icon: '👥',
      description: '與朋友一起遊玩',
      action: (e: React.MouseEvent) => selectGameMode('multiplayer', e)
    },
    {
      id: 'challenge',
      title: '挑戰模式',
      icon: '🏆',
      description: '測試你的技能',
      isSpecial: true,
      action: (e: React.MouseEvent) => selectGameMode('exploration', e)
    },
    {
      id: 'tutorial',
      title: '教學模式',
      icon: '📚',
      description: '學習遊戲基礎',
      action: (e: React.MouseEvent) => selectGameMode('social', e)
    }
  ]

  // Keyboard event handler
  useEffect(() => {
    if (!showQuickGameModeMenu) return

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      
      switch (key) {
        case '1':
          event.preventDefault()
          selectGameMode('single', { currentTarget: menuRef.current?.children[1] } as any)
          break
        case '2':
          event.preventDefault()
          selectGameMode('multiplayer', { currentTarget: menuRef.current?.children[2] } as any)
          break
        case '3':
          event.preventDefault()
          selectGameMode('exploration', { currentTarget: menuRef.current?.children[3] } as any)
          break
        case '4':
          event.preventDefault()
          selectGameMode('social', { currentTarget: menuRef.current?.children[4] } as any)
          break
        case 'g':
        case 'escape':
          event.preventDefault()
          setShowQuickGameModeMenu(false)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showQuickGameModeMenu])

  if (!showQuickGameModeMenu) return null

  return (
    <>
      {/* Full page container with gradient background */}
      <div 
        className="fixed inset-0 z-50"
        style={{
          fontFamily: 'Arial, sans-serif',
          background: 'linear-gradient(135deg, #f5f3f0 0%, #e8e4df 100%)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          width: '100vw',
          position: 'fixed',
          top: 0,
          left: 0
        }}
        onClick={() => setShowQuickGameModeMenu(false)}
      >
        {/* Menu Container */}
        <div 
          ref={menuRef}
          className="menu-container"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sparkles */}
          <div className="sparkles">
            <div className="sparkle">✨</div>
            <div className="sparkle">⭐</div>
            <div className="sparkle">✨</div>
            <div className="sparkle">⭐</div>
          </div>
          
          {/* Menu Items */}
          {menuItems.map((item) => (
            <div
              key={item.id}
              className={`menu-item ${item.isSpecial ? 'special' : ''}`}
              onClick={item.action}
            >
              <div className="icon">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Exact CSS from gamemode.html */}
      <style>{`
        .menu-container {
          width: 800px;
          height: 600px;
          background: linear-gradient(135deg, #f8f6f3 0%, #ede9e4 100%);
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

        .menu-container::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          pointer-events: none;
        }

        .menu-item {
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

        .menu-item::before {
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

        .menu-item:hover::before {
          transform: translateX(100%);
        }

        .menu-item:hover {
          transform: translateY(-8px) scale(1.05);
          box-shadow: 0 15px 35px rgba(0,0,0,0.15);
        }

        .menu-item:active {
          transform: translateY(-4px) scale(1.02);
        }

        .menu-item.special {
          background: linear-gradient(135deg, #fff9c4 0%, #fef08a 50%, #facc15 100%);
          border: 2px solid #eab308;
          position: relative;
        }

        .menu-item.special::after {
          content: '✨';
          position: absolute;
          top: 15px;
          right: 15px;
          font-size: 1.5rem;
          animation: sparkle 2s infinite ease-in-out;
        }

        @keyframes sparkle {
          0%, 100% { opacity: 1; transform: scale(1) rotate(0deg); }
          50% { opacity: 0.7; transform: scale(1.2) rotate(180deg); }
        }

        .icon {
          font-size: 4rem;
          margin-bottom: 15px;
          transition: transform 0.3s ease;
        }

        .menu-item:hover .icon {
          transform: scale(1.1) rotate(5deg);
        }

        .menu-item h3 {
          font-size: 1.5rem;
          font-weight: bold;
          color: #5a4a3a;
          margin: 0 0 8px 0;
          letter-spacing: 1px;
        }

        .menu-item.special h3 {
          color: #92400e;
        }

        .menu-item p {
          font-size: 1rem;
          color: #6b7280;
          margin: 0;
          line-height: 1.4;
        }

        .menu-item.special p {
          color: #a16207;
        }

        .sparkles {
          position: absolute;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .sparkle {
          position: absolute;
          color: #fbbf24;
          font-size: 12px;
          animation: sparkle-bg 2s infinite ease-in-out;
        }

        @keyframes sparkle-bg {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1); }
        }

        .sparkle:nth-child(1) { top: 10%; left: 15%; animation-delay: 0s; }
        .sparkle:nth-child(2) { top: 20%; right: 20%; animation-delay: 0.5s; }
        .sparkle:nth-child(3) { bottom: 15%; left: 25%; animation-delay: 1s; }
        .sparkle:nth-child(4) { bottom: 25%; right: 15%; animation-delay: 1.5s; }

        .menu-item.clicked {
          animation: clickPulse 0.3s ease;
        }

        @keyframes clickPulse {
          0% { transform: scale(1); }
          50% { transform: scale(0.95); }
          100% { transform: scale(1); }
        }

        @media (max-width: 900px) {
          .menu-container {
            width: 90vw;
            height: 67.5vw;
            padding: 40px;
            gap: 30px;
          }
          
          .icon {
            font-size: 3rem;
          }
          
          .menu-item h3 {
            font-size: 1.3rem;
          }

          .menu-item p {
            font-size: 0.9rem;
          }
        }
      `}</style>
      
      {showGameModeInterface && (
        <GameModeInterface onClose={() => setShowGameModeInterface(false)} />
      )}
    </>
  )
}