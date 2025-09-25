import React, { useState } from 'react'

interface AIProfile {
  name: string
  avatar: string
  desc: string
  color: string
  gradient: string
}

interface Message {
  type: 'ai' | 'user'
  content: string
  time: string
}

interface AICharacterChatInterfaceProps {
  onClose?: () => void
}

export default function AICharacterChatInterface({ onClose = () => {} }: AICharacterChatInterfaceProps) {
  const [selectedAI, setSelectedAI] = useState<string>('claude')
  const [inputText, setInputText] = useState('')
  const [chatHistory, setChatHistory] = useState<Record<string, Message[]>>({})
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  // 從localStorage加載聊天記錄
  React.useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('aiChatHistory')
      if (savedHistory) {
        setChatHistory(JSON.parse(savedHistory))
      }
    } catch (error) {
      console.error('加載聊天記錄失敗:', error)
    }
  }, [])

  // 保存聊天記錄到localStorage
  React.useEffect(() => {
    if (Object.keys(chatHistory).length > 0) {
      try {
        localStorage.setItem('aiChatHistory', JSON.stringify(chatHistory))
      } catch (error) {
        console.error('保存聊天記錄失敗:', error)
      }
    }
  }, [chatHistory])

  // 自動滾動到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // ESC鍵返回功能
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Esc') {
        event.preventDefault()
        event.stopPropagation()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [onClose])

  // AI角色資料
  const aiProfiles: Record<string, AIProfile> = {
    claude: { 
      name: 'Claude', 
      avatar: '🤖', 
      desc: '通用AI助手', 
      color: '#6366f1',
      gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
    },
    coder: { 
      name: '程式助手', 
      avatar: '💻', 
      desc: '編程專家',
      color: '#14b8a6',
      gradient: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)'
    },
    writer: { 
      name: '創作助手', 
      avatar: '✍️', 
      desc: '寫作專家',
      color: '#f97316',
      gradient: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)'
    },
    analyst: { 
      name: '分析師', 
      avatar: '📊', 
      desc: '數據專家',
      color: '#0ea5e9',
      gradient: 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)'
    },
    teacher: { 
      name: '學習導師', 
      avatar: '🎓', 
      desc: '教育專家',
      color: '#f43f5e',
      gradient: 'linear-gradient(135deg, #fb7185 0%, #f43f5e 100%)'
    },
    translator: { 
      name: '翻譯助手', 
      avatar: '🌐', 
      desc: '語言專家',
      color: '#8b5cf6',
      gradient: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)'
    }
  }

  // AI對話記錄
  const aiConversations: Record<string, Message[]> = {
    claude: [
      { type: 'ai', content: '您好！我是Claude，很高興與您對話。有什麼我可以幫助您的嗎？', time: '09:15' },
      { type: 'user', content: '我想提升工作效率，你有什麼建議？', time: '09:18' },
      { type: 'ai', content: '提升工作效率的方法：\n\n1. 時間管理 - 使用番茄鐘工作法\n2. 優先級排序 - 專注重要任務\n3. 減少干擾 - 關閉通知\n4. 定期休息 - 保持精力充沛\n\n您想從哪個方面開始？', time: '09:19' }
    ],
    coder: [
      { type: 'ai', content: '嗨！我是程式助手，可以協助解決各種編程問題。', time: '14:30' },
      { type: 'user', content: '我想學習React，有什麼好的入門建議嗎？', time: '14:32' },
      { type: 'ai', content: 'React入門建議：\n\n1. 先熟悉JavaScript ES6+語法\n2. 理解組件化概念\n3. 學習JSX語法\n4. 掌握State和Props\n5. 實作小專案練習\n\n需要我提供學習資源嗎？', time: '14:33' }
    ],
    writer: [
      { type: 'ai', content: '我是創作助手！無論是文章、故事還是詩歌，我都能協助您。', time: '16:20' },
      { type: 'user', content: '我想寫一篇科技趨勢的文章，但沒有靈感', time: '16:22' },
      { type: 'ai', content: '科技趨勢文章可以從這些角度切入：\n\n• AI人工智慧發展\n• 元宇宙與VR/AR\n• 區塊鏈技術應用\n• 自動駕駛汽車\n• 智慧家居發展\n\n哪個主題最感興趣？', time: '16:25' }
    ],
    analyst: [
      { type: 'ai', content: '我是數據分析師AI，擅長商業分析和數據洞察。', time: '10:15' },
      { type: 'user', content: '公司營收成長停滯，想分析可能的原因', time: '10:18' },
      { type: 'ai', content: '營收分析需要多維度檢視：\n\n• 銷售數據趨勢分析\n• 客戶流失率檢查\n• 產品利潤率變化\n• 市場競爭分析\n• 行銷ROI評估\n\n建議先收集這些數據。', time: '10:20' }
    ],
    teacher: [
      { type: 'ai', content: '歡迎！我是學習導師，可以為您規劃個人化學習計劃。', time: '19:30' },
      { type: 'user', content: '想學習數據科學，但不知道從何開始', time: '19:32' },
      { type: 'ai', content: '數據科學學習路徑：\n\n基礎階段（1-2月）\n• Python程式語言\n• 統計學基礎\n\n進階階段（3-4月）\n• 機器學習算法\n• 數據視覺化\n\n您目前的程式基礎如何？', time: '19:35' }
    ],
    translator: [
      { type: 'ai', content: 'Hello! 我是翻譯助手，精通多種語言翻譯。', time: '11:00' },
      { type: 'user', content: '我需要準備英文簡報，但語法總是不太自然', time: '11:02' },
      { type: 'ai', content: '英文簡報技巧：\n\n• 簡潔明確的句型\n• 避免中式英語思維\n• 使用連接詞增加流暢度\n• 善用視覺輔助\n\n可以給我中文大綱，我協助潤飾！', time: '11:03' }
    ]
  }

  // 發送消息功能
  const sendMessage = async () => {
    if (!inputText.trim()) return

    const userMessage: Message = {
      type: 'user',
      content: inputText.trim(),
      time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
    }

    // 添加用戶消息到聊天記錄
    const currentMessages = [...(chatHistory[selectedAI] || aiConversations[selectedAI] || []), userMessage]
    setChatHistory(prev => ({
      ...prev,
      [selectedAI]: currentMessages
    }))

    setInputText('')
    setIsTyping(true)

    // 模擬AI回復
    setTimeout(() => {
      const aiResponses = {
        claude: [
          "感謝您的提問！讓我來幫助您分析這個問題。",
          "這是一個很有趣的觀點，我來為您詳細說明。",
          "根據您的描述，我建議採用以下方法...",
          "您提到的這個情況確實值得深入探討。"
        ],
        coder: [
          "讓我為您提供一個程式解決方案！",
          "這個問題可以用以下程式碼來解決：",
          "建議使用這種程式設計模式來處理。",
          "讓我寫一段範例程式碼給您參考。"
        ],
        writer: [
          "這個創作想法很棒！讓我為您拓展思路。",
          "文學創作可以從這個角度來發展...",
          "我建議用以下的寫作技巧來豐富內容。",
          "這個主題有很多創作可能性。"
        ],
        analyst: [
          "讓我為您進行數據分析...",
          "從分析角度來看，這個趨勢顯示...",
          "我建議查看以下關鍵指標。",
          "數據顯示了一個有趣的模式。"
        ],
        teacher: [
          "這是一個很好的學習問題！",
          "讓我為您制定一個學習計劃。",
          "建議您按照以下步驟來學習。",
          "我們可以用這種方法來理解這個概念。"
        ],
        translator: [
          "我來為您進行準確的翻譯。",
          "這個表達方式在目標語言中可以這樣說...",
          "讓我提供幾種翻譯選項。",
          "考慮到語境，最佳翻譯是..."
        ]
      }

      const responses = aiResponses[selectedAI as keyof typeof aiResponses] || aiResponses.claude
      const randomResponse = responses[Math.floor(Math.random() * responses.length)]

      const aiMessage: Message = {
        type: 'ai',
        content: randomResponse,
        time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
      }

      setChatHistory(prev => ({
        ...prev,
        [selectedAI]: [...(prev[selectedAI] || currentMessages), aiMessage]
      }))

      setIsTyping(false)
    }, 1000 + Math.random() * 2000) // 1-3秒隨機延遲
  }

  // Enter鍵發送功能
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const currentProfile = aiProfiles[selectedAI]
  const currentMessages = chatHistory[selectedAI] || aiConversations[selectedAI] || []

  // 當消息變化時自動滾動到底部
  React.useEffect(() => {
    scrollToBottom()
  }, [currentMessages, isTyping])

  return (
    <div 
      style={{
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        position: 'fixed',
        inset: '0',
        zIndex: 50
      }}
      onClick={onClose}
    >
      {/* 主容器 4:3 比例 */}
      <div 
        style={{
          width: '90%',
          maxWidth: '1000px',
          aspectRatio: '4/3',
          background: 'white',
          borderRadius: '20px',
          boxShadow: '0 15px 40px rgba(0,0,0,0.12)',
          display: 'flex',
          overflow: 'hidden',
          position: 'relative',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 左側 AI 列表 */}
        <div 
          style={{
            width: '280px',
            background: 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%)',
            borderRight: '1px solid #e5e7eb',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto'
          }}
        >
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ 
              fontSize: '24px', 
              fontWeight: '700', 
              color: '#1f2937', 
              marginBottom: '8px',
              margin: '0 0 8px 0'
            }}>
              AI 助手
            </h2>
            <p style={{ 
              fontSize: '14px', 
              color: '#6b7280',
              margin: '0'
            }}>
              選擇您的專屬助理
            </p>
          </div>

          <div style={{ 
            flex: '1', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '12px', 
            marginBottom: '24px' 
          }}>
            {Object.entries(aiProfiles).map(([id, profile]) => (
              <div
                key={id}
                onClick={() => setSelectedAI(id)}
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  border: selectedAI === id ? '2px solid #6366f1' : '2px solid #e5e7eb',
                  background: selectedAI === id 
                    ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(99, 102, 241, 0.1) 100%)'
                    : 'white',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  transform: selectedAI === id ? 'scale(1.02)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (selectedAI !== id) {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedAI !== id) {
                    e.currentTarget.style.transform = 'none'
                    e.currentTarget.style.boxShadow = 'none'
                  }
                }}
              >
                <div 
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    background: profile.gradient
                  }}
                >
                  {profile.avatar}
                </div>
                <div style={{ flex: '1' }}>
                  <div style={{ 
                    fontWeight: '600', 
                    color: '#1f2937', 
                    marginBottom: '4px' 
                  }}>
                    {profile.name}
                  </div>
                  <div style={{ 
                    fontSize: '13px', 
                    color: '#6b7280' 
                  }}>
                    {profile.desc}
                  </div>
                </div>
                {selectedAI === id && (
                  <div style={{
                    width: '8px',
                    height: '8px',
                    background: '#10b981',
                    borderRadius: '50%',
                    animation: 'pulse 2s infinite'
                  }} />
                )}
              </div>
            ))}
          </div>

          {/* 系統狀態 */}
          <div style={{
            padding: '16px',
            background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)',
            borderRadius: '12px',
            border: '1px solid #c7d2fe'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                background: '#10b981',
                borderRadius: '50%',
                animation: 'pulse 2s infinite'
              }} />
              <span>系統狀態</span>
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px'
              }}>
                <span style={{ color: '#6b7280' }}>回應時間</span>
                <span style={{ color: '#059669', fontWeight: '500' }}>快速</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px'
              }}>
                <span style={{ color: '#6b7280' }}>連線狀態</span>
                <span style={{ color: '#059669', fontWeight: '500' }}>已連接</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px'
              }}>
                <span style={{ color: '#6b7280' }}>模型版本</span>
                <span style={{ color: '#374151', fontWeight: '500' }}>GPT-4</span>
              </div>
            </div>
          </div>
        </div>

        {/* 右側聊天區域 */}
        <div style={{
          flex: '1',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(180deg, #fafafa 0%, #ffffff 100%)'
        }}>
          {/* 聊天頂部 */}
          <div style={{
            padding: '20px 24px',
            background: 'white',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div 
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                  background: currentProfile.gradient
                }}
              >
                {currentProfile.avatar}
              </div>
              <div>
                <h3 style={{
                  fontSize: '20px',
                  color: '#1f2937',
                  marginBottom: '4px',
                  margin: '0 0 4px 0'
                }}>
                  {currentProfile.name}
                </h3>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  color: '#6b7280'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    background: '#10b981',
                    borderRadius: '50%',
                    animation: 'pulse 2s infinite'
                  }} />
                  <span>{currentProfile.desc} • 在線</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: '#f3f4f6',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
              <button style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: '#f3f4f6',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M12 1v6m0 6v6m4.22-13.22l4.24 4.24M1.54 1.54l4.24 4.24M1.54 22.46l4.24-4.24M22.46 22.46l-4.24-4.24"></path>
                </svg>
              </button>
            </div>
          </div>

          {/* 對話區域 */}
          <div style={{
            flex: '1',
            padding: '20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {currentMessages.length === 0 ? (
              <div style={{
                flex: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                color: '#9ca3af'
              }}>
                <div style={{
                  fontSize: '64px',
                  opacity: '0.2',
                  marginBottom: '16px'
                }}>💬</div>
                <div style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#6b7280',
                  marginBottom: '8px'
                }}>開始新對話</div>
                <div style={{
                  fontSize: '14px',
                  color: '#9ca3af'
                }}>與 {currentProfile.name} 開始您的第一次對話</div>
              </div>
            ) : (
              currentMessages.map((message, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    maxWidth: '70%',
                    alignSelf: message.type === 'user' ? 'flex-end' : 'flex-start',
                    flexDirection: message.type === 'user' ? 'row-reverse' : 'row'
                  }}
                >
                  <div 
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      flexShrink: '0',
                      background: message.type === 'ai' 
                        ? currentProfile.gradient 
                        : 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)'
                    }}
                  >
                    {message.type === 'ai' ? currentProfile.avatar : '👤'}
                  </div>
                  <div style={{
                    padding: '14px 18px',
                    borderRadius: '18px',
                    position: 'relative',
                    background: message.type === 'ai' ? 'white' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    border: message.type === 'ai' ? '1px solid #e5e7eb' : 'none',
                    color: message.type === 'ai' ? '#374151' : 'white',
                    borderBottomLeftRadius: message.type === 'ai' ? '6px' : '18px',
                    borderBottomRightRadius: message.type === 'user' ? '6px' : '18px'
                  }}>
                    <div style={{
                      fontSize: '14px',
                      lineHeight: '1.5',
                      whiteSpace: 'pre-line'
                    }}>
                      {message.content}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      opacity: '0.6',
                      marginTop: '8px',
                      textAlign: message.type === 'user' ? 'right' : 'left'
                    }}>
                      {message.time}
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {/* AI正在輸入指示器 */}
            {isTyping && (
              <div style={{
                display: 'flex',
                gap: '12px',
                maxWidth: '70%',
                alignSelf: 'flex-start'
              }}>
                <div 
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    flexShrink: '0',
                    background: currentProfile.gradient
                  }}
                >
                  {currentProfile.avatar}
                </div>
                <div style={{
                  padding: '14px 18px',
                  borderRadius: '18px',
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  color: '#374151',
                  borderBottomLeftRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div style={{
                    fontSize: '14px',
                    color: '#6b7280'
                  }}>
                    {currentProfile.name} 正在輸入
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: '2px'
                  }}>
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#6b7280',
                      animation: 'typing-dot 1.4s infinite ease-in-out',
                      animationDelay: '0s'
                    }} />
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#6b7280',
                      animation: 'typing-dot 1.4s infinite ease-in-out',
                      animationDelay: '0.2s'
                    }} />
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#6b7280',
                      animation: 'typing-dot 1.4s infinite ease-in-out',
                      animationDelay: '0.4s'
                    }} />
                  </div>
                </div>
              </div>
            )}
            
            {/* 用於自動滾動的錨點 */}
            <div ref={messagesEndRef} />
          </div>

          {/* 輸入區域 */}
          <div style={{
            padding: '20px',
            background: 'white',
            borderTop: '1px solid #e5e7eb'
          }}>
            <div style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '12px'
            }}>
              <button style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: '#f3f4f6',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                </svg>
              </button>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`與 ${currentProfile.name} 對話...`}
                disabled={isTyping}
                style={{
                  flex: '1',
                  padding: '12px 20px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '14px',
                  background: isTyping ? '#f3f4f6' : '#f9fafb',
                  transition: 'all 0.2s',
                  outline: 'none',
                  opacity: isTyping ? 0.7 : 1
                }}
                onFocus={(e) => {
                  if (!isTyping) {
                    e.target.style.background = 'white'
                    e.target.style.borderColor = '#a5b4fc'
                  }
                }}
                onBlur={(e) => {
                  if (!isTyping) {
                    e.target.style.background = '#f9fafb'
                    e.target.style.borderColor = '#e5e7eb'
                  }
                }}
              />
              <button 
                onClick={sendMessage}
                disabled={isTyping || !inputText.trim()}
                style={{
                  padding: '12px 24px',
                  borderRadius: '12px',
                  border: 'none',
                  color: 'white',
                  fontWeight: '500',
                  cursor: (isTyping || !inputText.trim()) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: `0 4px 12px ${currentProfile.color}30`,
                  background: (isTyping || !inputText.trim()) ? '#9ca3af' : currentProfile.gradient,
                  opacity: (isTyping || !inputText.trim()) ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!isTyping && inputText.trim()) {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = `0 6px 16px ${currentProfile.color}40`
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isTyping && inputText.trim()) {
                    e.currentTarget.style.transform = 'none'
                    e.currentTarget.style.boxShadow = `0 4px 12px ${currentProfile.color}30`
                  }
                }}
              >
                {isTyping ? '發送中...' : '發送'}
              </button>
            </div>
            <div style={{
              display: 'flex',
              gap: '16px',
              fontSize: '11px',
              color: '#9ca3af'
            }}>
              <span>按 Enter 發送</span>
              <span>•</span>
              <span>Shift + Enter 換行</span>
              <span>•</span>
              <span>ESC 關閉視窗</span>
            </div>
          </div>
        </div>

        {/* 關閉按鈕 */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '24px',
            right: '24px',
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: '#f3f4f6',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e5e7eb'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f3f4f6'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes typing-dot {
          0%, 80%, 100% { 
            transform: scale(0);
            opacity: 0.5;
          }
          40% { 
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}