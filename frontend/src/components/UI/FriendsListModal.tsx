import React from 'react'
import { useGameStore } from '@/stores/gameStore'

export const FriendsListModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { friends } = useGameStore()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#4CAF50'
      case 'away': return '#FF9800'
      case 'busy': return '#F44336'
      default: return '#9E9E9E'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return '線上'
      case 'away': return '離開'
      case 'busy': return '忙碌'
      default: return '離線'
    }
  }

  const getRelationshipText = (level: number) => {
    if (level >= 4) return '摯友'
    if (level >= 3) return '好友'
    if (level >= 2) return '朋友'
    return '認識'
  }

  const formatLastSeen = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    
    if (minutes < 1) return '剛剛'
    if (minutes < 60) return `${minutes}分鐘前`
    if (hours < 24) return `${hours}小時前`
    return date.toLocaleDateString()
  }

  return (
    <>
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
        onClick={onClose}
      >
        <div 
          className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-3xl shadow-2xl w-[600px] h-[500px] p-8 relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Background effects */}
          <div className="absolute inset-0 bg-gradient-radial from-white/20 to-transparent pointer-events-none" />
          <div className="absolute top-4 right-4 text-pink-300 text-2xl animate-pulse">💕</div>
          <div className="absolute bottom-4 left-4 text-pink-300 text-xl animate-pulse delay-1000">✨</div>
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-12 text-pink-600 hover:text-pink-800 text-3xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-pink-200 transition-all duration-200"
          >
            ×
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-pink-800 mb-2">👫 好友列表</h2>
            <p className="text-pink-600">與你親愛的朋友們保持聯繫</p>
          </div>

          {/* Friends List */}
          <div className="h-[320px] overflow-y-auto space-y-3">
            {friends.map((friend) => (
              <div
                key={friend.id}
                className="bg-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 border border-pink-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-br from-pink-200 to-pink-300 rounded-full flex items-center justify-center text-2xl">
                        {friend.avatar}
                      </div>
                      <div 
                        className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white"
                        style={{ backgroundColor: getStatusColor(friend.status) }}
                      />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-bold text-pink-800 text-lg">{friend.name}</h3>
                        <span className="text-xs bg-pink-200 text-pink-700 px-2 py-1 rounded-full">
                          Lv.{friend.level}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 text-sm text-pink-600">
                        <span className="flex items-center space-x-1">
                          <div 
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: getStatusColor(friend.status) }}
                          />
                          <span>{getStatusText(friend.status)}</span>
                        </span>
                        <span>•</span>
                        <span>{getRelationshipText(friend.relationshipLevel)}</span>
                      </div>
                      {friend.location && (
                        <p className="text-xs text-pink-500 mt-1">📍 {friend.location}</p>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-pink-500 mb-2">
                      {friend.status === 'online' ? '現在上線' : formatLastSeen(friend.lastSeen)}
                    </div>
                    <div className="flex space-x-2">
                      <button className="bg-pink-500 hover:bg-pink-600 text-white px-3 py-1 rounded-full text-sm transition-colors duration-200">
                        聊天
                      </button>
                      <button className="bg-pink-200 hover:bg-pink-300 text-pink-700 px-3 py-1 rounded-full text-sm transition-colors duration-200">
                        拜訪
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-4 text-center">
            <button className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105 shadow-lg">
              + 尋找新朋友
            </button>
          </div>
        </div>
      </div>
    </>
  )
}