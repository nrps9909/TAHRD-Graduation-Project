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

interface CompletedTask {
  id: string
  message: string
  completedAt: Date
  categoriesInfo: CategoryInfo[]
}

export function ProcessingQueuePanel() {
  const { user } = useAuthStore()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isExpanded, setIsExpanded] = useState(true)
  const [stats, setStats] = useState<QueueStats | null>(null)
  const [processingTasks, setProcessingTasks] = useState<Map<string, { elapsedTime: number }>>(new Map())
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([])
  const [showCompleted, setShowCompleted] = useState(false)

  // 從資料庫載入歷史記錄(最近10條)
  const { data: historiesData, refetch: refetchHistories } = useQuery<{ taskHistories: TaskHistory[] }>(GET_TASK_HISTORIES, {
    variables: { limit: 10, offset: 0 },
    fetchPolicy: 'network-only',
    onError: (error) => {
      console.error('[TaskHistory] 載入歷史失敗:', error)
    },
  })

  // 獲取用戶 ID
  const userId = user?.id || 'guest-user-id'

  // WebSocket 連接
  useEffect(() => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'
    console.log('[Queue] 連接到 Socket.IO:', backendUrl, '用戶ID:', userId)

    const newSocket = io(backendUrl, {
      // 優先 WebSocket，失敗時回退到 polling
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      // 連接升級配置
      upgrade: true,
      rememberUpgrade: true
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
      // 如果是伺服器主動斷開或傳輸關閉，嘗試立即重連
      if (reason === 'io server disconnect' || reason === 'transport close') {
        console.log('[Queue] 嘗試立即重新連接...')
        newSocket.connect()
      }
    })

    newSocket.on('reconnect', (attemptNumber) => {
      console.log(`[Queue] 重連成功 (第 ${attemptNumber} 次嘗試)`)
      // 重連後重新加入房間和獲取狀態
      newSocket.emit('join-room', { roomId: userId })
      newSocket.emit('get-queue-stats')
    })

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`[Queue] 嘗試重連... (第 ${attemptNumber} 次)`)
    })

    newSocket.on('reconnect_error', (error) => {
      console.error('[Queue] 重連失敗:', error)
    })

    newSocket.on('reconnect_failed', () => {
      console.error('[Queue] 重連失敗，已達最大重試次數')
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
    newSocket.on('task-complete', (data: { taskId: string, progress?: TaskProgress, categoriesInfo?: CategoryInfo[] }) => {
      console.log('[Queue] 任務完成 ✅:', data)

      // 添加到臨時完成列表(用於顯示通知)
      const completedTask: CompletedTask = {
        id: data.taskId,
        message: data.progress?.message || '知識處理',
        completedAt: new Date(),
        categoriesInfo: data.categoriesInfo || []
      }
      setCompletedTasks(prev => [completedTask, ...prev].slice(0, 10))

      // 顯示完成通知 5 秒
      setShowCompleted(true)
      setTimeout(() => setShowCompleted(false), 5000)

      // 清除處理中狀態
      setProcessingTasks(prev => {
        const newMap = new Map(prev)
        newMap.delete(data.taskId)
        return newMap
      })

      // 重新載入資料庫歷史記錄
      setTimeout(() => {
        refetchHistories()
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
  }, [userId, refetchHistories])

  // 格式化時間
  const formatElapsedTime = useCallback((seconds: number): string => {
    if (seconds < 60) return `${seconds}秒`
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}分${secs}秒`
  }, [])

  // 獲取資料庫歷史記錄
  const dbHistories = historiesData?.taskHistories || []

  // 如果沒有任務且沒有歷史記錄，不顯示面板
  if (!stats || (stats.queueSize === 0 && stats.processing === 0 && completedTasks.length === 0 && dbHistories.length === 0)) {
    return null
  }

  // 判斷是否有處理中的任務
  const hasActiveTasks = stats && (stats.queueSize > 0 || stats.processing > 0)

  return (
    <>
      {/* 主隊列面板 - 響應式設計 */}
      <motion.div
        initial={{ opacity: 0, x: -100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -100 }}
        className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-[35] w-[calc(100vw-2rem)] sm:w-[360px] max-w-[360px]"
      >
        {/* 摺疊/展開按鈕 - 優化設計，確保在畫面內 */}
        {!isExpanded && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setIsExpanded(true)}
            className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-amber-400 to-orange-400 rounded-2xl shadow-xl hover:shadow-2xl transition-all border-3 border-white/50 group flex items-center justify-center backdrop-blur-md"
            title="展開隊列"
            style={{
              background: 'linear-gradient(135deg, #fbbf24 0%, #fb923c 100%)',
            }}
          >
            <div className="relative flex flex-col items-center justify-center">
              <motion.span
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-2xl sm:text-3xl"
              >
                ⚙️
              </motion.span>
              {hasActiveTasks && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center"
                >
                  <span className="text-white text-xs font-bold">
                    {(stats?.queueSize || 0) + (stats?.processing || 0)}
                  </span>
                </motion.div>
              )}
            </div>
          </motion.button>
        )}

        {/* 主面板 */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="bg-gradient-to-br from-amber-50/98 via-yellow-50/98 to-orange-50/98 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl border-3 sm:border-4 border-amber-200/70 overflow-hidden"
            >
              {/* 頭部 - 響應式設計 */}
              <div className="relative bg-gradient-to-r from-amber-300/90 to-yellow-300/90 p-3 sm:p-5 border-b-3 sm:border-b-4 border-amber-200/70">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    {/* 狀態指示燈 */}
                    {hasActiveTasks && (
                      <div className="relative flex-shrink-0">
                        <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-br from-green-400 to-green-500 rounded-full shadow-lg border-2 border-green-300 animate-pulse"></div>
                        <div className="absolute inset-0 w-3 h-3 sm:w-4 sm:h-4 bg-green-400 rounded-full animate-ping opacity-75"></div>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-xl font-bold text-amber-900 truncate" style={{
                        textShadow: '0 2px 4px rgba(255,255,255,0.8)',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft JhengHei", sans-serif'
                      }}>
                        {hasActiveTasks ? '🐱 白噗噗思考中' : '📜 處理歷史'}
                      </h3>
                      <p className="text-xs sm:text-sm text-amber-700 font-medium truncate">
                        {stats.processing > 0
                          ? `正在處理 ${stats.processing} 個記憶`
                          : dbHistories.length > 0
                          ? `最近 ${dbHistories.length} 條記錄`
                          : '等待中...'}
                      </p>
                    </div>
                  </div>

                  {/* 收起按鈕 */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsExpanded(false)}
                    className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/30 hover:bg-white/50 transition-all flex items-center justify-center text-amber-900 font-bold border-2 border-white/50"
                    title="收起隊列"
                  >
                    <span className="text-lg sm:text-xl">✕</span>
                  </motion.button>
                </div>
              </div>

              {/* 內容區域 - 響應式設計 */}
              <div className="p-3 sm:p-4 space-y-2 sm:space-y-3 max-h-[50vh] sm:max-h-[400px] overflow-y-auto" style={{
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
                          className="bg-gradient-to-br from-white to-amber-50 border-2 sm:border-3 border-amber-200/70 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-lg"
                        >
                          <div className="flex items-center justify-between gap-2 sm:gap-3">
                            {/* 左側：脈衝指示器 + 訊息 */}
                            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                              <div className="flex-shrink-0 w-2 h-2 sm:w-3 sm:h-3 bg-blue-400 rounded-full animate-pulse shadow-lg"></div>
                              <p className="text-xs sm:text-sm font-bold text-amber-900 truncate">
                                {task.progress.message}
                              </p>
                            </div>

                            {/* 右側：時間 */}
                            <div className="flex-shrink-0">
                              <span className="text-sm sm:text-lg font-mono font-bold text-blue-700 bg-blue-50 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl border-1 sm:border-2 border-blue-200/70 shadow-sm">
                                {taskInfo ? formatElapsedTime(taskInfo.elapsedTime) : '0秒'}
                              </span>
                            </div>
                          </div>

                          {/* 進度條 */}
                          <div className="mt-2 sm:mt-3 h-1.5 sm:h-2 bg-white/70 rounded-full overflow-hidden border-1 sm:border-2 border-amber-200/50 shadow-inner">
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

                {/* 等待中的任務數量 - 響應式 */}
                {stats.queueSize > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-2 sm:py-3"
                  >
                    <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-amber-100/70 rounded-lg sm:rounded-xl border-1 sm:border-2 border-amber-200/50">
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-amber-400 rounded-full"></span>
                      <span className="text-xs sm:text-sm font-bold text-amber-700">
                        還有 {stats.queueSize} 個記憶在等待
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* 沒有任務時顯示歷史記錄 - 響應式 */}
                {stats.processing === 0 && stats.queueSize === 0 && (
                  <div className="space-y-1.5 sm:space-y-2">
                    {dbHistories.length === 0 ? (
                      <div className="text-center py-4 sm:py-6">
                        <p className="text-xs sm:text-sm text-amber-600 font-medium">
                          ✨ 尚無處理記錄
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="text-xs font-bold text-amber-700 px-1">
                          📜 處理歷史
                        </div>
                        {dbHistories.slice(0, 5).map((history) => (
                          <motion.div
                            key={history.id}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white/60 border-1 sm:border-2 border-amber-200/50 rounded-lg sm:rounded-xl p-2 sm:p-3 hover:bg-white/80 transition-all"
                          >
                            <div className="flex items-center justify-between gap-1.5 sm:gap-2 mb-1">
                              <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                                <span className="flex-shrink-0 text-base sm:text-lg">
                                  {history.status === 'COMPLETED' ? '✅' : '❌'}
                                </span>
                                <p className="text-xs font-bold text-amber-900 truncate">
                                  {history.message}
                                </p>
                              </div>
                              {history.processingTime && (
                                <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 sm:px-2 rounded-md sm:rounded-lg">
                                  {(history.processingTime / 1000).toFixed(1)}s
                                </span>
                              )}
                            </div>
                            {history.categoriesInfo && history.categoriesInfo.length > 0 && (
                              <div className="flex items-center gap-1 mt-1.5 sm:mt-2 flex-wrap">
                                {history.categoriesInfo.map((cat: CategoryInfo, idx: number) => (
                                  <span
                                    key={idx}
                                    className="text-xs bg-amber-100/70 px-1.5 py-0.5 sm:px-2 rounded-md sm:rounded-lg border border-amber-200/50"
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
                <div className="flex items-center justify-center gap-1.5 sm:gap-2 pt-2">
                  <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${socket?.connected ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                  <span className="text-xs text-amber-600 font-medium">
                    {socket?.connected ? '即時連線中' : '連接中...'}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* 完成通知浮窗 - 響應式 */}
      <AnimatePresence>
        {showCompleted && completedTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="fixed bottom-4 left-4 sm:bottom-6 sm:left-[420px] z-[36] w-[calc(100vw-2rem)] sm:w-[380px] max-w-[380px]"
          >
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-2xl border-2 sm:border-3 border-green-200/70">
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-400 to-emerald-400 rounded-full flex items-center justify-center text-xl sm:text-2xl shadow-lg">
                  ✓
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-base sm:text-lg font-bold text-green-900 mb-0.5 sm:mb-1">
                    知識整理完成！
                  </h4>
                  <p className="text-xs sm:text-sm text-green-700 font-medium truncate">
                    {completedTasks[0].message}
                  </p>
                </div>
              </div>

              {/* 分類信息列表 - 響應式 */}
              {completedTasks[0].categoriesInfo.length > 0 && (
                <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t-1 sm:border-t-2 border-green-200/50">
                  <p className="text-xs font-bold text-green-800 mb-1.5 sm:mb-2">已歸類到：</p>
                  <div className="space-y-1 sm:space-y-1.5">
                    {completedTasks[0].categoriesInfo.map((category, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex items-center gap-1.5 sm:gap-2 bg-white/60 rounded-lg sm:rounded-xl px-2 py-1.5 sm:px-3 sm:py-2 border border-green-200/50"
                      >
                        <span className="text-base sm:text-lg">{category.categoryEmoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-green-900 truncate">
                            {category.categoryName}
                          </p>
                          {category.islandName && (
                            <p className="text-xs text-green-600 truncate">
                              {category.islandName}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
