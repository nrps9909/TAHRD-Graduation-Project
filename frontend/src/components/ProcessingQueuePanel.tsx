/**
 * ProcessingQueuePanel - 動物森友會風格的處理隊列顯示面板
 * 
 * 功能：
 * 1. 顯示當前處理中的任務（實時更新）
 * 2. 顯示待處理隊列
 * 3. 動物森友會白天風格設計
 * 4. WebSocket 實時連接
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

interface QueueTask {
  id: string
  userId: string
  distributionId: string
  assistantIds: string[]
  priority: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  createdAt: string
  startedAt?: string
  completedAt?: string
  processingTime?: number
  error?: string
  progress: TaskProgress
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

export function ProcessingQueuePanel() {
  const { user } = useAuthStore()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isExpanded, setIsExpanded] = useState(true)
  const [isMinimized, setIsMinimized] = useState(false)
  const [stats, setStats] = useState<QueueStats | null>(null)
  const [userTasks, setUserTasks] = useState<QueueTask[]>([])
  const [processingTasks, setProcessingTasks] = useState<Map<string, { elapsedTime: number }>>(new Map())
  const [completedCount, setCompletedCount] = useState(0)

  // 獲取用戶 ID（使用 guest-user-id 作為默認值）
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
      
      // 加入用戶房間
      newSocket.emit('join-room', { roomId: userId })
      console.log('[Queue] 已加入房間:', userId)

      // 獲取初始狀態
      newSocket.emit('get-queue-stats')
      newSocket.emit('get-user-tasks', { userId })
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

    // 監聽用戶任務
    newSocket.on('user-tasks', (tasks: QueueTask[]) => {
      console.log('[Queue] 用戶任務更新:', tasks)
      setUserTasks(tasks)
    })

    // 監聽隊列更新
    newSocket.on('queue-update', (data: { stats: QueueStats, userTasks: QueueTask[] }) => {
      console.log('[Queue] 隊列更新:', data)
      setStats(data.stats)
      setUserTasks(data.userTasks)
    })

    // 監聽任務開始
    newSocket.on('task-start', (data: { taskId: string }) => {
      console.log('[Queue] 任務開始:', data)
      // 請求更新狀態
      newSocket.emit('get-queue-stats')
      newSocket.emit('get-user-tasks', { userId })
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
    newSocket.on('task-complete', (data: { taskId: string }) => {
      console.log('[Queue] 任務完成 ✅:', data)
      setCompletedCount(prev => prev + 1)
      setProcessingTasks(prev => {
        const newMap = new Map(prev)
        newMap.delete(data.taskId)
        return newMap
      })
      // 請求更新狀態
      setTimeout(() => {
        newSocket.emit('get-queue-stats')
        newSocket.emit('get-user-tasks', { userId })
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
      // 請求更新狀態
      newSocket.emit('get-queue-stats')
      newSocket.emit('get-user-tasks', { userId })
    })

    setSocket(newSocket)

    // 定期請求狀態更新（作為備用）
    const intervalId = setInterval(() => {
      if (newSocket.connected) {
        newSocket.emit('get-queue-stats')
        newSocket.emit('get-user-tasks', { userId })
      }
    }, 5000) // 每 5 秒更新一次

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

  // 獲取優先級圖標和文字
  const getPriorityInfo = (priority: string) => {
    switch (priority) {
      case 'HIGH': return { emoji: '⚡', text: '高優先', color: 'text-red-600' }
      case 'NORMAL': return { emoji: '📝', text: '普通', color: 'text-amber-600' }
      case 'LOW': return { emoji: '📦', text: '低優先', color: 'text-gray-500' }
      default: return { emoji: '📝', text: '普通', color: 'text-amber-600' }
    }
  }

  // 如果沒有任務且已完成初始化，不顯示面板
  if (!stats || (stats.queueSize === 0 && stats.processing === 0 && completedCount === 0)) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="fixed bottom-6 left-6 z-[35] w-[380px]"
    >
      {/* 主面板容器 - 動物森友會白天風格 */}
      <div className="relative">
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
              {/* 頭部 - 動物森友會風格 */}
              <div className="relative bg-gradient-to-r from-amber-300/90 to-yellow-300/90 p-5 border-b-4 border-amber-200/70">
                {/* 裝飾圓點 */}
                <div className="absolute top-3 right-3 flex gap-2">
                  <button
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="w-4 h-4 bg-yellow-400 rounded-full hover:bg-yellow-500 transition-colors shadow-md border-2 border-yellow-300"
                    title={isMinimized ? '展開' : '最小化'}
                  />
                </div>

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
                      知識處理中
                    </h3>
                    <p className="text-sm text-amber-700 font-medium">
                      處理 {stats.processing}/{stats.maxConcurrent} · 等待 {stats.queueSize}
                    </p>
                  </div>
                </div>

                {/* 完成計數器 */}
                {completedCount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-white/60 rounded-full border-2 border-amber-200/50"
                  >
                    <span className="text-xs font-bold text-green-600">✅ 已完成 {completedCount} 個</span>
                  </motion.div>
                )}
              </div>

              {/* 內容區域 */}
              <AnimatePresence>
                {!isMinimized && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="p-4 max-h-[500px] overflow-y-auto space-y-3 processing-queue-scrollbar"
                    style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#fbbf24 #fef3c7'
                    }}
                  >
                    {/* 處理中的任務 */}
                    {stats.processingTasks && stats.processingTasks.length > 0 && (
                      <div>
                        <h4 className="text-sm font-bold text-amber-700 mb-3 flex items-center gap-2">
                          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                          處理中
                        </h4>
                        {stats.processingTasks.map(task => {
                          const taskInfo = processingTasks.get(task.id)
                          const progress = (task.progress.current / task.progress.total) * 100

                          return (
                            <motion.div
                              key={task.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="bg-gradient-to-br from-blue-50 to-indigo-50 border-3 border-blue-200/70 rounded-2xl p-4 mb-3 shadow-lg"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <p className="text-sm font-bold text-blue-800 mb-1">
                                    {task.progress.message}
                                  </p>
                                  <p className="text-xs text-blue-600">
                                    {task.progress.current} / {task.progress.total}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <span className="text-xs font-mono font-bold text-blue-700 bg-white/70 px-2 py-1 rounded-lg border-2 border-blue-200/50">
                                    {taskInfo ? formatElapsedTime(taskInfo.elapsedTime) : '0秒'}
                                  </span>
                                </div>
                              </div>

                              {/* 進度條 - 動物森友會風格 */}
                              <div className="relative h-4 bg-white/70 rounded-full overflow-hidden border-2 border-blue-200/70 shadow-inner">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${progress}%` }}
                                  transition={{ duration: 0.5 }}
                                  className="h-full bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 relative"
                                  style={{
                                    boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.5)'
                                  }}
                                >
                                  {/* 光澤效果 */}
                                  <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent"></div>
                                </motion.div>
                              </div>

                              {/* 進度百分比 */}
                              <div className="mt-2 text-center">
                                <span className="text-xs font-bold text-blue-700">
                                  {Math.round(progress)}%
                                </span>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    )}

                    {/* 待處理隊列 */}
                    {stats.queueSize > 0 && (
                      <div>
                        <h4 className="text-sm font-bold text-amber-700 mb-3 flex items-center gap-2">
                          <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                          等待中 ({stats.queueSize})
                        </h4>
                        <div className="space-y-2">
                          {userTasks
                            .filter(task => task.status === 'PENDING')
                            .slice(0, 5)
                            .map((task, index) => {
                              const priorityInfo = getPriorityInfo(task.priority)
                              return (
                                <motion.div
                                  key={task.id}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.05 }}
                                  className="bg-gradient-to-br from-white to-amber-50/50 border-3 border-amber-200/50 rounded-xl p-3 shadow-md hover:shadow-lg transition-all"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 flex-1">
                                      <span className="text-lg font-bold text-amber-600 bg-amber-100/70 w-7 h-7 flex items-center justify-center rounded-lg border-2 border-amber-200/70">
                                        {index + 1}
                                      </span>
                                      <span className="text-sm text-amber-900 font-medium truncate">
                                        {task.progress.message}
                                      </span>
                                    </div>
                                    <div className={`flex items-center gap-1 px-2 py-1 bg-white/70 rounded-lg border-2 border-amber-200/50 ${priorityInfo.color}`}>
                                      <span className="text-xs">{priorityInfo.emoji}</span>
                                      <span className="text-xs font-bold">{priorityInfo.text}</span>
                                    </div>
                                  </div>
                                </motion.div>
                              )
                            })}

                          {stats.queueSize > 5 && (
                            <div className="text-center py-2">
                              <span className="text-xs text-amber-600 font-medium bg-amber-100/50 px-3 py-1 rounded-full border-2 border-amber-200/50">
                                還有 {stats.queueSize - 5} 個任務...
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 提示訊息 - 動物森友會風格 */}
                    <div className="mt-4 p-4 bg-gradient-to-br from-pink-50 to-rose-50 border-3 border-pink-200/70 rounded-2xl shadow-md">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl flex-shrink-0">💡</span>
                        <p className="text-xs text-pink-700 leading-relaxed font-medium">
                          白噗噗正在努力整理你的知識！完成後會自動儲存到對應的助手喔～
                        </p>
                      </div>
                    </div>

                    {/* 連接狀態指示 */}
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${socket?.connected ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                      <span className="text-xs text-amber-600 font-medium">
                        {socket?.connected ? '即時連線中' : '連接中...'}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
