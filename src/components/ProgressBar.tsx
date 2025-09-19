import { useGameStore } from '../store/gameStore';

const ProgressBar = () => {
  const { completedScenes } = useGameStore();
  const progress = (completedScenes.length / 9) * 100;

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs text-retro-amber">PROGRESS</span>
      <div className="w-32 h-3 bg-gray-800 border border-retro-green">
        <div
          className="h-full bg-retro-green transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="font-mono text-xs text-retro-green">{Math.round(progress)}%</span>
    </div>
  );
};

export default ProgressBar;