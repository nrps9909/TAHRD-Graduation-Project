import { useState } from 'react'
import { CharacterSkinId, CHARACTER_INFO, CHARACTER_PATHS } from '../CharacterSkinSystem'

interface SkinSelectorProps {
  currentSkinId: CharacterSkinId
  onSkinChange: (skinId: CharacterSkinId) => void
  characterType: 'player' | 'npc'
  isOpen: boolean
  onClose: () => void
}

export const SkinSelector = ({ 
  currentSkinId, 
  onSkinChange, 
  characterType, 
  isOpen, 
  onClose 
}: SkinSelectorProps) => {
  const [selectedSkin, setSelectedSkin] = useState<CharacterSkinId>(currentSkinId)

  if (!isOpen) return null

  // 獲取可用的皮膚選項
  const availableSkins = Object.keys(CHARACTER_PATHS).filter(skinId => 
    characterType === 'npc' ? skinId.startsWith('npc-') : skinId.startsWith('player-')
  ) as CharacterSkinId[]

  const handleSkinSelect = (skinId: CharacterSkinId) => {
    setSelectedSkin(skinId)
    onSkinChange(skinId)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-pink-200">
        {/* 標題 */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-pink-600 mb-2">
            選擇{characterType === 'player' ? '玩家' : 'NPC'}外觀
          </h2>
          <p className="text-gray-600 text-sm">
            點擊下方選項來更換角色皮膚
          </p>
        </div>

        {/* 皮膚選項網格 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {availableSkins.map((skinId) => {
            const info = CHARACTER_INFO[skinId]
            const isSelected = selectedSkin === skinId
            
            return (
              <button
                key={skinId}
                onClick={() => handleSkinSelect(skinId)}
                className={`
                  relative p-4 rounded-xl border-2 transition-all duration-200
                  ${isSelected 
                    ? 'border-pink-400 bg-pink-100 shadow-lg transform scale-105' 
                    : 'border-gray-200 bg-gray-50 hover:border-pink-200 hover:bg-pink-50'
                  }
                `}
              >
                {/* 角色預覽圖 */}
                <div className="aspect-square bg-gradient-to-br from-blue-100 to-pink-100 rounded-lg mb-3 flex items-center justify-center">
                  <span className="text-2xl">
                    {info.type === 'male' ? '👦' : '👧'}
                  </span>
                </div>
                
                {/* 角色信息 */}
                <div className="text-center">
                  <h3 className="font-bold text-gray-800 text-sm mb-1">
                    {info.name}
                  </h3>
                  <p className="text-xs text-gray-600">
                    {info.nickname}
                  </p>
                </div>
                
                {/* 選中指示器 */}
                {isSelected && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* 操作按鈕 */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors duration-200"
          >
            取消
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-pink-400 to-purple-400 text-white rounded-xl hover:from-pink-500 hover:to-purple-500 transition-all duration-200 shadow-lg"
          >
            確認選擇
          </button>
        </div>
        
        {/* 提示信息 */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-600 text-center">
            💡 遊戲中按 C 鍵也可以快速切換角色外觀
          </p>
        </div>
      </div>
    </div>
  )
}

// 皮膚選擇器觸發按鈕
interface SkinSelectorTriggerProps {
  onOpen: () => void
  characterType: 'player' | 'npc'
}

export const SkinSelectorTrigger = ({ onOpen, characterType }: SkinSelectorTriggerProps) => {
  return (
    <button
      onClick={onOpen}
      className="fixed bottom-4 right-20 bg-gradient-to-r from-pink-400 to-purple-400 text-white p-3 rounded-full shadow-lg hover:from-pink-500 hover:to-purple-500 transition-all duration-200 z-40"
      title={`更換${characterType === 'player' ? '玩家' : 'NPC'}外觀`}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 7h-9"/>
        <path d="M14 17H5"/>
        <circle cx="17" cy="17" r="3"/>
        <circle cx="7" cy="7" r="3"/>
      </svg>
    </button>
  )
}