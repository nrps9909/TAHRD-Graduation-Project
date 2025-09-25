import React, { useEffect, useState } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { FriendsListModal } from './FriendsListModal'
import { ChatRoomModal } from './ChatRoomModal'
import { GameModeInterface } from './GameModeInterface'
import { WorldExplorationInterface } from './WorldExplorationInterface'
import { SettingsInterface } from './SettingsInterface'
import { MailSystemInterface } from './MailSystemInterface'

export const QuickCommandMenu: React.FC = () => {
  const { 
    showQuickCommandMenu,
    setShowQuickCommandMenu,
    setGameMode
  } = useGameStore()
  
  const [currentView, setCurrentView] = useState<'main' | 'game' | 'world' | 'social' | 'settings'>('main')
  const [showFriendsModal, setShowFriendsModal] = useState(false)
  const [showChatModal, setShowChatModal] = useState(false)
  const [showGameModeInterface, setShowGameModeInterface] = useState(false)
  const [showWorldInterface, setShowWorldInterface] = useState(false)
  const [showSettingsInterface, setShowSettingsInterface] = useState(false)
  const [showMailInterface, setShowMailInterface] = useState(false)

  // 重置視圖當選單關閉時
  useEffect(() => {
    if (!showQuickCommandMenu) {
      setCurrentView('main')
    }
  }, [showQuickCommandMenu])

  // 主選單項目
  const mainMenuItems = [
    {
      id: 'game',
      title: '遊戲模式',
      icon: '🎮',
      action: () => {
        setShowQuickCommandMenu(false)
        setShowGameModeInterface(true)
      }
    },
    {
      id: 'world',
      title: '探索世界', 
      icon: '🌍',
      action: () => {
        setShowQuickCommandMenu(false)
        setShowWorldInterface(true)
      }
    },
    {
      id: 'social',
      title: '社交功能',
      icon: '👥',
      action: () => setCurrentView('social')
    },
    {
      id: 'settings',
      title: '遊戲設定',
      icon: '⚙️',
      action: () => {
        setShowQuickCommandMenu(false)
        setShowSettingsInterface(true)
      }
    }
  ]

  // 遊戲模式子選單
  const gameMenuItems = [
    {
      id: 'single',
      title: '單人模式',
      icon: '🎮',
      desc: '開始你的個人冒險',
      action: () => {
        setShowQuickCommandMenu(false)
        setGameMode('single')
        alert('正在啟動單人模式...')
      }
    },
    {
      id: 'multi',
      title: '多人模式',
      icon: '👥',
      desc: '與朋友一起遊玩',
      action: () => {
        setShowQuickCommandMenu(false)
        setGameMode('multiplayer')
        alert('正在啟動多人模式...')
      }
    },
    {
      id: 'challenge',
      title: '挑戰模式',
      icon: '🏆',
      desc: '測試你的技能',
      isSpecial: true,
      action: () => {
        setShowQuickCommandMenu(false)
        setGameMode('exploration')
        alert('正在啟動挑戰模式...')
      }
    },
    {
      id: 'tutorial',
      title: '教學模式',
      icon: '📚',
      desc: '學習遊戲基礎',
      action: () => {
        setShowQuickCommandMenu(false)
        setGameMode('social')
        alert('正在啟動教學模式...')
      }
    }
  ]

  // 世界選單
  const worldMenuItems = [
    {
      id: 'myisland',
      title: '我的島嶼',
      icon: '🏝️',
      desc: '管理你的家園',
      action: () => {
        setShowQuickCommandMenu(false)
        alert('🏝️ 我的島嶼功能：\n\n• 裝飾你的島嶼 🏡\n• 種植花草樹木 🌸\n• 建造特色建築 🏛️\n• 邀請朋友參觀 👥\n\n功能開發中，敬請期待！')
      }
    },
    {
      id: 'visit',
      title: '拜訪朋友',
      icon: '✈️',
      desc: '探索其他島嶼',
      action: () => {
        setShowQuickCommandMenu(false)
        alert('✈️ 拜訪朋友功能：\n\n• 快速前往好友島嶼 🚀\n• 一起探索和互動 👫\n• 留下訪問足跡 👣\n• 贈送島嶼禮物 🎁\n\n功能開發中，敬請期待！')
      }
    },
    {
      id: 'worldmap',
      title: '世界地圖',
      icon: '🗺️',
      desc: '查看所有地點',
      isSpecial: true,
      action: () => {
        setShowQuickCommandMenu(false)
        alert('🗺️ 世界地圖功能：\n\n• 探索廣闊的心語小鎮 🌍\n• 發現隱藏的秘密地點 🔍\n• 快速傳送到任意位置 ⚡\n• 查看好友位置資訊 📍\n\n功能開發中，敬請期待！')
      }
    },
    {
      id: 'events',
      title: '特殊活動',
      icon: '🌟',
      desc: '參加限時活動',
      action: () => {
        setShowQuickCommandMenu(false)
        alert('🌟 特殊活動功能：\n\n• 季節限定活動 🎃\n• 節日慶典 🎄\n• 社區挑戰 🏆\n• 限時獎勵 💎\n\n功能開發中，敬請期待！')
      }
    }
  ]

  // 社交選單
  const socialMenuItems = [
    {
      id: 'friends',
      title: '好友列表',
      icon: '👫',
      desc: '查看線上好友',
      action: () => {
        setShowQuickCommandMenu(false)
        setShowFriendsModal(true)
      }
    },
    {
      id: 'chat',
      title: '聊天室',
      icon: '💬',
      desc: '與朋友交流',
      isSpecial: true,
      action: () => {
        setShowQuickCommandMenu(false)
        setShowChatModal(true)
      }
    },
    {
      id: 'mail',
      title: '郵件系統',
      icon: '📮',
      desc: '收發禮物和信件',
      action: () => {
        setShowQuickCommandMenu(false)
        setShowMailInterface(true)
      }
    },
    {
      id: 'community',
      title: '社區活動',
      icon: '🎉',
      desc: '參與社區互動',
      action: () => {
        setShowQuickCommandMenu(false)
        alert('社區活動功能開發中，敬請期待！ 🎉🌟')
      }
    }
  ]

  // 設定選單
  const settingsMenuItems = [
    {
      id: 'audio',
      title: '音效設定',
      icon: '🔊',
      desc: '調整音量設定',
      action: () => {
        setShowQuickCommandMenu(false)
        alert('🔊 音效設定：\n\n• 主音量控制 🎵\n• 音效音量調整 🔔\n• 背景音樂設定 🎼\n• 語音聊天音量 🎙️\n\n功能開發中，敬請期待！')
      }
    },
    {
      id: 'graphics',
      title: '畫面設定',
      icon: '🖥️',
      desc: '顯示和畫質選項',
      isSpecial: true,
      action: () => {
        setShowQuickCommandMenu(false)
        alert('🖥️ 畫面設定：\n\n• 解析度調整 📺\n• 畫質品質設定 ✨\n• 特效開關 🎆\n• 全螢幕模式 🖼️\n\n功能開發中，敬請期待！')
      }
    },
    {
      id: 'controls',
      title: '操作設定',
      icon: '⌨️',
      desc: '自訂快捷鍵',
      action: () => {
        setShowQuickCommandMenu(false)
        alert('⌨️ 操作設定：\n\n• 快捷鍵自訂 ⚡\n• 滑鼠靈敏度 🖱️\n• 觸控設定 📱\n• 手把支援 🎮\n\n功能開發中，敬請期待！')
      }
    },
    {
      id: 'gameplay',
      title: '遊戲設定',
      icon: '🎯',
      desc: '遊戲性選項',
      action: () => {
        setShowQuickCommandMenu(false)
        alert('🎯 遊戲設定：\n\n• 自動儲存設定 💾\n• 通知偏好 🔔\n• 隱私設定 🔒\n• 語言選擇 🌐\n\n功能開發中，敬請期待！')
      }
    }
  ]

  // 獲取當前顯示的選單項目
  const getCurrentItems = () => {
    switch (currentView) {
      case 'game': return gameMenuItems
      case 'world': return worldMenuItems
      case 'social': return socialMenuItems  
      case 'settings': return settingsMenuItems
      default: return mainMenuItems
    }
  }

  const currentItems = getCurrentItems()

  // Add keyboard event handler
  useEffect(() => {
    if (!showQuickCommandMenu) return

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      
      switch (key) {
        case '1':
          event.preventDefault()
          if (currentView === 'main') {
            setCurrentView('game')
          } else if (currentItems[0]) {
            currentItems[0].action()
          }
          break
        case '2':
          event.preventDefault()
          if (currentView === 'main') {
            setCurrentView('world')
          } else if (currentItems[1]) {
            currentItems[1].action()
          }
          break
        case '3':
          event.preventDefault()
          if (currentView === 'main') {
            setCurrentView('social')
          } else if (currentItems[2]) {
            currentItems[2].action()
          }
          break
        case '4':
          event.preventDefault()
          if (currentView === 'main') {
            setCurrentView('settings')
          } else if (currentItems[3]) {
            currentItems[3].action()
          }
          break
        case 'backspace':
          event.preventDefault()
          if (currentView !== 'main') {
            setCurrentView('main')
          }
          break
        case 'q':
        case 'escape':
          event.preventDefault()
          if (currentView !== 'main') {
            setCurrentView('main')
          } else {
            setShowQuickCommandMenu(false)
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showQuickCommandMenu, currentView, currentItems])

  if (!showQuickCommandMenu) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gradient-to-br from-orange-50 to-orange-100 z-[9998] flex justify-center items-center"
        onClick={() => setShowQuickCommandMenu(false)}
      />
      
      {/* Menu Container */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] animate-slide-up">
        <div className="w-[800px] h-[600px] bg-gradient-to-br from-orange-50 to-orange-100 rounded-[20px] shadow-2xl grid grid-cols-2 grid-rows-2 gap-[40px] p-[60px] relative overflow-hidden">
          
          {/* Background glow effect */}
          <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-gradient-radial from-white/10 to-transparent pointer-events-none" />
          
          {/* Sparkles */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[10%] left-[15%] text-yellow-400 text-xs animate-pulse">✨</div>
            <div className="absolute top-[20%] right-[20%] text-yellow-400 text-sm animate-pulse delay-500">⭐</div>
            <div className="absolute bottom-[15%] left-[25%] text-yellow-400 text-xs animate-pulse delay-1000">✨</div>
            <div className="absolute bottom-[25%] right-[15%] text-yellow-400 text-sm animate-pulse delay-1500">⭐</div>
          </div>

          {/* 返回按鈕（在子選單時顯示） */}
          {currentView !== 'main' && (
            <div className="absolute top-4 left-4 z-20">
              <button
                onClick={() => setCurrentView('main')}
                className="bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-all duration-300 hover:scale-105"
              >
                <span className="text-2xl">←</span>
              </button>
            </div>
          )}

          {/* Menu Items */}
          {currentItems.map((item) => (
            <div
              key={item.id}
              className={`
                flex flex-col items-center justify-center rounded-[20px] cursor-pointer 
                transition-all duration-300 shadow-lg hover:-translate-y-2 hover:scale-105 hover:shadow-xl 
                active:scale-95 relative overflow-hidden group text-center
                ${(item as any).isSpecial 
                  ? 'bg-gradient-to-br from-yellow-100 via-yellow-200 to-yellow-400 border-2 border-yellow-500' 
                  : 'bg-white'
                }
              `}
              onClick={item.action}
            >
              {/* Shine effect */}
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-600" />
              
              {/* Special sparkle for special items */}
              {(item as any).isSpecial && (
                <div className="absolute top-4 right-4 text-2xl animate-pulse">
                  ✨
                </div>
              )}
              
              {/* Icon */}
              <div className="text-[80px] mb-4 relative z-10 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                {item.icon}
              </div>
              
              {/* Title */}
              <h3 className={`text-2xl font-bold relative z-10 tracking-wide mb-2 ${
                (item as any).isSpecial ? 'text-yellow-800' : 'text-amber-900'
              }`}>
                {item.title}
              </h3>

              {/* Description (only for sub-menu items) */}
              {(item as any).desc && (
                <p className={`text-base relative z-10 leading-relaxed ${
                  (item as any).isSpecial ? 'text-yellow-700' : 'text-gray-600'
                }`}>
                  {(item as any).desc}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Modal Components */}
      {showFriendsModal && (
        <FriendsListModal onClose={() => setShowFriendsModal(false)} />
      )}
      
      {showChatModal && (
        <ChatRoomModal onClose={() => setShowChatModal(false)} />
      )}
      
      {showGameModeInterface && (
        <GameModeInterface onClose={() => setShowGameModeInterface(false)} />
      )}
      
      {showWorldInterface && (
        <WorldExplorationInterface onClose={() => setShowWorldInterface(false)} />
      )}
      
      {showSettingsInterface && (
        <SettingsInterface onClose={() => setShowSettingsInterface(false)} />
      )}
      
      {showMailInterface && (
        <MailSystemInterface onClose={() => setShowMailInterface(false)} />
      )}
    </>
  )
}