import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery } from '@apollo/client'
import { useParams, useNavigate } from 'react-router-dom'
import { GET_ASSISTANTS } from '../../graphql/assistant'
import { GET_MEMORIES } from '../../graphql/memory'
import { Assistant } from '../../types/assistant'
import { Message, MessageFile, MessageLink } from '../../types/message'
import { Memory } from '../../types/memory'
import MessageBubble from '../../components/ChatInterface/MessageBubble'
import UploadModal from '../../components/ChatInterface/UploadModal'
import { IslandStatusCard } from '../../components/IslandStatusCard'
import { IslandEditorModal } from '../../components/IslandEditorModal'
import { MemoryTree } from '../../components/3D/MemoryTree'
import { Memory as IslandMemory } from '../../types/island'
import { motion } from 'framer-motion'

export default function IslandView() {
  const { assistantId } = useParams<{ assistantId: string }>()
  const navigate = useNavigate()
  const [showChat, setShowChat] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showIslandEditor, setShowIslandEditor] = useState(false)
  const [inputText, setInputText] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedMemory, setSelectedMemory] = useState<IslandMemory | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { data, loading, refetch } = useQuery(GET_ASSISTANTS)

  // 獲取該助理的所有記憶
  const { data: memoriesData, loading: memoriesLoading } = useQuery(GET_MEMORIES, {
    variables: {
      filter: { assistantId },
      limit: 100,
    },
    skip: !assistantId,
  })

  // 获取当前assistant
  const assistant = data?.assistants.find((a: Assistant) => a.id === assistantId)

  // 將記憶轉換為 IslandMemory 格式並分配位置
  const memoryTrees = useMemo(() => {
    if (!memoriesData?.memories) return []

    const memories: Memory[] = memoriesData.memories
    const trees: IslandMemory[] = []

    // 圓形排列算法
    memories.forEach((memory, index) => {
      const totalMemories = memories.length
      const angle = (index / totalMemories) * Math.PI * 2
      const radius = 8 + (index % 3) * 2 // 8, 10, 12 的半徑層次

      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      const y = 0 // 樹從地面開始

      const treeMemory: IslandMemory = {
        id: memory.id,
        title: memory.title || memory.summary || '無標題記憶',
        content: memory.rawContent || memory.summary || '',
        category: (memory.category || '未分類') as IslandMemory['category'],
        importance: 5, // 固定預設值，不再使用此欄位
        tags: memory.tags || [],
        position: [x, y, z] as [number, number, number],
        createdAt: new Date(memory.createdAt),
        emoji: memory.emoji || '💭',
        summary: memory.summary,
        // AI 深度分析欄位
        detailedSummary: memory.detailedSummary,
        actionableAdvice: memory.actionableAdvice,
      }

      trees.push(treeMemory)
    })

    return trees
  }, [memoriesData])

  // 檢測螢幕尺寸，調整是否為手機
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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
  const handleSendMessage = async (additionalFiles?: MessageFile[], additionalLinks?: MessageLink[]) => {
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
  const handleUploadConfirm = (data: { files: MessageFile[]; links: MessageLink[] }) => {
    handleSendMessage(data.files, data.links)
  }

  // 处理键盘发送
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // 处理島嶼編輯保存成功
  const handleIslandSaveSuccess = async () => {
    console.log('🟢 [IslandView] handleIslandSaveSuccess 被調用')
    console.log('🟢 [IslandView] 當前 assistant 顏色:', assistant?.color)

    // 重新獲取資料以更新 3D 場景
    console.log('🟢 [IslandView] 準備 refetch 資料...')
    const result = await refetch()

    console.log('✅ [IslandView] refetch 完成')
    console.log('✅ [IslandView] 新的 assistants 資料:', result.data.assistants)

    const updatedAssistant = result.data.assistants.find((a: Assistant) => a.id === assistantId)
    console.log('✅ [IslandView] 更新後的 assistant:', updatedAssistant)
    console.log('✅ [IslandView] 新顏色:', updatedAssistant?.color)
  }

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden" style={{
      background: 'linear-gradient(135deg, #FFF5E1 0%, #FFE5F0 50%, #FFFACD 100%)'
    }}>
      {/* 3D Island Scene - 手機端調整相機參數 */}
      <Canvas
        camera={{
          position: isMobile ? [0, 25, 25] : [0, 20, 20],
          fov: isMobile ? 60 : 50
        }}
        className="absolute inset-0 w-full h-full"
        gl={{ preserveDrawingBuffer: true }}
        dpr={isMobile ? [1, 1.5] : [1, 2]}
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
          minDistance={isMobile ? 15 : 10}
          maxDistance={isMobile ? 60 : 50}
          enableDamping={true}
          dampingFactor={0.05}
          rotateSpeed={isMobile ? 0.5 : 1}
          zoomSpeed={isMobile ? 0.5 : 1}
          panSpeed={isMobile ? 0.5 : 1}
          touches={{
            ONE: 2, // TOUCH.ROTATE
            TWO: 1  // TOUCH.DOLLY_PAN
          }}
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

        {/* 記憶樹 - Memory Trees */}
        {!memoriesLoading && memoryTrees.length > 0 && assistant && memoryTrees.map((memory, index) => (
          <MemoryTree
            key={memory.id}
            memory={memory}
            islandColor={assistant.color}
            position={memory.position}
            seed={index * 123.456} // 使用 index 作為種子，確保每棵樹都不同
            onClick={(clickedMemory) => {
              console.log('🌳 Clicked memory tree:', clickedMemory)
              setSelectedMemory(clickedMemory)
            }}
          />
        ))}
      </Canvas>

      {/* 島嶼狀態卡片 - 左上角，手機端隱藏或改為底部 */}
      {!showChat && !loading && assistant && (
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          className="hidden md:block"
        >
          <IslandStatusCard
            name={`${assistant.nameChinese}的島嶼`}
            emoji={assistant.emoji}
            color={assistant.color}
            description={assistant.personality}
            memoryCount={assistant.totalMemories}
            categories={[assistant.type]}
            updatedAt={new Date(assistant.updatedAt)}
          />
        </motion.div>
      )}

      {/* 記憶詳情面板 - Memory Detail Panel，手機端改為底部彈出全寬 */}
      {selectedMemory && !showChat && (
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          className="absolute md:top-4 md:right-4 md:w-80 bottom-0 left-0 right-0 md:bottom-auto md:left-auto w-full md:max-w-sm z-20"
        >
          <div
            className="rounded-3xl md:rounded-3xl rounded-t-3xl rounded-b-none p-4 md:p-6 shadow-2xl max-h-[70vh] md:max-h-none overflow-y-auto"
            style={{
              background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 250, 245, 0.9) 100%)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '3px solid rgba(255, 230, 240, 0.8)',
              boxShadow: `0 12px 40px ${selectedMemory.color}40, inset 0 2px 4px rgba(255, 255, 255, 0.9)`,
            }}
          >
            {/* Header with close button */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="text-4xl animate-bounce-gentle"
                  style={{
                    filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.1))'
                  }}
                >
                  {selectedMemory.emoji}
                </div>
                <div className="flex-1">
                  <div
                    className="text-xs font-medium px-2 py-1 rounded-full inline-block mb-1"
                    style={{
                      background: `${selectedMemory.color}30`,
                      color: selectedMemory.color,
                      border: `1.5px solid ${selectedMemory.color}60`,
                    }}
                  >
                    {selectedMemory.category}
                  </div>
                  <h3
                    className="font-bold text-lg leading-tight"
                    style={{
                      color: selectedMemory.color,
                      textShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}
                  >
                    {selectedMemory.title}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedMemory(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors text-2xl leading-none"
                aria-label="關閉"
              >
                ×
              </button>
            </div>

            {/* Tags */}
            {selectedMemory.tags && selectedMemory.tags.length > 0 && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {selectedMemory.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255, 245, 230, 0.8), rgba(255, 250, 240, 0.6))',
                        border: '1.5px solid rgba(255, 230, 240, 0.8)',
                        color: '#666',
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Created date */}
            <div className="text-xs text-gray-500 mb-4">
              建立於 {selectedMemory.createdAt.toLocaleDateString('zh-TW', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>

            {/* AI 深度分析 */}
            {(selectedMemory.detailedSummary || selectedMemory.actionableAdvice) && (
              <div className="mb-4 rounded-2xl overflow-hidden" style={{
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)',
                border: '2px solid rgba(168, 85, 247, 0.3)',
              }}>
                <div className="px-4 py-3" style={{
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(147, 51, 234, 0.2) 100%)',
                  borderBottom: '1px solid rgba(168, 85, 247, 0.3)',
                }}>
                  <h4 className="text-sm font-bold flex items-center gap-2" style={{ color: '#7c3aed' }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    AI 深度分析
                  </h4>
                </div>
                <div className="px-4 py-3 space-y-3">
                  {selectedMemory.detailedSummary && (
                    <div>
                      <div className="text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: '#9333ea' }}>
                        詳細摘要
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: '#444' }}>
                        {selectedMemory.detailedSummary}
                      </p>
                    </div>
                  )}
                  {selectedMemory.actionableAdvice && (
                    <div>
                      <div className="text-xs font-semibold mb-1 uppercase tracking-wide flex items-center gap-1" style={{ color: '#9333ea' }}>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        行動建議
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: '#444' }}>
                        {selectedMemory.actionableAdvice}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 內容預覽 */}
            {selectedMemory.content && !selectedMemory.detailedSummary && (
              <div className="mb-4">
                <div className="text-xs font-semibold mb-2" style={{ color: '#666' }}>
                  📝 內容預覽
                </div>
                <div className="text-sm leading-relaxed line-clamp-4" style={{
                  color: '#555',
                  background: 'rgba(0, 0, 0, 0.02)',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                }}>
                  {selectedMemory.content}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigate(`/database?memoryId=${selectedMemory.id}`)
                }}
                className="flex-1 px-4 py-2.5 rounded-2xl font-medium transition-all duration-300 hover:scale-105 active:scale-95"
                style={{
                  background: `linear-gradient(135deg, ${selectedMemory.color}20, ${selectedMemory.color}10)`,
                  border: `2px solid ${selectedMemory.color}40`,
                  color: selectedMemory.color,
                  boxShadow: `0 4px 12px ${selectedMemory.color}20`,
                }}
              >
                查看詳情
              </button>
              <button
                onClick={() => setSelectedMemory(null)}
                className="px-4 py-2.5 rounded-2xl font-medium transition-all duration-300 hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, rgba(229, 231, 235, 0.8), rgba(243, 244, 246, 0.6))',
                  border: '2px solid rgba(209, 213, 219, 0.8)',
                  color: '#6B7280',
                }}
              >
                關閉
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Top Navigation Bar - 動森玻璃風格 - 右上角，手機端改為橫向滾動或堆疊 */}
      {!showChat && (
        <div className="absolute top-2 md:top-4 right-2 md:right-4 left-2 md:left-auto p-0 z-10">
          <div className="flex items-center gap-2 md:gap-3 justify-end flex-wrap md:flex-nowrap">
            <button
              onClick={() => navigate('/')}
              className="group/btn relative px-3 md:px-5 py-2 md:py-2.5 rounded-[18px] font-bold transition-all duration-300 hover:scale-105 active:scale-95 text-sm md:text-base"
              style={{
                background: 'linear-gradient(145deg, rgba(255, 250, 240, 0.75) 0%, rgba(255, 245, 230, 0.65) 100%)',
                backdropFilter: 'blur(16px) saturate(180%)',
                WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                border: '2px solid rgba(255, 255, 255, 0.6)',
                boxShadow: '0 8px 24px rgba(139, 92, 46, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.8)',
                color: '#8B5C2E'
              }}
            >
              <span className="relative z-10 hidden md:inline">← 返回</span>
              <span className="relative z-10 md:hidden">←</span>
              <div
                className="absolute inset-0 rounded-[18px] opacity-0 group-hover/btn:opacity-100 transition-opacity"
                style={{
                  background: 'radial-gradient(circle at center, rgba(251, 191, 36, 0.3), transparent 70%)',
                }}
              />
            </button>
            <button
              onClick={() => setShowIslandEditor(true)}
              className="group/btn relative px-3 md:px-5 py-2 md:py-2.5 rounded-[18px] font-bold transition-all duration-300 hover:scale-105 active:scale-95 text-sm md:text-base"
              style={{
                background: 'linear-gradient(145deg, rgba(168, 230, 207, 0.75) 0%, rgba(144, 198, 149, 0.65) 100%)',
                backdropFilter: 'blur(16px) saturate(180%)',
                WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                border: '2px solid rgba(255, 255, 255, 0.6)',
                boxShadow: '0 8px 24px rgba(52, 152, 219, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.8)',
                color: '#2D5016'
              }}
              title="編輯島嶼外觀"
            >
              <span className="relative z-10 hidden md:inline">🎨 編輯島嶼</span>
              <span className="relative z-10 md:hidden">🎨</span>
              <div
                className="absolute inset-0 rounded-[18px] opacity-0 group-hover/btn:opacity-100 transition-opacity"
                style={{
                  background: 'radial-gradient(circle at center, rgba(52, 152, 219, 0.3), transparent 70%)',
                }}
              />
            </button>
            <button
              onClick={() => navigate('/database')}
              className="group/btn relative px-3 md:px-5 py-2 md:py-2.5 rounded-[18px] font-bold transition-all duration-300 hover:scale-105 active:scale-95 text-sm md:text-base"
              style={{
                background: 'linear-gradient(145deg, rgba(255, 250, 240, 0.75) 0%, rgba(255, 245, 230, 0.65) 100%)',
                backdropFilter: 'blur(16px) saturate(180%)',
                WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                border: '2px solid rgba(255, 255, 255, 0.6)',
                boxShadow: '0 8px 24px rgba(139, 92, 46, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.8)',
                color: '#8B5C2E'
              }}
            >
              <span className="relative z-10 hidden md:inline">🐾 資料庫</span>
              <span className="relative z-10 md:hidden">🐾</span>
              <div
                className="absolute inset-0 rounded-[18px] opacity-0 group-hover/btn:opacity-100 transition-opacity"
                style={{
                  background: 'radial-gradient(circle at center, rgba(251, 191, 36, 0.3), transparent 70%)',
                }}
              />
            </button>
          </div>
        </div>
      )}

      {/* Chat Interface - 直接显示聊天界面 */}
      {showChat && assistant && (
        <div className="fixed inset-0 z-50 animate-fade-in" style={{
          background: 'linear-gradient(135deg, #FFF5E1 0%, #FFE5F0 50%, #FFFACD 100%)'
        }}>
          <div className="h-full flex flex-col">
            {/* Chat Header - 響應式優化 */}
            <div className="bg-white/90 backdrop-blur-md px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4" style={{
              border: '3px solid #FFE5F0',
              boxShadow: '0 8px 25px rgba(255, 179, 217, 0.15)'
            }}>
              <div className="flex items-center justify-between max-w-7xl mx-auto">
                <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                  <button
                    onClick={() => setShowChat(false)}
                    className="text-lg sm:text-xl md:text-2xl hover:scale-110 transition-transform p-1 sm:p-0"
                    style={{ color: '#FF8FB3' }}
                    aria-label="返回"
                  >
                    ←
                  </button>
                  <span className="text-xl sm:text-2xl md:text-4xl animate-bounce-gentle">{assistant.emoji}</span>
                  <div className="min-w-0">
                    <h2 className="text-sm sm:text-base md:text-cute-xl font-bold truncate" style={{
                      background: 'linear-gradient(135deg, #FF8FB3, #FFB3D9)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}>
                      {assistant.nameChinese}
                    </h2>
                    <p className="text-xs md:text-cute-sm hidden md:block truncate" style={{ color: '#FFB3D9' }}>{assistant.name}</p>
                  </div>
                </div>
                <div className="flex gap-1.5 sm:gap-2 md:gap-3">
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl font-medium transition-all duration-300 hover:scale-105 active:scale-95 text-xs sm:text-sm md:text-base whitespace-nowrap"
                    style={{
                      background: 'linear-gradient(135deg, #FFF5E1, #FFFACD)',
                      color: '#FF8FB3',
                      border: '2px solid #FFE5F0',
                      boxShadow: '0 4px 15px rgba(255, 245, 225, 0.5)'
                    }}
                  >
                    <span className="hidden sm:inline">📎 上傳</span>
                    <span className="sm:hidden">📎</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Chat Messages Area - 響應式優化 */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-6">
              <div className="max-w-4xl mx-auto space-y-2 sm:space-y-3 md:space-y-4">
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

            {/* Chat Input Area - 響應式優化 */}
            <div className="bg-white/90 backdrop-blur-md p-2 sm:p-3 md:p-6" style={{
              border: '3px solid #FFE5F0',
              boxShadow: '0 8px 25px rgba(255, 179, 217, 0.15)'
            }}>
              <div className="max-w-4xl mx-auto">
                <div className="flex gap-1.5 sm:gap-2 md:gap-3 items-center">
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="flex-shrink-0 px-2.5 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 rounded-xl sm:rounded-2xl font-medium transition-all duration-300 hover:scale-105 active:scale-95 text-base sm:text-lg md:text-xl"
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
                    placeholder="✨ 輸入訊息..."
                    className="flex-1 min-w-0 px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 bg-white rounded-xl sm:rounded-2xl font-medium focus:outline-none transition-all text-xs sm:text-sm md:text-base"
                    style={{
                      border: '2px sm:border-3 solid #FFE5F0',
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
                    className="flex-shrink-0 px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-xl sm:rounded-2xl font-bold text-white transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm md:text-base whitespace-nowrap"
                    style={{
                      background: 'linear-gradient(135deg, #FFB3D9, #FF8FB3)',
                      border: '2px solid #FFE5F0',
                      boxShadow: '0 4px 15px rgba(255, 179, 217, 0.4)'
                    }}
                  >
                    <span className="hidden sm:inline">發送 💬</span>
                    <span className="sm:hidden">💬</span>
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

      {/* Island Editor Modal */}
      {!loading && assistant && (
        <IslandEditorModal
          isOpen={showIslandEditor}
          onClose={() => setShowIslandEditor(false)}
          islandId={assistantId || ''}
          islandName={`${assistant.nameChinese}的島嶼`}
          currentColor={assistant.color}
          onSaveSuccess={handleIslandSaveSuccess}
        />
      )}

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
