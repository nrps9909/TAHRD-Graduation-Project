import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, BookOpen, Terminal, Star, X } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar = ({ isOpen, onToggle }: SidebarProps) => {
  const { achievements, completedScenes, totalScore, resetGame } = useGameStore();
  const unlockedCount = achievements.filter(a => a.unlocked).length;

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
            className="fixed left-0 top-0 h-full w-80 bg-terminal-bg border-r border-retro-green z-50"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-pixel text-retro-green">PROGRESS</h2>
                <button
                  onClick={onToggle}
                  className="text-retro-green hover:text-retro-cyan"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="terminal-window">
                  <div className="flex items-center gap-3 mb-2">
                    <Trophy className="w-5 h-5 text-retro-amber" />
                    <span className="font-pixel text-sm text-retro-amber">SCORE</span>
                  </div>
                  <p className="text-2xl font-mono text-retro-green">{totalScore}</p>
                </div>

                <div className="terminal-window">
                  <div className="flex items-center gap-3 mb-2">
                    <BookOpen className="w-5 h-5 text-retro-cyan" />
                    <span className="font-pixel text-sm text-retro-cyan">CHAPTERS</span>
                  </div>
                  <p className="font-mono text-retro-green">
                    {completedScenes.length} / 9 Complete
                  </p>
                  <div className="mt-2 flex gap-1">
                    {[...Array(9)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-8 h-2 ${
                          i < completedScenes.length
                            ? 'bg-retro-green'
                            : 'bg-gray-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="terminal-window">
                  <div className="flex items-center gap-3 mb-2">
                    <Star className="w-5 h-5 text-retro-amber" />
                    <span className="font-pixel text-sm text-retro-amber">
                      ACHIEVEMENTS
                    </span>
                  </div>
                  <p className="font-mono text-retro-green mb-3">
                    {unlockedCount} / {achievements.length} Unlocked
                  </p>
                  <div className="space-y-2">
                    {achievements.map((achievement) => (
                      <div
                        key={achievement.id}
                        className={`flex items-center gap-2 p-2 rounded ${
                          achievement.unlocked
                            ? 'bg-green-900 bg-opacity-30'
                            : 'opacity-50'
                        }`}
                      >
                        <span className="text-2xl">{achievement.icon}</span>
                        <div className="flex-1">
                          <p className="font-mono text-xs text-retro-green">
                            {achievement.name}
                          </p>
                          <p className="font-mono text-xs text-gray-400">
                            {achievement.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to reset your progress?')) {
                      resetGame();
                      onToggle();
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
  );
};

export default Sidebar;