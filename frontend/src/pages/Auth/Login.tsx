import { useState, Suspense, lazy } from 'react'
import { useMutation, gql } from '@apollo/client'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../../stores/authStore'

// Lazy load Auth Island Scene component
const AuthIslandScene = lazy(() => import('../../components/AuthIslandScene'))

const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      user {
        id
        username
        displayName
        email
      }
    }
  }
`

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login: setAuth } = useAuthStore()

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [errors, setErrors] = useState<string[]>([])

  const [login, { loading }] = useMutation(LOGIN_MUTATION, {
    onCompleted: (data) => {
      // 儲存認證狀態到 Zustand store
      setAuth(data.login.token, data.login.user)

      // 導航到登入前嘗試訪問的頁面，或預設主頁
      const from = (location.state as any)?.from?.pathname || '/'
      navigate(from, { replace: true })
    },
    onError: (error) => {
      setErrors([error.message])
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors([])

    // 前端驗證
    const newErrors: string[] = []
    if (!formData.email) newErrors.push('請輸入電子郵件')
    if (!formData.password) newErrors.push('請輸入密碼')

    if (newErrors.length > 0) {
      setErrors(newErrors)
      return
    }

    await login({
      variables: {
        input: formData
      }
    })
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[38.2fr_61.8fr] grid-cols-1 bg-gradient-to-br from-pink-50 via-yellow-50 to-pink-100 relative overflow-hidden">
      {/* 背景裝飾 - 復古像素風格粒子 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              width: 8 + Math.random() * 16,
              height: 8 + Math.random() * 16,
              background: `linear-gradient(135deg, ${
                ['rgba(248, 187, 217, 0.3)', 'rgba(255, 234, 167, 0.3)', 'rgba(248, 143, 177, 0.3)'][Math.floor(Math.random() * 3)]
              }, transparent)`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              borderRadius: '2px'
            }}
            animate={{
              y: [0, Math.random() * 50 - 25],
              x: [0, Math.random() * 50 - 25],
              rotate: [0, 360],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{
              duration: Math.random() * 8 + 5,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />
        ))}
      </div>

      {/* 左側：登入表單 */}
      <motion.div
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col items-center justify-center p-6 lg:p-10 bg-white/80 backdrop-blur-md lg:rounded-r-3xl shadow-2xl border-r border-pink-200/30 z-10 order-2 lg:order-1"
      >
        <div className="w-full max-w-md">

          {/* Logo / Title */}
          <motion.div
            className="text-center mb-6"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}
          >
            <h1 className="text-2xl lg:text-3xl font-black mb-2 font-display bg-gradient-to-r from-pink-500 to-yellow-500 bg-clip-text text-transparent">
              🌸 心語小鎮 🌸
            </h1>
            <p className="text-gray-700 font-medium">歡迎回到療癒之旅</p>
          </motion.div>

          {/* Error Messages - 像素風格 */}
          {errors.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-4 p-3 bg-red-50/80 border-2 border-red-300 rounded-xl"
            >
              {errors.map((error, index) => (
                <p key={index} className="text-red-600 text-sm font-medium">⚠️ {error}</p>
              ))}
            </motion.div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-700">
                📧 電子郵件
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 bg-white/60 border-2 border-pink-200 rounded-xl focus:bg-white focus:border-pink-400 focus:outline-none transition-all font-medium"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2 text-gray-700">
                🔒 密碼
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                className="w-full px-4 py-3 bg-white/60 border-2 border-pink-200 rounded-xl focus:bg-white focus:border-pink-400 focus:outline-none transition-all font-medium"
                placeholder="••••••••"
                required
              />
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02, boxShadow: '0 8px 25px rgba(248, 187, 217, 0.5)' }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3.5 rounded-xl font-black text-white text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              style={{
                background: loading
                  ? 'linear-gradient(135deg, #CCC, #999)'
                  : 'linear-gradient(135deg, #F8BBD9, #FFEAA7)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  登入中...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  🚀 開始旅程
                </span>
              )}
            </motion.button>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 font-medium">
              還沒有帳號？
              <Link
                to="/register"
                className="ml-2 font-black bg-gradient-to-r from-pink-500 to-yellow-500 bg-clip-text text-transparent hover:from-pink-600 hover:to-yellow-600 transition-all"
              >
                立即註冊 ✨
              </Link>
            </p>
          </div>
        </div>
      </motion.div>

      {/* 右側：島嶼預覽 */}
      <motion.div
        initial={{ x: 50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="hidden lg:flex flex-col relative z-10 order-1 lg:order-2 overflow-hidden"
      >
        {/* 標題區域 - 浮在島嶼上方 */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="absolute top-8 left-0 right-0 text-center z-20 px-6"
        >
          <div className="backdrop-blur-md bg-white/20 rounded-3xl py-6 px-8 inline-block border border-white/30 shadow-xl">
            <h1 className="text-3xl lg:text-4xl xl:text-5xl font-black mb-3">
              <span className="bg-gradient-to-r from-pink-500 via-pink-400 to-yellow-400 bg-clip-text text-transparent drop-shadow-lg">
                探索心語小鎮
              </span>
            </h1>
            <p className="text-gray-800 text-lg lg:text-xl xl:text-2xl font-bold drop-shadow-md">
              你的療癒島嶼世界 🏝️✨
            </p>
          </div>
        </motion.div>

        {/* 島嶼 3D 預覽 */}
        <div className="w-full h-full relative">
          <Suspense
            fallback={
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-100 to-yellow-100">
                <div className="text-center">
                  <div className="text-6xl mb-4 animate-bounce">🏝️</div>
                  <div className="text-pink-600 text-lg font-medium animate-pulse">
                    載入島嶼中...
                  </div>
                </div>
              </div>
            }
          >
            <AuthIslandScene />
          </Suspense>
        </div>

      </motion.div>
    </div>
  )
}
