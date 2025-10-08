import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuthStore()
  const location = useLocation()

  if (!isAuthenticated) {
    // 保存用戶試圖訪問的位置，以便登入後重定向
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
