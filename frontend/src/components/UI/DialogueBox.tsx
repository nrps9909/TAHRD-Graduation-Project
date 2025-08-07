import { useState, useRef, useEffect } from 'react'
import { Send, X, Sparkles } from 'lucide-react'
import { useGameStore } from '@/stores/gameStore'
import { useSocketConnection } from '@/hooks/useSocketConnection'

export const DialogueBox = () => {
  const [inputMessage, setInputMessage] = useState('')
  const [isMinimized, setIsMinimized] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const { 
    selectedNpc, 
    npcs, 
    conversations, 
    isTyping,
    endConversation 
  } = useGameStore()
  
  const { sendMessage } = useSocketConnection()
  const currentNpc = npcs.find(npc => npc.id === selectedNpc)

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversations])

  // Auto-focus input
  useEffect(() => {
    if (!isMinimized && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isMinimized, selectedNpc])

  const handleSendMessage = () => {
    if (!inputMessage.trim() || !selectedNpc || isTyping) return
    
    sendMessage(selectedNpc, inputMessage.trim())
    setInputMessage('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (!currentNpc) return null

  const npcConversations = conversations
    .filter(conv => conv.npcId === selectedNpc)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  return (
    <div style={{
      position: 'fixed',
      bottom: isMinimized ? '-320px' : '0',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '90%',
      maxWidth: '600px',
      zIndex: 50,
      transition: 'bottom 0.3s ease-out'
    }}>
      {/* Chat Container */}
      <div style={{
        background: 'linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(255,255,255,0.98))',
        backdropFilter: 'blur(12px)',
        borderTopLeftRadius: '24px',
        borderTopRightRadius: '24px',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.1)',
        border: '1px solid rgba(255,255,255,0.5)',
        overflow: 'hidden'
      }}>
        
        {/* Header Bar */}
        <div style={{
          background: 'linear-gradient(to right, rgba(52,211,153,0.9), rgba(6,182,212,0.9))',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '4px solid rgba(255,255,255,0.3)'
        }}>
          {/* NPC Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'rgba(255,255,255,0.9)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <span style={{ fontSize: '20px' }}>✨</span>
              </div>
              {isTyping && (
                <div style={{
                  position: 'absolute',
                  bottom: '-4px',
                  right: '-4px',
                  width: '12px',
                  height: '12px',
                  background: '#4ade80',
                  borderRadius: '50%',
                  border: '2px solid white',
                  animation: 'pulse 1s infinite'
                }} />
              )}
            </div>
            <div>
              <h3 style={{
                color: 'white',
                fontWeight: 'bold',
                fontSize: '18px',
                textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                margin: 0
              }}>
                {currentNpc.name}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.8)',
                  background: 'rgba(255,255,255,0.2)',
                  padding: '2px 8px',
                  borderRadius: '12px'
                }}>
                  {currentNpc.currentMood}
                </span>
              </div>
            </div>
          </div>

          {/* Control Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              style={{
                width: '32px',
                height: '32px',
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                cursor: 'pointer',
                fontSize: '18px',
                fontWeight: 'bold'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            >
              {isMinimized ? '▲' : '▼'}
            </button>
            <button
              onClick={endConversation}
              style={{
                width: '32px',
                height: '32px',
                background: 'rgba(248,113,113,0.8)',
                border: 'none',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#ef4444'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(248,113,113,0.8)'}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Chat Messages Area */}
        {!isMinimized && (
          <>
            <div style={{
              height: '256px',
              overflowY: 'auto',
              padding: '12px 16px',
              background: 'linear-gradient(to bottom, rgba(164,232,228,0.1), rgba(167,243,208,0.1))',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              
              {/* Welcome message if no conversations */}
              {npcConversations.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: '32px 0',
                  animation: 'fadeIn 0.3s ease-out'
                }}>
                  <Sparkles style={{
                    width: '48px',
                    height: '48px',
                    color: '#10b981',
                    margin: '0 auto 12px'
                  }} />
                  <p style={{ color: '#6b7280', fontSize: '14px' }}>
                    開始和 {currentNpc.name} 聊天吧！
                  </p>
                </div>
              )}

              {/* Conversation Messages */}
              {npcConversations.map((message, index) => {
                const isUser = message.speakerType === 'user'
                
                return (
                  <div key={message.id} style={{
                    display: 'flex',
                    justifyContent: isUser ? 'flex-end' : 'flex-start',
                    animation: 'fadeInUp 0.3s ease-out',
                    animationDelay: `${Math.min(index * 50, 200)}ms`
                  }}>
                    <div style={{ maxWidth: '80%' }}>
                      {/* Message Bubble */}
                      <div style={{
                        padding: '10px 16px',
                        borderRadius: '18px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        background: isUser 
                          ? 'linear-gradient(to right, #60a5fa, #3b82f6)'
                          : 'white',
                        color: isUser ? 'white' : '#1f2937',
                        border: isUser ? 'none' : '1px solid #e5e7eb',
                        borderBottomRightRadius: isUser ? '4px' : '18px',
                        borderBottomLeftRadius: isUser ? '18px' : '4px'
                      }}>
                        <p style={{
                          fontSize: '14px',
                          lineHeight: '1.5',
                          margin: 0
                        }}>
                          {message.content}
                        </p>
                      </div>
                      
                      {/* Timestamp */}
                      <p style={{
                        fontSize: '11px',
                        color: '#9ca3af',
                        marginTop: '4px',
                        padding: '0 8px',
                        textAlign: isUser ? 'right' : 'left'
                      }}>
                        {new Date(message.timestamp).toLocaleTimeString('zh-TW', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                )
              })}

              {/* Typing Indicator */}
              {isTyping && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-start',
                  animation: 'fadeIn 0.3s ease-out'
                }}>
                  <div style={{
                    background: 'white',
                    borderRadius: '18px',
                    borderBottomLeftRadius: '4px',
                    padding: '12px 16px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <span style={{
                          width: '8px',
                          height: '8px',
                          background: '#9ca3af',
                          borderRadius: '50%',
                          animation: 'bounce 1.4s infinite',
                          animationDelay: '0ms'
                        }} />
                        <span style={{
                          width: '8px',
                          height: '8px',
                          background: '#9ca3af',
                          borderRadius: '50%',
                          animation: 'bounce 1.4s infinite',
                          animationDelay: '150ms'
                        }} />
                        <span style={{
                          width: '8px',
                          height: '8px',
                          background: '#9ca3af',
                          borderRadius: '50%',
                          animation: 'bounce 1.4s infinite',
                          animationDelay: '300ms'
                        }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={{
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.8)',
              borderTop: '1px solid #e5e7eb'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                {/* Input Field */}
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={`輸入訊息...`}
                    style={{
                      width: '100%',
                      padding: '10px 48px 10px 16px',
                      borderRadius: '24px',
                      background: '#f9fafb',
                      border: '2px solid #e5e7eb',
                      outline: 'none',
                      fontSize: '14px',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#10b981'
                      e.currentTarget.style.background = 'white'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb'
                      e.currentTarget.style.background = '#f9fafb'
                    }}
                    disabled={isTyping}
                    maxLength={100}
                  />
                  
                  {/* Character Counter */}
                  {inputMessage.length > 0 && (
                    <span style={{
                      position: 'absolute',
                      right: '16px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '11px',
                      color: inputMessage.length > 80 ? '#ef4444' : '#9ca3af'
                    }}>
                      {inputMessage.length}/100
                    </span>
                  )}
                </div>

                {/* Send Button */}
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isTyping}
                  style={{
                    width: '40px',
                    height: '40px',
                    background: inputMessage.trim() && !isTyping 
                      ? 'linear-gradient(to right, #10b981, #06b6d4)'
                      : '#e5e7eb',
                    borderRadius: '50%',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    cursor: inputMessage.trim() && !isTyping ? 'pointer' : 'not-allowed',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (inputMessage.trim() && !isTyping) {
                      e.currentTarget.style.transform = 'scale(1.1)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)'
                  }}
                >
                  <Send size={16} />
                </button>
              </div>

              {/* Quick Replies */}
              <div style={{
                display: 'flex',
                gap: '8px',
                marginTop: '8px',
                flexWrap: 'wrap'
              }}>
                {['你好！', '最近怎麼樣？', '再見！'].map((text, index) => (
                  <button
                    key={index}
                    onClick={() => setInputMessage(text)}
                    style={{
                      padding: '4px 12px',
                      background: 'linear-gradient(to right, #f3e8ff, #fce7f3)',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#6b7280',
                      border: '1px solid #e9d5ff',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(to right, #e9d5ff, #fbcfe8)'
                      e.currentTarget.style.transform = 'scale(1.05)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(to right, #f3e8ff, #fce7f3)'
                      e.currentTarget.style.transform = 'scale(1)'
                    }}
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Floating Animation Elements */}
      <div style={{
        position: 'absolute',
        top: '-32px',
        right: '16px',
        pointerEvents: 'none',
        animation: 'float 3s ease-in-out infinite',
        fontSize: '24px'
      }}>
        💬
      </div>
      <div style={{
        position: 'absolute',
        top: '-48px',
        left: '16px',
        pointerEvents: 'none',
        animation: 'float 3s ease-in-out infinite',
        animationDelay: '1s',
        fontSize: '20px'
      }}>
        ✨
      </div>

      {/* Animation Styles */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-10px); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}