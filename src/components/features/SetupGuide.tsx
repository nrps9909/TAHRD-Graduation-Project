import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Terminal,
  Check,
  Copy,
  DollarSign,
  Sparkles,
} from 'lucide-react'

interface SetupGuideProps {
  isOpen: boolean
  onClose: () => void
}

const setupSteps = [
  {
    id: 1,
    title: '安裝 Node.js',
    subtitle: '程式執行環境',
    icon: '📦',
    bgColor: 'bg-apple-blue/10',
    description: 'Node.js 是執行 Claude Code 的必要環境，就像手機需要作業系統一樣。',
    instructions: [
      '前往 nodejs.org 官網',
      '下載 LTS（長期支援）版本',
      '執行安裝程式，一直按「下一步」即可',
      '安裝完成後重新開機',
    ],
    link: 'https://nodejs.org',
    linkText: '前往 Node.js 官網',
    verification: {
      command: 'node --version',
      expected: '顯示版本號碼表示安裝成功',
    },
  },
  {
    id: 2,
    title: '註冊 Anthropic 帳號',
    subtitle: '取得 API 金鑰',
    icon: '🔑',
    bgColor: 'bg-apple-purple/10',
    description: 'Anthropic 是 Claude 的開發公司，你需要註冊帳號並取得 API 金鑰才能使用 Claude Code。',
    instructions: [
      '前往 console.anthropic.com',
      '使用 Google 帳號或 Email 註冊',
      '前往 Settings → API Keys',
      '點擊「Create Key」建立金鑰',
      '複製並妥善保存金鑰（只會顯示一次！）',
    ],
    link: 'https://console.anthropic.com',
    linkText: '前往 Anthropic Console',
    tip: '金鑰格式類似：sk-ant-api03-xxxxx...',
  },
  {
    id: 3,
    title: '儲值額度',
    subtitle: '按使用量計費',
    icon: '💳',
    bgColor: 'bg-apple-green/10',
    description: 'Claude Code 採用按量計費，建議先儲值 $5 美金試用。',
    instructions: [
      '在 Anthropic Console 中前往 Settings → Billing',
      '點擊「Add Credits」',
      '輸入金額（最低 $5 美金）',
      '使用信用卡或 Google Pay 付款',
    ],
    pricing: [
      { model: 'Sonnet', price: '$3', unit: '/ 百萬 token', desc: '日常推薦' },
      { model: 'Opus', price: '$15', unit: '/ 百萬 token', desc: '複雜任務' },
    ],
    tip: '一般輕度使用，每月約 $5-10 美金',
  },
  {
    id: 4,
    title: '安裝 Claude Code',
    subtitle: 'AI 助手核心',
    icon: '🤖',
    bgColor: 'bg-apple-orange/10',
    description: '在終端機執行一行指令即可安裝 Claude Code。',
    instructions: [
      '開啟終端機（Mac: Terminal / Windows: PowerShell）',
      '輸入以下指令並按 Enter',
      '等待安裝完成',
      '輸入 claude 啟動，首次需要登入',
    ],
    command: 'npm install -g @anthropic-ai/claude-code',
    verification: {
      command: 'claude --version',
      expected: '顯示版本號碼表示安裝成功',
    },
  },
  {
    id: 5,
    title: '安裝 Cursor（選用）',
    subtitle: 'AI 程式碼編輯器',
    icon: '✨',
    bgColor: 'bg-apple-violet/10',
    description: 'Cursor 是一個整合 AI 的程式碼編輯器，可以搭配 Claude Code 使用，讓你更方便地檢視程式碼。',
    instructions: [
      '前往 cursor.com 下載',
      '執行安裝程式',
      '免費版即可開始使用',
      '之後可在 Cursor 的終端機中使用 Claude Code',
    ],
    link: 'https://cursor.com',
    linkText: '前往 Cursor 官網',
    optional: true,
  },
]

