import { useState, Suspense, lazy, useEffect } from 'react'
import { useMutation, gql } from '@apollo/client'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../stores/authStore'

// Lazy load Auth Island Scene component - 延遲載入
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

const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
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

export default function AuthPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login: setAuth } = useAuthStore()

  // 從 URL 判斷初始模式
  const [isLogin, setIsLogin] = useState(location.pathname === '/login')

  // 延遲載入 3D 場景以優化初始渲染
  const [shouldLoadScene, setShouldLoadScene] = useState(false)

  useEffect(() => {
    // 表單渲染完成後才載入 3D 場景
    const timer = setTimeout(() => {
      setShouldLoadScene(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  })

  const [registerData, setRegisterData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  })

  const [errors, setErrors] = useState<string[]>([])

  const [login, { loading: loginLoading }] = useMutation(LOGIN_MUTATION, {
    onCompleted: (data) => {
      setAuth(data.login.token, data.login.user)
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/'
      navigate(from, { replace: true })
    },
    onError: (error) => {
      setErrors([error.message])
    }
  })

  const [register, { loading: registerLoading }] = useMutation(REGISTER_MUTATION, {
    onCompleted: (data) => {
      setAuth(data.register.token, data.register.user)
      navigate('/', { replace: true })
    },
    onError: (error) => {
      setErrors([error.message])
    }
  })

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors([])

    const newErrors: string[] = []
    if (!loginData.email) newErrors.push('請輸入電子郵件')
    if (!loginData.password) newErrors.push('請輸入密碼')

    if (newErrors.length > 0) {
      setErrors(newErrors)
      return
    }

    await login({
      variables: {
        input: loginData
      }
    })
  }

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors([])

    const newErrors: string[] = []
    if (!registerData.username) newErrors.push('請輸入使用者名稱')
    else if (registerData.username.length < 3) newErrors.push('使用者名稱至少需要 3 個字元')

    if (!registerData.email) newErrors.push('請輸入電子郵件')
    else if (!registerData.email.includes('@')) newErrors.push('請輸入有效的電子郵件')

    if (!registerData.password) newErrors.push('請輸入密碼')
    else if (registerData.password.length < 6) newErrors.push('密碼至少需要 6 個字元')

    if (registerData.password !== registerData.confirmPassword) {
      newErrors.push('密碼確認不符')
    }

    if (newErrors.length > 0) {
      setErrors(newErrors)
      return
    }

    await register({
      variables: {
        input: {
          username: registerData.username,
          email: registerData.email,
          password: registerData.password,
          displayName: registerData.displayName || registerData.username
        }
      }
    })
  }

  const switchMode = () => {
    setErrors([])
    setIsLogin(!isLogin)
    navigate(isLogin ? '/register' : '/login', { replace: true })
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[38.2fr_61.8fr] grid-cols-1 bg-gradient-to-br from-indigo-950 via-purple-950 to-blue-950 relative overflow-hidden">
      {/* 背景裝飾 - 動物森友會風格星星 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* 月亮 */}
        <motion.div
          className="absolute top-10 right-10 lg:right-20"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
        >
          <div className="relative w-20 h-20 lg:w-28 lg:h-28">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-200 to-yellow-400 shadow-2xl shadow-yellow-400/50" />
            <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-yellow-300/30" />
            <div className="absolute top-8 left-8 w-5 h-5 rounded-full bg-yellow-300/20" />
          </div>
        </motion.div>

        {/* 星星 */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0.4, 1, 0.4],
              scale: [0.9, 1.1, 0.9]
            }}
            transition={{
              duration: 3 + i * 0.3,
              repeat: Infinity,
              delay: i * 0.2,
              ease: 'easeInOut'
            }}
          >
            <div className="text-yellow-200" style={{ fontSize: 10 + (i % 3) * 4 }}>
              ⭐
            </div>
          </motion.div>
        ))}
      </div>

      {/* 左側：表單區域 */}
      <motion.div
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col items-center justify-center p-6 lg:p-10 bg-gradient-to-br from-indigo-900/70 via-purple-900/70 to-blue-900/70 backdrop-blur-xl lg:rounded-r-3xl shadow-2xl border-r border-yellow-400/20 z-10 order-2 lg:order-1"
      >
        <div className="w-full max-w-md">

          {/* Logo / Title */}
          <motion.div
            className="text-center mb-6"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}
          >
            <h1 className="text-2xl lg:text-3xl font-black mb-2 font-display bg-gradient-to-r from-yellow-300 via-orange-400 to-yellow-300 bg-clip-text text-transparent drop-shadow-lg">
              {isLogin ? '🌙 心語小鎮 🌙' : '✨ 加入我們 ✨'}
            </h1>
            <p className="text-yellow-100 font-medium text-base lg:text-lg">
              {isLogin ? '歡迎回到療癒之旅' : '開始你的療癒之旅'}
            </p>
          </motion.div>

          {/* Error Messages */}
          {errors.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-4 p-3 bg-red-500/20 border-2 border-red-400 rounded-xl backdrop-blur-sm"
            >
              {errors.map((error, index) => (
                <p key={index} className="text-red-200 text-sm font-bold">⚠️ {error}</p>
              ))}
            </motion.div>
          )}

          {/* Forms with AnimatePresence for smooth transitions */}
          <AnimatePresence mode="wait">
            {isLogin ? (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleLoginSubmit}
                className="space-y-5"
              >
                <div>
                  <label className="block text-sm font-bold mb-2 text-yellow-200 text-base">
                    📧 電子郵件
                  </label>
                  <input
                    type="email"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    className="w-full px-4 py-4 text-base bg-indigo-800/50 border-2 border-yellow-400/40 rounded-xl focus:bg-indigo-800/70 focus:border-yellow-400 focus:outline-none transition-all font-medium text-white placeholder:text-indigo-300"
                    placeholder="your@email.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 text-yellow-200 text-base">
                    🔒 密碼
                  </label>
                  <input
                    type="password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleLoginSubmit(e)}
                    className="w-full px-4 py-4 text-base bg-indigo-800/50 border-2 border-yellow-400/40 rounded-xl focus:bg-indigo-800/70 focus:border-yellow-400 focus:outline-none transition-all font-medium text-white placeholder:text-indigo-300"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <motion.button
                  type="submit"
                  disabled={loginLoading}
                  whileHover={{ scale: 1.02, boxShadow: '0 8px 25px rgba(251, 191, 36, 0.5)' }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3.5 rounded-xl font-black text-indigo-950 text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  style={{
                    background: loginLoading
                      ? 'linear-gradient(135deg, #94a3b8, #64748b)'
                      : 'linear-gradient(135deg, #fbbf24, #f59e0b, #fbbf24)',
                  }}
                >
                  {loginLoading ? (
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
              </motion.form>
            ) : (
              <motion.form
                key="register"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleRegisterSubmit}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-bold mb-2 text-yellow-200 text-base">
                    👤 使用者名稱 *
                  </label>
                  <input
                    type="text"
                    value={registerData.username}
                    onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                    className="w-full px-4 py-4 text-base bg-indigo-800/50 border-2 border-yellow-400/40 rounded-xl focus:bg-indigo-800/70 focus:border-yellow-400 focus:outline-none transition-all font-medium text-white placeholder:text-indigo-300"
                    placeholder="你的獨特名稱"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 text-yellow-200 text-base">
                    📧 電子郵件 *
                  </label>
                  <input
                    type="email"
                    value={registerData.email}
                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                    className="w-full px-4 py-4 text-base bg-indigo-800/50 border-2 border-yellow-400/40 rounded-xl focus:bg-indigo-800/70 focus:border-yellow-400 focus:outline-none transition-all font-medium text-white placeholder:text-indigo-300"
                    placeholder="your@email.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 text-yellow-200 text-base">
                    🎭 顯示名稱
                  </label>
                  <input
                    type="text"
                    value={registerData.displayName}
                    onChange={(e) => setRegisterData({ ...registerData, displayName: e.target.value })}
                    className="w-full px-4 py-4 text-base bg-indigo-800/50 border-2 border-yellow-400/40 rounded-xl focus:bg-indigo-800/70 focus:border-yellow-400 focus:outline-none transition-all font-medium text-white placeholder:text-indigo-300"
                    placeholder="其他人看到的名字"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 text-yellow-200 text-base">
                    🔒 密碼 *
                  </label>
                  <input
                    type="password"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    className="w-full px-4 py-4 text-base bg-indigo-800/50 border-2 border-yellow-400/40 rounded-xl focus:bg-indigo-800/70 focus:border-yellow-400 focus:outline-none transition-all font-medium text-white placeholder:text-indigo-300"
                    placeholder="至少 6 個字元"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 text-yellow-200 text-base">
                    🔐 確認密碼 *
                  </label>
                  <input
                    type="password"
                    value={registerData.confirmPassword}
                    onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleRegisterSubmit(e)}
                    className="w-full px-4 py-4 text-base bg-indigo-800/50 border-2 border-yellow-400/40 rounded-xl focus:bg-indigo-800/70 focus:border-yellow-400 focus:outline-none transition-all font-medium text-white placeholder:text-indigo-300"
                    placeholder="再次輸入密碼"
                    required
                  />
                </div>

                <motion.button
                  type="submit"
                  disabled={registerLoading}
                  whileHover={{ scale: 1.02, boxShadow: '0 8px 25px rgba(251, 191, 36, 0.5)' }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3.5 rounded-xl font-black text-indigo-950 text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg mt-2"
                  style={{
                    background: registerLoading
                      ? 'linear-gradient(135deg, #94a3b8, #64748b)'
                      : 'linear-gradient(135deg, #fbbf24, #f59e0b, #fbbf24)',
                  }}
                >
                  {registerLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      註冊中...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      🌟 創建帳號
                    </span>
                  )}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Toggle Link */}
          <div className="mt-6 text-center">
            <p className="text-yellow-100 font-medium text-base">
              {isLogin ? '還沒有帳號？' : '已經有帳號了？'}
              <button
                onClick={switchMode}
                className="ml-2 font-black bg-gradient-to-r from-yellow-300 via-orange-400 to-yellow-300 bg-clip-text text-transparent hover:from-yellow-400 hover:to-orange-500 transition-all"
              >
                {isLogin ? '立即註冊 ✨' : '立即登入 🚀'}
              </button>
            </p>
          </div>
        </div>
      </motion.div>

      {/* 右側：島嶼預覽 - 保持不變 */}
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
                {isLogin ? '探索心語小鎮' : '建立專屬島嶼'}
              </span>
            </h1>
            <p className="text-gray-800 text-lg lg:text-xl xl:text-2xl font-bold drop-shadow-md">
              {isLogin ? '你的療癒島嶼世界 🏝️✨' : '開始你的療癒之旅 🌸✨'}
            </p>
          </div>
        </motion.div>

        {/* 島嶼 3D 預覽 - 延遲載入優化 */}
        <div className="w-full h-full relative">
          {shouldLoadScene ? (
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
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-100 to-yellow-100">
              <div className="text-center">
                <div className="text-6xl mb-4">🏝️</div>
                <div className="text-pink-600 text-lg font-medium">
                  準備中...
                </div>
              </div>
            </div>
          )}
        </div>

      </motion.div>
    </div>
  )
}
