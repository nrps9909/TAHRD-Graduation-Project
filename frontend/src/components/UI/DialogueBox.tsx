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
    <div className="dialogue-box max-w-2xl mx-auto">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/30 overflow-hidden">
        {/* 標題欄 */}
        <div className="bg-gradient-to-r from-healing-warm to-healing-gentle p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-white/80 flex items-center justify-center text-2xl">
              {getMoodEmoji(currentNpc.currentMood)}
            </div>
            <div>
              <h3 className="font-bold text-gray-800">{currentNpc.name}</h3>
              <p className="text-sm text-gray-600 capitalize">{currentNpc.currentMood}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* 關係等級指示器 */}
            <div className="flex items-center space-x-1">
              {Array.from({ length: currentNpc.relationshipLevel }, (_, i) => (
                <Heart key={i} className="w-4 h-4 fill-red-400 text-red-400" />
              ))}
              {Array.from({ length: 5 - currentNpc.relationshipLevel }, (_, i) => (
                <Heart key={i + currentNpc.relationshipLevel} className="w-4 h-4 text-gray-300" />
              ))}
            </div>
            
            <button
              onClick={endConversation}
              className="text-gray-500 hover:text-gray-700 text-xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* 對話內容區域 */}
        <div className="h-80 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-transparent to-healing-gentle/20">
          {/* 當前 NPC 對話 */}
          {currentDialogue && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-healing-soft to-healing-gentle flex items-center justify-center text-sm">
                {getMoodEmoji(currentNpc.currentMood)}
              </div>
              <div className="flex-1">
                <div className="bg-white/80 rounded-2xl rounded-tl-sm p-3 shadow-sm">
                  <p className="text-gray-800 leading-relaxed">
                    {currentDialogue}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 對話歷史 */}
          {dialogueHistory.map((message, index) => (
            <div key={index} className={`flex items-start space-x-3 ${
              index % 2 === 1 ? 'flex-row-reverse space-x-reverse' : ''
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                index % 2 === 1 
                  ? 'bg-gradient-to-br from-blue-400 to-blue-500 text-white' 
                  : 'bg-gradient-to-br from-healing-soft to-healing-gentle'
              }`}>
                {index % 2 === 1 ? '👤' : getMoodEmoji(currentNpc.currentMood)}
              </div>
              <div className="flex-1">
                <div className={`rounded-2xl p-3 shadow-sm max-w-xs ${
                  index % 2 === 1 
                    ? 'bg-blue-500 text-white rounded-tr-sm ml-auto' 
                    : 'bg-white/80 text-gray-800 rounded-tl-sm'
                }`}>
                  <p className="leading-relaxed text-sm">
                    {message}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* 輸入指示器 */}
          {isTyping && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-healing-soft to-healing-gentle flex items-center justify-center text-sm">
                {getMoodEmoji(currentNpc.currentMood)}
              </div>
              <div className="flex-1">
                <div className="bg-white/80 rounded-2xl rounded-tl-sm p-3 shadow-sm">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 輸入區域 */}
        <div className="p-4 bg-white/90 border-t border-white/30">
          <div className="flex items-center space-x-3">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`和${currentNpc.name}聊天...`}
              className="flex-1 px-4 py-3 rounded-full border border-gray-200 focus:border-blue-400 focus:outline-none bg-white/80 backdrop-blur-sm"
              disabled={isTyping}
            />
            
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isTyping}
              className="p-3 rounded-full bg-gradient-to-r from-blue-400 to-blue-500 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          
          {/* 快捷回應選項 */}
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              '你好！',
              '最近怎麼樣？',
              '聊聊你的故事吧',
              '我想了解你更多',
            ].map((suggestion, index) => (
              <button
                key={index}
                onClick={() => setInputMessage(suggestion)}
                className="px-3 py-1 text-sm bg-healing-gentle/50 hover:bg-healing-gentle text-gray-700 rounded-full transition-colors duration-200"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}