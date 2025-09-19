import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Zap, Target, Heart, Sparkles } from 'lucide-react'

export type FeedbackType =
  | 'points' // 獲得積分
  | 'progress' // 進度更新
  | 'skill' // 技能獲得
  | 'encouragement' // 鼓勵
  | 'milestone' // 里程碑
  | 'combo' // 連擊
  | 'perfect' // 完美表現

export interface FeedbackData {
  id: string
  type: FeedbackType
  message: string
  value?: number
  color?: string
  position?: { x: number; y: number }
}

interface InstantFeedbackProps {
  feedbacks: FeedbackData[]
  onFeedbackComplete: (id: string) => void
}

const InstantFeedback: React.FC<InstantFeedbackProps> = ({
  feedbacks,
  onFeedbackComplete,
}) => {
  const getFeedbackIcon = (type: FeedbackType) => {
    switch (type) {
      case 'points':
        return <Plus className="w-4 h-4" />
      case 'progress':
        return <Target className="w-4 h-4" />
      case 'skill':
        return <Zap className="w-4 h-4" />
      case 'encouragement':
        return <Heart className="w-4 h-4" />
      case 'milestone':
        return <Sparkles className="w-4 h-4" />
      case 'combo':
        return <span className="text-sm font-bold">🔥</span>
      case 'perfect':
        return <span className="text-sm font-bold">⭐</span>
      default:
        return <Plus className="w-4 h-4" />
    }
  }

  const getFeedbackStyles = (type: FeedbackType) => {
    switch (type) {
      case 'points':
        return 'bg-gradient-to-r from-green-400 to-green-600 text-white'
      case 'progress':
        return 'bg-gradient-to-r from-blue-400 to-blue-600 text-white'
      case 'skill':
        return 'bg-gradient-to-r from-purple-400 to-purple-600 text-white'
      case 'encouragement':
        return 'bg-gradient-to-r from-pink-400 to-pink-600 text-white'
      case 'milestone':
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white'
      case 'combo':
        return 'bg-gradient-to-r from-red-400 to-red-600 text-white'
      case 'perfect':
        return 'bg-gradient-to-r from-indigo-400 to-indigo-600 text-white'
      default:
        return 'bg-gradient-to-r from-gray-400 to-gray-600 text-white'
    }
  }

  const getAnimation = (type: FeedbackType) => {
    switch (type) {
      case 'points':
        return {
          initial: { scale: 0, y: 0, opacity: 0 },
          animate: { scale: 1, y: -50, opacity: 1 },
          exit: { scale: 0.8, y: -100, opacity: 0 },
        }
      case 'combo':
        return {
          initial: { scale: 0, rotate: -180, opacity: 0 },
          animate: { scale: 1.1, rotate: 0, opacity: 1 },
          exit: { scale: 0, rotate: 180, opacity: 0 },
        }
      case 'perfect':
        return {
          initial: { scale: 0, y: 20, opacity: 0 },
          animate: {
            scale: 1.2,
            y: 0,
            opacity: 1,
            rotate: 0,
          },
          exit: { scale: 0, y: -20, opacity: 0 },
        }
      default:
        return {
          initial: { scale: 0, opacity: 0 },
          animate: { scale: 1, opacity: 1 },
          exit: { scale: 0, opacity: 0 },
        }
    }
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      <AnimatePresence>
        {feedbacks.map(feedback => {
          const animation = getAnimation(feedback.type)

          return (
            <motion.div
              key={feedback.id}
              initial={animation.initial}
              animate={animation.animate}
              exit={animation.exit}
              transition={{
                type: 'spring',
                damping: 15,
                stiffness: 300,
                duration: 0.6,
              }}
              className="absolute"
              style={{
                left: feedback.position?.x || '50%',
                top: feedback.position?.y || '50%',
                transform: 'translate(-50%, -50%)',
              }}
              onAnimationComplete={() => {
                // 延遲移除以確保動畫完成
                setTimeout(() => onFeedbackComplete(feedback.id), 1000)
              }}
            >
              <div
                className={`
                ${getFeedbackStyles(feedback.type)}
                px-4 py-2 rounded-full shadow-lg font-bold text-sm
                flex items-center gap-2 pointer-events-none
                border-2 border-white/20
              `}
              >
                {getFeedbackIcon(feedback.type)}
                <span>{feedback.message}</span>
                {feedback.value && (
                  <span className="ml-1 font-black">+{feedback.value}</span>
                )}
              </div>

              {/* 額外的視覺效果 */}
              {feedback.type === 'perfect' && (
                <motion.div
                  initial={{ scale: 0, rotate: 0 }}
                  animate={{
                    scale: [0, 1.5, 0],
                    rotate: 360,
                    opacity: [0, 1, 0],
                  }}
                  transition={{ duration: 1.2 }}
                  className="absolute inset-0 border-2 border-yellow-400 rounded-full"
                />
              )}

              {feedback.type === 'combo' && (
                <motion.div
                  initial={{ scale: 1 }}
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: [1, 0.7, 1],
                  }}
                  transition={{
                    duration: 0.3,
                    repeat: 3,
                  }}
                  className="absolute -inset-2 bg-red-400/20 rounded-full"
                />
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

// Hook for managing instant feedback
export const useInstantFeedback = () => {
  const [feedbacks, setFeedbacks] = useState<FeedbackData[]>([])

  const showFeedback = (
    type: FeedbackType,
    message: string,
    options?: {
      value?: number
      position?: { x: number; y: number }
    }
  ) => {
    const feedback: FeedbackData = {
      id: `feedback-${Date.now()}-${Math.random()}`,
      type,
      message,
      value: options?.value,
      position: options?.position,
    }

    setFeedbacks(prev => [...prev, feedback])
  }

  const removeFeedback = (id: string) => {
    setFeedbacks(prev => prev.filter(f => f.id !== id))
  }

  // 便捷方法
  const showPoints = (points: number, position?: { x: number; y: number }) => {
    showFeedback('points', '獲得積分', { value: points, position })
  }

  const showProgress = (
    message: string,
    position?: { x: number; y: number }
  ) => {
    showFeedback('progress', message, { position })
  }

  const showSkill = (
    skillName: string,
    position?: { x: number; y: number }
  ) => {
    showFeedback('skill', `學會了 ${skillName}`, { position })
  }

  const showEncouragement = (
    message: string,
    position?: { x: number; y: number }
  ) => {
    showFeedback('encouragement', message, { position })
  }

  const showMilestone = (
    message: string,
    position?: { x: number; y: number }
  ) => {
    showFeedback('milestone', message, { position })
  }

  const showCombo = (count: number, position?: { x: number; y: number }) => {
    showFeedback('combo', `${count} 連擊！`, { position })
  }

  const showPerfect = (
    message: string = '完美！',
    position?: { x: number; y: number }
  ) => {
    showFeedback('perfect', message, { position })
  }

  return {
    feedbacks,
    removeFeedback,
    showFeedback,
    showPoints,
    showProgress,
    showSkill,
    showEncouragement,
    showMilestone,
    showCombo,
    showPerfect,
  }
}

export default InstantFeedback
