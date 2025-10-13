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
    showMemoryFlowers: true,
    showIslandAnimations: true,

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
          {/* 背景遮罩 - 黑夜模式 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 backdrop-blur-sm z-[45]"
            style={{
              background: 'rgba(22, 33, 62, 0.7)',
            }}
            onClick={onClose}
          />

          {/* 設定選單主體 - 動森風格黑夜模式 */}
          <motion.div
            initial={{ x: -400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -400, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed left-0 top-0 bottom-0 w-full sm:w-[400px] md:w-[500px] max-w-[90vw] shadow-2xl ${Z_INDEX_CLASSES.SIDEBAR} overflow-hidden`}
            style={{
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(26, 26, 46, 0.95) 100%)',
              backdropFilter: 'blur(16px) saturate(150%)',
              WebkitBackdropFilter: 'blur(16px) saturate(150%)',
              borderRight: '3px solid rgba(251, 191, 36, 0.3)',
              boxShadow: '4px 0 24px rgba(251, 191, 36, 0.2)',
            }}
          >
            {/* 標題區域 - 深色優雅 */}
            <div className="p-4 md:p-6" style={{
              background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(251, 146, 60, 0.15) 100%)',
              borderBottom: '2px solid rgba(251, 191, 36, 0.3)',
            }}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg md:text-2xl font-black truncate" style={{
                    color: '#fef3c7',
                    textShadow: '0 2px 8px rgba(251, 191, 36, 0.3)',
                  }}>
                    ⚙️ 遊戲設定
                  </h2>
                  <p className="text-xs md:text-sm mt-1 font-semibold truncate" style={{ color: '#94a3b8' }}>
                    心語小鎮設定選單
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center transition-all hover:scale-110 flex-shrink-0"
                  style={{
                    background: 'rgba(30, 41, 59, 0.6)',
                    border: '2px solid rgba(251, 191, 36, 0.3)',
                    color: '#cbd5e1',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(251, 191, 36, 0.3)'
                    e.currentTarget.style.color = '#fef3c7'
                    e.currentTarget.style.transform = 'scale(1.1) rotate(90deg)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(30, 41, 59, 0.6)'
                    e.currentTarget.style.color = '#cbd5e1'
                    e.currentTarget.style.transform = 'scale(1)'
                  }}
                >
                  <span className="text-xl">✕</span>
                </button>
              </div>
            </div>

            {/* 分頁標籤 - 黑夜模式 */}
            <div className="flex border-b" style={{
              background: 'rgba(30, 41, 59, 0.4)',
              borderColor: 'rgba(251, 191, 36, 0.2)',
            }}>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex-1 py-2 md:py-3 px-1 md:px-2 text-xs md:text-sm font-bold transition-all"
                  style={activeTab === tab.id ? {
                    background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.25) 0%, rgba(251, 146, 60, 0.25) 100%)',
                    color: '#fef3c7',
                    borderBottom: '3px solid #fbbf24',
                    boxShadow: '0 4px 12px rgba(251, 191, 36, 0.2)',
                  } : {
                    color: '#94a3b8',
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== tab.id) {
                      e.currentTarget.style.background = 'rgba(251, 191, 36, 0.1)'
                      e.currentTarget.style.color = '#cbd5e1'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== tab.id) {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = '#94a3b8'
                    }
                  }}
                >
                  <div className="text-base md:text-lg mb-0.5 md:mb-1">{tab.icon}</div>
                  <div className="text-[10px] md:text-xs leading-tight">{tab.label}</div>
                </button>
              ))}
            </div>

            {/* 內容區域 */}
            <div className="overflow-y-auto h-[calc(100vh-180px)] md:h-[calc(100vh-200px)] p-3 md:p-6 space-y-3 md:space-y-4">
              {/* 遊戲設定 */}
              {activeTab === 'game' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="rounded-2xl p-5 shadow-lg" style={{
                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(26, 26, 46, 0.6) 100%)',
                    backdropFilter: 'blur(12px)',
                    border: '2px solid rgba(251, 191, 36, 0.2)',
                  }}>
                    <h3 className="font-bold text-lg mb-4" style={{ color: '#fbbf24', textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>
                      📝 基本設定
                    </h3>

                    <div className="space-y-3">
                      <label className="flex items-center justify-between p-3 rounded-xl transition-all" style={{
                        background: 'rgba(30, 41, 59, 0.4)',
                        border: '1px solid rgba(251, 191, 36, 0.15)',
                      }}>
                        <span className="text-sm font-bold" style={{ color: '#fef3c7' }}>自動儲存</span>
                        <input
                          type="checkbox"
                          checked={settings.autoSave}
                          onChange={(e) => setSettings({ ...settings, autoSave: e.target.checked })}
                          className="w-5 h-5 rounded accent-amber-500"
                        />
                      </label>

                      <label className="flex items-center justify-between p-3 rounded-xl transition-all" style={{
                        background: 'rgba(30, 41, 59, 0.4)',
                        border: '1px solid rgba(251, 191, 36, 0.15)',
                      }}>
                        <span className="text-sm font-bold" style={{ color: '#fef3c7' }}>顯示新手教學</span>
                        <input
                          type="checkbox"
                          checked={settings.showTutorial}
                          onChange={(e) => setSettings({ ...settings, showTutorial: e.target.checked })}
                          className="w-5 h-5 rounded accent-amber-500"
                        />
                      </label>

                      <label className="flex items-center justify-between p-3 rounded-xl transition-all" style={{
                        background: 'rgba(30, 41, 59, 0.4)',
                        border: '1px solid rgba(251, 191, 36, 0.15)',
                      }}>
                        <span className="text-sm font-bold" style={{ color: '#fef3c7' }}>顯示通知</span>
                        <input
                          type="checkbox"
                          checked={settings.showNotifications}
                          onChange={(e) => setSettings({ ...settings, showNotifications: e.target.checked })}
                          className="w-5 h-5 rounded accent-amber-500"
                        />
                      </label>

                      <label className="flex items-center justify-between p-3 rounded-xl transition-all" style={{
                        background: 'rgba(30, 41, 59, 0.4)',
                        border: '1px solid rgba(251, 191, 36, 0.15)',
                      }}>
                        <span className="text-sm font-bold" style={{ color: '#fef3c7' }}>🌳 顯示記憶樹</span>
                        <input
                          type="checkbox"
                          checked={settings.showMemoryFlowers}
                          onChange={(e) => setSettings({ ...settings, showMemoryFlowers: e.target.checked })}
                          className="w-5 h-5 rounded accent-amber-500"
                        />
                      </label>

                      <label className="flex items-center justify-between p-3 rounded-xl transition-all" style={{
                        background: 'rgba(30, 41, 59, 0.4)',
                        border: '1px solid rgba(251, 191, 36, 0.15)',
                      }}>
                        <span className="text-sm font-bold" style={{ color: '#fef3c7' }}>🏝️ 島嶼動畫效果</span>
                        <input
                          type="checkbox"
                          checked={settings.showIslandAnimations}
                          onChange={(e) => setSettings({ ...settings, showIslandAnimations: e.target.checked })}
                          className="w-5 h-5 rounded accent-amber-500"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="rounded-2xl p-5 shadow-lg" style={{
                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(26, 26, 46, 0.6) 100%)',
                    backdropFilter: 'blur(12px)',
                    border: '2px solid rgba(251, 191, 36, 0.2)',
                  }}>
                    <h3 className="font-bold text-lg mb-4" style={{ color: '#fbbf24', textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>
                      ℹ️ 遊戲說明
                    </h3>
                    <div className="text-sm space-y-3" style={{ color: '#cbd5e1', lineHeight: '1.6' }}>
                      <div className="p-3 rounded-xl" style={{
                        background: 'rgba(251, 191, 36, 0.1)',
                        border: '1px solid rgba(251, 191, 36, 0.2)',
                      }}>
                        <p className="font-bold mb-1" style={{ color: '#fbbf24' }}>🏝️ 探索島嶼</p>
                        <p>點擊不同的知識島嶼進入詳細檢視，每個島嶼代表一個知識領域</p>
                      </div>

                      <div className="p-3 rounded-xl" style={{
                        background: 'rgba(251, 191, 36, 0.1)',
                        border: '1px solid rgba(251, 191, 36, 0.2)',
                      }}>
                        <p className="font-bold mb-1" style={{ color: '#fbbf24' }}>🌳 記憶樹</p>
                        <p>每個記憶都會以生長的樹木形式呈現在島上，顏色和高度反映記憶的特性</p>
                      </div>

                      <div className="p-3 rounded-xl" style={{
                        background: 'rgba(251, 191, 36, 0.1)',
                        border: '1px solid rgba(251, 191, 36, 0.2)',
                      }}>
                        <p className="font-bold mb-1" style={{ color: '#fbbf24' }}>🐱 AI 貓咪助手</p>
                        <p>與可愛的白噗噗（Tororo）和小黑（Hijiki）對話，幫助你整理知識</p>
                      </div>

                      <div className="p-3 rounded-xl" style={{
                        background: 'rgba(251, 191, 36, 0.1)',
                        border: '1px solid rgba(251, 191, 36, 0.2)',
                      }}>
                        <p className="font-bold mb-1" style={{ color: '#fbbf24' }}>💝 知識寶庫</p>
                        <p>中央的知識寶庫可查看和管理所有記憶，支援搜尋和分類</p>
                      </div>

                      <div className="p-3 rounded-xl" style={{
                        background: 'rgba(251, 191, 36, 0.1)',
                        border: '1px solid rgba(251, 191, 36, 0.2)',
                      }}>
                        <p className="font-bold mb-1" style={{ color: '#fbbf24' }}>🎨 島嶼創建器</p>
                        <p>使用島嶼創建器自由繪製和自定義你的專屬島嶼形狀</p>
                      </div>
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
                  <div className="rounded-2xl p-5 shadow-lg" style={{
                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(26, 26, 46, 0.6) 100%)',
                    backdropFilter: 'blur(12px)',
                    border: '2px solid rgba(251, 191, 36, 0.2)',
                  }}>
                    <h3 className="font-bold text-lg mb-4" style={{ color: '#fbbf24', textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>
                      🎵 音量控制
                    </h3>

                    <div className="space-y-4">
                      {[
                        { label: '主音量', key: 'masterVolume' as const },
                        { label: '背景音樂', key: 'musicVolume' as const },
                        { label: '音效', key: 'sfxVolume' as const },
                        { label: '環境音', key: 'ambientVolume' as const },
                      ].map(({ label, key }) => (
                        <div key={key} className="p-3 rounded-xl" style={{
                          background: 'rgba(30, 41, 59, 0.4)',
                          border: '1px solid rgba(251, 191, 36, 0.15)',
                        }}>
                          <div className="flex justify-between mb-2">
                            <label className="text-sm font-bold" style={{ color: '#fef3c7' }}>{label}</label>
                            <span className="text-sm font-bold" style={{ color: '#fbbf24' }}>{settings[key]}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={settings[key]}
                            onChange={(e) => setSettings({ ...settings, [key]: parseInt(e.target.value) })}
                            className="w-full accent-amber-500"
                            style={{
                              height: '8px',
                              borderRadius: '4px',
                            }}
                          />
                        </div>
                      ))}
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
                  <div className="rounded-2xl p-5 shadow-lg" style={{
                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(26, 26, 46, 0.6) 100%)',
                    backdropFilter: 'blur(12px)',
                    border: '2px solid rgba(251, 191, 36, 0.2)',
                  }}>
                    <h3 className="font-bold text-lg mb-4" style={{ color: '#fbbf24', textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>
                      🎨 畫面品質
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-bold block mb-2" style={{ color: '#fef3c7' }}>圖形品質</label>
                        <select
                          value={settings.quality}
                          onChange={(e) => setSettings({ ...settings, quality: e.target.value as 'low' | 'medium' | 'high' })}
                          className="w-full px-4 py-3 rounded-xl font-bold focus:outline-none"
                          style={{
                            border: '2px solid rgba(251, 191, 36, 0.3)',
                            background: 'rgba(30, 41, 59, 0.6)',
                            color: '#fef3c7',
                          }}
                        >
                          <option value="low">低 - 提升效能</option>
                          <option value="medium">中 - 平衡</option>
                          <option value="high">高 - 最佳畫質</option>
                        </select>
                      </div>

                      {[
                        { label: '顯示 FPS', key: 'showFPS' as const },
                        { label: '粒子效果', key: 'showParticles' as const },
                        { label: '動態陰影', key: 'showShadows' as const },
                      ].map(({ label, key }) => (
                        <label key={key} className="flex items-center justify-between p-3 rounded-xl transition-all" style={{
                          background: 'rgba(30, 41, 59, 0.4)',
                          border: '1px solid rgba(251, 191, 36, 0.15)',
                        }}>
                          <span className="text-sm font-bold" style={{ color: '#fef3c7' }}>{label}</span>
                          <input
                            type="checkbox"
                            checked={settings[key]}
                            onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })}
                            className="w-5 h-5 rounded accent-amber-500"
                          />
                        </label>
                      ))}
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
                  <div className="rounded-2xl p-5 shadow-lg" style={{
                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(26, 26, 46, 0.6) 100%)',
                    backdropFilter: 'blur(12px)',
                    border: '2px solid rgba(251, 191, 36, 0.2)',
                  }}>
                    <h3 className="font-bold text-lg mb-4" style={{ color: '#fbbf24', textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>
                      👤 使用者資訊
                    </h3>

                    <div className="space-y-3">
                      {[
                        { label: '使用者名稱', value: user?.username || '未登入' },
                        { label: '顯示名稱', value: user?.displayName || '-' },
                        { label: '電子郵件', value: user?.email || '-' },
                      ].map(({ label, value }) => (
                        <div key={label} className="p-3 rounded-xl" style={{
                          background: 'rgba(30, 41, 59, 0.4)',
                          border: '1px solid rgba(251, 191, 36, 0.15)',
                        }}>
                          <label className="text-xs font-semibold block mb-1" style={{ color: '#94a3b8' }}>{label}</label>
                          <p className="font-bold text-lg" style={{ color: '#fef3c7' }}>{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="w-full py-4 rounded-2xl font-bold shadow-lg transition-all hover:scale-[1.02]"
                    style={{
                      background: 'linear-gradient(135deg, #fb923c 0%, #f87171 100%)',
                      color: '#1a1a2e',
                      boxShadow: '0 4px 12px rgba(251, 146, 60, 0.3)',
                    }}
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
                  <div className="rounded-2xl p-5 shadow-lg" style={{
                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(26, 26, 46, 0.6) 100%)',
                    backdropFilter: 'blur(12px)',
                    border: '2px solid rgba(251, 191, 36, 0.2)',
                  }}>
                    <h3 className="font-bold text-lg mb-4" style={{ color: '#fbbf24', textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>
                      🌸 心語小鎮
                    </h3>

                    <div className="text-sm space-y-3" style={{ color: '#cbd5e1', lineHeight: '1.6' }}>
                      <p className="font-bold text-base" style={{ color: '#fef3c7' }}>Heart Whisper Town</p>
                      <p>版本：1.0.0 Beta</p>
                      <p className="leading-relaxed">
                        一個結合 AI 貓咪陪伴與知識島嶼養成的療癒系遊戲。
                        與可愛的 AI 貓咪一起，打造你專屬的療癒知識世界。
                      </p>

                      <div className="pt-3 border-t" style={{ borderColor: 'rgba(251, 191, 36, 0.2)' }}>
                        <p className="font-bold mb-2" style={{ color: '#fbbf24' }}>✨ 特色功能</p>
                        <ul className="space-y-1.5 ml-4">
                          <li className="flex items-start gap-2">
                            <span style={{ color: '#fbbf24' }}>•</span>
                            <span>智能 AI 貓咪助手對話系統</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span style={{ color: '#fbbf24' }}>•</span>
                            <span>記憶樹成長視覺化系統</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span style={{ color: '#fbbf24' }}>•</span>
                            <span>知識島嶼成長養成機制</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span style={{ color: '#fbbf24' }}>•</span>
                            <span>3D 療癒場景自由探索</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span style={{ color: '#fbbf24' }}>•</span>
                            <span>個人化知識管理系統</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span style={{ color: '#fbbf24' }}>•</span>
                            <span>島嶼創建器 - 繪製專屬形狀</span>
                          </li>
                        </ul>
                      </div>

                      <div className="pt-3 border-t" style={{ borderColor: 'rgba(251, 191, 36, 0.2)' }}>
                        <p className="font-bold mb-2" style={{ color: '#fbbf24' }}>👥 開發團隊</p>
                        <p>Heart Whisper Town Team</p>
                        <p className="text-xs mt-2" style={{ color: '#64748b' }}>
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
