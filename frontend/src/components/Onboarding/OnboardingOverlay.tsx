import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react'

// 打字機效果 Hook
const useTypewriter = (text: string, speed: number = 30, enabled: boolean = true) => {
  const [displayText, setDisplayText] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setDisplayText(text)
      setIsTyping(false)
      return
    }

    setDisplayText('')
    setIsTyping(true)
    let index = 0

    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1))
        index++
      } else {
        setIsTyping(false)
        clearInterval(timer)
      }
    }, speed)

    return () => clearInterval(timer)
  }, [text, speed, enabled])

  return { displayText, isTyping }
}
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation } from '@apollo/client'
import {
  UPDATE_ONBOARDING_PROGRESS,
  COMPLETE_ONBOARDING
} from '../../graphql/onboarding'
import {
  getOnboardingStep,
  isLastStep,
  isFirstStep,
  getTotalSteps,
  type OnboardingStep
} from '../../config/onboardingSteps'
import { useOnboardingStore } from '../../stores/onboardingStore'
import './OnboardingOverlay.css'

interface OnboardingOverlayProps {
  currentStep: number
  onComplete: () => void
}

// 白噗噗頭像 - 動森風格小圖示
const MascotAvatar: React.FC<{ mood?: string }> = ({ mood: _mood = 'happy' }) => {
  return (
    <div className="ac-mascot">
      <span className="ac-mascot-icon">🐱</span>
    </div>
  )
}

// 計算提示框位置 - 動森風格底部對話框（保留供未來使用）
const _calculateTooltipPosition = (): { className: string; style: React.CSSProperties } => {
  return {
    className: 'onboarding-tooltip tooltip-bottom',
    style: {}  // CSS 會處理位置
  }
}
void _calculateTooltipPosition // 暫時標記為已使用

