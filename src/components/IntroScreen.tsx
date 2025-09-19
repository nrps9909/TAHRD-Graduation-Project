import { useState } from 'react';
import { motion } from 'framer-motion';
import { Terminal, Zap, Code2 } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { useNavigate } from 'react-router-dom';

const IntroScreen = () => {
  const [playerName, setPlayerName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const { startGame } = useGameStore();
  const navigate = useNavigate();

  const handleStartGame = () => {
    if (playerName.trim()) {
      startGame(playerName);
      navigate('/game');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col items-center justify-center p-8"
    >
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-center mb-12"
      >
        <h1 className="text-6xl font-pixel text-retro-green mb-4 animate-pulse">
          CLAUDE CODE
        </h1>
        <h2 className="text-3xl font-pixel text-retro-amber mb-2">
          ADVENTURE
        </h2>
        <p className="text-retro-cyan text-lg font-mono mt-4">
          Master the power of AI-assisted coding
        </p>
      </motion.div>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex gap-8 mb-12"
      >
        <div className="flex flex-col items-center">
          <Terminal className="w-16 h-16 text-retro-green mb-2" />
          <span className="text-xs font-pixel">TERMINAL</span>
        </div>
        <div className="flex flex-col items-center">
          <Code2 className="w-16 h-16 text-retro-amber mb-2" />
          <span className="text-xs font-pixel">CODE</span>
        </div>
        <div className="flex flex-col items-center">
          <Zap className="w-16 h-16 text-retro-cyan mb-2" />
          <span className="text-xs font-pixel">POWER</span>
        </div>
      </motion.div>

      {!showNameInput ? (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          onClick={() => setShowNameInput(true)}
          className="retro-button"
        >
          START ADVENTURE
        </motion.button>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="terminal-window"
        >
          <div className="flex items-center mb-4">
            <span className="text-retro-green font-mono mr-2">$</span>
            <span className="text-retro-amber font-mono">Enter your name:</span>
          </div>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleStartGame()}
            placeholder="Type your name..."
            className="bg-transparent border-b-2 border-retro-green text-retro-green font-mono w-full px-2 py-1 outline-none"
            autoFocus
          />
          <div className="mt-4 flex gap-4">
            <button
              onClick={handleStartGame}
              disabled={!playerName.trim()}
              className="retro-button text-sm"
            >
              BEGIN
            </button>
            <button
              onClick={() => setShowNameInput(false)}
              className="retro-button text-sm"
            >
              CANCEL
            </button>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-12 text-center"
      >
        <p className="text-retro-green font-mono text-sm opacity-60">
          Press START to begin your journey
        </p>
        <p className="text-retro-amber font-mono text-xs mt-2 opacity-40">
          © 2024 Claude Code Adventure
        </p>
      </motion.div>
    </motion.div>
  );
};

export default IntroScreen;