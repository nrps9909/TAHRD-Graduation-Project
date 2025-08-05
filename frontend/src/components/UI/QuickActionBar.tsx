import { useState } from 'react'
import { useGameStore } from '@/stores/gameStore'

export const QuickActionBar = () => {
  const { selectedNpc } = useGameStore()
  const [isExpanded, setIsExpanded] = useState(false)

  const quickActions = [
    {
      id: 'wave',
      icon: '👋',
      label: '打招呼',
      action: () => console.log('Wave!')
    },
    {
      id: 'gift',
      icon: '🎁',
      label: '送禮物',
      action: () => console.log('Gift!')
    },
    {
      id: 'photo',
      icon: '📸',
      label: '拍照',
      action: () => console.log('Photo!')
    },
    {
      id: 'emote',
      icon: '😊',
      label: '表情',
      action: () => console.log('Emote!')
    }
  ]

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40">
      {/* Expand/Collapse Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`absolute -top-12 left-1/2 transform -translate-x-1/2
                   bg-white/90 backdrop-blur-sm rounded-full w-10 h-10
                   shadow-lg hover:shadow-xl transition-all duration-300
                   ${isExpanded ? 'rotate-180' : ''}`}
      >
        <span className="text-gray-600">▲</span>
      </button>

      {/* Quick Action Container */}
      <div className={`bg-white/90 backdrop-blur-md rounded-full 
                      shadow-2xl border-4 border-white/50
                      transition-all duration-300 ease-out
                      ${isExpanded ? 'p-4' : 'p-2 opacity-80'}`}>
        <div className={`flex items-center gap-2 transition-all duration-300
                        ${isExpanded ? 'gap-4' : 'gap-1'}`}>
          {quickActions.map((action, index) => (
            <button
              key={action.id}
              onClick={action.action}
              className={`relative group transition-all duration-300 ease-out
                         ${isExpanded 
                           ? 'w-16 h-16 hover:scale-110' 
                           : 'w-12 h-12 hover:scale-105'}
                         bg-gradient-to-br from-white to-gray-100
                         rounded-2xl shadow-md hover:shadow-xl
                         flex items-center justify-center
                         border-2 border-white/50`}
              style={{
                animationDelay: `${index * 50}ms`
              }}
            >
              <span className={`transition-all duration-300
                              ${isExpanded ? 'text-2xl' : 'text-lg'}`}>
                {action.icon}
              </span>
              
              {/* Tooltip */}
              {isExpanded && (
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2
                               bg-gray-800/90 text-white text-xs px-3 py-1 rounded-full
                               whitespace-nowrap opacity-0 group-hover:opacity-100
                               transition-opacity duration-200 pointer-events-none">
                  {action.label}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2
                                 w-0 h-0 border-l-4 border-r-4 border-t-4
                                 border-transparent border-t-gray-800/90" />
                </div>
              )}
            </button>
          ))}
          
          {/* Separator */}
          {isExpanded && selectedNpc && (
            <>
              <div className="w-px h-12 bg-gray-300/50 mx-2" />
              
              {/* Talk Button - Special */}
              <button
                onClick={() => console.log('Start conversation!')}
                className="relative group w-20 h-16 
                          bg-gradient-to-br from-blue-400 to-blue-500
                          rounded-2xl shadow-lg hover:shadow-xl
                          flex items-center justify-center
                          border-2 border-white/50
                          hover:scale-110 transition-all duration-300
                          text-white font-bold animate-pulse"
              >
                <span className="text-2xl">💬</span>
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2
                               bg-gray-800/90 text-white text-xs px-3 py-1 rounded-full
                               whitespace-nowrap opacity-0 group-hover:opacity-100
                               transition-opacity duration-200 pointer-events-none">
                  對話
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2
                                 w-0 h-0 border-l-4 border-r-4 border-t-4
                                 border-transparent border-t-gray-800/90" />
                </div>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}