import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Star, Zap, Gift, Sparkles } from 'lucide-react'
import confetti from 'canvas-confetti'

import { Achievement } from '@/types/achievement'
export type { Achievement } from '@/types/achievement'

interface AchievementNotificationProps {
  achievement: Achievement
  onClose: () => void
  show: boolean
}

const AchievementNotification: React.FC<AchievementNotificationProps> = ({
  achievement,
  onClose,
  show,
}) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (show) {
      setIsVisible(true)

      // 觸發彩帶效果
      const colors = {
        common: ['#FFD54F', '#FFF9C4'],
        rare: ['#F8BBD9', '#FFE0B2'],
        epic: ['#F48FB1', '#FFEAA7'],
        legendary: ['#F8BBD9', '#FFEAA7', '#FFD54F'],
      }

      confetti({
        particleCount:
          achievement.rarity === 'legendary'
            ? 150
            : achievement.rarity === 'epic'
              ? 100
              : achievement.rarity === 'rare'
                ? 75
                : 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: colors[achievement.rarity],
      })

      // 3秒後自動關閉
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(onClose, 300)
      }, 3000)

      return () => clearTimeout(timer)
    }
    return undefined
  }, [show, achievement, onClose])

  const getRarityStyles = () => {
    switch (achievement.rarity) {
      case 'legendary':
        return 'from-gradient-to-r from-pink-200 via-rose-200 to-yellow-200 border-yellow-300'
      case 'epic':
        return 'from-pink-200 to-yellow-300 border-pink-300'
      case 'rare':
        return 'from-pink-100 to-pink-200 border-pink-200'
      default:
        return 'from-yellow-100 to-yellow-200 border-yellow-200'
    }
  }

  const getRarityText = () => {
    switch (achievement.rarity) {
      case 'legendary':
        return '🌟 傳說級'
      case 'epic':
        return '🔥 史詩級'
      case 'rare':
        return '💎 稀有'
      default:
        return '✨ 普通'
    }
  }

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <motion.div
            initial={{ scale: 0, rotate: -10, opacity: 0 }}
            animate={{
              scale: isVisible ? 1 : 0,
              rotate: isVisible ? 0 : 10,
              opacity: isVisible ? 1 : 0,
            }}
            transition={{
              type: 'spring',
              damping: 15,
              stiffness: 300,
            }}
            className="pointer-events-auto"
          >
            <div
              className={`bg-gradient-to-r ${getRarityStyles()} p-1 rounded-2xl shadow-2xl max-w-md mx-4`}
            >
              <div className="bg-gray-900 rounded-xl p-6 text-center relative overflow-hidden">
                {/* 背景裝飾 */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-2 left-2 text-2xl animate-pulse">
                    {achievement.icon}
                  </div>
                  <div className="absolute top-2 right-2 text-2xl animate-bounce">
                    ⭐
                  </div>
                  <div className="absolute bottom-2 left-2 text-xl animate-spin">
                    ✨
                  </div>
                  <div className="absolute bottom-2 right-2 text-xl animate-pulse">
                    🎉
                  </div>
                </div>

                {/* 主要內容 */}
                <div className="relative z-10">
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0],
                    }}
                    transition={{
                      duration: 0.6,
                      repeat: 2,
                    }}
                    className="text-6xl mb-4"
                  >
                    {achievement.icon === '🏆' ? (
                      <Trophy className="w-16 h-16 text-yellow-400 mx-auto" />
                    ) : achievement.icon === '⭐' ? (
                      <Star className="w-16 h-16 text-yellow-400 mx-auto" />
                    ) : achievement.icon === '⚡' ? (
                      <Zap className="w-16 h-16 text-cat-yellow mx-auto" />
                    ) : achievement.icon === '🎁' ? (
                      <Gift className="w-16 h-16 text-purple-400 mx-auto" />
                    ) : (
                      <Sparkles className="w-16 h-16 text-pink-400 mx-auto" />
                    )}
                  </motion.div>

                  <motion.h2
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-2xl font-bold text-white mb-2"
                  >
                    🎉 成就解鎖！
                  </motion.h2>

                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mb-3"
                  >
                    <div
                      className={`inline-block px-3 py-1 rounded-full text-sm font-bold mb-2 ${
                        achievement.rarity === 'legendary'
                          ? 'bg-gradient-to-r from-pink-500 to-yellow-500 text-white'
                          : achievement.rarity === 'epic'
                            ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                            : achievement.rarity === 'rare'
                              ? 'bg-gradient-to-r from-cat-pink to-cat-beige text-white'
                              : 'bg-gradient-to-r from-green-500 to-teal-500 text-white'
                      }`}
                    >
                      {getRarityText()}
                    </div>
                  </motion.div>

                  <motion.h3
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-xl font-bold text-white mb-2"
                  >
                    {achievement.title}
                  </motion.h3>

                  <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-gray-300 mb-4 text-sm"
                  >
                    {achievement.description}
                  </motion.p>

                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.6, type: 'spring' }}
                    className="bg-yellow-500 text-black px-4 py-2 rounded-full font-bold inline-flex items-center gap-2"
                  >
                    <Star className="w-4 h-4" />+{achievement.points} 積分
                  </motion.div>

                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    onClick={() => {
                      setIsVisible(false)
                      setTimeout(onClose, 300)
                    }}
                    className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors bg-gray-700 rounded-full w-8 h-8 flex items-center justify-center text-lg"
                  >
                    ×
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default AchievementNotification
