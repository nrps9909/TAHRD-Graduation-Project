/**
 * QueueFloatingButton - 右下角浮動隊列按鈕
 *
 * 設計理念：精緻簡約的任務隊列指示器
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
      // ⚠️ Cloudflare 問題：WebSocket 升級會失敗，只使用 polling
      transports: ['polling'], // 禁用 WebSocket，只用 polling
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity, // 無限重試
      timeout: 20000,
      // 禁用升級，避免 Cloudflare WebSocket 問題
      upgrade: false,
      rememberUpgrade: false
    })

    newSocket.on('connect', () => {
      console.log('[Queue] WebSocket connected ✅')
      newSocket.emit('join-room', { roomId: userId })
      newSocket.emit('get-queue-stats')
    })

    newSocket.on('disconnect', (reason) => {
      console.log('[Queue] WebSocket disconnected:', reason)
      if (reason === 'io server disconnect') {
        // 服務器主動斷開，需要手動重連
        setTimeout(() => newSocket.connect(), 1000)
      }
      // 其他原因會自動重連
    })

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('[Queue] WebSocket reconnected after', attemptNumber, 'attempts')
      newSocket.emit('join-room', { roomId: userId })
      newSocket.emit('get-queue-stats')
    })

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log('[Queue] Reconnecting... attempt', attemptNumber)
    })

    newSocket.on('reconnect_error', (error) => {
      console.error('[Queue] Reconnection error:', error.message)
    })

    newSocket.on('reconnect_failed', () => {
      console.error('[Queue] Reconnection failed after all attempts')
    })

    // 處理連接錯誤
    newSocket.on('connect_error', (error) => {
      console.error('[Queue] Connection error:', error.message)
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

    // 定期查詢隊列狀態（每 5 秒）
    const statsIntervalId = setInterval(() => {
      if (newSocket.connected) {
        newSocket.emit('get-queue-stats')
      }
    }, 5000)

    // 客戶端心跳機制（每 20 秒發送 ping，確保連接保持活躍）
    // 這比後端的 25 秒 ping 間隔更頻繁，確保連接不會因超時而斷開
    const heartbeatIntervalId = setInterval(() => {
      if (newSocket.connected) {
        newSocket.emit('ping')
      }
    }, 20000)

    // 監聽 pong 回應（可選，用於監控連接健康）
    newSocket.on('pong', () => {
      // 心跳正常，連接健康
    })

    return () => {
      clearInterval(statsIntervalId)
      clearInterval(heartbeatIntervalId)
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
      {/* 浮動按鈕 - 精緻簡約 */}
      <motion.button
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsExpanded(!isExpanded)}
        className="fixed bottom-4 left-4 sm:bottom-5 sm:left-5 z-40 w-11 h-11 sm:w-12 sm:h-12"
      >
        <div className="relative w-full h-full">
          {/* 外圈光暈 */}
          {hasActiveTasks && (
            <div className="absolute inset-0 rounded-full bg-amber-400/25 animate-ping" />
          )}

          {/* 主按鈕 */}
          <div className="relative w-full h-full rounded-full bg-gradient-to-br from-amber-300 to-yellow-400 shadow-lg border-2 border-white/50 flex items-center justify-center">
            <div className="relative">
              {hasActiveTasks ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="text-base sm:text-lg"
                  >
                    ⚙️
                  </motion.div>
                  {/* 數量徽章 */}
                  <div className="absolute -top-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-red-500 text-white text-[9px] sm:text-[10px] font-bold flex items-center justify-center border border-white shadow">
                    {totalTasks > 9 ? '9+' : totalTasks}
                  </div>
                </>
              ) : (
                <div className="text-base sm:text-lg">📋</div>
              )}
            </div>
          </div>

          {/* 連接狀態指示器 */}
          <div className={`absolute bottom-0 right-0 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full border border-white shadow-sm ${
            socket?.connected ? 'bg-green-400' : 'bg-gray-400'
          }`} />
        </div>
      </motion.button>

      {/* 展開的隊列面板 - 精緻簡約 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="fixed bottom-16 left-4 sm:bottom-[4.5rem] sm:left-5 z-40 w-[calc(100vw-2rem)] sm:w-80 max-w-80"
          >
            <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-amber-200/50 overflow-hidden">
              {/* 頭部 - 精簡 */}
              <div className="bg-gradient-to-r from-amber-100/70 to-yellow-100/70 px-3 py-2 border-b border-amber-200/40">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {/* 狀態指示燈 */}
                    {hasActiveTasks && (
                      <div className="relative flex-shrink-0">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <div className="absolute inset-0 w-2 h-2 bg-green-400 rounded-full animate-ping opacity-50"></div>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs sm:text-sm font-bold text-amber-900 truncate">
                        {hasActiveTasks ? '🐱 處理中' : '📜 歷史記錄'}
                      </h3>
                      <p className="text-[10px] sm:text-xs text-amber-700 truncate">
                        {(stats?.processing ?? 0) > 0
                          ? `處理 ${stats?.processing ?? 0} | 等待 ${stats?.queueSize ?? 0}`
                          : dbHistories.length > 0
                          ? `${dbHistories.length} 條記錄`
                          : '無任務'}
                      </p>
                    </div>
                  </div>

                  {/* 關閉按鈕 */}
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setIsExpanded(false)}
                    className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white/40 hover:bg-white/60 transition-colors flex items-center justify-center text-amber-800 text-sm"
                  >
                    ✕
                  </motion.button>
                </div>
              </div>

              {/* 內容區域 - 精簡 */}
              <div className="p-2.5 space-y-1.5 max-h-[40vh] sm:max-h-72 overflow-y-auto" style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#fbbf24 #fef3c7'
              }}>
                {/* 處理中的任務 */}
                {stats?.processingTasks && stats?.processingTasks.length > 0 ? (
                  <AnimatePresence>
                    {stats?.processingTasks.map((task) => {
                      const taskInfo = processingTasks.get(task.id)
                      return (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="bg-blue-50/70 border border-blue-200/50 rounded-lg p-2 shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              <div className="flex-shrink-0 w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                              <p className="text-[10px] sm:text-xs font-semibold text-blue-900 truncate">
                                {task.progress.message}
                              </p>
                            </div>
                            <span className="text-[10px] font-mono font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded flex-shrink-0">
                              {taskInfo ? formatElapsedTime(taskInfo.elapsedTime) : '0秒'}
                            </span>
                          </div>

                          {/* 進度條 */}
                          <div className="h-1 bg-white/70 rounded-full overflow-hidden">
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
                  <div className="space-y-1.5">
                    {dbHistories.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-[10px] sm:text-xs text-amber-600">
                          ✨ 尚無記錄
                        </p>
                      </div>
                    ) : (
                      <>
                        {dbHistories.map((history) => (
                          <motion.div
                            key={history.id}
                            initial={{ opacity: 0, y: 3 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-amber-50/50 border border-amber-200/40 rounded-lg p-2 hover:bg-amber-50/70 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <span className="flex-shrink-0 text-xs">
                                  {history.status === 'COMPLETED' ? '✅' : '❌'}
                                </span>
                                <p className="text-[10px] sm:text-xs font-semibold text-amber-900 truncate">
                                  {history.message}
                                </p>
                              </div>
                              {history.processingTime && (
                                <span className="text-[9px] sm:text-[10px] font-medium text-amber-700 bg-amber-100/60 px-1.5 py-0.5 rounded flex-shrink-0">
                                  {(history.processingTime / 1000).toFixed(1)}s
                                </span>
                              )}
                            </div>
                            {history.categoriesInfo && history.categoriesInfo.length > 0 && (
                              <div className="flex items-center gap-1 mt-1 flex-wrap">
                                {history.categoriesInfo.map((cat: CategoryInfo, idx: number) => (
                                  <span
                                    key={idx}
                                    className="text-[9px] sm:text-[10px] bg-amber-100/50 px-1.5 py-0.5 rounded"
                                  >
                                    {cat.categoryEmoji} {cat.categoryName}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="text-[9px] sm:text-[10px] text-amber-600/70 mt-0.5">
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
                <div className="flex items-center justify-center gap-1.5 pt-1.5 mt-1 border-t border-amber-200/30">
                  <div className={`w-1.5 h-1.5 rounded-full ${socket?.connected ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                  <span className="text-[9px] sm:text-[10px] text-amber-600/70">
                    {socket?.connected ? '即時連線' : '連接中...'}
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
