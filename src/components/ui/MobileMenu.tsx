import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Home, BookOpen, Trophy, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '@/store/gameStore'

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
      {/* 手機選單按鈕 - Apple 風格 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-3 sm:top-4 right-3 sm:right-4 z-50 lg:hidden p-2.5 sm:p-3 glass rounded-full shadow-apple"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90 }}
              animate={{ rotate: 0 }}
              exit={{ rotate: 90 }}
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6 text-apple-blue" />
            </motion.div>
          ) : (
            <motion.div
              key="menu"
              initial={{ rotate: 90 }}
              animate={{ rotate: 0 }}
              exit={{ rotate: -90 }}
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-apple-blue" />
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
              className="fixed inset-0 bg-black/60 backdrop-blur-xl z-40 lg:hidden"
            />

            {/* 選單內容 - Apple 風格 */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-72 sm:w-80 glass border-l border-white/10 shadow-apple-xl z-50 lg:hidden"
            >
              <div className="p-5 sm:p-6">
                <div className="mb-8 sm:mb-10">
                  <h2 className="text-xl sm:text-2xl font-bold text-apple-gray-50 chinese-text tracking-tight">
                    選單
                  </h2>
                </div>

                <nav className="space-y-2 sm:space-y-3">
                  {menuItems.map((item, index) => (
                    <motion.button
                      key={item.label}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => handleItemClick(item)}
                      className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl hover:bg-white/5 transition-all duration-300"
                    >
                      <item.icon className="w-5 h-5 sm:w-6 sm:h-6 text-apple-blue" />
                      <span className="text-apple-gray-200 font-medium chinese-text text-sm sm:text-base">
                        {item.label}
                      </span>
                    </motion.button>
                  ))}
                </nav>

                {/* 遊戲進度 - Apple 風格 */}
                <div className="mt-8 sm:mt-10 p-4 sm:p-5 bg-apple-blue/10 rounded-2xl">
                  <h3 className="text-xs sm:text-sm font-semibold text-apple-blue mb-3 sm:mb-4 chinese-text">
                    遊戲進度
                  </h3>
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-apple-gray-400 chinese-text">總分</span>
                      <span className="font-semibold text-apple-gray-50">
                        {totalScore}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-apple-gray-400 chinese-text">
                        完成章節
                      </span>
                      <span className="font-semibold text-apple-gray-50">
                        {completedScenes.length} / 9
                      </span>
                    </div>
                  </div>
                </div>

                {/* 貓咪裝飾 */}
                <div className="absolute bottom-6 sm:bottom-8 left-1/2 transform -translate-x-1/2">
                  <motion.div
                    animate={{
                      y: [0, -8, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className="text-4xl sm:text-5xl"
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
