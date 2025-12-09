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
            className="fixed left-0 top-0 h-full w-80 bg-bg-secondary border-r border-border-primary z-50"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-text-primary">
                  學習進度
                </h2>
                <button
                  onClick={onToggle}
                  className="text-text-secondary hover:text-text-primary"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-bg-tertiary rounded-lg p-4 border border-border-primary">
                  <div className="flex items-center gap-3 mb-2">
                    <Trophy className="w-5 h-5 text-accent" />
                    <span className="text-sm text-text-secondary">
                      積分
                    </span>
                  </div>
                  <p className="text-2xl font-semibold text-text-primary">
                    {totalScore}
                  </p>
                </div>

                <div className="bg-bg-tertiary rounded-lg p-4 border border-border-primary">
                  <div className="flex items-center gap-3 mb-2">
                    <BookOpen className="w-5 h-5 text-accent" />
                    <span className="text-sm text-text-secondary">
                      課程進度
                    </span>
                  </div>
                  <p className="text-text-primary">
                    {completedScenes.length} / 9 已完成
                  </p>
                  <div className="mt-2 flex gap-1">
                    {[...Array(9)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-8 h-2 rounded ${
                          i < completedScenes.length
                            ? 'bg-accent'
                            : 'bg-bg-hover'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="bg-bg-tertiary rounded-lg p-4 border border-border-primary">
                  <div className="flex items-center gap-3 mb-2">
                    <Star className="w-5 h-5 text-accent" />
                    <span className="text-sm text-text-secondary">
                      成就
                    </span>
                  </div>
                  <p className="text-text-primary mb-3">
                    {unlockedCount} / {achievements.length} 已解鎖
                  </p>
                  <div className="space-y-2">
                    {achievements.map(achievement => (
                      <div
                        key={achievement.id}
                        className={`flex items-center gap-2 p-2 rounded ${
                          achievement.unlocked
                            ? 'bg-bg-hover border border-border-secondary'
                            : 'opacity-50'
                        }`}
                      >
                        <span className="text-2xl">{achievement.icon}</span>
                        <div className="flex-1">
                          <p className="text-xs text-text-primary">
                            {achievement.name}
                          </p>
                          <p className="text-xs text-text-muted">
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
                  className="btn-secondary w-full text-sm"
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