const SetupGuide: React.FC<SetupGuideProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null)

  const step = setupSteps[currentStep]

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedCommand(text)
    setTimeout(() => setCopiedCommand(null), 2000)
  }

  const handleNext = () => {
    if (currentStep < setupSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="glass rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-apple-xl max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-apple-gray-50">環境架設教學</h2>
              <p className="text-apple-gray-400 text-sm mt-1">
                步驟 {currentStep + 1} / {setupSteps.length}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5 text-apple-gray-300" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="h-1 bg-white/10 rounded-full mb-8 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / setupSteps.length) * 100}%` }}
              className="h-full bg-gradient-to-r from-apple-blue to-apple-purple rounded-full"
            />
          </div>

          {/* Step Content */}
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Step Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-16 h-16 rounded-2xl ${step.bgColor} flex items-center justify-center text-3xl`}>
                {step.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold text-apple-gray-50">{step.title}</h3>
                  {step.optional && (
                    <span className="px-2 py-0.5 bg-apple-gray-700 text-apple-gray-400 text-xs rounded-full">
                      選用
                    </span>
                  )}
                </div>
                <p className="text-apple-gray-400">{step.subtitle}</p>
              </div>
            </div>

            {/* Description */}
            <p className="text-apple-gray-300 mb-6 leading-relaxed">{step.description}</p>

            {/* Instructions */}
            <div className="bg-apple-gray-800/50 rounded-2xl p-5 mb-6">
              <h4 className="text-apple-gray-50 font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-apple-blue" />
                操作步驟
              </h4>
              <ol className="space-y-3">
                {step.instructions.map((instruction, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-apple-blue/20 text-apple-blue text-sm flex items-center justify-center flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-apple-gray-300">{instruction}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Command Block */}
            {step.command && (
              <div className="bg-apple-gray-900 rounded-xl p-4 mb-6 font-mono">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-apple-gray-500 text-xs">
                    <Terminal className="w-4 h-4" />
                    終端機指令
                  </div>
                  <button
                    onClick={() => handleCopy(step.command!)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-lg text-xs hover:bg-white/20 transition-colors"
                  >
                    {copiedCommand === step.command ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-apple-green" />
                        <span className="text-apple-green">已複製</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>複製</span>
                      </>
                    )}
                  </button>
                </div>
                <code className="text-apple-green text-sm break-all">{step.command}</code>
              </div>
            )}

            {/* Pricing Info */}
            {step.pricing && (
              <div className="bg-apple-gray-800/50 rounded-2xl p-5 mb-6">
                <h4 className="text-apple-gray-50 font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-apple-green" />
                  費用參考
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {step.pricing.map((item, idx) => (
                    <div key={idx} className="bg-white/5 rounded-xl p-4 text-center">
                      <p className="text-apple-gray-400 text-sm mb-1">{item.model}</p>
                      <p className="text-2xl font-bold text-apple-gray-50">{item.price}</p>
                      <p className="text-apple-gray-500 text-xs">{item.unit}</p>
                      <p className="text-apple-blue text-xs mt-2">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Verification */}
            {step.verification && (
              <div className="bg-apple-blue/10 border border-apple-blue/20 rounded-xl p-4 mb-6">
                <p className="text-apple-gray-300 text-sm mb-2">
                  <span className="text-apple-blue font-medium">驗證安裝：</span>
                  在終端機輸入
                </p>
                <div className="flex items-center gap-2">
                  <code className="bg-black/30 px-3 py-1.5 rounded-lg text-apple-green text-sm font-mono">
                    {step.verification.command}
                  </code>
                  <button
                    onClick={() => handleCopy(step.verification!.command)}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    {copiedCommand === step.verification.command ? (
                      <Check className="w-4 h-4 text-apple-green" />
                    ) : (
                      <Copy className="w-4 h-4 text-apple-gray-400" />
                    )}
                  </button>
                </div>
                <p className="text-apple-gray-400 text-xs mt-2">{step.verification.expected}</p>
              </div>
            )}

            {/* Tip */}
            {step.tip && (
              <div className="bg-apple-orange/10 border border-apple-orange/20 rounded-xl p-4 mb-6">
                <p className="text-apple-orange text-sm">
                  <span className="font-medium">💡 小提示：</span> {step.tip}
                </p>
              </div>
            )}

            {/* External Link */}
            {step.link && (
              <a
                href={step.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-apple-blue/20 text-apple-blue rounded-xl hover:bg-apple-blue/30 transition-colors mb-6"
              >
                <ExternalLink className="w-4 h-4" />
                {step.linkText}
              </a>
            )}
          </motion.div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full transition-colors ${
                currentStep === 0
                  ? 'text-apple-gray-600 cursor-not-allowed'
                  : 'text-apple-gray-300 hover:bg-white/10'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              上一步
            </button>

            <div className="flex gap-1.5">
              {setupSteps.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    idx === currentStep ? 'bg-apple-blue' : 'bg-white/20 hover:bg-white/40'
                  }`}
                />
              ))}
            </div>

            {currentStep === setupSteps.length - 1 ? (
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-5 py-2.5 bg-apple-blue text-white rounded-full hover:bg-apple-blue-light transition-colors"
              >
                完成
                <Check className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-5 py-2.5 bg-apple-blue text-white rounded-full hover:bg-apple-blue-light transition-colors"
              >
                下一步
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default SetupGuide
