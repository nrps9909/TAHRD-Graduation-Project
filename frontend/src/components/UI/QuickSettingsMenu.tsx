import React, { useEffect, useState } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { SettingsInterface } from './SettingsInterface'

export const QuickSettingsMenu: React.FC = () => {
  const { showSettings, setShowSettings } = useGameStore()
  const [showSettingsInterface, setShowSettingsInterface] = useState(false)
  
  const selectSettingOption = (optionId: string, event: React.MouseEvent) => {
    const menuItem = event.currentTarget as HTMLElement
    
    // Add click animation
    menuItem.classList.add('clicked')
    setTimeout(() => {
      menuItem.classList.remove('clicked')
    }, 300)
    
    setShowSettings(false)
    setShowSettingsInterface(true)
  }

  const settingOptions = [
    { id: 'audio', icon: '🔊', title: '音效設定', desc: '調整音量設定' },
    { id: 'graphics', icon: '🖥️', title: '畫面設定', desc: '顯示和畫質選項', isSpecial: true },
    { id: 'controls', icon: '⌨️', title: '操作設定', desc: '自訂快捷鍵' },
    { id: 'gameplay', icon: '🎯', title: '遊戲設定', desc: '遊戲性選項' }
  ]

  // Keyboard event handler
  useEffect(() => {
    if (!showSettings) return

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      
      switch (key) {
        case '1':
          event.preventDefault()
          selectSettingOption('audio', { currentTarget: document.querySelector('.settings-menu-item') } as any)
          break
        case '2':
          event.preventDefault()
          selectSettingOption('graphics', { currentTarget: document.querySelector('.settings-menu-item') } as any)
          break
        case '3':
          event.preventDefault()
          selectSettingOption('controls', { currentTarget: document.querySelector('.settings-menu-item') } as any)
          break
        case '4':
          event.preventDefault()
          selectSettingOption('gameplay', { currentTarget: document.querySelector('.settings-menu-item') } as any)
          break
        case 'z':
        case 'escape':
          event.preventDefault()
          setShowSettings(false)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showSettings])

  if (!showSettings) return null

  return (
    <>
      {/* Full page container with gradient background */}
      <div 
        className="fixed inset-0 z-50"
        style={{
          fontFamily: 'Arial, sans-serif',
          background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)', // Blue theme
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          width: '100vw',
          position: 'fixed',
          top: 0,
          left: 0
        }}
        onClick={() => setShowSettings(false)}
      >
        {/* Menu Container */}
        <div 
          className="settings-menu-container"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sparkles */}
          <div className="sparkles">
            <div className="sparkle">⚙️</div>
            <div className="sparkle">✨</div>
            <div className="sparkle">🔧</div>
            <div className="sparkle">✨</div>
          </div>
          
          {/* Menu Items */}
          {settingOptions.map((option) => (
            <div
              key={option.id}
              className={`settings-menu-item ${option.isSpecial ? 'special' : ''}`}
              onClick={(e) => selectSettingOption(option.id, e)}
            >
              <div className="icon">{option.icon}</div>
              <h3>{option.title}</h3>
              <p>{option.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Settings menu specific CSS */}
      <style>{`
        .settings-menu-container {
          width: 800px;
          height: 600px;
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
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

        .settings-menu-container::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          pointer-events: none;
        }

        .settings-menu-item {
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

        .settings-menu-item::before {
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

        .settings-menu-item:hover::before {
          transform: translateX(100%);
        }

        .settings-menu-item:hover {
          transform: translateY(-8px) scale(1.05);
          box-shadow: 0 15px 35px rgba(0,0,0,0.15);
        }

        .settings-menu-item:active {
          transform: translateY(-4px) scale(1.02);
        }

        .settings-menu-item.special {
          background: linear-gradient(135deg, #fff9c4 0%, #fef08a 50%, #facc15 100%);
          border: 2px solid #eab308;
          position: relative;
        }

        .settings-menu-item.special::after {
          content: '✨';
          position: absolute;
          top: 15px;
          right: 15px;
          font-size: 1.5rem;
          animation: sparkle 2s infinite ease-in-out;
        }

        .settings-menu-item .icon {
          font-size: 4rem;
          margin-bottom: 15px;
          transition: transform 0.3s ease;
        }

        .settings-menu-item:hover .icon {
          transform: scale(1.1) rotate(5deg);
        }

        .settings-menu-item h3 {
          font-size: 1.5rem;
          font-weight: bold;
          color: #1e40af;
          margin: 0 0 8px 0;
          letter-spacing: 1px;
        }

        .settings-menu-item.special h3 {
          color: #92400e;
        }

        .settings-menu-item p {
          font-size: 1rem;
          color: #3b82f6;
          margin: 0;
          line-height: 1.4;
        }

        .settings-menu-item.special p {
          color: #a16207;
        }

        .settings-menu-container .sparkles {
          position: absolute;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .settings-menu-container .sparkle {
          position: absolute;
          color: #3b82f6;
          font-size: 12px;
          animation: sparkle-bg 2s infinite ease-in-out;
        }

        .settings-menu-container .sparkle:nth-child(1) { top: 10%; left: 15%; animation-delay: 0s; }
        .settings-menu-container .sparkle:nth-child(2) { top: 20%; right: 20%; animation-delay: 0.5s; }
        .settings-menu-container .sparkle:nth-child(3) { bottom: 15%; left: 25%; animation-delay: 1s; }
        .settings-menu-container .sparkle:nth-child(4) { bottom: 25%; right: 15%; animation-delay: 1.5s; }

        .settings-menu-item.clicked {
          animation: clickPulse 0.3s ease;
        }

        @media (max-width: 900px) {
          .settings-menu-container {
            width: 90vw;
            height: 67.5vw;
            padding: 40px;
            gap: 30px;
          }
          
          .settings-menu-item .icon {
            font-size: 3rem;
          }
          
          .settings-menu-item h3 {
            font-size: 1.3rem;
          }

          .settings-menu-item p {
            font-size: 0.9rem;
          }
        }
      `}</style>
      
      {showSettingsInterface && (
        <SettingsInterface onClose={() => setShowSettingsInterface(false)} />
      )}
    </>
  )
}