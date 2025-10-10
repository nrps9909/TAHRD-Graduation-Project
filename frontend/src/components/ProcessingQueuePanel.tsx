/**
 * ProcessingQueuePanel - 處理隊列顯示面板
 *
 * 功能：
 * 1. 顯示當前處理中的任務
 * 2. 顯示待處理隊列
 * 3. 即時更新進度和處理時間
 * 4. 通過 WebSocket 接收後端更新
 */

import { useState, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'

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

interface QueueStats {
  queueSize: number
  processing: number
  maxConcurrent: number
  processingTasks: Array<{
    id: string
    userId: string
    status: string
    progress: TaskProgress
    elapsedTime: number
  }>
}

export function ProcessingQueuePanel() {
  const [_socket, setSocket] = useState<Socket | null>(null)
  const [isExpanded, setIsExpanded] = useState(true)
  const [stats, setStats] = useState<QueueStats | null>(null)
  const [userTasks, setUserTasks] = useState<QueueTask[]>([])
  const [processingTasks, setProcessingTasks] = useState<Map<string, { elapsedTime: number }>>(new Map())

  // WebSocket 連接
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    })

    newSocket.on('connect', () => {
      console.log('[Queue] WebSocket connected')

      // 加入用戶房間（假設使用 guest）
      newSocket.emit('join-room', { roomId: 'guest-user-id' })

      // 獲取初始隊列狀態
      newSocket.emit('get-queue-stats')
      newSocket.emit('get-user-tasks', { userId: 'guest-user-id' })
    })

    // 監聽隊列更新
    newSocket.on('queue-update', (data: { stats: QueueStats, userTasks: QueueTask[] }) => {
      console.log('[Queue] Queue update received', data)
      setStats(data.stats)
      setUserTasks(data.userTasks)
    })

    // 監聽任務開始
    newSocket.on('task-start', (data: any) => {
      console.log('[Queue] Task started', data)
    })

    // 監聽任務進度
    newSocket.on('task-progress', (data: { taskId: string, progress: TaskProgress, elapsedTime: number }) => {
      console.log('[Queue] Task progress', data)
      setProcessingTasks(prev => new Map(prev).set(data.taskId, { elapsedTime: data.elapsedTime }))
    })

    // 監聽任務完成
    newSocket.on('task-complete', (data: any) => {
      console.log('[Queue] Task completed', data)
      setProcessingTasks(prev => {
        const newMap = new Map(prev)
        newMap.delete(data.taskId)
        return newMap
      })
    })

    // 監聽任務錯誤
    newSocket.on('task-error', (data: any) => {
      console.error('[Queue] Task error', data)
      setProcessingTasks(prev => {
        const newMap = new Map(prev)
        newMap.delete(data.taskId)
        return newMap
      })
    })

    // 監聽隊列狀態
    newSocket.on('queue-stats', (data: QueueStats) => {
      setStats(data)
    })

    // 監聽用戶任務
    newSocket.on('user-tasks', (tasks: QueueTask[]) => {
      setUserTasks(tasks)
    })

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, [])

  // 格式化時間
  const formatElapsedTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}秒`
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}分${secs}秒`
  }

  // 如果沒有任務，不顯示面板
  if (!stats || (stats.queueSize === 0 && stats.processing === 0)) {
    return null
  }

  return (
    <div className="fixed bottom-6 right-6 z-[35] w-96">
      {/* 摺疊按鈕 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -left-12 top-4 bg-white/90 backdrop-blur-md rounded-l-xl px-3 py-4 shadow-lg hover:bg-white transition-all group"
        title={isExpanded ? '收起隊列' : '展開隊列'}
      >
        <span className={`text-xl transition-transform duration-300 ${isExpanded ? 'rotate-0' : 'rotate-180'}`}>
          ▶
        </span>
      </button>

      {/* 主面板 */}
      <div
        className={`bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden transition-all duration-500 border-2 border-pink-200 ${
          isExpanded ? 'translate-x-0 opacity-100' : 'translate-x-[450px] opacity-0'
        }`}
      >
        {/* 頭部 */}
        <div className="p-4 bg-gradient-to-r from-pink-400 to-purple-400 text-white">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <div className="flex-1">
              <h3 className="text-lg font-bold">處理隊列</h3>
              <p className="text-xs opacity-90">
                處理中: {stats.processing} / {stats.maxConcurrent} · 等待中: {stats.queueSize}
              </p>
            </div>
          </div>
        </div>

        {/* 內容區域 */}
        <div className="p-4 max-h-96 overflow-y-auto space-y-3">
          {/* 處理中的任務 */}
          {stats.processingTasks && stats.processingTasks.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-gray-600 mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                處理中
              </h4>
              {stats.processingTasks.map(task => {
                const taskInfo = processingTasks.get(task.id)
                return (
                  <div
                    key={task.id}
                    className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-2 animate-pulse-slow"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-700">
                        {task.progress.message}
                      </span>
                      <span className="text-xs text-blue-600 font-mono">
                        {taskInfo ? formatElapsedTime(taskInfo.elapsedTime) : '0秒'}
                      </span>
                    </div>

                    {/* 進度條 */}
                    <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-500 animate-shimmer"
                        style={{
                          width: `${(task.progress.current / task.progress.total) * 100}%`
                        }}
                      />
                    </div>

                    <div className="mt-2 text-xs text-blue-600">
                      {task.progress.current} / {task.progress.total}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* 待處理隊列 */}
          {stats.queueSize > 0 && (
            <div>
              <h4 className="text-xs font-bold text-gray-600 mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                等待中 ({stats.queueSize})
              </h4>
              <div className="space-y-2">
                {userTasks
                  .filter(task => task.status === 'PENDING')
                  .slice(0, 3)
                  .map((task, index) => (
                    <div
                      key={task.id}
                      className="bg-gray-50 border border-gray-200 rounded-xl p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">
                          #{index + 1} {task.progress.message}
                        </span>
                        <span className="text-xs text-gray-500">
                          {task.priority === 'HIGH' && '⚡ 高'}
                          {task.priority === 'NORMAL' && '📝 普通'}
                          {task.priority === 'LOW' && '📦 低'}
                        </span>
                      </div>
                    </div>
                  ))}

                {stats.queueSize > 3 && (
                  <div className="text-center text-xs text-gray-500 py-2">
                    還有 {stats.queueSize - 3} 個任務等待中...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 提示訊息 */}
          <div className="mt-4 p-3 bg-pink-50 border border-pink-200 rounded-xl">
            <p className="text-xs text-pink-700">
              💡 系統會自動依序處理您的知識，請稍候片刻
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
