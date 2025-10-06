/**
 * Memory Archival Scheduler
 * 定期執行 NPC 記憶歸檔任務
 *
 * 功能：
 * 1. 每天凌晨 2 點執行記憶篩選
 * 2. 將 7 天前的短期記憶通過 AI 篩選轉為長期記憶
 * 3. 記錄執行日誌
 */

import cron from 'node-cron'
import { logger } from '../utils/logger'
import { npcMemoryService } from './npcMemoryService'

class MemoryArchivalScheduler {
  private cronJob: cron.ScheduledTask | null = null
  private isRunning = false

  /**
   * 啟動定期歸檔任務
   * 預設每天凌晨 2 點執行
   */
  start(cronExpression: string = '0 2 * * *') {
    if (this.cronJob) {
      logger.warn('Memory archival scheduler is already running')
      return
    }

    logger.info(`Starting memory archival scheduler with cron: ${cronExpression}`)

    this.cronJob = cron.schedule(cronExpression, async () => {
      await this.runArchivalTask()
    })

    logger.info('✅ Memory archival scheduler started successfully')
  }

  /**
   * 立即執行一次歸檔任務（用於測試）
   */
  async runNow(): Promise<void> {
    logger.info('Running memory archival task immediately...')
    await this.runArchivalTask()
  }

  /**
   * 執行歸檔任務的核心邏輯
   */
  private async runArchivalTask(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Memory archival task is already running, skipping this execution')
      return
    }

    this.isRunning = true
    const startTime = Date.now()

    try {
      logger.info('========================================')
      logger.info('Starting scheduled memory archival task')
      logger.info('========================================')

      // 執行歸檔（篩選過去 7 天的記憶）
      await npcMemoryService.archiveAllNPCMemories(7)

      const duration = ((Date.now() - startTime) / 1000).toFixed(2)
      logger.info('========================================')
      logger.info(`Memory archival task completed in ${duration}s`)
      logger.info('========================================')

    } catch (error) {
      logger.error('Memory archival task failed:', error)

      // 可以在這裡添加告警通知
      // await this.sendErrorNotification(error)

    } finally {
      this.isRunning = false
    }
  }

  /**
   * 停止定期任務
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop()
      this.cronJob = null
      logger.info('Memory archival scheduler stopped')
    }
  }

  /**
   * 獲取調度器狀態
   */
  getStatus(): {
    isScheduled: boolean
    isRunning: boolean
    nextExecution: string | null
  } {
    return {
      isScheduled: this.cronJob !== null,
      isRunning: this.isRunning,
      nextExecution: this.cronJob ? 'Next: Daily at 2:00 AM' : null
    }
  }

  /**
   * 手動觸發特定 NPC 和用戶的記憶篩選
   */
  async filterSpecificMemory(npcId: string, userId: string, days: number = 7): Promise<number> {
    try {
      logger.info(`Manual memory filter for NPC ${npcId}, User ${userId}`)
      const filtered = await npcMemoryService.filterConversationsWithAI(npcId, userId, days)
      logger.info(`✅ Filtered ${filtered} conversations`)
      return filtered
    } catch (error) {
      logger.error('Manual memory filter failed:', error)
      throw error
    }
  }
}

// 導出單例實例
export const memoryArchivalScheduler = new MemoryArchivalScheduler()
