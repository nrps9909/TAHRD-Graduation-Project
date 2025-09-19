import { useState } from 'react'
import { motion } from 'framer-motion'
import { Play, RotateCcw, CheckCircle } from 'lucide-react'

interface InteractiveDemoProps {
  demo: {
    steps: string[]
    expectedCommands: string[]
  }
  onComplete: (score: number) => void
}

const InteractiveDemo = ({ demo, onComplete }: InteractiveDemoProps) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<boolean[]>(
    new Array(demo.steps.length).fill(false)
  )
  const [isRunning, setIsRunning] = useState(false)

  const runDemo = () => {
    setIsRunning(true)
    let step = 0

    const interval = setInterval(() => {
      if (step < demo.steps.length) {
        const newCompleted = [...completedSteps]
        newCompleted[step] = true
        setCompletedSteps(newCompleted)
        setCurrentStep(step + 1)
        step++
      } else {
        clearInterval(interval)
        setIsRunning(false)
        onComplete(150)
      }
    }, 1500)
  }

  const reset = () => {
    setCurrentStep(0)
    setCompletedSteps(new Array(demo.steps.length).fill(false))
    setIsRunning(false)
  }

  return (
    <div className="space-y-6">
      <div className="terminal-window">
        <h3 className="text-retro-amber font-cute text-sm mb-4">
          INTERACTIVE DEMO
        </h3>
        <div className="space-y-3">
          {demo.steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0.3 }}
              animate={{
                opacity: completedSteps[index]
                  ? 1
                  : currentStep === index
                    ? 0.8
                    : 0.3,
                scale: currentStep === index ? 1.02 : 1,
              }}
              className={`p-3 border rounded ${
                completedSteps[index]
                  ? 'border-amber-500 bg-amber-900 bg-opacity-20'
                  : currentStep === index
                    ? 'border-amber-400 bg-amber-900 bg-opacity-10'
                    : 'border-gray-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-amber-500 font-cute">{index + 1}.</span>
                <span className="flex-1 text-terminal-text font-cute text-sm">
                  {step}
                </span>
                {completedSteps[index] && (
                  <CheckCircle className="w-5 h-5 text-amber-500" />
                )}
              </div>
              {demo.expectedCommands && demo.expectedCommands[index] && (
                <pre className="mt-2 text-xs font-mono text-gray-400 ml-8">
                  $ {demo.expectedCommands[index]}
                </pre>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      <div className="terminal-window">
        <h3 className="text-retro-cyan font-cute text-sm mb-4">PROGRESS</h3>
        <div className="flex gap-2 mb-4">
          {demo.steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 flex-1 ${
                completedSteps[index] ? 'bg-amber-500' : 'bg-gray-700'
              }`}
            />
          ))}
        </div>
        <p className="text-terminal-text font-cute text-sm">
          Step {currentStep} of {demo.steps.length}
        </p>
      </div>

      <div className="flex gap-4">
        <button
          onClick={runDemo}
          disabled={isRunning || completedSteps.every(Boolean)}
          className="retro-button flex items-center gap-2"
        >
          <Play className="w-4 h-4" />
          {isRunning ? 'RUNNING...' : 'RUN DEMO'}
        </button>
        <button
          onClick={reset}
          disabled={isRunning}
          className="retro-button flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          RESET
        </button>
      </div>
    </div>
  )
}

export default InteractiveDemo
