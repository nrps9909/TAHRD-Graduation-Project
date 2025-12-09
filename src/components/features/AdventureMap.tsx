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

  // 計算總進度
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

    // 找到該關卡第一個未完成的場景，或第一個場景
    const firstIncompleteScene =
      level.scenes.find(sceneId => !completedScenes.includes(sceneId)) ||
      level.scenes[0]

    onStartLevel(stage.id, firstIncompleteScene)
    setSelectedLevel(null)
  }

  return (
    <div className="min-h-screen bg-bg-primary p-6">
      {/* 標題區域 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl font-bold text-white mb-2 chinese-text">
          Claude Code Adventure
        </h1>
        <p className="text-text-secondary mb-4 chinese-text">
          踏上 Vibe Coding 的冒險之旅
        </p>
        <Link
          to="/playground"
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-all shadow-lg"
        >
          <Sparkles className="w-4 h-4" />
          <span className="chinese-text">Playground 體驗區</span>
        </Link>
      </motion.div>

      {/* 總進度 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto mb-8 bg-bg-tertiary border border-border-primary rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-accent" />
            <div>
              <h2 className="text-xl font-bold text-white chinese-text">
                冒險進度
              </h2>
              <p className="text-text-secondary text-sm chinese-text">
                {completedCount} / {totalScenes} 場景完成
              </p>
            </div>
          </div>
          <div className="text-3xl font-bold text-accent">
            {overallProgress}%
          </div>
        </div>
        <div className="h-3 bg-bg-hover rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${overallProgress}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full bg-accent rounded-full"
          />
        </div>
      </motion.div>

      {/* 地圖區域 */}
      <div className="max-w-4xl mx-auto relative">
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
                y1={`${index * 140 + 80}px`}
                x2="50%"
                y2={`${(index + 1) * 140 + 20}px`}
                stroke={isCompleted ? '#10a37f' : '#424242'}
                strokeWidth="4"
                strokeDasharray={isCompleted ? '0' : '8 8'}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              />
            )
          })}
        </svg>

        {/* 關卡節點 */}
        <div className="relative z-10 space-y-8">
          {visualizationData.map((stage, index) => {
            const level = claudeCodeLevels[index]
            const isEven = index % 2 === 0

            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, x: isEven ? -50 : 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`flex items-center gap-6 ${
                  isEven ? 'flex-row' : 'flex-row-reverse'
                }`}
              >
                {/* 關卡資訊卡 */}
                <div
                  className={`flex-1 ${isEven ? 'text-right' : 'text-left'}`}
                >
                  <motion.div
                    whileHover={stage.isAvailable ? { scale: 1.02 } : {}}
                    onClick={() => handleLevelClick(index, stage.isAvailable)}
                    className={`inline-block p-4 rounded-xl cursor-pointer transition-all ${
                      stage.isCompleted
                        ? 'bg-accent/10 border-2 border-accent'
                        : stage.isCurrent
                          ? 'bg-bg-tertiary border-2 border-accent animate-pulse'
                          : stage.isAvailable
                            ? 'bg-bg-tertiary border-2 border-border-secondary hover:border-accent'
                            : 'bg-bg-secondary border-2 border-border-primary opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div
                      className={`flex items-center gap-2 ${isEven ? 'justify-end' : 'justify-start'}`}
                    >
                      {stage.isBoss && (
                        <Crown className="w-5 h-5 text-accent" />
                      )}
                      <span className="text-lg font-bold text-white chinese-text">
                        Level {level.level}
                      </span>
                    </div>
                    <h3 className="text-white font-semibold mt-1 chinese-text">
                      {level.title}
                    </h3>
                    <p className="text-text-secondary text-sm mt-1 chinese-text">
                      {level.description}
                    </p>

                    {/* 進度條 */}
                    {stage.isAvailable && (
                      <div className="mt-3">
                        <div className="h-2 bg-bg-hover rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${stage.progress}%` }}
                            className="h-full rounded-full bg-accent"
                          />
                        </div>
                        <p className="text-xs text-text-muted mt-1">
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
                  className={`w-20 h-20 rounded-full flex items-center justify-center cursor-pointer transition-all ${
                    stage.isCompleted
                      ? 'bg-accent shadow-lg shadow-accent/30'
                      : stage.isCurrent
                        ? 'bg-accent shadow-lg shadow-accent/30 animate-pulse'
                        : stage.isAvailable
                          ? 'bg-bg-tertiary border-2 border-border-secondary hover:border-accent hover:bg-bg-hover'
                          : 'bg-bg-secondary cursor-not-allowed'
                  }`}
                >
                  {stage.isCompleted ? (
                    <CheckCircle className="w-10 h-10 text-white" />
                  ) : !stage.isAvailable ? (
                    <Lock className="w-8 h-8 text-text-muted" />
                  ) : stage.isBoss ? (
                    <Crown className="w-10 h-10 text-white" />
                  ) : (
                    <span className="text-3xl">{level.icon}</span>
                  )}
                </motion.div>

                {/* 佔位 */}
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
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedLevel(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-bg-secondary rounded-2xl p-6 max-w-md w-full border border-border-primary"
              onClick={e => e.stopPropagation()}
            >
              {(() => {
                const level = claudeCodeLevels[selectedLevel]
                const stage = visualizationData[selectedLevel]
                return (
                  <>
                    <div className="text-center mb-6">
                      <div className="text-5xl mb-3">{level.icon}</div>
                      <h3 className="text-2xl font-bold text-white chinese-text">
                        Level {level.level}：{level.title}
                      </h3>
                      <p className="text-text-secondary mt-2 chinese-text">
                        {level.description}
                      </p>
                    </div>

                    {/* 進度 */}
                    <div className="bg-bg-tertiary rounded-xl p-4 mb-4 border border-border-primary">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-text-secondary">進度</span>
                        <span className="text-white font-bold">
                          {stage.progress}%
                        </span>
                      </div>
                      <div className="h-2 bg-bg-hover rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full"
                          style={{ width: `${stage.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* 獎勵 */}
                    <div className="bg-bg-tertiary rounded-xl p-4 mb-6 border border-border-primary">
                      <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                        <Star className="w-5 h-5 text-accent" />
                        完成獎勵
                      </h4>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Zap className="w-5 h-5 text-accent" />
                          <span className="text-white">
                            {level.level * 200} 分
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Trophy className="w-5 h-5 text-accent" />
                          <span className="text-white chinese-text">
                            {level.badge}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 按鈕 */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => setSelectedLevel(null)}
                        className="flex-1 py-3 bg-bg-tertiary text-white rounded-xl font-semibold hover:bg-bg-hover transition-colors border border-border-primary chinese-text"
                      >
                        返回
                      </button>
                      <button
                        onClick={() => handleStartLevel(selectedLevel)}
                        className="flex-1 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent-hover transition-all flex items-center justify-center gap-2 chinese-text"
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
