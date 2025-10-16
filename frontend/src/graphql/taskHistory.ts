/**
 * TaskHistory GraphQL Queries
 * 任務處理歷史記錄查詢
 */

import { gql } from '@apollo/client'

// 任務歷史資料類型
export interface CategoryInfo {
  memoryId: string
  categoryName: string
  categoryEmoji: string
  islandName?: string
}

export interface TaskHistory {
  id: string
  userId: string
  taskId: string
  distributionId?: string
  status: string
  priority: string
  message: string
  processingTime?: number
  memoriesCreated: number
  categoriesInfo: CategoryInfo[]
  errorMessage?: string
  startedAt: string
  completedAt: string
  createdAt: string
}

// 查詢任務歷史列表
export const GET_TASK_HISTORIES = gql`
  query GetTaskHistories($limit: Int, $offset: Int) {
    taskHistories(limit: $limit, offset: $offset) {
      id
      userId
      taskId
      distributionId
      status
      priority
      message
      processingTime
      memoriesCreated
      categoriesInfo {
        memoryId
        categoryName
        categoryEmoji
        islandName
      }
      errorMessage
      startedAt
      completedAt
      createdAt
    }
  }
`

// 查詢單個任務歷史
export const GET_TASK_HISTORY = gql`
  query GetTaskHistory($id: ID!) {
    taskHistory(id: $id) {
      id
      userId
      taskId
      distributionId
      status
      priority
      message
      processingTime
      memoriesCreated
      categoriesInfo {
        memoryId
        categoryName
        categoryEmoji
        islandName
      }
      errorMessage
      startedAt
      completedAt
      createdAt
    }
  }
`
