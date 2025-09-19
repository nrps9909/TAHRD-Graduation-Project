import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { scenes } from '../data/scenes';
import { useGameStore } from '../store/gameStore';
import CodeChallenge from './CodeChallenge';
import InteractiveDemo from './InteractiveDemo';

interface SceneRendererProps {
  sceneId: string;
}

const SceneRenderer = ({ sceneId }: SceneRendererProps) => {
  const { completeScene, navigateToScene } = useGameStore();
  const scene = scenes[sceneId];

  if (!scene) {
    return (
      <div className="text-center text-retro-amber">
        <h2 className="text-2xl font-pixel mb-4">Scene not found</h2>
        <button
          onClick={() => navigateToScene('tutorial-1')}
          className="retro-button"
        >
          Return to Start
        </button>
      </div>
    );
  }

  const handleSceneComplete = (score: number) => {
    completeScene(sceneId, score);
    if (scene.nextScene) {
      setTimeout(() => {
        navigateToScene(scene.nextScene!);
      }, 1500);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col"
    >
      <header className="mb-6">
        <h2 className="text-3xl font-pixel text-retro-green mb-2">
          {scene.title}
        </h2>
        <p className="text-retro-cyan font-mono">
          {scene.description}
        </p>
      </header>

      <div className="flex-1 overflow-y-auto">
        {scene.type === 'tutorial' && (
          <div className="space-y-6">
            <div className="terminal-window">
              <h3 className="text-retro-amber font-pixel text-sm mb-4">
                INSTRUCTIONS
              </h3>
              <div className="space-y-2 text-terminal-text font-mono text-sm">
                {scene.content.instructions.map((instruction, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start"
                  >
                    <span className="text-retro-green mr-2">{index + 1}.</span>
                    <span>{instruction}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {scene.content.example && (
              <div className="terminal-window">
                <h3 className="text-retro-amber font-pixel text-sm mb-4">
                  EXAMPLE
                </h3>
                <pre className="text-terminal-text font-mono text-sm overflow-x-auto">
                  {scene.content.example}
                </pre>
              </div>
            )}

            {scene.content.tips && (
              <div className="terminal-window bg-opacity-50">
                <h3 className="text-retro-cyan font-pixel text-sm mb-4">
                  💡 TIPS
                </h3>
                <ul className="space-y-1 text-terminal-text font-mono text-sm">
                  {scene.content.tips.map((tip, index) => (
                    <li key={index}>• {tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {scene.type === 'challenge' && (
          <CodeChallenge
            challenge={scene.content}
            onComplete={handleSceneComplete}
          />
        )}

        {scene.type === 'interactive' && (
          <InteractiveDemo
            demo={scene.content}
            onComplete={handleSceneComplete}
          />
        )}
      </div>

      <footer className="mt-6 flex justify-between">
        {scene.previousScene && (
          <button
            onClick={() => navigateToScene(scene.previousScene!)}
            className="retro-button text-sm"
          >
            ← PREVIOUS
          </button>
        )}
        {scene.nextScene && (
          <button
            onClick={() => handleSceneComplete(100)}
            className="retro-button text-sm ml-auto"
          >
            NEXT →
          </button>
        )}
      </footer>
    </motion.div>
  );
};

export default SceneRenderer;