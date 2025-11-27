import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useAuthStore } from './stores/authStore'
import { useOnboarding } from './hooks/useOnboarding'
import { OnboardingOverlay } from './components/Onboarding'
import './styles/cursor.css'

// Lazy load route components for better code splitting
const IslandOverview = lazy(() => import('./pages/IslandOverview'))
const IslandView = lazy(() => import('./pages/IslandView'))
const CuteDatabaseView = lazy(() => import('./pages/DatabaseView/CuteDatabaseView'))
const IslandCreator = lazy(() => import('./pages/IslandCreator'))
const AuthPage = lazy(() => import('./pages/Auth').then(module => ({ default: module.AuthPage })))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))

// Loading fallback component
const PageLoader = () => (
  <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-b from-sky-300 to-sky-100">
    <div className="text-center">
      <div className="text-6xl mb-4 animate-bounce">🏝️</div>
      <p className="text-xl font-medium text-gray-700">載入中...</p>
    </div>
  </div>
)

function App() {
  const { isAuthenticated } = useAuthStore()
  const {
    isOnboardingActive,
    currentStep,
    completeOnboarding
  } = useOnboarding()

  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Routes - 統一使用 AuthPage 組件 */}
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/" replace /> : <AuthPage />}
          />
          <Route
            path="/register"
            element={isAuthenticated ? <Navigate to="/" replace /> : <AuthPage />}
          />

          {/* Protected Routes - 需要登入才能訪問 */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <IslandOverview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/island/:islandId"
            element={
              <ProtectedRoute>
                <IslandView />
              </ProtectedRoute>
            }
          />
          {/*
            ⚠️ 重要：知識庫頁面統一使用 /database 路由
            請勿創建 /knowledge 或其他重複的知識庫路由！
            如需修改知識庫功能，請直接編輯 CuteDatabaseView 組件
          */}
          <Route
            path="/database"
            element={
              <ProtectedRoute>
                <CuteDatabaseView />
              </ProtectedRoute>
            }
          />
          {/*
            ⚠️ 重要：測試/開發頁面已移除
            請勿創建 /test、/demo 等測試路由！
            如需測試功能，請使用開發環境的獨立測試文件
          */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/island-creator"
            element={
              <ProtectedRoute>
                <IslandCreator />
              </ProtectedRoute>
            }
          />
          <Route
            path="/island-creator/:islandId"
            element={
              <ProtectedRoute>
                <IslandCreator />
              </ProtectedRoute>
            }
          />

          {/* Fallback - 未登入時重定向到登入頁，已登入則到首頁 */}
          <Route
            path="*"
            element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />}
          />
        </Routes>
      </Suspense>

      {/* 新手教學覆蓋層 - 強制完成 */}
      {isAuthenticated && isOnboardingActive && (
        <OnboardingOverlay
          currentStep={currentStep}
          onComplete={completeOnboarding}
        />
      )}
    </ErrorBoundary>
  )
}

export default App
