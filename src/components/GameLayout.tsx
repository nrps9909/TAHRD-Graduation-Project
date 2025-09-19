import { useState } from 'react';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';
import Terminal from './Terminal';
import SceneRenderer from './SceneRenderer';
import ProgressBar from './ProgressBar';
import { useGameStore } from '../store/gameStore';

const GameLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { currentScene, playerName } = useGameStore();

  return (
    <div className="min-h-screen flex bg-retro-bg">
      <Sidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />

      <div className="flex-1 flex flex-col">
        <header className="border-b border-retro-green p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="text-retro-green hover:text-retro-cyan transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="font-pixel text-retro-green">
                CLAUDE CODE ADVENTURE
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-mono text-retro-amber text-sm">
                Player: {playerName}
              </span>
              <ProgressBar />
            </div>
          </div>
        </header>

        <div className="flex-1 flex">
          <motion.div
            key={currentScene}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 p-6"
          >
            <SceneRenderer sceneId={currentScene} />
          </motion.div>

          <div className="w-1/3 min-w-[400px] border-l border-retro-green">
            <Terminal />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameLayout;