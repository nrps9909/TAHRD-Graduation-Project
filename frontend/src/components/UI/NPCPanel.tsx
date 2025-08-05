import { Heart, MapPin, Clock, Sparkles } from 'lucide-react'
import { useGameStore } from '@/stores/gameStore'

export const NPCPanel = () => {
  const { selectedNpc, npcs } = useGameStore()
  
  const currentNpc = npcs.find(npc => npc.id === selectedNpc)
  
  if (!currentNpc) return null

  const getMoodColor = (mood: string) => {
    switch (mood) {
      case 'cheerful': return 'bg-yellow-100 text-yellow-800'
      case 'calm': return 'bg-blue-100 text-blue-800'
      case 'dreamy': return 'bg-purple-100 text-purple-800'
      case 'peaceful': return 'bg-green-100 text-green-800'
      case 'excited': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getMoodEmoji = (mood: string) => {
    switch (mood) {
      case 'cheerful': return '😊'
      case 'calm': return '😌'
      case 'dreamy': return '✨'
      case 'peaceful': return '🕊️'
      case 'excited': return '🌟'
      default: return '😊'
    }
  }

  const getLocationName = (position: [number, number, number]) => {
    const [x, , z] = position
    
    // 根據位置判斷所在地點
    if (Math.abs(x - 10) < 5 && Math.abs(z - 15) < 5) return '咖啡館'
    if (Math.abs(x + 20) < 5 && Math.abs(z + 10) < 5) return '圖書館'
    if (Math.abs(x) < 5 && Math.abs(z - 25) < 10) return '湖畔'
    if (Math.abs(x - 30) < 10 && Math.abs(z) < 10) return '花園'
    if (Math.abs(x + 15) < 5 && Math.abs(z - 20) < 5) return '學校'
    return '小鎮廣場'
  }

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/30 p-6 w-80 animate-fade-in">
      {/* 角色頭像和基本信息 */}
      <div className="flex items-center space-x-4 mb-4">
        <div className="w-16 h-16 bg-gradient-to-br from-healing-soft to-healing-gentle rounded-full flex items-center justify-center text-2xl shadow-lg">
          {getMoodEmoji(currentNpc.currentMood)}
        </div>
        
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-800 mb-1">
            {currentNpc.name}
          </h3>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMoodColor(currentNpc.currentMood)}`}>
              {currentNpc.currentMood}
            </span>
          </div>
        </div>
      </div>

      {/* 關係狀態 */}
      <div className="mb-4 p-3 bg-healing-gentle/30 rounded-xl">
        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
          <Heart className="w-4 h-4 mr-1 text-red-400" />
          關係狀態
        </h4>
        
        <div className="space-y-2">
          {/* 關係等級 */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">親密度</span>
            <div className="flex items-center space-x-1">
              {Array.from({ length: 5 }, (_, i) => (
                <Heart 
                  key={i} 
                  className={`w-3 h-3 ${
                    i < currentNpc.relationshipLevel 
                      ? 'fill-red-400 text-red-400' 
                      : 'text-gray-300'
                  }`} 
                />
              ))}
              <span className="text-xs text-gray-500 ml-1">
                {currentNpc.relationshipLevel}/5
              </span>
            </div>
          </div>

          {/* 互動次數 */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">互動次數</span>
            <span className="text-sm font-medium text-gray-800">
              {Math.floor(Math.random() * 20) + 1} 次
            </span>
          </div>
        </div>
      </div>

      {/* 位置信息 */}
      <div className="mb-4 p-3 bg-healing-nature/30 rounded-xl">
        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
          <MapPin className="w-4 h-4 mr-1 text-green-500" />
          當前位置
        </h4>
        <p className="text-sm text-gray-600">
          {getLocationName(currentNpc.position)}
        </p>
      </div>

      {/* 個性描述 */}
      <div className="mb-4 p-3 bg-healing-soft/30 rounded-xl">
        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
          <Sparkles className="w-4 h-4 mr-1 text-purple-500" />
          個性特質
        </h4>
        <p className="text-sm text-gray-600 leading-relaxed">
          {currentNpc.personality}
        </p>
      </div>

      {/* 最近活動 */}
      <div className="p-3 bg-healing-sunset/30 rounded-xl">
        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
          <Clock className="w-4 h-4 mr-1 text-orange-500" />
          最近動態
        </h4>
        <p className="text-sm text-gray-600">
          {currentNpc.lastInteraction 
            ? `${Math.floor(Math.random() * 60)} 分鐘前互動過`
            : '還沒有互動記錄'
          }
        </p>
      </div>

      {/* 互動提示 */}
      <div className="mt-4 p-3 bg-gradient-to-r from-healing-warm/50 to-healing-gentle/50 rounded-xl border border-white/20">
        <p className="text-xs text-gray-600 text-center">
          💭 多和 {currentNpc.name} 聊天可以增進關係哦！
        </p>
      </div>
    </div>
  )
}