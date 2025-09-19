import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import SceneRenderer from './SceneRenderer';
import { ArrowLeft } from 'lucide-react';

const TutorialScene = () => {
  const { sceneId } = useParams<{ sceneId: string }>();
  const navigate = useNavigate();

  if (!sceneId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-pixel text-retro-amber mb-4">
            Scene not found
          </h2>
          <button
            onClick={() => navigate('/')}
            className="retro-button"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen p-8"
    >
      <header className="mb-8">
        <button
          onClick={() => navigate('/game')}
          className="flex items-center gap-2 text-retro-green hover:text-retro-cyan transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-mono">Back to Game</span>
        </button>
      </header>

      <div className="max-w-6xl mx-auto">
        <SceneRenderer sceneId={sceneId} />
      </div>
    </motion.div>
  );
};

export default TutorialScene;