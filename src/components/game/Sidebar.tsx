import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, BookOpen, Star, X } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

const Sidebar = ({ isOpen, onToggle }: SidebarProps) => {
  const { achievements, completedScenes, totalScore, resetGame } =
    useGameStore()
  const unlockedCount = achievements.filter(a => a.unlocked).length

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-40"
            onClick={onToggle}
          />
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="fixed left-0 top-0 h-full w-80 bg-pink-50/20 backdrop-blur border-r border-pink-200/50 z-50"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-cute text-pink-400">學習進度</h2>
                <button
                  onClick={onToggle}
                  className="text-pink-400 hover:text-pink-500"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-pink-100/30 backdrop-blur rounded-lg p-4 border border-pink-200/40">
                  <div className="flex items-center gap-3 mb-2">
                    <Trophy className="w-5 h-5 text-pink-400" />
                    <span className="font-cute text-sm text-pink-400">
                      積分
                    </span>
                  </div>
                  <p className="text-2xl font-cute text-pink-500">
                    {totalScore}
                  </p>
                </div>

                <div className="bg-pink-100/30 backdrop-blur rounded-lg p-4 border border-pink-200/40">
                  <div className="flex items-center gap-3 mb-2">
                    <BookOpen className="w-5 h-5 text-yellow-400" />
                    <span className="font-cute text-sm text-yellow-600">
                      課程進度
                    </span>
                  </div>
                  <p className="font-cute text-pink-500">
                    {completedScenes.length} / 9 已完成
                  </p>
                  <div className="mt-2 flex gap-1">
                    {[...Array(9)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-8 h-2 rounded ${
                          i < completedScenes.length
                            ? 'bg-pink-400'
                            : 'bg-rose-200/50'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="bg-pink-100/30 backdrop-blur rounded-lg p-4 border border-pink-200/40">
                  <div className="flex items-center gap-3 mb-2">
                    <Star className="w-5 h-5 text-pink-400" />
                    <span className="font-cute text-sm text-pink-400">
                      成就
                    </span>
                  </div>
                  <p className="font-cute text-pink-500 mb-3">
                    {unlockedCount} / {achievements.length} 已解鎖
                  </p>
                  <div className="space-y-2">
                    {achievements.map(achievement => (
                      <div
                        key={achievement.id}
                        className={`flex items-center gap-2 p-2 rounded ${
                          achievement.unlocked
                            ? 'bg-pink-200/30 border border-pink-300/50'
                            : 'opacity-50'
                        }`}
                      >
                        <span className="text-2xl">{achievement.icon}</span>
                        <div className="flex-1">
                          <p className="font-cute text-xs text-pink-500">
                            {achievement.name}
                          </p>
                          <p className="font-cute text-xs text-rose-300">
                            {achievement.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (
                      confirm('Are you sure you want to reset your progress?')
                    ) {
                      resetGame()
                      onToggle()
                    }
                  }}
                  className="retro-button w-full text-sm"
                >
                  RESET GAME
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default Sidebar
