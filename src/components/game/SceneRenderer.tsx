import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { scenes } from '@/data/scenes'
import { claudeCodeScenes } from '@/data/claudeCodeScenes'
import { useGameStore } from '@/store/gameStore'
import CodeChallenge from '@/components/features/CodeChallenge'
import InteractiveDemo from '@/components/features/InteractiveDemo'
import WSLSetupGuide from '@/components/features/WSLSetupGuide'
import InteractiveLesson from '@/components/features/InteractiveLesson'
import MissionPage from '@/components/features/MissionPage'

interface SceneRendererProps {
  sceneId: string
}

const SceneRenderer = ({ sceneId }: SceneRendererProps) => {
  const navigate = useNavigate()
  const { completeScene, navigateToScene } = useGameStore()

  // 檢查是否為 Claude Code Adventure 場景
  const isClaudeCodeScene = sceneId.startsWith('cc-')
  const claudeScene = isClaudeCodeScene ? claudeCodeScenes[sceneId] : null
  const scene = isClaudeCodeScene ? null : scenes[sceneId]

  // 如果是 Claude Code 場景，使用 MissionPage 渲染
  if (isClaudeCodeScene && claudeScene) {
    const handleComplete = (score: number) => {
      completeScene(sceneId, score)
    }

    return (
      <MissionPage
        scene={claudeScene}
        onComplete={handleComplete}
        {...(claudeScene.nextScene && {
          onNext: () => navigate(`/tutorial/${claudeScene.nextScene}`),
        })}
        {...(claudeScene.previousScene && {
          onPrevious: () => navigate(`/tutorial/${claudeScene.previousScene}`),
        })}
      />
    )
  }

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
        {scene.type === 'challenge' && (
          <CodeChallenge
            challenge={scene.content as { task: string; code?: string; solution: string; hints: string[]; requirements?: string[]; starter?: string }}
            onComplete={handleSceneComplete}
          />
        )}

        {scene.type === 'interactive' && (
          <InteractiveDemo
            demo={scene.content as { steps: string[]; expectedCommands: string[] }}
            onComplete={handleSceneComplete}
          />
        )}

        {scene.type === ('setup' as string) && (
          <WSLSetupGuide content={scene.content as { instructions: string[]; commands: { title: string; steps: string[]; description: string }[]; tips: string[] }} />
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
