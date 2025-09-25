import React from 'react'

export const WorldExplorationInterface: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  
  const handleWorldOption = (optionId: string) => {
    onClose()
    
    const optionNames = {
      'myisland': '我的島嶼',
      'visit': '拜訪朋友',
      'worldmap': '世界地圖',
      'events': '特殊活動'
    }
    
    const descriptions = {
      'myisland': '管理你的專屬島嶼，裝飾家園，種植花朵，打造理想的居住環境。',
      'visit': '探索朋友們的島嶼，發現不同的創意設計，留下美好的訪問回憶。',
      'worldmap': '查看心語小鎮的完整地圖，發現隱藏地點，規劃你的探險路線。',
      'events': '參與限時特殊活動，完成挑戰任務，獲得獨特獎勵和珍貴回憶。'
    }
    
    const name = optionNames[optionId as keyof typeof optionNames]
    const desc = descriptions[optionId as keyof typeof descriptions]
    
    setTimeout(() => {
      const confirmed = confirm(`${desc}\n\n確定要進入 ${name} 嗎？`)
      if (confirmed) {
        alert(`正在載入 ${name}...`)
      }
    }, 300)
  }

  const worldOptions = [
    { id: 'myisland', icon: '🏝️', title: '我的島嶼', desc: '管理你的家園' },
    { id: 'visit', icon: '✈️', title: '拜訪朋友', desc: '探索其他島嶼' },
    { id: 'worldmap', icon: '🗺️', title: '世界地圖', desc: '查看所有地點', isSpecial: true },
    { id: 'events', icon: '🌟', title: '特殊活動', desc: '參加限時活動' }
  ]

  return (
    <>
      {/* Full page container with gradient background */}
      <div 
        className="fixed inset-0 z-50"
        style={{
          fontFamily: 'Arial, sans-serif',
          background: 'linear-gradient(135deg, #e8f5e8 0%, #d4f1d4 100%)', // Green theme
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
          className="world-menu-container"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sparkles */}
          <div className="sparkles">
            <div className="sparkle">🌟</div>
            <div className="sparkle">✨</div>
            <div className="sparkle">🌟</div>
            <div className="sparkle">✨</div>
          </div>
          
          {/* Menu Items */}
          {worldOptions.map((option) => (
            <div
              key={option.id}
              className={`world-menu-item ${option.isSpecial ? 'special' : ''}`}
              onClick={() => handleWorldOption(option.id)}
            >
              <div className="icon">{option.icon}</div>
              <h3>{option.title}</h3>
              <p>{option.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* World menu specific CSS */}
      <style>{`
        .world-menu-container {
          width: 800px;
          height: 600px;
          background: linear-gradient(135deg, #f0f9f0 0%, #e6f7e6 100%);
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

        .world-menu-container::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          pointer-events: none;
        }

        .world-menu-item {
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

        .world-menu-item::before {
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

        .world-menu-item:hover::before {
          transform: translateX(100%);
        }

        .world-menu-item:hover {
          transform: translateY(-8px) scale(1.05);
          box-shadow: 0 15px 35px rgba(0,0,0,0.15);
        }

        .world-menu-item:active {
          transform: translateY(-4px) scale(1.02);
        }

        .world-menu-item.special {
          background: linear-gradient(135deg, #fff9c4 0%, #fef08a 50%, #facc15 100%);
          border: 2px solid #eab308;
          position: relative;
        }

        .world-menu-item.special::after {
          content: '✨';
          position: absolute;
          top: 15px;
          right: 15px;
          font-size: 1.5rem;
          animation: sparkle 2s infinite ease-in-out;
        }

        .world-menu-item .icon {
          font-size: 4rem;
          margin-bottom: 15px;
          transition: transform 0.3s ease;
        }

        .world-menu-item:hover .icon {
          transform: scale(1.1) rotate(5deg);
        }

        .world-menu-item h3 {
          font-size: 1.5rem;
          font-weight: bold;
          color: #2d5a2d;
          margin: 0 0 8px 0;
          letter-spacing: 1px;
        }

        .world-menu-item.special h3 {
          color: #92400e;
        }

        .world-menu-item p {
          font-size: 1rem;
          color: #4a7c59;
          margin: 0;
          line-height: 1.4;
        }

        .world-menu-item.special p {
          color: #a16207;
        }

        .world-menu-container .sparkles {
          position: absolute;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .world-menu-container .sparkle {
          position: absolute;
          color: #10b981;
          font-size: 12px;
          animation: sparkle-bg 2s infinite ease-in-out;
        }

        .world-menu-container .sparkle:nth-child(1) { top: 10%; left: 15%; animation-delay: 0s; }
        .world-menu-container .sparkle:nth-child(2) { top: 20%; right: 20%; animation-delay: 0.5s; }
        .world-menu-container .sparkle:nth-child(3) { bottom: 15%; left: 25%; animation-delay: 1s; }
        .world-menu-container .sparkle:nth-child(4) { bottom: 25%; right: 15%; animation-delay: 1.5s; }

        @keyframes sparkle {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }

        @keyframes sparkle-bg {
          0%, 100% { opacity: 0.6; transform: translateY(0px); }
          50% { opacity: 1; transform: translateY(-5px); }
        }

        @media (max-width: 900px) {
          .world-menu-container {
            width: 90vw;
            height: 67.5vw;
            padding: 40px;
            gap: 30px;
          }
          
          .world-menu-item .icon {
            font-size: 3rem;
          }
          
          .world-menu-item h3 {
            font-size: 1.3rem;
          }

          .world-menu-item p {
            font-size: 0.9rem;
          }
        }
      `}</style>
    </>
  )
}