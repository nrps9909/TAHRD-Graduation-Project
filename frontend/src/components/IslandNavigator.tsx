/**
 * IslandNavigator - 頂部島嶼/資料庫導航欄
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@apollo/client'
import { useIslandStore } from '../stores/islandStore'
import { useAuthStore } from '../stores/authStore'
import { Island } from '../types/island'
import { Z_INDEX_CLASSES } from '../constants/zIndex'
import { CREATE_ISLAND } from '../graphql/category'
import { GET_ISLANDS } from '../graphql/category'

// 生成英文名稱（簡單的拼音轉換）
function generateEnglishName(chineseName: string): string {
  // 簡單實作：移除空格並轉小寫，實際專案可能需要更複雜的拼音轉換
  return chineseName.replace(/\s+/g, '_').toLowerCase()
}

// 生成隨機顏色
function generateRandomColor(): string {
  const colors = [
    '#FF6B9D', // 粉紅
    '#4A90E2', // 藍色
    '#50C878', // 綠色
    '#F5A623', // 橙色
    '#9B59B6', // 紫色
    '#E74C3C', // 紅色
    '#7FB069', // 淺綠
    '#6C8EAD', // 灰藍
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

export function IslandNavigator() {
  const navigate = useNavigate()
  const { islands, currentIslandId, switchIsland } = useIslandStore()
  const { user, logout } = useAuthStore()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [newIslandName, setNewIslandName] = useState('')
  const [newIslandEmoji, setNewIslandEmoji] = useState('🏝️')
  const [isCreating, setIsCreating] = useState(false)

  // GraphQL mutation
  const [createIsland] = useMutation(CREATE_ISLAND, {
    refetchQueries: [{ query: GET_ISLANDS }],
    onCompleted: (data) => {
      console.log('✅ 島嶼創建成功:', data.createIsland)
      setShowCreateDialog(false)
      setNewIslandName('')
      setNewIslandEmoji('🏝️')
      setIsCreating(false)
    },
    onError: (error) => {
      console.error('❌ 島嶼創建失敗:', error)
      alert('創建島嶼失敗：' + error.message)
      setIsCreating(false)
    }
  })

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const handleCreateIsland = async () => {
    if (!newIslandName.trim() || isCreating) return

    setIsCreating(true)

    try {
      // 計算新島嶼的位置（圓形排列）
      const islandCount = islands.length
      const radius = 80
      const angle = (islandCount / (islandCount + 1)) * Math.PI * 2 - Math.PI / 2
      const positionX = Math.cos(angle) * radius
      const positionZ = Math.sin(angle) * radius

      await createIsland({
        variables: {
          input: {
            name: generateEnglishName(newIslandName.trim()),
            nameChinese: newIslandName.trim(),
            emoji: newIslandEmoji,
            color: generateRandomColor(),
            description: '新建的島嶼',
            positionX,
            positionY: 0,
            positionZ
          }
        }
      })
    } catch (error) {
      // Error handled in onError callback
      console.error('創建島嶼時發生錯誤:', error)
    }
  }

  return (
    <>
      <div className={`fixed top-0 left-0 right-0 ${Z_INDEX_CLASSES.NAVIGATION} bg-gradient-to-b from-white/95 to-white/80 backdrop-blur-md shadow-lg`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2 mr-4">
              <span className="text-2xl">🏝️</span>
              <span className="font-bold text-lg text-gray-800">我的島嶼</span>
            </div>

            {/* 分隔線 */}
            <div className="h-8 w-px bg-gray-300"></div>

            {/* 島嶼標籤列表 */}
            <div className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-hide">
              {islands.map((island) => (
                <IslandTab
                  key={island.id}
                  island={island}
                  isActive={island.id === currentIslandId}
                  onClick={() => switchIsland(island.id)}
                />
              ))}

              {/* 新增島嶼按鈕 */}
              <button
                onClick={() => setShowCreateDialog(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 whitespace-nowrap group"
              >
                <span className="text-xl group-hover:scale-110 transition-transform">➕</span>
                <span className="text-sm font-medium text-gray-600 group-hover:text-blue-600">
                  新增島嶼
                </span>
              </button>
            </div>

            {/* 用戶資訊和登出 */}
            <div className="relative ml-4">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-400 to-yellow-400 hover:from-pink-500 hover:to-yellow-500 shadow-md hover:shadow-lg transition-all"
              >
                <span className="text-white font-bold">
                  {user?.displayName || user?.username || '用戶'}
                </span>
                <span className="text-white">▼</span>
              </button>

              {/* 下拉選單 */}
              {showUserMenu && (
                <div className={`absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border-2 border-pink-200 overflow-hidden ${Z_INDEX_CLASSES.SIDEBAR}`}>
                  <div className="p-3 bg-gradient-to-r from-pink-50 to-yellow-50 border-b border-pink-200">
                    <p className="font-bold text-gray-800">{user?.displayName || user?.username}</p>
                    <p className="text-xs text-gray-600 truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-3 text-left hover:bg-red-50 text-red-600 font-medium transition-colors flex items-center gap-2"
                  >
                    <span>🚪</span>
                    <span>登出</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 點擊外部關閉選單 */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}

      {/* 創建島嶼對話框 */}
      {showCreateDialog && (
        <div className={`fixed inset-0 ${Z_INDEX_CLASSES.MODAL} flex items-center justify-center bg-black/50 backdrop-blur-sm`}>
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <span className="text-3xl">{newIslandEmoji}</span>
              創建新島嶼
            </h3>

            <div className="space-y-6">
              {/* 選擇 Emoji */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  選擇圖標
                </label>
                <div className="flex gap-2 flex-wrap">
                  {['🏝️', '🌸', '📚', '💼', '🎯', '🚀', '🎨', '🎮', '🎵', '✨'].map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => setNewIslandEmoji(emoji)}
                      className={`text-3xl p-3 rounded-xl hover:bg-gray-100 transition-all ${
                        newIslandEmoji === emoji
                          ? 'bg-blue-100 ring-2 ring-blue-400 scale-110'
                          : 'hover:scale-105'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* 島嶼名稱 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  島嶼名稱
                </label>
                <input
                  type="text"
                  value={newIslandName}
                  onChange={(e) => setNewIslandName(e.target.value)}
                  placeholder="例如：學習島、工作島..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all text-lg"
                  autoFocus
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateIsland()}
                />
              </div>
            </div>

            {/* 按鈕 */}
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowCreateDialog(false)}
                className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-300 hover:bg-gray-100 font-medium text-gray-700 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleCreateIsland}
                disabled={!newIslandName.trim() || isCreating}
                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? '創建中...' : '創建 🎉'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// 單個島嶼標籤
interface IslandTabProps {
  island: Island
  isActive: boolean
  onClick: () => void
}

function IslandTab({ island, isActive, onClick }: IslandTabProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 whitespace-nowrap group ${
        isActive
          ? 'bg-gradient-to-r shadow-lg scale-105'
          : 'bg-white/60 hover:bg-white hover:shadow-md hover:scale-105'
      }`}
      style={
        isActive
          ? {
              background: `linear-gradient(135deg, ${island.color}20, ${island.color}40)`,
              borderWidth: '2px',
              borderStyle: 'solid',
              borderColor: island.color
            }
          : {}
      }
    >
      <span className="text-2xl group-hover:scale-110 transition-transform">
        {island.emoji}
      </span>
      <div className="flex flex-col items-start">
        <span
          className={`font-bold text-sm ${
            isActive ? 'text-gray-800' : 'text-gray-600'
          }`}
        >
          {island.nameChinese}
        </span>
        <span className="text-xs text-gray-500">
          {island.memoryCount} 個記憶
        </span>
      </div>
      {isActive && (
        <div
          className="w-2 h-2 rounded-full ml-1"
          style={{ backgroundColor: island.color }}
        />
      )}
    </button>
  )
}
