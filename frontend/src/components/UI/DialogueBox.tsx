import { useState, useRef, useEffect } from 'react'
import { Send, Heart } from 'lucide-react'
import { useGameStore } from '@/stores/gameStore'
import { useSocketConnection } from '@/hooks/useSocketConnection'

export const DialogueBox = () => {
  const [inputMessage, setInputMessage] = useState('')
  const [isExpanded] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const { 
    selectedNpc, 
    npcs, 
    dialogueHistory, 
    currentDialogue, 
    isTyping,
    endConversation 
  } = useGameStore()
  
  const { sendMessage } = useSocketConnection()

  const currentNpc = npcs.find(npc => npc.id === selectedNpc)

  // 自動滾動到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [dialogueHistory, currentDialogue])

  // 自動聚焦輸入框
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isExpanded])

  const handleSendMessage = () => {
    if (!inputMessage.trim() || !selectedNpc) return
    
    sendMessage(selectedNpc, inputMessage.trim())
    setInputMessage('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

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

  if (!currentNpc) return null

  return (
    <div className="dialogue-box w-full animate-slide-up">
      {/* Modern Animal Crossing Style Dialogue Box */}
      <div className="relative">
        {/* Character Bubble Tail */}
        <div className="absolute -top-6 left-20 w-12 h-12 bg-white/95 rounded-full 
                       transform rotate-45 shadow-lg" />
        
        {/* Main Dialogue Container */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl 
                       border-4 border-white/50 overflow-hidden">
          {/* Header with Character Info */}
          <div className="bg-gradient-to-r from-blue-100 to-purple-100 px-6 py-4 
                         flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Character Avatar */}
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-200 to-yellow-300 
                               flex items-center justify-center text-3xl shadow-lg
                               transform hover:scale-110 transition-transform duration-300">
                  {getMoodEmoji(currentNpc.currentMood)}
                </div>
                {/* Mood Indicator */}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full 
                               shadow-md flex items-center justify-center">
                  <span className="text-xs">💭</span>
                </div>
              </div>
              
              {/* Character Name & Status */}
              <div>
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  {currentNpc.name}
                  {/* Speaking Animation */}
                  {isTyping && (
                    <span className="inline-flex gap-1">
                      <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" 
                            style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" 
                            style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" 
                            style={{ animationDelay: '300ms' }} />
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-3">
                  {/* Relationship Hearts */}
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Heart 
                        key={i} 
                        className={`w-4 h-4 transition-all duration-300 ${
                          i < currentNpc.relationshipLevel 
                            ? 'fill-pink-400 text-pink-400 scale-110' 
                            : 'text-gray-300 scale-90'
                        }`} 
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600 capitalize bg-white/50 px-2 py-0.5 rounded-full">
                    {currentNpc.currentMood}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Close Button */}
            <button
              onClick={endConversation}
              className="w-10 h-10 rounded-full bg-white/80 hover:bg-white 
                        flex items-center justify-center text-gray-500 hover:text-gray-700
                        transition-all duration-200 hover:scale-110 shadow-md"
            >
              <span className="text-xl font-bold">×</span>
            </button>
          </div>

          {/* Messages Area - Modern Chat Style */}
          <div className="h-80 overflow-y-auto px-6 py-4 space-y-4 
                         bg-gradient-to-b from-blue-50/50 to-purple-50/50">
            
            {/* Conversation History */}
            {dialogueHistory.map((message, index) => {
              const isUser = index % 2 === 1
              return (
                <div key={index} className={`animate-slide-up flex items-end gap-3 ${
                  isUser ? 'flex-row-reverse' : ''
                }`} style={{ animationDelay: `${index * 100}ms` }}>
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center 
                                  shadow-lg shrink-0 ${
                    isUser 
                      ? 'bg-gradient-to-br from-blue-400 to-blue-500 text-white' 
                      : 'bg-gradient-to-br from-yellow-200 to-yellow-300'
                  }`}>
                    {isUser ? '😊' : getMoodEmoji(currentNpc.currentMood)}
                  </div>
                  
                  {/* Message Bubble */}
                  <div className={`max-w-xs lg:max-w-md ${
                    isUser ? 'ml-auto' : 'mr-auto'
                  }`}>
                    <div className={`p-4 shadow-lg border-2 ${
                      isUser 
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-3xl rounded-br-lg border-blue-300' 
                        : 'bg-white rounded-3xl rounded-bl-lg border-yellow-200'
                    }`}>
                      <p className={`text-sm leading-relaxed ${
                        isUser ? 'text-white' : 'text-gray-800'
                      }`}>
                        {message}
                      </p>
                    </div>
                    {/* Timestamp */}
                    <p className={`text-xs text-gray-500 mt-1 px-2 ${
                      isUser ? 'text-right' : 'text-left'
                    }`}>
                      剛剛
                    </p>
                  </div>
                </div>
              )
            })}

            {/* Current NPC Message */}
            {currentDialogue && (
              <div className="animate-slide-up flex items-end gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-yellow-200 to-yellow-300 
                               flex items-center justify-center shadow-lg shrink-0">
                  {getMoodEmoji(currentNpc.currentMood)}
                </div>
                <div className="max-w-xs lg:max-w-md">
                  <div className="p-4 bg-white rounded-3xl rounded-bl-lg shadow-lg border-2 border-yellow-200">
                    <p className="text-sm leading-relaxed text-gray-800">
                      {currentDialogue}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 px-2">剛剛</p>
                </div>
              </div>
            )}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="animate-slide-up flex items-end gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-yellow-200 to-yellow-300 
                               flex items-center justify-center shadow-lg shrink-0">
                  {getMoodEmoji(currentNpc.currentMood)}
                </div>
                <div className="max-w-xs">
                  <div className="p-4 bg-white rounded-3xl rounded-bl-lg shadow-lg border-2 border-yellow-200">
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-gray-600 mr-2">正在輸入</span>
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" 
                             style={{animationDelay: '0.1s'}} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" 
                             style={{animationDelay: '0.2s'}} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Auto-scroll anchor */}
            <div ref={messagesEndRef} />
          </div>

          {/* Modern Input Area */}
          <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-t-4 border-yellow-200">
            <div className="flex items-center gap-3">
              {/* User Avatar */}
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-500 
                             flex items-center justify-center text-white shadow-lg shrink-0">
                😊
              </div>
              
              {/* Input Field */}
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={`和 ${currentNpc.name} 聊天...`}
                  className="w-full px-4 py-3 pr-20 rounded-2xl bg-white border-2 border-gray-200 
                            focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-blue-400
                            text-gray-800 placeholder-gray-400 shadow-inner
                            transition-all duration-200"
                  disabled={isTyping}
                  maxLength={100}
                />
                
                {/* Character Counter */}
                <div className="absolute right-14 top-1/2 transform -translate-y-1/2">
                  <span className={`text-xs ${
                    inputMessage.length > 80 ? 'text-red-500' : 'text-gray-400'
                  }`}>
                    {inputMessage.length}/100
                  </span>
                </div>
              </div>
              
              {/* Send Button */}
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isTyping || inputMessage.length > 100}
                className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400 to-green-500 
                          text-white shadow-lg hover:shadow-xl
                          hover:scale-110 active:scale-95 
                          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                          transition-all duration-200 flex items-center justify-center"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            
            {/* Quick Actions */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex gap-2 flex-wrap">
                {[
                  { text: '👋 你好！', emoji: '👋' },
                  { text: '😊 最近怎麼樣？', emoji: '😊' },
                  { text: '💬 聊聊你的故事', emoji: '💬' },
                  { text: '✨ 你的夢想是什麼？', emoji: '✨' }
                ].map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setInputMessage(suggestion.text.split(' ').slice(1).join(' '))}
                    className="px-3 py-1.5 bg-gradient-to-r from-blue-100 to-purple-100 
                               hover:from-blue-200 hover:to-purple-200 
                               text-gray-700 rounded-full text-xs
                               transition-all duration-200 hover:scale-105 
                               border border-blue-200 hover:border-blue-300
                               flex items-center gap-1"
                  >
                    <span>{suggestion.emoji}</span>
                    <span>{suggestion.text.split(' ').slice(1).join(' ')}</span>
                  </button>
                ))}
              </div>
              
              <span className="text-xs text-gray-500 hidden sm:block">
                Enter 送出 • Shift+Enter 換行
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}