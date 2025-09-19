import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Suspense, useState, lazy } from 'react';
import { LoadingScreen, ErrorBoundary, InstantFeedback, AchievementNotification } from './components';
import { useInstantFeedback } from './components/ui/InstantFeedback';
import { type Achievement } from './components/ui/AchievementNotification';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

// Lazy load heavy components
const IntroScreen = lazy(() => import('./components/features/IntroScreen'));
const OSSelection = lazy(() => import('./components/features/OSSelection'));
const GameLayout = lazy(() => import('./components/game/GameLayout'));
const TutorialScene = lazy(() => import('./components/game/TutorialScene'));
const CompletionScreen = lazy(() => import('./components/features/CompletionScreen'));

function AppContent() {
  useKeyboardShortcuts();
  const feedbackSystem = useInstantFeedback();
  const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null);
  const [showAchievement, setShowAchievement] = useState(false);

  // 全域回饋系統 - 提供給所有組件使用
  const triggerFeedback = {
    showPoints: (points: number, position?: { x: number; y: number }) => {
      feedbackSystem.showPoints(points, position);
    },
    showProgress: (message: string, position?: { x: number; y: number }) => {
      feedbackSystem.showProgress(message, position);
    },
    showSkill: (skillName: string, position?: { x: number; y: number }) => {
      feedbackSystem.showSkill(skillName, position);
    },
    showEncouragement: (message: string, position?: { x: number; y: number }) => {
      feedbackSystem.showEncouragement(message, position);
    },
    showCombo: (count: number, position?: { x: number; y: number }) => {
      feedbackSystem.showCombo(count, position);
    },
    showPerfect: (message?: string, position?: { x: number; y: number }) => {
      feedbackSystem.showPerfect(message, position);
    },
    showAchievement: (achievement: Achievement) => {
      setCurrentAchievement(achievement);
      setShowAchievement(true);
    }
  };

  return (
    <div className="min-h-screen bg-retro-bg font-display">
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<IntroScreen triggerFeedback={triggerFeedback} />} />
          <Route path="/os-selection" element={<OSSelection triggerFeedback={triggerFeedback} />} />
          <Route path="/game" element={<GameLayout triggerFeedback={triggerFeedback} />} />
          <Route path="/tutorial/:sceneId" element={<TutorialScene triggerFeedback={triggerFeedback} />} />
          <Route path="/complete" element={<CompletionScreen triggerFeedback={triggerFeedback} />} />
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
            setShowAchievement(false);
            setCurrentAchievement(null);
          }}
        />
      )}
    </div>
  );
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
  );
}

export default App;