export const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({
  currentStep,
  onComplete
}) => {
  const [activeStep, setActiveStep] = useState<OnboardingStep | undefined>(
    getOnboardingStep(currentStep)
  )
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null)
  const [_spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null)
  const [_isTargetClicked, setIsTargetClicked] = useState(false)
  // 暫時標記為已使用（這些狀態用於未來功能擴展）
  void _spotlightRect
  void _isTargetClicked
  const overlayRef = useRef<HTMLDivElement>(null)
  const retryCountRef = useRef(0)
  const maxRetries = 5

  // 從 store 獲取用戶操作狀態
  const { userActions, setCurrentStep: setStoreStep, isInMainView, isMinimized, setMinimized } = useOnboardingStore()

  const [updateProgress] = useMutation(UPDATE_ONBOARDING_PROGRESS)
  const [completeOnboarding] = useMutation(COMPLETE_ONBOARDING)

  // 更新當前步驟
  useEffect(() => {
    const step = getOnboardingStep(currentStep)
    setActiveStep(step)
    setIsTargetClicked(false)
    retryCountRef.current = 0

    // 查找目標元素的函數（支持重試）
    const findAndHighlightTarget = () => {
      if (!step?.target) {
        setTargetElement(null)
        setSpotlightRect(null)
        return
      }

      const element = document.querySelector(step.target) as HTMLElement

      if (element) {
        setTargetElement(element)
        const rect = element.getBoundingClientRect()
        setSpotlightRect(rect)
        retryCountRef.current = 0
      } else {
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++
          setTimeout(findAndHighlightTarget, 500)
        } else {
          setTargetElement(null)
          setSpotlightRect(null)
        }
      }
    }

    setTimeout(findAndHighlightTarget, 100)
  }, [currentStep])

  // 監聽窗口大小變化
  useEffect(() => {
    if (!targetElement) return

    const updateSpotlight = () => {
      const rect = targetElement.getBoundingClientRect()
      setSpotlightRect(rect)
    }

    window.addEventListener('resize', updateSpotlight)
    window.addEventListener('scroll', updateSpotlight)

    return () => {
      window.removeEventListener('resize', updateSpotlight)
      window.removeEventListener('scroll', updateSpotlight)
    }
  }, [targetElement])

  // 檢查當前步驟的操作是否已完成
  const isActionDone = useMemo(() => {
    switch (currentStep) {
      case 1: // 白噗噗 - 需要實際上傳知識
        return userActions.knowledgeUploaded
      case 2: // 黑噗噗 - 需要實際發問
        return userActions.hijikiQueried
      case 4: // 知識寶庫
        return userActions.databaseClicked
      case 5: // 小地圖導覽
        return userActions.minimapClicked
      default:
        return true // 其他步驟自動完成
    }
  }, [currentStep, userActions])

  // 檢查是否需要返回主畫面（步驟 1, 2, 4, 5 需要）
  const needsReturnToMain = useMemo(() => {
    return [1, 2, 4, 5].includes(currentStep)
  }, [currentStep])

  // 檢查當前步驟是否完全完成（操作完成 + 已返回主畫面）
  const isStepActionCompleted = useMemo(() => {
    if (!isActionDone) return false
    if (needsReturnToMain && !isInMainView) return false
    return true
  }, [isActionDone, needsReturnToMain, isInMainView])

  // 獲取步驟提示文字
  const getActionPrompt = useCallback(() => {
    switch (currentStep) {
      case 1:
        if (!userActions.knowledgeUploaded) {
          return '💬 點擊白貓，然後輸入任意文字送出'
        }
        if (!isInMainView) {
          return '🏠 關閉對話框，返回島嶼畫面繼續'
        }
        return '✅ 太棒了！你成功記錄了第一則知識'
      case 2:
        if (!userActions.hijikiQueried) {
          return '💬 點擊黑貓，然後輸入問題送出'
        }
        if (!isInMainView) {
          return '🏠 關閉對話框，返回島嶼畫面繼續'
        }
        return '✅ 很好！你成功向黑噗噗提問了'
      case 4:
        if (!userActions.databaseClicked) {
          return '🔮 點擊中央的水晶球'
        }
        if (!isInMainView) {
          return '🏠 返回島嶼畫面繼續教學'
        }
        return '✅ 成功進入知識寶庫！'
      case 5:
        if (!userActions.minimapClicked) {
          return '🗺️ 點擊右下角小地圖中的島嶼'
        }
        if (!isInMainView) {
          return '點擊左上角返回按鈕返回主頁面'
        }
        return '✅ 太棒了！你學會使用小地圖了'
      default:
        return null
    }
  }, [currentStep, userActions, isInMainView])

  const handleNext = async () => {
    if (isLastStep(currentStep)) {
      try {
        await completeOnboarding()
        onComplete()
      } catch (error) {
        console.error('完成新手教學失敗:', error)
      }
    } else {
      try {
        const nextStep = currentStep + 1
        await updateProgress({ variables: { step: nextStep } })
        setStoreStep(nextStep)
        setActiveStep(getOnboardingStep(nextStep))
      } catch (error) {
        console.error('更新教學進度失敗:', error)
      }
    }
  }

  const handlePrevious = async () => {
    if (!isFirstStep(currentStep)) {
      try {
        const prevStep = currentStep - 1
        await updateProgress({ variables: { step: prevStep } })
        setStoreStep(prevStep)
        setActiveStep(getOnboardingStep(prevStep))
      } catch (error) {
        console.error('返回上一步失敗:', error)
      }
    }
  }

  // 監聯目標元素的點擊事件
  useEffect(() => {
    if (!targetElement || activeStep?.action !== 'custom') return

    const handleElementClick = () => {
      setIsTargetClicked(true)
    }

    targetElement.addEventListener('click', handleElementClick)
    return () => {
      targetElement.removeEventListener('click', handleElementClick)
    }
  }, [targetElement, activeStep])

  if (!activeStep) return null

  // 判斷是否為全螢幕目標（canvas 等）- 保留供未來擴展
  const _isFullscreenTarget = activeStep.target === 'canvas'
  void _isFullscreenTarget

  // 打字機效果 - 處理純文字（移除 markdown）
  const plainDescription = activeStep.description
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\n/g, ' ')
  const { displayText, isTyping } = useTypewriter(plainDescription, 25, true)

  // 最小化狀態 - 顯示小圖示
  if (isMinimized) {
    return (
      <div className="onboarding-overlay onboarding-minimized">
        <motion.button
          className="ac-minimized-btn"
          onClick={() => setMinimized(false)}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          title="展開教學"
        >
          <span className="ac-minimized-icon">🐱</span>
          <span className="ac-minimized-badge">{currentStep + 1}/{getTotalSteps()}</span>
        </motion.button>
      </div>
    )
  }

  return (
    <div className="onboarding-overlay" ref={overlayRef}>
      {/* 動森風格對話框 - 底部左右置中 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          className="ac-dialogue-box"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {/* 角色名牌 */}
          <div className="ac-name-tag">
            <MascotAvatar />
            <span className="ac-name">白噗噗</span>
            <span className="ac-progress">{currentStep + 1}/{getTotalSteps()}</span>
            {/* 最小化按鈕 */}
            <button
              className="ac-minimize-btn"
              onClick={() => setMinimized(true)}
              title="稍後再看"
            >
              ▼
            </button>
          </div>

          {/* 對話內容區 */}
          <div className="ac-dialogue-content">
            <p className="ac-dialogue-text">
              {displayText}
              {isTyping && <span className="ac-cursor">|</span>}
            </p>
          </div>

          {/* 操作提示 */}
          {getActionPrompt() && !isTyping && (
            <div className={`ac-action-hint ${
              isStepActionCompleted ? 'completed' :
              (isActionDone && !isInMainView) ? 'waiting' : ''
            }`}>
              {getActionPrompt()}
            </div>
          )}

          {/* 按鈕區 - 強制完成，無跳過選項 */}
          {!isTyping && (
            <div className="ac-buttons">
              {!isFirstStep(currentStep) && (
                <button className="ac-btn ac-btn-prev" onClick={handlePrevious}>
                  ◀
                </button>
              )}
              <button
                className={`ac-btn ac-btn-next ${!isStepActionCompleted ? 'disabled' : ''}`}
                onClick={isStepActionCompleted ? handleNext : undefined}
                disabled={!isStepActionCompleted}
              >
                {isLastStep(currentStep) ? '開始！' : '▶'}
              </button>
            </div>
          )}

          {/* 點擊繼續提示 */}
          {isTyping && (
            <div className="ac-skip-typing" onClick={() => {}}>
              點擊加速...
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default OnboardingOverlay
