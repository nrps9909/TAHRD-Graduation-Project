import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle,
  Lock,
  ChevronLeft,
  Map,
  BookOpen,
  Clock,
  Star,
  X,
} from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import {
  LearningPathManager,
  getLearningPathVisualization,
  LearningStage,
} from '@/data/unifiedLearningPath'
import { Achievement } from '../ui/AchievementNotification'

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

interface LearningPathSidebarProps {
  isOpen: boolean
  onToggle: () => void
  onStartStage?: (stageId: string) => void
  triggerFeedback: TriggerFeedback
}

const LearningPathSidebar: React.FC<LearningPathSidebarProps> = ({
  isOpen,
  onToggle,
  onStartStage,
  triggerFeedback,
}) => {
  const { completedScenes } = useGameStore()
  const visualizationData = getLearningPathVisualization(completedScenes)
  const progressStats = LearningPathManager.getProgressStats(completedScenes)
  const [selectedStage, setSelectedStage] = React.useState<any>(null)

  const handleStageClick = (stage: any) => {
    if (!stage.isAvailable && !stage.isCompleted) {
      triggerFeedback.showEncouragement('🔒 完成前面的階段才能解鎖這個！', {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      })
      return
    }

    // 允許重新學習已完成的章節
    if (stage.isCompleted) {
      triggerFeedback.showProgress('🔄 重新學習這個章節！', {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      })
    } else {
      triggerFeedback.showPerfect('🚀 開始新的學習冒險！', {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      })
    }

    setSelectedStage(stage)
  }

  return (
    <>
      {/* 浮動開關按鈕 */}
      <motion.button
        onClick={onToggle}
        className={`fixed ${isOpen ? 'left-80' : 'left-4'} top-1/2 -translate-y-1/2 z-[101] bg-gradient-to-r from-cat-pink to-cat-beige text-white p-3 rounded-r-full shadow-lg hover:shadow-xl transition-all duration-300`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronLeft className="w-5 h-5" />
          ) : (
            <Map className="w-5 h-5" />
          )}
          {!isOpen && (
            <span className="font-bold text-sm chinese-text">學習地圖</span>
          )}
        </div>
      </motion.button>

      {/* 側邊欄主體 */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* 背景遮罩 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-[99] md:hidden"
              onClick={onToggle}
            />

            {/* 側邊欄內容 */}
            <motion.div
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{
                type: 'spring',
                damping: 20,
                stiffness: 300,
                mass: 0.8,
              }}
              className="fixed left-0 top-0 h-full w-80 bg-gradient-to-b from-cat-cream/98 to-white/98 backdrop-blur-xl border-r-4 border-cat-pink/50 z-[100] flex flex-col shadow-2xl"
            >
              {/* 標題區 */}
              <div className="bg-gradient-to-r from-cat-pink to-cat-beige p-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white chinese-text flex items-center gap-2">
                      <Map className="w-5 h-5" />
                      學習地圖
                    </h2>
                    <p className="text-sm text-white/90 mt-1 chinese-text">
                      與貓咪老師一起冒險！
                    </p>
                  </div>
                  <button
                    onClick={onToggle}
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                </div>

                {/* 總進度 */}
                <div className="mt-4 bg-white/20 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/90 text-sm chinese-text">
                      總體進度
                    </span>
                    <span className="text-white font-bold text-lg">
                      {progressStats.progressPercentage}%
                    </span>
                  </div>
                  <div className="bg-white/30 rounded-full h-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${progressStats.progressPercentage}%`,
                      }}
                      transition={{ duration: 1 }}
                      className="bg-white rounded-full h-2"
                    />
                  </div>
                </div>
              </div>

              {/* 學習階段列表 */}
              <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-cat-pink/50 scrollbar-track-transparent">
                <div className="space-y-3">
                  {visualizationData.map((stage, index) => (
                    <motion.div
                      key={stage.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: index * 0.03,
                        type: 'spring',
                        stiffness: 500,
                        damping: 30,
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedStage(stage)}
                      className={`relative p-3 rounded-xl transition-all duration-200 ${
                        stage.isCompleted
                          ? 'bg-cat-beige/20 border border-cat-beige/30 cursor-pointer hover:bg-cat-beige/30'
                          : stage.isCurrent
                            ? 'bg-cat-pink/20 border border-cat-pink/30 shadow-md cursor-pointer'
                            : stage.isAvailable
                              ? 'bg-white/50 border border-cat-cream/30 hover:shadow-md hover:bg-cat-cream/20 cursor-pointer'
                              : 'bg-gray-100 border border-gray-200 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      {/* 階段圖標和狀態 */}
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            stage.isCompleted
                              ? 'bg-cat-beige text-white'
                              : stage.isCurrent
                                ? 'bg-cat-pink text-white animate-pulse'
                                : stage.isAvailable
                                  ? 'bg-cat-cream text-text-primary'
                                  : 'bg-gray-300 text-gray-500'
                          }`}
                        >
                          {stage.isCompleted ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : !stage.isAvailable ? (
                            <Lock className="w-4 h-4" />
                          ) : (
                            <span className="text-lg">{stage.icon}</span>
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="mb-1">
                            <h4 className="text-sm font-bold text-text-primary chinese-text mb-1">
                              {stage.title.split('：')[1] || stage.title}
                            </h4>
                            <div className="flex items-center gap-2 flex-wrap">
                              {stage.isCurrent && (
                                <span className="bg-cat-pink text-white px-2 py-0.5 rounded-full text-xs font-bold chinese-text">
                                  進行中
                                </span>
                              )}
                              {stage.isCompleted && (
                                <span className="bg-cat-beige text-white px-2 py-0.5 rounded-full text-xs font-bold chinese-text">
                                  已完成 · 可重玩
                                </span>
                              )}
                              {!stage.isAvailable && !stage.isCompleted && (
                                <span className="bg-gray-400 text-white px-2 py-0.5 rounded-full text-xs font-bold chinese-text">
                                  未解鎖
                                </span>
                              )}
                            </div>
                          </div>

                          {stage.description && (
                            <p className="text-xs text-gray-600 mb-2 chinese-text line-clamp-2">
                              {stage.description}
                            </p>
                          )}

                          {/* 迷你進度條 */}
                          {stage.progress > 0 && (
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${stage.progress}%` }}
                                transition={{
                                  duration: 0.6,
                                  delay: index * 0.02,
                                  ease: 'easeOut',
                                }}
                                className={`h-1.5 rounded-full ${
                                  stage.isCompleted
                                    ? 'bg-cat-beige'
                                    : 'bg-cat-pink'
                                }`}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* 底部統計 */}
              <div className="p-4 bg-gradient-to-r from-cat-cream/50 to-cat-pink/20 border-t border-cat-pink/30 flex-shrink-0">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-2xl font-bold text-cat-pink">
                      {progressStats.completedStages}
                    </p>
                    <p className="text-xs text-text-secondary chinese-text">
                      已完成
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-cat-beige">
                      {visualizationData.filter(s => s.isCurrent).length}
                    </p>
                    <p className="text-xs text-text-secondary chinese-text">
                      進行中
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-400">
                      {progressStats.totalStages -
                        progressStats.completedStages -
                        visualizationData.filter(s => s.isCurrent).length}
                    </p>
                    <p className="text-xs text-text-secondary chinese-text">
                      未開始
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 章節詳細資訊彈窗 */}
      <AnimatePresence>
        {selectedStage && (
          <>
            {/* 背景遮罩 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-[102]"
              onClick={() => setSelectedStage(null)}
            />

            {/* 彈窗內容 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-white rounded-2xl shadow-2xl z-[103] overflow-hidden"
            >
              <div className="bg-gradient-to-r from-cat-pink to-cat-beige p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/30 rounded-full flex items-center justify-center">
                      <span className="text-2xl">{selectedStage.icon}</span>
                    </div>
                    <h3 className="text-xl font-bold text-white chinese-text">
                      {selectedStage.title.split('：')[1] ||
                        selectedStage.title}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedStage(null)}
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* 章節描述 */}
                <div>
                  <p className="text-gray-700 chinese-text">
                    {selectedStage.description}
                  </p>
                </div>

                {/* 學習內容 */}
                <div>
                  <h4 className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-3 chinese-text">
                    <BookOpen className="w-5 h-5 text-cat-pink" />
                    將會學到：
                  </h4>
                  <div className="space-y-2">
                    {selectedStage.skills.map(
                      (skill: string, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-cat-yellow rounded-full" />
                          <span className="text-sm text-gray-600 chinese-text">
                            {skill}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* 其他資訊 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-cat-cream/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-cat-pink" />
                      <span className="text-sm font-medium text-gray-700 chinese-text">
                        預計時間
                      </span>
                    </div>
                    <p className="text-lg font-bold text-gray-800">
                      {selectedStage.estimatedTime} 分鐘
                    </p>
                  </div>
                  <div className="bg-cat-yellow/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Star className="w-4 h-4 text-cat-beige" />
                      <span className="text-sm font-medium text-gray-700 chinese-text">
                        獎勵積分
                      </span>
                    </div>
                    <p className="text-lg font-bold text-gray-800">
                      +{selectedStage.rewards.points}
                    </p>
                  </div>
                </div>

                {/* 行動按鈕 */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setSelectedStage(null)}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-colors chinese-text"
                  >
                    關閉
                  </button>
                  {(selectedStage.isAvailable || selectedStage.isCompleted) && (
                    <button
                      onClick={() => {
                        handleStageClick(selectedStage)
                        setSelectedStage(null)
                      }}
                      className="flex-1 bg-gradient-to-r from-cat-pink to-cat-beige text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all chinese-text"
                    >
                      {selectedStage.isCompleted ? '重新學習' : '開始學習'}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export default LearningPathSidebar
