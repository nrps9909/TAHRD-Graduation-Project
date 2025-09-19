import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import IntroScreen from './components/IntroScreen';
import GameLayout from './components/GameLayout';
import TutorialScene from './components/TutorialScene';
import CompletionScreen from './components/CompletionScreen';
import { useGameStore } from './store/gameStore';

function App() {
  const { isPlaying, currentScene } = useGameStore();

  return (
    <Router>
      <div className="min-h-screen bg-retro-bg overflow-hidden">
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={!isPlaying ? <IntroScreen /> : <GameLayout />} />
            <Route path="/game" element={<GameLayout />} />
            <Route path="/tutorial/:sceneId" element={<TutorialScene />} />
            <Route path="/complete" element={<CompletionScreen />} />
          </Routes>
        </AnimatePresence>
      </div>
    </Router>
  );
}

export default App;