import { useState, useEffect } from 'react'
import { useQuery } from '@apollo/client'
import { useNavigate } from 'react-router-dom'
import { GET_ALL_MEMORIES } from '../../graphql/islandData'
import { GET_ISLANDS } from '../../graphql/category'
import { IslandScene } from '../../components/3D/IslandScene'
import Live2DCat from '../../components/Live2DCat'
import { HijikiChatDialog } from '../../components/HijikiChatDialog'
import { TororoChatDialog } from '../../components/TororoChatDialog'
import { MiniMap } from '../../components/MiniMap'
import SettingsMenu from '../../components/SettingsMenu'
import { IslandStatusCard } from '../../components/IslandStatusCard'
import { QueueFloatingButton } from '../../components/QueueFloatingButton'
import { useIslandStore } from '../../stores/islandStore'
import { useOnboardingStore } from '../../stores/onboardingStore'
import { convertGraphQLIslandsToIslands } from '../../utils/islandDataConverter'
import { Memory } from '../../types/memory'
import { useSound } from '../../hooks/useSound'
import { motion } from 'framer-motion'
import { Z_INDEX_CLASSES } from '../../constants/zIndex'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '../../stores/authStore'

export default function IslandOverview() {
  const navigate = useNavigate()

  // GraphQL Queries - 同時載入島嶼和記憶資料
  const { data: islandsData, loading: islandsLoading, refetch: refetchIslands } = useQuery(GET_ISLANDS, {
    fetchPolicy: 'cache-and-network', // 使用快取並從網路更新，避免載入時資料消失
    notifyOnNetworkStatusChange: true,
  })
  const { data: memoryData, loading: memoriesLoading, refetch: refetchMemories } = useQuery(GET_ALL_MEMORIES, {
    fetchPolicy: 'cache-and-network', // 使用快取並從網路更新
    notifyOnNetworkStatusChange: true,
  })

  const [showLive2D, setShowLive2D] = useState(false)
  const [currentLive2DModel, setCurrentLive2DModel] = useState<string>('')
  const [audioInitialized, setAudioInitialized] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // Island store
  const { loadIslands, setLoading, switchIsland, resetToOverview, getCurrentIsland, currentIslandId } = useIslandStore()

  // Auth store for user ID
  const { user } = useAuthStore()

  // Onboarding store for tracking actions
  const { recordAction, isOnboardingActive, setIsInMainView } = useOnboardingStore()

  // 音频系统
  const sound = useSound()

  // 初始化音频（在用户首次交互后）
  useEffect(() => {
    if (!audioInitialized) {
      const initAudio = () => {
        sound.init()
        setAudioInitialized(true)
        document.removeEventListener('click', initAudio)
      }
      document.addEventListener('click', initAudio, { once: true })
      return () => document.removeEventListener('click', initAudio)
    }
  }, [audioInitialized, sound])

  // 教學模式：頁面載入時重置為主畫面狀態（用於從知識庫返回時）
  useEffect(() => {
    if (isOnboardingActive && currentIslandId === 'overview') {
      setIsInMainView(true)
    }
  }, [isOnboardingActive, currentIslandId, setIsInMainView])

  // 首次進入自動打開白噗噗對話
  useEffect(() => {
    const hasShownWelcome = sessionStorage.getItem('tororo_welcome_shown')
    if (!hasShownWelcome && !memoriesLoading && !islandsLoading) {
      // 延遲 1 秒後自動打開白噗噗
      const timer = setTimeout(() => {
        handleTororoClick()
        sessionStorage.setItem('tororo_welcome_shown', 'true')
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [memoriesLoading, islandsLoading])

  // 載入島嶼和記憶數據（從 GraphQL）
  useEffect(() => {
    // 等待兩個 query 都載入完成
    if (memoriesLoading || islandsLoading) {
      setLoading(true)
      return
    }

    try {
      // 1. 獲取 GraphQL 島嶼資料
      const graphQLIslands = islandsData?.islands || []

      // 2. 獲取所有記憶
      const allMemories: Memory[] = memoryData?.memories || []

      // 3. 轉換為前端 Island 格式（包含記憶分配）
      const convertedIslands = convertGraphQLIslandsToIslands(graphQLIslands, allMemories)

      // 4. 載入到 store
      loadIslands(convertedIslands)
    } catch (error) {
      console.error('❌ [IslandOverview] 載入島嶼數據失敗:', error)
      setLoading(false)
    }
  }, [islandsData, memoryData, islandsLoading, memoriesLoading, loadIslands, setLoading])

  // 監聽知識上傳完成事件，自動重新載入島嶼和記憶數據
  useEffect(() => {
    if (!user?.id) return

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'
    const socket: Socket = io(backendUrl, {
      transports: ['polling'],
      reconnection: true,
    })

    socket.on('connect', () => {
      socket.emit('join-room', { roomId: user.id })
    })

    // 監聽任務完成事件
    socket.on('task-complete', () => {
      // 延遲 500ms 後重新載入，確保後端數據已更新
      setTimeout(async () => {
        try {
          const islandsResult = await refetchIslands()
          const memoriesResult = await refetchMemories()

          // 手動更新島嶼數據到 store，避免等待 useEffect
          if (islandsResult.data?.islands && memoriesResult.data?.memories) {
            const graphQLIslands = islandsResult.data.islands
            const allMemories = memoriesResult.data.memories
            const convertedIslands = convertGraphQLIslandsToIslands(graphQLIslands, allMemories)

            // 只更新島嶼數據，不改變 currentIslandId
            useIslandStore.setState((state) => ({
              islands: convertedIslands,
              isLoading: false,
              // 保持當前的 currentIslandId，不重置到 overview
              currentIslandId: state.currentIslandId
            }))
          }
        } catch (error) {
          console.error('[IslandOverview] Refetch 失敗:', error)
        }
      }, 500)
    })

    return () => {
      socket.disconnect()
    }
  }, [user?.id, refetchIslands, refetchMemories])

  const handleTororoClick = () => {
    // Tororo (小白) - 知識園丁，使用 Tororo 白色模型
    setCurrentLive2DModel('/models/tororo_white/tororo.model3.json')
    setShowLive2D(true)

    // 更新主畫面狀態（教學用）
    if (isOnboardingActive) {
      setIsInMainView(false)
      recordAction('tororoClicked')
    }
  }

  const handleHijikiClick = () => {
    // Hijiki (小黑) - 知識管理員，使用 Hijiki 黑色模型
    setCurrentLive2DModel('/models/hijiki/hijiki.model3.json')
    setShowLive2D(true)

    // 更新主畫面狀態（教學用）
    if (isOnboardingActive) {
      setIsInMainView(false)
      recordAction('hijikiClicked')
    }
  }

  const handleCloseLive2D = () => {
    setShowLive2D(false)
    setCurrentLive2DModel('')

    // 更新主畫面狀態（教學用）
    if (isOnboardingActive) {
      setIsInMainView(true)
    }
  }

  // 處理小地圖島嶼點擊 - 切換島嶼並移動相機視角
  const handleMiniMapIslandClick = (islandId: string) => {
    // 特殊處理：點擊中央房子回到總覽
    if (islandId === 'overview') {
      resetToOverview()
      // 更新主畫面狀態（教學用）- 返回總覽視為回到主畫面
      if (isOnboardingActive) {
        setIsInMainView(true)
      }
    } else {
      // 更新 store 中的當前島嶼
      switchIsland(islandId)
      // 更新主畫面狀態（教學用）- 切換到島嶼視為離開主畫面
      if (isOnboardingActive) {
        setIsInMainView(false)
      }
    }

    // 播放點擊音效
    if (audioInitialized) {
      sound.sfx.click()
    }
  }

  // 處理編輯島嶼按鈕點擊 - 跳轉到島嶼創建器/編輯器頁面
  const handleEditIsland = () => {
    const currentIsland = getCurrentIsland()
    if (currentIsland) {
      navigate(`/island-creator/${currentIsland.id}`)
    }
  }


  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* 3D Island Scene - 環形群島視圖 */}
      <IslandScene
        onTororoClick={handleTororoClick}
        onHijikiClick={handleHijikiClick}
        hideLabels={showLive2D}
      />

      {/* 左上角按鈕組 - 手機端調整位置和大小 */}
      {!showLive2D && (
        <div className="fixed top-3 md:top-6 left-3 md:left-6 flex gap-2 md:gap-3">
          {/* 設定按鈕 */}
          <motion.button
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
            onClick={() => {
              setShowSettings(true)
              // 記錄教學操作
              if (isOnboardingActive) {
                recordAction('settingsClicked')
              }
            }}
            whileHover={{ scale: 1.05, opacity: 1 }}
            className={`${Z_INDEX_CLASSES.FIXED_PANEL} group`}
            title="遊戲設定"
          >
            <div className="relative w-11 h-11 md:w-12 md:h-12 rounded-2xl backdrop-blur-md bg-white/10 border border-white/20 shadow-lg transition-all group-hover:bg-white/20 group-hover:border-white/30">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-pink-300/20 to-yellow-300/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute inset-0 flex items-center justify-center text-white/70 group-hover:text-white text-lg md:text-xl transition-all group-hover:rotate-90 duration-500">
                ⚙️
              </div>
            </div>
          </motion.button>
        </div>
      )}

      {/* 設定選單 */}
      <SettingsMenu isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* 島嶼狀態卡片 - 左上角 - 當聚焦到某個島嶼時顯示 */}
      {!showLive2D && currentIslandId !== 'overview' && getCurrentIsland() && (
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        >
          <IslandStatusCard
            name={getCurrentIsland()!.nameChinese}
            emoji={getCurrentIsland()!.emoji}
            color={getCurrentIsland()!.color}
            description={getCurrentIsland()!.description || ''}
            memoryCount={getCurrentIsland()!.memoryCount}
            updatedAt={new Date(getCurrentIsland()!.updatedAt)}
            onEditClick={handleEditIsland}
            onBackClick={resetToOverview}
          />
        </motion.div>
      )}

      {/* 小地圖 - 右下角 */}
      {!showLive2D && (
        <MiniMap onIslandClick={handleMiniMapIslandClick} />
      )}

      {/* 隊列狀態按鈕 - 右下角 */}
      {!showLive2D && <QueueFloatingButton />}

      {/* Live2D Cat Modal - 沉浸式全屏對話界面 */}
      {showLive2D && currentLive2DModel && (
        <>
          {currentLive2DModel.includes('tororo') ? (
            <TororoChatDialog onClose={handleCloseLive2D} />
          ) : currentLive2DModel.includes('hijiki') ? (
            <HijikiChatDialog onClose={handleCloseLive2D} />
          ) : (
            <Live2DCat
              modelPath={currentLive2DModel}
              onClose={handleCloseLive2D}
            />
          )}
        </>
      )}
    </div>
  )
}
