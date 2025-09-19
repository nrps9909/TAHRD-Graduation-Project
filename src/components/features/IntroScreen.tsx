import { useState, useEffect, Suspense, lazy } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'
import { apiService } from '../services/api.service'
import { APP_CONFIG } from '../config/app.config'

// Lazy load Live2D component
const Live2DPixi6 = lazy(() => import('./Live2DPixi6'))

interface IntroScreenProps {
  triggerFeedback?: (
    message: string,
    type: 'success' | 'error' | 'info'
  ) => void
}

const IntroScreen = ({}: IntroScreenProps) => {
  const navigate = useNavigate()
  const { startGame, setOS } = useGameStore()
  const [userCount, setUserCount] = useState(0)
  const [loading, setLoading] = useState(false)

  // 清除舊的持久化狀態，確保顯示新UI
  const [introState, setIntroState] = useState({
    showAuthOptions: false, // 設為false以顯示主頁面（左邊貓咪右邊登入）
    authMode: 'login',
    playerName: '',
    email: '',
    password: '',
    error: '',
  })

  useEffect(() => {
    const fetchUserCount = async () => {
      try {
        const response = await apiService.getUserCount()
        if (response.success && response.data) {
          setUserCount(response.data.count)
        } else {
          // 如果無法獲取真實數據，使用一個合理的初始值
          setUserCount(1234)
        }
      } catch (error) {
        console.error('Failed to fetch user count:', error)
        // 網路錯誤時使用備用值
        setUserCount(1234)
      }
    }
    fetchUserCount()
  }, [])

  const handleLogin = async () => {
    if (!introState.email.trim() || !introState.password.trim()) {
      setIntroState(prev => ({ ...prev, error: '請填寫電子郵件和密碼' }))
      return
    }

    setLoading(true)
    setIntroState(prev => ({ ...prev, error: '' }))

    console.log('Attempting login with:', {
      email: introState.email,
      passwordLength: introState.password.length,
    })

    const response = await apiService.login(
      introState.email,
      introState.password
    )

    console.log('Login response:', response)

    if (response.success && response.data) {
      startGame(response.data.user.nickname || '學習者')
      setOS('windows')
      navigate('/game')
    } else {
      const errorMessage = response.message || response.error
      console.error('Login failed:', errorMessage)
      setIntroState(prev => ({ ...prev, error: errorMessage || '登入失敗' }))
    }
    setLoading(false)
  }

  const handleRegister = async () => {
    if (
      !introState.playerName.trim() ||
      !introState.email.trim() ||
      !introState.password.trim()
    ) {
      setIntroState(prev => ({ ...prev, error: '請填寫所有欄位' }))
      return
    }

    setLoading(true)
    setIntroState(prev => ({ ...prev, error: '' }))

    console.log('Attempting registration with:', {
      nickname: introState.playerName,
      email: introState.email,
      passwordLength: introState.password.length,
    })

    const response = await apiService.register(
      introState.playerName,
      introState.email,
      introState.password
    )

    console.log('Registration response:', response)

    if (response.success && response.data) {
      // 註冊成功後更新用戶數量
      setUserCount(prev => prev + 1)
      startGame(response.data.user.nickname || introState.playerName.trim())
      setOS('windows')
      navigate('/game')
    } else {
      const errorMessage = response.message || response.error
      console.error('Registration failed:', errorMessage)
      setIntroState(prev => ({ ...prev, error: errorMessage || '註冊失敗' }))
    }
    setLoading(false)
  }

  const handleAuth = () => {
    if (introState.authMode === 'login') {
      handleLogin()
    } else {
      handleRegister()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full h-screen bg-gradient-to-br from-pink-100 via-yellow-50 to-pink-50 relative overflow-hidden"
    >
      {/* 背景裝飾 - 寶寶粉和鵝黃色調 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-pink-200/30 to-yellow-200/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-yellow-200/30 to-pink-200/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-yellow-100/20 to-pink-100/20 rounded-full blur-3xl"></div>
      </div>

      {/* 主要內容容器 - 現代響應式設計，100vh 完美適配 */}
      <div className="relative h-screen flex items-center justify-center">
        <div className="w-full h-full max-w-none mx-auto flex items-center justify-center">
          {/* 主介紹頁面：左右兩欄佈局 - 黃金比例 1:1.618，使用 CSS Grid */}
          <div className="w-full h-full grid lg:grid-cols-[38.2fr_61.8fr] grid-cols-1 lg:grid-rows-1 grid-rows-[auto_1fr] gap-0">
            {/* 左側：登入/註冊區域 - 黃金比例的較小部分 (38.2%) */}
            <motion.div
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col items-center justify-center h-full w-full bg-gradient-to-br from-white/80 via-pink-50/80 to-yellow-50/80 backdrop-blur-md lg:rounded-none lg:rounded-r-3xl p-4 sm:p-6 md:p-8 lg:p-6 xl:p-8 2xl:p-10 shadow-2xl border-r border-pink-200/30 lg:border-none lg:shadow-none order-2 lg:order-1"
            >
              {/* 登入標題 */}
              <div className="text-center mb-4 sm:mb-6 lg:mb-8 w-full max-w-sm">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.5 }}
                  className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 lg:w-18 lg:h-18 xl:w-20 xl:h-20 bg-gradient-to-br from-pink-400 to-yellow-400 rounded-full mb-3 lg:mb-4 shadow-2xl"
                >
                  <span className="text-2xl sm:text-3xl lg:text-3xl xl:text-4xl">
                    🚀
                  </span>
                </motion.div>
                <h2 className="text-lg sm:text-xl lg:text-xl xl:text-2xl font-bold text-gray-800 mb-1 sm:mb-2">
                  歡迎來到 AI 編程世界
                </h2>
                <p className="text-sm lg:text-sm xl:text-base text-gray-600">
                  登入開始你的學習之旅
                </p>
              </div>

              {/* 表單容器 */}
              <div className="w-full max-w-sm lg:max-w-md space-y-3 sm:space-y-4 lg:space-y-5">
                {/* 標籤切換 */}
                <div className="flex p-1 bg-white/70 backdrop-blur rounded-2xl shadow-lg border border-pink-200/40">
                  <button
                    onClick={() =>
                      setIntroState(prev => ({
                        ...prev,
                        authMode: 'login',
                        error: '',
                      }))
                    }
                    className={`flex-1 py-2 sm:py-2.5 lg:py-3 rounded-xl font-semibold transition-all text-sm lg:text-base ${
                      introState.authMode === 'login'
                        ? 'bg-gradient-to-r from-pink-400 to-yellow-400 text-white shadow-lg'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    登入
                  </button>
                  <button
                    onClick={() =>
                      setIntroState(prev => ({
                        ...prev,
                        authMode: 'register',
                        error: '',
                      }))
                    }
                    className={`flex-1 py-2 sm:py-2.5 lg:py-3 rounded-xl font-semibold transition-all text-sm lg:text-base ${
                      introState.authMode === 'register'
                        ? 'bg-gradient-to-r from-pink-400 to-yellow-400 text-white shadow-lg'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    註冊
                  </button>
                </div>

                {introState.error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm"
                  >
                    {introState.error}
                  </motion.div>
                )}

                {/* 表單欄位 */}
                <div className="space-y-3 sm:space-y-4">
                  <AnimatePresence mode="wait">
                    {introState.authMode === 'register' && (
                      <motion.div
                        key="nickname-field"
                        initial={{
                          opacity: 0,
                          height: 0,
                          marginBottom: 0,
                          scale: 0.95,
                        }}
                        animate={{
                          opacity: 1,
                          height: 'auto',
                          marginBottom: '0.75rem',
                          scale: 1,
                          transition: {
                            duration: 0.3,
                            ease: 'easeOut',
                            height: { duration: 0.3 },
                            opacity: { duration: 0.2, delay: 0.1 },
                          },
                        }}
                        exit={{
                          opacity: 0,
                          height: 0,
                          marginBottom: 0,
                          scale: 0.95,
                          transition: {
                            duration: 0.25,
                            ease: 'easeIn',
                            opacity: { duration: 0.15 },
                            height: { duration: 0.25, delay: 0.1 },
                          },
                        }}
                        style={{ overflow: 'hidden' }}
                      >
                        <label className="block text-gray-700 text-sm font-medium mb-2">
                          暱稱
                        </label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="text"
                            value={introState.playerName}
                            onChange={e =>
                              setIntroState(prev => ({
                                ...prev,
                                playerName: e.target.value,
                              }))
                            }
                            placeholder="輸入你的暱稱"
                            className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 bg-white/60 border border-pink-200/60 rounded-xl sm:rounded-2xl focus:bg-white focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400/20 transition-all text-sm sm:text-base"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      電子郵件
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={introState.email}
                        onChange={e =>
                          setIntroState(prev => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        placeholder="your@email.com"
                        className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 bg-white/60 border border-pink-200/60 rounded-xl sm:rounded-2xl focus:bg-white focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400/20 transition-all text-sm sm:text-base"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      密碼
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="password"
                        value={introState.password}
                        onChange={e =>
                          setIntroState(prev => ({
                            ...prev,
                            password: e.target.value,
                          }))
                        }
                        onKeyDown={e => e.key === 'Enter' && handleAuth()}
                        placeholder="至少 6 個字符"
                        className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 bg-white/60 border border-pink-200/60 rounded-xl sm:rounded-2xl focus:bg-white focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400/20 transition-all text-sm sm:text-base"
                      />
                    </div>
                  </div>

                  {/* 提交按鈕 */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleAuth}
                    disabled={
                      loading ||
                      !introState.email.trim() ||
                      !introState.password.trim() ||
                      (introState.authMode === 'register' &&
                        !introState.playerName.trim())
                    }
                    className="w-full bg-gradient-to-r from-pink-400 to-yellow-400 hover:from-pink-500 hover:to-yellow-500 text-white font-bold py-3 sm:py-3.5 lg:py-4 rounded-xl sm:rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl mt-4 sm:mt-5 lg:mt-6 text-sm sm:text-base"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center">
                        <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span>
                        處理中...
                      </span>
                    ) : introState.authMode === 'login' ? (
                      '登入'
                    ) : (
                      '建立帳號'
                    )}
                  </motion.button>
                </div>

                {/* 底部連結 */}
                <div className="mt-3 sm:mt-4 lg:mt-5 text-center">
                  <p className="text-xs sm:text-xs lg:text-sm text-gray-500">
                    {introState.authMode === 'login' ? (
                      <>
                        還沒有帳號？{' '}
                        <button
                          onClick={() =>
                            setIntroState(prev => ({
                              ...prev,
                              authMode: 'register',
                            }))
                          }
                          className="text-pink-500 hover:text-pink-600 font-medium"
                        >
                          立即註冊
                        </button>
                      </>
                    ) : (
                      <>
                        已經有帳號？{' '}
                        <button
                          onClick={() =>
                            setIntroState(prev => ({
                              ...prev,
                              authMode: 'login',
                            }))
                          }
                          className="text-pink-500 hover:text-pink-600 font-medium"
                        >
                          立即登入
                        </button>
                      </>
                    )}
                  </p>

                  {/* 註冊人數統計 */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                    className="mt-3 sm:mt-4"
                  >
                    <div className="bg-gradient-to-r from-pink-50/80 to-yellow-50/80 backdrop-blur-sm border border-pink-200/40 rounded-lg sm:rounded-xl px-3 py-2 sm:px-4 sm:py-3">
                      <div className="flex items-center justify-center gap-2">
                        <motion.div
                          animate={{
                            scale: [1, 1.1, 1],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: 'easeInOut',
                          }}
                          className="w-2 h-2 bg-gradient-to-r from-pink-400 to-yellow-400 rounded-full"
                        ></motion.div>
                        <span className="text-xs sm:text-sm text-gray-600 font-medium">
                          已有
                        </span>
                        <motion.span
                          key={userCount}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.3, type: 'spring' }}
                          className="text-sm sm:text-base font-bold bg-gradient-to-r from-pink-500 to-yellow-500 bg-clip-text text-transparent"
                        >
                          {userCount.toLocaleString()}
                        </motion.span>
                        <span className="text-xs sm:text-sm text-gray-600 font-medium">
                          位學習者加入我們
                        </span>
                        <motion.div
                          animate={{
                            rotate: [0, 10, -10, 0],
                          }}
                          transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: 'easeInOut',
                          }}
                          className="text-sm"
                        >
                          🎉
                        </motion.div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* 移動端簡化版 - 只在小螢幕顯示 */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="lg:hidden w-full flex flex-col items-center justify-center space-y-3 py-4 sm:py-6 order-1 lg:order-2 min-h-[30vh] bg-gradient-to-br from-yellow-50/50 to-pink-50/50"
            >
              <motion.div
                animate={{
                  y: [0, -8, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="w-24 h-24 sm:w-28 sm:h-28 bg-gradient-to-br from-pink-100 to-yellow-100 rounded-full flex items-center justify-center shadow-lg"
              >
                <span className="text-3xl sm:text-4xl">🐱</span>
              </motion.div>
              <h2 className="text-base sm:text-lg font-bold text-gray-800 text-center px-4">
                和 Tororo 一起學習 AI 編程
              </h2>
            </motion.div>

            {/* 右側：和諧美學設計區域 - 黃金比例的較大部分 (61.8%) */}
            <motion.div
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="hidden lg:block h-full relative overflow-hidden order-2 lg:order-2"
            >
              {/* 主要內容區域：中心對稱設計 */}
              <div className="h-full flex flex-col items-center justify-center px-6 lg:px-8 xl:px-12 py-8">
                {/* 頂部標題區域 */}
                <motion.div
                  initial={{ y: -30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.8 }}
                  className="text-center mb-8 lg:mb-12"
                >
                  <h1 className="text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl font-black mb-3 lg:mb-4">
                    <span className="bg-gradient-to-r from-pink-500 via-pink-400 to-yellow-400 bg-clip-text text-transparent">
                      貓咪老師教你
                    </span>
                  </h1>
                  <div className="flex items-center justify-center gap-2 lg:gap-3 mb-3 lg:mb-4">
                    <span className="bg-gradient-to-r from-yellow-500 to-pink-500 bg-clip-text text-transparent text-3xl lg:text-4xl xl:text-5xl font-black">
                      3分鐘
                    </span>
                    <span className="text-gray-700 text-lg lg:text-xl xl:text-2xl font-medium">
                      學會
                    </span>
                    <span className="bg-gradient-to-r from-pink-400 to-yellow-500 bg-clip-text text-transparent text-2xl lg:text-3xl xl:text-4xl font-black">
                      AI寫程式
                    </span>
                  </div>
                  <p className="text-gray-600 text-base lg:text-lg xl:text-xl max-w-md mx-auto leading-relaxed">
                    和可愛的 Tororo 一起，輕鬆掌握 AI 編程的奧秘
                  </p>
                </motion.div>

                {/* 中心區域：貓咪與特色環繞 */}
                <div className="relative flex-1 flex items-center justify-center w-full max-w-2xl">
                  {/* 中央貓咪角色 */}
                  <motion.div
                    className="relative z-10"
                    animate={{
                      y: [0, -12, 0],
                      rotate: [0, 2, -2, 0],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    <div className="relative w-[200px] h-[200px] lg:w-[280px] lg:h-[280px] xl:w-[340px] xl:h-[340px] 2xl:w-[400px] 2xl:h-[400px]">
                      {/* 多層光環效果 */}
                      <div className="absolute inset-0 bg-gradient-to-r from-pink-300/20 to-yellow-300/20 rounded-full blur-3xl animate-pulse"></div>
                      <div className="absolute inset-4 bg-gradient-to-r from-yellow-200/30 to-pink-200/30 rounded-full blur-2xl"></div>

                      <Suspense
                        fallback={
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-100 to-yellow-100 rounded-full shadow-2xl">
                            <div className="text-pink-600 text-lg animate-pulse">
                              🐱 載入中...
                            </div>
                          </div>
                        }
                      >
                        <Live2DPixi6
                          modelPath={APP_CONFIG.live2d.models.tororo.white}
                          fallbackImage={
                            APP_CONFIG.live2d.models.tororo.fallback
                          }
                          width={400}
                          height={400}
                          scale={0.2}
                          triggerMotion={true}
                          mood="happy"
                        />
                      </Suspense>
                    </div>
                  </motion.div>

                  {/* 環繞特色卡片 - 圓形排列 */}
                  <div className="absolute inset-0">
                    {/* 第一個特色 - 右上角 */}
                    <motion.div
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.8, duration: 0.6, type: 'spring' }}
                      className="absolute top-4 lg:top-8 right-4 lg:right-8 xl:right-12"
                    >
                      <div className="bg-white/90 backdrop-blur-xl rounded-2xl lg:rounded-3xl p-4 lg:p-6 shadow-xl border border-pink-200/60 hover:scale-110 transition-all duration-300 hover:shadow-2xl cursor-pointer group">
                        <div className="text-center">
                          <div className="text-3xl lg:text-4xl mb-2 group-hover:scale-110 transition-transform">
                            😺
                          </div>
                          <h3 className="text-gray-800 font-bold text-sm lg:text-base">
                            可愛陪伴
                          </h3>
                          <p className="text-gray-600 text-xs lg:text-sm mt-1">
                            超萌老師
                          </p>
                        </div>
                      </div>
                    </motion.div>

                    {/* 第二個特色 - 左上角 */}
                    <motion.div
                      initial={{ scale: 0, rotate: 45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 1.0, duration: 0.6, type: 'spring' }}
                      className="absolute top-4 lg:top-8 left-4 lg:left-8 xl:left-12"
                    >
                      <div className="bg-white/90 backdrop-blur-xl rounded-2xl lg:rounded-3xl p-4 lg:p-6 shadow-xl border border-yellow-200/60 hover:scale-110 transition-all duration-300 hover:shadow-2xl cursor-pointer group">
                        <div className="text-center">
                          <div className="text-3xl lg:text-4xl mb-2 group-hover:scale-110 transition-transform">
                            ⚡
                          </div>
                          <h3 className="text-gray-800 font-bold text-sm lg:text-base">
                            極速上手
                          </h3>
                          <p className="text-gray-600 text-xs lg:text-sm mt-1">
                            3分鐘入門
                          </p>
                        </div>
                      </div>
                    </motion.div>

                    {/* 第三個特色 - 右下角 */}
                    <motion.div
                      initial={{ scale: 0, rotate: 45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 1.2, duration: 0.6, type: 'spring' }}
                      className="absolute bottom-4 lg:bottom-8 right-4 lg:right-8 xl:right-12"
                    >
                      <div className="bg-white/90 backdrop-blur-xl rounded-2xl lg:rounded-3xl p-4 lg:p-6 shadow-xl border border-pink-300/60 hover:scale-110 transition-all duration-300 hover:shadow-2xl cursor-pointer group">
                        <div className="text-center">
                          <div className="text-3xl lg:text-4xl mb-2 group-hover:scale-110 transition-transform">
                            🤖
                          </div>
                          <h3 className="text-gray-800 font-bold text-sm lg:text-base">
                            AI助力
                          </h3>
                          <p className="text-gray-600 text-xs lg:text-sm mt-1">
                            智能輔助
                          </p>
                        </div>
                      </div>
                    </motion.div>

                    {/* 第四個特色 - 左下角 */}
                    <motion.div
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 1.4, duration: 0.6, type: 'spring' }}
                      className="absolute bottom-4 lg:bottom-8 left-4 lg:left-8 xl:left-12"
                    >
                      <div className="bg-white/90 backdrop-blur-xl rounded-2xl lg:rounded-3xl p-4 lg:p-6 shadow-xl border border-yellow-300/60 hover:scale-110 transition-all duration-300 hover:shadow-2xl cursor-pointer group">
                        <div className="text-center">
                          <div className="text-3xl lg:text-4xl mb-2 group-hover:scale-110 transition-transform">
                            🎯
                          </div>
                          <h3 className="text-gray-800 font-bold text-sm lg:text-base">
                            零基礎
                          </h3>
                          <p className="text-gray-600 text-xs lg:text-sm mt-1">
                            輕鬆開始
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  {/* 裝飾性粒子效果 */}
                  <div className="absolute inset-0 pointer-events-none">
                    <motion.div
                      animate={{
                        y: [0, -20, 0],
                        opacity: [0.3, 0.6, 0.3],
                      }}
                      transition={{
                        duration: 6,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className="absolute top-1/4 left-1/4 w-2 h-2 bg-pink-400/40 rounded-full"
                    ></motion.div>
                    <motion.div
                      animate={{
                        y: [0, 25, 0],
                        opacity: [0.2, 0.5, 0.2],
                      }}
                      transition={{
                        duration: 5,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: 1,
                      }}
                      className="absolute top-1/3 right-1/3 w-3 h-3 bg-yellow-400/40 rounded-full"
                    ></motion.div>
                    <motion.div
                      animate={{
                        y: [0, -15, 0],
                        opacity: [0.4, 0.7, 0.4],
                      }}
                      transition={{
                        duration: 7,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: 2,
                      }}
                      className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-pink-300/40 rounded-full"
                    ></motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default IntroScreen
