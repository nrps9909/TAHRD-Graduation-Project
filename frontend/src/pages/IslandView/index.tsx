import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useState, useEffect } from 'react'
import { useQuery } from '@apollo/client'
import { useParams, useNavigate } from 'react-router-dom'
import { GET_ASSISTANTS } from '../../graphql/assistant'
import { Assistant } from '../../types/assistant'
import CuteDecorations from '../../components/CuteDecorations'

export default function IslandView() {
  const { assistantId } = useParams<{ assistantId: string }>()
  const navigate = useNavigate()
  const [showChat, setShowChat] = useState(false)
  const { data, loading } = useQuery(GET_ASSISTANTS)

  // 获取当前assistant
  const assistant = data?.assistants.find((a: Assistant) => a.id === assistantId)

  // 如果找不到assistant，返回主页
  useEffect(() => {
    if (!loading && !assistant) {
      navigate('/')
    }
  }, [loading, assistant, navigate])

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-gradient-to-b from-healing-sky via-healing-gentle to-healing-cream">
      {/* 可爱装饰背景 */}
      <CuteDecorations />

      {/* 3D Island Scene */}
      <Canvas
        camera={{ position: [0, 20, 20], fov: 50 }}
        className="absolute inset-0 w-full h-full"
      >
        {/* 柔和的光照 - Animal Crossing 风格 */}
        <ambientLight intensity={0.7} color="#FFF8E7" />
        <directionalLight
          position={[10, 15, 5]}
          intensity={0.8}
          color="#FFE5B4"
          castShadow
        />
        <hemisphereLight
          intensity={0.5}
          color="#87CEEB"
          groundColor="#90EE90"
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
          <div className="max-w-7xl mx-auto bg-white/90 backdrop-blur-md rounded-bubble shadow-cute-lg px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/')}
                  className="text-2xl hover:scale-110 transition-transform"
                >
                  ←
                </button>
                <div className="flex items-center gap-3">
                  {assistant && (
                    <>
                      <span className="text-4xl">{assistant.emoji}</span>
                      <div>
                        <h1 className="text-cute-xl font-bold bg-gradient-to-r from-candy-pink via-candy-purple to-candy-blue bg-clip-text text-transparent">
                          {assistant.nameChinese}的島嶼
                        </h1>
                        <p className="text-cute-sm text-gray-500">{assistant.name}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => navigate('/database')}
                className="px-5 py-2.5 bg-healing-gentle hover:bg-candy-blue text-gray-700 rounded-cute font-medium shadow-cute hover:shadow-cute-lg transition-all duration-300 hover:scale-105 active:scale-95"
              >
                📊 資料庫
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Interface - 直接显示聊天界面 */}
      {showChat && assistant && (
        <div className="fixed inset-0 bg-gradient-to-br from-healing-sky to-healing-cream z-50 animate-fade-in">
          <div className="h-full flex flex-col">
            {/* Chat Header */}
            <div className="bg-white/90 backdrop-blur-md shadow-cute-lg px-6 py-4">
              <div className="flex items-center justify-between max-w-7xl mx-auto">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setShowChat(false)}
                    className="text-2xl hover:scale-110 transition-transform"
                  >
                    ←
                  </button>
                  <span className="text-4xl animate-bounce-gentle">{assistant.emoji}</span>
                  <div>
                    <h2 className="text-cute-xl font-bold bg-gradient-to-r from-candy-pink to-candy-purple bg-clip-text text-transparent">
                      {assistant.nameChinese}
                    </h2>
                    <p className="text-cute-sm text-gray-500">{assistant.name}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button className="px-4 py-2 bg-healing-gentle hover:bg-candy-blue text-gray-700 rounded-cute font-medium shadow-cute hover:shadow-cute-lg transition-all duration-300">
                    📎 上傳知識
                  </button>
                </div>
              </div>
            </div>

            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto space-y-4">
                {/* Welcome Message */}
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${assistant.color}, ${assistant.color}dd)`
                    }}
                  >
                    {assistant.emoji}
                  </div>
                  <div className="flex-1 bg-white/90 backdrop-blur-sm rounded-cute p-4 shadow-cute">
                    <p className="text-cute-base text-gray-700">
                      你好！我是 {assistant.nameChinese}。{assistant.personality}
                    </p>
                    <p className="text-cute-sm text-gray-500 mt-2">
                      你可以上傳圖片、文件、鏈接，我都能理解哦！✨
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Input Area */}
            <div className="bg-white/90 backdrop-blur-md shadow-cute-lg p-6">
              <div className="max-w-4xl mx-auto">
                <div className="flex gap-3">
                  <button className="px-4 py-3 bg-healing-gentle hover:bg-candy-pink text-gray-700 rounded-cute shadow-cute transition-all duration-300 hover:scale-105">
                    📎
                  </button>
                  <button className="px-4 py-3 bg-healing-gentle hover:bg-candy-blue text-gray-700 rounded-cute shadow-cute transition-all duration-300 hover:scale-105">
                    🖼️
                  </button>
                  <button className="px-4 py-3 bg-healing-gentle hover:bg-candy-green text-gray-700 rounded-cute shadow-cute transition-all duration-300 hover:scale-105">
                    📁
                  </button>
                  <input
                    type="text"
                    placeholder="輸入訊息..."
                    className="flex-1 px-6 py-3 bg-white border-3 border-transparent rounded-cute focus:border-candy-pink focus:shadow-glow transition-all duration-300"
                  />
                  <button
                    className="px-6 py-3 rounded-cute font-bold text-white shadow-cute hover:shadow-cute-lg transition-all duration-300 hover:scale-105 active:scale-95"
                    style={{
                      background: `linear-gradient(135deg, ${assistant.color}, ${assistant.color}dd)`
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

      {/* Loading State - 可爱加载 */}
      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-healing-sky to-healing-cream z-50">
          <div className="text-center bg-white/90 backdrop-blur-md rounded-bubble p-12 shadow-cute-xl animate-bounce-in">
            <div className="text-8xl mb-6 animate-bounce-gentle">🏝️</div>
            <p className="text-cute-xl font-bold bg-gradient-to-r from-candy-pink via-candy-purple to-candy-blue bg-clip-text text-transparent animate-sparkle">
              載入心語小鎮中...
            </p>
            <div className="mt-6 flex gap-2 justify-center">
              <div className="w-3 h-3 rounded-full bg-candy-pink animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="w-3 h-3 rounded-full bg-candy-purple animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-3 h-3 rounded-full bg-candy-blue animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
