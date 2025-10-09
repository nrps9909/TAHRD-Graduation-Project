import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../stores/authStore'
import { useNavigate } from 'react-router-dom'
import { Z_INDEX_CLASSES } from '../constants/zIndex'

interface SettingsMenuProps {
  isOpen: boolean
  onClose: () => void
}

type TabType = 'game' | 'audio' | 'display' | 'account' | 'about'

export default function SettingsMenu({ isOpen, onClose }: SettingsMenuProps) {
  const [activeTab, setActiveTab] = useState<TabType>('game')
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  // 設定值狀態
  const [settings, setSettings] = useState({
    // 遊戲設定
    autoSave: true,
    showTutorial: true,
    showNotifications: true,

    // 音效設定
    masterVolume: 80,
    musicVolume: 70,
    sfxVolume: 80,
    ambientVolume: 60,

    // 顯示設定
    showFPS: false,
    quality: 'high' as 'low' | 'medium' | 'high',
    showParticles: true,
    showShadows: true,
  })

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'game', label: '遊戲設定', icon: '🎮' },
    { id: 'audio', label: '音效設定', icon: '🔊' },
    { id: 'display', label: '顯示設定', icon: '🎨' },
    { id: 'account', label: '帳號資訊', icon: '👤' },
    { id: 'about', label: '關於遊戲', icon: '📖' },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[45]"
            onClick={onClose}
          />

          {/* 設定選單主體 */}
          <motion.div
            initial={{ x: -400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -400, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed left-0 top-0 bottom-0 w-[500px] bg-gradient-to-br from-pink-50 via-yellow-50 to-pink-100 shadow-2xl ${Z_INDEX_CLASSES.SIDEBAR} overflow-hidden`}
          >
            {/* 標題區域 */}
            <div className="bg-gradient-to-r from-pink-500 to-yellow-500 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black">⚙️ 遊戲設定</h2>
                  <p className="text-sm text-white/80 mt-1">心語小鎮設定選單</p>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* 分頁標籤 */}
            <div className="flex bg-white/60 border-b-2 border-pink-200">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-3 px-2 text-sm font-bold transition-all ${
                    activeTab === tab.id
                      ? 'bg-white text-pink-600 border-b-4 border-pink-500'
                      : 'text-gray-600 hover:bg-white/40'
                  }`}
                >
                  <div className="text-lg mb-1">{tab.icon}</div>
                  <div className="text-xs">{tab.label}</div>
                </button>
              ))}
            </div>

            {/* 內容區域 */}
            <div className="overflow-y-auto h-[calc(100vh-200px)] p-6 space-y-4">
              {/* 遊戲設定 */}
              {activeTab === 'game' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="bg-white/80 rounded-xl p-4 shadow-md">
                    <h3 className="font-bold text-lg mb-3 text-pink-600">📝 基本設定</h3>

                    <div className="space-y-3">
                      <label className="flex items-center justify-between">
                        <span className="text-sm font-medium">自動儲存</span>
                        <input
                          type="checkbox"
                          checked={settings.autoSave}
                          onChange={(e) => setSettings({ ...settings, autoSave: e.target.checked })}
                          className="w-5 h-5 rounded accent-pink-500"
                        />
                      </label>

                      <label className="flex items-center justify-between">
                        <span className="text-sm font-medium">顯示新手教學</span>
                        <input
                          type="checkbox"
                          checked={settings.showTutorial}
                          onChange={(e) => setSettings({ ...settings, showTutorial: e.target.checked })}
                          className="w-5 h-5 rounded accent-pink-500"
                        />
                      </label>

                      <label className="flex items-center justify-between">
                        <span className="text-sm font-medium">顯示通知</span>
                        <input
                          type="checkbox"
                          checked={settings.showNotifications}
                          onChange={(e) => setSettings({ ...settings, showNotifications: e.target.checked })}
                          className="w-5 h-5 rounded accent-pink-500"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="bg-white/80 rounded-xl p-4 shadow-md">
                    <h3 className="font-bold text-lg mb-3 text-pink-600">ℹ️ 遊戲說明</h3>
                    <div className="text-sm text-gray-700 space-y-2">
                      <p>🏝️ <strong>探索島嶼</strong>：點擊不同的知識島嶼進入詳細檢視</p>
                      <p>🌸 <strong>記憶花朵</strong>：每個記憶都會以花朵形式綻放在島上</p>
                      <p>🐱 <strong>AI 貓咪</strong>：與可愛的 AI 貓咪助手對話</p>
                      <p>📚 <strong>知識寶庫</strong>：中央水晶球可查看所有知識</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 音效設定 */}
              {activeTab === 'audio' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="bg-white/80 rounded-xl p-4 shadow-md">
                    <h3 className="font-bold text-lg mb-3 text-pink-600">🎵 音量控制</h3>

                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-2">
                          <label className="text-sm font-medium">主音量</label>
                          <span className="text-sm text-gray-600">{settings.masterVolume}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={settings.masterVolume}
                          onChange={(e) => setSettings({ ...settings, masterVolume: parseInt(e.target.value) })}
                          className="w-full accent-pink-500"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between mb-2">
                          <label className="text-sm font-medium">背景音樂</label>
                          <span className="text-sm text-gray-600">{settings.musicVolume}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={settings.musicVolume}
                          onChange={(e) => setSettings({ ...settings, musicVolume: parseInt(e.target.value) })}
                          className="w-full accent-pink-500"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between mb-2">
                          <label className="text-sm font-medium">音效</label>
                          <span className="text-sm text-gray-600">{settings.sfxVolume}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={settings.sfxVolume}
                          onChange={(e) => setSettings({ ...settings, sfxVolume: parseInt(e.target.value) })}
                          className="w-full accent-pink-500"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between mb-2">
                          <label className="text-sm font-medium">環境音</label>
                          <span className="text-sm text-gray-600">{settings.ambientVolume}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={settings.ambientVolume}
                          onChange={(e) => setSettings({ ...settings, ambientVolume: parseInt(e.target.value) })}
                          className="w-full accent-pink-500"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 顯示設定 */}
              {activeTab === 'display' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="bg-white/80 rounded-xl p-4 shadow-md">
                    <h3 className="font-bold text-lg mb-3 text-pink-600">🎨 畫面品質</h3>

                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium block mb-2">圖形品質</label>
                        <select
                          value={settings.quality}
                          onChange={(e) => setSettings({ ...settings, quality: e.target.value as any })}
                          className="w-full px-4 py-2 rounded-lg border-2 border-pink-200 focus:border-pink-400 focus:outline-none"
                        >
                          <option value="low">低 - 提升效能</option>
                          <option value="medium">中 - 平衡</option>
                          <option value="high">高 - 最佳畫質</option>
                        </select>
                      </div>

                      <label className="flex items-center justify-between">
                        <span className="text-sm font-medium">顯示 FPS</span>
                        <input
                          type="checkbox"
                          checked={settings.showFPS}
                          onChange={(e) => setSettings({ ...settings, showFPS: e.target.checked })}
                          className="w-5 h-5 rounded accent-pink-500"
                        />
                      </label>

                      <label className="flex items-center justify-between">
                        <span className="text-sm font-medium">粒子效果</span>
                        <input
                          type="checkbox"
                          checked={settings.showParticles}
                          onChange={(e) => setSettings({ ...settings, showParticles: e.target.checked })}
                          className="w-5 h-5 rounded accent-pink-500"
                        />
                      </label>

                      <label className="flex items-center justify-between">
                        <span className="text-sm font-medium">動態陰影</span>
                        <input
                          type="checkbox"
                          checked={settings.showShadows}
                          onChange={(e) => setSettings({ ...settings, showShadows: e.target.checked })}
                          className="w-5 h-5 rounded accent-pink-500"
                        />
                      </label>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 帳號資訊 */}
              {activeTab === 'account' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="bg-white/80 rounded-xl p-4 shadow-md">
                    <h3 className="font-bold text-lg mb-3 text-pink-600">👤 使用者資訊</h3>

                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-gray-600">使用者名稱</label>
                        <p className="font-bold text-lg">{user?.username || '未登入'}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">顯示名稱</label>
                        <p className="font-bold text-lg">{user?.displayName || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">電子郵件</label>
                        <p className="font-bold text-lg">{user?.email || '-'}</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-red-400 to-pink-400 text-white font-bold shadow-lg hover:shadow-xl transition-all"
                  >
                    🚪 登出帳號
                  </button>
                </motion.div>
              )}

              {/* 關於遊戲 */}
              {activeTab === 'about' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="bg-white/80 rounded-xl p-4 shadow-md">
                    <h3 className="font-bold text-lg mb-3 text-pink-600">🌸 心語小鎮</h3>

                    <div className="text-sm text-gray-700 space-y-3">
                      <p className="font-bold text-base">Heart Whisper Town</p>
                      <p>版本：1.0.0 Beta</p>
                      <p className="leading-relaxed">
                        一個結合 AI 貓咪陪伴與知識島嶼養成的療癒系遊戲。
                        與可愛的 AI 貓咪一起，打造你專屬的療癒知識世界。
                      </p>

                      <div className="pt-3 border-t border-pink-200">
                        <p className="font-bold mb-2">✨ 特色功能</p>
                        <ul className="space-y-1 ml-4">
                          <li>• 智能 AI 貓咪助手對話系統</li>
                          <li>• 記憶花朵綻放視覺化</li>
                          <li>• 知識島嶼成長養成</li>
                          <li>• 3D 療癒場景探索</li>
                          <li>• 個人化知識管理</li>
                        </ul>
                      </div>

                      <div className="pt-3 border-t border-pink-200">
                        <p className="font-bold mb-2">👥 開發團隊</p>
                        <p>Heart Whisper Town Team</p>
                        <p className="text-xs text-gray-500 mt-2">
                          © 2024 All Rights Reserved
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
