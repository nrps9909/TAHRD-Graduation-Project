import React, { useState, useEffect } from 'react'
import { X, MessageCircle, Map, Book, Settings, Camera, Music, Users, Home, Heart, Star, Gift, Sparkles, TreePine, Fish, Bug, Palette } from 'lucide-react'
import { useGameStore } from '../../stores/gameStore'

interface PhoneApp {
  id: string
  name: string
  icon: React.ReactNode
  color: string
  bgGradient: string
  iconBg: string
  badge?: number
  isNew?: boolean
  action: () => void
}

export const NookPhone: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [currentApp, setCurrentApp] = useState<string | null>(null)
  const [phoneTime, setPhoneTime] = useState(new Date())
  const [appAnimation, setAppAnimation] = useState(false)
  
  const { 
    setShowDialogue, 
    setShowMap, 
    setShowDiary, 
    setShowSettings,
    selectedNpc,
    npcs 
  } = useGameStore()

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setPhoneTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const apps: PhoneApp[] = [
    {
      id: 'chat',
      name: '島民聊天',
      icon: <MessageCircle className="w-7 h-7" />,
      color: 'from-emerald-400 to-green-500',
      bgGradient: 'bg-gradient-to-br from-emerald-400 to-green-500',
      iconBg: '🍃',
      badge: 3,
      action: () => openApp('chat')
    },
    {
      id: 'map',
      name: '島嶼地圖',
      icon: <Map className="w-7 h-7" />,
      color: 'from-sky-400 to-blue-500',
      bgGradient: 'bg-gradient-to-br from-sky-400 to-blue-500',
      iconBg: '🗺️',
      action: () => {
        openApp('map')
        setShowMap(true)
      }
    },
    {
      id: 'diary',
      name: '心情日記',
      icon: <Book className="w-7 h-7" />,
      color: 'from-pink-400 to-rose-500',
      bgGradient: 'bg-gradient-to-br from-pink-400 to-rose-500',
      iconBg: '📖',
      isNew: true,
      action: () => {
        openApp('diary')
        setShowDiary(true)
      }
    },
    {
      id: 'camera',
      name: '拍照相機',
      icon: <Camera className="w-7 h-7" />,
      color: 'from-purple-400 to-violet-500',
      bgGradient: 'bg-gradient-to-br from-purple-400 to-violet-500',
      iconBg: '📷',
      action: () => openApp('camera')
    },
    {
      id: 'music',
      name: 'K.K.音樂',
      icon: <Music className="w-7 h-7" />,
      color: 'from-amber-400 to-yellow-500',
      bgGradient: 'bg-gradient-to-br from-amber-400 to-yellow-500',
      iconBg: '🎵',
      action: () => openApp('music')
    },
    {
      id: 'friends',
      name: '好友護照',
      icon: <Users className="w-7 h-7" />,
      color: 'from-orange-400 to-red-500',
      bgGradient: 'bg-gradient-to-br from-orange-400 to-red-500',
      iconBg: '🎭',
      badge: npcs.length,
      action: () => openApp('friends')
    },
    {
      id: 'home',
      name: '快樂家園',
      icon: <Home className="w-7 h-7" />,
      color: 'from-indigo-400 to-blue-600',
      bgGradient: 'bg-gradient-to-br from-indigo-400 to-blue-600',
      iconBg: '🏠',
      action: () => openApp('home')
    },
    {
      id: 'collection',
      name: '收藏圖鑑',
      icon: <Fish className="w-7 h-7" />,
      color: 'from-teal-400 to-cyan-500',
      bgGradient: 'bg-gradient-to-br from-teal-400 to-cyan-500',
      iconBg: '🐠',
      action: () => openApp('collection')
    },
    {
      id: 'settings',
      name: '遊戲設定',
      icon: <Settings className="w-7 h-7" />,
      color: 'from-gray-400 to-slate-500',
      bgGradient: 'bg-gradient-to-br from-gray-400 to-slate-500',
      iconBg: '⚙️',
      action: () => {
        openApp('settings')
        setShowSettings(true)
      }
    }
  ]

  const openApp = (appId: string) => {
    setAppAnimation(true)
    setTimeout(() => {
      setCurrentApp(appId)
      setAppAnimation(false)
    }, 300)
  }

  const openChatApp = () => {
    setCurrentApp('chat')
    if (selectedNpc) {
      setShowDialogue(true)
    }
  }

  const togglePhone = () => {
    if (!isOpen) {
      // Play open animation
      setIsOpen(true)
      setCurrentApp(null)
    } else {
      // Play close animation
      setIsOpen(false)
      setTimeout(() => {
        setCurrentApp(null)
      }, 300)
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-TW', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    })
  }

  const getWeatherEmoji = () => {
    const hour = phoneTime.getHours()
    if (hour >= 6 && hour < 12) return '☀️'
    if (hour >= 12 && hour < 18) return '⛅'
    if (hour >= 18 && hour < 21) return '🌅'
    return '🌙'
  }

  return (
    <>
      {/* Phone Toggle Button - Animal Crossing Style */}
      <button
        onClick={togglePhone}
        className="fixed bottom-8 right-8 z-50 group"
      >
        <div className="relative">
          {/* Outer glow ring */}
          <div className="absolute inset-0 bg-gradient-to-br from-teal-300 to-green-400 rounded-3xl opacity-50 blur-xl group-hover:opacity-75 animate-pulse" />
          
          {/* Main button */}
          <div className="relative bg-gradient-to-br from-teal-400 via-teal-500 to-green-500 
                          rounded-3xl p-5 shadow-2xl transform group-hover:scale-110 group-hover:rotate-3
                          transition-all duration-300 border-4 border-white">
            <div className="relative">
              {/* Leaf decoration */}
              <div className="absolute -top-3 -right-3 text-2xl animate-bounce-slow">🍃</div>
              
              {/* Phone icon */}
              <div className="relative">
                <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 2h10a3 3 0 013 3v14a3 3 0 01-3 3H7a3 3 0 01-3-3V5a3 3 0 013-3zm0 2a1 1 0 00-1 1v14a1 1 0 001 1h10a1 1 0 001-1V5a1 1 0 00-1-1H7zm5 15a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/>
                </svg>
                
                {/* Notification badge */}
                {!isOpen && (
                  <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 
                                 flex items-center justify-center font-bold animate-bounce border-2 border-white">
                    3
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Decorative stars */}
          <div className="absolute -top-2 -left-2 text-yellow-300 animate-pulse">
            <Star className="w-4 h-4" fill="currentColor" />
          </div>
          <div className="absolute -bottom-2 -right-2 text-yellow-300 animate-pulse" style={{ animationDelay: '0.5s' }}>
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
      </button>

      {/* Phone Interface - Full Animal Crossing Style */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-blue-900/70 via-purple-900/70 to-pink-900/70 backdrop-blur-sm">
          {/* Background decorations */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-10 left-10 text-6xl opacity-20 animate-float">⭐</div>
            <div className="absolute bottom-20 right-20 text-5xl opacity-20 animate-float" style={{ animationDelay: '1s' }}>🌟</div>
            <div className="absolute top-1/2 left-20 text-4xl opacity-20 animate-float" style={{ animationDelay: '2s' }}>✨</div>
          </div>

          <div className={`relative w-full max-w-md transform transition-all duration-500 ${isOpen ? 'scale-100 rotate-0' : 'scale-0 rotate-180'}`}>
            {/* Phone Frame with Wood Pattern */}
            <div className="relative bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800 rounded-[4rem] p-4 shadow-2xl
                           border-4 border-amber-900"
                 style={{
                   backgroundImage: `
                     linear-gradient(135deg, rgba(217, 119, 6, 0.8), rgba(180, 83, 9, 0.9)),
                     repeating-linear-gradient(
                       90deg,
                       transparent,
                       transparent 20px,
                       rgba(120, 53, 15, 0.1) 20px,
                       rgba(120, 53, 15, 0.1) 40px
                     )
                   `
                 }}>
              {/* Phone notch decoration */}
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-amber-900 w-20 h-2 rounded-full opacity-50" />
              
              {/* Phone Screen */}
              <div className="relative bg-gradient-to-br from-yellow-50 via-green-50 to-blue-50 rounded-[3rem] overflow-hidden shadow-inner">
                {/* Screen pattern overlay */}
                <div className="absolute inset-0 opacity-5"
                     style={{
                       backgroundImage: `repeating-linear-gradient(
                         45deg,
                         transparent,
                         transparent 10px,
                         rgba(0, 0, 0, 0.1) 10px,
                         rgba(0, 0, 0, 0.1) 20px
                       )`
                     }} />

                {/* Status Bar - Animal Crossing Style */}
                <div className="relative bg-gradient-to-r from-teal-500 via-green-500 to-emerald-500 px-6 py-3 
                               shadow-lg border-b-4 border-teal-600">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="text-white font-bold text-lg ac-font flex items-center gap-1">
                        <span className="text-2xl">{getWeatherEmoji()}</span>
                        {formatTime(phoneTime)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        <div className="w-1 h-4 bg-white rounded-full opacity-80" />
                        <div className="w-1 h-5 bg-white rounded-full" />
                        <div className="w-1 h-3 bg-white rounded-full opacity-60" />
                        <div className="w-1 h-6 bg-white rounded-full opacity-90" />
                      </div>
                      <button
                        onClick={togglePhone}
                        className="text-white hover:bg-white/20 rounded-full p-2 transition-all duration-200
                                  hover:rotate-90 transform"
                      >
                        <X className="w-5 h-5" strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* App Grid or Current App with animation */}
                <div className="relative p-6 min-h-[550px] overflow-y-auto ac-scrollbar">
                  {appAnimation ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="animate-spin">
                        <Star className="w-12 h-12 text-yellow-400" fill="currentColor" />
                      </div>
                    </div>
                  ) : currentApp === null ? (
                    <>
                      {/* Welcome message */}
                      <div className="text-center mb-6 bg-white/70 rounded-3xl p-4 shadow-lg border-3 border-yellow-200">
                        <h2 className="text-2xl font-bold text-gray-800 ac-font mb-1">狸端機 Plus</h2>
                        <p className="text-sm text-gray-600">選擇一個應用程式開始吧！</p>
                      </div>
                      
                      {/* App Grid with enhanced animations */}
                      <div className="grid grid-cols-3 gap-4">
                        {apps.map((app, index) => (
                          <button
                            key={app.id}
                            onClick={app.action}
                            className="group relative animate-pop-in"
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            {/* App container */}
                            <div className="relative">
                              {/* Shadow and glow effect */}
                              <div className={`absolute inset-0 ${app.bgGradient} rounded-3xl opacity-50 blur-lg 
                                             group-hover:opacity-75 transition-opacity`} />
                              
                              {/* Main app icon */}
                              <div className={`relative ${app.bgGradient} rounded-3xl p-4 shadow-xl 
                                             group-hover:scale-110 group-hover:rotate-6 
                                             transition-all duration-300 border-4 border-white
                                             group-active:scale-95`}>
                                {/* Background emoji */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-20 text-5xl">
                                  {app.iconBg}
                                </div>
                                
                                {/* App icon */}
                                <div className="relative text-white flex justify-center">
                                  {app.icon}
                                </div>
                                
                                {/* Badge */}
                                {app.badge && (
                                  <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full 
                                                 w-6 h-6 flex items-center justify-center font-bold border-2 border-white
                                                 animate-bounce">
                                    {app.badge}
                                  </div>
                                )}
                                
                                {/* New indicator */}
                                {app.isNew && (
                                  <div className="absolute -top-2 -left-2 bg-yellow-400 text-yellow-900 text-xs 
                                                 rounded-full px-2 py-0.5 font-bold border-2 border-white
                                                 animate-pulse">
                                    NEW
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* App name with background */}
                            <div className="mt-2 bg-white/80 rounded-full px-2 py-1 shadow-md">
                              <span className="block text-center text-xs font-bold text-gray-700 ac-font">
                                {app.name}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <AppContent 
                      appId={currentApp} 
                      onBack={() => setCurrentApp(null)}
                    />
                  )}
                </div>

                {/* Home Indicator - Animal Crossing Style */}
                <div className="pb-4 flex justify-center bg-gradient-to-t from-white/50 to-transparent">
                  <button
                    onClick={() => setCurrentApp(null)}
                    className="group flex items-center gap-2 bg-white/80 hover:bg-white px-6 py-2 rounded-full 
                             shadow-lg transition-all duration-200 hover:scale-105 border-2 border-gray-300"
                  >
                    <Home className="w-4 h-4 text-gray-600 group-hover:text-teal-600" />
                    <span className="text-xs font-bold text-gray-600 group-hover:text-teal-600">HOME</span>
                  </button>
                </div>
              </div>
              
              {/* Phone frame decorations */}
              <div className="absolute top-1/2 -left-2 bg-amber-800 w-2 h-8 rounded-r-full" />
              <div className="absolute top-1/2 -right-2 bg-amber-800 w-2 h-12 rounded-l-full" />
              <div className="absolute top-1/3 -right-2 bg-amber-800 w-2 h-6 rounded-l-full" />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Enhanced App Content Component with Animal Crossing Style
const AppContent: React.FC<{ appId: string; onBack: () => void }> = ({ appId, onBack }) => {
  const { npcs } = useGameStore()

  const renderContent = () => {
    switch (appId) {
      case 'chat':
        return <ChatApp npcs={npcs} />
      case 'friends':
        return <FriendsApp npcs={npcs} />
      case 'camera':
        return <CameraApp />
      case 'music':
        return <MusicApp />
      case 'home':
        return <HomeApp />
      case 'collection':
        return <CollectionApp />
      default:
        return (
          <div className="text-center py-20">
            <div className="animate-bounce mb-4">
              <TreePine className="w-20 h-20 mx-auto text-green-400" />
            </div>
            <p className="text-gray-600 font-semibold">此應用程式正在建設中...</p>
            <p className="text-sm text-gray-400 mt-2">請稍後再來查看！</p>
          </div>
        )
    }
  }

  return (
    <div className="h-full flex flex-col animate-slide-up">
      <button
        onClick={onBack}
        className="mb-4 text-teal-600 font-bold flex items-center gap-2 hover:text-teal-700
                  bg-white/70 rounded-full px-4 py-2 w-fit shadow-md hover:shadow-lg
                  transition-all duration-200 hover:scale-105"
      >
        <span className="text-lg">←</span>
        <span>返回主畫面</span>
      </button>
      {renderContent()}
    </div>
  )
}

// Enhanced Chat App with AC Style
const ChatApp: React.FC<{ npcs: any[] }> = ({ npcs }) => {
  const { startConversation } = useGameStore()
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'online' | 'favorite'>('all')

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header with tabs */}
      <div className="bg-gradient-to-r from-green-100 to-teal-100 rounded-3xl p-4 shadow-lg border-3 border-green-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-3 ac-font flex items-center gap-2">
          <span className="text-3xl">💬</span>
          島民聊天室
        </h2>
        
        {/* Category tabs */}
        <div className="flex gap-2">
          {[
            { id: 'all', label: '全部', icon: '👥' },
            { id: 'online', label: '在線', icon: '🟢' },
            { id: 'favorite', label: '最愛', icon: '❤️' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id as any)}
              className={`px-4 py-2 rounded-full font-semibold text-sm transition-all duration-200
                        ${selectedCategory === tab.id 
                          ? 'bg-white text-green-600 shadow-md scale-105' 
                          : 'bg-green-200/50 text-gray-600 hover:bg-green-200'}`}
            >
              <span className="mr-1">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* NPC List with enhanced styling */}
      <div className="space-y-3">
        {npcs.map((npc, index) => (
          <button
            key={npc.id}
            onClick={() => startConversation(npc.id)}
            className="w-full group animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="relative bg-gradient-to-r from-white to-green-50 rounded-3xl p-4 shadow-lg 
                          border-3 border-transparent hover:border-green-400
                          transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
              {/* Online indicator */}
              <div className="absolute top-2 right-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
              </div>
              
              <div className="flex items-center gap-4">
                {/* Avatar with mood indicator */}
                <div className="relative">
                  <div className="w-14 h-14 bg-gradient-to-br from-teal-300 to-green-400 
                                rounded-full flex items-center justify-center text-2xl shadow-lg
                                group-hover:scale-110 transition-transform border-3 border-white">
                    {getMoodEmoji(npc.currentMood)}
                  </div>
                  {/* Mood ring */}
                  <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full 
                                 flex items-center justify-center text-xs
                                 bg-white border-2 border-green-400 shadow-md`}>
                    💭
                  </div>
                </div>
                
                {/* NPC Info */}
                <div className="text-left flex-1">
                  <p className="font-bold text-gray-800 text-lg ac-font">{npc.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {/* Relationship hearts */}
                    <div className="flex">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Heart 
                          key={i}
                          className={`w-3 h-3 ${i < npc.relationshipLevel 
                            ? 'text-pink-400 fill-pink-400' 
                            : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold">
                      {npc.currentMood}
                    </span>
                  </div>
                </div>
                
                {/* Chat icon */}
                <div className="bg-gradient-to-br from-green-400 to-teal-500 rounded-full p-3 
                              shadow-lg group-hover:rotate-12 transition-transform">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
              </div>
              
              {/* Last message preview */}
              <div className="mt-3 text-sm text-gray-500 italic bg-white/50 rounded-full px-3 py-1">
                "想和你聊聊今天的天氣呢..."
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// Enhanced Friends App with Passport Style
const FriendsApp: React.FC<{ npcs: any[] }> = ({ npcs }) => {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Passport header */}
      <div className="bg-gradient-to-r from-orange-100 to-red-100 rounded-3xl p-4 shadow-lg border-3 border-orange-200">
        <h2 className="text-2xl font-bold text-gray-800 ac-font flex items-center gap-2">
          <span className="text-3xl">🎭</span>
          好友護照
        </h2>
        <p className="text-sm text-gray-600 mt-1">記錄你與島民的友誼！</p>
      </div>

      {/* Friends cards */}
      <div className="space-y-3">
        {npcs.map((npc, index) => (
          <div
            key={npc.id}
            className="bg-gradient-to-r from-white via-yellow-50 to-orange-50 rounded-3xl p-5 
                      shadow-xl border-3 border-yellow-200 animate-slide-up relative overflow-hidden"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Passport stamp effect */}
            <div className="absolute top-2 right-2 opacity-20 transform rotate-12">
              <div className="w-16 h-16 border-4 border-red-400 rounded-full flex items-center justify-center">
                <Star className="w-8 h-8 text-red-400" fill="currentColor" />
              </div>
            </div>
            
            <div className="flex items-center gap-4 relative z-10">
              {/* Profile picture frame */}
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-300 via-orange-300 to-red-300 
                              rounded-2xl flex items-center justify-center text-3xl shadow-lg
                              border-3 border-white transform rotate-3">
                  {getMoodEmoji(npc.currentMood)}
                </div>
                {/* Level badge */}
                <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-yellow-400 to-orange-500 
                               text-white text-xs font-bold rounded-full w-8 h-8 
                               flex items-center justify-center border-2 border-white shadow-md">
                  Lv.{npc.relationshipLevel}
                </div>
              </div>
              
              {/* Friend info */}
              <div className="flex-1">
                <p className="font-bold text-gray-800 text-lg ac-font">{npc.name}</p>
                <p className="text-sm text-gray-600 italic">"{npc.personality}"</p>
                
                {/* Stats */}
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full font-semibold flex items-center gap-1">
                    <Heart className="w-3 h-3" fill="currentColor" />
                    友情值: {npc.relationshipLevel * 10}
                  </span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {npc.currentMood}
                  </span>
                </div>
              </div>
              
              {/* Gift button */}
              <button className="bg-gradient-to-br from-pink-400 to-red-500 text-white rounded-full 
                               p-3 shadow-lg hover:scale-110 transition-transform">
                <Gift className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Enhanced Camera App
const CameraApp: React.FC = () => {
  const [filter, setFilter] = useState('normal')
  
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-3xl p-6 shadow-lg border-3 border-purple-200">
        <Camera className="w-24 h-24 mx-auto text-purple-400 mb-4 animate-bounce-slow" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center ac-font">拍照相機</h2>
        <p className="text-gray-600 text-center">捕捉島上的美好時刻！</p>
        
        {/* Filter options */}
        <div className="flex justify-center gap-2 mt-6">
          {['🌸 櫻花', '🌅 夕陽', '🌙 月光', '✨ 閃亮'].map((filterName) => (
            <button
              key={filterName}
              className="px-3 py-2 bg-white/80 rounded-full text-sm font-semibold
                       hover:bg-purple-200 transition-colors shadow-md"
            >
              {filterName}
            </button>
          ))}
        </div>
        
        <button className="mt-6 w-full bg-gradient-to-r from-purple-400 to-pink-500 text-white 
                         px-6 py-4 rounded-full font-bold text-lg
                         hover:shadow-xl transition-all duration-200 hover:scale-105
                         border-3 border-white shadow-lg flex items-center justify-center gap-2">
          <Camera className="w-6 h-6" />
          開始拍照
        </button>
      </div>
    </div>
  )
}

// Enhanced Music App with K.K. Slider theme
const MusicApp: React.FC = () => {
  const [currentSong, setCurrentSong] = useState(0)
  const songs = [
    { title: 'K.K.搖籃曲', artist: 'K.K.', mood: '😴', playing: true },
    { title: 'K.K.爵士', artist: 'K.K.', mood: '🎷', playing: false },
    { title: 'K.K.巴薩諾瓦', artist: 'K.K.', mood: '🏝️', playing: false },
    { title: '動森主題曲', artist: '系統音樂', mood: '🌟', playing: false }
  ]

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Music player header */}
      <div className="bg-gradient-to-r from-yellow-100 to-amber-100 rounded-3xl p-6 shadow-lg border-3 border-yellow-200">
        <div className="flex items-center justify-center mb-4">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full 
                          flex items-center justify-center animate-spin-slow shadow-xl border-4 border-white">
              <div className="w-8 h-8 bg-white rounded-full" />
            </div>
            <Music className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                           w-10 h-10 text-orange-700" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-4 ac-font">K.K.音樂播放器</h2>
        
        {/* Now playing */}
        <div className="bg-white/70 rounded-2xl p-3 text-center shadow-inner">
          <p className="text-sm text-gray-600">正在播放</p>
          <p className="font-bold text-lg text-gray-800">{songs[currentSong].title}</p>
          <p className="text-sm text-gray-500">{songs[currentSong].artist}</p>
        </div>
        
        {/* Controls */}
        <div className="flex justify-center gap-4 mt-4">
          <button className="w-12 h-12 bg-white rounded-full shadow-lg hover:scale-110 transition-transform
                           flex items-center justify-center text-gray-700">
            ⏮
          </button>
          <button className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full 
                           shadow-xl hover:scale-110 transition-transform
                           flex items-center justify-center text-white text-xl border-3 border-white">
            ⏸
          </button>
          <button className="w-12 h-12 bg-white rounded-full shadow-lg hover:scale-110 transition-transform
                           flex items-center justify-center text-gray-700">
            ⏭
          </button>
        </div>
      </div>

      {/* Song list */}
      <div className="space-y-2">
        {songs.map((song, index) => (
          <button
            key={index}
            onClick={() => setCurrentSong(index)}
            className={`w-full bg-gradient-to-r from-white to-yellow-50 rounded-2xl p-4 shadow-md 
                      border-3 transition-all duration-300 hover:scale-[1.02]
                      ${index === currentSong ? 'border-yellow-400 bg-yellow-50' : 'border-transparent'}`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg
                            ${index === currentSong 
                              ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white animate-bounce-slow' 
                              : 'bg-gray-200'}`}>
                {song.mood}
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-gray-800">{song.title}</p>
                <p className="text-sm text-gray-500">{song.artist}</p>
              </div>
              {index === currentSong && (
                <div className="flex gap-1">
                  <span className="w-1 h-4 bg-yellow-400 rounded-full animate-pulse" />
                  <span className="w-1 h-6 bg-orange-400 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }} />
                  <span className="w-1 h-3 bg-yellow-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// Enhanced Home Decoration App
const HomeApp: React.FC = () => {
  const categories = [
    { icon: '🪑', name: '傢俱', color: 'from-indigo-100 to-blue-100', count: 42 },
    { icon: '🌸', name: '裝飾', color: 'from-pink-100 to-rose-100', count: 28 },
    { icon: '🖼️', name: '壁紙', color: 'from-green-100 to-teal-100', count: 16 },
    { icon: '🏮', name: '燈具', color: 'from-yellow-100 to-orange-100', count: 12 },
    { icon: '🪴', name: '植物', color: 'from-green-200 to-emerald-200', count: 35 },
    { icon: '🎨', name: '地板', color: 'from-purple-100 to-violet-100', count: 20 }
  ]

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-gradient-to-r from-indigo-100 to-blue-100 rounded-3xl p-6 shadow-lg border-3 border-indigo-200">
        <Home className="w-20 h-20 mx-auto text-indigo-400 mb-4 animate-bounce-slow" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center ac-font">快樂家園</h2>
        <p className="text-gray-600 text-center">打造你的夢想之家！</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {categories.map((category, index) => (
          <button
            key={category.name}
            className={`relative bg-gradient-to-br ${category.color} p-4 rounded-2xl 
                      hover:scale-105 transition-all duration-200 shadow-lg border-3 border-white
                      animate-pop-in`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="text-3xl mb-2">{category.icon}</div>
            <p className="text-sm font-bold text-gray-700">{category.name}</p>
            <div className="absolute top-1 right-1 bg-white text-xs font-bold text-gray-600 
                          rounded-full w-6 h-6 flex items-center justify-center shadow-md">
              {category.count}
            </div>
          </button>
        ))}
      </div>

      {/* Room preview */}
      <div className="bg-white/80 rounded-3xl p-4 shadow-lg border-3 border-gray-200">
        <p className="text-sm font-semibold text-gray-600 mb-2">房間預覽</p>
        <div className="h-32 bg-gradient-to-b from-sky-100 to-green-100 rounded-2xl 
                      flex items-center justify-center text-gray-400">
          <Palette className="w-8 h-8" />
        </div>
      </div>
    </div>
  )
}

// New Collection App
const CollectionApp: React.FC = () => {
  const collections = [
    { icon: '🐠', name: '魚類', progress: 45, total: 80 },
    { icon: '🦋', name: '昆蟲', progress: 32, total: 80 },
    { icon: '🦴', name: '化石', progress: 12, total: 73 },
    { icon: '🎨', name: '藝術品', progress: 8, total: 43 },
    { icon: '🐚', name: '海洋生物', progress: 18, total: 40 },
    { icon: '🎵', name: '唱片', progress: 28, total: 95 }
  ]

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-gradient-to-r from-teal-100 to-cyan-100 rounded-3xl p-6 shadow-lg border-3 border-teal-200">
        <Fish className="w-20 h-20 mx-auto text-teal-400 mb-4 animate-float" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center ac-font">收藏圖鑑</h2>
        <p className="text-gray-600 text-center">完成你的博物館收藏！</p>
      </div>

      <div className="space-y-3">
        {collections.map((item, index) => (
          <div
            key={item.name}
            className="bg-white rounded-2xl p-4 shadow-lg border-3 border-gray-200 animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-center gap-4">
              <div className="text-3xl">{item.icon}</div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <p className="font-bold text-gray-800">{item.name}</p>
                  <span className="text-sm font-semibold text-gray-600">
                    {item.progress}/{item.total}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full transition-all duration-500"
                    style={{ width: `${(item.progress / item.total) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  完成度: {Math.round((item.progress / item.total) * 100)}%
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Helper function
const getMoodEmoji = (mood: string) => {
  switch (mood) {
    case 'cheerful': return '😊'
    case 'calm': return '😌'
    case 'dreamy': return '✨'
    case 'peaceful': return '🕊️'
    case 'excited': return '🌟'
    case 'thoughtful': return '🤔'
    case 'warm': return '🤗'
    default: return '😊'
  }
}