/**
 * TaskQueueService - Sub-Agent 任務隊列系統
 *
 * 功能：
 * 1. 管理 Sub-Agent 處理隊列（防止並發過載）
 * 2. 追蹤任務狀態和進度
 * 3. 通過 WebSocket 即時通知前端
 * 4. 支援任務優先級
 */

import { EventEmitter } from 'events'
import { logger } from '../utils/logger'
import { subAgentService } from './subAgentService'
import { Server as SocketIOServer } from 'socket.io'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export enum TaskStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export enum TaskPriority {
  HIGH = 'HIGH',
  NORMAL = 'NORMAL',
  LOW = 'LOW'
}

export interface QueueTask {
  id: string
  userId: string
  distributionId: string
  assistantIds: string[]
  priority: TaskPriority
  status: TaskStatus
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  processingTime?: number
  error?: string
  progress: {
    current: number
    total: number
    message: string
  }
  metadata?: {
    [key: string]: any
  }
}

/**
 * 用戶級別的任務隊列
 * 每個用戶擁有獨立的隊列、並發控制和性能追蹤
 */
class UserQueue {
  queue: QueueTask[] = []
  processing: Map<string, QueueTask> = new Map()
  maxConcurrent: number = 3 // 每個用戶的並發限制（更保守）
  minConcurrent: number = 1
  maxConcurrentLimit: number = 5 // 單用戶最大並發上限
  recentTaskTimes: number[] = []
  maxRecentTimes: number = 10
  lastActivityAt: Date = new Date()

  /**
   * 記錄任務處理時間
   */
  recordTaskTime(processingTime: number) {
    this.recentTaskTimes.push(processingTime)
    if (this.recentTaskTimes.length > this.maxRecentTimes) {
      this.recentTaskTimes.shift()
    }
    this.lastActivityAt = new Date()
  }

  /**
   * 計算平均處理時間
   */
  getAverageTaskTime(): number {
    if (this.recentTaskTimes.length === 0) return 0
    const sum = this.recentTaskTimes.reduce((a, b) => a + b, 0)
    return sum / this.recentTaskTimes.length
  }

  /**
   * 獲取隊列統計
   */
  getStats() {
    return {
      queueSize: this.queue.length,
      processing: this.processing.size,
      maxConcurrent: this.maxConcurrent,
      avgTaskTime: this.getAverageTaskTime()
    }
  }
}

export class TaskQueueService extends EventEmitter {
  // 用戶級別的隊列映射
  private userQueues: Map<string, UserQueue> = new Map()

  // 全局配置
  private io?: SocketIOServer
  private intervalId?: NodeJS.Timeout
  private adjustmentIntervalId?: NodeJS.Timeout
  private cleanupIntervalId?: NodeJS.Timeout

  constructor() {
    super()

    // 啟動定期更新進度的定時器
    this.startProgressTimer()

    // ⚡ 優化：啟動動態並發控制定時器（每 30 秒調整一次）
    this.startConcurrencyAdjustment()

    // 🧹 新增：啟動過期用戶隊列清理定時器（每 10 分鐘清理一次）
    this.startQueueCleanup()
  }

  /**
   * 獲取或創建用戶隊列
   */
  private getUserQueue(userId: string): UserQueue {
    if (!this.userQueues.has(userId)) {
      this.userQueues.set(userId, new UserQueue())
      logger.info(`[TaskQueue] Created new queue for user: ${userId}`)
    }
    return this.userQueues.get(userId)!
  }

  /**
   * 設置 Socket.IO 實例
   */
  setIO(io: SocketIOServer) {
    this.io = io
    logger.info('[TaskQueue] Socket.IO instance set')
  }

