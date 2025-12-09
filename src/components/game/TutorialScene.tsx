import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import SceneRenderer from './SceneRenderer'
import { ArrowLeft } from 'lucide-react'

interface TutorialSceneProps {
  triggerFeedback?: any
}

const TutorialScene = ({}: TutorialSceneProps) => {
  const { sceneId } = useParams<{ sceneId: string }>()
  const navigate = useNavigate()

  if (!sceneId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a0a0a] via-[#111111] to-[#0a0a0a]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-200 mb-4">
            找不到場景
          </h2>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
          >
            返回首頁
          </button>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen p-8"
    >
      <header className="mb-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-400 hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="chinese-text">返回冒險地圖</span>
        </button>
      </header>

      <div className="max-w-6xl mx-auto">
        <SceneRenderer sceneId={sceneId} />
      </div>
    </motion.div>
  )
}

export default TutorialScene
