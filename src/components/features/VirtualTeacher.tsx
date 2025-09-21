import { useState, useEffect, lazy, Suspense, memo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/store/gameStore'
import { useLive2DSize } from '@/hooks/useLive2DSize'

// Lazy load Live2D component
const Live2DPixi6 = lazy(() => import('./Live2DPixi6'))

interface VirtualTeacherProps {
  currentDialogue: string
  mood?: 'happy' | 'thinking' | 'excited' | 'surprised' | 'teaching'
  onNext?: () => void
  requiresAIResponse?: boolean
}

const VirtualTeacher = memo(
  ({
    currentDialogue = '',
    mood = 'happy',
    onNext,
    requiresAIResponse = false,
  }: VirtualTeacherProps) => {
    const [isTyping, setIsTyping] = useState(false)
    const [displayedText, setDisplayedText] = useState('')
    const [showNextButton, setShowNextButton] = useState(false)
    const [triggerMotion, setTriggerMotion] = useState(false)
    const { waitingForAI, aiResponseReceived } = useGameStore()
    const live2dSize = useLive2DSize('game')

    // Typing effect
    useEffect(() => {
      // Ensure we have a valid string
      let dialogue = currentDialogue

      // Handle various invalid cases
      if (dialogue === undefined || dialogue === null) {
        dialogue = ''
      }

      // Convert to string and trim
      dialogue = String(dialogue).trim()

      // Check if it's actually the word "undefined"
      if (dialogue === 'undefined' || dialogue === 'null' || !dialogue) {
        setDisplayedText('')
        setIsTyping(false)
        setShowNextButton(false)
        return
      }

      // Reset state for new dialogue
      setIsTyping(true)
      setDisplayedText('')
      setShowNextButton(false)

      // Trigger talking animation when dialogue changes
      setTriggerMotion(true)
      // Reset trigger after a short delay to allow re-triggering
      setTimeout(() => setTriggerMotion(false), 100)

      // Convert string to array to handle all Unicode characters including emojis
      const characters = [...dialogue]
      let currentIndex = 0
      let accumulatedText = ''

      const typingInterval = setInterval(() => {
        if (currentIndex < characters.length) {
          accumulatedText += characters[currentIndex]
          setDisplayedText(accumulatedText)
          currentIndex++
        } else {
          clearInterval(typingInterval)
          setIsTyping(false)
          setShowNextButton(true)
        }
      }, 30)

      return () => {
        clearInterval(typingInterval)
      }
    }, [currentDialogue])

    const getAvatarAnimation = useCallback(() => {
      // No continuous animation - keep avatar static
      return {}
    }, [])

    const handleNext = useCallback(() => {
      if (typeof onNext === 'function') {
        onNext()
      }
    }, [onNext])

    return (
      <div className="w-full h-full flex items-center justify-center p-6">
        {/* 中央對齊的垂直佈局 */}
        <div className="flex flex-col items-center justify-center w-full max-w-4xl h-full gap-8">
          {/* 上部：貓咪區域 - 放大並置中 */}
          <div className="flex-shrink-0 flex flex-col items-center">
            <motion.div className="relative" animate={getAvatarAnimation()}>
              {/* Live2D Character - 放大尺寸 */}
              <div className="flex items-center justify-center">
                <Suspense
                  fallback={
                    <div
                      style={{
                        width: Math.max(live2dSize.width * 1.5, 320),
                        height: Math.max(live2dSize.height * 1.5, 320),
                      }}
                      className="flex items-center justify-center"
                    >
                      <div className="text-cat-pink text-xl animate-pulse">
                        載入中...
                      </div>
                    </div>
                  }
                >
                  <Live2DPixi6
                    modelPath="/models/hijiki/hijiki.model3.json"
                    fallbackImage="/models/hijiki/hijiki.2048/texture_00.png"
                    width={Math.max(live2dSize.width * 1.5, 320)}
                    height={Math.max(live2dSize.height * 1.5, 320)}
                    scale={live2dSize.scale * 1.2}
                    triggerMotion={triggerMotion}
                    mood={mood}
                  />
                </Suspense>
              </div>
            </motion.div>

            {/* Name Badge - 優化樣式 */}
            <div className="mt-4 bg-gradient-to-r from-cat-pink to-cat-purple text-white px-6 py-3 rounded-full text-base font-bold shadow-lg flex items-center gap-3">
              <span>🐾</span>
              <span className="font-chinese">黑噗噗同學</span>
              <span>😺</span>
            </div>
          </div>

          {/* 下部：對話框區域 - 改為水平居中 */}
          <div className="flex-1 flex flex-col justify-start items-center w-full max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="relative w-full"
            >
              {/* 對話框 - 更大更清晰 */}
              <div
                className="bg-gradient-to-br from-white/95 to-cat-cream/90 backdrop-blur rounded-3xl p-6 shadow-2xl border-2 border-cat-pink/50 relative mx-auto"
                style={{ boxShadow: '0 10px 40px rgba(248, 187, 217, 0.4)' }}
              >
                {/* Cat ear bubble tail - 指向上方貓咪 */}
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[16px] border-b-white/95" />
                </div>

                {/* Message content - 更大的文字和更好的可讀性 */}
                <div className="text-text-primary font-medium text-xl leading-relaxed whitespace-pre-wrap break-words max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-cat-pink scrollbar-track-transparent pr-2 chinese-text text-center">
                  {displayedText && displayedText !== 'undefined'
                    ? displayedText
                    : ''}
                  {isTyping && (
                    <motion.span
                      animate={{ opacity: [1, 0] }}
                      transition={{ repeat: Infinity, duration: 0.5 }}
                      className="ml-1 inline-block"
                    >
                      ▋
                    </motion.span>
                  )}
                </div>
              </div>
            </motion.div>

            {/* 按鈕區域 - 放在對話框下方 */}
            <div className="mt-4 flex items-center justify-center">
              <AnimatePresence mode="wait">
                {/* AI 等待訊息 */}
                {showNextButton &&
                  requiresAIResponse &&
                  waitingForAI &&
                  !aiResponseReceived && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-3 text-rose-500 font-medium"
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: 'linear',
                        }}
                      >
                        <span className="text-xl">✨</span>
                      </motion.div>
                      <span className="chinese-text text-sm lg:text-base">
                        請向右邊的 AI 助手詢問問題...
                      </span>
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <span className="text-xl">👉</span>
                      </motion.div>
                    </motion.div>
                  )}

                {/* 繼續按鈕 */}
                {showNextButton &&
                  onNext &&
                  (!requiresAIResponse ||
                    !waitingForAI ||
                    aiResponseReceived) && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleNext}
                      className="bg-gradient-to-r from-cat-pink to-cat-purple hover:from-cat-pink-dark hover:to-cat-purple-dark text-white px-6 py-3 rounded-full font-bold transition-all duration-300 shadow-lg flex items-center gap-2"
                    >
                      <span className="font-chinese">繼續</span>
                      <motion.span
                        animate={{ x: [0, 3, 0] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        🐾
                      </motion.span>
                    </motion.button>
                  )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    )
  }
)

VirtualTeacher.displayName = 'VirtualTeacher'

export default VirtualTeacher
