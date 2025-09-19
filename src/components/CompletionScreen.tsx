import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Award, Home } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';

const CompletionScreen = () => {
  const { playerName, totalScore, achievements, completedScenes, resetGame } = useGameStore();
  const navigate = useNavigate();
  const unlockedAchievements = achievements.filter(a => a.unlocked);

  useEffect(() => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval: any = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#00ff00', '#ffb000', '#00ffff', '#9d4edd'],
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#00ff00', '#ffb000', '#00ffff', '#9d4edd'],
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  const getGrade = () => {
    const percentage = (totalScore / 1950) * 100;
    if (percentage >= 90) return 'S';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    return 'D';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex items-center justify-center p-8"
    >
      <div className="max-w-2xl w-full">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="text-center mb-8"
        >
          <Trophy className="w-24 h-24 text-retro-amber mx-auto mb-4" />
          <h1 className="text-5xl font-pixel text-retro-green mb-2">
            CONGRATULATIONS!
          </h1>
          <p className="text-xl font-pixel text-retro-cyan">
            {playerName}, you are now a Claude Code Master!
          </p>
        </motion.div>

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="terminal-window mb-6"
        >
          <h2 className="text-retro-amber font-pixel mb-4">FINAL SCORE</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-mono text-gray-400">Total Points</p>
              <p className="text-3xl font-mono text-retro-green">{totalScore}</p>
            </div>
            <div>
              <p className="text-sm font-mono text-gray-400">Grade</p>
              <p className="text-3xl font-pixel text-retro-amber">{getGrade()}</p>
            </div>
            <div>
              <p className="text-sm font-mono text-gray-400">Chapters Completed</p>
              <p className="text-2xl font-mono text-retro-cyan">{completedScenes.length}/9</p>
            </div>
            <div>
              <p className="text-sm font-mono text-gray-400">Achievements</p>
              <p className="text-2xl font-mono text-retro-purple">
                {unlockedAchievements.length}/{achievements.length}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="terminal-window mb-6"
        >
          <h2 className="text-retro-cyan font-pixel mb-4">ACHIEVEMENTS EARNED</h2>
          <div className="grid grid-cols-2 gap-3">
            {unlockedAchievements.map((achievement) => (
              <div
                key={achievement.id}
                className="flex items-center gap-2 p-2 bg-green-900 bg-opacity-20 rounded"
              >
                <span className="text-2xl">{achievement.icon}</span>
                <div>
                  <p className="font-mono text-xs text-retro-green">{achievement.name}</p>
                  <p className="font-mono text-xs text-gray-400">{achievement.description}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex gap-4 justify-center"
        >
          <button
            onClick={() => navigate('/game')}
            className="retro-button flex items-center gap-2"
          >
            <Award className="w-4 h-4" />
            VIEW PROGRESS
          </button>
          <button
            onClick={() => {
              resetGame();
              navigate('/');
            }}
            className="retro-button flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            NEW GAME
          </button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center mt-8 font-mono text-sm text-gray-400"
        >
          Thank you for playing Claude Code Adventure!
        </motion.p>
      </div>
    </motion.div>
  );
};

export default CompletionScreen;