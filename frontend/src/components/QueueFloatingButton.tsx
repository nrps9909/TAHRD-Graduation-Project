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
import { GET_TASK_HISTORIES, TaskHistory } from '../graphql/taskHistory'

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

interface CategoryInfo {
  memoryId: string
  categoryName: string
  categoryEmoji: string
  islandName?: string
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
  }, [userId])

  // 格式化時間
  const formatElapsedTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}秒`
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}分${secs}秒`
  }

  const dbHistories = historiesData?.taskHistories || []
  const hasActiveTasks = stats && (stats.queueSize > 0 || stats.processing > 0)
  const totalTasks = (stats?.queueSize || 0) + (stats?.processing || 0)

  return (
    <>
      {/* 浮動按鈕 */}
      <motion.button
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsExpanded(!isExpanded)}
        className="fixed bottom-6 right-6 z-40 group"
        style={{
          width: '64px',
          height: '64px',
        }}
      >
        {/* 按鈕主體 */}
        <div className="relative w-full h-full">
          {/* 外圈光暈 */}
          {hasActiveTasks && (
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400/40 to-yellow-400/40 animate-ping" />
          )}

          {/* 主按鈕 */}
          <div className="relative w-full h-full rounded-full bg-gradient-to-br from-amber-300 to-yellow-400 shadow-2xl border-4 border-white/80 flex items-center justify-center transition-all group-hover:shadow-amber-300/50">
            {/* 內部圖標 */}
            <div className="relative">
              {hasActiveTasks ? (
                <>
                  {/* 處理中動畫 */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="text-2xl"
                  >
                    ⚙️
                  </motion.div>
                  {/* 數量徽章 */}
                  <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center border-2 border-white shadow-lg">
                    {totalTasks > 9 ? '9+' : totalTasks}
                  </div>
                </>
              ) : (
                <div className="text-2xl">📋</div>
              )}
            </div>
          </div>

          {/* 連接狀態指示器 */}
          <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white shadow-lg ${
            socket?.connected ? 'bg-green-400' : 'bg-gray-400'
          }`} />
        </div>
      </motion.button>

      {/* 展開的隊列面板 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-24 right-6 z-40 w-[420px]"
          >
            <div className="bg-gradient-to-br from-amber-50/98 via-yellow-50/98 to-orange-50/98 backdrop-blur-xl rounded-3xl shadow-2xl border-4 border-amber-200/70 overflow-hidden">
              {/* 頭部 */}
              <div className="relative bg-gradient-to-r from-amber-300/90 to-yellow-300/90 p-5 border-b-4 border-amber-200/70">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* 狀態指示燈 */}
                    {hasActiveTasks && (
                      <div className="relative">
                        <div className="w-4 h-4 bg-gradient-to-br from-green-400 to-green-500 rounded-full shadow-lg border-2 border-green-300 animate-pulse"></div>
                        <div className="absolute inset-0 w-4 h-4 bg-green-400 rounded-full animate-ping opacity-75"></div>
                      </div>
                    )}

                    <div>
                      <h3 className="text-lg font-bold text-amber-900" style={{
                        textShadow: '0 2px 4px rgba(255,255,255,0.8)',
                      }}>
                        {hasActiveTasks ? '🐱 白噗噗思考中' : '📜 處理歷史'}
                      </h3>
                      <p className="text-xs text-amber-700 font-medium">
                        {stats?.processing > 0
                          ? `正在處理 ${stats.processing} 個 | 等待 ${stats.queueSize} 個`
                          : dbHistories.length > 0
                          ? `最近 ${dbHistories.length} 條記錄`
                          : '無任務'}
                      </p>
                    </div>
                  </div>

                  {/* 關閉按鈕 */}
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="text-amber-900 hover:text-amber-700 transition-colors text-xl"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* 內容區域 */}
              <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto" style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#fbbf24 #fef3c7'
              }}>
                {/* 處理中的任務 */}
                {stats?.processingTasks && stats.processingTasks.length > 0 ? (
                  <AnimatePresence>
                    {stats.processingTasks.map((task) => {
                      const taskInfo = processingTasks.get(task.id)
                      return (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="bg-gradient-to-br from-white to-blue-50 border-3 border-blue-200/70 rounded-2xl p-4 shadow-lg"
                        >
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="flex-shrink-0 w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                              <p className="text-sm font-bold text-blue-900 truncate">
                                {task.progress.message}
                              </p>
                            </div>
                            <span className="text-sm font-mono font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded-lg">
                              {taskInfo ? formatElapsedTime(taskInfo.elapsedTime) : '0秒'}
                            </span>
                          </div>

                          {/* 進度條 */}
                          <div className="h-2 bg-white/70 rounded-full overflow-hidden border border-blue-200/50">
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
                      <div className="text-center py-8">
                        <p className="text-sm text-amber-600 font-medium">
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
                            className="bg-white/60 border-2 border-amber-200/50 rounded-xl p-3 hover:bg-white/80 transition-all"
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="flex-shrink-0 text-base">
                                  {history.status === 'COMPLETED' ? '✅' : '❌'}
                                </span>
                                <p className="text-xs font-bold text-amber-900 truncate">
                                  {history.message}
                                </p>
                              </div>
                              {history.processingTime && (
                                <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg">
                                  {(history.processingTime / 1000).toFixed(1)}s
                                </span>
                              )}
                            </div>
                            {history.categoriesInfo && history.categoriesInfo.length > 0 && (
                              <div className="flex items-center gap-1 mt-2 flex-wrap">
                                {history.categoriesInfo.map((cat: any, idx: number) => (
                                  <span
                                    key={idx}
                                    className="text-xs bg-amber-100/70 px-2 py-0.5 rounded-lg"
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

                {/* 連接狀態 */}
                <div className="flex items-center justify-center gap-2 pt-2 border-t border-amber-200/50">
                  <div className={`w-2 h-2 rounded-full ${socket?.connected ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                  <span className="text-xs text-amber-600 font-medium">
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
