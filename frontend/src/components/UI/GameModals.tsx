import React from 'react'
import { useGameStore } from '@/stores/gameStore'

// 設定選單組件
const SettingsModal: React.FC = () => {
  const { showSettings, setShowSettings } = useGameStore()

  if (!showSettings) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">遊戲設定</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              音效音量
            </label>
            <input type="range" min="0" max="100" className="w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              背景音樂
            </label>
            <input type="range" min="0" max="100" className="w-full" />
          </div>
          <div className="flex items-center">
            <input type="checkbox" id="fullscreen" className="mr-2" />
            <label htmlFor="fullscreen" className="text-sm text-gray-700">
              全螢幕模式
            </label>
          </div>
        </div>
        <div className="flex justify-end mt-6 space-x-2">
          <button
            onClick={() => setShowSettings(false)}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => setShowSettings(false)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            確定
          </button>
        </div>
      </div>
    </div>
  )
}

// 背包組件
const InventoryModal: React.FC = () => {
  const { showInventory, setShowInventory } = useGameStore()

  if (!showInventory) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">背包</h2>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 16 }).map((_, index) => (
            <div key={index} className="aspect-square bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
              <span className="text-gray-400 text-sm">空</span>
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-6">
          <button
            onClick={() => setShowInventory(false)}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  )
}

// 地圖組件
const MapModal: React.FC = () => {
  const { showMap, setShowMap } = useGameStore()

  if (!showMap) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 h-96">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">世界地圖</h2>
        <div className="w-full h-full bg-gradient-to-br from-green-200 to-blue-200 rounded-lg flex items-center justify-center">
          <span className="text-gray-600 text-lg">地圖載入中...</span>
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={() => setShowMap(false)}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  )
}

// 日記組件
const DiaryModal: React.FC = () => {
  const { showDiary, setShowDiary } = useGameStore()

  if (!showDiary) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 h-96">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">冒險日記</h2>
        <div className="h-full overflow-y-auto text-gray-600">
          <p className="mb-4">今天是我來到心語小鎮的第一天...</p>
          <p className="mb-4">遇到了許多有趣的居民，他們都很友善。</p>
          <p className="mb-4">我決定在這裡安頓下來，開始我的新生活。</p>
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={() => setShowDiary(false)}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  )
}

// 主遊戲選單組件
const GameMenuModal: React.FC = () => {
  const { showGameMenu, setShowGameMenu } = useGameStore()

  if (!showGameMenu) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">遊戲選單</h2>
        <div className="space-y-2">
          <button className="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
            繼續遊戲
          </button>
          <button className="w-full py-2 px-4 bg-green-500 text-white rounded hover:bg-green-600 transition-colors">
            儲存遊戲
          </button>
          <button className="w-full py-2 px-4 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors">
            載入遊戲
          </button>
          <button className="w-full py-2 px-4 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors">
            回到主選單
          </button>
        </div>
        <div className="flex justify-end mt-6">
          <button
            onClick={() => setShowGameMenu(false)}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  )
}

// 主要的GameModals組件
export const GameModals: React.FC = () => {
  return (
    <>
      <SettingsModal />
      <InventoryModal />
      <MapModal />
      <DiaryModal />
      <GameMenuModal />
    </>
  )
}