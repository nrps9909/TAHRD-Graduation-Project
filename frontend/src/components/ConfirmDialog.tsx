interface ConfirmDialogProps {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  type?: 'danger' | 'warning' | 'info'
}

export default function ConfirmDialog({
  title,
  message,
  confirmText = '確定',
  cancelText = '取消',
  onConfirm,
  onCancel,
  type = 'warning',
}: ConfirmDialogProps) {
  const getStyles = () => {
    switch (type) {
      case 'danger':
        return {
          emoji: '🥺',
          confirmBg: 'linear-gradient(135deg, #FFB3B3, #FF8F8F)',
          confirmBorder: '#FF8F8F',
        }
      case 'warning':
        return {
          emoji: '⚠️',
          confirmBg: 'linear-gradient(135deg, #FFFACD, #FFE97F)',
          confirmBorder: '#FFE97F',
        }
      case 'info':
        return {
          emoji: '💡',
          confirmBg: 'linear-gradient(135deg, #B3D9FF, #8FC5FF)',
          confirmBorder: '#8FC5FF',
        }
    }
  }

  const styles = getStyles()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="relative w-full max-w-md rounded-3xl p-6 shadow-2xl animate-scale-in"
        style={{
          background: 'white',
          border: '3px solid #FFE5F0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 可愛的 emoji */}
        <div className="flex justify-center mb-4">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-5xl"
            style={{
              background: 'linear-gradient(135deg, #FFE5F0, #FFFACD)',
            }}
          >
            {styles.emoji}
          </div>
        </div>

        {/* 標題 */}
        <h3
          className="text-xl font-bold text-center mb-3"
          style={{ color: '#FF8FB3' }}
        >
          {title}
        </h3>

        {/* 訊息 */}
        <p
          className="text-center mb-6 leading-relaxed"
          style={{ color: '#666' }}
        >
          {message}
        </p>

        {/* 按鈕組 */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 rounded-xl font-bold transition-all hover:scale-105"
            style={{
              background: 'white',
              border: '2px solid #FFE5F0',
              color: '#999',
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 rounded-xl font-bold text-white transition-all hover:scale-105"
            style={{
              background: styles.confirmBg,
              border: `2px solid ${styles.confirmBorder}`,
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  )
}
