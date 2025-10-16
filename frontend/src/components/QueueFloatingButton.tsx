/**
 * QueueFloatingButton - 右下角浮動隊列按鈕
 *
 * 設計理念：
 * 1. 固定在右下角的圓形浮動按鈕
 * 2. 顯示當前隊列狀態（處理中/等待數量）
 * 3. 點擊展開詳細隊列面板
 * 4. 動森風格的可愛設計
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '../stores/authStore'
import { useQuery } from '@apollo/client'
import { GET_TASK_HISTORIES, TaskHistory, CategoryInfo } from '../graphql/taskHistory'

interface TaskProgress {
  current: number
  total: number
  message: string
}

interface ProcessingTaskInfo {
  id: string
  userId: string
  status: string
  progress: TaskProgress
  elapsedTime: number
}

interface QueueStats {
  queueSize: number
  processing: number
  maxConcurrent: number
  processingTasks: ProcessingTaskInfo[]
}

export function QueueFloatingButton() {
  const { user } = useAuthStore()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [stats, setStats] = useState<QueueStats | null>(null)
  const [processingTasks, setProcessingTasks] = useState<Map<string, { elapsedTime: number }>>(new Map())

  // 從資料庫載入歷史記錄(最近5條)
  const { data: historiesData, refetch: refetchHistories } = useQuery<{ taskHistories: TaskHistory[] }>(GET_TASK_HISTORIES, {
    variables: { limit: 5, offset: 0 },
    fetchPolicy: 'network-only',
  })

  const userId = user?.id || 'guest-user-id'

  // WebSocket 連接
  useEffect(() => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'

    const newSocket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    })

    newSocket.on('connect', () => {
      newSocket.emit('join-room', { roomId: userId })
      newSocket.emit('get-queue-stats')
    })

    newSocket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect' || reason === 'transport close') {
        newSocket.connect()
      }
    })

    newSocket.on('reconnect', () => {
      newSocket.emit('join-room', { roomId: userId })
      newSocket.emit('get-queue-stats')
    })

    newSocket.on('queue-stats', (data: QueueStats) => setStats(data))
    newSocket.on('queue-update', (data: { stats: QueueStats }) => setStats(data.stats))
    newSocket.on('task-start', () => newSocket.emit('get-queue-stats'))

    newSocket.on('task-progress', (data: { taskId: string, elapsedTime: number }) => {
      setProcessingTasks(prev => {
        const newMap = new Map(prev)
        newMap.set(data.taskId, { elapsedTime: data.elapsedTime })
        return newMap
      })
    })

    newSocket.on('task-complete', () => {
      setTimeout(() => {
        refetchHistories()
        newSocket.emit('get-queue-stats')
      }, 500)
    })

    newSocket.on('task-error', (data: { taskId: string }) => {
      setProcessingTasks(prev => {
        const newMap = new Map(prev)
        newMap.delete(data.taskId)
        return newMap
      })
      newSocket.emit('get-queue-stats')
    })

    setSocket(newSocket)

    const intervalId = setInterval(() => {
      if (newSocket.connected) {
        newSocket.emit('get-queue-stats')
      }
    }, 5000)

    return () => {
      clearInterval(intervalId)
      newSocket.disconnect()
    }
  }, [userId, refetchHistories])

  // 格式化時間
  const formatElapsedTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}秒`
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}分${secs}秒`
  }

  const dbHistories = historiesData?.taskHistories || []
  const hasActiveTasks = stats && (stats.queueSize > 0 || (stats.processing ?? 0) > 0)
  const totalTasks = (stats?.queueSize || 0) + (stats?.processing || 0)

  return (
    <>
      {/* 浮動按鈕 - 響應式設計 */}
      <motion.button
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsExpanded(!isExpanded)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 group w-14 h-14 sm:w-16 sm:h-16"
      >
        {/* 按鈕主體 */}
        <div className="relative w-full h-full">
          {/* 外圈光暈 */}
          {hasActiveTasks && (
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400/40 to-yellow-400/40 animate-ping" />
          )}

          {/* 主按鈕 */}
          <div className="relative w-full h-full rounded-full bg-gradient-to-br from-amber-300 to-yellow-400 shadow-2xl border-3 sm:border-4 border-white/80 flex items-center justify-center transition-all group-hover:shadow-amber-300/50">
            {/* 內部圖標 */}
            <div className="relative">
              {hasActiveTasks ? (
                <>
                  {/* 處理中動畫 */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="text-xl sm:text-2xl"
                  >
                    ⚙️
                  </motion.div>
                  {/* 數量徽章 - 響應式 */}
                  <div className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center border-2 border-white shadow-lg">
                    {totalTasks > 9 ? '9+' : totalTasks}
                  </div>
                </>
              ) : (
                <div className="text-xl sm:text-2xl">📋</div>
              )}
            </div>
          </div>

          {/* 連接狀態指示器 - 響應式 */}
          <div className={`absolute bottom-0 right-0 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-white shadow-lg ${
            socket?.connected ? 'bg-green-400' : 'bg-gray-400'
          }`} />
        </div>
      </motion.button>

      {/* 展開的隊列面板 - 響應式設計 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-40 w-[calc(100vw-2rem)] sm:w-[420px] max-w-[420px]"
          >
            <div className="bg-gradient-to-br from-amber-50/98 via-yellow-50/98 to-orange-50/98 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl border-3 sm:border-4 border-amber-200/70 overflow-hidden">
              {/* 頭部 - 響應式 */}
              <div className="relative bg-gradient-to-r from-amber-300/90 to-yellow-300/90 p-3 sm:p-5 border-b-3 sm:border-b-4 border-amber-200/70">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    {/* 狀態指示燈 - 響應式 */}
                    {hasActiveTasks && (
                      <div className="relative flex-shrink-0">
                        <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-br from-green-400 to-green-500 rounded-full shadow-lg border-2 border-green-300 animate-pulse"></div>
                        <div className="absolute inset-0 w-3 h-3 sm:w-4 sm:h-4 bg-green-400 rounded-full animate-ping opacity-75"></div>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-bold text-amber-900 truncate" style={{
                        textShadow: '0 2px 4px rgba(255,255,255,0.8)',
                      }}>
                        {hasActiveTasks ? '🐱 白噗噗思考中' : '📜 處理歷史'}
                      </h3>
                      <p className="text-xs text-amber-700 font-medium truncate">
                        {(stats?.processing ?? 0) > 0
                          ? `正在處理 ${stats?.processing ?? 0} 個 | 等待 ${stats?.queueSize ?? 0} 個`
                          : dbHistories.length > 0
                          ? `最近 ${dbHistories.length} 條記錄`
                          : '無任務'}
                      </p>
                    </div>
                  </div>

                  {/* 關閉按鈕 - 響應式 */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsExpanded(false)}
                    className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/30 hover:bg-white/50 transition-all flex items-center justify-center text-amber-900 font-bold border-2 border-white/50"
                  >
                    <span className="text-lg sm:text-xl">✕</span>
                  </motion.button>
                </div>
              </div>

              {/* 內容區域 - 響應式 */}
              <div className="p-3 sm:p-4 space-y-2 sm:space-y-3 max-h-[50vh] sm:max-h-[400px] overflow-y-auto" style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#fbbf24 #fef3c7'
              }}>
                {/* 處理中的任務 - 響應式 */}
                {stats?.processingTasks && stats?.processingTasks.length > 0 ? (
                  <AnimatePresence>
                    {stats?.processingTasks.map((task) => {
                      const taskInfo = processingTasks.get(task.id)
                      return (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="bg-gradient-to-br from-white to-blue-50 border-2 sm:border-3 border-blue-200/70 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-lg"
                        >
                          <div className="flex items-center justify-between gap-2 sm:gap-3 mb-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="flex-shrink-0 w-2 h-2 sm:w-3 sm:h-3 bg-blue-400 rounded-full animate-pulse"></div>
                              <p className="text-xs sm:text-sm font-bold text-blue-900 truncate">
                                {task.progress.message}
                              </p>
                            </div>
                            <span className="text-xs sm:text-sm font-mono font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded-lg flex-shrink-0">
                              {taskInfo ? formatElapsedTime(taskInfo.elapsedTime) : '0秒'}
                            </span>
                          </div>

                          {/* 進度條 - 響應式 */}
                          <div className="h-1.5 sm:h-2 bg-white/70 rounded-full overflow-hidden border border-blue-200/50">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(task.progress.current / task.progress.total) * 100}%` }}
                              className="h-full bg-gradient-to-r from-blue-400 to-purple-400"
                            />
                          </div>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                ) : (
                  /* 歷史記錄 */
                  <div className="space-y-2">
                    {dbHistories.length === 0 ? (
                      <div className="text-center py-6 sm:py-8">
                        <p className="text-xs sm:text-sm text-amber-600 font-medium">
                          ✨ 尚無處理記錄
                        </p>
                      </div>
                    ) : (
                      <>
                        {dbHistories.map((history) => (
                          <motion.div
                            key={history.id}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white/60 border-2 border-amber-200/50 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 hover:bg-white/80 transition-all"
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                                <span className="flex-shrink-0 text-sm sm:text-base">
                                  {history.status === 'COMPLETED' ? '✅' : '❌'}
                                </span>
                                <p className="text-xs sm:text-sm font-bold text-amber-900 truncate">
                                  {history.message}
                                </p>
                              </div>
                              {history.processingTime && (
                                <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-1.5 sm:px-2 py-0.5 rounded-lg flex-shrink-0">
                                  {(history.processingTime / 1000).toFixed(1)}s
                                </span>
                              )}
                            </div>
                            {history.categoriesInfo && history.categoriesInfo.length > 0 && (
                              <div className="flex items-center gap-1 mt-1.5 sm:mt-2 flex-wrap">
                                {history.categoriesInfo.map((cat: CategoryInfo, idx: number) => (
                                  <span
                                    key={idx}
                                    className="text-xs bg-amber-100/70 px-1.5 sm:px-2 py-0.5 rounded-lg"
                                  >
                                    {cat.categoryEmoji} {cat.categoryName}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="text-xs text-amber-600 mt-1">
                              {new Date(history.completedAt).toLocaleString('zh-TW', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </motion.div>
                        ))}
                      </>
                    )}
                  </div>
                )}

                {/* 連接狀態 - 響應式 */}
                <div className="flex items-center justify-center gap-1.5 sm:gap-2 pt-2 border-t border-amber-200/50">
                  <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${socket?.connected ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                  <span className="text-xs sm:text-sm text-amber-600 font-medium">
                    {socket?.connected ? '即時連線中' : '連接中...'}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
