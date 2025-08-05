import { useState } from 'react'
import { Flower, X, Calendar, Heart } from 'lucide-react'
import { useGameStore } from '@/stores/gameStore'

export const MemoryGarden = () => {
  const [showGarden, setShowGarden] = useState(false)
  const { memoryFlowers } = useGameStore()

  const getFlowerEmoji = (flowerType: string) => {
    switch (flowerType) {
      case 'cherry_blossom': return '🌸'
      case 'sunflower': return '🌻'
      case 'lavender': return '💜'
      case 'rose': return '🌹'
      case 'daisy': return '🌼'
      case 'tulip': return '🌷'
      default: return '🌺'
    }
  }

  const getEmotionColorClass = (color: string) => {
    switch (color) {
      case 'warm_pink': return 'bg-pink-100 border-pink-300'
      case 'gentle_blue': return 'bg-blue-100 border-blue-300'
      case 'soft_yellow': return 'bg-yellow-100 border-yellow-300'
      case 'nature_green': return 'bg-green-100 border-green-300'
      case 'sunset_orange': return 'bg-orange-100 border-orange-300'
      case 'dreamy_purple': return 'bg-purple-100 border-purple-300'
      default: return 'bg-gray-100 border-gray-300'
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date))
  }

  return (
    <>
      {/* 觸發按鈕 */}
      <button
        onClick={() => setShowGarden(true)}
        className="bg-gradient-to-r from-pink-400 to-purple-500 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 group"
      >
        <Flower className="w-6 h-6 group-hover:animate-gentle-float" />
      </button>

      {/* 記憶花園彈窗 */}
      {showGarden && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            {/* 標題欄 */}
            <div className="bg-gradient-to-r from-pink-400 to-purple-500 text-white p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold flex items-center">
                  🌸 記憶花園
                </h2>
                <p className="text-pink-100 mt-1">
                  珍藏每一段美好的對話回憶
                </p>
              </div>
              <button
                onClick={() => setShowGarden(false)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 花園內容 */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {memoryFlowers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🌱</div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    花園還很空曠
                  </h3>
                  <p className="text-gray-500">
                    和小鎮居民多聊聊，就會有美麗的記憶花朵綻放哦！
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {memoryFlowers.map((flower) => (
                    <div
                      key={flower.id}
                      className={`p-4 rounded-xl border-2 ${getEmotionColorClass(flower.emotionColor)} hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer`}
                    >
                      {/* 花朵頭部 */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-3xl">
                          {getFlowerEmoji(flower.flowerType)}
                        </div>
                        <div className="text-right">
                          <div className="flex items-center text-xs text-gray-500">
                            <Calendar className="w-3 h-3 mr-1" />
                            {formatDate(flower.createdAt)}
                          </div>
                        </div>
                      </div>

                      {/* 花朵信息 */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">
                            與 {flower.npc?.name} 的回憶
                          </span>
                          <div className="flex items-center space-x-1">
                            {Array.from({ length: flower.growthStage }, (_, i) => (
                              <Heart key={i} className="w-3 h-3 fill-red-400 text-red-400" />
                            ))}
                          </div>
                        </div>

                        <p className="text-xs text-gray-600 line-clamp-3">
                          {flower.conversation?.content || '一段珍貴的對話回憶'}
                        </p>

                        <div className="pt-2 border-t border-gray-200">
                          <span className="text-xs text-gray-500 capitalize">
                            {flower.emotionColor.replace('_', ' ')} • {flower.flowerType.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 底部統計 */}
            {memoryFlowers.length > 0 && (
              <div className="bg-gray-50 px-6 py-4 flex items-center justify-between text-sm text-gray-600">
                <div>
                  共收集了 <span className="font-semibold text-purple-600">{memoryFlowers.length}</span> 朵記憶花
                </div>
                <div className="flex space-x-4">
                  <span>🌸 {memoryFlowers.filter(f => f.flowerType === 'cherry_blossom').length}</span>
                  <span>🌻 {memoryFlowers.filter(f => f.flowerType === 'sunflower').length}</span>
                  <span>🌹 {memoryFlowers.filter(f => f.flowerType === 'rose').length}</span>
                  <span>🌷 {memoryFlowers.filter(f => f.flowerType === 'tulip').length}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}