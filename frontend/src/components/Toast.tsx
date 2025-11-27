import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

// Export ToastType for backward compatibility with useToast hook
export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastData {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
  warning: (message: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastData[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
    const id = String(Date.now()) + '-' + Math.random().toString(36).slice(2)
    const toastData: ToastData = { id, message, type, duration }

    setToasts(prev => [...prev, toastData])

    if (duration > 0) {
      setTimeout(() => removeToast(id), duration)
    }
  }, [removeToast])

  const success = useCallback((message: string) => showToast(message, 'success'), [showToast])
  const error = useCallback((message: string) => showToast(message, 'error', 5000), [showToast])
  const info = useCallback((message: string) => showToast(message, 'info'), [showToast])
  const warning = useCallback((message: string) => showToast(message, 'warning', 4000), [showToast])

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-800'
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800'
    }
  }

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return '✅'
      case 'error':
        return '❌'
      case 'warning':
        return '⚠️'
      default:
        return 'ℹ️'
    }
  }

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
      {children}

      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-[90vw] sm:max-w-sm">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`px-4 py-3 rounded-xl border-2 shadow-lg ${getToastStyles(toast.type)} flex items-start gap-2`}
              role="alert"
            >
              <span className="text-lg flex-shrink-0">{getIcon(toast.type)}</span>
              <p className="text-sm font-medium flex-1 whitespace-pre-line">{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-current opacity-60 hover:opacity-100 transition-opacity flex-shrink-0"
                aria-label="關閉提示"
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

// Simple Toast component for backward compatibility (used by CuteDatabaseView)
interface SimpleToastProps {
  message: string
  type: ToastType
  onClose: () => void
}

export function Toast({ message, type, onClose }: SimpleToastProps) {
  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-800'
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800'
    }
  }

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅'
      case 'error':
        return '❌'
      case 'warning':
        return '⚠️'
      default:
        return 'ℹ️'
    }
  }

  // Auto-dismiss after 3 seconds
  useEffect(() => {
    const timer = setTimeout(onClose, type === 'error' ? 5000 : 3000)
    return () => clearTimeout(timer)
  }, [onClose, type])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`fixed bottom-4 right-4 z-[9999] px-4 py-3 rounded-xl border-2 shadow-lg ${getStyles()} flex items-start gap-2 max-w-[90vw] sm:max-w-sm`}
      role="alert"
    >
      <span className="text-lg flex-shrink-0">{getIcon()}</span>
      <p className="text-sm font-medium flex-1 whitespace-pre-line">{message}</p>
      <button
        onClick={onClose}
        className="text-current opacity-60 hover:opacity-100 transition-opacity flex-shrink-0"
        aria-label="關閉提示"
      >
        ✕
      </button>
    </motion.div>
  )
}

export default Toast
