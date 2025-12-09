import { useState } from 'react'
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
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null)

  const { content, type, level } = scene
  const hasQuiz = !!content.quiz
  const hasDemo = !!content.simulatedOutput
  const hasTemplates =
    content.promptTemplates && content.promptTemplates.length > 0

  const handleQuizSubmit = () => {
    if (quizAnswer === null) return
    setQuizSubmitted(true)

    if (quizAnswer === content.quiz?.correctAnswer) {
      // 答對了
      setTimeout(() => {
        onComplete(scene.points)
      }, 2000)
    }
  }

  const copyTemplate = (template: PromptTemplate) => {
    navigator.clipboard.writeText(template.template)
    setCopiedTemplate(template.id)
    setTimeout(() => setCopiedTemplate(null), 2000)
  }

  const getLevelBadge = () => {
    const badges: Record<number, { text: string; color: string }> = {
      1: { text: 'Level 1', color: 'bg-green-500' },
      2: { text: 'Level 2', color: 'bg-blue-500' },
      3: { text: 'Level 3', color: 'bg-yellow-500' },
      4: { text: 'Level 4', color: 'bg-orange-500' },
      5: { text: 'Level 5', color: 'bg-purple-500' },
      6: { text: 'Boss', color: 'bg-red-500' },
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
            className={`px-3 py-1 ${badge.color} text-white text-sm font-bold rounded-full`}
          >
            {badge.text}
          </span>
          {type === 'boss' && (
            <span className="px-3 py-1 bg-gradient-to-r from-yellow-500 to-red-500 text-white text-sm font-bold rounded-full animate-pulse">
              👑 Boss 關卡
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-text-primary chinese-text">
          {scene.title}
        </h1>
        <p className="text-text-secondary mt-1 chinese-text">
          {scene.description}
        </p>
      </header>

      {/* Tab 導航 */}
      <div className="flex-shrink-0 flex gap-2 mb-4 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('objective')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'objective'
              ? 'bg-cat-pink text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <Target size={16} />
          任務目標
        </button>
        {hasTemplates && (
          <button
            onClick={() => setActiveTab('hints')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'hints'
                ? 'bg-cat-pink text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Lightbulb size={16} />
            提示模板
          </button>
        )}
        {hasDemo && (
          <button
            onClick={() => setActiveTab('demo')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'demo'
                ? 'bg-cat-pink text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <BookOpen size={16} />
            互動演示
          </button>
        )}
        {hasQuiz && (
          <button
            onClick={() => setActiveTab('quiz')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'quiz'
                ? 'bg-cat-pink text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-6 text-white">
                <div className="flex items-start gap-3">
                  <Target className="w-6 h-6 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-lg mb-2">任務目標</h3>
                    <p className="text-white/90 chinese-text">
                      {content.missionObjective}
                    </p>
                  </div>
                </div>
              </div>

              {/* 說明步驟 */}
              <div className="bg-white rounded-xl p-6 shadow-md">
                <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                  <BookOpen size={20} className="text-cat-pink" />
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
                      <span className="w-6 h-6 rounded-full bg-cat-pink/20 text-cat-pink flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {index + 1}
                      </span>
                      <p className="text-gray-700 chinese-text">{instruction}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* 範例區域 */}
              {content.example && (
                <div className="bg-gray-100 rounded-xl p-6">
                  <h3 className="font-bold text-lg text-gray-800 mb-4">
                    💡 範例說明
                  </h3>
                  <pre className="whitespace-pre-wrap text-gray-700 text-sm font-mono bg-white p-4 rounded-lg">
                    {content.example}
                  </pre>
                </div>
              )}

              {/* 提示 */}
              {content.tips && content.tips.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                  <h3 className="font-bold text-yellow-800 mb-3">
                    💡 小提示
                  </h3>
                  <ul className="space-y-2">
                    {content.tips.map((tip, index) => (
                      <li
                        key={index}
                        className="text-yellow-700 text-sm chinese-text"
                      >
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 要求列表（挑戰關卡） */}
              {content.requirements && content.requirements.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                  <h3 className="font-bold text-blue-800 mb-3">📋 挑戰要求</h3>
                  <ul className="space-y-2">
                    {content.requirements.map((req, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-blue-700 text-sm chinese-text"
                      >
                        <CheckCircle
                          size={16}
                          className="flex-shrink-0 mt-0.5"
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
              <h3 className="font-bold text-lg text-gray-800 mb-4">
                📝 Prompt 模板
              </h3>
              <p className="text-gray-600 text-sm mb-4 chinese-text">
                點擊複製按鈕，直接使用這些模板
              </p>
              {content.promptTemplates!.map(template => (
                <div
                  key={template.id}
                  className="bg-white rounded-xl p-5 shadow-md border border-gray-200"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-bold text-gray-800">{template.name}</h4>
                    <button
                      onClick={() => copyTemplate(template)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      {copiedTemplate === template.id ? (
                        <Check size={18} className="text-green-500" />
                      ) : (
                        <Copy size={18} className="text-gray-500" />
                      )}
                    </button>
                  </div>
                  <p className="text-gray-600 text-sm mb-3 chinese-text">
                    {template.description}
                  </p>
                  <div className="bg-gray-900 rounded-lg p-4 text-green-400 font-mono text-sm whitespace-pre-wrap">
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
              <h3 className="font-bold text-lg text-gray-800 mb-4">
                🎮 試試看
              </h3>
              <p className="text-gray-600 text-sm mb-4 chinese-text">
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
              <div className="bg-white rounded-xl p-6 shadow-md">
                <h3 className="font-bold text-lg text-gray-800 mb-4">
                  🎯 檢驗你的理解
                </h3>
                <p className="text-gray-700 text-lg mb-6 chinese-text">
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
                            ? 'bg-green-100 border-2 border-green-500'
                            : index === quizAnswer
                              ? 'bg-red-100 border-2 border-red-500'
                              : 'bg-gray-100 border-2 border-transparent'
                          : quizAnswer === index
                            ? 'bg-cat-pink/20 border-2 border-cat-pink'
                            : 'bg-gray-100 border-2 border-transparent hover:bg-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                            quizSubmitted
                              ? index === content.quiz!.correctAnswer
                                ? 'bg-green-500 text-white'
                                : index === quizAnswer
                                  ? 'bg-red-500 text-white'
                                  : 'bg-gray-300 text-gray-600'
                              : quizAnswer === index
                                ? 'bg-cat-pink text-white'
                                : 'bg-gray-300 text-gray-600'
                          }`}
                        >
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className="text-gray-700 chinese-text">
                          {option}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                {!quizSubmitted && quizAnswer !== null && (
                  <button
                    onClick={handleQuizSubmit}
                    className="mt-6 w-full py-3 bg-cat-pink text-white rounded-lg font-bold hover:bg-cat-pink/90 transition-colors"
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
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    <p className="font-bold mb-2">
                      {quizAnswer === content.quiz!.correctAnswer
                        ? '🎉 答對了！'
                        : '😅 再想想看'}
                    </p>
                    <p className="text-sm chinese-text">
                      {content.quiz!.explanation}
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 底部導航 */}
      <footer className="flex-shrink-0 mt-6 flex justify-between items-center pt-4 border-t border-gray-200">
        {onPrevious ? (
          <button
            onClick={onPrevious}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ChevronLeft size={20} />
            上一關
          </button>
        ) : (
          <div></div>
        )}

        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-yellow-500" />
          <span className="text-gray-600">+{scene.points} 分</span>
        </div>

        {onNext && (
          <button
            onClick={() => {
              onComplete(scene.points)
              onNext()
            }}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-cat-pink to-cat-beige text-white rounded-lg font-bold hover:opacity-90 transition-opacity"
          >
            下一關
            <ChevronRight size={20} />
          </button>
        )}
      </footer>
    </div>
  )
}

export default MissionPage
