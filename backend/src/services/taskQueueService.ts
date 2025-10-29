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
    useIslandSubAgent?: boolean
    [key: string]: any
  }
}

export class TaskQueueService extends EventEmitter {
  private queue: QueueTask[] = []
  private processing: Map<string, QueueTask> = new Map()
  private maxConcurrent: number = 6 // ⚡ 優化：動態並發控制（基準值）
  private minConcurrent: number = 3 // 最小並發數
  private maxConcurrentLimit: number = 10 // 最大並發數上限
  private io?: SocketIOServer
  private intervalId?: NodeJS.Timeout
  private adjustmentIntervalId?: NodeJS.Timeout

  // ⚡ 優化：動態並發控制 - 性能指標
  private recentTaskTimes: number[] = [] // 最近完成任務的處理時間
  private maxRecentTimes: number = 10 // 記錄最近 10 個任務的時間

  constructor() {
    super()

    // 啟動定期更新進度的定時器
    this.startProgressTimer()

    // ⚡ 優化：啟動動態並發控制定時器（每 30 秒調整一次）
    this.startConcurrencyAdjustment()
  }

  /**
   * 設置 Socket.IO 實例
   */
  setIO(io: SocketIOServer) {
    this.io = io
    logger.info('[TaskQueue] Socket.IO instance set')
  }

  /**
   * 添加任務到隊列
   */
  async addTask(
    userId: string,
    distributionId: string,
    assistantIds: string[],
    priority: TaskPriority = TaskPriority.NORMAL,
    metadata?: { useIslandSubAgent?: boolean; [key: string]: any }
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

    // 根據優先級插入隊列
    if (priority === TaskPriority.HIGH) {
      this.queue.unshift(task)
    } else {
      this.queue.push(task)
    }

    logger.info(`[TaskQueue] Task added: ${taskId}, Priority: ${priority}, Queue size: ${this.queue.length}`)

    // 通知前端隊列更新
    this.notifyQueueUpdate(userId)

    // 嘗試處理下一個任務
    this.processNext()

    return taskId
  }

  /**
   * 處理下一個任務
   */
  private async processNext() {
    // 檢查是否達到並發上限
    if (this.processing.size >= this.maxConcurrent) {
      logger.debug(`[TaskQueue] Concurrent limit reached (${this.processing.size}/${this.maxConcurrent})`)
      return
    }

    // 檢查隊列是否為空
    if (this.queue.length === 0) {
      logger.debug('[TaskQueue] Queue is empty')
      return
    }

    // 取出下一個任務（優先級已排序）
    const task = this.queue.shift()!

    // 標記為處理中
    task.status = TaskStatus.PROCESSING
    task.startedAt = new Date()
    this.processing.set(task.id, task)

    logger.info(`[TaskQueue] Processing task: ${task.id}, Remaining in queue: ${this.queue.length}`)

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
      this.recordTaskTime(task.processingTime)

      // 根據實際結果設置完成訊息
      const memoriesCount = result.memoriesCreated.length
      if (memoriesCount > 0) {
        task.progress.message = `處理完成！已創建 ${memoriesCount} 條記憶`
      } else {
        task.progress.message = '⚠️ 此內容相關性較低，未保存記憶'
      }

      logger.info(`[TaskQueue] Task completed: ${task.id}, Time: ${task.processingTime}ms, Memories: ${memoriesCount}`)

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

      logger.error(`[TaskQueue] Task failed: ${task.id}`, error)

      // 寫入資料庫歷史記錄 (失敗記錄)
      await this.saveTaskHistory(task, null, error)

      // 通知前端任務失敗
      this.notifyTaskError(task, error)

    } finally {
      // 從處理中移除
      this.processing.delete(task.id)

      // 通知隊列更新
      this.notifyQueueUpdate(task.userId)

      // 繼續處理下一個任務
      this.processNext()
    }
  }

  /**
   * 執行任務（調用 Sub-Agent 服務）
   * 支援 Island-based SubAgent 和預設 Assistant 兩種模式
   */
  private async executeTask(task: QueueTask): Promise<any> {
    const { userId, distributionId, assistantIds, metadata } = task

    // 更新進度：開始處理
    task.progress.current = 0
    task.progress.message = '正在分析知識內容...'
    this.notifyTaskProgress(task)

    let result: any

    // 檢查是否使用 Island-based SubAgent
    if (metadata?.useIslandSubAgent) {
      logger.info(`[TaskQueue] 使用 Island-based SubAgent 處理任務 ${task.id}`)
      // assistantIds 在這裡實際上是 islandIds
      const islandIds = assistantIds
      result = await subAgentService.processDistributionWithIslands(
        userId,
        distributionId,
        islandIds
      )
    } else {
      logger.info(`[TaskQueue] 使用預設 Assistant 處理任務 ${task.id}`)
      // 調用傳統 Sub-Agent 服務處理
      result = await subAgentService.processDistribution(
        userId,
        distributionId,
        assistantIds
      )
    }

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
   * 獲取任務狀態
   */
  getTaskStatus(taskId: string): QueueTask | null {
    // 檢查處理中的任務
    if (this.processing.has(taskId)) {
      return this.processing.get(taskId)!
    }

    // 檢查隊列中的任務
    return this.queue.find(t => t.id === taskId) || null
  }

  /**
   * 獲取用戶的所有任務
   */
  getUserTasks(userId: string): QueueTask[] {
    const queueTasks = this.queue.filter(t => t.userId === userId)
    const processingTasks = Array.from(this.processing.values()).filter(t => t.userId === userId)

    return [...processingTasks, ...queueTasks]
  }

  /**
   * 獲取隊列統計
   */
  getStats() {
    return {
      queueSize: this.queue.length,
      processing: this.processing.size,
      maxConcurrent: this.maxConcurrent,
      queue: this.queue.map(t => ({
        id: t.id,
        userId: t.userId,
        status: t.status,
        priority: t.priority,
        progress: t.progress
      })),
      processingTasks: Array.from(this.processing.values()).map(t => ({
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
   * 通知隊列更新
   */
  private notifyQueueUpdate(userId: string) {
    if (!this.io) return

    const stats = this.getStats()
    const userTasks = this.getUserTasks(userId)

    this.io.to(userId).emit('queue-update', {
      stats,
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
   * 啟動進度定時器（定期更新處理中任務的時間）
   */
  private startProgressTimer() {
    this.intervalId = setInterval(() => {
      this.processing.forEach(task => {
        this.notifyTaskProgress(task)
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
   * ⚡ 優化：記錄任務處理時間
   */
  private recordTaskTime(processingTime: number) {
    this.recentTaskTimes.push(processingTime)
    if (this.recentTaskTimes.length > this.maxRecentTimes) {
      this.recentTaskTimes.shift() // 移除最舊的記錄
    }
  }

  /**
   * ⚡ 優化：計算平均處理時間
   */
  private getAverageTaskTime(): number {
    if (this.recentTaskTimes.length === 0) return 0
    const sum = this.recentTaskTimes.reduce((a, b) => a + b, 0)
    return sum / this.recentTaskTimes.length
  }

  /**
   * ⚡ 優化：啟動動態並發控制（根據性能自動調整並發數）
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
   * ⚡ 優化：動態調整並發數
   * 策略：
   * - 如果平均處理時間 < 10 秒 且 隊列有等待任務 → 增加並發
   * - 如果平均處理時間 > 30 秒 → 降低並發（系統負載過高）
   * - 如果隊列為空 → 降低到基準值
   */
  private adjustConcurrency() {
    // 沒有足夠的數據時不調整
    if (this.recentTaskTimes.length < 3) {
      return
    }

    const avgTime = this.getAverageTaskTime()
    const avgTimeSeconds = avgTime / 1000
    const currentConcurrent = this.maxConcurrent
    const queueSize = this.queue.length
    const processingSize = this.processing.size

    // 策略 1: 隊列為空且沒有處理中任務 → 降低到基準值 6
    if (queueSize === 0 && processingSize === 0) {
      if (this.maxConcurrent > 6) {
        this.maxConcurrent = 6
        logger.info(`[TaskQueue] 🔄 調整並發數: ${currentConcurrent} → ${this.maxConcurrent} (隊列空閒，降到基準值)`)
      }
      return
    }

    // 策略 2: 處理快速且有等待任務 → 增加並發
    if (avgTimeSeconds < 10 && queueSize > 0) {
      if (this.maxConcurrent < this.maxConcurrentLimit) {
        this.maxConcurrent = Math.min(this.maxConcurrent + 1, this.maxConcurrentLimit)
        logger.info(`[TaskQueue] 🔄 調整並發數: ${currentConcurrent} → ${this.maxConcurrent} (處理快速 ${avgTimeSeconds.toFixed(1)}s, 增加並發)`)

        // 立即嘗試處理更多任務
        this.processNext()
      }
      return
    }

    // 策略 3: 處理過慢 → 降低並發（避免系統過載）
    if (avgTimeSeconds > 30) {
      if (this.maxConcurrent > this.minConcurrent) {
        this.maxConcurrent = Math.max(this.maxConcurrent - 1, this.minConcurrent)
        logger.info(`[TaskQueue] 🔄 調整並發數: ${currentConcurrent} → ${this.maxConcurrent} (處理過慢 ${avgTimeSeconds.toFixed(1)}s, 降低並發)`)
      }
      return
    }

    // 策略 4: 隊列積壓嚴重 → 適度增加並發
    if (queueSize > 5 && avgTimeSeconds < 20) {
      if (this.maxConcurrent < this.maxConcurrentLimit) {
        this.maxConcurrent = Math.min(this.maxConcurrent + 1, this.maxConcurrentLimit)
        logger.info(`[TaskQueue] 🔄 調整並發數: ${currentConcurrent} → ${this.maxConcurrent} (隊列積壓 ${queueSize}個任務, 增加並發)`)

        // 立即嘗試處理更多任務
        this.processNext()
      }
      return
    }

    // 保持當前並發數
    logger.debug(`[TaskQueue] 🔄 維持並發數: ${this.maxConcurrent} (平均處理時間: ${avgTimeSeconds.toFixed(1)}s, 隊列: ${queueSize}, 處理中: ${processingSize})`)
  }

  /**
   * 等待所有正在處理的任務完成
   */
  async waitForCompletion(timeout: number = 30000): Promise<void> {
    const startTime = Date.now()
    logger.info(`[TaskQueue] Waiting for ${this.processing.size} tasks to complete...`)

    while (this.processing.size > 0) {
      // 檢查是否超時
      if (Date.now() - startTime > timeout) {
        logger.warn(`[TaskQueue] Timeout waiting for tasks, ${this.processing.size} tasks still processing`)
        break
      }

      // 等待 500ms 後再檢查
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    if (this.processing.size === 0) {
      logger.info('[TaskQueue] All tasks completed successfully')
    }
  }

  /**
   * 清理資源
   */
  cleanup() {
    this.stopProgressTimer()
    this.stopConcurrencyAdjustment() // ⚡ 優化：停止動態並發控制
    this.queue = []
    this.processing.clear()
    this.recentTaskTimes = [] // 清空性能記錄
    logger.info('[TaskQueue] Cleanup completed')
  }
}

// 導出單例
export const taskQueueService = new TaskQueueService()
