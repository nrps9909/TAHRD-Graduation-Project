import { useState } from 'react'
import { useQuery } from '@apollo/client'
import { GET_ASSISTANTS } from '../../graphql/assistant'
import { Assistant } from '../../types/assistant'
import { useNavigate } from 'react-router-dom'
import CuteDecorations from '../../components/CuteDecorations'

export default function IslandOverview() {
  const { data, loading } = useQuery(GET_ASSISTANTS)
  const navigate = useNavigate()
  const [hoveredIsland, setHoveredIsland] = useState<string | null>(null)

  const handleIslandClick = (assistantId: string) => {
    navigate(`/island/${assistantId}`)
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-healing-sky via-healing-gentle to-healing-cream overflow-hidden">
      <CuteDecorations />

      {/* 导航栏 */}
      <div className="absolute top-0 left-0 right-0 p-4 z-10">
        <div className="max-w-7xl mx-auto bg-white/90 backdrop-blur-md rounded-bubble shadow-cute-lg px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-cute-2xl font-bold bg-gradient-to-r from-candy-pink via-candy-purple to-candy-blue bg-clip-text text-transparent animate-sparkle">
              🏝️ 心語小鎮 - 島嶼世界
            </h1>
            <button
              onClick={() => navigate('/database')}
              className="px-5 py-2.5 bg-healing-gentle hover:bg-candy-blue text-gray-700 rounded-cute font-medium shadow-cute hover:shadow-cute-lg transition-all duration-300 hover:scale-105 active:scale-95"
            >
              📊 資料庫
            </button>
          </div>
        </div>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center bg-white/90 backdrop-blur-md rounded-bubble p-12 shadow-cute-xl animate-bounce-in">
            <div className="text-8xl mb-6 animate-bounce-gentle">🏝️</div>
            <p className="text-cute-xl font-bold bg-gradient-to-r from-candy-pink via-candy-purple to-candy-blue bg-clip-text text-transparent animate-sparkle">
              載入島嶼世界中...
            </p>
          </div>
        </div>
      )}

      {/* 岛屿网格 */}
      {!loading && data?.assistants && (
        <div className="absolute inset-0 flex items-center justify-center p-8 pt-32">
          <div className="max-w-6xl w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {data.assistants.map((assistant: Assistant) => (
                <div
                  key={assistant.id}
                  className="relative group cursor-pointer"
                  onClick={() => handleIslandClick(assistant.id)}
                  onMouseEnter={() => setHoveredIsland(assistant.id)}
                  onMouseLeave={() => setHoveredIsland(null)}
                >
                  {/* 岛屿卡片 */}
                  <div
                    className={`
                      bg-white/90 backdrop-blur-md rounded-bubble p-8
                      shadow-cute hover:shadow-cute-xl
                      transition-all duration-500
                      ${hoveredIsland === assistant.id ? 'transform -translate-y-4 scale-105' : ''}
                    `}
                    style={{
                      background: `linear-gradient(135deg, ${assistant.color}22, white)`
                    }}
                  >
                    {/* NPC 头像 */}
                    <div className="flex flex-col items-center mb-6">
                      <div
                        className={`
                          w-24 h-24 rounded-full flex items-center justify-center text-6xl
                          shadow-cute-lg mb-4
                          ${hoveredIsland === assistant.id ? 'animate-bounce-gentle' : ''}
                        `}
                        style={{
                          background: `linear-gradient(135deg, ${assistant.color}, ${assistant.color}dd)`
                        }}
                      >
                        {assistant.emoji}
                      </div>

                      <h2 className="text-cute-2xl font-bold text-gray-800 mb-2">
                        {assistant.nameChinese}
                      </h2>
                      <p className="text-cute-sm text-gray-500">{assistant.name}</p>
                    </div>

                    {/* 岛屿描述 */}
                    <div className="bg-white/60 backdrop-blur-sm rounded-cute p-4 mb-6 shadow-inner">
                      <p className="text-cute-sm text-gray-700 leading-relaxed line-clamp-3">
                        {assistant.personality}
                      </p>
                    </div>

                    {/* 进入按钮 */}
                    <button
                      className={`
                        w-full px-6 py-3 rounded-cute font-bold text-white
                        shadow-cute hover:shadow-cute-lg
                        transition-all duration-300
                        ${hoveredIsland === assistant.id ? 'animate-pop' : ''}
                      `}
                      style={{
                        background: `linear-gradient(135deg, ${assistant.color}, ${assistant.color}dd)`
                      }}
                    >
                      🏝️ 進入島嶼
                    </button>

                    {/* 悬浮装饰 */}
                    {hoveredIsland === assistant.id && (
                      <div className="absolute -top-2 -right-2 text-4xl animate-bounce">
                        ✨
                      </div>
                    )}
                  </div>

                  {/* 岛屿阴影 */}
                  <div
                    className="absolute inset-0 rounded-bubble -z-10"
                    style={{
                      background: `${assistant.color}33`,
                      filter: 'blur(20px)',
                      transform: hoveredIsland === assistant.id ? 'scale(1.1)' : 'scale(0.9)',
                      opacity: hoveredIsland === assistant.id ? 0.6 : 0.3,
                      transition: 'all 0.5s ease'
                    }}
                  />
                </div>
              ))}
            </div>

            {/* 底部提示 */}
            <div className="mt-12 text-center">
              <p className="text-cute-base text-gray-600 mb-2">
                點擊任意島嶼開始與 NPC 對話 💬
              </p>
              <p className="text-cute-sm text-gray-400">
                每個 NPC 都擁有獨立的島嶼世界
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