  /**
   * 添加任務到用戶隊列
   * @param assistantIds - 實際上是 islandIds（Island-based 系統）
   */
  async addTask(
    userId: string,
    distributionId: string,
    assistantIds: string[],
    priority: TaskPriority = TaskPriority.NORMAL,
    metadata?: { [key: string]: any }
  ): Promise<string> {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const task: QueueTask = {
      id: taskId,
      userId,
      distributionId,
      assistantIds,
      priority,
      status: TaskStatus.PENDING,
      createdAt: new Date(),
      progress: {
        current: 0,
        total: assistantIds.length,
        message: '等待處理中...'
      },
      metadata
    }

    // 獲取用戶的隊列
    const userQueue = this.getUserQueue(userId)

    // 根據優先級插入隊列
    if (priority === TaskPriority.HIGH) {
      userQueue.queue.unshift(task)
    } else {
      userQueue.queue.push(task)
    }

    logger.info(
      `[TaskQueue] Task added: ${taskId}, User: ${userId}, Priority: ${priority}, ` +
      `User queue size: ${userQueue.queue.length}`
    )

    // 通知前端隊列更新
    this.notifyQueueUpdate(userId)

    // 嘗試處理該用戶的下一個任務
    this.processNextForUser(userId)

    return taskId
  }

  /**
   * 處理用戶的下一個任務
   */
  private async processNextForUser(userId: string) {
    const userQueue = this.getUserQueue(userId)

    // 檢查是否達到該用戶的並發上限
    if (userQueue.processing.size >= userQueue.maxConcurrent) {
      logger.debug(
        `[TaskQueue] User ${userId} concurrent limit reached ` +
        `(${userQueue.processing.size}/${userQueue.maxConcurrent})`
      )
      return
    }

    // 檢查用戶隊列是否為空
    if (userQueue.queue.length === 0) {
      logger.debug(`[TaskQueue] User ${userId} queue is empty`)
      return
    }

    // 取出下一個任務（優先級已排序）
    const task = userQueue.queue.shift()!

    // 標記為處理中
    task.status = TaskStatus.PROCESSING
    task.startedAt = new Date()
    userQueue.processing.set(task.id, task)

    logger.info(
      `[TaskQueue] Processing task: ${task.id}, User: ${userId}, ` +
      `Remaining in user queue: ${userQueue.queue.length}`
    )

    // 通知前端任務開始
    this.notifyTaskStart(task)

    try {
      // 執行 Sub-Agent 處理
      const result = await this.executeTask(task)

      // 標記為完成
      task.status = TaskStatus.COMPLETED
      task.completedAt = new Date()
      task.processingTime = task.completedAt.getTime() - task.startedAt!.getTime()

      // ⚡ 優化：記錄處理時間（用於動態並發控制）
      userQueue.recordTaskTime(task.processingTime)

      // 根據實際結果設置完成訊息
      const memoriesCount = result.memoriesCreated.length
      if (memoriesCount > 0) {
        task.progress.message = `處理完成！已創建 ${memoriesCount} 條記憶`
      } else {
        task.progress.message = '⚠️ 此內容相關性較低，未保存記憶'
      }

      logger.info(
        `[TaskQueue] Task completed: ${task.id}, User: ${userId}, ` +
        `Time: ${task.processingTime}ms, Memories: ${memoriesCount}`
      )

      // 寫入資料庫歷史記錄
      await this.saveTaskHistory(task, result)

      // 通知前端任務完成
      this.notifyTaskComplete(task, result)

    } catch (error: any) {
      // 標記為失敗
      task.status = TaskStatus.FAILED
      task.error = error.message
      task.completedAt = new Date()
      task.progress.message = `處理失敗: ${error.message}`

      logger.error(`[TaskQueue] Task failed: ${task.id}, User: ${userId}`, error)

      // 寫入資料庫歷史記錄 (失敗記錄)
      await this.saveTaskHistory(task, null, error)

      // 通知前端任務失敗
      this.notifyTaskError(task, error)

    } finally {
      // 從處理中移除
      userQueue.processing.delete(task.id)

      // 通知隊列更新
      this.notifyQueueUpdate(task.userId)

      // 繼續處理該用戶的下一個任務
      this.processNextForUser(userId)
    }
  }

  /**
   * 執行任務（調用 Island-based Sub-Agent 服務）
   */
  private async executeTask(task: QueueTask): Promise<any> {
    const { userId, distributionId, assistantIds } = task

    // 更新進度：開始處理
    task.progress.current = 0
    task.progress.message = '正在分析知識內容...'
    this.notifyTaskProgress(task)

    logger.info(`[TaskQueue] 使用 Island-based SubAgent 處理任務 ${task.id}`)

    // assistantIds 實際上是 islandIds
    const islandIds = assistantIds
    const result = await subAgentService.processDistributionWithIslands(
      userId,
      distributionId,
      islandIds
    )

    // 更新進度：完成
    task.progress.current = task.progress.total
    const memoriesCount = result.memoriesCreated.length
    if (memoriesCount > 0) {
      task.progress.message = `已創建 ${memoriesCount} 條記憶`
    } else {
      task.progress.message = '⚠️ 此內容相關性較低，未保存記憶'
    }
    this.notifyTaskProgress(task)

    return result
  }

  /**
   * 獲取任務狀態（需要提供 userId 用於定位正確的隊列）
   */
  getTaskStatus(taskId: string, userId: string): QueueTask | null {
    const userQueue = this.getUserQueue(userId)

    // 檢查處理中的任務
    if (userQueue.processing.has(taskId)) {
      return userQueue.processing.get(taskId)!
    }

    // 檢查隊列中的任務
    return userQueue.queue.find(t => t.id === taskId) || null
  }

  /**
   * 獲取用戶的所有任務
   */
  getUserTasks(userId: string): QueueTask[] {
    const userQueue = this.getUserQueue(userId)
    const queueTasks = userQueue.queue
    const processingTasks = Array.from(userQueue.processing.values())

    return [...processingTasks, ...queueTasks]
  }

  /**
   * 獲取全局隊列統計
   */
  getStats() {
    let totalQueueSize = 0
    let totalProcessing = 0
    const userStats: any[] = []

    // 聚合所有用戶的統計
    this.userQueues.forEach((userQueue, userId) => {
      totalQueueSize += userQueue.queue.length
      totalProcessing += userQueue.processing.size

      if (userQueue.queue.length > 0 || userQueue.processing.size > 0) {
        userStats.push({
          userId,
          queueSize: userQueue.queue.length,
          processing: userQueue.processing.size,
          maxConcurrent: userQueue.maxConcurrent,
          avgTaskTime: userQueue.getAverageTaskTime()
        })
      }
    })

    return {
      totalUsers: this.userQueues.size,
      activeUsers: userStats.length,
      totalQueueSize,
      totalProcessing,
      userStats
    }
  }

  /**
   * 獲取用戶的隊列統計
   */
  getUserStats(userId: string) {
    const userQueue = this.getUserQueue(userId)

    return {
      userId,
      queueSize: userQueue.queue.length,
      processing: userQueue.processing.size,
      maxConcurrent: userQueue.maxConcurrent,
      avgTaskTime: userQueue.getAverageTaskTime(),
      queue: userQueue.queue.map(t => ({
        id: t.id,
        status: t.status,
        priority: t.priority,
        progress: t.progress
      })),
      processingTasks: Array.from(userQueue.processing.values()).map(t => ({
        id: t.id,
        userId: t.userId,
        status: t.status,
        progress: t.progress,
        elapsedTime: Date.now() - (t.startedAt?.getTime() || Date.now())
      }))
    }
  }

  /**
   * 保存任務歷史到資料庫
   */
  private async saveTaskHistory(task: QueueTask, result: any | null, error?: Error) {
    try {
      const categoriesInfo = result?.categoriesInfo || []
      const memoriesCreated = result?.memoriesCreated?.length || 0

      // 詳細日誌記錄,方便調試
      logger.info(`[TaskQueue] 準備保存任務歷史:`)
      logger.info(`  - taskId: ${task.id}`)
      logger.info(`  - status: ${task.status}`)
      logger.info(`  - memoriesCreated: ${memoriesCreated}`)
      logger.info(`  - categoriesInfo.length: ${categoriesInfo.length}`)
      logger.info(`  - categoriesInfo detail: ${JSON.stringify(categoriesInfo)}`)

      await prisma.taskHistory.create({
        data: {
          userId: task.userId,
          taskId: task.id,
          distributionId: task.distributionId,
          status: task.status,
          priority: task.priority,
          message: task.progress.message,
          processingTime: task.processingTime || null,
          memoriesCreated,
          categoriesInfo,
          errorMessage: error?.message || null,
          startedAt: task.startedAt || new Date(),
          completedAt: task.completedAt || new Date(),
        },
      })

      logger.info(`[TaskQueue] ✅ Task history saved successfully: ${task.id}`)
    } catch (err: any) {
      logger.error(`[TaskQueue] ❌ Failed to save task history: ${task.id}`, err)
      logger.error(`[TaskQueue] Error details:`, {
        error: err.message,
        stack: err.stack,
        taskId: task.id,
        resultKeys: result ? Object.keys(result) : 'null'
      })
      // 不拋出錯誤,避免影響主流程
    }
  }

  /**
   * 通知用戶隊列更新（發送用戶專屬統計）
   */
  private notifyQueueUpdate(userId: string) {
    if (!this.io) return

    const userStats = this.getUserStats(userId)
    const userTasks = this.getUserTasks(userId)

    this.io.to(userId).emit('queue-update', {
      stats: userStats,
      userTasks
    })

    logger.debug(`[TaskQueue] Notified queue update to user: ${userId}`)
  }

  /**
   * 通知任務開始
   */
  private notifyTaskStart(task: QueueTask) {
    if (!this.io) return

    this.io.to(task.userId).emit('task-start', {
      taskId: task.id,
      distributionId: task.distributionId,
      progress: task.progress,
      startedAt: task.startedAt
    })

    logger.debug(`[TaskQueue] Notified task start: ${task.id}`)
  }

  /**
   * 通知任務進度更新
   */
  private notifyTaskProgress(task: QueueTask) {
    if (!this.io) return

    const elapsedTime = task.startedAt
      ? Math.floor((Date.now() - task.startedAt.getTime()) / 1000)
      : 0

    this.io.to(task.userId).emit('task-progress', {
      taskId: task.id,
      distributionId: task.distributionId,
      progress: task.progress,
      elapsedTime
    })

    logger.debug(`[TaskQueue] Notified task progress: ${task.id} - ${task.progress.message}`)
  }

  /**
   * 通知任務完成
   */
  private notifyTaskComplete(task: QueueTask, result: any) {
    if (!this.io) {
      logger.warn(`[TaskQueue] ⚠️ Socket.IO 未初始化，無法發送 task-complete 事件`)
      return
    }

    const payload = {
      taskId: task.id,
      distributionId: task.distributionId,
      progress: task.progress, // 添加 progress 資訊供前端顯示
      result: {
        memoriesCreated: result.memoriesCreated.length,
        agentDecisions: result.agentDecisions.length
      },
      categoriesInfo: result.categoriesInfo || [], // 新增：記憶的分類信息
      processingTime: task.processingTime
    }

    logger.info(`[TaskQueue] 📤 發送 task-complete 事件:`, {
      taskId: task.id,
      userId: task.userId,
      message: task.progress.message,
      categoriesInfoLength: payload.categoriesInfo.length,
      memoriesCreated: result.memoriesCreated.length
    })

    this.io.to(task.userId).emit('task-complete', payload)

    logger.info(`[TaskQueue] ✅ task-complete 事件已發送到 room: ${task.userId}`)
  }

  /**
   * 通知任務錯誤
   */
  private notifyTaskError(task: QueueTask, error: Error) {
    if (!this.io) return

    this.io.to(task.userId).emit('task-error', {
      taskId: task.id,
      distributionId: task.distributionId,
      error: error.message
    })

    logger.debug(`[TaskQueue] Notified task error: ${task.id}`)
  }

  /**
   * 啟動進度定時器（定期更新所有用戶處理中任務的時間）
   */
  private startProgressTimer() {
    this.intervalId = setInterval(() => {
      this.userQueues.forEach((userQueue, userId) => {
        userQueue.processing.forEach(task => {
          this.notifyTaskProgress(task)
        })
      })
    }, 1000) // 每秒更新一次

    logger.info('[TaskQueue] Progress timer started')
  }

  /**
   * 停止進度定時器
   */
  stopProgressTimer() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = undefined
      logger.info('[TaskQueue] Progress timer stopped')
    }
  }

  /**
   * ⚡ 優化：啟動動態並發控制（根據性能自動調整每個用戶的並發數）
   */
  private startConcurrencyAdjustment() {
    this.adjustmentIntervalId = setInterval(() => {
      this.adjustConcurrency()
    }, 30000) // 每 30 秒調整一次

    logger.info('[TaskQueue] Dynamic concurrency adjustment started')
  }

  /**
   * ⚡ 優化：停止動態並發控制
   */
  private stopConcurrencyAdjustment() {
    if (this.adjustmentIntervalId) {
      clearInterval(this.adjustmentIntervalId)
      this.adjustmentIntervalId = undefined
      logger.info('[TaskQueue] Dynamic concurrency adjustment stopped')
    }
  }

  /**
   * ⚡ 優化：動態調整所有用戶的並發數
   * 策略：
   * - 如果平均處理時間 < 10 秒 且 隊列有等待任務 → 增加並發
   * - 如果平均處理時間 > 30 秒 → 降低並發（系統負載過高）
   * - 如果隊列為空 → 降低到基準值
   */
  private adjustConcurrency() {
    this.userQueues.forEach((userQueue, userId) => {
      // 沒有足夠的數據時不調整
      if (userQueue.recentTaskTimes.length < 3) {
        return
      }

      const avgTime = userQueue.getAverageTaskTime()
      const avgTimeSeconds = avgTime / 1000
      const currentConcurrent = userQueue.maxConcurrent
      const queueSize = userQueue.queue.length
      const processingSize = userQueue.processing.size

      // 策略 1: 隊列為空且沒有處理中任務 → 降低到基準值 3
      if (queueSize === 0 && processingSize === 0) {
        if (userQueue.maxConcurrent > 3) {
          userQueue.maxConcurrent = 3
          logger.info(
            `[TaskQueue] 🔄 調整用戶 ${userId} 並發數: ${currentConcurrent} → ${userQueue.maxConcurrent} ` +
            `(隊列空閒，降到基準值)`
          )
        }
        return
      }

      // 策略 2: 處理快速且有等待任務 → 增加並發
      if (avgTimeSeconds < 10 && queueSize > 0) {
        if (userQueue.maxConcurrent < userQueue.maxConcurrentLimit) {
          userQueue.maxConcurrent = Math.min(userQueue.maxConcurrent + 1, userQueue.maxConcurrentLimit)
          logger.info(
            `[TaskQueue] 🔄 調整用戶 ${userId} 並發數: ${currentConcurrent} → ${userQueue.maxConcurrent} ` +
            `(處理快速 ${avgTimeSeconds.toFixed(1)}s, 增加並發)`
          )

          // 立即嘗試處理更多任務
          this.processNextForUser(userId)
        }
        return
      }

      // 策略 3: 處理過慢 → 降低並發（避免系統過載）
      if (avgTimeSeconds > 30) {
        if (userQueue.maxConcurrent > userQueue.minConcurrent) {
          userQueue.maxConcurrent = Math.max(userQueue.maxConcurrent - 1, userQueue.minConcurrent)
          logger.info(
            `[TaskQueue] 🔄 調整用戶 ${userId} 並發數: ${currentConcurrent} → ${userQueue.maxConcurrent} ` +
            `(處理過慢 ${avgTimeSeconds.toFixed(1)}s, 降低並發)`
          )
        }
        return
      }

      // 策略 4: 隊列積壓嚴重 → 適度增加並發
      if (queueSize > 3 && avgTimeSeconds < 20) {
        if (userQueue.maxConcurrent < userQueue.maxConcurrentLimit) {
          userQueue.maxConcurrent = Math.min(userQueue.maxConcurrent + 1, userQueue.maxConcurrentLimit)
          logger.info(
            `[TaskQueue] 🔄 調整用戶 ${userId} 並發數: ${currentConcurrent} → ${userQueue.maxConcurrent} ` +
            `(隊列積壓 ${queueSize} 個任務, 增加並發)`
          )

          // 立即嘗試處理更多任務
          this.processNextForUser(userId)
        }
        return
      }

      // 保持當前並發數
      logger.debug(
        `[TaskQueue] 🔄 維持用戶 ${userId} 並發數: ${userQueue.maxConcurrent} ` +
        `(平均處理時間: ${avgTimeSeconds.toFixed(1)}s, 隊列: ${queueSize}, 處理中: ${processingSize})`
      )
    })
  }

  /**
   * 🧹 清理過期的用戶隊列（超過 1 小時無活動）
   */
  private startQueueCleanup() {
    this.cleanupIntervalId = setInterval(() => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      let cleanedCount = 0

      this.userQueues.forEach((userQueue, userId) => {
        // 只清理空閒且超過 1 小時無活動的隊列
        if (
          userQueue.queue.length === 0 &&
          userQueue.processing.size === 0 &&
          userQueue.lastActivityAt < oneHourAgo
        ) {
          this.userQueues.delete(userId)
          cleanedCount++
        }
      })

      if (cleanedCount > 0) {
        logger.info(`[TaskQueue] 🧹 清理了 ${cleanedCount} 個過期用戶隊列`)
      }
    }, 10 * 60 * 1000) // 每 10 分鐘清理一次

    logger.info('[TaskQueue] Queue cleanup timer started')
  }

  /**
   * 停止隊列清理定時器
   */
  private stopQueueCleanup() {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId)
      this.cleanupIntervalId = undefined
      logger.info('[TaskQueue] Queue cleanup timer stopped')
    }
  }

  /**
   * 等待所有正在處理的任務完成
   */
  async waitForCompletion(timeout: number = 30000): Promise<void> {
    const startTime = Date.now()
    let totalProcessing = 0

    this.userQueues.forEach(userQueue => {
      totalProcessing += userQueue.processing.size
    })

    logger.info(`[TaskQueue] Waiting for ${totalProcessing} tasks to complete...`)

    while (totalProcessing > 0) {
      // 檢查是否超時
      if (Date.now() - startTime > timeout) {
        logger.warn(`[TaskQueue] Timeout waiting for tasks, ${totalProcessing} tasks still processing`)
        break
      }

      // 等待 500ms 後再檢查
      await new Promise(resolve => setTimeout(resolve, 500))

      // 重新計算處理中的任務數
      totalProcessing = 0
      this.userQueues.forEach(userQueue => {
        totalProcessing += userQueue.processing.size
      })
    }

    if (totalProcessing === 0) {
      logger.info('[TaskQueue] All tasks completed successfully')
    }
  }

  /**
   * 清理資源
   */
  cleanup() {
    this.stopProgressTimer()
    this.stopConcurrencyAdjustment()
    this.stopQueueCleanup()
    this.userQueues.clear()
    logger.info('[TaskQueue] Cleanup completed')
  }
}

// 導出單例
export const taskQueueService = new TaskQueueService()
