import { useGameStore } from '@/store/gameStore'

const ProgressBar = () => {
  const { completedScenes } = useGameStore()
  const progress = (completedScenes.length / 9) * 100

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-secondary">進度</span>
      <div className="w-32 h-3 bg-bg-tertiary border border-border-primary rounded-full">
        <div
          className="h-full bg-accent transition-all duration-500 rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-xs text-text-primary">
        {Math.round(progress)}%
      </span>
    </div>
  )
}

export default ProgressBar
