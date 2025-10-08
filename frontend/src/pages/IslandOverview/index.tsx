import { useState, useEffect } from 'react'
import { useQuery } from '@apollo/client'
import { GET_ALL_MEMORIES } from '../../graphql/islandData'
import { IslandScene } from '../../components/3D/IslandScene'
import Live2DCat from '../../components/Live2DCat'
import TororoKnowledgeAssistant from '../../components/TororoKnowledgeAssistant'
import { MiniMap } from '../../components/MiniMap'
import SettingsMenu from '../../components/SettingsMenu'
import { useIslandStore } from '../../stores/islandStore'
import { assignMemoriesToIslands, loadUserIslands } from '../../utils/islandDataConverter'
import { Memory } from '../../types/memory'
import { useSound } from '../../hooks/useSound'
import { motion } from 'framer-motion'

export default function IslandOverview() {
  const { data: memoryData, loading: memoriesLoading } = useQuery(GET_ALL_MEMORIES)
  const [showLive2D, setShowLive2D] = useState(false)
  const [currentLive2DModel, setCurrentLive2DModel] = useState<string>('')
  const [audioInitialized, setAudioInitialized] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // Island store
  const { islands, loadIslands, setLoading, switchIsland, resetToOverview } = useIslandStore()

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

  // 首次進入自動打開白噗噗對話
  useEffect(() => {
    const hasShownWelcome = sessionStorage.getItem('tororo_welcome_shown')
    if (!hasShownWelcome && !memoriesLoading) {
      // 延遲 1 秒後自動打開白噗噗
      const timer = setTimeout(() => {
        handleTororoClick()
        sessionStorage.setItem('tororo_welcome_shown', 'true')
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [memoriesLoading])

  // 載入島嶼和記憶數據
  useEffect(() => {
    if (memoriesLoading) {
      setLoading(true)
      return
    }

    try {
      // 1. 載入用戶的島嶼配置（從 localStorage 或使用預設）
      const userIslands = loadUserIslands()

      // 2. 獲取所有記憶
      const allMemories: Memory[] = memoryData?.memories || []

      // 3. 將記憶分配到島嶼
      const islandsWithMemories = assignMemoriesToIslands(userIslands, allMemories)

      // 4. 載入到 store
      loadIslands(islandsWithMemories)

      console.log('✅ 島嶼數據已載入:', {
        島嶼數量: islandsWithMemories.length,
        總記憶數: allMemories.length,
        各島記憶: islandsWithMemories.map(i => `${i.name}: ${i.memoryCount}`)
      })
    } catch (error) {
      console.error('❌ 載入島嶼數據失敗:', error)
      setLoading(false)
    }
  }, [memoryData, memoriesLoading, loadIslands, setLoading])

  const handleTororoClick = () => {
    // Tororo (小白) - 知識園丁，使用 Tororo 白色模型
    setCurrentLive2DModel('/models/tororo_white/tororo.model3.json')
    setShowLive2D(true)
  }

  const handleHijikiClick = () => {
    // Hijiki (小黑) - 知識管理員，使用 Hijiki 黑色模型
    setCurrentLive2DModel('/models/hijiki/hijiki.model3.json')
    setShowLive2D(true)
  }

  const handleCloseLive2D = () => {
    setShowLive2D(false)
    setCurrentLive2DModel('')
  }

  // 處理小地圖島嶼點擊 - 切換島嶼並移動相機視角
  const handleMiniMapIslandClick = (islandId: string) => {
    // 特殊處理：點擊中央房子回到總覽
    if (islandId === 'overview') {
      resetToOverview()
    } else {
      // 更新 store 中的當前島嶼
      switchIsland(islandId)
    }

    // 播放點擊音效
    if (audioInitialized) {
      sound.sfx.click()
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

      {/* 設定按鈕 - 左上角 - 沉浸式設計 */}
      {!showLive2D && (
        <motion.button
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
          onClick={() => setShowSettings(true)}
          whileHover={{ scale: 1.05, opacity: 1 }}
          className="fixed top-6 left-6 z-40 group"
          title="遊戲設定"
        >
          {/* 玻璃擬態背景 */}
          <div className="relative w-12 h-12 rounded-2xl backdrop-blur-md bg-white/10 border border-white/20 shadow-lg transition-all group-hover:bg-white/20 group-hover:border-white/30">
            {/* 漸層光暈 */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-pink-300/20 to-yellow-300/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* 齒輪圖標 */}
            <div className="absolute inset-0 flex items-center justify-center text-white/70 group-hover:text-white text-xl transition-all group-hover:rotate-90 duration-500">
              ⚙️
            </div>
          </div>
        </motion.button>
      )}

      {/* 設定選單 */}
      <SettingsMenu isOpen={showSettings} onClose={() => setShowSettings(false)} />


      {/* 小地圖 - 右下角 */}
      {!showLive2D && (
        <MiniMap onIslandClick={handleMiniMapIslandClick} />
      )}

      {/* Live2D Cat Modal - 沉浸式全屏對話界面 */}
      {showLive2D && currentLive2DModel && (
        <>
          {currentLive2DModel.includes('tororo') ? (
            <TororoKnowledgeAssistant
              modelPath={currentLive2DModel}
              onClose={handleCloseLive2D}
            />
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
