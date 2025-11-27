import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Error Boundary - 捕獲子組件錯誤，防止整個應用崩潰
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xl max-w-md w-full text-center border-2 border-amber-200">
            <div className="text-6xl mb-4">😿</div>
            <h2 className="text-xl font-bold text-amber-900 mb-2">
              哎呀，出了點問題
            </h2>
            <p className="text-amber-700 mb-4 text-sm">
              應用程式遇到了意外錯誤，請嘗試重新載入頁面。
            </p>
            {this.state.error && (
              <details className="text-left mb-4 p-3 bg-amber-50 rounded-lg">
                <summary className="text-xs text-amber-600 cursor-pointer font-medium">
                  技術詳情
                </summary>
                <pre className="text-xs text-red-600 mt-2 overflow-auto max-h-32 whitespace-pre-wrap">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-xl font-medium transition-colors"
              >
                重試
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-white rounded-xl font-medium transition-colors"
              >
                重新載入
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
