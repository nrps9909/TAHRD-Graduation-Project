import { motion } from 'framer-motion'
import { scenes } from '../data/scenes'
import { useGameStore } from '../store/gameStore'
import CodeChallenge from './CodeChallenge'
import InteractiveDemo from './InteractiveDemo'
import WSLSetupGuide from './WSLSetupGuide'
import InteractiveLesson from './InteractiveLesson'

interface SceneRendererProps {
  sceneId: string
}

const SceneRenderer = ({ sceneId }: SceneRendererProps) => {
  const { completeScene, navigateToScene } = useGameStore()
  const scene = scenes[sceneId]

  // Use InteractiveLesson for all tutorial scenes
  const useInteractiveMode = scene?.type === 'tutorial'

  if (!scene) {
    return (
      <div className="text-center text-retro-amber">
        <h2 className="text-2xl font-cute mb-4">Scene not found</h2>
        <button
          onClick={() => navigateToScene('intro')}
          className="retro-button"
        >
          Return to Start
        </button>
      </div>
    )
  }

  const handleSceneComplete = (score: number) => {
    completeScene(sceneId, score)
    if (scene.nextScene) {
      setTimeout(() => {
        navigateToScene(scene.nextScene!)
      }, 1500)
    }
  }

  // If it's a tutorial, use the interactive lesson component
  if (useInteractiveMode) {
    return <InteractiveLesson sceneId={sceneId} />
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col overflow-hidden"
    >
      <header className="mb-6 flex-shrink-0">
        <h2 className="text-3xl font-cute text-amber-500 mb-2">
          {scene.title}
        </h2>
        <p className="text-retro-cyan font-cute">{scene.description}</p>
      </header>

      <div className="flex-1 overflow-hidden">
        {false && (
          <div className="space-y-6">
            <div className="terminal-window">
              <h3 className="text-retro-amber font-pixel text-sm mb-4">
                INSTRUCTIONS
              </h3>
              <div className="space-y-2 text-terminal-text font-mono text-sm">
                {scene.content.instructions &&
                  scene.content.instructions.map(
                    (instruction: string, index: number) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start"
                      >
                        <span className="text-amber-500 mr-2">
                          {index + 1}.
                        </span>
                        <span>{instruction}</span>
                      </motion.div>
                    )
                  )}
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
                  {scene.content.tips &&
                    scene.content.tips.map((tip: string, index: number) => (
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

        {scene.type === ('setup' as any) && (
          <WSLSetupGuide content={scene.content} />
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
  )
}

export default SceneRenderer
