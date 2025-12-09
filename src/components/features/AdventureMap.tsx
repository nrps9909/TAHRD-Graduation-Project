import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle,
  Lock,
  Play,
  Star,
  Trophy,
  Zap,
  Crown,
  Sparkles,
  ChevronRight,
  Settings,
} from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import { getClaudeCodeVisualization } from '@/data/unifiedLearningPath'
import { claudeCodeLevels } from '@/data/claudeCodeScenes'
import SetupGuide from './SetupGuide'

interface AdventureMapProps {
  onStartLevel: (levelId: string, firstSceneId: string) => void
}

const AdventureMap: React.FC<AdventureMapProps> = ({ onStartLevel }) => {
  const { completedScenes } = useGameStore()
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null)
  const [showSetupGuide, setShowSetupGuide] = useState(false)

  const visualizationData = getClaudeCodeVisualization(completedScenes)

  const totalScenes = claudeCodeLevels.reduce(
    (acc, level) => acc + level.scenes.length,
    0
  )
  const completedCount = claudeCodeLevels.reduce(
    (acc, level) =>
      acc + level.scenes.filter(s => completedScenes.includes(s)).length,
    0
  )
  const overallProgress = Math.round((completedCount / totalScenes) * 100)

  const handleLevelClick = (levelIndex: number, isAvailable: boolean) => {
    if (!isAvailable) return
    setSelectedLevel(levelIndex)
  }

  const handleStartLevel = (levelIndex: number) => {
    const level = claudeCodeLevels[levelIndex]
    const stage = visualizationData[levelIndex]

    const firstIncompleteScene =
      level.scenes.find(sceneId => !completedScenes.includes(sceneId)) ||
      level.scenes[0]

    onStartLevel(stage.id, firstIncompleteScene)
    setSelectedLevel(null)
  }

  return (
    <div className="min-h-screen bg-black p-4 sm:p-6 relative overflow-hidden">
      {/* 背景裝飾 - Apple 風格微妙光暈 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-48 sm:w-[500px] h-48 sm:h-[500px] bg-apple-blue/[0.03] rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-48 sm:w-[400px] h-48 sm:h-[400px] bg-apple-purple/[0.03] rounded-full blur-[100px]" />
      </div>

      {/* 標題區域 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6 sm:mb-12 relative z-10"
      >
        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-apple-gray-50 mb-2 sm:mb-3 tracking-tight px-2">
          Claude Code Adventure
        </h1>
        <p className="text-apple-gray-300 mb-5 sm:mb-8 text-sm sm:text-lg">
          踏上 Vibe Coding 的冒險之旅
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <button
            onClick={() => setShowSetupGuide(true)}
            className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-5 sm:px-7 py-3 sm:py-3.5 bg-apple-gray-700 text-white rounded-full hover:bg-apple-gray-600 transition-all duration-300 text-sm sm:text-base font-medium border border-white/10 w-full sm:w-auto"
          >
            <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>環境架設教學</span>
          </button>
          <Link
            to="/playground"
            className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-5 sm:px-7 py-3 sm:py-3.5 bg-apple-blue text-white rounded-full hover:bg-apple-blue-light transition-all duration-300 text-sm sm:text-base font-medium w-full sm:w-auto"
          >
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Playground 體驗區</span>
            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
          </Link>
        </div>
      </motion.div>

      {/* 總進度卡片 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto mb-8 sm:mb-12 relative z-10"
      >
        <div className="glass rounded-2xl sm:rounded-3xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-apple-blue/10 flex items-center justify-center">
                <Trophy className="w-5 h-5 sm:w-7 sm:h-7 text-apple-blue" />
              </div>
              <div>
                <h2 className="text-base sm:text-xl font-semibold text-apple-gray-50">
                  冒險進度
                </h2>
                <p className="text-apple-gray-400 text-xs sm:text-sm">
                  {completedCount} / {totalScenes} 場景完成
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl sm:text-4xl font-bold text-apple-blue">
                {overallProgress}%
              </div>
            </div>
          </div>
          <div className="h-1 sm:h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${overallProgress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-apple-blue to-apple-blue-light rounded-full"
            />
          </div>
        </div>
      </motion.div>

      {/* 地圖區域 */}
      <div className="max-w-4xl mx-auto relative z-10">
        {/* 連接線 SVG */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 0 }}
        >
          {visualizationData.map((_, index) => {
            if (index === visualizationData.length - 1) return null
            const isCompleted = visualizationData[index].isCompleted
            return (
              <motion.line
                key={index}
                x1="50%"
                y1={`${index * 160 + 100}px`}
                x2="50%"
                y2={`${(index + 1) * 160 + 20}px`}
                stroke={isCompleted ? 'url(#gradientLine)' : 'rgba(255,255,255,0.1)'}
                strokeWidth="2"
                strokeDasharray={isCompleted ? '0' : '6 6'}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              />
            )
          })}
          <defs>
            <linearGradient id="gradientLine" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0071e3" />
              <stop offset="100%" stopColor="#2997ff" />
            </linearGradient>
          </defs>
        </svg>

        {/* 關卡節點 */}
        <div className="relative z-10 space-y-6 sm:space-y-12">
          {visualizationData.map((stage, index) => {
            const level = claudeCodeLevels[index]
            const isEven = index % 2 === 0

            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, x: isEven ? -30 : 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`flex items-center gap-3 sm:gap-8 ${
                  isEven ? 'flex-row' : 'flex-row-reverse'
                }`}
              >
                {/* 關卡資訊卡 */}
                <div
                  className={`flex-1 ${isEven ? 'text-right' : 'text-left'}`}
                >
                  <motion.div
                    whileHover={stage.isAvailable ? { scale: 1.02, y: -2 } : {}}
                    onClick={() => handleLevelClick(index, stage.isAvailable)}
                    className={`inline-block p-3 sm:p-5 rounded-2xl cursor-pointer transition-all duration-300 max-w-[200px] sm:max-w-none ${
                      stage.isCompleted
                        ? 'bg-apple-blue/10 border border-apple-blue/30'
                        : stage.isCurrent
                          ? 'glass border-white/20'
                          : stage.isAvailable
                            ? 'bg-apple-gray-800/50 border border-white/10 hover:border-white/20 hover:bg-apple-gray-700/50'
                            : 'bg-white/[0.02] border border-white/5 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div
                      className={`flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2 ${isEven ? 'justify-end' : 'justify-start'}`}
                    >
                      {stage.isBoss && (
                        <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-apple-orange" />
                      )}
                      <span className="text-xs sm:text-sm font-medium text-apple-gray-400">
                        Level {level.level}
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-lg font-semibold text-apple-gray-50 mb-0.5 sm:mb-1">
                      {level.title}
                    </h3>
                    <p className="text-apple-gray-400 text-xs sm:text-sm mb-2 sm:mb-3 line-clamp-2 sm:line-clamp-none">
                      {level.description}
                    </p>

                    {stage.isAvailable && (
                      <div className="mt-2 sm:mt-3">
                        <div className="h-1 sm:h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${stage.progress}%` }}
                            className={`h-full rounded-full ${
                              stage.isCompleted
                                ? 'bg-gradient-to-r from-apple-blue to-apple-blue-light'
                                : 'bg-gradient-to-r from-apple-gray-400 to-apple-gray-300'
                            }`}
                          />
                        </div>
                        <p className="text-[10px] sm:text-xs text-apple-gray-500 mt-1 sm:mt-2">
                          {stage.progress}% 完成
                        </p>
                      </div>
                    )}
                  </motion.div>
                </div>

                {/* 中央節點 */}
                <motion.div
                  whileHover={stage.isAvailable ? { scale: 1.1 } : {}}
                  whileTap={stage.isAvailable ? { scale: 0.95 } : {}}
                  onClick={() => handleLevelClick(index, stage.isAvailable)}
                  className={`w-14 h-14 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl flex items-center justify-center cursor-pointer transition-all duration-300 flex-shrink-0 ${
                    stage.isCompleted
                      ? 'bg-apple-blue shadow-lg shadow-apple-blue/30'
                      : stage.isCurrent
                        ? 'glass border-2 border-apple-blue/50'
                        : stage.isAvailable
                          ? 'bg-apple-gray-700 border border-white/10 hover:border-white/20'
                          : 'bg-apple-gray-800 cursor-not-allowed'
                  }`}
                >
                  {stage.isCompleted ? (
                    <CheckCircle className="w-7 h-7 sm:w-10 sm:h-10 text-white" />
                  ) : !stage.isAvailable ? (
                    <Lock className="w-5 h-5 sm:w-7 sm:h-7 text-apple-gray-500" />
                  ) : stage.isBoss ? (
                    <Crown className="w-7 h-7 sm:w-10 sm:h-10 text-apple-orange" />
                  ) : (
                    <span className="text-xl sm:text-3xl">{level.icon}</span>
                  )}
                </motion.div>

                <div className="flex-1 hidden sm:block" />
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* 關卡詳情彈窗 */}
      <AnimatePresence>
        {selectedLevel !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center z-50 p-3 sm:p-4"
            onClick={() => setSelectedLevel(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="glass rounded-2xl sm:rounded-3xl p-5 sm:p-8 max-w-md w-full shadow-apple-xl max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              {(() => {
                const level = claudeCodeLevels[selectedLevel]
                const stage = visualizationData[selectedLevel]
                return (
                  <>
                    <div className="text-center mb-5 sm:mb-8">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-5 rounded-2xl sm:rounded-3xl bg-apple-gray-700 flex items-center justify-center">
                        <span className="text-3xl sm:text-4xl">{level.icon}</span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold text-apple-gray-50 mb-2">
                        Level {level.level}：{level.title}
                      </h3>
                      <p className="text-apple-gray-400 text-sm sm:text-base">
                        {level.description}
                      </p>
                    </div>

                    {/* 進度 */}
                    <div className="bg-apple-gray-800/50 rounded-2xl p-4 sm:p-5 mb-4 sm:mb-5">
                      <div className="flex justify-between text-xs sm:text-sm mb-3">
                        <span className="text-apple-gray-400">進度</span>
                        <span className="text-apple-gray-50 font-semibold">
                          {stage.progress}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-apple-blue to-apple-blue-light rounded-full"
                          style={{ width: `${stage.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* 獎勵 */}
                    <div className="bg-apple-gray-800/50 rounded-2xl p-4 sm:p-5 mb-5 sm:mb-8">
                      <h4 className="text-apple-gray-50 font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base">
                        <Star className="w-4 h-4 sm:w-5 sm:h-5 text-apple-yellow" />
                        完成獎勵
                      </h4>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-apple-blue" />
                          <span className="text-apple-gray-50 text-sm sm:text-base">
                            {level.level * 200} 分
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-apple-yellow" />
                          <span className="text-apple-gray-50 text-sm sm:text-base">
                            {level.badge}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 按鈕 */}
                    <div className="flex gap-3 sm:gap-4">
                      <button
                        onClick={() => setSelectedLevel(null)}
                        className="flex-1 py-3 sm:py-3.5 bg-apple-gray-700 text-apple-gray-300 rounded-full font-medium hover:bg-apple-gray-600 transition-all text-sm sm:text-base"
                      >
                        返回
                      </button>
                      <button
                        onClick={() => handleStartLevel(selectedLevel)}
                        className="flex-1 py-3 sm:py-3.5 bg-apple-blue text-white rounded-full font-medium hover:bg-apple-blue-light transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base"
                      >
                        <Play className="w-4 h-4 sm:w-5 sm:h-5" />
                        {stage.progress > 0 ? '繼續冒險' : '開始冒險'}
                      </button>
                    </div>
                  </>
                )
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 環境架設教學 */}
      <SetupGuide isOpen={showSetupGuide} onClose={() => setShowSetupGuide(false)} />
    </div>
  )
}

export default AdventureMap
