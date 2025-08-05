import { useGameStore } from '@/stores/gameStore'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 
                      w-11/12 max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="bg-gradient-to-r from-healing-gentle to-healing-soft p-6 border-b border-white/20">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 
                         flex items-center justify-center transition-colors duration-200"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {children}
        </div>
      </div>
    </div>
  )
}

export const GameModals = () => {
  const {
    showInventory,
    showMap,
    showSettings,
    showDiary,
    setShowInventory,
    setShowMap,
    setShowSettings,
    setShowDiary,
    npcs,
    memoryFlowers
  } = useGameStore()

  return (
    <>
      {/* 背包模態框 */}
      <Modal isOpen={showInventory} onClose={() => setShowInventory(false)} title="🎒 我的背包">
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 16 }, (_, i) => (
            <div
              key={i}
              className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 
                         rounded-xl border-2 border-dashed border-gray-300
                         flex items-center justify-center text-gray-400 text-2xl
                         hover:border-healing-gentle transition-colors duration-200"
            >
              {i === 0 && '🌸'}
              {i === 1 && '🎁'}
              {i === 2 && '📝'}
            </div>
          ))}
        </div>
        <div className="mt-6 p-4 bg-healing-gentle/20 rounded-xl">
          <p className="text-gray-600 text-sm">
            在心語小鎮的旅程中收集的珍貴物品會出現在這裡。與居民對話、完成心願，都可能獲得特別的禮物哦！
          </p>
        </div>
      </Modal>

      {/* 地圖模態框 */}
      <Modal isOpen={showMap} onClose={() => setShowMap(false)} title="🗺️ 小鎮地圖">
        <div className="relative bg-gradient-to-br from-green-100 to-blue-100 rounded-2xl p-8 min-h-[400px]">
          {npcs.map((npc) => (
            <div
              key={npc.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${50 + (npc.position[0] / 60) * 40}%`,
                top: `${50 - (npc.position[2] / 60) * 40}%`,
              }}
            >
              <div className="bg-white/90 rounded-full p-2 shadow-lg border border-white/30">
                <div className="w-6 h-6 bg-healing-gentle rounded-full flex items-center justify-center text-xs">
                  👤
                </div>
              </div>
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 
                            bg-gray-800/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                {npc.name}
              </div>
            </div>
          ))}
          
          {memoryFlowers.map((flower) => (
            <div
              key={flower.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${50 + (flower.position[0] / 60) * 40}%`,
                top: `${50 - (flower.position[2] / 60) * 40}%`,
              }}
            >
              <div className="text-lg animate-gentle-float">🌸</div>
            </div>
          ))}
          
          <div className="absolute bottom-4 left-4 bg-white/80 rounded-lg p-3">
            <h4 className="font-bold text-sm mb-2">圖例</h4>
            <div className="flex flex-col space-y-1 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-healing-gentle rounded-full"></div>
                <span>居民</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>🌸</span>
                <span>記憶花朵</span>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* 日記模態框 */}
      <Modal isOpen={showDiary} onClose={() => setShowDiary(false)} title="📖 我的日記">
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-healing-warm/20 to-healing-gentle/20 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-gray-800">今天的心情</h3>
              <span className="text-sm text-gray-500">2024年3月15日</span>
            </div>
            <p className="text-gray-700">
              今天來到了心語小鎮，遇到了很多溫暖的居民。小雅的咖啡香氣讓人感到放鬆，
              阿山推薦的書籍很有趣，月兒的音樂如夢境般美妙...
            </p>
          </div>

          <div className="bg-gradient-to-r from-healing-soft/20 to-healing-warm/20 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-gray-800">特別的回憶</h3>
              <span className="text-sm text-gray-500">2024年3月14日</span>
            </div>
            <p className="text-gray-700">
              第一次踏進這個小鎮，心中充滿了期待。每一次對話都像是在心中種下一朵花，
              希望能與這裡的每個人建立深厚的友誼...
            </p>
          </div>

          <button className="w-full bg-gradient-to-r from-healing-gentle to-healing-soft 
                           text-gray-800 py-3 rounded-xl font-medium
                           hover:from-healing-soft hover:to-healing-gentle 
                           transition-all duration-300">
            ✏️ 寫下今天的感受
          </button>
        </div>
      </Modal>

      {/* 設定模態框 */}
      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="⚙️ 遊戲設定">
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-healing-gentle/20 to-healing-soft/20 rounded-xl p-4">
            <h3 className="font-bold text-gray-800 mb-4">音效設定</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">背景音樂</span>
                <input type="range" min="0" max="100" defaultValue="70" 
                       className="w-32 accent-healing-gentle" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">音效音量</span>
                <input type="range" min="0" max="100" defaultValue="80" 
                       className="w-32 accent-healing-gentle" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-healing-soft/20 to-healing-warm/20 rounded-xl p-4">
            <h3 className="font-bold text-gray-800 mb-4">顯示設定</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">畫質</span>
                <select className="bg-white/50 border border-white/30 rounded-lg px-3 py-1">
                  <option>高品質</option>
                  <option>標準</option>
                  <option>省電模式</option>
                </select>
              </div>
              <div className="flex items-center space-x-3">
                <input type="checkbox" id="fullscreen" className="accent-healing-gentle" />
                <label htmlFor="fullscreen" className="text-gray-700">全螢幕模式</label>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-healing-warm/20 to-healing-gentle/20 rounded-xl p-4">
            <h3 className="font-bold text-gray-800 mb-4">遊戲資訊</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>版本: v1.0.0</p>
              <p>開發者: Heart Whisper Town Team</p>
              <p>© 2024 心語小鎮 - 用愛與關懷構建的虛擬世界</p>
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}