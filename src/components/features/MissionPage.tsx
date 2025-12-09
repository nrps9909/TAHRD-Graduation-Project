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
      <header className="flex-shrink-0 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span
            className={`px-3 py-1 ${badge.color} text-white text-sm font-medium rounded-full`}
          >
            {badge.text}
          </span>
          {type === 'boss' && (
            <span className="px-3 py-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-sm font-medium rounded-full">
              👑 Boss 關卡
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-white">
          {scene.title}
        </h1>
        <p className="text-gray-400 mt-1">
          {scene.description}
        </p>
      </header>

      {/* Tab 導航 */}
      <div className="flex-shrink-0 flex gap-2 mb-4 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('objective')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'objective'
              ? 'bg-emerald-600 text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Target size={16} />
          任務目標
        </button>
        {hasTemplates && (
          <button
            onClick={() => setActiveTab('hints')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'hints'
                ? 'bg-emerald-600 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Lightbulb size={16} />
            提示模板
          </button>
        )}
        {hasDemo && (
          <button
            onClick={() => setActiveTab('demo')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'demo'
                ? 'bg-emerald-600 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <BookOpen size={16} />
            互動演示
          </button>
        )}
        {hasQuiz && (
          <button
            onClick={() => setActiveTab('quiz')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'quiz'
                ? 'bg-emerald-600 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Award size={16} />
            小測驗
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
              className="space-y-6"
            >
              {/* 任務目標卡片 */}
              <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-700/10 border border-emerald-500/30 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <Target className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-white mb-2">任務目標</h3>
                    <p className="text-gray-300">
                      {content.missionObjective}
                    </p>
                  </div>
                </div>
              </div>

              {/* 說明步驟 */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="font-semibold text-lg text-white mb-4 flex items-center gap-2">
                  <BookOpen size={20} className="text-emerald-400" />
                  學習內容
                </h3>
                <div className="space-y-3">
                  {content.instructions.map((instruction, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-3"
                    >
                      <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-medium flex-shrink-0">
                        {index + 1}
                      </span>
                      <p className="text-gray-300">{instruction}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* 範例區域 */}
              {content.example && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                  <h3 className="font-semibold text-lg text-white mb-4">
                    💡 範例說明
                  </h3>
                  <pre className="whitespace-pre-wrap text-gray-300 text-sm font-mono bg-black/30 p-4 rounded-lg border border-white/5">
                    {content.example}
                  </pre>
                </div>
              )}

              {/* 提示 */}
              {content.tips && content.tips.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6">
                  <h3 className="font-semibold text-amber-400 mb-3">
                    💡 小提示
                  </h3>
                  <ul className="space-y-2">
                    {content.tips.map((tip, index) => (
                      <li
                        key={index}
                        className="text-gray-300 text-sm"
                      >
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 要求列表（挑戰關卡） */}
              {content.requirements && content.requirements.length > 0 && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
                  <h3 className="font-semibold text-blue-400 mb-3">📋 挑戰要求</h3>
                  <ul className="space-y-2">
                    {content.requirements.map((req, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-gray-300 text-sm"
                      >
                        <CheckCircle
                          size={16}
                          className="flex-shrink-0 mt-0.5 text-blue-400"
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
              className="space-y-4"
            >
              <h3 className="font-semibold text-lg text-white mb-4">
                📝 Prompt 模板
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                點擊複製按鈕，直接使用這些模板
              </p>
              {content.promptTemplates!.map(template => (
                <div
                  key={template.id}
                  className="bg-white/5 rounded-xl p-5 border border-white/10"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-semibold text-white">{template.name}</h4>
                    <button
                      onClick={() => copyTemplate(template)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      {copiedTemplate === template.id ? (
                        <Check size={18} className="text-emerald-400" />
                      ) : (
                        <Copy size={18} className="text-gray-400" />
                      )}
                    </button>
                  </div>
                  <p className="text-gray-400 text-sm mb-3">
                    {template.description}
                  </p>
                  <div className="bg-black/40 rounded-lg p-4 text-emerald-400 font-mono text-sm whitespace-pre-wrap border border-white/5">
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
              <h3 className="font-semibold text-lg text-white mb-4">
                🎮 試試看
              </h3>
              <p className="text-gray-400 text-sm mb-4">
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
              className="space-y-6"
            >
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h3 className="font-semibold text-lg text-white mb-4">
                  🎯 檢驗你的理解
                </h3>
                <p className="text-gray-200 text-lg mb-6">
                  {content.quiz!.question}
                </p>

                <div className="space-y-3">
                  {content.quiz!.options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => !quizSubmitted && setQuizAnswer(index)}
                      disabled={quizSubmitted}
                      className={`w-full p-4 rounded-lg text-left transition-all ${
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
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
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
                        <span className="text-gray-200">
                          {option}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                {!quizSubmitted && quizAnswer !== null && (
                  <button
                    onClick={handleQuizSubmit}
                    className="mt-6 w-full py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-500 transition-colors"
                  >
                    確認答案
                  </button>
                )}

                {quizSubmitted && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-6 p-4 rounded-lg ${
                      quizAnswer === content.quiz!.correctAnswer
                        ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                        : 'bg-red-500/20 border border-red-500/30 text-red-300'
                    }`}
                  >
                    <p className="font-semibold mb-2">
                      {quizAnswer === content.quiz!.correctAnswer
                        ? '🎉 答對了！'
                        : '😅 再想想看'}
                    </p>
                    <p className="text-sm opacity-90">
                      {content.quiz!.explanation}
                    </p>
                    {quizAnswer !== content.quiz!.correctAnswer && (
                      <button
                        onClick={handleRetryQuiz}
                        className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
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
      <footer className="flex-shrink-0 mt-6 flex justify-between items-center pt-4 border-t border-white/10">
        {onPrevious ? (
          <button
            onClick={onPrevious}
            className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={20} />
            上一關
          </button>
        ) : (
          <div></div>
        )}

        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          <span className="text-gray-400">+{scene.points} 分</span>
        </div>

        {/* 如果有測驗，必須通過才能進入下一關 */}
        {onNext && (
          hasQuiz ? (
            quizPassed ? (
              <button
                onClick={onNext}
                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-500 transition-colors"
              >
                下一關
                <ChevronRight size={20} />
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('quiz')}
                className="flex items-center gap-2 px-6 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-500 transition-colors"
              >
                完成測驗
                <ChevronRight size={20} />
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
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-500 transition-colors"
            >
              下一關
              <ChevronRight size={20} />
            </button>
          )
        )}
      </footer>
    </div>
  )
}

export default MissionPage
