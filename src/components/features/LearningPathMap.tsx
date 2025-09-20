import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, Lock, Clock, Play, Target, Zap } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import {
  unifiedLearningPath,
  LearningPathManager,
  getLearningPathVisualization,
  LearningStage,
} from '@/data/unifiedLearningPath'
import { Achievement } from './AchievementNotification'
import { usePageStatePersistence } from '@/hooks/usePageStatePersistence'

interface TriggerFeedback {
  showPoints: (points: number, position?: { x: number; y: number }) => void
  showProgress: (message: string, position?: { x: number; y: number }) => void
  showSkill: (skillName: string, position?: { x: number; y: number }) => void
  showEncouragement: (
    message: string,
    position?: { x: number; y: number }
  ) => void
  showCombo: (count: number, position?: { x: number; y: number }) => void
  showPerfect: (message?: string, position?: { x: number; y: number }) => void
  showAchievement: (achievement: Achievement) => void
}

interface LearningPathMapProps {
  onStartStage?: (stageId: string) => void
  triggerFeedback: TriggerFeedback
}

const LearningPathMap: React.FC<LearningPathMapProps> = ({
  onStartStage,
  triggerFeedback,
}) => {
  const { completedScenes, currentScore } = useGameStore()
  const [mapState, setMapState] = usePageStatePersistence('learningPathMap', {
    selectedStageId: null as string | null,
  })

  // Get the actual selected stage object from the persisted ID
  const visualizationData = getLearningPathVisualization(completedScenes)
  const selectedStage = mapState.selectedStageId
    ? visualizationData.find(stage => stage.id === mapState.selectedStageId) ||
      null
    : null

  const progressStats = LearningPathManager.getProgressStats(completedScenes)
  const nextRecommendedScene =
    LearningPathManager.getNextRecommendedScene(completedScenes)

  const handleStageClick = (stage: LearningStage, isAvailable: boolean) => {
    if (!isAvailable) {
      triggerFeedback.showEncouragement('🔒 完成前面的階段才能解鎖這個！', {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      })
      return
    }
    triggerFeedback.showProgress('👀 查看階段詳情', {
      x: window.innerWidth / 2,
      y: 100,
    })
    setMapState(prev => ({ ...prev, selectedStageId: stage.id }))
  }

  const handleStartStage = (stageId: string) => {
    triggerFeedback.showPerfect('🚀 開始新的學習冒險！', {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    })
    triggerFeedback.showPoints(25, {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2 + 50,
    })
    onStartStage?.(stageId)
    setMapState(prev => ({ ...prev, selectedStageId: null }))
  }

  const handleCloseStageDetail = () => {
    setMapState(prev => ({ ...prev, selectedStageId: null }))
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6 h-full flex flex-col">
      {/* 簡化的進度概覽 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-cat-pink to-cat-beige rounded-2xl p-6 mb-8 text-white flex-shrink-0"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2 chinese-text">
              🎯 AI 程式設計之路
            </h2>
            <p className="text-lg opacity-90 chinese-text">
              與貓咪老師一起學習程式設計！
            </p>
          </div>
          <div className="text-center">
            <div className="text-5xl font-bold mb-2">
              {progressStats.progressPercentage}%
            </div>
            <div className="text-base opacity-90 chinese-text">學習進度</div>
          </div>
        </div>

        {/* 簡化的進度條 */}
        <div className="bg-white/20 rounded-full h-4 mt-6">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressStats.progressPercentage}%` }}
            transition={{ duration: 1, delay: 0.5 }}
            className="bg-white rounded-full h-4"
          />
        </div>
      </motion.div>

      {/* 推薦下一步 - 更顯眼 */}
      {nextRecommendedScene && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-cat-yellow to-cat-pink rounded-2xl p-6 mb-8 text-text-primary flex-shrink-0 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-full">
                <Target className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold chinese-text">
                  🚀 準備好了嗎？
                </h3>
                <p className="text-base opacity-90 chinese-text">
                  繼續你的學習旅程，掌握新技能！
                </p>
              </div>
            </div>
            <button
              onClick={() => onStartStage?.(nextRecommendedScene)}
              className="bg-white text-text-primary px-8 py-4 rounded-full text-lg font-bold hover:scale-105 transition-all duration-200 shadow-lg chinese-text"
            >
              開始學習 ✨
            </button>
          </div>
        </motion.div>
      )}

      {/* 簡約的學習路徑 */}
      <div className="bg-white rounded-2xl p-6 relative flex-1 shadow-lg border border-cat-pink/20 flex flex-col min-h-0">
        <h3 className="text-2xl font-bold text-text-primary mb-6 text-center chinese-text flex-shrink-0">
          📚 學習階段
        </h3>

        {/* 線性路徑設計 - 添加滾動容器 */}
        <div className="relative flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-cat-pink/50 scrollbar-track-transparent">
          {/* 連接線 */}
          <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-cat-pink to-cat-beige rounded-full"></div>

          <div className="space-y-6 pb-4">
            {visualizationData.map((stage, index) => (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                {/* 圓形狀態指示器 */}
                <div className="relative flex items-center">
                  <div
                    className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                      stage.isCompleted
                        ? 'bg-cat-beige text-white shadow-lg'
                        : stage.isCurrent
                          ? 'bg-cat-pink text-white shadow-lg animate-pulse'
                          : stage.isAvailable
                            ? 'bg-cat-cream text-text-primary shadow-md hover:scale-110'
                            : 'bg-gray-300 text-gray-500'
                    }`}
                    onClick={() => handleStageClick(stage, stage.isAvailable)}
                  >
                    {stage.isCompleted ? (
                      <CheckCircle className="w-8 h-8" />
                    ) : !stage.isAvailable ? (
                      <Lock className="w-6 h-6" />
                    ) : (
                      <span className="text-2xl">{stage.icon}</span>
                    )}
                  </div>

                  {/* 階段信息 */}
                  <div className="ml-6 flex-1">
                    <div
                      className={`p-4 rounded-2xl transition-all duration-200 cursor-pointer ${
                        stage.isCompleted
                          ? 'bg-cat-beige/20 border border-cat-beige/30'
                          : stage.isCurrent
                            ? 'bg-cat-pink/20 border border-cat-pink/30 shadow-md'
                            : stage.isAvailable
                              ? 'bg-cat-cream/20 border border-cat-cream/30 hover:shadow-md'
                              : 'bg-gray-100 border border-gray-200 opacity-60'
                      }`}
                      onClick={() => handleStageClick(stage, stage.isAvailable)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-lg font-bold text-text-primary chinese-text">
                          {stage.title.split('：')[1] || stage.title}
                        </h4>
                        {stage.isCurrent && (
                          <span className="bg-cat-pink text-white px-3 py-1 rounded-full text-xs font-bold chinese-text">
                            進行中
                          </span>
                        )}
                        {stage.isCompleted && (
                          <span className="bg-cat-beige text-white px-3 py-1 rounded-full text-xs font-bold chinese-text">
                            已完成
                          </span>
                        )}
                      </div>

                      {stage.description && (
                        <p className="text-sm text-gray-600 mb-3 chinese-text">
                          {stage.description}
                        </p>
                      )}

                      {/* 進度條 */}
                      {stage.progress > 0 && (
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${stage.progress}%` }}
                            transition={{ duration: 0.8, delay: index * 0.1 }}
                            className={`h-2 rounded-full ${
                              stage.isCompleted ? 'bg-cat-beige' : 'bg-cat-pink'
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* 階段詳情彈窗 */}
      <AnimatePresence>
        {selectedStage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={handleCloseStageDetail}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-xl p-6 max-w-md w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">{selectedStage.icon}</div>
                <h3 className="text-xl font-bold text-gray-800">
                  {selectedStage.title}
                </h3>
                <p className="text-gray-600 mt-2">
                  {selectedStage.description}
                </p>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">預計時間：</span>
                  <span className="font-semibold">
                    {selectedStage.estimatedTime} 分鐘
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">難度：</span>
                  <span
                    className={`font-semibold ${
                      selectedStage.difficulty === 'beginner'
                        ? 'text-green-600'
                        : selectedStage.difficulty === 'intermediate'
                          ? 'text-yellow-600'
                          : 'text-red-600'
                    }`}
                  >
                    {selectedStage.difficulty === 'beginner'
                      ? '初級'
                      : selectedStage.difficulty === 'intermediate'
                        ? '中級'
                        : '高級'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">獎勵積分：</span>
                  <span className="font-semibold text-purple-600">
                    +{selectedStage.rewards.points}
                  </span>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-gray-800 mb-2">
                  📚 將學習到：
                </h4>
                <ul className="space-y-1">
                  {selectedStage.skills.map((skill, index) => (
                    <li
                      key={index}
                      className="flex items-center gap-2 text-sm text-gray-600"
                    >
                      <Zap className="w-4 h-4 text-yellow-500" />
                      {skill}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCloseStageDetail}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  稍後再說
                </button>
                <button
                  onClick={() => handleStartStage(selectedStage.id)}
                  className="flex-1 bg-gradient-to-r from-cat-pink to-cat-beige text-white py-2 px-4 rounded-lg font-semibold hover:from-cat-pink-dark hover:to-cat-beige transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  開始學習
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default LearningPathMap
