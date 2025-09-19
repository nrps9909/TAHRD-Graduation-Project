import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy, Terminal, AlertCircle } from 'lucide-react';

interface WSLSetupGuideProps {
  content: {
    instructions: string[];
    commands: {
      title: string;
      steps: string[];
      description: string;
    }[];
    tips: string[];
  };
}

const WSLSetupGuide = ({ content }: WSLSetupGuideProps) => {
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const copyToClipboard = (text: string, index: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const toggleStep = (stepId: string) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(stepId)) {
      newCompleted.delete(stepId);
    } else {
      newCompleted.add(stepId);
    }
    setCompletedSteps(newCompleted);
  };

  return (
    <div className="space-y-6">
      <div className="terminal-window">
        <h3 className="text-retro-amber font-chinese text-sm mb-4">
          環境設置指南
        </h3>
        <div className="space-y-2 text-terminal-text font-chinese text-sm">
          {content.instructions.map((instruction, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              {instruction}
            </motion.div>
          ))}
        </div>
      </div>

      {content.commands.map((commandGroup, groupIndex) => (
        <motion.div
          key={groupIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: groupIndex * 0.2 }}
          className="terminal-window"
        >
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-retro-cyan font-chinese text-sm">
              {commandGroup.title}
            </h4>
            <button
              onClick={() => toggleStep(`group-${groupIndex}`)}
              className={`text-xs px-3 py-1 rounded border ${
                completedSteps.has(`group-${groupIndex}`)
                  ? 'bg-amber-900 border-amber-500 text-amber-400'
                  : 'border-gray-600 text-gray-400'
              }`}
            >
              {completedSteps.has(`group-${groupIndex}`) ? (
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  完成
                </span>
              ) : (
                '標記完成'
              )}
            </button>
          </div>

          <p className="text-xs text-gray-400 mb-3 font-chinese">
            {commandGroup.description}
          </p>

          <div className="space-y-2">
            {commandGroup.steps.map((step, stepIndex) => {
              const uniqueKey = `${groupIndex}-${stepIndex}`;
              return (
                <div
                  key={stepIndex}
                  className="group flex items-center justify-between bg-gray-900 p-3 rounded hover:bg-gray-800 transition-colors"
                >
                  <code className="text-amber-500 font-mono text-sm flex-1">
                    {step}
                  </code>
                  <button
                    onClick={() => copyToClipboard(step, uniqueKey)}
                    className="ml-3 p-1 text-gray-400 hover:text-amber-500 transition-colors"
                    title="複製指令"
                  >
                    {copiedIndex === uniqueKey ? (
                      <Check className="w-4 h-4 text-amber-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </motion.div>
      ))}

      {content.tips && content.tips.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="terminal-window bg-opacity-50"
        >
          <h3 className="text-retro-cyan font-chinese text-sm mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            專業提示
          </h3>
          <ul className="space-y-2 text-terminal-text font-chinese text-sm">
            {content.tips.map((tip, index) => (
              <li key={index} className="flex items-start">
                <span className="text-amber-500 mr-2">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      <div className="flex items-center justify-between mt-6 p-4 bg-gray-900 rounded">
        <div className="flex items-center gap-3">
          <Terminal className="w-5 h-5 text-amber-500" />
          <span className="text-sm font-chinese text-terminal-text">
            完成進度：{completedSteps.size} / {content.commands.length}
          </span>
        </div>
        <div className="flex gap-1">
          {content.commands.map((_, index) => (
            <div
              key={index}
              className={`w-8 h-2 ${
                completedSteps.has(`group-${index}`)
                  ? 'bg-amber-500'
                  : 'bg-gray-700'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default WSLSetupGuide;