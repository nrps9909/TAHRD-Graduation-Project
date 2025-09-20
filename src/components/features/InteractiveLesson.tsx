import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import VirtualTeacher from './VirtualTeacher'
import { useGameStore } from '@/store/gameStore'
import { usePageStatePersistence } from '@/hooks/usePageStatePersistence'

interface Dialogue {
  id: number
  text: string
  mood: 'happy' | 'thinking' | 'excited' | 'surprised' | 'teaching'
  action?: 'ask_question' | 'show_terminal' | 'celebrate'
  choices?: { text: string; nextId: number }[]
}

const lessonDialogues: Dialogue[] = [
  {
    id: 1,
    text: '哈囉！我是 Hijiki 老師！✨ 今天要教你最酷的技能 - 用 AI 來寫程式！不用學複雜的語法喔！🐱',
    mood: 'excited',
  },
  {
    id: 2,
    text: '你知道嗎？現在你只要會描述想做什麼，AI 就能幫你寫程式！這就是 Vibe Coding！',
    mood: 'teaching',
  },
  {
    id: 3,
    text: '讓我問你，你想先學什麼呢？',
    mood: 'thinking',
    action: 'ask_question',
    choices: [
      { text: '學習如何與 AI 溝通！', nextId: 4 },
      { text: '直接開始做專案！', nextId: 20 },
    ],
  },
  // 提示詞路線
  {
    id: 4,
    text: '很好的選擇！與 AI 溝通是最重要的技能！讓我教你提示詞的藝術～',
    mood: 'happy',
  },
  {
    id: 5,
    text: '第一個秘訣：要具體！試試在右邊對 AI 說：『做一個網站』',
    mood: 'teaching',
    action: 'show_terminal',
  },
  {
    id: 6,
    text: '看到了嗎？太模糊了！現在試試：『做一個展示貓咪照片的網站，要有上傳和按讚功能』',
    mood: 'teaching',
    action: 'show_terminal',
  },
  {
    id: 7,
    text: '太棒了！看到差別了嗎？具體的描述會得到更好的結果！🎉',
    mood: 'excited',
  },
  {
    id: 8,
    text: '第二個秘訣：迭代開發！先說：『做一個按鈕』',
    mood: 'teaching',
    action: 'show_terminal',
  },
  {
    id: 9,
    text: '現在改進它！說：『把按鈕改成藍色，加上圓角和點擊動畫』',
    mood: 'teaching',
    action: 'show_terminal',
  },
  {
    id: 10,
    text: '完美！這就是迭代 - 一步步改進到你滿意為止！🎊',
    mood: 'excited',
  },
  {
    id: 11,
    text: '想繼續學習其他技巧嗎？',
    mood: 'thinking',
    action: 'ask_question',
    choices: [
      { text: '學習除錯技巧！', nextId: 12 },
      { text: '開始做專案！', nextId: 20 },
    ],
  },
  {
    id: 12,
    text: '除錯很重要！當程式出錯時，要清楚描述問題。試試說：『按鈕點擊沒反應，Console顯示button is null』',
    mood: 'teaching',
    action: 'show_terminal',
  },
  {
    id: 13,
    text: '太棒了！你學會了基本的 AI 溝通技巧！現在你已經是 Vibe Coding 初學者了！🏆',
    mood: 'excited',
    action: 'celebrate',
  },
  // 專案實作路線
  {
    id: 20,
    text: '好！直接實作最有趣！讓我們做一個真正的專案！',
    mood: 'excited',
  },
  {
    id: 21,
    text: '我們來做一個待辦清單！這是很實用的工具。首先要規劃功能～',
    mood: 'teaching',
  },
  {
    id: 22,
    text: '第一步：請 AI 做基本版本。說：『做一個簡單的待辦清單，可以新增項目』',
    mood: 'teaching',
    action: 'show_terminal',
  },
  {
    id: 23,
    text: '很好！現在有基本功能了！讓我們加入更多功能～📦',
    mood: 'happy',
  },
  {
    id: 24,
    text: '第二步：加入刪除功能。說：『加上刪除按鈕，讓每個項目可以刪除』',
    mood: 'teaching',
    action: 'show_terminal',
  },
  {
    id: 25,
    text: '太棒了！功能越來越完整了！',
    mood: 'excited',
  },
  {
    id: 26,
    text: '第三步：加入完成狀態。說：『加上打勾功能，標記項目完成』',
    mood: 'teaching',
    action: 'show_terminal',
  },
  {
    id: 27,
    text: '很好！現在是個完整的待辦清單了！',
    mood: 'happy',
  },
  {
    id: 28,
    text: '最後一步：美化介面！說：『美化設計，用溫暖的顏色和可愛的樣式』',
    mood: 'teaching',
    action: 'show_terminal',
  },
  {
    id: 29,
    text: '太厲害了！你用迭代方式完成了一個完整的應用！',
    mood: 'excited',
  },
  {
    id: 30,
    text: '記住這個流程：規劃 → 基本功能 → 逐步增強 → 美化優化',
    mood: 'teaching',
  },
  {
    id: 31,
    text: '恭喜你！🎉 你已經掌握了 Vibe Coding 的核心：清楚溝通、迭代開發、專案思維！',
    mood: 'excited',
    action: 'celebrate',
  },
  {
    id: 32,
    text: '想挑戰更大的專案嗎？',
    mood: 'thinking',
    action: 'ask_question',
    choices: [
      { text: '好！我想做個人網站！', nextId: 33 },
      { text: '我想學更多技巧', nextId: 35 },
    ],
  },
  {
    id: 33,
    text: '太好了！個人網站是很棒的專案！說：『幫我做個人網站，先做自我介紹頁面』',
    mood: 'excited',
    action: 'show_terminal',
  },
  {
    id: 34,
    text: '哇！你正在建立自己的網站！記得用迭代方式慢慢完善它！🌟',
    mood: 'excited',
    action: 'celebrate',
  },
  {
    id: 35,
    text: '記住這些技巧：具體描述、迭代開發、清楚回饋、保持耐心。AI 是你的程式設計師！',
    mood: 'happy',
  },
  {
    id: 36,
    text: '課程完成！記住：你是創意總監，AI 是你的團隊！一起創造奇蹟吧！🚀',
    mood: 'excited',
    action: 'celebrate',
  },
]

