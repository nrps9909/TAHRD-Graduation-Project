import { useState, lazy, Suspense, useMemo } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, MessageCircle, FolderOpen } from 'lucide-react'
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
const WorkspaceViewer = lazy(
  () => import('@/components/features/WorkspaceViewer')
)
const LearningPathSidebar = lazy(
  () => import('@/components/features/LearningPathSidebar')
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
  const { currentView, setCurrentView } = useViewStatePersistence('lesson')
  const {
    currentScene,
    playerName,
    selectedOS,
    completedScenes,
    navigateToScene,
  } = useGameStore()

  // Scroll persistence for each view
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

  const handleStartStage = (stageId?: string) => {
    // 獲取推薦的下一個場景
    const nextScene =
      stageId || LearningPathManager.getNextRecommendedScene(completedScenes)
    if (nextScene) {
      navigateToScene(nextScene)
      setCurrentView('lesson')
      setIsSidebarOpen(false) // 關閉側邊欄

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
    <div className="h-screen flex bg-bg-primary overflow-hidden max-h-screen">
      {/* 學習地圖側邊欄 - 只在當前課程頁面顯示 */}
      {currentView === 'lesson' && (
        <Suspense fallback={null}>
          <LearningPathSidebar
            isOpen={isSidebarOpen}
            onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
            onStartStage={handleStartStage}
            triggerFeedback={triggerFeedback}
          />
        </Suspense>
      )}

      <div className="flex-1 flex flex-col h-screen">
        <header className="border-b border-border-primary p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <h1 className="font-pixel text-text-primary font-semibold chinese-text">
                  萬中選一的AI Coding奇才
                </h1>
                <div className="flex bg-bg-tertiary rounded-lg p-1">
                  <button
                    onClick={() => setCurrentView('lesson')}
                    className={`px-3 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                      currentView === 'lesson'
                        ? 'bg-accent text-white'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                    }`}
                  >
                    <BookOpen size={12} />
                    當前課程
                  </button>
                  <button
                    onClick={() => setCurrentView('chat')}
                    className={`px-3 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                      currentView === 'chat'
                        ? 'bg-accent text-white'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                    }`}
                  >
                    <MessageCircle size={12} />
                    AI 助手
                  </button>
                  <button
                    onClick={() => setCurrentView('workspace')}
                    className={`px-3 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                      currentView === 'workspace'
                        ? 'bg-accent text-white'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
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
                <span className="px-2 py-1 bg-bg-tertiary text-text-primary rounded text-xs font-mono font-medium border border-border-primary">
                  {selectedOS === 'windows' ? '🪟 Windows' : '🍎 macOS'}
                </span>
              )}
              <ProgressBar />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          {currentView === 'lesson' && (
            <div className="flex h-full">
              {/* 主課程內容 */}
              <motion.div
                key={currentScene}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 h-full overflow-hidden flex flex-col"
                ref={lessonScrollProps.scrollElementRef}
              >
                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                  <div className="max-w-4xl mx-auto h-full">
                    <Suspense fallback={<LoadingScreen />}>
                      <SceneRenderer sceneId={currentScene} />
                    </Suspense>
                  </div>
                </div>
              </motion.div>

              {/* 右側終端機 */}
              <div className="hidden lg:flex w-[400px] xl:w-[450px] border-l border-border-primary h-full overflow-hidden bg-bg-secondary">
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
