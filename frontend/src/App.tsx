import { Routes, Route, Navigate } from 'react-router-dom'
import IslandOverview from './pages/IslandOverview'
import IslandView from './pages/IslandView'
import CuteDatabaseView from './pages/DatabaseView/CuteDatabaseView'
import IslandCreator from './pages/IslandCreator'
import { AuthPage } from './pages/Auth'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuthStore } from './stores/authStore'
import { ProcessingQueuePanel } from './components/ProcessingQueuePanel'
import './styles/cursor.css'

function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <>
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
        path="/island/:assistantId"
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

    {/* 全局處理隊列面板 - 僅在已登入時顯示 */}
    {isAuthenticated && <ProcessingQueuePanel />}
    </>
  )
}

export default App
