import { motion } from 'framer-motion'

const LoadingScreen = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-screen w-screen flex flex-col items-center justify-center bg-black gpu-accelerated"
    >
      {/* Apple 風格微妙背景 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-apple-blue/[0.03] rounded-full blur-[100px]" />
      </div>

      <motion.div
        animate={{
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="text-7xl sm:text-8xl mb-8 gpu-accelerated relative z-10"
      >
        🐱
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col items-center gap-6 relative z-10"
      >
        <h2 className="text-2xl sm:text-3xl font-semibold text-apple-gray-50 chinese-text tracking-tight">
          正在載入冒險...
        </h2>

        {/* Apple 風格載入指示器 */}
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              animate={{
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.15,
                ease: 'easeInOut',
              }}
              className="w-2 h-2 bg-apple-blue rounded-full"
            />
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-apple-gray-400 chinese-text mt-2 text-sm sm:text-base"
        >
          準備好要學習程式了嗎？
        </motion.p>
      </motion.div>
    </motion.div>
  )
}

export default LoadingScreen
