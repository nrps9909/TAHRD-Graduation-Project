import React, { useState } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { FriendsListModal } from './FriendsListModal'
import AICharacterChatInterface from './AICharacterChatInterface'
import { MailSystemInterface } from './MailSystemInterface'

const MenuPanel: React.FC<{
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
}> = ({ isOpen, onClose, title, children, className = '' }) => {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] animate-fade-in"
        onClick={onClose}
      />
      
      {/* Menu Panel */}
      <div className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] animate-slide-up ${className}`}>
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 shadow-2xl border-4 border-white min-w-[400px] max-w-[600px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors"
            >
              ✕
            </button>
          </div>
          
          {/* Content */}
          <div className="max-h-[70vh] overflow-y-auto">
            {children}
          </div>
          
          {/* Footer */}
          <div className="mt-6 pt-4 border-t-2 border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              按 ESC 關閉選單
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

// Game Menu Component - 左側選單融合設計
export const QuickGameMenu: React.FC = () => {
  const { showGameMenu, setShowGameMenu } = useGameStore()
  
  const handleGameModeSelect = (modeId: string, title: string) => {
    const descriptions: Record<string, string> = {
      'single': '歡迎進入單人冒險模式！你將在這個神奇的世界中獨自探索，與AI夥伴建立友誼。',
      'multi': '邀請你的朋友們一起加入！多人模式讓你與朋友共同體驗這個溫暖的世界。',
      'challenge': '準備好接受挑戰了嗎？在這裡測試你的技能，獲得專屬成就和獎勵！',
      'tutorial': '新手訓練營開始！通過互動式教學，快速掌握遊戲的所有玩法。',
      'achievements': '查看你的成就收藏！回顧你在遊戲中的精彩時刻和里程碑。',
      'statistics': '深入數據分析！了解你的遊戲習慣、互動記錄和成長軌跡。'
    }
    
    const confirmed = window.confirm(`${descriptions[modeId]}\n\n確定要開始這個模式嗎？`)
    if (confirmed) {
      alert(`正在啟動 ${title}...`)
      setShowGameMenu(false)
    }
  }
  
  const gameOptions = [
    { id: 'single', icon: '🎮', title: '單人模式', desc: '開始你的個人冒險', special: false },
    { id: 'multi', icon: '👥', title: '多人模式', desc: '與朋友一起遊玩', special: false },
    { id: 'challenge', icon: '🏆', title: '挑戰模式', desc: '測試你的技能', special: true },
    { id: 'tutorial', icon: '📚', title: '教學模式', desc: '學習遊戲基礎', special: false },
    { id: 'achievements', icon: '🎖️', title: '成就系統', desc: '查看你的成就', special: false },
    { id: 'statistics', icon: '📊', title: '遊戲統計', desc: '查看遊戲數據', special: false }
  ]

  if (!showGameMenu) return null

  return (
    <>
      {/* 左側選單容器 - 融合到遊戲中 */}
      <div className="fixed left-0 top-0 w-80 h-full bg-white/95 backdrop-blur-xl border-r-4 border-white/30 shadow-2xl z-[9999] flex flex-col transform transition-transform duration-500 ease-out">
        {/* 選單標題 */}
        <div className="p-6 pb-5 border-b-2 border-gray-200 bg-gradient-to-r from-blue-50/80 to-purple-50/80">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <span>🎮</span>
              <span>遊戲模式</span>
            </h2>
            <button
              onClick={() => setShowGameMenu(false)}
              className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-gray-600">選擇你喜歡的遊戲體驗</p>
        </div>

        {/* 選單內容 */}
        <div className="flex-1 p-5 overflow-y-auto">
          <div className="space-y-3">
            {gameOptions.map((option, index) => (
              <div
                key={option.id}
                onClick={() => handleGameModeSelect(option.id, option.title)}
                className={`
                  ${option.special 
                    ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 border-yellow-300 hover:from-yellow-200 hover:to-yellow-300' 
                    : 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 hover:from-blue-100 hover:to-blue-200'
                  }
                  border-2 rounded-2xl p-4 cursor-pointer transition-all duration-300 
                  hover:translate-x-2 hover:shadow-lg group relative overflow-hidden
                `}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* 特殊效果 */}
                {option.special && (
                  <div className="absolute top-2 right-2 text-lg animate-pulse">✨</div>
                )}
                
                {/* 光暈效果 */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                
                <div className="flex items-center gap-4 relative z-10">
                  {/* 圖標 */}
                  <div className="text-3xl flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                    {option.icon}
                  </div>
                  
                  {/* 文字內容 */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-800 mb-1">
                      {option.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {option.desc}
                    </p>
                    <div className="text-xs text-blue-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      點擊開始 →
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 選單底部 */}
        <div className="p-5 border-t-2 border-gray-200 bg-gray-50/50">
          <div className="text-center text-xs text-gray-600 flex items-center justify-center gap-2">
            <span>按</span>
            <kbd className="bg-gray-700 text-white px-2 py-1 rounded text-xs font-mono">ESC</kbd>
            <span>關閉選單</span>
          </div>
        </div>
      </div>

      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[9998] animate-fade-in"
        onClick={() => setShowGameMenu(false)}
      />
    </>
  )
}

// Social Menu Component - gamemode.html style
export const QuickSocialMenu: React.FC = () => {
  const { showSocialMenu, setShowSocialMenu } = useGameStore()
  const [showFriendsModal, setShowFriendsModal] = useState(false)
  const [showAICharacterChatInterface, setShowAICharacterChatInterface] = useState(false)
  const [showMailInterface, setShowMailInterface] = useState(false)
  
  const selectSocialOption = (optionId: string, event: React.MouseEvent) => {
    const menuItem = event.currentTarget as HTMLElement
    
    // Add click animation
    menuItem.classList.add('clicked')
    setTimeout(() => {
      menuItem.classList.remove('clicked')
    }, 300)
    
    setShowSocialMenu(false)
    
    // 直接打開對應介面，不需要延遲
    switch (optionId) {
      case 'friends':
        setShowFriendsModal(true)
        break
      case 'chat':
        console.log('Opening AI Chat Interface')
        setShowAICharacterChatInterface(true)
        break
      case 'mail':
        setShowMailInterface(true)
        break
      case 'community':
        alert('🎉 社區活動功能：\n\n• 參與社區挑戰 🏆\n• 加入興趣小組 👥\n• 分享創作作品 🎨\n• 社區排行榜 📊\n\n功能開發中，敬請期待！')
        break
    }
  }

  const socialOptions = [
    { id: 'friends', icon: '👫', title: '好友列表', desc: '查看線上好友' },
    { id: 'chat', icon: '🤖', title: 'AI聊天室', desc: '與AI助手對話', isSpecial: true },
    { id: 'mail', icon: '📮', title: '郵件系統', desc: '收發禮物和信件' },
    { id: 'community', icon: '🎉', title: '社區活動', desc: '參與社區互動' }
  ]

  // Keyboard event handler
  React.useEffect(() => {
    if (!showSocialMenu || showAICharacterChatInterface || showFriendsModal || showMailInterface) return

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      
      switch (key) {
        case '1':
          event.preventDefault()
          selectSocialOption('friends', { currentTarget: document.querySelector('.social-menu-item') } as any)
          break
        case '2':
          event.preventDefault()
          selectSocialOption('chat', { currentTarget: document.querySelector('.social-menu-item') } as any)
          break
        case '3':
          event.preventDefault()
          selectSocialOption('mail', { currentTarget: document.querySelector('.social-menu-item') } as any)
          break
        case '4':
          event.preventDefault()
          selectSocialOption('community', { currentTarget: document.querySelector('.social-menu-item') } as any)
          break
        case 'c':
        case 'escape':
          event.preventDefault()
          setShowSocialMenu(false)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showSocialMenu, showAICharacterChatInterface, showFriendsModal, showMailInterface])


  return (
    <>
      {/* Social Menu */}
      {showSocialMenu && (
        <div 
          className="fixed inset-0 z-50"
          style={{
            fontFamily: 'Arial, sans-serif',
            background: 'linear-gradient(135deg, #fce7f3 0%, #f9d5e5 100%)', // Pink theme
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            width: '100vw',
            position: 'fixed',
            top: 0,
            left: 0
          }}
          onClick={() => setShowSocialMenu(false)}
        >
        {/* Menu Container */}
        <div 
          className="social-menu-container"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sparkles */}
          <div className="sparkles">
            <div className="sparkle">💖</div>
            <div className="sparkle">✨</div>
            <div className="sparkle">💫</div>
            <div className="sparkle">✨</div>
          </div>
          
          {/* Menu Items */}
          {socialOptions.map((option) => (
            <div
              key={option.id}
              className={`social-menu-item ${option.isSpecial ? 'special' : ''}`}
              onClick={(e) => selectSocialOption(option.id, e)}
              style={{ 
                cursor: 'pointer',
                pointerEvents: 'auto',
                zIndex: 1000
              }}
            >
              <div className="icon">{option.icon}</div>
              <h3>{option.title}</h3>
              <p>{option.desc}</p>
            </div>
          ))}
        </div>

        {/* Social menu specific CSS */}
        <style>{`
        .social-menu-container {
          width: 800px;
          height: 600px;
          background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%);
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

        .social-menu-container::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          pointer-events: none;
        }

        .social-menu-item {
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

        .social-menu-item::before {
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

        .social-menu-item:hover::before {
          transform: translateX(100%);
        }

        .social-menu-item:hover {
          transform: translateY(-8px) scale(1.05);
          box-shadow: 0 15px 35px rgba(0,0,0,0.15);
        }

        .social-menu-item:active {
          transform: translateY(-4px) scale(1.02);
        }

        .social-menu-item.special {
          background: linear-gradient(135deg, #fff9c4 0%, #fef08a 50%, #facc15 100%);
          border: 2px solid #eab308;
          position: relative;
        }

        .social-menu-item.special::after {
          content: '✨';
          position: absolute;
          top: 15px;
          right: 15px;
          font-size: 1.5rem;
          animation: sparkle 2s infinite ease-in-out;
        }

        .social-menu-item .icon {
          font-size: 4rem;
          margin-bottom: 15px;
          transition: transform 0.3s ease;
        }

        .social-menu-item:hover .icon {
          transform: scale(1.1) rotate(5deg);
        }

        .social-menu-item h3 {
          font-size: 1.5rem;
          font-weight: bold;
          color: #be185d;
          margin: 0 0 8px 0;
          letter-spacing: 1px;
        }

        .social-menu-item.special h3 {
          color: #92400e;
        }

        .social-menu-item p {
          font-size: 1rem;
          color: #ec4899;
          margin: 0;
          line-height: 1.4;
        }

        .social-menu-item.special p {
          color: #a16207;
        }

        .social-menu-container .sparkles {
          position: absolute;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .social-menu-container .sparkle {
          position: absolute;
          color: #ec4899;
          font-size: 12px;
          animation: sparkle-bg 2s infinite ease-in-out;
        }

        .social-menu-container .sparkle:nth-child(1) { top: 10%; left: 15%; animation-delay: 0s; }
        .social-menu-container .sparkle:nth-child(2) { top: 20%; right: 20%; animation-delay: 0.5s; }
        .social-menu-container .sparkle:nth-child(3) { bottom: 15%; left: 25%; animation-delay: 1s; }
        .social-menu-container .sparkle:nth-child(4) { bottom: 25%; right: 15%; animation-delay: 1.5s; }

        .social-menu-item.clicked {
          animation: clickPulse 0.3s ease;
        }

        @media (max-width: 900px) {
          .social-menu-container {
            width: 90vw;
            height: 67.5vw;
            padding: 40px;
            gap: 30px;
          }
          
          .social-menu-item .icon {
            font-size: 3rem;
          }
          
          .social-menu-item h3 {
            font-size: 1.3rem;
          }

          .social-menu-item p {
            font-size: 0.9rem;
          }
        }
        `}</style>
      </div>
      )}
      
      {/* Modal Components */}
      {showFriendsModal && (
        <FriendsListModal onClose={() => {
          setShowFriendsModal(false)
          setShowSocialMenu(true)
        }} />
      )}
      
      {showAICharacterChatInterface && (
        <AICharacterChatInterface onClose={() => {
          setShowAICharacterChatInterface(false)
          setShowSocialMenu(true)
        }} />
      )}
      
      {showMailInterface && (
        <MailSystemInterface onClose={() => {
          setShowMailInterface(false)
          setShowSocialMenu(true)
        }} />
      )}
    </>
  )
}

// World Menu Component - gamemode.html style
export const QuickWorldMenu: React.FC = () => {
  const { showWorldMenu, setShowWorldMenu } = useGameStore()
  
  const selectWorldOption = (optionId: string, event: React.MouseEvent) => {
    const menuItem = event.currentTarget as HTMLElement
    
    // Add click animation
    menuItem.classList.add('clicked')
    setTimeout(() => {
      menuItem.classList.remove('clicked')
    }, 300)
    
    setShowWorldMenu(false)
    
    const descriptions = {
      'myisland': '歡迎回到你的專屬島嶼！在這裡你可以自由建造、裝飾，打造屬於你的理想家園。',
      'visit': '準備踏上冒險之旅！探索朋友們的島嶼，發現不同的創意設計和驚喜。',
      'worldmap': '打開世界地圖，查看所有可探索的神秘地點和隱藏區域，規劃你的下一次冒險。',
      'events': '特殊活動正在進行中！參與限時活動，獲得獨特獎勵和難忘回憶。'
    }

    const optionNames = {
      'myisland': '我的島嶼',
      'visit': '拜訪朋友',
      'worldmap': '世界地圖',
      'events': '特殊活動'
    }
    
    const description = descriptions[optionId as keyof typeof descriptions]
    const name = optionNames[optionId as keyof typeof optionNames]
    
    if (description && name) {
      setTimeout(() => {
        const confirmed = confirm(`${description}\n\n確定要進入 ${name} 嗎？`)
        if (confirmed) {
          alert(`正在載入 ${name}...`)
        }
      }, 300)
    }
  }

  const worldOptions = [
    { id: 'myisland', icon: '🏝️', title: '我的島嶼', desc: '管理你的家園' },
    { id: 'visit', icon: '✈️', title: '拜訪朋友', desc: '探索其他島嶼' },
    { id: 'worldmap', icon: '🗺️', title: '世界地圖', desc: '查看所有地點', isSpecial: true },
    { id: 'events', icon: '🌟', title: '特殊活動', desc: '參加限時活動' }
  ]

  // Keyboard event handler
  React.useEffect(() => {
    if (!showWorldMenu) return

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      
      switch (key) {
        case '1':
          event.preventDefault()
          selectWorldOption('myisland', { currentTarget: document.querySelector('.world-menu-item') } as any)
          break
        case '2':
          event.preventDefault()
          selectWorldOption('visit', { currentTarget: document.querySelector('.world-menu-item') } as any)
          break
        case '3':
          event.preventDefault()
          selectWorldOption('worldmap', { currentTarget: document.querySelector('.world-menu-item') } as any)
          break
        case '4':
          event.preventDefault()
          selectWorldOption('events', { currentTarget: document.querySelector('.world-menu-item') } as any)
          break
        case 'x':
        case 'escape':
          event.preventDefault()
          setShowWorldMenu(false)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showWorldMenu])

  if (!showWorldMenu) return null

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
        onClick={() => setShowWorldMenu(false)}
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
              onClick={(e) => selectWorldOption(option.id, e)}
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

        .world-menu-item.clicked {
          animation: clickPulse 0.3s ease;
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

