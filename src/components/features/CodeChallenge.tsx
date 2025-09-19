import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Lightbulb } from 'lucide-react';

interface CodeChallengeProps {
  challenge: {
    task: string;
    code?: string;
    solution: string;
    hints: string[];
    requirements?: string[];
    starter?: string;
  };
  onComplete: (score: number) => void;
}

const CodeChallenge = ({ challenge, onComplete }: CodeChallengeProps) => {
  const [userCode, setUserCode] = useState(challenge.code || challenge.starter || '');
  const [showHint, setShowHint] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);

  const checkSolution = () => {
    const normalizeCode = (code: string) =>
      code.replace(/\s+/g, ' ').trim().toLowerCase();

    if (normalizeCode(userCode) === normalizeCode(challenge.solution)) {
      setIsCorrect(true);
      setFeedback('Excellent! You solved the challenge!');
      setTimeout(() => onComplete(200), 2000);
    } else {
      setFeedback('Not quite right. Try again!');
      setTimeout(() => setFeedback(''), 3000);
    }
  };

  const getHint = () => {
    if (hintIndex < challenge.hints.length) {
      setShowHint(true);
      setHintIndex(hintIndex + 1);
    }
  };

  return (
    <div className="space-y-6">
      <div className="terminal-window">
        <h3 className="text-retro-amber font-cute text-sm mb-4">CHALLENGE</h3>
        <p className="text-terminal-text font-cute mb-4">{challenge.task}</p>

        {challenge.requirements && (
          <div className="mb-4">
            <h4 className="text-retro-cyan font-cute text-xs mb-2">REQUIREMENTS:</h4>
            <ul className="space-y-1">
              {challenge.requirements.map((req, index) => (
                <li key={index} className="text-terminal-text font-cute text-sm">
                  • {req}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="terminal-window">
        <h3 className="text-amber-500 font-cute text-sm mb-4">CODE EDITOR</h3>
        <textarea
          value={userCode}
          onChange={(e) => setUserCode(e.target.value)}
          className="w-full h-64 bg-gray-900 text-terminal-text font-mono text-sm p-4 rounded border border-gray-700 outline-none focus:border-amber-400"
          spellCheck={false}
        />
      </div>

      {showHint && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="terminal-window bg-opacity-50"
        >
          <h3 className="text-retro-cyan font-cute text-sm mb-2">
            <Lightbulb className="inline w-4 h-4 mr-2" />
            HINT
          </h3>
          {challenge.hints.slice(0, hintIndex).map((hint, i) => (
            <p key={i} className="text-terminal-text font-cute text-sm mb-1">
              {i + 1}. {hint}
            </p>
          ))}
        </motion.div>
      )}

      {feedback && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`terminal-window ${
            isCorrect ? 'border-amber-500' : 'border-red-500'
          }`}
        >
          <div className="flex items-center gap-2">
            {isCorrect ? (
              <Check className="w-5 h-5 text-amber-500" />
            ) : (
              <X className="w-5 h-5 text-red-500" />
            )}
            <span className={`font-cute ${isCorrect ? 'text-amber-500' : 'text-red-500'}`}>
              {feedback}
            </span>
          </div>
        </motion.div>
      )}

      <div className="flex gap-4">
        <button
          onClick={checkSolution}
          disabled={isCorrect}
          className="retro-button"
        >
          CHECK SOLUTION
        </button>
        {hintIndex < challenge.hints.length && !isCorrect && (
          <button
            onClick={getHint}
            className="retro-button"
          >
            GET HINT ({hintIndex}/{challenge.hints.length})
          </button>
        )}
      </div>
    </div>
  );
};

export default CodeChallenge;