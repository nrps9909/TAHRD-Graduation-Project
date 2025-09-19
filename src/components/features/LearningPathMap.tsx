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
    <div className="w-full max-w-6xl mx-auto p-4 h-full flex flex-col">
      {/* 整體進度概覽 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-4 mb-4 text-white flex-shrink-0"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              🎯 {unifiedLearningPath.title}
            </h2>
            <p className="opacity-90">{unifiedLearningPath.description}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">
              {progressStats.progressPercentage}%
            </div>
            <div className="text-sm opacity-80">完成進度</div>
          </div>
        </div>

        {/* 進度條 */}
        <div className="bg-white/20 rounded-full h-3 mb-4">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressStats.progressPercentage}%` }}
            transition={{ duration: 1, delay: 0.5 }}
            className="bg-white rounded-full h-3"
          />
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xl font-bold">
              {progressStats.completedStages}/{progressStats.totalStages}
            </div>
            <div className="text-sm opacity-80">完成階段</div>
          </div>
          <div>
            <div className="text-xl font-bold">
              {progressStats.completedCount}/{progressStats.totalScenes}
            </div>
            <div className="text-sm opacity-80">完成課程</div>
          </div>
          <div>
            <div className="text-xl font-bold">{currentScore}</div>
            <div className="text-sm opacity-80">獲得積分</div>
          </div>
        </div>
      </motion.div>

      {/* 推薦下一步 */}
      {nextRecommendedScene && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-green-400 to-blue-500 rounded-lg p-3 mb-4 text-white flex-shrink-0"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="w-6 h-6" />
              <div>
                <h3 className="font-bold">📚 建議下一步</h3>
                <p className="text-sm opacity-90">
                  繼續你的學習旅程，解鎖新技能！
                </p>
              </div>
            </div>
            <button
              onClick={() => onStartStage?.(nextRecommendedScene)}
              className="bg-white text-gray-800 px-4 py-2 rounded-full font-bold hover:bg-gray-100 transition-colors flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              開始學習
            </button>
          </div>
        </motion.div>
      )}

      {/* 學習路徑地圖 - 新的響應式設計 */}
      <div className="bg-gray-900 rounded-xl p-4 relative overflow-hidden flex-1">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-pink-900/20" />

        <h3 className="text-lg font-bold text-white mb-4 relative z-10 text-center">
          🗺️ 學習路徑地圖
        </h3>

        {/* 響應式網格布局 */}
        <div className="relative z-10 h-full overflow-y-auto">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
            {visualizationData.map((stage, index) => (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative cursor-pointer group ${
                  !stage.isAvailable ? 'opacity-50' : 'hover:scale-105'
                } transition-all duration-200`}
                onClick={() => handleStageClick(stage, stage.isAvailable)}
              >
                {/* 連接箭頭 - 僅在有下一個階段時顯示 */}
                {index < visualizationData.length - 1 && (
                  <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 z-20 lg:block hidden">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.1 + 0.3 }}
                      className={`w-4 h-4 ${
                        stage.isCompleted ? 'text-green-400' : 'text-gray-500'
                      }`}
                    >
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </motion.div>
                  </div>
                )}

                {/* 階段卡片 */}
                <div
                  className={`
                  bg-gray-800 rounded-lg p-3 border-2 transition-all duration-200
                  ${
                    stage.isCompleted
                      ? 'border-green-400 bg-green-900/20'
                      : stage.isCurrent
                        ? 'border-blue-400 bg-blue-900/20 ring-2 ring-blue-400/50'
                        : stage.isAvailable
                          ? 'border-purple-400 bg-purple-900/20'
                          : 'border-gray-600 bg-gray-800/50'
                  }
                `}
                >
                  {/* 頂部狀態列 */}
                  <div className="flex items-center justify-between mb-2">
                    {/* 狀態圖標 */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                        stage.isCompleted
                          ? 'bg-green-500 text-white'
                          : stage.isCurrent
                            ? 'bg-blue-500 text-white animate-pulse'
                            : stage.isAvailable
                              ? 'bg-purple-500 text-white'
                              : 'bg-gray-600 text-gray-300'
                      }`}
                    >
                      {stage.isCompleted ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : !stage.isAvailable ? (
                        <Lock className="w-4 h-4" />
                      ) : (
                        <span className="text-xs">{stage.icon}</span>
                      )}
                    </div>

                    {/* 時間估計 */}
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      {stage.estimatedTime}分
                    </div>
                  </div>

                  {/* 標題和描述 */}
                  <h4 className="text-white font-bold text-sm mb-1 leading-tight">
                    {stage.title.split('：')[1] || stage.title}
                  </h4>

                  {/* 進度條 */}
                  {stage.progress > 0 && (
                    <div className="w-full bg-gray-700 rounded-full h-1.5 mb-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${stage.progress}%` }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className={`h-1.5 rounded-full ${
                          stage.isCompleted ? 'bg-green-400' : 'bg-blue-400'
                        }`}
                      />
                    </div>
                  )}

                  {/* 階段編號 */}
                  <div className="text-xs text-gray-500">階段 {index + 1}</div>

                  {/* 當前階段指示器 */}
                  {stage.isCurrent && (
                    <div className="absolute -top-1 -right-1 bg-yellow-400 text-black w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold">
                      !
                    </div>
                  )}

                  {/* 可開始指示器 */}
                  {stage.isAvailable &&
                    !stage.isCompleted &&
                    !stage.isCurrent && (
                      <div className="absolute top-2 right-2">
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-ping"></div>
                      </div>
                    )}
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
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 px-4 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all flex items-center justify-center gap-2"
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
