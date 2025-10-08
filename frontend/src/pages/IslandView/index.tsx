import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@apollo/client'
import { useParams, useNavigate } from 'react-router-dom'
import { GET_ASSISTANTS } from '../../graphql/assistant'
import { Assistant } from '../../types/assistant'
import { Message } from '../../types/message'
import MessageBubble from '../../components/ChatInterface/MessageBubble'
import UploadModal from '../../components/ChatInterface/UploadModal'

export default function IslandView() {
  const { assistantId } = useParams<{ assistantId: string }>()
  const navigate = useNavigate()
  const [showChat, setShowChat] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [inputText, setInputText] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { data, loading } = useQuery(GET_ASSISTANTS)

  // 获取当前assistant
  const assistant = data?.assistants.find((a: Assistant) => a.id === assistantId)

  // 如果找不到assistant，返回主页
  useEffect(() => {
    if (!loading && !assistant) {
      navigate('/')
    }
  }, [loading, assistant, navigate])

  // 初始化欢迎消息
  useEffect(() => {
    if (assistant && messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        role: 'assistant',
        content: `你好！我是 ${assistant.nameChinese}。${assistant.personality}\n\n你可以上傳圖片、文件、鏈接，我都能理解哦！✨`,
        timestamp: new Date()
      }
      setMessages([welcomeMessage])
    }
  }, [assistant, messages.length])

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 发送消息
  const handleSendMessage = async (additionalFiles?: any[], additionalLinks?: any[]) => {
    if (!inputText.trim() && !additionalFiles?.length && !additionalLinks?.length) return

    // 创建用户消息
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputText,
      files: additionalFiles,
      links: additionalLinks,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputText('')

    // 创建加载消息
    const loadingMessage: Message = {
      id: `loading-${Date.now()}`,
      role: 'assistant',
      content: '',
      isLoading: true,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, loadingMessage])

    // 模拟AI回复（后续会连接实际API）
    setTimeout(() => {
      const aiResponse: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: `收到你的訊息！\n\n${inputText ? `你說: "${inputText}"\n\n` : ''}${additionalFiles?.length ? `收到 ${additionalFiles.length} 個文件\n` : ''}${additionalLinks?.length ? `收到 ${additionalLinks.length} 個鏈接\n` : ''}\n我會幫你分析這些內容，並決定是否需要存儲到知識庫中。✨`,
        timestamp: new Date()
      }

      setMessages(prev => prev.filter(m => m.id !== loadingMessage.id).concat(aiResponse))
    }, 1500)
  }

  // 处理上传确认
  const handleUploadConfirm = (data: { files: any[]; links: any[] }) => {
    handleSendMessage(data.files, data.links)
  }

  // 处理键盘发送
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden" style={{
      background: 'linear-gradient(135deg, #FFF5E1 0%, #FFE5F0 50%, #FFFACD 100%)'
    }}>
      {/* 3D Island Scene */}
      <Canvas
        camera={{ position: [0, 20, 20], fov: 50 }}
        className="absolute inset-0 w-full h-full"
      >
        {/* 柔和的光照 - 寶寶粉和鵝黃色溫暖光線 */}
        <ambientLight intensity={0.9} color="#FFF8E7" />
        <directionalLight
          position={[10, 15, 5]}
          intensity={1.0}
          color="#FFFACD"
          castShadow
        />
        <hemisphereLight
          intensity={0.6}
          color="#FFFACD"
          groundColor="#FFE5F0"
        />
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxPolarAngle={Math.PI / 2}
          minDistance={10}
          maxDistance={50}
        />

        {/* Island Base - 多层次草地 */}
        <group>
          {/* 底层土壤 */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]}>
            <circleGeometry args={[15, 64]} />
            <meshStandardMaterial color="#D4A574" />
          </mesh>

          {/* 草地层 */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
            <circleGeometry args={[14.5, 64]} />
            <meshStandardMaterial
              color="#A8E6A3"
              roughness={0.8}
            />
          </mesh>

          {/* 沙滩边缘 */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <ringGeometry args={[13.5, 14.5, 64]} />
            <meshStandardMaterial
              color="#F5E6D3"
              roughness={0.7}
            />
          </mesh>
        </group>

        {/* 可爱的树木装饰 */}
        {[...Array(8)].map((_, i) => {
          const angle = (i / 8) * Math.PI * 2 + 0.3
          const radius = 11
          const x = Math.cos(angle) * radius
          const z = Math.sin(angle) * radius
          const treeColor = i % 3 === 0 ? '#2D8B3C' : i % 3 === 1 ? '#52B857' : '#7DC47F'

          return (
            <group key={`tree-${i}`} position={[x, 0, z]}>
              {/* 树干 */}
              <mesh position={[0, 0.8, 0]}>
                <cylinderGeometry args={[0.2, 0.25, 1.6, 8]} />
                <meshStandardMaterial color="#8B4513" roughness={0.9} />
              </mesh>
              {/* 树叶 - 三层 */}
              <mesh position={[0, 2, 0]}>
                <sphereGeometry args={[0.8, 8, 8]} />
                <meshStandardMaterial color={treeColor} roughness={0.7} />
              </mesh>
              <mesh position={[0, 2.4, 0]}>
                <sphereGeometry args={[0.6, 8, 8]} />
                <meshStandardMaterial color={treeColor} roughness={0.7} />
              </mesh>
              <mesh position={[0, 2.7, 0]}>
                <sphereGeometry args={[0.4, 8, 8]} />
                <meshStandardMaterial color={treeColor} roughness={0.7} />
              </mesh>
            </group>
          )
        })}

        {/* 中央喷泉/装饰 */}
        <group position={[0, 0, 0]}>
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[1.5, 1.8, 1, 16]} />
            <meshStandardMaterial color="#A3D5E6" roughness={0.2} metalness={0.3} />
          </mesh>
          <mesh position={[0, 1, 0]}>
            <sphereGeometry args={[0.5, 16, 16]} />
            <meshStandardMaterial
              color="#87CEEB"
              emissive="#87CEEB"
              emissiveIntensity={0.4}
              roughness={0.1}
              metalness={0.5}
            />
          </mesh>
        </group>

        {/* 可爱的云朵 */}
        {[...Array(5)].map((_, i) => {
          const x = (Math.random() - 0.5) * 40
          const y = 15 + Math.random() * 5
          const z = (Math.random() - 0.5) * 40

          return (
            <group key={`cloud-${i}`} position={[x, y, z]}>
              <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[1.5, 8, 8]} />
                <meshStandardMaterial color="#FFFFFF" roughness={0.9} opacity={0.9} transparent />
              </mesh>
              <mesh position={[1, 0, 0]}>
                <sphereGeometry args={[1.2, 8, 8]} />
                <meshStandardMaterial color="#FFFFFF" roughness={0.9} opacity={0.9} transparent />
              </mesh>
              <mesh position={[-1, 0, 0]}>
                <sphereGeometry args={[1.2, 8, 8]} />
                <meshStandardMaterial color="#FFFFFF" roughness={0.9} opacity={0.9} transparent />
              </mesh>
              <mesh position={[0, 0.5, 0]}>
                <sphereGeometry args={[1, 8, 8]} />
                <meshStandardMaterial color="#FFFFFF" roughness={0.9} opacity={0.9} transparent />
              </mesh>
            </group>
          )
        })}

        {/* NPC House - 中央单个房屋 */}
        {!loading && assistant && (
          <group position={[0, 0.2, 0]}>
            {/* 可爱的房子底座 - 圆润造型 */}
            <mesh
              position={[0, 1.2, 0]}
              onClick={() => setShowChat(true)}
                onPointerOver={(e) => {
                  e.stopPropagation()
                  document.body.style.cursor = 'pointer'
                }}
                onPointerOut={() => {
                  document.body.style.cursor = 'default'
                }}
              >
                <boxGeometry args={[2.2, 2.4, 2.2]} />
                <meshStandardMaterial
                  color={assistant.color}
                  roughness={0.4}
                  metalness={0.1}
                />
              </mesh>

              {/* 可爱的屋顶 */}
              <mesh position={[0, 2.8, 0]}>
                <coneGeometry args={[1.8, 1.6, 8]} />
                <meshStandardMaterial
                  color={assistant.color}
                  roughness={0.3}
                />
              </mesh>

              {/* 门 */}
              <mesh position={[0, 0.8, 1.11]}>
                <boxGeometry args={[0.8, 1.4, 0.1]} />
                <meshStandardMaterial color="#8B4513" />
              </mesh>

              {/* 窗户 */}
              <mesh position={[0.8, 1.5, 1.11]}>
                <boxGeometry args={[0.5, 0.5, 0.05]} />
                <meshStandardMaterial color="#87CEEB" emissive="#87CEEB" emissiveIntensity={0.3} />
              </mesh>
              <mesh position={[-0.8, 1.5, 1.11]}>
                <boxGeometry args={[0.5, 0.5, 0.05]} />
                <meshStandardMaterial color="#87CEEB" emissive="#87CEEB" emissiveIntensity={0.3} />
              </mesh>

              {/* 房子阴影 */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                <circleGeometry args={[1.5, 32]} />
                <meshBasicMaterial color="#000000" opacity={0.2} transparent />
              </mesh>
            </group>
          )
        }
      </Canvas>

      {/* Top Navigation Bar - 可爱风格 */}
      {!showChat && (
        <div className="absolute top-0 left-0 right-0 p-4 z-10">
          <div className="max-w-7xl mx-auto bg-white/90 backdrop-blur-md rounded-bubble px-6 py-4" style={{
            border: '3px solid #FFE5F0',
            boxShadow: '0 8px 25px rgba(255, 179, 217, 0.15)'
          }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/')}
                  className="text-2xl hover:scale-110 transition-transform"
                  style={{ color: '#FF8FB3' }}
                >
                  ←
                </button>
                <div className="flex items-center gap-3">
                  {assistant && (
                    <>
                      <span className="text-4xl">{assistant.emoji}</span>
                      <div>
                        <h1 className="text-cute-xl font-bold" style={{
                          background: 'linear-gradient(135deg, #FF8FB3 0%, #FFFACD 50%, #FFB3D9 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text'
                        }}>
                          {assistant.nameChinese}的島嶼
                        </h1>
                        <p className="text-cute-sm" style={{ color: '#FFB3D9' }}>{assistant.name}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => navigate('/database')}
                className="px-5 py-2.5 rounded-2xl font-medium transition-all duration-300 hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #FFF5E1, #FFFACD)',
                  color: '#FF8FB3',
                  border: '2px solid #FFE5F0',
                  boxShadow: '0 4px 15px rgba(255, 245, 225, 0.5)'
                }}
              >
                🐾 資料庫
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Interface - 直接显示聊天界面 */}
      {showChat && assistant && (
        <div className="fixed inset-0 z-50 animate-fade-in" style={{
          background: 'linear-gradient(135deg, #FFF5E1 0%, #FFE5F0 50%, #FFFACD 100%)'
        }}>
          <div className="h-full flex flex-col">
            {/* Chat Header */}
            <div className="bg-white/90 backdrop-blur-md px-6 py-4" style={{
              border: '3px solid #FFE5F0',
              boxShadow: '0 8px 25px rgba(255, 179, 217, 0.15)'
            }}>
              <div className="flex items-center justify-between max-w-7xl mx-auto">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setShowChat(false)}
                    className="text-2xl hover:scale-110 transition-transform"
                    style={{ color: '#FF8FB3' }}
                  >
                    ←
                  </button>
                  <span className="text-4xl animate-bounce-gentle">{assistant.emoji}</span>
                  <div>
                    <h2 className="text-cute-xl font-bold" style={{
                      background: 'linear-gradient(135deg, #FF8FB3, #FFB3D9)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}>
                      {assistant.nameChinese}
                    </h2>
                    <p className="text-cute-sm" style={{ color: '#FFB3D9' }}>{assistant.name}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="px-4 py-2 rounded-2xl font-medium transition-all duration-300 hover:scale-105"
                    style={{
                      background: 'linear-gradient(135deg, #FFF5E1, #FFFACD)',
                      color: '#FF8FB3',
                      border: '2px solid #FFE5F0',
                      boxShadow: '0 4px 15px rgba(255, 245, 225, 0.5)'
                    }}
                  >
                    📎 上傳知識
                  </button>
                </div>
              </div>
            </div>

            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto space-y-4">
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    assistantEmoji={assistant.emoji}
                    assistantColor={assistant.color}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Chat Input Area */}
            <div className="bg-white/90 backdrop-blur-md p-6" style={{
              border: '3px solid #FFE5F0',
              boxShadow: '0 8px 25px rgba(255, 179, 217, 0.15)'
            }}>
              <div className="max-w-4xl mx-auto">
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="px-4 py-3 rounded-2xl font-medium transition-all duration-300 hover:scale-105 active:scale-95"
                    title="上傳文件和鏈接"
                    style={{
                      background: 'linear-gradient(135deg, #FFF5E1, #FFFACD)',
                      color: '#FF8FB3',
                      border: '2px solid #FFE5F0',
                      boxShadow: '0 4px 15px rgba(255, 245, 225, 0.5)'
                    }}
                  >
                    📎
                  </button>
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="✨ 輸入訊息... (Enter 發送)"
                    className="flex-1 px-6 py-3 bg-white rounded-2xl font-medium focus:outline-none transition-all focus:scale-105"
                    style={{
                      border: '3px solid #FFE5F0',
                      color: '#666'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#FFB3D9'
                      e.target.style.boxShadow = '0 0 20px rgba(255, 179, 217, 0.3)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#FFE5F0'
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!inputText.trim()}
                    className="px-6 py-3 rounded-2xl font-bold text-white transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: 'linear-gradient(135deg, #FFB3D9, #FF8FB3)',
                      border: '2px solid #FFE5F0',
                      boxShadow: '0 4px 15px rgba(255, 179, 217, 0.4)'
                    }}
                  >
                    發送 💬
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onConfirm={handleUploadConfirm}
      />

      {/* Loading State - 可爱加载 */}
      {loading && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{
          background: 'linear-gradient(135deg, #FFF5E1 0%, #FFE5F0 50%, #FFFACD 100%)'
        }}>
          <div className="text-center bg-white/90 backdrop-blur-md rounded-bubble p-12 animate-bounce-in" style={{
            border: '3px solid #FFE5F0',
            boxShadow: '0 12px 40px rgba(255, 179, 217, 0.25)'
          }}>
            <div className="text-8xl mb-6 animate-bounce-gentle">🐱</div>
            <p className="text-cute-xl font-bold animate-sparkle" style={{
              background: 'linear-gradient(135deg, #FF8FB3 0%, #FFFACD 50%, #FFB3D9 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              載入心語小鎮中...
            </p>
            <div className="mt-6 flex gap-2 justify-center">
              <div className="w-3 h-3 rounded-full animate-bounce" style={{ background: '#FFB3D9', animationDelay: '0s' }}></div>
              <div className="w-3 h-3 rounded-full animate-bounce" style={{ background: '#FFFACD', animationDelay: '0.2s' }}></div>
              <div className="w-3 h-3 rounded-full animate-bounce" style={{ background: '#FF8FB3', animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
