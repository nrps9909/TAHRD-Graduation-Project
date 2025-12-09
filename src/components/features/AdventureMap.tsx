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
} from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import { getClaudeCodeVisualization } from '@/data/unifiedLearningPath'
import { claudeCodeLevels } from '@/data/claudeCodeScenes'

interface AdventureMapProps {
  onStartLevel: (levelId: string, firstSceneId: string) => void
}

const AdventureMap: React.FC<AdventureMapProps> = ({ onStartLevel }) => {
  const { completedScenes } = useGameStore()
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null)

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
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0a] via-[#111111] to-[#0a0a0a] p-6 relative overflow-hidden">
      {/* 背景裝飾 - 科技感光暈 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-white/[0.02] to-transparent rounded-full" />
      </div>

      {/* 標題區域 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10 relative z-10"
      >
        <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent mb-3 tracking-tight">
          Claude Code Adventure
        </h1>
        <p className="text-gray-500 mb-6 text-lg">
          踏上 Vibe Coding 的冒險之旅
        </p>
        <Link
          to="/playground"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl hover:from-emerald-500 hover:to-emerald-400 transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-105"
        >
          <Sparkles className="w-5 h-5" />
          <span>Playground 體驗區</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </motion.div>

      {/* 總進度卡片 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto mb-12 relative z-10"
      >
        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center border border-emerald-500/20">
                <Trophy className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  冒險進度
                </h2>
                <p className="text-gray-500 text-sm">
                  {completedCount} / {totalScenes} 場景完成
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent">
                {overallProgress}%
              </div>
            </div>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${overallProgress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full shadow-lg shadow-emerald-500/50"
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
                stroke={isCompleted ? 'url(#gradientLine)' : '#333'}
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
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
        </svg>

        {/* 關卡節點 */}
        <div className="relative z-10 space-y-12">
          {visualizationData.map((stage, index) => {
            const level = claudeCodeLevels[index]
            const isEven = index % 2 === 0

            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, x: isEven ? -30 : 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`flex items-center gap-8 ${
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
                    className={`inline-block p-5 rounded-xl cursor-pointer transition-all duration-300 ${
                      stage.isCompleted
                        ? 'bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                        : stage.isCurrent
                          ? 'bg-gradient-to-br from-white/10 to-white/5 border border-white/20 shadow-lg shadow-white/5'
                          : stage.isAvailable
                            ? 'bg-gradient-to-br from-white/5 to-transparent border border-white/10 hover:border-white/20 hover:shadow-lg'
                            : 'bg-white/[0.02] border border-white/5 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div
                      className={`flex items-center gap-2 mb-2 ${isEven ? 'justify-end' : 'justify-start'}`}
                    >
                      {stage.isBoss && (
                        <Crown className="w-5 h-5 text-amber-400" />
                      )}
                      <span className="text-sm font-medium text-gray-400">
                        Level {level.level}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {level.title}
                    </h3>
                    <p className="text-gray-500 text-sm mb-3">
                      {level.description}
                    </p>

                    {stage.isAvailable && (
                      <div className="mt-3">
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${stage.progress}%` }}
                            className={`h-full rounded-full ${
                              stage.isCompleted
                                ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                                : 'bg-gradient-to-r from-white/60 to-white/40'
                            }`}
                          />
                        </div>
                        <p className="text-xs text-gray-600 mt-2">
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
                  className={`w-20 h-20 rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-300 ${
                    stage.isCompleted
                      ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/40'
                      : stage.isCurrent
                        ? 'bg-gradient-to-br from-white/20 to-white/10 border-2 border-white/30 shadow-lg shadow-white/10'
                        : stage.isAvailable
                          ? 'bg-gradient-to-br from-white/10 to-white/5 border border-white/20 hover:border-white/40'
                          : 'bg-white/5 cursor-not-allowed'
                  }`}
                >
                  {stage.isCompleted ? (
                    <CheckCircle className="w-10 h-10 text-white" />
                  ) : !stage.isAvailable ? (
                    <Lock className="w-7 h-7 text-gray-600" />
                  ) : stage.isBoss ? (
                    <Crown className="w-10 h-10 text-amber-400" />
                  ) : (
                    <span className="text-3xl">{level.icon}</span>
                  )}
                </motion.div>

                <div className="flex-1" />
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
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedLevel(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] rounded-2xl p-6 max-w-md w-full border border-white/10 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              {(() => {
                const level = claudeCodeLevels[selectedLevel]
                const stage = visualizationData[selectedLevel]
                return (
                  <>
                    <div className="text-center mb-6">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center border border-white/10">
                        <span className="text-4xl">{level.icon}</span>
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">
                        Level {level.level}：{level.title}
                      </h3>
                      <p className="text-gray-500">
                        {level.description}
                      </p>
                    </div>

                    {/* 進度 */}
                    <div className="bg-white/5 rounded-xl p-4 mb-4 border border-white/10">
                      <div className="flex justify-between text-sm mb-3">
                        <span className="text-gray-500">進度</span>
                        <span className="text-white font-semibold">
                          {stage.progress}%
                        </span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                          style={{ width: `${stage.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* 獎勵 */}
                    <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
                      <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                        <Star className="w-5 h-5 text-amber-400" />
                        完成獎勵
                      </h4>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <Zap className="w-5 h-5 text-emerald-400" />
                          <span className="text-white">
                            {level.level * 200} 分
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Trophy className="w-5 h-5 text-amber-400" />
                          <span className="text-white">
                            {level.badge}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 按鈕 */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => setSelectedLevel(null)}
                        className="flex-1 py-3 bg-white/5 text-gray-400 rounded-xl font-semibold hover:bg-white/10 transition-all border border-white/10"
                      >
                        返回
                      </button>
                      <button
                        onClick={() => handleStartLevel(selectedLevel)}
                        className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl font-semibold hover:from-emerald-500 hover:to-emerald-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                      >
                        <Play className="w-5 h-5" />
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
    </div>
  )
}

export default AdventureMap
