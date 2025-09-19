import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Home, BookOpen, Trophy, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'

const MobileMenu = () => {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()
  const { totalScore, completedScenes } = useGameStore()

  const menuItems = [
    { icon: Home, label: '首頁', path: '/' },
    { icon: BookOpen, label: '課程', path: '/game' },
    { icon: Trophy, label: '成就', action: 'achievements' },
    { icon: Settings, label: '設定', action: 'settings' },
  ]

  const handleItemClick = (item: any) => {
    if (item.path) {
      navigate(item.path)
    } else if (item.action === 'achievements') {
      // 顯示成就
      showAchievements()
    } else if (item.action === 'settings') {
      // 顯示設定
      showSettings()
    }
    setIsOpen(false)
  }

  const showAchievements = () => {
    // TODO: 實作成就顯示
    alert(`總分：${totalScore}\n完成章節：${completedScenes.length}`)
  }

  const showSettings = () => {
    // TODO: 實作設定頁面
    alert('設定功能開發中...')
  }

  return (
    <>
      {/* 手機選單按鈕 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 right-4 z-50 lg:hidden p-3 bg-white rounded-full shadow-lg"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90 }}
              animate={{ rotate: 0 }}
              exit={{ rotate: 90 }}
            >
              <X className="w-6 h-6 text-cat-purple" />
            </motion.div>
          ) : (
            <motion.div
              key="menu"
              initial={{ rotate: 90 }}
              animate={{ rotate: 0 }}
              exit={{ rotate: -90 }}
            >
              <Menu className="w-6 h-6 text-cat-purple" />
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* 手機選單內容 */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* 背景遮罩 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            />

            {/* 選單內容 */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 20 }}
              className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl z-50 lg:hidden"
            >
              <div className="p-6">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-cat-purple chinese-text">
                    選單
                  </h2>
                </div>

                <nav className="space-y-4">
                  {menuItems.map((item, index) => (
                    <motion.button
                      key={item.label}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => handleItemClick(item)}
                      className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-pink-50 transition-colors"
                    >
                      <item.icon className="w-5 h-5 text-cat-purple" />
                      <span className="text-gray-700 font-medium chinese-text">
                        {item.label}
                      </span>
                    </motion.button>
                  ))}
                </nav>

                {/* 遊戲進度 */}
                <div className="mt-8 p-4 bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl">
                  <h3 className="text-sm font-bold text-cat-purple mb-3 chinese-text">
                    遊戲進度
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 chinese-text">總分</span>
                      <span className="font-bold text-cat-purple">
                        {totalScore}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 chinese-text">
                        完成章節
                      </span>
                      <span className="font-bold text-cat-purple">
                        {completedScenes.length} / 9
                      </span>
                    </div>
                  </div>
                </div>

                {/* 貓咪裝飾 */}
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
                  <motion.div
                    animate={{
                      y: [0, -10, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className="text-6xl"
                  >
                    🐱
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export default MobileMenu
