import React, { useState, useRef, useEffect } from 'react'
import { useGameStore } from '@/stores/gameStore'

export const ChatRoomModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { chatRooms, chatMessages, addChatMessage } = useGameStore()
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(chatRooms[0]?.id || null)
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const selectedRoom = chatRooms.find(room => room.id === selectedRoomId)
  const roomMessages = chatMessages.filter(msg => msg.chatRoomId === selectedRoomId)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [roomMessages])

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedRoomId) return

    const message = {
      id: `msg-${Date.now()}`,
      chatRoomId: selectedRoomId,
      content: newMessage,
      sender: 'player-1',
      senderName: '旅人',
      timestamp: new Date(),
      messageType: 'text' as const
    }

    addChatMessage(message)
    setNewMessage('')
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (date: Date) => {
    const today = new Date()
    if (date.toDateString() === today.toDateString()) {
      return '今天'
    }
    return date.toLocaleDateString('zh-TW')
  }

  return (
    <>
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
        onClick={onClose}
      >
        <div 
          className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-3xl shadow-2xl w-[900px] h-[600px] relative overflow-hidden flex"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Background effects */}
          <div className="absolute inset-0 bg-gradient-radial from-white/20 to-transparent pointer-events-none" />
          <div className="absolute top-4 right-4 text-blue-300 text-2xl animate-pulse">💬</div>
          <div className="absolute bottom-4 left-4 text-indigo-300 text-xl animate-pulse delay-1000">✨</div>
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-12 text-blue-600 hover:text-blue-800 text-3xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-blue-200 transition-all duration-200 z-10"
          >
            ×
          </button>

          {/* Chat Room List */}
          <div className="w-1/3 p-6 border-r border-blue-200">
            <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center">
              💬 聊天室
            </h3>
            <div className="space-y-2">
              {chatRooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => setSelectedRoomId(room.id)}
                  className={`p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                    selectedRoomId === room.id
                      ? 'bg-blue-200 border-2 border-blue-400'
                      : 'bg-white hover:bg-blue-100 border border-blue-150'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">
                        {room.type === 'group' ? '👥' : '💬'}
                      </span>
                      <span className="font-medium text-blue-800 text-sm">{room.name}</span>
                    </div>
                    {room.unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                        {room.unreadCount}
                      </span>
                    )}
                  </div>
                  {room.lastMessage && (
                    <div className="text-xs text-blue-600">
                      <p className="truncate">{room.lastMessage.content}</p>
                      <p className="text-blue-400 mt-1">{formatTime(room.lastMessage.timestamp)}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {selectedRoom ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-blue-200 bg-white/50">
                  <h3 className="text-lg font-bold text-blue-800 flex items-center">
                    <span className="mr-2">
                      {selectedRoom.type === 'group' ? '👥' : '💬'}
                    </span>
                    {selectedRoom.name}
                  </h3>
                  <p className="text-sm text-blue-600">
                    {selectedRoom.participants.length} 位成員
                  </p>
                </div>

                {/* Messages */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                  {roomMessages.map((message, index) => {
                    const showDate = index === 0 || 
                      formatDate(message.timestamp) !== formatDate(roomMessages[index - 1].timestamp)
                    
                    return (
                      <div key={message.id}>
                        {showDate && (
                          <div className="text-center text-xs text-blue-500 mb-4">
                            <span className="bg-white px-3 py-1 rounded-full">
                              {formatDate(message.timestamp)}
                            </span>
                          </div>
                        )}
                        <div
                          className={`flex ${
                            message.sender === 'player-1' ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-xs px-4 py-2 rounded-2xl ${
                              message.sender === 'player-1'
                                ? 'bg-blue-500 text-white'
                                : 'bg-white text-blue-800 border border-blue-200'
                            }`}
                          >
                            {message.sender !== 'player-1' && (
                              <p className="text-xs font-medium mb-1 opacity-70">
                                {message.senderName}
                              </p>
                            )}
                            <p className="text-sm">{message.content}</p>
                            <p className={`text-xs mt-1 ${
                              message.sender === 'player-1' ? 'text-blue-100' : 'text-blue-500'
                            }`}>
                              {formatTime(message.timestamp)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-blue-200 bg-white/50">
                  <div className="flex space-x-3">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="輸入訊息..."
                      className="flex-1 px-4 py-2 border border-blue-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <button
                      onClick={handleSendMessage}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-full transition-colors duration-200 font-medium"
                    >
                      發送
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-blue-600">
                <p>選擇一個聊天室開始對話</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}