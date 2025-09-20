import { useGameStore } from '@/store/gameStore'

const ProgressBar = () => {
  const { completedScenes } = useGameStore()
  const progress = (completedScenes.length / 9) * 100

  return (
    <div className="flex items-center gap-2">
      <span className="font-cute text-xs text-cat-pink-dark">進度</span>
      <div className="w-32 h-3 bg-cat-cream/60 border-2 border-cat-pink rounded-full">
        <div
          className="h-full bg-gradient-to-r from-cat-pink to-cat-beige transition-all duration-500 rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="font-cute text-xs text-text-primary">
        {Math.round(progress)}%
      </span>
    </div>
  )
}

export default ProgressBar
