import React, { useEffect, useState } from 'react'
import { MessageCircle, Heart, Music, Sparkles } from 'lucide-react'
import { useSocketConnection } from '@/hooks/useSocketConnection'
import { useGameStore } from '@/stores/gameStore'

interface NPCConversationMessage {
  speakerId: string
  speakerName: string
  listenerId: string
  listenerName: string
  content: string
  emotion: string
  topic: string
  timestamp: Date
}

interface ConversationBubble {
  id: string
  messages: NPCConversationMessage[]
  position: { x: number; y: number; z: number }
  isActive: boolean
}

export const NPCConversationBubble: React.FC = () => {
  const [conversations, setConversations] = useState<Map<string, ConversationBubble>>(new Map())
  const { socket } = useSocketConnection()
  const { npcs } = useGameStore()

  useEffect(() => {
    if (!socket) return

    // 監聽NPC對話事件
    const handleNPCConversation = (data: any) => {
      if (data.type === 'message') {
        const key = `${data.speakerId}-${data.listenerId}`
        const reverseKey = `${data.listenerId}-${data.speakerId}`
        
        setConversations(prev => {
          const newMap = new Map(prev)
          const existingKey = newMap.has(key) ? key : newMap.has(reverseKey) ? reverseKey : key
          
          const conversation = newMap.get(existingKey) || {
            id: existingKey,
            messages: [],
            position: calculatePosition(data.speakerId, data.listenerId),
            isActive: true
          }
          
          conversation.messages.push({
            speakerId: data.speakerId,
            speakerName: data.speakerName,
            listenerId: data.listenerId,
            listenerName: data.listenerName,
            content: data.content,
            emotion: data.emotion,
            topic: data.topic,
            timestamp: new Date(data.timestamp)
          })
          
          // 只保留最近5條消息
          if (conversation.messages.length > 5) {
            conversation.messages = conversation.messages.slice(-5)
          }
          
          newMap.set(existingKey, conversation)
          return newMap
        })
      } else if (data.type === 'ended') {
        // 對話結束，3秒後移除泡泡
        setTimeout(() => {
          setConversations(prev => {
            const newMap = new Map(prev)
            // 找到並移除相關對話
            for (const [key, conv] of newMap.entries()) {
              if (conv.messages.some(m => 
                (m.speakerName === data.npc1 || m.speakerName === data.npc2) &&
                (m.listenerName === data.npc1 || m.listenerName === data.npc2)
              )) {
                newMap.delete(key)
              }
            }
            return newMap
          })
        }, 3000)
      }
    }

    socket.on('npc-conversation', handleNPCConversation)

    return () => {
      socket.off('npc-conversation', handleNPCConversation)
    }
  }, [socket, npcs])

  // 計算對話泡泡位置（基於兩個NPC的中點）
  const calculatePosition = (npc1Id: string, npc2Id: string) => {
    const npc1 = npcs.find(n => n.id === npc1Id)
    const npc2 = npcs.find(n => n.id === npc2Id)
    
    if (!npc1 || !npc2) {
      return { x: 50, y: 50, z: 0 }
    }
    
    // 計算屏幕上的相對位置
    return {
      x: (npc1.position.x + npc2.position.x) / 2,
      y: Math.max(npc1.position.y, npc2.position.y) + 2,
      z: (npc1.position.z + npc2.position.z) / 2
    }
  }

  const getEmotionIcon = (emotion: string) => {
    switch (emotion) {
      case 'cheerful':
      case 'excited':
        return '😊'
      case 'calm':
      case 'peaceful':
        return '😌'
      case 'dreamy':
        return '✨'
      case 'thoughtful':
        return '🤔'
      case 'warm':
        return '🤗'
      default:
        return '💬'
    }
  }

  const getEmotionColor = (emotion: string) => {
    switch (emotion) {
      case 'cheerful':
        return 'from-yellow-100 to-orange-100 border-yellow-300'
      case 'calm':
        return 'from-blue-100 to-cyan-100 border-blue-300'
      case 'excited':
        return 'from-red-100 to-pink-100 border-red-300'
      case 'dreamy':
        return 'from-purple-100 to-pink-100 border-purple-300'
      case 'thoughtful':
        return 'from-indigo-100 to-purple-100 border-indigo-300'
      case 'warm':
        return 'from-orange-100 to-red-100 border-orange-300'
      case 'peaceful':
        return 'from-green-100 to-teal-100 border-green-300'
      default:
        return 'from-gray-100 to-white border-gray-300'
    }
  }

  return (
    <>
      {Array.from(conversations.values()).map((conversation) => (
        <div
          key={conversation.id}
          className="fixed z-30 pointer-events-none animate-fade-in"
          style={{
            left: '50%',
            top: '20%',
            transform: 'translate(-50%, -50%)'
          }}
        >
          {/* 對話氣泡容器 */}
          <div className="relative">
            {/* 裝飾效果 */}
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
              <div className="flex items-center gap-2 bg-white/90 rounded-full px-3 py-1 shadow-lg border-2 border-yellow-300">
                <MessageCircle className="w-4 h-4 text-green-500" />
                <span className="text-xs font-bold text-gray-700">
                  {conversation.messages[0]?.topic || '閒聊中'}
                </span>
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
                  <span className="w-2 h-2 bg-pink-400 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
                </div>
              </div>
            </div>

            {/* 主對話框 */}
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border-4 border-white p-4 max-w-md">
              {/* 對話參與者 */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {/* NPC頭像 */}
                  <div className="flex -space-x-3">
                    {conversation.messages.length > 0 && (
                      <>
                        <div className="w-10 h-10 bg-gradient-to-br from-green-300 to-emerald-400 rounded-full flex items-center justify-center border-2 border-white shadow-md">
                          <span className="text-lg">
                            {getEmotionIcon(conversation.messages[0].emotion)}
                          </span>
                        </div>
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-300 to-indigo-400 rounded-full flex items-center justify-center border-2 border-white shadow-md">
                          <span className="text-lg">
                            {getEmotionIcon(conversation.messages[conversation.messages.length - 1]?.emotion || 'calm')}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* 參與者名稱 */}
                  <div>
                    <p className="text-sm font-bold text-gray-800">
                      {conversation.messages[0]?.speakerName} & {conversation.messages[0]?.listenerName}
                    </p>
                    <p className="text-xs text-gray-500">正在聊天中...</p>
                  </div>
                </div>

                {/* 動畫圖標 */}
                <div className="animate-bounce-slow">
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                </div>
              </div>

              {/* 對話內容 */}
              <div className="space-y-2 max-h-60 overflow-y-auto ac-scrollbar">
                {conversation.messages.slice(-3).map((msg, index) => (
                  <div
                    key={`${msg.speakerId}-${index}-${msg.timestamp}`}
                    className={`animate-slide-up bg-gradient-to-r ${getEmotionColor(msg.emotion)} 
                              rounded-2xl p-3 border-2 shadow-md`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-start gap-2">
                      {/* 說話者圖標 */}
                      <div className="shrink-0">
                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
                          <span className="text-sm">{getEmotionIcon(msg.emotion)}</span>
                        </div>
                      </div>
                      
                      {/* 消息內容 */}
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-700 mb-1">
                          {msg.speakerName}
                        </p>
                        <p className="text-sm text-gray-800 leading-relaxed">
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 音符動畫效果 */}
              <div className="absolute -bottom-2 -right-2">
                <div className="relative">
                  <Music className="w-6 h-6 text-green-400 animate-bounce" />
                  <Music className="w-4 h-4 text-blue-400 absolute -top-2 -right-2 animate-float" />
                  <Music className="w-3 h-3 text-pink-400 absolute -bottom-1 -left-2 animate-pulse" />
                </div>
              </div>
            </div>

            {/* 對話尾巴 */}
            <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2">
              <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[20px] border-t-white" />
            </div>
          </div>
        </div>
      ))}

      {/* 浮動提示 */}
      {conversations.size > 0 && (
        <div className="fixed bottom-24 left-4 z-30 animate-wiggle">
          <div className="bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-full px-4 py-2 shadow-lg flex items-center gap-2">
            <Heart className="w-4 h-4" fill="currentColor" />
            <span className="text-sm font-bold">島民們正在交流中！</span>
          </div>
        </div>
      )}
    </>
  )
}

// 迷你對話指示器組件（顯示在3D場景中NPC頭頂）
export const NPCChatIndicator: React.FC<{ npcId: string; isActive: boolean }> = ({ npcId, isActive }) => {
  if (!isActive) return null

  return (
    <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 pointer-events-none">
      <div className="relative">
        {/* 對話氣泡 */}
        <div className="bg-white rounded-full p-2 shadow-lg animate-bounce">
          <MessageCircle className="w-4 h-4 text-green-500" />
        </div>
        
        {/* 動畫點點 */}
        <div className="absolute -top-1 -right-1 flex gap-0.5">
          <span className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
          <span className="w-1 h-1 bg-yellow-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
          <span className="w-1 h-1 bg-pink-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>
    </div>
  )
}