import { useState, lazy, Suspense, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Map, BookOpen, MessageCircle, FolderOpen } from 'lucide-react'
import Sidebar from './Sidebar'
import ProgressBar from './ProgressBar'
import LoadingScreen from '@/components/core/LoadingScreen'
import { useGameStore } from '@/store/gameStore'
import { LearningPathManager } from '@/data/unifiedLearningPath'
import { Achievement } from '@/components/ui/AchievementNotification'
import {
  useViewStatePersistence,
  useScrollPersistence,
} from '@/hooks/usePageStatePersistence'

// Lazy load heavy components
const GeminiCLI = lazy(() => import('@/components/features/GeminiCLI'))
const SceneRenderer = lazy(() => import('./SceneRenderer'))
const LearningPathMap = lazy(
  () => import('@/components/features/LearningPathMap')
)
const WorkspaceViewer = lazy(
  () => import('@/components/features/WorkspaceViewer')
)

interface TriggerFeedback {
  showPoints: (points: number, position?: { x: number; y: number }) => void
  showProgress: (message: string, position?: { x: number; y: number }) => void
  showSkill: (skillName: string, position?: { x: number; y: number }) => void
  showEncouragement: (
    message: string,
    position?: { x: number; y: number }
  ) => void
  showCombo: (count: number, position?: { x: number; y: number }) => void
  showPerfect: (message?: string, position?: { x: number; y: number }) => void
  showAchievement: (achievement: Achievement) => void
}

interface GameLayoutProps {
  triggerFeedback: TriggerFeedback
}

const GameLayout: React.FC<GameLayoutProps> = ({ triggerFeedback }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { currentView, setCurrentView } = useViewStatePersistence('map')
  const {
    currentScene,
    playerName,
    selectedOS,
    completedScenes,
    navigateToScene,
  } = useGameStore()

  // Scroll persistence for each view
  const mapScrollProps = useScrollPersistence('learning-map')
  const lessonScrollProps = useScrollPersistence('lesson-view')
  const chatScrollProps = useScrollPersistence('chat-view')
  const workspaceScrollProps = useScrollPersistence('workspace-view')

  // Create a single shared GeminiCLI instance that persists across view changes
  const sharedGeminiCLI = useMemo(
    () => (
      <Suspense fallback={<LoadingScreen />}>
        <GeminiCLI triggerFeedback={triggerFeedback} />
      </Suspense>
    ),
    [triggerFeedback]
  )

  const handleStartStage = () => {
    // 獲取推薦的下一個場景
    const nextScene =
      LearningPathManager.getNextRecommendedScene(completedScenes)
    if (nextScene) {
      navigateToScene(nextScene)
      setCurrentView('lesson')

      // 即時回饋 - 開始新階段
      triggerFeedback.showProgress('🎯 開始新的學習階段！', {
        x: window.innerWidth / 2,
        y: 100,
      })
      triggerFeedback.showEncouragement('準備好迎接新挑戰了嗎？', {
        x: window.innerWidth / 2,
        y: 150,
      })
    }
  }

  return (
    <div className="h-screen flex bg-retro-bg overflow-hidden max-h-screen">
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <div className="flex-1 flex flex-col h-screen">
        <header className="border-b border-rose-300/50 p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="text-text-primary hover:text-rose-400 transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
              <div className="flex items-center gap-2">
                <h1 className="font-pixel text-text-primary font-semibold chinese-text">
                  🚀 AI 程式設計大師之路
                </h1>
                <div className="flex bg-pink-100/30 backdrop-blur rounded-lg p-1">
                  <button
                    onClick={() => setCurrentView('map')}
                    className={`px-3 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                      currentView === 'map'
                        ? 'bg-pink-200 text-pink-700'
                        : 'text-pink-500 hover:text-pink-700 hover:bg-pink-100/60'
                    }`}
                  >
                    <Map size={12} />
                    學習地圖
                  </button>
                  <button
                    onClick={() => setCurrentView('lesson')}
                    className={`px-3 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                      currentView === 'lesson'
                        ? 'bg-pink-200 text-pink-700'
                        : 'text-pink-500 hover:text-pink-700 hover:bg-pink-100/60'
                    }`}
                  >
                    <BookOpen size={12} />
                    當前課程
                  </button>
                  <button
                    onClick={() => setCurrentView('chat')}
                    className={`px-3 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                      currentView === 'chat'
                        ? 'bg-pink-200 text-pink-700'
                        : 'text-pink-500 hover:text-pink-700 hover:bg-pink-100/60'
                    }`}
                  >
                    <MessageCircle size={12} />
                    AI 助手
                  </button>
                  <button
                    onClick={() => setCurrentView('workspace')}
                    className={`px-3 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                      currentView === 'workspace'
                        ? 'bg-pink-200 text-pink-700'
                        : 'text-pink-500 hover:text-pink-700 hover:bg-pink-100/60'
                    }`}
                  >
                    <FolderOpen size={12} />
                    工作區檔案
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-mono text-text-secondary text-sm font-medium chinese-text">
                {playerName}
              </span>
              {selectedOS && (
                <span className="px-2 py-1 bg-yellow-100 text-amber-700 rounded text-xs font-mono font-medium">
                  {selectedOS === 'windows' ? '🪟 Windows' : '🍎 macOS'}
                </span>
              )}
              <ProgressBar />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          {currentView === 'map' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-full overflow-hidden p-4"
              ref={mapScrollProps.scrollElementRef}
            >
              <Suspense fallback={<LoadingScreen />}>
                <LearningPathMap
                  onStartStage={handleStartStage}
                  triggerFeedback={triggerFeedback}
                />
              </Suspense>
            </motion.div>
          )}

          {currentView === 'lesson' && (
            <div className="flex h-full">
              <motion.div
                key={currentScene}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 p-6 overflow-hidden"
                ref={lessonScrollProps.scrollElementRef}
              >
                <Suspense fallback={<LoadingScreen />}>
                  <SceneRenderer sceneId={currentScene} />
                </Suspense>
              </motion.div>

              <div className="w-2/5 min-w-[360px] max-w-[500px] border-l border-cat-orange h-full overflow-hidden">
                {sharedGeminiCLI}
              </div>
            </div>
          )}

          {currentView === 'chat' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="h-full"
              ref={chatScrollProps.scrollElementRef}
            >
              {sharedGeminiCLI}
            </motion.div>
          )}

          {currentView === 'workspace' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-full"
              ref={workspaceScrollProps.scrollElementRef}
            >
              <Suspense fallback={<LoadingScreen />}>
                <WorkspaceViewer embedded={true} />
              </Suspense>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

export default GameLayout
