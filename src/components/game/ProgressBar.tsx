import { useGameStore } from '../store/gameStore';

const ProgressBar = () => {
  const { completedScenes } = useGameStore();
  const progress = (completedScenes.length / 9) * 100;

  return (
    <div className="flex items-center gap-2">
      <span className="font-cute text-xs text-pink-400">進度</span>
      <div className="w-32 h-3 bg-pink-100/60 border-2 border-pink-200 rounded-full">
        <div
          className="h-full bg-gradient-to-r from-pink-200 to-yellow-200 transition-all duration-500 rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="font-cute text-xs text-pink-500">{Math.round(progress)}%</span>
    </div>
  );
};

export default ProgressBar;