import { useEffect } from 'react'
import { Z_INDEX_CLASSES } from '../constants/zIndex'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastProps {
  message: string
  type: ToastType
  duration?: number
  onClose: () => void
}

export default function Toast({ message, type, duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const getStyles = () => {
    switch (type) {
      case 'success':
        return {
          background: 'linear-gradient(135deg, #B3FFD9, #7FFFC5)',
          emoji: '✨',
          borderColor: '#7FFFC5',
        }
      case 'error':
        return {
          background: 'linear-gradient(135deg, #FFB3B3, #FF8F8F)',
          emoji: '😢',
          borderColor: '#FF8F8F',
        }
      case 'warning':
        return {
          background: 'linear-gradient(135deg, #FFFACD, #FFE97F)',
          emoji: '⚠️',
          borderColor: '#FFE97F',
        }
      case 'info':
        return {
          background: 'linear-gradient(135deg, #B3D9FF, #8FC5FF)',
          emoji: '💡',
          borderColor: '#8FC5FF',
        }
    }
  }

  const styles = getStyles()

  return (
    <div
      className={`fixed top-20 right-4 sm:right-6 ${Z_INDEX_CLASSES.TOAST} animate-slide-in-right`}
      style={{
        animation: 'slideInRight 0.3s ease-out',
      }}
    >
      <div
        className="flex items-center gap-3 px-5 py-3 rounded-2xl shadow-lg backdrop-blur-sm"
        style={{
          background: styles.background,
          border: `2px solid ${styles.borderColor}`,
          minWidth: '280px',
          maxWidth: '400px',
        }}
      >
        <span className="text-2xl flex-shrink-0">{styles.emoji}</span>
        <p className="text-sm font-bold flex-1" style={{ color: '#333' }}>
          {message}
        </p>
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 rounded-lg transition-all hover:bg-white/30"
          style={{ color: '#666' }}
        >
          ✕
        </button>
      </div>

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
