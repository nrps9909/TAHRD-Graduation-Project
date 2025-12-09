import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Target,
  Lightbulb,
  BookOpen,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Award,
  Copy,
  Check,
} from 'lucide-react'
import ClaudeSimulator from './ClaudeSimulator'
import {
  ClaudeCodeScene,
  PromptTemplate,
} from '@/data/claudeCodeScenes'

interface MissionPageProps {
  scene: ClaudeCodeScene
  onComplete: (score: number) => void
  onNext?: () => void
  onPrevious?: () => void
}

const MissionPage: React.FC<MissionPageProps> = ({
  scene,
  onComplete,
  onNext,
  onPrevious,
}) => {
  const [activeTab, setActiveTab] = useState<
    'objective' | 'hints' | 'demo' | 'quiz'
  >('objective')
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null)
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [quizPassed, setQuizPassed] = useState(false)
  const [sceneCompleted, setSceneCompleted] = useState(false)
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null)

  const { content, type, level } = scene
  const hasQuiz = !!content.quiz
  const hasDemo = !!content.simulatedOutput
  const hasTemplates =
    content.promptTemplates && content.promptTemplates.length > 0

  useEffect(() => {
    setActiveTab('objective')
    setQuizAnswer(null)
    setQuizSubmitted(false)
    setQuizPassed(false)
    setSceneCompleted(false)
    setCopiedTemplate(null)
  }, [scene.id])

  const handleQuizSubmit = () => {
    if (quizAnswer === null) return
    setQuizSubmitted(true)

    if (quizAnswer === content.quiz?.correctAnswer) {
      setQuizPassed(true)
      if (!sceneCompleted) {
        setSceneCompleted(true)
        setTimeout(() => {
          onComplete(scene.points)
        }, 2000)
      }
    }
  }

  const handleRetryQuiz = () => {
    setQuizAnswer(null)
    setQuizSubmitted(false)
  }

  const copyTemplate = (template: PromptTemplate) => {
    navigator.clipboard.writeText(template.template)
    setCopiedTemplate(template.id)
    setTimeout(() => setCopiedTemplate(null), 2000)
  }

  const getLevelBadge = () => {
    const badges: Record<number, { text: string; color: string }> = {
      1: { text: 'Level 1', color: 'bg-emerald-600' },
      2: { text: 'Level 2', color: 'bg-emerald-600' },
      3: { text: 'Level 3', color: 'bg-emerald-600' },
      4: { text: 'Level 4', color: 'bg-emerald-600' },
      5: { text: 'Level 5', color: 'bg-emerald-600' },
      6: { text: 'Boss', color: 'bg-amber-600' },
    }
    return badges[level] || badges[1]
  }

  const badge = getLevelBadge()

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* 標題區 */}
      <header className="flex-shrink-0 mb-4 sm:mb-6">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
          <span
            className={`px-2.5 sm:px-3 py-0.5 sm:py-1 ${badge.color} text-white text-xs sm:text-sm font-medium rounded-full`}
          >
            {badge.text}
          </span>
          {type === 'boss' && (
            <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs sm:text-sm font-medium rounded-full">
              👑 Boss 關卡
            </span>
          )}
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">
          {scene.title}
        </h1>
        <p className="text-gray-400 mt-1 text-sm sm:text-base">
          {scene.description}
        </p>
      </header>

      {/* Tab 導航 */}
      <div className="flex-shrink-0 flex gap-1.5 sm:gap-2 mb-3 sm:mb-4 overflow-x-auto pb-2 -mx-1 px-1">
        <button
          onClick={() => setActiveTab('objective')}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg flex items-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap text-xs sm:text-sm ${
            activeTab === 'objective'
              ? 'bg-emerald-600 text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Target size={14} className="sm:w-4 sm:h-4" />
          <span className="hidden xs:inline">任務目標</span>
          <span className="xs:hidden">目標</span>
        </button>
        {hasTemplates && (
          <button
            onClick={() => setActiveTab('hints')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg flex items-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap text-xs sm:text-sm ${
              activeTab === 'hints'
                ? 'bg-emerald-600 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Lightbulb size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">提示模板</span>
            <span className="xs:hidden">提示</span>
          </button>
        )}
        {hasDemo && (
          <button
            onClick={() => setActiveTab('demo')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg flex items-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap text-xs sm:text-sm ${
              activeTab === 'demo'
                ? 'bg-emerald-600 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <BookOpen size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">互動演示</span>
            <span className="xs:hidden">演示</span>
          </button>
        )}
        {hasQuiz && (
          <button
            onClick={() => setActiveTab('quiz')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg flex items-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap text-xs sm:text-sm ${
              activeTab === 'quiz'
                ? 'bg-emerald-600 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Award size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">小測驗</span>
            <span className="xs:hidden">測驗</span>
          </button>
        )}
      </div>

      {/* 內容區域 */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {/* 任務目標 Tab */}
          {activeTab === 'objective' && (
            <motion.div
              key="objective"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4 sm:space-y-6"
            >
              {/* 任務目標卡片 */}
              <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-700/10 border border-emerald-500/30 rounded-lg sm:rounded-xl p-4 sm:p-6">
                <div className="flex items-start gap-2.5 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <Target className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg text-white mb-1 sm:mb-2">任務目標</h3>
                    <p className="text-gray-300 text-sm sm:text-base">
                      {content.missionObjective}
                    </p>
                  </div>
                </div>
              </div>

              {/* 說明步驟 */}
              <div className="bg-white/5 border border-white/10 rounded-lg sm:rounded-xl p-4 sm:p-6">
                <h3 className="font-semibold text-base sm:text-lg text-white mb-3 sm:mb-4 flex items-center gap-2">
                  <BookOpen size={18} className="sm:w-5 sm:h-5 text-emerald-400" />
                  學習內容
                </h3>
                <div className="space-y-2.5 sm:space-y-3">
                  {content.instructions.map((instruction, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-2.5 sm:gap-3"
                    >
                      <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs sm:text-sm font-medium flex-shrink-0">
                        {index + 1}
                      </span>
                      <p className="text-gray-300 text-sm sm:text-base">{instruction}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* 範例區域 */}
              {content.example && (
                <div className="bg-white/5 border border-white/10 rounded-lg sm:rounded-xl p-4 sm:p-6">
                  <h3 className="font-semibold text-base sm:text-lg text-white mb-3 sm:mb-4">
                    💡 範例說明
                  </h3>
                  <pre className="whitespace-pre-wrap text-gray-300 text-xs sm:text-sm font-mono bg-black/30 p-3 sm:p-4 rounded-lg border border-white/5 overflow-x-auto">
                    {content.example}
                  </pre>
                </div>
              )}

              {/* 提示 */}
              {content.tips && content.tips.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg sm:rounded-xl p-4 sm:p-6">
                  <h3 className="font-semibold text-amber-400 mb-2 sm:mb-3 text-sm sm:text-base">
                    💡 小提示
                  </h3>
                  <ul className="space-y-1.5 sm:space-y-2">
                    {content.tips.map((tip, index) => (
                      <li
                        key={index}
                        className="text-gray-300 text-xs sm:text-sm"
                      >
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 要求列表（挑戰關卡） */}
              {content.requirements && content.requirements.length > 0 && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg sm:rounded-xl p-4 sm:p-6">
                  <h3 className="font-semibold text-blue-400 mb-2 sm:mb-3 text-sm sm:text-base">📋 挑戰要求</h3>
                  <ul className="space-y-1.5 sm:space-y-2">
                    {content.requirements.map((req, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-gray-300 text-xs sm:text-sm"
                      >
                        <CheckCircle
                          size={14}
                          className="sm:w-4 sm:h-4 flex-shrink-0 mt-0.5 text-blue-400"
                        />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          )}

          {/* 提示模板 Tab */}
          {activeTab === 'hints' && hasTemplates && (
            <motion.div
              key="hints"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3 sm:space-y-4"
            >
              <h3 className="font-semibold text-base sm:text-lg text-white mb-3 sm:mb-4">
                📝 Prompt 模板
              </h3>
              <p className="text-gray-400 text-xs sm:text-sm mb-3 sm:mb-4">
                點擊複製按鈕，直接使用這些模板
              </p>
              {content.promptTemplates!.map(template => (
                <div
                  key={template.id}
                  className="bg-white/5 rounded-lg sm:rounded-xl p-4 sm:p-5 border border-white/10"
                >
                  <div className="flex justify-between items-start mb-2 sm:mb-3">
                    <h4 className="font-semibold text-white text-sm sm:text-base">{template.name}</h4>
                    <button
                      onClick={() => copyTemplate(template)}
                      className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      {copiedTemplate === template.id ? (
                        <Check size={16} className="sm:w-[18px] sm:h-[18px] text-emerald-400" />
                      ) : (
                        <Copy size={16} className="sm:w-[18px] sm:h-[18px] text-gray-400" />
                      )}
                    </button>
                  </div>
                  <p className="text-gray-400 text-xs sm:text-sm mb-2 sm:mb-3">
                    {template.description}
                  </p>
                  <div className="bg-black/40 rounded-lg p-3 sm:p-4 text-emerald-400 font-mono text-xs sm:text-sm whitespace-pre-wrap border border-white/5 overflow-x-auto">
                    {template.template}
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* 互動演示 Tab */}
          {activeTab === 'demo' && hasDemo && (
            <motion.div
              key="demo"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h3 className="font-semibold text-base sm:text-lg text-white mb-3 sm:mb-4">
                🎮 試試看
              </h3>
              <p className="text-gray-400 text-xs sm:text-sm mb-3 sm:mb-4">
                在下方模擬器中體驗 Claude 的回應
              </p>
              {content.simulatedOutput && (
                <ClaudeSimulator
                  simulatedOutput={content.simulatedOutput}
                  showTypingEffect={true}
                />
              )}
            </motion.div>
          )}

          {/* 小測驗 Tab */}
          {activeTab === 'quiz' && hasQuiz && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4 sm:space-y-6"
            >
              <div className="bg-white/5 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-white/10">
                <h3 className="font-semibold text-base sm:text-lg text-white mb-3 sm:mb-4">
                  🎯 檢驗你的理解
                </h3>
                <p className="text-gray-200 text-sm sm:text-lg mb-4 sm:mb-6">
                  {content.quiz!.question}
                </p>

                <div className="space-y-2 sm:space-y-3">
                  {content.quiz!.options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => !quizSubmitted && setQuizAnswer(index)}
                      disabled={quizSubmitted}
                      className={`w-full p-3 sm:p-4 rounded-lg text-left transition-all ${
                        quizSubmitted
                          ? index === content.quiz!.correctAnswer
                            ? 'bg-emerald-500/20 border-2 border-emerald-500'
                            : index === quizAnswer
                              ? 'bg-red-500/20 border-2 border-red-500'
                              : 'bg-white/5 border-2 border-transparent'
                          : quizAnswer === index
                            ? 'bg-emerald-500/20 border-2 border-emerald-500'
                            : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <span
                          className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-medium text-xs sm:text-sm ${
                            quizSubmitted
                              ? index === content.quiz!.correctAnswer
                                ? 'bg-emerald-500 text-white'
                                : index === quizAnswer
                                  ? 'bg-red-500 text-white'
                                  : 'bg-white/10 text-gray-400'
                              : quizAnswer === index
                                ? 'bg-emerald-500 text-white'
                                : 'bg-white/10 text-gray-400'
                          }`}
                        >
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className="text-gray-200 text-sm sm:text-base">
                          {option}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                {!quizSubmitted && quizAnswer !== null && (
                  <button
                    onClick={handleQuizSubmit}
                    className="mt-4 sm:mt-6 w-full py-2.5 sm:py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-500 transition-colors text-sm sm:text-base"
                  >
                    確認答案
                  </button>
                )}

                {quizSubmitted && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-4 sm:mt-6 p-3 sm:p-4 rounded-lg ${
                      quizAnswer === content.quiz!.correctAnswer
                        ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                        : 'bg-red-500/20 border border-red-500/30 text-red-300'
                    }`}
                  >
                    <p className="font-semibold mb-1 sm:mb-2 text-sm sm:text-base">
                      {quizAnswer === content.quiz!.correctAnswer
                        ? '🎉 答對了！'
                        : '😅 再想想看'}
                    </p>
                    <p className="text-xs sm:text-sm opacity-90">
                      {content.quiz!.explanation}
                    </p>
                    {quizAnswer !== content.quiz!.correctAnswer && (
                      <button
                        onClick={handleRetryQuiz}
                        className="mt-3 sm:mt-4 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-xs sm:text-sm"
                      >
                        再試一次
                      </button>
                    )}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 底部導航 */}
      <footer className="flex-shrink-0 mt-4 sm:mt-6 flex flex-wrap justify-between items-center gap-2 pt-3 sm:pt-4 border-t border-white/10">
        {onPrevious ? (
          <button
            onClick={onPrevious}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-gray-400 hover:text-white transition-colors text-sm sm:text-base"
          >
            <ChevronLeft size={18} className="sm:w-5 sm:h-5" />
            <span className="hidden xs:inline">上一關</span>
            <span className="xs:hidden">上一</span>
          </button>
        ) : (
          <div></div>
        )}

        <div className="flex items-center gap-1.5 sm:gap-2 order-last sm:order-none w-full sm:w-auto justify-center mt-2 sm:mt-0">
          <Award className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
          <span className="text-gray-400 text-xs sm:text-sm">+{scene.points} 分</span>
        </div>

        {/* 如果有測驗，必須通過才能進入下一關 */}
        {onNext && (
          hasQuiz ? (
            quizPassed ? (
              <button
                onClick={onNext}
                className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-1.5 sm:py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-500 transition-colors text-sm sm:text-base"
              >
                <span className="hidden xs:inline">下一關</span>
                <span className="xs:hidden">下一</span>
                <ChevronRight size={18} className="sm:w-5 sm:h-5" />
              </button>
            ) : activeTab === 'quiz' ? (
              // 已在測驗頁面，顯示提示
              <span className="text-gray-500 text-[10px] sm:text-sm text-right">
                <span className="hidden xs:inline">請完成上方測驗後繼續</span>
                <span className="xs:hidden">完成測驗</span>
              </span>
            ) : (
              <button
                onClick={() => setActiveTab('quiz')}
                className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-1.5 sm:py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-500 transition-colors text-sm sm:text-base"
              >
                <span className="hidden xs:inline">完成測驗</span>
                <span className="xs:hidden">測驗</span>
                <ChevronRight size={18} className="sm:w-5 sm:h-5" />
              </button>
            )
          ) : (
            <button
              onClick={() => {
                if (!sceneCompleted) {
                  setSceneCompleted(true)
                  onComplete(scene.points)
                }
                onNext()
              }}
              className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-1.5 sm:py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-500 transition-colors text-sm sm:text-base"
            >
              <span className="hidden xs:inline">下一關</span>
              <span className="xs:hidden">下一</span>
              <ChevronRight size={18} className="sm:w-5 sm:h-5" />
            </button>
          )
        )}
      </footer>
    </div>
  )
}

export default MissionPage
