import React from 'react'

export const MailSystemInterface: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  
  const handleMailOption = (optionId: string) => {
    onClose()
    
    const optionNames = {
      'inbox': '收件箱',
      'compose': '寫信',
      'friends': '朋友信件',
      'system': '系統信件'
    }
    
    const descriptions = {
      'inbox': '查看收到的所有信件，包括朋友信件、系統通知和各種獎勵信件。',
      'compose': '寫信給朋友，分享你的想法、感受，或是傳送溫暖的問候。',
      'friends': '專門管理與朋友的信件往來，查看與好友的信件歷史記錄。',
      'system': '查看系統通知、活動資訊、獎勵信件等官方相關信件。'
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

  const mailOptions = [
    { id: 'inbox', icon: '📥', title: '收件箱', desc: '查看收到的信件' },
    { id: 'compose', icon: '✉️', title: '寫信', desc: '寫信給朋友', isSpecial: true },
    { id: 'friends', icon: '👥', title: '朋友信件', desc: '管理朋友信件' },
    { id: 'system', icon: '🏛️', title: '系統信件', desc: '官方通知獎勵' }
  ]

  return (
    <>
      {/* Full page container with gradient background */}
      <div 
        className="fixed inset-0 z-50"
        style={{
          fontFamily: 'Arial, sans-serif',
          background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)', // Pink theme
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
          className="mail-menu-container"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sparkles */}
          <div className="sparkles">
            <div className="sparkle">📮</div>
            <div className="sparkle">✨</div>
            <div className="sparkle">💌</div>
            <div className="sparkle">✨</div>
          </div>
          
          {/* Menu Items */}
          {mailOptions.map((option) => (
            <div
              key={option.id}
              className={`mail-menu-item ${option.isSpecial ? 'special' : ''}`}
              onClick={() => handleMailOption(option.id)}
            >
              <div className="icon">{option.icon}</div>
              <h3>{option.title}</h3>
              <p>{option.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Mail menu specific CSS */}
      <style>{`
        .mail-menu-container {
          width: 800px;
          height: 600px;
          background: linear-gradient(135deg, #fef7ff 0%, #f3e8ff 100%);
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

        .mail-menu-container::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          pointer-events: none;
        }

        .mail-menu-item {
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

        .mail-menu-item::before {
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

        .mail-menu-item:hover::before {
          transform: translateX(100%);
        }

        .mail-menu-item:hover {
          transform: translateY(-8px) scale(1.05);
          box-shadow: 0 15px 35px rgba(0,0,0,0.15);
        }

        .mail-menu-item:active {
          transform: translateY(-4px) scale(1.02);
        }

        .mail-menu-item.special {
          background: linear-gradient(135deg, #fff9c4 0%, #fef08a 50%, #facc15 100%);
          border: 2px solid #eab308;
          position: relative;
        }

        .mail-menu-item.special::after {
          content: '✨';
          position: absolute;
          top: 15px;
          right: 15px;
          font-size: 1.5rem;
          animation: sparkle 2s infinite ease-in-out;
        }

        .mail-menu-item .icon {
          font-size: 4rem;
          margin-bottom: 15px;
          transition: transform 0.3s ease;
        }

        .mail-menu-item:hover .icon {
          transform: scale(1.1) rotate(5deg);
        }

        .mail-menu-item h3 {
          font-size: 1.5rem;
          font-weight: bold;
          color: #be185d;
          margin: 0 0 8px 0;
          letter-spacing: 1px;
        }

        .mail-menu-item.special h3 {
          color: #92400e;
        }

        .mail-menu-item p {
          font-size: 1rem;
          color: #ec4899;
          margin: 0;
          line-height: 1.4;
        }

        .mail-menu-item.special p {
          color: #a16207;
        }

        .mail-menu-container .sparkles {
          position: absolute;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .mail-menu-container .sparkle {
          position: absolute;
          color: #ec4899;
          font-size: 12px;
          animation: sparkle-bg 2s infinite ease-in-out;
        }

        .mail-menu-container .sparkle:nth-child(1) { top: 10%; left: 15%; animation-delay: 0s; }
        .mail-menu-container .sparkle:nth-child(2) { top: 20%; right: 20%; animation-delay: 0.5s; }
        .mail-menu-container .sparkle:nth-child(3) { bottom: 15%; left: 25%; animation-delay: 1s; }
        .mail-menu-container .sparkle:nth-child(4) { bottom: 25%; right: 15%; animation-delay: 1.5s; }

        @keyframes sparkle {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }

        @keyframes sparkle-bg {
          0%, 100% { opacity: 0.6; transform: translateY(0px); }
          50% { opacity: 1; transform: translateY(-5px); }
        }

        @media (max-width: 900px) {
          .mail-menu-container {
            width: 90vw;
            height: 67.5vw;
            padding: 40px;
            gap: 30px;
          }
          
          .mail-menu-item .icon {
            font-size: 3rem;
          }
          
          .mail-menu-item h3 {
            font-size: 1.3rem;
          }

          .mail-menu-item p {
            font-size: 0.9rem;
          }
        }
      `}</style>
    </>
  )
}