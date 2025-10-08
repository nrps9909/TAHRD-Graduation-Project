import { useSound } from '../hooks/useSound'

/**
 * 音效系統測試頁面
 * 訪問 /sound-test 來測試所有音效功能
 */
export default function SoundTest() {
  const {
    play,
    playRandomMeow,
    playTypingSequence,
    volume,
    setVolume,
    enabled,
    toggleSound,
  } = useSound()

  const soundCategories = [
    {
      name: '貓咪音效 🐱',
      sounds: [
        { id: 'meow_greeting', label: '問候貓叫', emoji: '👋' },
        { id: 'meow_happy', label: '開心貓叫', emoji: '😊' },
        { id: 'meow_curious', label: '好奇貓叫', emoji: '🤔' },
        { id: 'meow_thinking', label: '思考貓叫', emoji: '💭' },
        { id: 'purr', label: '呼嚕聲', emoji: '😌' },
      ],
    },
    {
      name: 'UI 互動音效 🎮',
      sounds: [
        { id: 'typing', label: '打字音效', emoji: '⌨️' },
        { id: 'message_sent', label: '訊息發送', emoji: '📤' },
        { id: 'message_received', label: '訊息接收', emoji: '📥' },
        { id: 'notification', label: '通知音效', emoji: '🔔' },
        { id: 'button_click', label: '按鈕點擊', emoji: '👆' },
        { id: 'upload_success', label: '上傳成功', emoji: '✅' },
        { id: 'achievement', label: '成就達成', emoji: '🏆' },
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-baby-pink/30 via-baby-yellow/30 to-baby-peach/30 p-8">
      <div className="max-w-4xl mx-auto bg-white/90 backdrop-blur-md rounded-3xl shadow-cute-xl p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-pink-400 to-yellow-400 bg-clip-text text-transparent">
            🎵 音效系統測試面板
          </h1>
          <p className="text-gray-600">
            測試所有音效功能，確保音效系統正常運作
          </p>
        </div>

        {/* Controls */}
        <div className="mb-8 p-6 bg-gradient-to-br from-baby-cream to-baby-yellow/30 rounded-2xl">
          <h2 className="text-xl font-bold mb-4 text-gray-800">控制面板</h2>

          {/* Sound Toggle */}
          <div className="mb-4 flex items-center justify-between">
            <span className="text-gray-700 font-medium">音效狀態：</span>
            <button
              onClick={toggleSound}
              className={`px-6 py-3 rounded-xl font-bold text-white shadow-cute transition-all hover:scale-105 active:scale-95 ${
                enabled
                  ? 'bg-gradient-to-br from-green-400 to-green-500'
                  : 'bg-gradient-to-br from-gray-400 to-gray-500'
              }`}
            >
              {enabled ? '🔊 已開啟' : '🔇 已關閉'}
            </button>
          </div>

          {/* Volume Control */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-700 font-medium">音量：</span>
              <span className="text-lg font-bold text-pink-500">
                {Math.round(volume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #FF8FB3 0%, #FF8FB3 ${volume * 100}%, #e5e7eb ${volume * 100}%, #e5e7eb 100%)`,
              }}
            />
          </div>

          {/* Special Functions */}
          <div className="flex gap-3">
            <button
              onClick={playRandomMeow}
              className="flex-1 px-6 py-3 bg-gradient-to-br from-baby-pink to-baby-blush text-white rounded-xl font-bold shadow-cute transition-all hover:scale-105 active:scale-95"
            >
              🎲 隨機貓叫
            </button>
            <button
              onClick={() => playTypingSequence(3000)}
              className="flex-1 px-6 py-3 bg-gradient-to-br from-purple-400 to-purple-500 text-white rounded-xl font-bold shadow-cute transition-all hover:scale-105 active:scale-95"
            >
              ⌨️ 打字序列 (3秒)
            </button>
          </div>
        </div>

        {/* Sound Categories */}
        {soundCategories.map((category) => (
          <div key={category.name} className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              {category.name}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {category.sounds.map((sound) => (
                <button
                  key={sound.id}
                  onClick={() => play(sound.id as any)}
                  className="group px-6 py-4 bg-gradient-to-br from-white to-baby-cream hover:from-baby-pink/20 hover:to-baby-yellow/20 border-2 border-baby-blush/30 hover:border-baby-pink rounded-2xl shadow-cute transition-all hover:scale-105 active:scale-95 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl group-hover:scale-110 transition-transform">
                      {sound.emoji}
                    </span>
                    <div>
                      <div className="font-bold text-gray-800">
                        {sound.label}
                      </div>
                      <div className="text-xs text-gray-500 font-mono">
                        {sound.id}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Status Info */}
        <div className="mt-8 p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border-2 border-blue-200">
          <h3 className="text-lg font-bold mb-3 text-gray-800">
            💡 使用提示
          </h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>
              🔊 <strong>首次使用：</strong>{' '}
              某些瀏覽器需要用戶互動後才能播放音效
            </li>
            <li>
              📁 <strong>音效文件：</strong> 確保{' '}
              <code className="bg-white px-2 py-1 rounded">
                public/sounds/
              </code>{' '}
              目錄下有對應的 MP3 文件
            </li>
            <li>
              🎵 <strong>缺少音效：</strong>{' '}
              如果音效文件不存在，系統會優雅降級，不影響功能
            </li>
            <li>
              💾 <strong>偏好保存：</strong>{' '}
              音效開關狀態和音量設置會保存到 localStorage
            </li>
            <li>
              🐛 <strong>調試：</strong> 打開瀏覽器控制台查看詳細信息
            </li>
          </ul>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            查看{' '}
            <code className="bg-gray-200 px-2 py-1 rounded">
              public/sounds/README.md
            </code>{' '}
            了解如何獲取音效文件
          </p>
        </div>
      </div>
    </div>
  )
}
