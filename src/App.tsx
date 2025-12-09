import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
} from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Suspense, useState, lazy } from 'react'
import {
  LoadingScreen,
  ErrorBoundary,
  InstantFeedback,
  AchievementNotification,
} from './components'
import { useInstantFeedback } from './components/ui/InstantFeedback'
import { type Achievement } from './components/ui/AchievementNotification'

// Lazy load components
const AdventureMap = lazy(() => import('./components/features/AdventureMap'))
const Playground = lazy(() => import('./components/features/Playground'))
const TutorialScene = lazy(() => import('./components/game/TutorialScene'))
const CompletionScreen = lazy(
  () => import('./components/features/CompletionScreen')
)

// AdventureMap Wrapper - 處理導航
function AdventureMapWrapper() {
  const navigate = useNavigate()

  const handleStartLevel = (_levelId: string, firstSceneId: string) => {
    navigate(`/tutorial/${firstSceneId}`)
  }

  return <AdventureMap onStartLevel={handleStartLevel} />
}

function AppContent() {
  const feedbackSystem = useInstantFeedback()
  const [currentAchievement, setCurrentAchievement] =
    useState<Achievement | null>(null)
  const [showAchievement, setShowAchievement] = useState(false)

  // 全域回饋系統
  const triggerFeedback = {
    showPoints: (points: number, position?: { x: number; y: number }) => {
      feedbackSystem.showPoints(points, position)
    },
    showProgress: (message: string, position?: { x: number; y: number }) => {
      feedbackSystem.showProgress(message, position)
    },
    showSkill: (skillName: string, position?: { x: number; y: number }) => {
      feedbackSystem.showSkill(skillName, position)
    },
    showEncouragement: (
      message: string,
      position?: { x: number; y: number }
    ) => {
      feedbackSystem.showEncouragement(message, position)
    },
    showCombo: (count: number, position?: { x: number; y: number }) => {
      feedbackSystem.showCombo(count, position)
    },
    showPerfect: (message?: string, position?: { x: number; y: number }) => {
      feedbackSystem.showPerfect(message, position)
    },
    showAchievement: (achievement: Achievement) => {
      setCurrentAchievement(achievement)
      setShowAchievement(true)
    },
  }

  return (
    <div className="min-h-screen bg-bg-primary font-sans">
      <AnimatePresence mode="wait">
        <Routes>
          {/* 首頁 - 冒險地圖 */}
          <Route path="/" element={<AdventureMapWrapper />} />

          {/* Playground - 模擬體驗 */}
          <Route path="/playground" element={<Playground />} />

          {/* 教學場景 */}
          <Route
            path="/tutorial/:sceneId"
            element={<TutorialScene triggerFeedback={triggerFeedback} />}
          />

          {/* 完成畫面 */}
          <Route
            path="/complete"
            element={<CompletionScreen triggerFeedback={triggerFeedback} />}
          />
        </Routes>
      </AnimatePresence>

      {/* 即時回饋系統 */}
      <InstantFeedback
        feedbacks={feedbackSystem.feedbacks}
        onFeedbackComplete={feedbackSystem.removeFeedback}
      />

      {/* 成就通知系統 */}
      {currentAchievement && (
        <AchievementNotification
          achievement={currentAchievement}
          show={showAchievement}
          onClose={() => {
            setShowAchievement(false)
            setCurrentAchievement(null)
          }}
        />
      )}
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Suspense fallback={<LoadingScreen />}>
          <AppContent />
        </Suspense>
      </Router>
    </ErrorBoundary>
  )
}

export default App
