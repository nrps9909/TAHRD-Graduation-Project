/**
 * ProcessingQueuePanel - 簡潔直觀的白噗噗知識處理隊列
 *
 * 設計理念：
 * 1. 極簡設計 - 只顯示核心資訊：正在思考的記憶標題 + 秒數
 * 2. 實時更新 - 顯示處理中的任務和已完成數量
 * 3. 歷史整合 - 完成的任務會寫入歷史記錄組件
 * 4. 動物森友會白天風格 - 溫暖可愛的視覺設計
 */

import { useState, useEffect, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../stores/authStore'

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

interface CompletedTask {
  id: string
  message: string
  completedAt: Date
}

export function ProcessingQueuePanel() {
  const { user } = useAuthStore()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isExpanded, setIsExpanded] = useState(true)
  const [stats, setStats] = useState<QueueStats | null>(null)
  const [processingTasks, setProcessingTasks] = useState<Map<string, { elapsedTime: number }>>(new Map())
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([])
  const [showCompleted, setShowCompleted] = useState(false)

  // 獲取用戶 ID
  const userId = user?.id || 'guest-user-id'

  // WebSocket 連接
  useEffect(() => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'
    console.log('[Queue] 連接到 Socket.IO:', backendUrl, '用戶ID:', userId)

    const newSocket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      reconnectionDelayMax: 5000,
      timeout: 20000
    })

    newSocket.on('connect', () => {
      console.log('[Queue] WebSocket 已連接 ✅')
      newSocket.emit('join-room', { roomId: userId })
      newSocket.emit('get-queue-stats')
    })

    newSocket.on('connect_error', (error) => {
      console.error('[Queue] WebSocket 連接錯誤:', error)
    })

    newSocket.on('disconnect', (reason) => {
      console.warn('[Queue] WebSocket 斷線:', reason)
    })

    // 監聽隊列統計
    newSocket.on('queue-stats', (data: QueueStats) => {
      console.log('[Queue] 隊列統計更新:', data)
      setStats(data)
    })

    // 監聽隊列更新
    newSocket.on('queue-update', (data: { stats: QueueStats }) => {
      console.log('[Queue] 隊列更新:', data)
      setStats(data.stats)
    })

    // 監聽任務開始
    newSocket.on('task-start', (data: { taskId: string }) => {
      console.log('[Queue] 任務開始:', data)
      newSocket.emit('get-queue-stats')
    })

    // 監聽任務進度
    newSocket.on('task-progress', (data: { taskId: string, progress: TaskProgress, elapsedTime: number }) => {
      console.log('[Queue] 任務進度:', data)
      setProcessingTasks(prev => {
        const newMap = new Map(prev)
        newMap.set(data.taskId, { elapsedTime: data.elapsedTime })
        return newMap
      })
    })

    // 監聽任務完成
    newSocket.on('task-complete', (data: { taskId: string, progress?: TaskProgress }) => {
      console.log('[Queue] 任務完成 ✅:', data)

      // 添加到完成列表
      const completedTask: CompletedTask = {
        id: data.taskId,
        message: data.progress?.message || '知識處理',
        completedAt: new Date()
      }
      setCompletedTasks(prev => [completedTask, ...prev].slice(0, 10)) // 只保留最近 10 個

      // 顯示完成通知 3 秒
      setShowCompleted(true)
      setTimeout(() => setShowCompleted(false), 3000)

      // 清除處理中狀態
      setProcessingTasks(prev => {
        const newMap = new Map(prev)
        newMap.delete(data.taskId)
        return newMap
      })

      // 請求更新狀態
      setTimeout(() => {
        newSocket.emit('get-queue-stats')
      }, 500)
    })

    // 監聽任務錯誤
    newSocket.on('task-error', (data: { taskId: string, error?: string }) => {
      console.error('[Queue] 任務錯誤 ❌:', data)
      setProcessingTasks(prev => {
        const newMap = new Map(prev)
        newMap.delete(data.taskId)
        return newMap
      })
      newSocket.emit('get-queue-stats')
    })

    setSocket(newSocket)

    // 定期請求狀態更新
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
  const formatElapsedTime = useCallback((seconds: number): string => {
    if (seconds < 60) return `${seconds}秒`
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}分${secs}秒`
  }, [])

  // 如果沒有任務，不顯示面板
  if (!stats || (stats.queueSize === 0 && stats.processing === 0 && completedTasks.length === 0)) {
    return null
  }

  return (
    <>
      {/* 主隊列面板 */}
      <motion.div
        initial={{ opacity: 0, x: -100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -100 }}
        className="fixed bottom-6 left-6 z-[35] w-[360px]"
      >
        {/* 摺疊/展開按鈕 */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="absolute -right-12 top-4 bg-gradient-to-br from-amber-50 to-yellow-50 backdrop-blur-md rounded-r-2xl px-3 py-4 shadow-xl hover:shadow-2xl transition-all border-2 border-l-0 border-amber-200/80 group"
          title={isExpanded ? '收起隊列' : '展開隊列'}
        >
          <span className={`text-lg transition-transform duration-300 block ${isExpanded ? 'rotate-180' : 'rotate-0'}`}>
            ◀
          </span>
        </button>

        {/* 主面板 */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="bg-gradient-to-br from-amber-50/98 via-yellow-50/98 to-orange-50/98 backdrop-blur-xl rounded-3xl shadow-2xl border-4 border-amber-200/70 overflow-hidden"
            >
              {/* 頭部 */}
              <div className="relative bg-gradient-to-r from-amber-300/90 to-yellow-300/90 p-5 border-b-4 border-amber-200/70">
                <div className="flex items-center gap-3">
                  {/* 狀態指示燈 */}
                  <div className="relative">
                    <div className="w-4 h-4 bg-gradient-to-br from-green-400 to-green-500 rounded-full shadow-lg border-2 border-green-300 animate-pulse"></div>
                    <div className="absolute inset-0 w-4 h-4 bg-green-400 rounded-full animate-ping opacity-75"></div>
                  </div>

                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-amber-900" style={{
                      textShadow: '0 2px 4px rgba(255,255,255,0.8)',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft JhengHei", sans-serif'
                    }}>
                      白噗噗思考中
                    </h3>
                    <p className="text-sm text-amber-700 font-medium">
                      {stats.processing > 0 ? `正在處理 ${stats.processing} 個記憶` : '等待中...'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 內容區域 */}
              <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto" style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#fbbf24 #fef3c7'
              }}>
                {/* 處理中的任務 */}
                <AnimatePresence>
                  {stats.processingTasks && stats.processingTasks.length > 0 && (
                    stats.processingTasks.map((task) => {
                      const taskInfo = processingTasks.get(task.id)

                      return (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="bg-gradient-to-br from-white to-amber-50 border-3 border-amber-200/70 rounded-2xl p-4 shadow-lg"
                        >
                          <div className="flex items-center justify-between gap-3">
                            {/* 左側：脈衝指示器 + 訊息 */}
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="flex-shrink-0 w-3 h-3 bg-blue-400 rounded-full animate-pulse shadow-lg"></div>
                              <p className="text-sm font-bold text-amber-900 truncate">
                                {task.progress.message}
                              </p>
                            </div>

                            {/* 右側：時間 */}
                            <div className="flex-shrink-0">
                              <span className="text-lg font-mono font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl border-2 border-blue-200/70 shadow-sm">
                                {taskInfo ? formatElapsedTime(taskInfo.elapsedTime) : '0秒'}
                              </span>
                            </div>
                          </div>

                          {/* 進度條 */}
                          <div className="mt-3 h-2 bg-white/70 rounded-full overflow-hidden border-2 border-amber-200/50 shadow-inner">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(task.progress.current / task.progress.total) * 100}%` }}
                              transition={{ duration: 0.5 }}
                              className="h-full bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400"
                              style={{
                                boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.5)'
                              }}
                            />
                          </div>
                        </motion.div>
                      )
                    })
                  )}
                </AnimatePresence>

                {/* 等待中的任務數量 */}
                {stats.queueSize > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-3"
                  >
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100/70 rounded-xl border-2 border-amber-200/50">
                      <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                      <span className="text-sm font-bold text-amber-700">
                        還有 {stats.queueSize} 個記憶在等待
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* 沒有任務時的提示 */}
                {stats.processing === 0 && stats.queueSize === 0 && (
                  <div className="text-center py-6">
                    <p className="text-sm text-amber-600 font-medium">
                      ✨ 所有記憶都處理完畢了！
                    </p>
                  </div>
                )}

                {/* 連接狀態 */}
                <div className="flex items-center justify-center gap-2 pt-2">
                  <div className={`w-2 h-2 rounded-full ${socket?.connected ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                  <span className="text-xs text-amber-600 font-medium">
                    {socket?.connected ? '即時連線中' : '連接中...'}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* 完成通知浮窗 */}
      <AnimatePresence>
        {showCompleted && completedTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-[36] w-[320px]"
          >
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border-3 border-green-200/70">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-400 rounded-full flex items-center justify-center text-2xl shadow-lg">
                  ✓
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-lg font-bold text-green-900 mb-1">
                    已完成！
                  </h4>
                  <p className="text-sm text-green-700 font-medium truncate">
                    {completedTasks[0].message}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