interface InteractiveLessonProps {
  sceneId?: string
}

const InteractiveLesson = ({
  sceneId = 'default',
}: InteractiveLessonProps = {}) => {
  const { unlockAchievement, setWaitingForAI, setAIResponseReceived } =
    useGameStore()

  // Persistent state for lesson progress - use sceneId to create unique key for each lesson
  const persistenceKey = `interactiveLesson_${sceneId}`
  const [lessonState, setLessonState] = usePageStatePersistence(
    persistenceKey,
    {
      currentDialogueId: 1,
      lessonProgress: 0,
      completedDialogues: [] as number[],
    }
  )

  const [currentDialogue, setCurrentDialogue] = useState(() => {
    const dialogue = lessonDialogues.find(
      d => d.id === lessonState.currentDialogueId
    )
    return dialogue || lessonDialogues[0]
  })
  const [showChoices, setShowChoices] = useState(false)
  const [terminalHighlight, setTerminalHighlight] = useState(false)

  useEffect(() => {
    const dialogue = lessonDialogues.find(
      d => d.id === lessonState.currentDialogueId
    )
    if (dialogue) {
      setCurrentDialogue(dialogue)
      setShowChoices(!!dialogue.choices)

      // Handle actions
      if (dialogue.action === 'show_terminal') {
        setTerminalHighlight(true)
        setWaitingForAI(true) // Start waiting for AI response
        setAIResponseReceived(false) // Reset AI response state
        setTimeout(() => setTerminalHighlight(false), 3000)
      } else {
        setWaitingForAI(false) // Not waiting for AI for other actions
      }

      if (
        dialogue.action === 'celebrate' &&
        !lessonState.completedDialogues.includes(dialogue.id)
      ) {
        unlockAchievement('complete-tutorial')
        // Trigger confetti or celebration animation
        celebrate()
        // Mark this dialogue as completed
        setLessonState(prev => ({
          ...prev,
          completedDialogues: [...prev.completedDialogues, dialogue.id],
        }))
      }
    } else {
      // If dialogue not found, reset to first dialogue
      console.warn(
        `Dialogue with id ${lessonState.currentDialogueId} not found, resetting to first`
      )
      setLessonState(prev => ({
        ...prev,
        currentDialogueId: 1,
        lessonProgress: 0,
      }))
      setCurrentDialogue(lessonDialogues[0])
    }

    // Update progress
    const progress =
      (lessonState.currentDialogueId / lessonDialogues.length) * 100
    if (Math.abs(progress - lessonState.lessonProgress) > 0.1) {
      setLessonState(prev => ({ ...prev, lessonProgress: progress }))
    }
  }, [
    lessonState.currentDialogueId,
    lessonState.completedDialogues,
    unlockAchievement,
    setLessonState,
  ])

  const handleNext = useCallback(() => {
    const nextId = lessonState.currentDialogueId + 1
    if (nextId <= lessonDialogues.length) {
      const nextDialogue = lessonDialogues.find(d => d.id === nextId)
      if (nextDialogue) {
        setLessonState(prev => ({ ...prev, currentDialogueId: nextId }))
      }
    }
  }, [lessonState.currentDialogueId, setLessonState])

  const handleChoice = useCallback(
    (nextId: number) => {
      const nextDialogue = lessonDialogues.find(d => d.id === nextId)
      if (nextDialogue) {
        setLessonState(prev => ({ ...prev, currentDialogueId: nextId }))
        setShowChoices(false)
      } else {
        console.error(`Invalid dialogue id: ${nextId}`)
      }
    },
    [setLessonState]
  )

  const celebrate = () => {
    // Simple celebration effect
    const colors = ['🎉', '🎊', '✨', '🌟']
    for (let i = 0; i < 20; i++) {
      setTimeout(() => {
        const emoji = document.createElement('div')
        emoji.textContent = colors[Math.floor(Math.random() * colors.length)]
        emoji.className = 'celebration-emoji'
        emoji.style.left = Math.random() * window.innerWidth + 'px'
        document.body.appendChild(emoji)
        setTimeout(() => emoji.remove(), 3000)
      }, i * 100)
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Progress Bar - Cat themed */}
      <div className="bg-cat-pink/20 h-3 relative rounded-full overflow-hidden flex-shrink-0">
        <motion.div
          className="h-full bg-gradient-to-r from-cat-pink to-cat-purple rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${lessonState.lessonProgress}%` }}
          transition={{ duration: 0.5 }}
        />
        {/* Paw prints decoration */}
        <div className="absolute inset-0 flex items-center justify-end pr-2">
          <span className="text-xs opacity-60">🐾</span>
        </div>
      </div>

      {/* Main Content - Responsive height */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 lg:p-8 relative overflow-hidden min-h-0">
        {/* Cat-themed background decoration - Responsive sizes */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-5 md:top-10 left-5 md:left-10 text-5xl md:text-7xl lg:text-8xl animate-pulse">
            🐱
          </div>
          <div className="absolute bottom-5 md:bottom-10 right-5 md:right-10 text-5xl md:text-7xl lg:text-8xl animate-bounce">
            🐾
          </div>
          <div className="absolute top-1/2 left-5 md:left-20 text-4xl md:text-5xl lg:text-6xl animate-ping">
            💕
          </div>
          <div className="absolute top-10 md:top-20 right-10 md:right-20 text-4xl md:text-6xl lg:text-7xl">
            🌸
          </div>
          <div className="absolute bottom-10 md:bottom-20 left-1/3 text-4xl md:text-5xl lg:text-6xl animate-pulse">
            🎀
          </div>
        </div>

        {/* Content wrapper with responsive layout */}
        <div className="w-full max-w-4xl flex flex-col items-center gap-4 md:gap-6">
          {/* Virtual Teacher - Responsive container */}
          <div className="w-full flex justify-center flex-shrink-0">
            <div className="w-full max-w-3xl">
              <VirtualTeacher
                currentDialogue={currentDialogue?.text || ''}
                mood={currentDialogue?.mood || 'happy'}
                onNext={!showChoices ? handleNext : undefined}
                requiresAIResponse={currentDialogue?.action === 'show_terminal'}
              />
            </div>
          </div>

          {/* Choice Buttons - Responsive height */}
          <div className="min-h-[60px] md:min-h-[80px] flex items-center justify-center w-full flex-shrink-0">
            <AnimatePresence mode="wait">
              {showChoices && currentDialogue.choices && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full sm:w-auto px-4 sm:px-0"
                >
                  {currentDialogue.choices.map((choice, index) => (
                    <button
                      key={index}
                      onClick={() => handleChoice(choice.nextId)}
                      className="bg-gradient-to-r from-cat-pink to-cat-purple hover:from-cat-pink-dark hover:to-cat-purple-dark text-white px-4 md:px-6 py-2 md:py-3 rounded-full font-bold transition-all transform hover:scale-105 shadow-lg text-sm md:text-base chinese-text"
                    >
                      {choice.text}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Terminal Highlight Indicator */}
        {terminalHighlight && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute bottom-4 right-4 bg-gradient-to-r from-cat-yellow to-cat-orange text-cat-dark px-5 py-2.5 rounded-full font-bold flex items-center gap-2 shadow-lg"
          >
            <span className="animate-pulse">👉</span>
            <span className="font-chinese">看右邊的終端機！</span>
          </motion.div>
        )}

        {/* Lesson Counter - Cat themed */}
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur text-cat-dark px-4 py-2 rounded-full text-sm font-bold shadow-lg border border-cat-pink/30 flex items-center gap-2">
          <span>📖</span>
          <span className="font-chinese">
            課程 {lessonState.currentDialogueId} / {lessonDialogues.length}
          </span>
          <span>🐈</span>
        </div>
      </div>
    </div>
  )
}

export default InteractiveLesson
